import console from '../logging'
import orderResponse from '../strategies/mockData/orderResponse'
import { isMockOrder, remoteOrderSuccessEnsurer, syncGetKiteInstance } from '../utils'
import { doSquareOffPositions } from './autoSquareOff'

export default async ({
  __kite,
  quantityMultiplier = 1,
  initialJobData,
  rawKiteOrdersResponse
}) => {
  if (isMockOrder()) {
    const mockResponse = [...new Array(rawKiteOrdersResponse.length)].map(
      (_, idx) => orderResponse[idx]
    )
    return mockResponse
  }

  const { slmPercent, user, orderTag, rollback = {} } = initialJobData
  const kite = __kite || syncGetKiteInstance(user)
  const completedOrders = rawKiteOrdersResponse

  if (!completedOrders.every(order => 'average_price' in order)) {
    console.log('🔴 [individualLegExitOrders] got called without completed order object')
    console.log(completedOrders)
    throw new Error('🔴 [individualLegExitOrders] got called without completed order object')
  }

  const SLM_PERCENTAGE = 1 + slmPercent / 100
  const exitOrders = completedOrders.map((order) => {
    const { tradingsymbol, exchange, transaction_type: transactionType, product, quantity } = order
    const exitPrice = Math.round(order.average_price * SLM_PERCENTAGE)
    const exitOrder = {
      trigger_price: exitPrice,
      tradingsymbol,
      quantity: Math.abs(quantityMultiplier * quantity),
      exchange,
      transaction_type: transactionType === kite.TRANSACTION_TYPE_BUY ? kite.TRANSACTION_TYPE_SELL : kite.TRANSACTION_TYPE_BUY,
      order_type: kite.ORDER_TYPE_SLM,
      product: product,
      tag: orderTag
    }
    console.log('placing exit orders...', exitOrder)
    return exitOrder
  })

  const exitOrderPrs = exitOrders.map(order => remoteOrderSuccessEnsurer({
    __kite: kite,
    ensureOrderState: 'TRIGGER PENDING',
    orderProps: order,
    user
  }))
  const brokerOrderResolutions = await Promise.allSettled(exitOrderPrs)
  const unsuccessfulLegs = brokerOrderResolutions.filter(res => res.status === 'rejected' || (res.status === 'fulfilled' && !res.value.successful))
  if (!unsuccessfulLegs.length) {
    // best case scenario
    const completedOrders = brokerOrderResolutions.map(res => res.value.response)
    return completedOrders
  } else {
    // very bad situation to be in.
    // original positions are in, but one or more SL orders are not
    const successfulExitLegs = brokerOrderResolutions.filter(res => res.status === 'fulfilled').map(res => res.value.response)
    if (rollback.onBrokenExitOrders) {
      await doSquareOffPositions([...successfulExitLegs, ...completedOrders], kite, initialJobData)
    }
    throw new Error('🔴 [individualLegExitOrders] one or more SL orders failed!')
  }
}
