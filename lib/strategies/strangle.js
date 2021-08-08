import { INSTRUMENT_DETAILS } from '../constants'
import console from '../logging'
import { EXIT_TRADING_Q_NAME } from '../queue'
import {
  ensureMarginForBasketOrder,
  getCurrentExpiryTradingSymbol,
  getIndexInstruments,
  ms,
  remoteOrderSuccessEnsurer,
  syncGetKiteInstance
} from '../utils'
import { getATMStraddle as getATMStrikes } from './atmStraddle'
import { doSquareOffPositions } from '../exit-strategies/autoSquareOff'
import dayjs from 'dayjs'

const getStrangleStrikes = async ({ atmStrike, instrument, inverted = false }) => {
  const { nfoSymbol, strikeStepSize } = INSTRUMENT_DETAILS[
    instrument
  ]
  const lowerLegPEStrike = atmStrike - strikeStepSize
  const higherLegCEStrike = atmStrike + strikeStepSize

  const sourceData = await getIndexInstruments()

  const { tradingsymbol: LOWER_LEG_PE_STRING } = getCurrentExpiryTradingSymbol({
    sourceData,
    nfoSymbol,
    strike: lowerLegPEStrike,
    instrumentType: 'PE'
  })

  const { tradingsymbol: HIGHER_LEG_CE_STRING } = getCurrentExpiryTradingSymbol({
    sourceData,
    nfoSymbol,
    strike: higherLegCEStrike,
    instrumentType: 'CE'
  })

  const PE_STRING = !inverted ? LOWER_LEG_PE_STRING : HIGHER_LEG_CE_STRING.replace('CE', 'PE')
  const CE_STRING = !inverted ? HIGHER_LEG_CE_STRING : LOWER_LEG_PE_STRING.replace('PE', 'CE')

  return {
    PE_STRING,
    CE_STRING
  }
}

export default async (args) => {
  const { instrument, inverted = false, lots, user, orderTag, rollback = {}, __nextTradingQueue = EXIT_TRADING_Q_NAME } = args
  const { lotSize, nfoSymbol, strikeStepSize, exchange, underlyingSymbol } = INSTRUMENT_DETAILS[instrument]

  const sourceData = await getIndexInstruments()

  const {
    atmStrike
  } = await getATMStrikes({
    ...args,
    takeTradeIrrespectiveSkew: true,
    instruments: sourceData,
    startTime: dayjs(),
    expiresAt: dayjs().subtract(1, 'seconds'),
    underlyingSymbol,
    exchange,
    nfoSymbol,
    strikeStepSize
  })

  const {
    PE_STRING,
    CE_STRING
  } = await getStrangleStrikes({
    atmStrike,
    instrument,
    inverted
  })

  const kite = syncGetKiteInstance(user)

  const orders = [PE_STRING, CE_STRING].map((symbol) => ({
    tradingsymbol: symbol,
    quantity: lotSize * lots,
    exchange: kite.EXCHANGE_NFO,
    transaction_type: kite.TRANSACTION_TYPE_SELL,
    order_type: kite.ORDER_TYPE_MARKET,
    product: kite.PRODUCT_MIS,
    validity: kite.VALIDITY_DAY,
    tag: orderTag
  }))

  const hasMargin = await ensureMarginForBasketOrder(user, orders)
  if (!hasMargin) {
    throw new Error('insufficient margin')
  }

  try {
    console.log('placing strangle orders...', orders)
    const brokerOrdersPr = orders.map((order) => remoteOrderSuccessEnsurer({
      _kite: kite,
      orderProps: order,
      ensureOrderState: kite.STATUS_COMPLETE,
      user
    }))

    const brokerOrderResolutions = await Promise.allSettled(brokerOrdersPr)

    const unsuccessfulLegs = brokerOrderResolutions.filter(res => res.status === 'rejected' || (res.status === 'fulfilled' && !res.value.successful))
    if (!unsuccessfulLegs.length) {
      // best case scenario
      const completedOrders = brokerOrderResolutions.map(res => res.value.response)
      return {
        __nextTradingQueue,
        rawKiteOrdersResponse: completedOrders
      }
    } else if (unsuccessfulLegs.length === orders.length) {
      // no orders went through, terminate the strategy
      throw new Error('🔴 [strangle] failed after several reattempts!')
    } else {
      // some legs have failed even after several retry attempts
      // ACTION: square off the ones which are successful?
      const partialFulfilledLegs = brokerOrderResolutions.filter(res => res.status === 'fulfilled').map(res => res.value.response)
      if (rollback.onBrokenPrimaryOrders) {
        await doSquareOffPositions(partialFulfilledLegs, kite, {
          orderTag
        })
      }

      // generate an alert right now
      throw new Error('🔴 [strangle] some legs failed!')
    }
  } catch (e) {
    console.log('🔴 strangle orders failed!', e)
    throw e
  }
}
