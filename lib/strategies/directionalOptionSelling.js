import axios from 'axios'
import dayjs from 'dayjs'

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../constants'
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders'
import console from '../logging'
import {
  addToAutoSquareOffQueue,
  addToNextQueue,
  EXIT_TRADING_Q_NAME,
  TRADING_Q_NAME,
  WATCHER_Q_NAME
} from '../queue'
import {
  delay,
  getCurrentExpiryTradingSymbol,
  getIndexInstruments,
  getInstrumentPrice,
  getLastOpenDateSince,
  getNearestCandleTime,
  getNextNthMinute,
  getTimeLeftInMarketClosingMs,
  getTradingSymbolsByOptionPrice,
  ms,
  syncGetKiteInstance
} from '../utils'
import mockOrderResponse from './mockData/orderResponse'

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false
const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade'

// grab the instrument id of the most recent expiry of banknifty
// get the supertrend value (10,3)
// round up the supertrend to nearest strike
// if supertrend < LTP
//    sell CE and call exit strategy of 1x SLM order
//    record the order id of the exit order and watch for 'Completed' event
// get supertrend value of CE option every 5mins
// update SL = min(SLM%, Supertrend)

/**
 *
 * [TODO] handle this error happening in loop
 *
 * getAllOrNoneCompletedOrdersByKiteResponse error {
    [web] [2021-07-04 17:29:44]   e: {
    [web] [2021-07-04 17:29:44]     status: 'error',
    [web] [2021-07-04 17:29:44]     message: 'Incorrect `api_key` or `access_token`.',
    [web] [2021-07-04 17:29:44]     data: null,
    [web] [2021-07-04 17:29:44]     error_type: 'TokenException'
    [web] [2021-07-04 17:29:44]   },
    [web] [2021-07-04 17:29:44]   rawKiteOrdersResponse: [ { order_id: '210701203117256' } ]
    [web] [2021-07-04 17:29:44] }
 */

async function ensureExitOrder ({ initialJobData, rawKiteOrderResponse }) {
  try {
    console.log('[ensureExitOrder] attempt')
    if (MOCK_ORDERS) {
      console.log('🟢 [ensureExitOrder] success', mockOrderResponse[0])
      return mockOrderResponse[0]
    }

    const [exitOrder] = await individualLegExitOrders({
      initialJobData,
      rawKiteOrdersResponse: [rawKiteOrderResponse]
    })
    console.log('🟢 [ensureExitOrder] success', exitOrder)
    return exitOrder
  } catch (e) {
    // [TODO] this isn't the best way of ensuring exit order
    // as `individualLegExitOrders` isn't atomic.
    // possible that exit orders went through but something else caused this erorr
    console.log('🔴 [ensureExitOrder] error', e)
    await delay(2 * 1000)
    return ensureExitOrder({ initialJobData, rawKiteOrderResponse })
  }
}

async function fetchSuperTrend ({ instrument_token, from_date, to_date, ...otherProps }) {  //eslint-disable-line
  const props = {
    instrument_token,
    from_date,
    to_date,
    interval: '5minute',
    period: 10,
    multiplier: 3,
    ...otherProps
  }
  console.log('[directionalOptionSelling] ST request', props)
  const { data } = await axios.post(`${SIGNALX_URL}/api/indicator/supertrend`, props, {
    headers: {
      'X-API-KEY': process.env.SIGNALX_API_KEY
    }
  })

  return data
}

export default async (initialJobData) => {
  try {
    const {
      instrument,
      lots = 1,
      martingaleIncrementSize = 0,
      maxTrades = 0,
      entryStrategy = STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.FIXED_TIME,
      lastTrend
    } = initialJobData

    if (getTimeLeftInMarketClosingMs() < 45 * 60 * 1000) {
      return `🟢 [directionalOptionSelling] Terminating DOS trade. ${maxTrades} attempts left but less than 45 mins in market closing.`
    }

    const { nfoSymbol } = INSTRUMENT_DETAILS[instrument]
    const jsonArray = await getIndexInstruments()

    const { instrument_token: futInstrumentToken } = getCurrentExpiryTradingSymbol({
      sourceData: jsonArray,
      nfoSymbol,
      instrumentType: 'FUT'
    })

    const DATE_FORMAT = 'YYYY-MM-DD'
    const DATE_TIME_FORMAT = `${DATE_FORMAT} HH:mm:ss`
    const lastOpenDate = getLastOpenDateSince(dayjs()).format(DATE_FORMAT)
    const nearestClosedCandleTime = getNearestCandleTime(5 * 60 * 1000).format(DATE_TIME_FORMAT)

    const supertrendProps = {
      instrument_token: futInstrumentToken,
      from_date: lastOpenDate,
      to_date: nearestClosedCandleTime
    }

    const supertrendResponse = await fetchSuperTrend(supertrendProps)
    const [currentTrendData] = supertrendResponse.slice(-1)
    const currentTrendAsPerST = currentTrendData.STX_10_3
    if (
      entryStrategy === STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE
    ) {
      console.log(`[directionalOptionSelling] lastTrend = ${lastTrend}`)
      const lastTrendAsPerST = supertrendResponse.slice(-2)[0].STX_10_3
      const wasLastTrendAccurate = lastTrend === lastTrendAsPerST
      if (!wasLastTrendAccurate) {
        console.log('🔴 [directionalOptionSelling] wasLastTrendAccurate = false')
      }
      const compareWithTrendValue = lastTrend || lastTrendAsPerST
      console.log(`[directionalOptionSelling] compareWithTrendValue = ${compareWithTrendValue}`)
      if (compareWithTrendValue === currentTrendAsPerST) {
        const error = `[directionalOptionSelling] currentTrend ("${currentTrendAsPerST}") same as lastTrend ("${compareWithTrendValue}"). Will try again!`
        console.error(error)
        return Promise.reject(error)
      }
    }

    await punchOrders(initialJobData, currentTrendData, jsonArray)

    if (maxTrades > 1) {
      // flow should never reach here if the orders haven't been punched in
      await addToNextQueue(
        {
          ...initialJobData,
          entryStrategy: STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE,
          lastTrend: currentTrendAsPerST,
          maxTrades: maxTrades - 1,
          lots: Number(lots) + Number(martingaleIncrementSize),
          runNow: false,
          runAt: getNextNthMinute(ms(5 * 60))
        },
        {
          __nextTradingQueue: TRADING_Q_NAME
        }
      )
    }
  } catch (e) {
    console.log('[directionalOptionSelling] error', e)
    return new Error(e)
  }
}

