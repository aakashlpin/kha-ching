import { INSTRUMENT_DETAILS } from '../constants'
import console from '../logging'
import { EXIT_TRADING_Q_NAME } from '../queue'
import {
  ensureMarginForBasketOrder,
  getCurrentExpiryTradingSymbol,
  getIndexInstruments,
  isMockOrder,
  syncGetKiteInstance
} from '../utils'
import atmStraddle, {
  createOrder as createATMStraddleOrder,
  getATMStraddle as getATMStrikes
} from './atmStraddle'
import strangleMockOrderResponse from './mockData/orderResponse'

async function ensureMargin (args) {
  const { PE_STRING, CE_STRING } = await getATMStrikes({
    ...args,
    ignoreSkew: true
  })

  const { lots, lotSize, user } = args
  const orders = [PE_STRING, CE_STRING].map((symbol) =>
    createATMStraddleOrder({ symbol, lots, lotSize, user })
  )

  const hasMargin = await ensureMarginForBasketOrder(user, orders)
  return hasMargin
}

export default async (args) => {
  // the lots here should be the total lotsize user wants to trade
  // and then algo should split it in 1:2 ratio
  const { instrument, lots, user, orderTag, __nextTradingQueue = EXIT_TRADING_Q_NAME } = args
  const { underlyingSymbol, exchange, nfoSymbol, lotSize, strikeStepSize } = INSTRUMENT_DETAILS[
    instrument
  ]
  const accessToken = user?.session?.access_token
  if (!accessToken) {
    throw new Error('[Kiteconnect] not authorized or access revoked')
  }

  if (lots % 3 !== 0) {
    throw new Error('Error: lots should be in multiple of 3 for this strategy')
  }

  // if lots = 12, straddle should be 4
  // and strangle should be 8
  const straddleLots = lots / 3 // 4
  const strangleLots = straddleLots * 2 // 8

  const jsonArray = await getIndexInstruments()

  if (
    !(await ensureMargin({
      ...args,
      lotSize,
      underlyingSymbol,
      instruments: jsonArray,
      exchange,
      nfoSymbol,
      strikeStepSize
    }))
  ) {
    return Promise.reject(new Error('Not enough margin'))
  }

  try {
    const straddleResponse = await atmStraddle({
      ...args,
      lots: straddleLots,
      __nextTradingQueue: null
    })

    if (!straddleResponse?.straddle) {
      return Promise.reject(straddleResponse)
    }

    const { straddle, rawKiteOrdersResponse: straddleOrdersAckResponse } = straddleResponse

    const kite = syncGetKiteInstance(user)

    const { atmStrike } = straddleResponse.straddle

    const lowerLegPEStrike = atmStrike - strikeStepSize
    const higherLegCEStrike = atmStrike + strikeStepSize

    const { tradingsymbol: LOWER_LEG_PE_STRING } = getCurrentExpiryTradingSymbol({
      sourceData: jsonArray,
      nfoSymbol,
      strike: lowerLegPEStrike,
      instrumentType: 'PE'
    })

    const { tradingsymbol: HIGHER_LEG_CE_STRING } = getCurrentExpiryTradingSymbol({
      sourceData: jsonArray,
      nfoSymbol,
      strike: higherLegCEStrike,
      instrumentType: 'CE'
    })

    const orders = [LOWER_LEG_PE_STRING, HIGHER_LEG_CE_STRING].map((symbol) => ({
      tradingsymbol: symbol,
      quantity: lotSize * strangleLots,
      exchange: kite.EXCHANGE_NFO,
      transaction_type: kite.TRANSACTION_TYPE_SELL,
      order_type: kite.ORDER_TYPE_MARKET,
      product: kite.PRODUCT_MIS,
      validity: kite.VALIDITY_DAY,
      tag: orderTag
    }))

    if (isMockOrder()) {
      console.log('MOCK_ORDERS only! Not sending to broker', orders)
      return Promise.resolve({
        __nextTradingQueue,
        straddle,
        rawKiteOrdersResponse: [...straddleOrdersAckResponse, ...strangleMockOrderResponse]
      })
    }

    try {
      console.log('placing strangle orders...', orders)
      const strangleOrdersAckResponses = await Promise.all(
        orders.map((order) => kite.placeOrder(kite.VARIETY_REGULAR, order))
      )
      console.log(strangleOrdersAckResponses)
      return Promise.resolve({
        __nextTradingQueue,
        straddle,
        rawKiteOrdersResponse: [...straddleOrdersAckResponse, ...strangleOrdersAckResponses]
      })
    } catch (e) {
      console.log('🔴 strangle orders failed!', e)
      Promise.reject(e)
    }
  } catch (e) {
    return Promise.reject(e)
  }
}
