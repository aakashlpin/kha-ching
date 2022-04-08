import { syncGetKiteInstance } from '../../utils'
import { BROKER } from '../../constants'

import console from '../../logging'

const optionSellerSLWatcher = async ({
  slOrderAckId,
  entryPrice,
  slTriggerPrice,
  watchForOrderState,
  initialJobData,
  attemptCount,
  maxAttempts
}) => {
  try {
    const { user, orderTag } = initialJobData
    const kite = syncGetKiteInstance(user, BROKER.KITE)
    const orderHistory = await kite.getOrderHistory(slOrderAckId)
    const revOrderHistory = orderHistory.reverse()
    const completedOrder = revOrderHistory.find(
      order => order.status === kite.kc.STATUS_COMPLETE
    )
    if (!completedOrder) {
      return Promise.reject(new Error('[optionSellerSLWatcher] still pending!'))
    }

    if (attemptCount > maxAttempts) {
      return Promise.resolve('all re-attempts exhausted')
    }

    const reEntryOrder = {
      tradingsymbol: completedOrder.tradingsymbol,
      quantity: completedOrder.quantity,
      exchange: kite.kc.EXCHANGE_NFO,
      transaction_type: kite.kc.TRANSACTION_TYPE_SELL,
      trigger_price: entryPrice,
      order_type: kite.kc.ORDER_TYPE_SLM,
      product: kite.kc.PRODUCT_MIS,
      validity: kite.kc.VALIDITY_DAY,
      tag: orderTag
    }

    // order completed! punch the SL
    const { order_id: reEntryOrderAckId } = await kite.placeOrder(
      kite.kc.VARIETY_REGULAR,
      reEntryOrder
    )

    console.log({ reEntryOrderAckId })
  } catch (e) {
    console.log('🔴 [optionSellerSLWatcher] error. Checker terminated!!', e)
    // a promise reject here could be dangerous due to retry logic.
    // It could lead to multiple exit orders for the same initial order_id
    // hence, resolve
    return Promise.resolve('[optionSellerSLWatcher] error')
  }
}

export default optionSellerSLWatcher
