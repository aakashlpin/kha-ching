import console from '../logging'
import orderResponse from '../strategies/mockData/orderResponse'
import { getAllOrNoneCompletedOrdersByKiteResponse, syncGetKiteInstance } from '../utils'
const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false

export default async ({
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
  const kite = syncGetKiteInstance(user)
  const completedOrders = await getAllOrNoneCompletedOrdersByKiteResponse(
    kite,
    rawKiteOrdersResponse
  )

  if (!completedOrders) {
    console.error('Initial order not completed yet! Waiting for `Completed` order type...')
    throw new Error('Initial order not completed yet! Waiting for `Completed` order type...')
  }

  console.log('🟢 Initial order punched on Zerodha!')

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
    return kite.placeOrder(kite.VARIETY_REGULAR, exitOrder)
  })

  try {
    const response = await Promise.all(exitOrders)
    console.log(response)
    return response
  } catch (e) {
    console.log('exit orders failed!!', e)
    throw new Error(e)
  }
}
