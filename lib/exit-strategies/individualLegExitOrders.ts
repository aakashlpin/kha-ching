import { KiteOrder } from '../../types/kite'
import { SL_ORDER_TYPE } from '../../types/plans'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'
import console from '../logging'
import { addToNextQueue, WATCHER_Q_NAME } from '../queue'
import orderResponse from '../strategies/mockData/orderResponse'
import {
  attemptBrokerOrders,
  isUntestedFeaturesEnabled,
  remoteOrderSuccessEnsurer,
  round,
  syncGetKiteInstance
} from '../utils'
import { doDeletePendingOrders, doSquareOffPositions } from './autoSquareOff'

export const convertSlmToSll = (
  slmOrder: KiteOrder,
  slLimitPricePercent: number,
  kite: any
): KiteOrder => {
  const sllOrder = { ...slmOrder }
  const absoluteLimitPriceDelta =
    ((slLimitPricePercent ?? 0) / 100) * sllOrder.trigger_price!
  let absoluteLimitPrice
  if (sllOrder.transaction_type === kite.TRANSACTION_TYPE_SELL) {
    absoluteLimitPrice = sllOrder.trigger_price! - absoluteLimitPriceDelta
  } else {
    absoluteLimitPrice = sllOrder.trigger_price! + absoluteLimitPriceDelta
  }

  sllOrder.order_type = kite.ORDER_TYPE_SL
  sllOrder.price = round(absoluteLimitPrice)

  if (sllOrder.price === sllOrder.trigger_price) {
    // keep a min delta of 0.1 from trigger_price
    sllOrder.price =
      sllOrder.transaction_type === kite.TRANSACTION_TYPE_BUY
        ? sllOrder.price + 0.1
        : sllOrder.price - 0.1
  }

  return sllOrder
}

async function individualLegExitOrders ({
  _kite,
  initialJobData,
  rawKiteOrdersResponse
}: {
  _kite?: any
  initialJobData: SUPPORTED_TRADE_CONFIG
  rawKiteOrdersResponse: KiteOrder[]
}): Promise<KiteOrder[] | null> {
  const completedOrders = rawKiteOrdersResponse
  if (!(Array.isArray(completedOrders) && completedOrders.length)) {
    return null
  }

  const {
    slmPercent,
    user,
    orderTag,
    rollback,
    slLimitPricePercent = 1,
    instrument
  } = initialJobData

  const slOrderType = SL_ORDER_TYPE.SLL
  const kite = _kite || syncGetKiteInstance(user)

  const exitOrders = completedOrders.map(order => {
    const {
      tradingsymbol,
      exchange,
      transaction_type: transactionType,
      product,
      quantity,
      average_price: avgOrderPrice
    } = order
    let exitOrderTransactionType
    let exitOrderTriggerPrice

    const absoluteSl: number = (slmPercent / 100) * avgOrderPrice!
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

    let exitOrder: KiteOrder = {
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
      exitOrder = convertSlmToSll(exitOrder, slLimitPricePercent!, kite)
    }

    exitOrder.trigger_price = round(exitOrder.trigger_price!)
    console.log('placing exit orders...', exitOrder)
    return exitOrder
  })

  const exitOrderPrs = exitOrders.map(async order =>
    remoteOrderSuccessEnsurer({
      _kite: kite,
      ensureOrderState: 'TRIGGER PENDING',
      orderProps: order,
      instrument,
      user: user!
    })
  )

  const { allOk, statefulOrders } = await attemptBrokerOrders(exitOrderPrs)
  if (!allOk && rollback?.onBrokenExitOrders) {
    await doDeletePendingOrders(statefulOrders, kite)
    await doSquareOffPositions(completedOrders, kite, {
      orderTag
    })

    throw Error('rolled back onBrokenExitOrders')
  }

  if (slOrderType === SL_ORDER_TYPE.SLL && isUntestedFeaturesEnabled()) {
    const watcherQueueJobs = statefulOrders.map(async exitOrder => {
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
