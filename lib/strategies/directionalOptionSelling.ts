import axios from 'axios'
import dayjs from 'dayjs'
import { omit } from 'lodash'
import { KiteOrder } from '../../types/kite'
import { DIRECTIONAL_OPTION_SELLING_TRADE } from '../../types/trade'

import {
  INSTRUMENT_DETAILS,
  PRODUCT_TYPE,
  STRATEGIES_DETAILS
} from '../constants'
import { doSquareOffPositions } from '../exit-strategies/autoSquareOff'
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders'
import console from '../logging'
import {
  addToAutoSquareOffQueue,
  addToNextQueue,
  EXIT_TRADING_Q_NAME,
  TRADING_Q_NAME
} from '../queue'
import {
  getExpiryTradingSymbol,
  getInstrumentPrice,
  getLastOpenDateSince,
  getNearestCandleTime,
  getNextNthMinute,
  getTimeLeftInMarketClosingMs,
  getTradingSymbolsByOptionPrice,
  isUntestedFeaturesEnabled,
  ms,
  remoteOrderSuccessEnsurer,
  syncGetKiteInstance,
  TradingSymbolInterface,
  withRemoteRetry
} from '../utils'

const SIGNALX_URL = process.env.SIGNALX_URL ?? 'https://indicator.signalx.trade'

// grab the instrument id of the most recent expiry of banknifty
// get the supertrend value (10,3)
// round up the supertrend to nearest strike
// if supertrend < LTP
//    sell CE and call exit strategy of 1x SLM order
//    record the order id of the exit order and watch for 'Completed' event
// get supertrend value of CE option every 5mins
// update SL = min(SLM%, Supertrend)

async function fetchSuperTrend({
  instrument_token,
  from_date,
  to_date,
  ...otherProps
}) {
  //eslint-disable-line
  const props = {
    instrument_token,
    from_date,
    to_date,
    interval: '5minute',
    period: 10,
    multiplier: 3,
    ...otherProps
  }

  const { data } = await axios.post(
    `${SIGNALX_URL}/api/indicator/supertrend`,
    props,
    {
      headers: {
        'X-API-KEY': process.env.SIGNALX_API_KEY
      }
    }
  )

  return data
}

