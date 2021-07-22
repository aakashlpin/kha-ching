import axios from 'axios'
import csv from 'csvtojson'
import dayjs from 'dayjs'
import { KiteConnect } from 'kiteconnect'
import { Promise } from 'bluebird'

import { EXIT_STRATEGIES, STRATEGIES } from './constants'
import console from './logging'
// const redisClient = require('redis').createClient(process.env.REDIS_URL);
// export const memoizer = require('redis-memoizer')(redisClient);
import { COMPLETED_ORDER_RESPONSE } from './strategies/mockData/orderResponse'
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore')

dayjs.extend(isSameOrBefore)
const https = require('https')
const fs = require('fs')
const memoizer = require('memoizee')

const apiKey = process.env.KITE_API_KEY
const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false
const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade'

export const ms = (seconds) => seconds * 1000

const asyncGetIndexInstruments = (exchange = 'NFO') =>
  new Promise((resolve, reject) => {
    const filename = `instrument_${new Date().getTime()}.csv`
    const file = fs.createWriteStream(filename)
    console.log('downloading instruments file...')
    https.get(`https://api.kite.trade/instruments/${exchange}`, function (response) {
      const stream = response.pipe(file)
      stream.on('finish', async () => {
        try {
          const jsonArray = await csv().fromFile(filename)
          // sometimes 0d returns 200 status code but 502 gateway error in file
          if (Object.keys(jsonArray[0]).length === 12) {
            fs.unlink(filename, (e) => {})
            const indexesData =
              exchange === 'NFO'
                ? jsonArray.filter(
                    (item) =>
                      item.name === 'NIFTY' || item.name === 'BANKNIFTY' || item.name === 'FINNIFTY'
                  )
                : jsonArray

            return resolve(indexesData)
          }
          // retry if that's the case
          console.log('🔴 Failed downloading instruments file! Retrying...')
          // resolve this promise with a recursive promise fn call
          resolve(asyncGetIndexInstruments())
        } catch (e) {
          console.log('💀 Errored downloading instruments file!', e)
          reject(e)
        }
      })
    })
  })

export const getIndexInstruments = memoizer(asyncGetIndexInstruments, {
  maxAge: dayjs().get('hours') >= 8 ? ms(9 * 60 * 60) : ms(5 * 60),
  promise: true
})

export const delay = (ms) =>
  new Promise((resolve) =>
    setTimeout(() => {
      resolve()
    }, ms)
  )

export const getMisOrderLastSquareOffTime = () =>
  dayjs().set('hour', 15).set('minutes', 24).set('seconds', 0).format()

export const getCurrentExpiryTradingSymbol = ({
  sourceData,
  nfoSymbol,
  strike,
  instrumentType,
  tradingsymbol
}) => {
  const rows = sourceData
    .filter(
      (item) =>
        (nfoSymbol ? item.name === nfoSymbol : true) &&
        (strike ? item.strike == strike : true) && // eslint-disable-line
        (tradingsymbol ? item.tradingsymbol === tradingsymbol : true) &&
        (instrumentType ? item.instrument_type === instrumentType : true)
    )
    .sort((row1, row2) => (dayjs(row1.expiry).isSameOrBefore(dayjs(row2.expiry)) ? -1 : 1))

  if (instrumentType) {
    return rows.length ? rows[0] : null
  }

  const relevantRows = rows.slice(0, 2)

  const peStrike = relevantRows.find((item) => item.instrument_type === 'PE').tradingsymbol
  const ceStrike = relevantRows.find((item) => item.instrument_type === 'CE').tradingsymbol

  return {
    PE_STRING: peStrike,
    CE_STRING: ceStrike
  }
}

export function getPercentageChange (price1, price2, mode = 'AGGRESIVE') {
  const denominator = mode === 'AGGRESIVE' ? ((price1 + price2) / 2) : Math.min(price1, price2)
  return Math.floor((Math.abs(price1 - price2) / denominator) * 100)
}

export async function getInstrumentPrice (kite, underlying, exchange) {
  const instrumentString = `${exchange}:${underlying}`
  const underlyingRes = await kite.getLTP(instrumentString)
  return Number(underlyingRes[instrumentString]?.last_price)
}

