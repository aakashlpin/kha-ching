import { INSTRUMENT_DETAILS } from '../../constants'
import console from '../../logging'
import orderResponse from '../../strategies/mockData/orderResponse'
import { fetchHistoricalPrice } from '../../strategies/optionSellerStrategy'
import { getAllOrNoneCompletedOrdersByKiteResponse, getPercentageChange, syncGetKiteInstance } from '../../utils'
const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false

async function optionSellerOptionEntry ({
  initialJobData,
  optionStrike
}) {
  const [priceData] = await fetchHistoricalPrice(optionStrike.instrument_token)
  const { low, high } = priceData
  const entryLimitPrice = low - 0.5
  const slTriggerPrice = high + 0.5
  const rr = entryLimitPrice / (slTriggerPrice - entryLimitPrice)
  const candleSkew = getPercentageChange(low, high, 'CONSERVATIVE')
  const isTallCandle = candleSkew > 50

  const favourableEntry = rr > 1 && !isTallCandle

  if (!favourableEntry) {
    return null
    // return Promise.reject(new Error('🔴 [optionSellerOptionEntry] not favourableEntry. Will retry!'))
  }

  const { user, lots, orderTag, instrument } = initialJobData
  const { lotSize } = INSTRUMENT_DETAILS[instrument]
  const kite = syncGetKiteInstance(user)

  const order = {
    tradingsymbol: optionStrike.tradingsymbol,
    quantity: Number(lots) * lotSize,
    exchange: kite.EXCHANGE_NFO,
    transaction_type: kite.TRANSACTION_TYPE_SELL,
    trigger_price: entryLimitPrice,
    order_type: kite.ORDER_TYPE_SLM,
    product: kite.PRODUCT_MIS,
    validity: kite.VALIDITY_DAY,
    tag: orderTag
  }

  // placing a SLM order, not market order
  const { order_id: limitOrderAckId } = await kite.placeOrder(kite.VARIETY_REGULAR, order)

  return {
    entryLimitPrice,
    slTriggerPrice,
    limitOrderAckId
  }

  // return {
  //   rr,
  //   candleSkew,
  //   isTallCandle,
  //   favourableEntry
  // }

  // if (MOCK_ORDERS) {
  //   const mockResponse = [...new Array(rawKiteOrdersResponse.length)].map(
  //     (_, idx) => orderResponse[idx]
  //   )
  //   return mockResponse
  // }

  // const { slmPercent, user } = initialJobData
  // const kite = syncGetKiteInstance(user)
  // const completedOrders = await getAllOrNoneCompletedOrdersByKiteResponse(
  //   kite,
  //   rawKiteOrdersResponse
  // )

  // if (!completedOrders) {
  //   console.error('Initial order not completed yet! Waiting for `Completed` order type...')
  //   throw new Error('Initial order not completed yet! Waiting for `Completed` order type...')
  // }

  // console.log('🟢 Initial order punched on Zerodha!')

  // const SLM_PERCENTAGE = 1 + slmPercent / 100
  // const exitOrders = completedOrders.map((order) => {
  //   const exitPrice = Math.round(order.average_price * SLM_PERCENTAGE)
  //   const exitOrder = {
  //     trigger_price: exitPrice,
  //     tradingsymbol: order.tradingsymbol,
  //     quantity: Math.abs(quantityMultiplier * order.quantity),
  //     exchange: order.exchange,
  //     transaction_type: type === 'BUY' ? kite.TRANSACTION_TYPE_BUY : kite.TRANSACTION_TYPE_SELL,
  //     order_type: kite.ORDER_TYPE_SLM,
  //     product: order.product,
  //     tag: initialJobData.orderTag
  //   }
  //   console.log('placing exit orders...', exitOrder)
  //   return kite.placeOrder(kite.VARIETY_REGULAR, exitOrder)
  // })

  // try {
  //   const response = await Promise.all(exitOrders)
  //   console.log(response)
  //   return response
  // } catch (e) {
  //   console.log('exit orders failed!!', e)
  //   throw new Error(e)
  // }
}

export default optionSellerOptionEntry
