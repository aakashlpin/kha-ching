import { KiteOrder } from '../../types/kite'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'
import console from '../logging'
import orderResponse from '../strategies/mockData/orderResponse'
import { isMockOrder, remoteOrderSuccessEnsurer, syncGetKiteInstance } from '../utils'
import { doSquareOffPositions } from './autoSquareOff'

async function individualLegExitOrders ({
  _kite,
  initialJobData,
  rawKiteOrdersResponse
}: {
  _kite: any
  initialJobData: SUPPORTED_TRADE_CONFIG
  rawKiteOrdersResponse: KiteOrder[]
}) {
  if (isMockOrder()) {
    const mockResponse = [...new Array(rawKiteOrdersResponse.length)].map(
      (_, idx) => orderResponse[idx]
    )
    return mockResponse
  }

  const { slmPercent, user, orderTag, rollback } = initialJobData
  const kite = _kite || syncGetKiteInstance(user)
  const completedOrders = rawKiteOrdersResponse

  const SLM_PERCENTAGE = 1 + slmPercent / 100
  const exitOrders = completedOrders.map((order) => {
    const { tradingsymbol, exchange, transaction_type: transactionType, product, quantity } = order
    const exitPrice = Math.round(order.average_price! * SLM_PERCENTAGE)
    const exitOrder = {
      trigger_price: exitPrice,
      tradingsymbol,
      quantity: Math.abs(quantity),
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
    _kite: kite,
    ensureOrderState: 'TRIGGER PENDING',
    orderProps: order,
    user: user!
  }))
  const brokerOrderResolutions = await Promise.allSettled(exitOrderPrs)
  const unsuccessfulLegs = brokerOrderResolutions.filter(res => res.status === 'rejected' || (res.status === 'fulfilled' && !res.value.successful))
  if (!unsuccessfulLegs.length) {
    // best case scenario
    const completedOrders = brokerOrderResolutions.map(res => res.status === 'fulfilled' && res.value.response)
    return completedOrders
  } else {
    // very bad situation to be in.
    // original positions are in, but one or more SL orders are not
    const successfulExitLegs = brokerOrderResolutions.map(res => res.status === 'fulfilled' && res.value.response).filter(res => res)
    if (rollback?.onBrokenExitOrders) {
      await doSquareOffPositions([...successfulExitLegs, ...completedOrders], kite, initialJobData)
    }
    throw new Error('🔴 [individualLegExitOrders] one or more SL orders failed!')
  }
}

export default individualLegExitOrders
