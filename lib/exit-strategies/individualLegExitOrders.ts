import { KiteOrder } from '../../types/kite'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'
import console from '../logging'
import orderResponse from '../strategies/mockData/orderResponse'
import { attemptBrokerOrders, isMockOrder, remoteOrderSuccessEnsurer, syncGetKiteInstance } from '../utils'
import { doDeletePendingOrders, doSquareOffPositions } from './autoSquareOff'

async function individualLegExitOrders ({
  _kite,
  initialJobData,
  rawKiteOrdersResponse
}: {
  _kite?: any
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

  const exitOrderPrs = exitOrders.map(async (order) => remoteOrderSuccessEnsurer({
    _kite: kite,
    ensureOrderState: 'TRIGGER PENDING',
    orderProps: order,
    user: user!
  }))

  const { allOk, statefulOrders } = await attemptBrokerOrders(exitOrderPrs)
  if (!allOk && rollback?.onBrokenExitOrders) {
    await doDeletePendingOrders(statefulOrders, kite)
    await doSquareOffPositions(completedOrders, kite, {
      orderTag
    })

    throw Error('rolled back onBrokenExitOrders')
  }

  return statefulOrders
}

export default individualLegExitOrders
