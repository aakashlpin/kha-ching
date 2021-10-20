/**
 * Trailing SL method
 * 1. initial total SL = initialPremiumReceived + sl% * initialPremiumReceived
 * 2. trailing SL
 *    on every decrease in combined premium by X%, trail the SL by initial SL %
 *
 * e.g. at 9.20am
 * initial premium = 400 = lastInflectionPoint
 * initial SL = 10%
 * total SL = 440
 *
 *
 * At 10.00am
 * combined premium = 380
 * decrease in premium = 5%
 * new SL = 380 + 10% * 380 = 418
 *  terminate this job, add a replica to same queue
 *  with lastTrailingSlTriggerAtPremium = 380
 *
 *
 * At 10.15am
 * combined premium = 390
 * ideal SL = 400 + 10%*440 = 440
 * trailing SL = 418
 * SL = min(ideal SL, trailing SL)
 * no changes
 */

import dayjs from 'dayjs'
import { Await } from '../../types'
import { KiteOrder } from '../../types/kite'
import { COMBINED_SL_EXIT_STRATEGY } from '../../types/plans'
import { ATM_STRADDLE_TRADE, ATM_STRANGLE_TRADE } from '../../types/trade'
import { EXIT_STRATEGIES, USER_OVERRIDE } from '../constants'
import console from '../logging'
import { addToNextQueue, EXIT_TRADING_Q_NAME } from '../queue'
import {
  getTimeLeftInMarketClosingMs,
  syncGetKiteInstance,
  withRemoteRetry,
  patchDbTrade,
  getMultipleInstrumentPrices,
  GET_LTP_RESPONSE,
  isTimeAfterAutoSquareOff
} from '../utils'

import { doSquareOffPositions } from './autoSquareOff'

const patchTradeWithTrailingSL = async ({ dbId, trailingSl }) => {
  try {
    await patchDbTrade({
      _id: dbId,
      patchProps: {
        liveTrailingSl: trailingSl,
        lastTrailingSlSetAt: dayjs().format()
      }
    })
  } catch (e) {
    console.log('🔴 [patchTradeWithTrailingSL] error', e)
  }
}

const tradeHeartbeat = async dbId => {
  const data = await patchDbTrade({
    _id: dbId,
    patchProps: {
      lastHeartbeatAt: dayjs().format()
    }
  })

  return data
}

export type CombinedPremiumJobDataInterface = (
  | ATM_STRADDLE_TRADE
  | ATM_STRANGLE_TRADE
) & {
  lastTrailingSlTriggerAtPremium?: number
}