export async function getSkew (kite, instrument1, instrument2, exchange) {
  const [price1, price2] = await Promise.all([
    getInstrumentPrice(kite, instrument1, exchange),
    getInstrumentPrice(kite, instrument2, exchange)
  ])

  const skew = getPercentageChange(price1, price2)
  return {
    [instrument1]: price1,
    [instrument2]: price2,
    skew
  }
}

export function syncGetKiteInstance (user) {
  const accessToken = user?.session?.access_token
  if (!accessToken) {
    throw new Error('missing access_token in `user` object, or `user` is undefined')
  }
  return new KiteConnect({
    api_key: apiKey,
    access_token: accessToken
  })
}

export async function getCompletedOrderFromOrderHistoryById (kite, orderId) {
  const orders = await kite.getOrderHistory(orderId)
  return orders.find((odr) => odr.status === 'COMPLETE')
}

export async function getAllOrNoneCompletedOrdersByKiteResponse (kite, rawKiteOrdersResponse) {
  if (MOCK_ORDERS) {
    return [...new Array(rawKiteOrdersResponse.length)].fill(COMPLETED_ORDER_RESPONSE)
  }

  try {
    const completedOrders = (
      await Promise.all(
        rawKiteOrdersResponse.map(({ order_id }) => // eslint-disable-line
          getCompletedOrderFromOrderHistoryById(kite, order_id)
        )
      )
    ).filter((o) => o)

    if (completedOrders.length !== rawKiteOrdersResponse.length) {
      return null
    }

    return completedOrders
  } catch (e) {
    console.error('getAllOrNoneCompletedOrdersByKiteResponse error', { e, rawKiteOrdersResponse })
    return null
  }
}

export const logObject = (heading, object) =>
  typeof heading === 'string'
    ? console.log(heading, JSON.stringify(object, null, 2))
    : console.log(JSON.stringify(heading, null, 2))

export const getTimeLeftInMarketClosingMs = () =>
  process.env.NEXT_PUBLIC_APP_URL?.includes('localhost:')
    ? ms(1 * 60 * 60) // if developing, hardcode one hour to market closing
    : dayjs(getMisOrderLastSquareOffTime()).diff(dayjs())

export const getEntryAttemptsCount = ({ strategy }) => {
  switch (strategy) {
    case STRATEGIES.DIRECTIONAL_OPTION_SELLING:
      return Math.ceil(getTimeLeftInMarketClosingMs() / ms(5 * 60))
    case STRATEGIES.OPTION_BUYING_STRATEGY:
      return Math.ceil(getTimeLeftInMarketClosingMs() / ms(1 * 60))
    default:
      return null
  }
}

export const getBackoffStrategy = ({ strategy }) => {
  switch (strategy) {
    case STRATEGIES.DIRECTIONAL_OPTION_SELLING:
      return 'backOffToNearest5thMinute'
    case STRATEGIES.OPTION_BUYING_STRATEGY:
      return 'backOffToNearestMinute'
    default:
      return 'fixed'
  }
}

export const getCustomBackoffStrategies = () => {
  return {
    backOffToNearest5thMinute () {
      return dayjs(getNextNthMinute(5 * 60 * 1000)).diff(dayjs())
    },
    backOffToNearestMinute () {
      return dayjs(getNextNthMinute(1 * 60 * 1000)).diff(dayjs())
    }
  }
}

export const getQueueOptionsForExitStrategy = (exitStrategy) => {
  if (!exitStrategy) {
    throw new Error('getQueueOptionsForExitStrategy called without exitStrategy')
  }

  switch (exitStrategy) {
    case EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD: {
      const recheckInterval = ms(3)
      return {
        attempts: Math.ceil(getTimeLeftInMarketClosingMs() / recheckInterval),
        backoff: {
          type: 'fixed',
          delay: recheckInterval
        }
      }
    }
    case EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND: {
      const recheckInterval = ms(5 * 60)
      return {
        attempts: Math.ceil(getTimeLeftInMarketClosingMs() / recheckInterval),
        backoff: {
          type: 'backOffToNearest5thMinute'
        }
      }
    }
    case EXIT_STRATEGIES.OBS_TRAIL_SL: {
      const recheckInterval = ms(1 * 60)
      return {
        attempts: Math.ceil(getTimeLeftInMarketClosingMs() / recheckInterval),
        backoff: {
          type: 'backOffToNearestMinute'
        }
      }
    }
    default:
      return {
        attempts: 20,
        backoff: {
          type: 'fixed',
          delay: ms(3)
        }
      }
  }
}

