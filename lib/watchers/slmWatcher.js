/**
 * what happens - Exchange cancels orders that lie outside execution range
 *
 * 1. SLM order can be partially filled before it gets cancelled
 * 2. Entire order can be cancelled
 *
 * Action plan:
 *
 * 1. Have a reference to the order id created by zerodha
 * 2. Every 5 seconds
 *  2. SLM order is in state `CANCELLED` or `COMPLETED`
 *  3. Cancel checker if `COMPLETED`
 *  4. Square off open position qty that was managed by this order_id
 *  5. If `Cancelled`, get the order history of this order_id,
 *    1. Get the item with status Cancelled.
 *    2. Fetch its cancelled_quantity
 *    3. Place a market exit order for cancelled_quantity for the tradingsymbol
 *    4. Add this new order back to this queue for monitoring
 *
 */

import console from '../logging'
import { addToNextQueue, WATCHER_Q_NAME } from '../queue'
import { getInstrumentPrice, remoteOrderSuccessEnsurer, syncGetKiteInstance, withRemoteRetry } from '../utils'

/**
 * [NB] IMPORTANT!
 * WATCH_MANUAL_CANCELLED_ORDERS is for testing this only!
 * DO NOT enable this env variable on your account!
 * e.g. in DOS, Khaching can itself cancel a pending order and create a new SLM order
 * if you were to enable this,
 * the position will get auto squared off as soon as Khaching cancels that pending order
 */
const WATCH_MANUAL_CANCELLED_ORDERS = process.env.WATCH_MANUAL_CANCELLED_ORDERS
  ? JSON.parse(process.env.WATCH_MANUAL_CANCELLED_ORDERS)
  : false

const slmWatcher = async ({ slmOrderId, user, originalTriggerPrice, __queueJobData }) => {
  /**
   * Scenario for the need of `originalTriggerPrice`
   * - consider the initial SLM order gets cancelled at 50
   * - watcher sees new LTP to be 51
   * - watcher places `market` exit order, but order gets rejected
   * - now the ref to slmOrderId will contain no triggerPrice as it was a market order
   *
   *
   * hence -
   * - we'll need to pass through the original trigger price down the rabbit hole
   */
  try {
    const kite = syncGetKiteInstance(user)
    const orderHistory = (await withRemoteRetry(() => kite.getOrderHistory(slmOrderId))).reverse()
    const isOrderCompleted = orderHistory.find((order) => order.status === kite.STATUS_COMPLETE)
    if (isOrderCompleted) {
      return Promise.resolve('[slmWatcher] order COMPLETED!')
    }

    const cancelledOrder = orderHistory.find((order) =>
      order.status.includes(kite.STATUS_CANCELLED)
    )

    if (!cancelledOrder) {
      return Promise.reject(new Error('[slmWatcher] neither COMPLETED nor CANCELLED. Watching!'))
    }

    const {
      cancelled_quantity: cancelledQty,
      status_message_raw: statusMessageRaw,
      transaction_type: transactionType,
      trigger_price: cancelledTriggerPrice,
      tradingsymbol,
      exchange,
      product
    } = cancelledOrder

    const triggerPrice = originalTriggerPrice || cancelledTriggerPrice

    /**
     * Conditions:
     * 1. WATCH_MANUAL_CANCELLED_ORDERS = false && statusMessageRaw = null
     *    true && true - returned
     *
     * 2. WATCH_MANUAL_CANCELLED_ORDERS = false && statusMessageRaw = '17070'
     *    true && false - continue
     *
     * 3. WATCH_MANUAL_CANCELLED_ORDERS = true && statusMessageRaw = null
     *    false && true - continue
     *
     * 4. WATCH_MANUAL_CANCELLED_ORDERS = true && statusMessageRaw = '17070'
     *    false && false - continue
     */

    if (
      !WATCH_MANUAL_CANCELLED_ORDERS &&
      statusMessageRaw !== '17070 : The Price is out of the current execution range'
    ) {
      return Promise.resolve('[slmWatcher] order cancelled by user!')
    }

    console.log('🟢 [slmWatcher] found cancelled SLM order!', {
      slmOrderId,
      cancelledQty,
      statusMessageRaw
    })

    if (!cancelledQty) {
      return Promise.resolve('[slmWatcher] no cancelled qty!')
    }

    const positions = await withRemoteRetry(() => kite.getPositions())

    const { net } = positions
    const openPositionThatMustBeSquaredOff = net.find(
      (position) =>
        position.tradingsymbol === tradingsymbol &&
        position.product === product &&
        position.exchange === exchange &&
        Math.abs(position.quantity) >= cancelledQty
    )

    if (!openPositionThatMustBeSquaredOff) {
      return Promise.resolve('[slmWatcher] no open position to be squared off!')
    }

    console.log('[slmWatcher] openPositionThatMustBeSquaredOff', openPositionThatMustBeSquaredOff)

    const ltp = await withRemoteRetry(getInstrumentPrice(kite, tradingsymbol, exchange))

    const newOrderType =
      (transactionType === kite.TRANSACTION_TYPE_BUY && ltp < triggerPrice) ||
      (transactionType === kite.TRANSACTION_TYPE_SELL && ltp > triggerPrice)
        ? kite.ORDER_TYPE_SLM
        : kite.ORDER_TYPE_MARKET

    const exitOrder = {
      tradingsymbol,
      exchange,
      product,
      quantity: cancelledQty,
      transaction_type: transactionType,
      order_type: newOrderType,
      tag: __queueJobData.initialJobData.orderTag
    }

    if (newOrderType === kite.ORDER_TYPE_SLM) {
      exitOrder.trigger_price = triggerPrice
    }

    console.log('[slmWatcher] placing exit order', exitOrder)
    try {
      const { response } = await remoteOrderSuccessEnsurer({
        ensureOrderState: exitOrder.trigger_price ? 'TRIGGER PENDING' : kite.STATUS_COMPLETE,
        orderProps: exitOrder,
        user
      })
      // add this new job to the watcher queue and ensure it succeeds
      await addToNextQueue(__queueJobData.initialJobData, {
        __nextTradingQueue: WATCHER_Q_NAME,
        rawKiteOrderResponse: response,
        originalTriggerPrice: triggerPrice
      })
    } catch (e) {
      console.log('[slmWatcher] error adding watcher for new exit market order', e)
    }
    return Promise.resolve('[slmWatcher] placing exit order')
  } catch (e) {
    console.log('🔴 [slmWatcher] error. Checker terminated!!', e)
    // a promise reject here could be dangerous due to retry logic.
    // It could lead to multiple exit orders for the same initial order_id
    // hence, resolve
    return Promise.resolve('[slmWatcher] error')
  }
}

export default slmWatcher