async function multiLegPremiumThreshold ({
  initialJobData,
  rawKiteOrdersResponse,
  squareOffOrders
}: {
  initialJobData: CombinedPremiumJobDataInterface
  rawKiteOrdersResponse: KiteOrder[]
  squareOffOrders?: KiteOrder[]
}): Promise<any> {
  try {
    const {
      slmPercent,
      trailingSlPercent,
      user,
      trailEveryPercentageChangeValue,
      lastTrailingSlTriggerAtPremium,
      combinedExitStrategy = COMBINED_SL_EXIT_STRATEGY.EXIT_ALL,
      _id: dbId,
      isAutoSquareOffEnabled,
      autoSquareOffProps:{time}={}
    } = initialJobData

    if (getTimeLeftInMarketClosingMs() < 0 ||
      (isAutoSquareOffEnabled &&
        isTimeAfterAutoSquareOff(time!))) {
      return Promise.resolve(
        '🟢 [multiLegPremiumThreshold] Terminating Combined Premium checker as market closing or after square off time..'
      )
    }


    const kite = syncGetKiteInstance(user)

    try {
      // notify db that the worker is active and check current user override settings
      const dbTrade = await withRemoteRetry(async () => tradeHeartbeat(dbId))
      if (dbTrade.user_override === USER_OVERRIDE.ABORT) {
        return Promise.resolve(
          '🟢 [multiLegPremiumThreshold] Terminating Combined Premium checker as status ABORTed'
        )
      }
    } catch (error) {
      // harmless error, log and continue processing
      console.log('🔴 [multiLegPremiumThreshold] tradeHeartbeat error', error)
    }

    const legsOrders = rawKiteOrdersResponse
    // console.log('legsOrders', logDeep(legsOrders))
    // check here if the open positions include these legs
    // and quantities should be greater than equal to `legsOrders`
    // if not, resolve this checker assuming the user has squared off the positions themselves

    const tradingSymbols = legsOrders.map(order => order.tradingsymbol)

    const averageOrderPrices = legsOrders.map(order => order.average_price)
    const initialPremiumReceived = averageOrderPrices.reduce(
      (sum, price) => sum! + price!,
      0
    )

    let liveSymbolPrices: Await<ReturnType<typeof getMultipleInstrumentPrices>>
    try {
      liveSymbolPrices = await getMultipleInstrumentPrices(
        tradingSymbols.map(symbol => ({
          exchange: kite.EXCHANGE_NFO,
          tradingSymbol: symbol
        })),
        user!
      )
    } catch (error) {
      console.log(
        '🔴 [multiLegPremiumThreshold] getInstrumentPrice error',
        error
      )
      return Promise.reject(new Error('Kite APIs acting up'))
    }

    const liveTotalPremium = tradingSymbols.reduce((sum, tradingSymbol) => {
      const priceData = liveSymbolPrices[tradingSymbol]
      return sum + priceData.lastPrice
    }, 0)
    const initialSlTotalPremium =
      initialPremiumReceived! + (slmPercent / 100) * initialPremiumReceived! // 440

    let checkAgainstSl = initialSlTotalPremium

    if (trailEveryPercentageChangeValue) {
      const trailingSlTotalPremium = lastTrailingSlTriggerAtPremium
        ? lastTrailingSlTriggerAtPremium +
          ((trailingSlPercent ?? slmPercent) / 100) *
            lastTrailingSlTriggerAtPremium
        : null // 418
      checkAgainstSl = trailingSlTotalPremium ?? initialSlTotalPremium // 418

      if (liveTotalPremium < checkAgainstSl) {
        const lastInflectionPoint =
          lastTrailingSlTriggerAtPremium ?? initialPremiumReceived // 380
        // liveTotalPremium = 360
        const changeFromLastInflectionPoint =
          ((liveTotalPremium - lastInflectionPoint!) / lastInflectionPoint!) *
          100
        // continue the checker
        if (
          changeFromLastInflectionPoint < 0 &&
          Math.abs(changeFromLastInflectionPoint) >=
            trailEveryPercentageChangeValue
        ) {
          // update lastTrailingSlTriggerAtPremium
          // if current liveTotalPremium is X% lesser than trailEveryPercentageChangeValue

          // add to same queue with updated params
          try {
            await addToNextQueue(
              {
                ...initialJobData,
                lastTrailingSlTriggerAtPremium: liveTotalPremium
              },
              {
                _nextTradingQueue: EXIT_TRADING_Q_NAME,
                rawKiteOrdersResponse,
                squareOffOrders
              }
            )
          } catch (e) {
            console.log('🔴 [multiLegPremiumThreshold] addToNextQueue error', e)
          }

          // update db trade with new combined SL property
          // and expose it in the UI
          try {
            await withRemoteRetry(async () =>
              patchTradeWithTrailingSL({
                dbId,
                trailingSl:
                  liveTotalPremium +
                  ((trailingSlPercent! ?? slmPercent) / 100) * liveTotalPremium
              })
            )
          } catch (error) {
            // harmless error, move on
            console.log(
              '🔴 [multiLegPremiumThreshold] patchTradeWithTrailingSL error',
              error
            )
          }

          const resolveMsg = `⚡️ [multiLegPremiumThreshold] trailing new inflection point ${liveTotalPremium}`
          console.log(resolveMsg)
          // terminate this worker
          return Promise.resolve(resolveMsg)
        }
      }
    }

    if (liveTotalPremium < checkAgainstSl) {
      const rejectMsg = `🟢 [multiLegPremiumThreshold] liveTotalPremium (${liveTotalPremium}) < threshold (${checkAgainstSl})`
      return Promise.reject(new Error(rejectMsg))
    }

    // terminate the checker
    const exitMsg = `☢️ [multiLegPremiumThreshold] triggered! liveTotalPremium (${liveTotalPremium}) > threshold (${checkAgainstSl})`
    console.log(exitMsg)

    if (combinedExitStrategy === COMBINED_SL_EXIT_STRATEGY.EXIT_LOSING) {
      // get the avg entry prices
      const avgSymbolPrice = legsOrders.reduce(
        (accum, order) => ({
          ...accum,
          [order.tradingsymbol]: order.average_price
        }),
        {}
      )

      // console.log('avgSymbolPrice', logDeep(avgSymbolPrice))

      // future proofing by allowing for any number of positions to be trailed together
      const { losingLegs, winningLegs } = tradingSymbols.reduce(
        (accum, tradingSymbol) => {
          const leg = liveSymbolPrices[tradingSymbol]
          const { lastPrice } = leg
          if (avgSymbolPrice[tradingSymbol] < lastPrice) {
            return {
              ...accum,
              losingLegs: [...accum.losingLegs, leg]
            }
          }
          return {
            ...accum,
            winningLegs: [...accum.winningLegs, leg]
          }
        },
        {
          losingLegs: [],
          winningLegs: []
        }
      )

      // console.log('losingLegs', logDeep(losingLegs))
      // console.log('winningLegs', logDeep(winningLegs))

      if (!losingLegs.length) {
        // [NEW] if the position is winning on both legs, take it out
        return doSquareOffPositions(squareOffOrders!, kite, initialJobData)
      }

      const squareOffLosingLegs = losingLegs.map(losingLeg =>
        legsOrders.find(
          legOrder => legOrder.tradingsymbol === losingLeg.tradingSymbol
        )
      )
      // console.log('squareOffLosingLegs', logDeep(squareOffLosingLegs))
      const bringToCostOrders = winningLegs.map(winningLeg =>
        legsOrders.find(
          legOrder => legOrder.tradingsymbol === winningLeg.tradingSymbol
        )
      )
      // console.log('bringToCostOrders', logDeep(bringToCostOrders))
      // 1. square off losing legs
      await doSquareOffPositions(
        squareOffLosingLegs as KiteOrder[],
        kite,
        initialJobData
      )
      // 2. bring the winning legs to cost
      return await addToNextQueue(
        {
          ...initialJobData,
          // override the slmPercent and exitStrategy in initialJobData
          slmPercent: 0,
          exitStrategy: EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X
        },
        {
          _nextTradingQueue: EXIT_TRADING_Q_NAME,
          rawKiteOrdersResponse: bringToCostOrders
        }
      )
    }

    return doSquareOffPositions(squareOffOrders!, kite, initialJobData)
  } catch (e) {
    console.log('☢️ [multiLegPremiumThreshold] terminated', e)
    return Promise.resolve(e)
  }
}

export default multiLegPremiumThreshold
