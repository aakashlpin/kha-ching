import console from '../logging'
import orderResponse from '../strategies/mockData/orderResponse'
import { remoteOrderSuccessEnsurer, syncGetKiteInstance } from '../utils'
const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false

export default async ({
  __kite,
  type = 'BUY',
  quantityMultiplier = 1,
  initialJobData,
  rawKiteOrdersResponse
}) => {
  if (MOCK_ORDERS) {
    const mockResponse = [...new Array(rawKiteOrdersResponse.length)].map(
      (_, idx) => orderResponse[idx]
    )
    return mockResponse
  }

  const { slmPercent, user } = initialJobData
  const kite = __kite || syncGetKiteInstance(user)
  const completedOrders = rawKiteOrdersResponse

  const SLM_PERCENTAGE = 1 + slmPercent / 100
  const exitOrders = completedOrders.map((order) => {
    const exitPrice = Math.round(order.average_price * SLM_PERCENTAGE)
    const exitOrder = {
      trigger_price: exitPrice,
      tradingsymbol: order.tradingsymbol,
      quantity: Math.abs(quantityMultiplier * order.quantity),
      exchange: order.exchange,
      transaction_type: type === 'BUY' ? kite.TRANSACTION_TYPE_BUY : kite.TRANSACTION_TYPE_SELL,
      order_type: kite.ORDER_TYPE_SLM,
      product: order.product,
      tag: initialJobData.orderTag
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
    throw new Error('🔴 [individualLegExitOrders] one or more SL orders failed!')
  }
}
