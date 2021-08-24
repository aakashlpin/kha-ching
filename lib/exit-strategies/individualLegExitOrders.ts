import { KiteOrder } from '../../types/kite'
import { SL_ORDER_TYPE } from '../../types/plans'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'
import console from '../logging'
import { addToNextQueue, WATCHER_Q_NAME } from '../queue'
import orderResponse from '../strategies/mockData/orderResponse'
import { attemptBrokerOrders, isMockOrder, remoteOrderSuccessEnsurer, round, syncGetKiteInstance } from '../utils'
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

  const { slmPercent, user, orderTag, rollback, slOrderType = SL_ORDER_TYPE.SLM, slLimitPricePercent } = initialJobData
  const kite = _kite || syncGetKiteInstance(user)
  const completedOrders = rawKiteOrdersResponse

  const exitOrders = completedOrders.map((order) => {
    const { tradingsymbol, exchange, transaction_type: transactionType, product, quantity, average_price: avgOrderPrice } = order
    let exitOrderTransactionType
    let exitOrderTriggerPrice

    const absoluteSl: number = slmPercent / 100 * avgOrderPrice!
    if (transactionType === kite.TRANSACTION_TYPE_SELL) {
      // original order is short positions
      // exit orders would be buy orders with prices slmPercent above the avg sell prices
      exitOrderTransactionType = kite.TRANSACTION_TYPE_BUY
      exitOrderTriggerPrice = avgOrderPrice! + absoluteSl
    } else {
      // original order is long positions
      exitOrderTransactionType = kite.TRANSACTION_TYPE_SELL
      exitOrderTriggerPrice = avgOrderPrice! - absoluteSl
    }

    const exitOrder: KiteOrder = {
      transaction_type: exitOrderTransactionType,
      trigger_price: exitOrderTriggerPrice,
      order_type: kite.ORDER_TYPE_SLM,
      quantity: Math.abs(quantity),
      tag: orderTag!,
      product,
      tradingsymbol,
      exchange
    }

    if (slOrderType === SL_ORDER_TYPE.SLL) {
      const absoluteLimitPriceDelta = slLimitPricePercent! / 100 * exitOrder.trigger_price!
      let absoluteLimitPrice
      if (exitOrder.transaction_type === kite.TRANSACTION_TYPE_SELL) {
        absoluteLimitPrice = exitOrder.trigger_price! - absoluteLimitPriceDelta
      } else {
        absoluteLimitPrice = exitOrder.trigger_price! + absoluteLimitPriceDelta
      }

      exitOrder.order_type = kite.ORDER_TYPE_SL
      exitOrder.price = round(absoluteLimitPrice)
    }

    exitOrder.trigger_price = round(exitOrder.trigger_price)
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

  if (slOrderType === SL_ORDER_TYPE.SLL) {
    const watcherQueueJobs = exitOrders.map(async (exitOrder) => {
      return addToNextQueue(initialJobData, {
        _nextTradingQueue: WATCHER_Q_NAME,
        rawKiteOrderResponse: exitOrder
      })
    })

    try {
      await Promise.all(watcherQueueJobs)
    } catch (e) {
      console.log('error adding to `watcherQueueJobs`')
      console.log(e.message ? e.message : e)
    }
  }

  return statefulOrders
}

export default individualLegExitOrders