export default async function directionalOptionSelling(
  initialJobData: DIRECTIONAL_OPTION_SELLING_TRADE & {
    lastTrend: string
    lastTradeOrders: KiteOrder[]
  }
) {
  try {
    const {
      instrument,
      lots = 1,
      martingaleIncrementSize = 0,
      maxTrades = 0,
      entryStrategy = STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING
        .ENTRY_STRATEGIES.FIXED_TIME,
      lastTrend,
      lastTradeOrders,
      user,
      expiryType
    } = initialJobData

    if (getTimeLeftInMarketClosingMs() < 40 * 60 * 1000) {
      return `🟢 [dos] Terminating DOS trade. ${maxTrades.toString()} attempts left but less than 40 mins in market closing.`
    }

    const { nfoSymbol } = INSTRUMENT_DETAILS[instrument]

    const {
      instrument_token: futInstrumentToken
    } = (await getExpiryTradingSymbol({
      nfoSymbol,
      instrumentType: 'FUT',
      expiry: expiryType
    })) as TradingSymbolInterface

    const DATE_FORMAT = 'YYYY-MM-DD'
    const DATE_TIME_FORMAT = `${DATE_FORMAT} HH:mm:ss`
    const lastOpenDate = getLastOpenDateSince(dayjs()).format(DATE_FORMAT)
    const nearestClosedCandleTime = getNearestCandleTime(5 * 60 * 1000).format(
      DATE_TIME_FORMAT
    )

    const supertrendProps = {
      instrument_token: futInstrumentToken,
      from_date: lastOpenDate,
      to_date: nearestClosedCandleTime
    }

    const supertrendResponse = await withRemoteRetry(async () =>
      fetchSuperTrend(supertrendProps)
    )
    const [currentTrendData] = supertrendResponse.slice(-1)
    const currentTrendAsPerST = currentTrendData.STX_10_3
    if (
      entryStrategy ===
      STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE
    ) {
      const lastTrendAsPerST = supertrendResponse.slice(-2)[0].STX_10_3
      const wasLastTrendAccurate = lastTrend === lastTrendAsPerST
      if (!wasLastTrendAccurate) {
        // only if currentTrend is not same as the previous position that was taken
        /**
         * possible scenarios
         * on incorrect trend,
         *
         * say at 9.45am
         * ST data comes in as [up, up, down]
         * a short position gets taken
         *
         * then at 9.50am
         * Case 1. ST data comes in as [up, up, up, down]
         * then it's all okay - even though previous trend was inaccurate,
         * the new position would have been same as existing positon
         * Action: No action required
         *
         * Case 2. ST data comes in as [up, up, up, up]
         * then it's a problem as now a new long position will be taken
         * even though nothing has changed on the futures chart
         * but 3 trades would have been taken already
         * Action: Revert previous trade, and retain lot size and maxTrades from incoming initialJobData
         */

        console.log('🔴 [dos] last trend was inaccurate')
        if (currentTrendAsPerST !== lastTrend && lastTradeOrders?.length) {
          // [NB] let this happen at least once before enabling it for everyone else
          if (isUntestedFeaturesEnabled()) {
            console.log('🔴 [dos black swan] reverting bad position')
            const kite = syncGetKiteInstance(user)
            // 1. square off last trade
            await doSquareOffPositions(lastTradeOrders, kite, initialJobData)
            // 2. prevent next trade from happening
            // 3. increase back maxTrades by 1
            return await addToNextQueue(
              {
                ...initialJobData,
                entryStrategy:
                  STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES
                    .ST_CHANGE,
                lastTrend: currentTrendAsPerST,
                runNow: false,
                runAt: getNextNthMinute(ms(5 * 60))
              },
              {
                _nextTradingQueue: TRADING_Q_NAME
              }
            )
          }
        }
      }

      const compareWithTrendValue = lastTrend || lastTrendAsPerST
      if (compareWithTrendValue === currentTrendAsPerST) {
        const error = `[dos] no change in ST ("${currentTrendAsPerST as string}")`
        return Promise.reject(new Error(error))
      }
    }

    const punchedOrders = await punchOrders(initialJobData, currentTrendData)

    if (maxTrades > 1) {
      // flow should never reach here if the orders haven't been punched in
      await addToNextQueue(
        {
          ...initialJobData,
          entryStrategy:
            STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES
              .ST_CHANGE,
          lastTrend: currentTrendAsPerST,
          maxTrades: maxTrades - 1,
          lots: Number(lots) + Number(martingaleIncrementSize),
          runNow: false,
          runAt: getNextNthMinute(ms(5 * 60)),
          lastTradeOrders: punchedOrders
        },
        {
          _nextTradingQueue: TRADING_Q_NAME
        }
      )
    }

    return punchedOrders
  } catch (e) {
    console.log('🔴 [dos] parent caught', e)
    // [TODO] update db job with `status`: ERROR and an appropriate `reason`
    return Promise.resolve(
      '🔴 [dos] Terminating DOS trade. non recoverable error'
    )
  }
}

