import dayjs from 'dayjs'

import { INSTRUMENT_DETAILS } from '../constants'
import console from '../logging'
import { EXIT_TRADING_Q_NAME } from '../queue'
import {
  delay,
  ensureMarginForBasketOrder,
  getCurrentExpiryTradingSymbol,
  getIndexInstruments,
  getInstrumentPrice,
  getSkew,
  ms,
  syncGetKiteInstance
} from '../utils'
import mockOrderResponse from './mockData/orderResponse'
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore')

dayjs.extend(isSameOrBefore)

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false

export async function getATMStraddle (args) {
  const {
    startTime,
    user,
    underlyingSymbol,
    exchange,
    nfoSymbol,
    strikeStepSize,
    maxSkewPercent,
    thresholdSkewPercent,
    takeTradeIrrespectiveSkew,
    expiresAt,
    instruments,
    attempt = 0
  } = args
  try {
    /**
     * getting a little smarter about skews
     *
     * if 50% time has elapsed, then start increasing skew % by weighing heavier towards thresholdSkewPercent
     * every passing equal split duration
     *
     * so for example - if skew checker is going to run for 10mins
     * and 5 mins have passed, divide the remaining time between equidistant buckets
     * so each fractional time remaining, keep gravitating towards thresholdSkewPercent
     * e.g. between 5-6min, skew = 50% * (maxSkewPercent) + 50% * (thresholdSkewPercent)
     * between 6-7min, skew = 40% * (maxSkewPercent) + 60% * (thresholdSkewPercent)
     * ...and so on and so forth
     *
     * and then eventually if the timer expires, then decide basis `takeTradeIrrespectiveSkew`
     */

    const totalTime = dayjs(expiresAt).diff(startTime)
    const remainingTime = dayjs(expiresAt).diff(dayjs())
    const timeExpired = dayjs().isAfter(dayjs(expiresAt))

    const fractionalTimeRemaining = remainingTime / totalTime
    const updatedSkewPercent = thresholdSkewPercent
      ? fractionalTimeRemaining >= 0.5
          ? maxSkewPercent
          : Math.round(
            fractionalTimeRemaining * maxSkewPercent +
              (1 - fractionalTimeRemaining) * thresholdSkewPercent
          )
      : maxSkewPercent

    const kite = syncGetKiteInstance(user)
    const underlyingLTP = await getInstrumentPrice(kite, underlyingSymbol, exchange)
    const atmStrike = Math.round(underlyingLTP / strikeStepSize) * strikeStepSize

    const { PE_STRING, CE_STRING } = getCurrentExpiryTradingSymbol({
      nfoSymbol,
      sourceData: instruments,
      strike: atmStrike
    })

    // if time has expired
    if (timeExpired) {
      console.log(
        `🔔 [atmStraddle] time has run out! takeTradeIrrespectiveSkew = ${takeTradeIrrespectiveSkew}`
      )
      if (takeTradeIrrespectiveSkew) {
        return {
          PE_STRING,
          CE_STRING,
          atmStrike
        }
      }

      return Promise.reject('[atmStraddle] time expired and takeTradeIrrespectiveSkew is false')
    }

    // if time hasn't expired
    const { skew } = await getSkew(kite, PE_STRING, CE_STRING, 'NFO')
    // if skew not fitting in, try again
    if (skew > updatedSkewPercent) {
      console.log(
        `Retry #${
          attempt + 1
        }... Live skew (${skew}%) > Skew consideration (${updatedSkewPercent}%)`
      )
      await delay(ms(2))
      return getATMStraddle({ ...args, attempt: attempt + 1 })
    }

    console.log(
      `[atmStraddle] punching with current skew ${skew}%, and last skew threshold was ${updatedSkewPercent}`
    )

    // if skew is fitting in, return
    return {
      PE_STRING,
      CE_STRING,
      atmStrike
    }
  } catch (e) {
    console.log('[getATMStraddle] exception', e)
    if (e?.error_type === 'NetworkException') {
      return getATMStraddle({ ...args, attempt: attempt + 1 })
    }
    return Promise.reject(e)
  }
}

export const createOrder = ({ symbol, lots, lotSize, user, orderTag }) => {
  const kite = syncGetKiteInstance(user)
  return {
    tradingsymbol: symbol,
    quantity: lotSize * lots,
    exchange: kite.EXCHANGE_NFO,
    transaction_type: kite.TRANSACTION_TYPE_SELL,
    order_type: kite.ORDER_TYPE_MARKET,
    product: kite.PRODUCT_MIS,
    validity: kite.VALIDITY_DAY,
    tag: orderTag
  }
}

export default async ({
  instrument,
  lots,
  user,
  expiresAt,
  orderTag,
  maxSkewPercent = 10,
  thresholdSkewPercent, // will be missing for existing plans
  takeTradeIrrespectiveSkew = true, // for it to be backwards compatible with existing plans
  __nextTradingQueue = EXIT_TRADING_Q_NAME
}) => {
  const kite = syncGetKiteInstance(user)

  const { underlyingSymbol, exchange, nfoSymbol, lotSize, strikeStepSize } = INSTRUMENT_DETAILS[
    instrument
  ]

  console.log('processing atm straddle for', {
    underlyingSymbol,
    exchange,
    nfoSymbol,
    strikeStepSize,
    lots,
    maxSkewPercent
  })

  const instruments = await getIndexInstruments()

  let PE_STRING, CE_STRING, straddle
  try {
    straddle = await getATMStraddle({
      startTime: dayjs(),
      user,
      instruments,
      underlyingSymbol,
      exchange,
      nfoSymbol,
      strikeStepSize,
      maxSkewPercent,
      thresholdSkewPercent,
      takeTradeIrrespectiveSkew,
      expiresAt
    })

    PE_STRING = straddle.PE_STRING
    CE_STRING = straddle.CE_STRING
  } catch (e) {
    console.log('🔴 [atmStradde] getATMStraddle failed', e)
    return Promise.reject(e)
  }

  console.log('Straddle strikes', { PE_STRING, CE_STRING })

  const orders = [PE_STRING, CE_STRING].map((symbol) =>
    createOrder({ symbol, lots, lotSize, user, orderTag })
  )

  if (!MOCK_ORDERS && !(await ensureMarginForBasketOrder(user, orders))) {
    return Promise.reject('insufficient margin!')
  }

  if (MOCK_ORDERS) {
    console.log('MOCK ORDERS = true! NOT PUNCHING ORDERS', orders)
    return {
      __nextTradingQueue,
      straddle,
      rawKiteOrdersResponse: mockOrderResponse
    }
  }

  try {
    console.log('placing orders...')
    console.log(JSON.stringify(orders, null, 2))
    const orderAckResponses = await Promise.all(
      orders.map((order) => kite.placeOrder(kite.VARIETY_REGULAR, order))
    )
    return {
      __nextTradingQueue,
      straddle,
      rawKiteOrdersResponse: orderAckResponses
    }
  } catch (e) {
    console.log(e)
    throw e
  }
}