const marketHolidays = [
  ['April 02,2021', 'Friday'],
  ['April 14,2021', 'Wednesday'],
  ['April 21,2021', 'Wednesday'],
  ['May 13,2021', 'Thursday'],
  ['July 21,2021', 'Wednesday'],
  ['August 19,2021', 'Thursday'],
  ['September 10,2021', 'Friday'],
  ['October 15,2021', 'Friday'],
  ['November 04,2021', 'Thursday'],
  ['November 05,2021', 'Friday'],
  ['November 19,2021', 'Friday']
]

export const isDateHoliday = (date) => {
  const isMarketHoliday = marketHolidays.find(
    (holidays) => holidays[0] === date.format('MMMM DD,YYYY')
  )
  if (isMarketHoliday) {
    return true
  }
  const day = date.format('dddd')
  const isWeeklyHoliday = day === 'Saturday' || day === 'Sunday'
  return isWeeklyHoliday
}

export const getLastOpenDateSince = (from) => {
  const fromDay = from.format('dddd')
  const yesterday = from.subtract(fromDay === 'Monday' ? 3 : 1, 'days')
  if (isDateHoliday(yesterday)) {
    return getLastOpenDateSince(yesterday)
  }

  return yesterday
}

export const storeAccessTokenRemotely = async (accessToken) => {
  const ACCESS_TOKEN_URL = `${withoutFwdSlash(process.env.DATABASE_HOST_URL)}/pvt_${
    process.env.DATABASE_USER_KEY
  }/tokens`
  try {
    await axios.post(
      ACCESS_TOKEN_URL,
      {
        access_token: accessToken
      },
      {
        headers: {
          'x-api-key': process.env.DATABASE_API_KEY
        }
      }
    )
  } catch (e) {
    console.log('🔴 [storeAccessTokenRemotely] error', e)
  }
}

export const getNearestCandleTime = (intervalMs, referenceDate = new Date()) => {
  const nearestCandle = new Date(Math.floor(referenceDate.getTime() / intervalMs) * intervalMs)
  // https://kite.trade/forum/discussion/7798/historical-data-candles-inaccurate-for-small-periods
  return dayjs(nearestCandle).subtract(1, 'second')
}

export const getNextNthMinute = (intervalMs) => {
  // ref: https://stackoverflow.com/a/10789415/721084
  const date = new Date()
  const rounded = new Date(Math.ceil(date.getTime() / intervalMs) * intervalMs)
  return rounded
}