async function punchOrders(
  initialJobData: DIRECTIONAL_OPTION_SELLING_TRADE,
  superTrend
) {
  const {
    _kite,
    instrument,
    user,
    lots,
    isAutoSquareOffEnabled,
    strikeByPrice,
    orderTag,
    rollback,
    productType = PRODUCT_TYPE.MIS,
    isHedgeEnabled = false,
    hedgeDistance = 1700,
    expiryType
  } = initialJobData
  const strikeByPriceNumber = strikeByPrice ? Number(strikeByPrice) : null
  const kite = _kite || syncGetKiteInstance(user)
  const { nfoSymbol, strikeStepSize, lotSize } = INSTRUMENT_DETAILS[instrument]

  const { close, ST_10_3 } = superTrend
  const atmStrike = Math.round(close / strikeStepSize) * strikeStepSize
  const superTrendStrike = Math.round(ST_10_3 / strikeStepSize) * strikeStepSize
  const instrumentType = ST_10_3 > close ? 'CE' : 'PE'

  const {
    tradingsymbol: optionTradingSymbol,
    instrument_token: optionInstrumentToken,
    strike: optionStrike
  } = strikeByPriceNumber
      ? await withRemoteRetry(async () =>
        getTradingSymbolsByOptionPrice({
          nfoSymbol,
          price: strikeByPriceNumber,
          pivotStrike: atmStrike,
          instrumentType,
          user: user!,
          expiry: expiryType
        })
      )
      : await getExpiryTradingSymbol({
        nfoSymbol,
        strike: superTrendStrike,
        instrumentType,
        expiry: expiryType
      })

  const ltp = await withRemoteRetry(async () =>
    getInstrumentPrice(kite, optionTradingSymbol, kite.EXCHANGE_NFO)
  )
  if (ltp < 10) {
    console.log(
      '🔴 [directionalOptionSelling] not punching order as option price less than 10 bucks'
    )
    return
  }

  let hedgeOrder
  let hedgeOrderResponse
  if (isHedgeEnabled && Number(hedgeDistance) > 0) {
    const hedgeStrike =
      Number(optionStrike) +
      Number(hedgeDistance) * (instrumentType === 'PE' ? -1 : 1)

    const {
      tradingsymbol: hedgeTradingSymbol
    } = (await getExpiryTradingSymbol({
      nfoSymbol,
      strike: hedgeStrike,
      instrumentType,
      expiry: expiryType
    })) as TradingSymbolInterface

    if (hedgeTradingSymbol) {
      hedgeOrder = {
        tradingsymbol: hedgeTradingSymbol,
        quantity: Number(lots) * lotSize,
        exchange: kite.EXCHANGE_NFO,
        transaction_type: kite.TRANSACTION_TYPE_BUY,
        order_type: kite.ORDER_TYPE_MARKET,
        product: productType,
        validity: kite.VALIDITY_DAY,
        tag: orderTag
      }

      try {
        const { successful, response } = await remoteOrderSuccessEnsurer({
          _kite: kite,
          orderProps: hedgeOrder,
          ensureOrderState: kite.STATUS_COMPLETE,
          user: user!
        })

        if (successful) {
          hedgeOrderResponse = response
        } else {
          const error =
            '🔴 hedge order id exists, but status unknown after several retries! terminating dos'
          console.log(error)
          throw new Error(error)
        }
      } catch (e) {
        if (rollback?.onBrokenHedgeOrders) {
          await doSquareOffPositions([hedgeOrderResponse], kite, initialJobData)
        }
        throw e
      }
    }
  }

  const order = {
    tradingsymbol: optionTradingSymbol,
    quantity: Number(lots) * lotSize,
    exchange: kite.EXCHANGE_NFO,
    transaction_type: kite.TRANSACTION_TYPE_SELL,
    order_type: kite.ORDER_TYPE_MARKET,
    product: productType,
    validity: kite.VALIDITY_DAY,
    tag: orderTag
  }

  let rawKiteOrderResponse
  try {
    const { successful, response } = await remoteOrderSuccessEnsurer({
      _kite: kite,
      orderProps: order,
      ensureOrderState: kite.STATUS_COMPLETE,
      user: user!
    })

    if (successful) {
      rawKiteOrderResponse = response
    } else {
      // [TODO] lets see if this ever happens.
      const error =
        '🔴 DOS order exists, but status unknown several retries! terminating dos'
      console.log(error)
      throw new Error(error)
    }
  } catch (e) {
    // squaring off the hedge if this times out
    console.log(e)
    if (rollback?.onBrokenPrimaryOrders) {
      await doSquareOffPositions(
        [hedgeOrderResponse, rawKiteOrderResponse].filter(o => o),
        kite,
        initialJobData
      )
    }
    throw e
  }

  let exitOrder
  try {
    ;[exitOrder] = await individualLegExitOrders({
      _kite: kite,
      initialJobData,
      rawKiteOrdersResponse: [rawKiteOrderResponse]
    })
  } catch (e) {
    // if this throws, then the initial SL order for the sold option is not in system
    if (rollback?.onBrokenExitOrders) {
      await doSquareOffPositions(
        [hedgeOrderResponse, rawKiteOrderResponse].filter(o => o),
        kite,
        initialJobData
      )
    }
    throw e
  }

  const nextQueueData = omit(initialJobData, '_kite')

  const queueRes = await addToNextQueue(nextQueueData, {
    _nextTradingQueue: EXIT_TRADING_Q_NAME,
    rawKiteOrdersResponse: [exitOrder],
    optionInstrumentToken,
    hedgeOrderResponse
  })

  const { id, name, data } = queueRes!
  console.log('🟢 [directionalOptionSelling] trailing SL now..', {
    id,
    name,
    data
  })

  const allPunchedOrders = [rawKiteOrderResponse, hedgeOrderResponse].filter(
    o => o
  )
  if (isAutoSquareOffEnabled) {
    try {
      const asoResponse = await addToAutoSquareOffQueue({
        initialJobData: nextQueueData,
        jobResponse: {
          rawKiteOrdersResponse: allPunchedOrders
        }
      })
      const { data, name } = asoResponse
      console.log(
        '🟢 [directionalOptionSelling] success enable auto square off',
        { data, name }
      )
    } catch (e) {
      console.log(
        '🔴 [directionalOptionSelling] failed to enable auto square off',
        e
      )
    }
  }
  return allPunchedOrders
}