async function punchOrders (initialJobData, superTrend, instrumentsRawData) {
  try {
    const {
      instrument,
      user,
      lots,
      isAutoSquareOffEnabled,
      strikeByPrice,
      orderTag,
      isHedgeEnabled = false,
      hedgeDistance = 1700
    } = initialJobData
    const strikeByPriceNumber = strikeByPrice ? Number(strikeByPrice) : null
    const kite = syncGetKiteInstance(user)
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
      ? await getTradingSymbolsByOptionPrice({
          sourceData: instrumentsRawData,
          nfoSymbol,
          price: strikeByPriceNumber,
          pivotStrike: atmStrike,
          instrumentType,
          user
        })
      : getCurrentExpiryTradingSymbol({
        sourceData: instrumentsRawData,
        nfoSymbol,
        strike: superTrendStrike,
        instrumentType
      })

    console.log('[directionalOptionSelling]', { strikeByPrice, optionTradingSymbol, optionStrike })

    const ltp = await getInstrumentPrice(kite, optionTradingSymbol, kite.EXCHANGE_NFO)
    if (ltp < 10) {
      console.log(
        '🔴 [directionalOptionSelling] not punching order as option price less than 10 bucks'
      )
      return
    }

    let hedgeOrderResponse
    if (isHedgeEnabled && Number(hedgeDistance) > 0) {
      const hedgeStrike =
        Number(optionStrike) + Number(hedgeDistance) * (instrumentType === 'PE' ? -1 : 1)
      const { tradingsymbol: hedgeTradingSymbol } = getCurrentExpiryTradingSymbol({
        sourceData: instrumentsRawData,
        nfoSymbol,
        strike: hedgeStrike,
        instrumentType
      })
      if (hedgeTradingSymbol) {
        const hedgeOrder = {
          tradingsymbol: hedgeTradingSymbol,
          quantity: Number(lots) * lotSize,
          exchange: kite.EXCHANGE_NFO,
          transaction_type: kite.TRANSACTION_TYPE_BUY,
          order_type: kite.ORDER_TYPE_MARKET,
          product: kite.PRODUCT_MIS,
          validity: kite.VALIDITY_DAY,
          tag: orderTag
        }
        console.log('hedge order ', hedgeOrder)
        hedgeOrderResponse = !MOCK_ORDERS
          ? await kite.placeOrder(kite.VARIETY_REGULAR, hedgeOrder)
          : mockOrderResponse[0]
      }
    }

    const order = {
      tradingsymbol: optionTradingSymbol,
      quantity: Number(lots) * lotSize,
      exchange: kite.EXCHANGE_NFO,
      transaction_type: kite.TRANSACTION_TYPE_SELL,
      order_type: kite.ORDER_TYPE_MARKET,
      product: kite.PRODUCT_MIS,
      validity: kite.VALIDITY_DAY,
      tag: orderTag
    }

    if (MOCK_ORDERS) {
      console.log('MOCK ORDERS! Not punching order —', order)
    }

    const rawKiteOrderResponse = MOCK_ORDERS
      ? mockOrderResponse[0]
      : await kite.placeOrder(kite.VARIETY_REGULAR, order)
    const exitOrder = await ensureExitOrder({
      initialJobData,
      rawKiteOrderResponse
    })

    const queueRes = await addToNextQueue(initialJobData, {
      __nextTradingQueue: EXIT_TRADING_Q_NAME,
      rawKiteOrdersResponse: [exitOrder],
      optionInstrumentToken,
      hedgeOrderResponse
    })

    await addToNextQueue(initialJobData, {
      __nextTradingQueue: WATCHER_Q_NAME,
      rawKiteOrderResponse: exitOrder
    })

    const { id, name, data } = queueRes
    console.log('🟢 [directionalOptionSelling] trailing SL now..', { id, name, data })

    if (isAutoSquareOffEnabled) {
      try {
        const asoResponse = await addToAutoSquareOffQueue({
          initialJobData,
          jobResponse: {
            rawKiteOrdersResponse: [rawKiteOrderResponse, hedgeOrderResponse].filter((o) => o)
          }
        })
        const { data, name } = asoResponse
        console.log('🟢 [directionalOptionSelling] success enable auto square off', { data, name })
      } catch (e) {
        console.log('🔴 [directionalOptionSelling] failed to enable auto square off', e)
      }
    }
    return queueRes
  } catch (e) {
    console.log('[directionalOptionSelling] punchOrder error', e)
    return new Error(e)
  }
}
