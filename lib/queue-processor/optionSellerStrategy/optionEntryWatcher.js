import { INSTRUMENT_DETAILS } from '../../constants'
import {
  getIndexInstruments,
  getInstrumentPrice,
  getTradingSymbolsByOptionPrice,
  syncGetKiteInstance
} from '../../utils'

import console from '../../logging'
// import { addToNextQueue, WATCHER_Q_NAME } from '../queue'

const optionSellerEntryWatcher = async ({
  limitOrderAckId,
  entryPrice,
  slTriggerPrice,
  watchForOrderState,
  initialJobData,
  addHedge
}) => {
  try {
    const { user, orderTag, instrument, expiryType } = initialJobData
    const kite = syncGetKiteInstance(user)
    const orderHistory = await kite.getOrderHistory(limitOrderAckId)
    const revOrderHistory = orderHistory.reverse()
    const completedOrder = revOrderHistory.find(
      order => order.status === kite.STATUS_COMPLETE
    )
    if (!completedOrder) {
      return Promise.reject(
        new Error('[optionSellerEntryWatcher] still pending!')
      )
    }

    const slOrder = {
      tradingsymbol: completedOrder.tradingsymbol,
      quantity: completedOrder.quantity,
      exchange: kite.EXCHANGE_NFO,
      transaction_type: kite.TRANSACTION_TYPE_BUY,
      trigger_price: slTriggerPrice,
      order_type: kite.ORDER_TYPE_SLM,
      product: kite.PRODUCT_MIS,
      validity: kite.VALIDITY_DAY,
      tag: orderTag
    }

    console.log({ slOrder })
    // order completed! punch the SL and hedge order
    const { order_id: slOrderAckId } = await kite.placeOrder(
      kite.VARIETY_REGULAR,
      slOrder
    )

    console.log({ slOrderAckId })

    const { nfoSymbol, underlyingSymbol, strikeStepSize } = INSTRUMENT_DETAILS[
      instrument
    ]
    const instrumentsData = await getIndexInstruments()

    const underlyingLTP = await getInstrumentPrice(
      kite,
      underlyingSymbol,
      kite.EXCHANGE_NFO
    )
    const atmStrike =
      Math.round(underlyingLTP / strikeStepSize) * strikeStepSize
    console.log({ atmStrike })

    if (!addHedge) {
      return { slOrderAckId }
    }

    const {
      tradingsymbol: hedgeTradingSymbol
    } = await getTradingSymbolsByOptionPrice({
      sourceData: instrumentsData,
      nfoSymbol,
      price: 1,
      pivotStrike: atmStrike,
      instrumentType: completedOrder.tradingsymbol.substr(
        completedOrder.tradingsymbol.length - 2,
        completedOrder.tradingsymbol.length - 1
      ),
      user,
      expiry: expiryType
    })

    const hedgeOrder = {
      tradingsymbol: hedgeTradingSymbol,
      quantity: completedOrder.quantity,
      exchange: kite.EXCHANGE_NFO,
      transaction_type: kite.TRANSACTION_TYPE_BUY,
      trigger_price: slTriggerPrice,
      order_type: kite.ORDER_TYPE_MARKET,
      product: kite.PRODUCT_MIS,
      validity: kite.VALIDITY_DAY,
      tag: orderTag
    }

    const { order_id: hedgeOrderAckId } = await kite.placeOrder(
      kite.VARIETY_REGULAR,
      hedgeOrder
    )

    return { slOrderAckId, hedgeOrderAckId }
  } catch (e) {
    console.log('🔴 [optionSellerEntryWatcher] error. Checker terminated!!', e)
    // a promise reject here could be dangerous due to retry logic.
    // It could lead to multiple exit orders for the same initial order_id
    // hence, resolve
    return Promise.resolve('[optionSellerEntryWatcher] error')
  }
}

export default optionSellerEntryWatcher