export const ensureMarginForBasketOrder = async (user, orders, attempts = 1, maxAttempts = 10) => {
  try {
    const kite = syncGetKiteInstance(user)
    const {
      equity: { net }
    } = await kite.getMargins()

    console.log('[ensureMarginForBasketOrder]', { net })

    const { data } = await axios.post(
      'https://api.kite.trade/margins/basket?consider_positions=true&mode=compact',
      orders,
      {
        headers: {
          'X-Kite-Version': 3,
          Authorization: `token ${process.env.KITE_API_KEY}:${user.session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const totalMarginRequired = data?.data?.initial?.total

    console.log('[ensureMarginForBasketOrder]', { totalMarginRequired })

    const canPunch = totalMarginRequired < net
    if (!canPunch) {
      console.log('🔴 [ensureMarginForBasketOrder] margin check failed!')
    }

    return canPunch
  } catch (e) {
    console.log('🔴 [ensureMarginForBasketOrder] error', e)
    if (attempts < maxAttempts) {
      console.log('🟢 [ensureMarginForBasketOrder] retrying in couple of secs...', {
        attempts,
        maxAttempts
      })
      await delay(ms(2))
      return ensureMarginForBasketOrder(user, orders, attempts + 1, maxAttempts)
    }
    return false
  }
}

export const isMarketOpen = (time = dayjs()) => {
  if (isDateHoliday(time)) {
    return false
  }

  const startTime = time.set('hour', 9).set('minute', 15).set('second', 0)
  const endTime = time.set('hour', 15).set('minute', 30).set('second', 0)

  return time.isAfter(startTime) && time.isBefore(endTime)
}

export function randomIntFromInterval (min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export function closest (needle, haystack, haystackKey, greaterThanEqualToPrice = false) {
  const filtered = haystack.filter((item) => {
    if (greaterThanEqualToPrice) {
      return item[haystackKey] >= needle
    }
    return item[haystackKey] >= needle || getPercentageChange(item[haystackKey], needle) <= 10
  })
  /**
   * the above ensures that we pick up a price lower than needle price,
   * only if it's at most 10% lesser than the needle price
   */
  return filtered.reduce((prev, curr) =>
    Math.abs(curr[haystackKey] - needle) < Math.abs(prev[haystackKey] - needle) ? curr : prev
  )
}

export const getTradingSymbolsByOptionPrice = async ({
  sourceData,
  nfoSymbol,
  price,
  instrumentType,
  pivotStrike,
  user,
  greaterThanEqualToPrice = false
}) => {
  const kite = syncGetKiteInstance(user)
  try {
    const totalStrikes = 21 // pivot and 10 on each side
    const strikeStepSize = 100
    const strikes = [...new Array(totalStrikes)]
      .map((_, idx) =>
        idx === 0 ? idx : idx < totalStrikes / 2 ? idx * -1 : idx - Math.floor(totalStrikes / 2)
      )
      .map((idx) => pivotStrike + idx * strikeStepSize)
      .sort()

    const requestParams = strikes.map((strike) => {
      const { tradingsymbol } = getCurrentExpiryTradingSymbol({
        sourceData,
        nfoSymbol,
        strike,
        instrumentType
      })

      return `${kite.EXCHANGE_NFO}:${tradingsymbol}`
    })

    const {
      data: { data: allPrices }
    } = await axios(
      `https://api.kite.trade/quote/ltp?${requestParams.map((symbol) => `i=${symbol}`).join('&')}`,
      {
        headers: {
          'X-Kite-Version': 3,
          Authorization: `token ${process.env.KITE_API_KEY}:${user.session.access_token}`
        }
      }
    )

    const getStrike = (inst) => {
      const withoutNfoString = inst.split(':')[1]
      const withoutNfoSymbol = withoutNfoString.replace(nfoSymbol, '')
      const withoutExpiryDetails = withoutNfoSymbol.substr(5, 5)
      return Number(withoutExpiryDetails)
    }

    const formattedPrices = Object.keys(allPrices).map((requestParam) => ({
      tradingsymbol: requestParam.split(':')[1],
      strike: getStrike(requestParam),
      ...allPrices[requestParam]
    }))

    return closest(price, formattedPrices, 'last_price', greaterThanEqualToPrice)
  } catch (e) {
    console.log(e)
    return e
  }
}

export function withoutFwdSlash (url) {
  if (url.endsWith('/')) {
    return url.slice(0, url.length - 1)
  }
  return url
}

export function premiumAuthCheck () {
  if (!process.env.SIGNALX_API_KEY) {
    return false
  }

  return axios.post(
    `${SIGNALX_URL}/api/auth`,
    {},
    {
      headers: {
        'X-API-KEY': process.env.SIGNALX_API_KEY
      }
    }
  )
}

export const SIGNALX_AXIOS_DB_AUTH = {
  headers: {
    'x-api-key': process.env.DATABASE_API_KEY
  }
}

export const withRemoteRetry = async (remoteFn, timeoutMs) => {
  const remoteFnExecution = () =>
    new Promise((resolve, reject, onCancel) => {
      const fn = async () => {
        try {
          const res = await remoteFn()
          return res
        } catch (e) {
          await Promise.delay(ms(1))
          return fn()
        }
      }

      fn().then(res => resolve(res)).catch(e => reject(e))

      // untested block
      onCancel(() => {
        console.log('cancelling the remoteFnExecution')
      })
    })

  const remoteFnExecutionPr = remoteFnExecution()

  const response = await Promise.any([
    Promise.delay(timeoutMs).then(() => null),
    remoteFnExecutionPr
  ])

  if (!response) {
    remoteFnExecutionPr.cancel()
  }

  return response
}

/**
 *
 * @param {ensureOrderState} string
 * Can either be `COMPLETE` or `TRIGGER PENDING`
 */

export const remoteOrderSuccessEnsurer = async (args) => {
  const {
    ensureOrderState = 'COMPLETE',
    orderProps,
    retryEveryMs,
    retryAttempts,
    user,
    attemptCount = 0
  } = args

  if (attemptCount >= retryAttempts) {
    throw new Error('TIMEDOUT')
  }

  await Promise.delay(retryEveryMs)

  const kite = syncGetKiteInstance(user)

  // should always be used in conjunction with a Promise.race or .any
  const infiniteStateChecker = (orderId) => {
    return new Promise((resolve, reject, onCancel) => {
      async function checkAttempt () {
        const orderHistory = await kite.getOrderHistory(orderId)
        const byRecencyOrderHistory = orderHistory.reverse()

        const wasOrderRejected = byRecencyOrderHistory.find(
          (odr) => odr.status === kite.STATUS_REJECTED
        )

        if (wasOrderRejected) {
          throw new Error(kite.STATUS_REJECTED)
        }

        const isOrderInExpectedState = byRecencyOrderHistory.find(
          (odr) => odr.status === ensureOrderState
        )

        if (!isOrderInExpectedState) {
          return false
        }

        return true
      }

      const checker = checkAttempt()
        .then((success) => {
          if (success) {
            return resolve(true)
          }
          Promise.delay(ms(2)).then(checker)
        })
        .catch((e) => {
          console.log('🔴 [infiniteStateChecker] checker error', e)
          if (e?.message === kite.STATUS_REJECTED) {
            return reject(kite.STATUS_REJECTED)
          }
          Promise.delay(ms(2)).then(checker)
        })

      onCancel(() => {
        console.log('cancelling this!')
      })
    })
  }

  const finiteStateChecker = (infinitePr, checkDurationMs) =>
    Promise.race([
      infinitePr,
      Promise.delay(checkDurationMs).then(() => false) // not waiting more than 30 seconds for order success state
    ])

  try {
    // this will work only when the initial placeOrder succeeded
    const { order_id: ackOrderId } = await kite.placeOrder(orderProps)
    const isOrderInUltimateStatePr = infiniteStateChecker(ackOrderId)
    try {
      const successful = await finiteStateChecker(isOrderInUltimateStatePr, ms(30))
      if (successful) {
        return true
      }

      // case - when placeOrder succeded but it's state couldn't be determined within 30 seconds
      isOrderInUltimateStatePr.cancel()
      return false
    } catch (e) {
      // should only reach here if it had a rejected status
      console.log('🔴 [remoteOrderSuccessEnsurer] caught', e)
      if (e?.message === kite.STATUS_REJECTED) {
        console.log('🟢 [remoteOrderSuccessEnsurer] retrying rejected order', orderProps)
        return remoteOrderSuccessEnsurer({ ...args, attemptCount: attemptCount + 1 })
      }
      throw e
    }
  } catch (e) {
    // will reach here if kite.placeOrder fails or some generic error
    //
    console.log('🔴 [remoteOrderSuccessEnsurer] parent caught', e)
    if (
      e?.status === 'error' &&
      (e?.error_type === 'NetworkException' || e?.error_type === 'OrderException')
    ) {
      // we cannot simply retry - don't know where the request failed inflight
      // check at the broker's end - if the order exists with that tag or not

      try {
        const orders = await withRemoteRetry(() => kite.getOrders(), ms(60))
        const matchedOrder = orders.find(
          (order) =>
            order.tag === orderProps.orderTag &&
            order.tradingsymbol === orderProps.tradingsymbol &&
            order.quantity === orderProps.quantity &&
            order.product === orderProps.product &&
            order.transaction_type === orderProps.transaction_type &&
            order.exchange === orderProps.exchange
        )
        if (!matchedOrder) {
          // orders api responded successfully and we didn't find a matching order
          // so reattempt the order
          return remoteOrderSuccessEnsurer({ ...args, attemptCount: attemptCount + 1 })
        }

        // order found
        // ensure that it's in the expected state
        const isMatchedOrderInUltimateStatePr = infiniteStateChecker(matchedOrder.order_id)
        try {
          const successful = await finiteStateChecker(isMatchedOrderInUltimateStatePr, ms(30))
          return successful
        } catch (e) {
          if (e?.message === kite.STATUS_REJECTED) {
            return remoteOrderSuccessEnsurer({ ...args, attemptCount: attemptCount + 1 })
          }
          return false
        }
      } catch (e) {
        // case - tried getting orders for 1 min, but no response from broker
        return false
      }
    }

    return false
  }
}
