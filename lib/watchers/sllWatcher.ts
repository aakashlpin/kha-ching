/**
 * what happens - When using SL-L orders with upper limit to prices
 * the order can stay in open state for a long time if prices spike
 *
 * this watcher helps place market orders
 * once the watcher finds the order state to be in "Open" state
 * and considers 30 seconds from the time it discovered it
 * not from the moment the order went in Open state (via the API)
 */

import { Promise } from 'bluebird'
import { SignalXUser } from '../../types/misc'
import console from '../logging'
import {
  convertSllToMarketOrder,
  finiteStateChecker,
  getOrderHistory,
  ms,
  orderStateChecker,
  syncGetKiteInstance
} from '../utils'

const sllWatcher = async ({
  sllOrderId,
  user
}: {
  sllOrderId: string
  user: SignalXUser
}) => {
  try {
    const kite = syncGetKiteInstance(user)
    const orderHistory = await getOrderHistory(kite, sllOrderId)
    const isOrderCompleted = orderHistory.find(
      order => order.status === kite.STATUS_COMPLETE
    )
    if (isOrderCompleted) {
      return Promise.resolve('[sllWatcher] order Completed!')
    }

    const cancelledOrder = orderHistory.find(order =>
      order.status!.includes(kite.STATUS_CANCELLED)
    )

    if (cancelledOrder) {
      return Promise.resolve('[sllWatcher] order Cancelled!')
    }

    const openOrder = orderHistory.find(order => order.status === 'OPEN')

    if (!openOrder) {
      return Promise.reject(new Error('[sllWatcher] order not open yet!'))
    }

    const timeout = ms(30)
    const orderCompletionCheckerPr = orderStateChecker(
      kite,
      sllOrderId,
      kite.STATUS_COMPLETE
    )
    try {
      await finiteStateChecker(orderCompletionCheckerPr, timeout)
      // order found to be completed after open
      return Promise.resolve('[sllWatcher] order Completed after Open')
    } catch (e) {
      if (e instanceof Promise.TimeoutError) {
        // order not filled after timeout seconds
        // place market orders
        console.log(
          '🟢 [sllWatcher] squaring off open SLL order id',
          sllOrderId
        )
        try {
          await convertSllToMarketOrder(kite, openOrder)
          return Promise.resolve(
            `🟢 [sllWatcher] squared off open SLL order id ${sllOrderId}`
          )
        } catch (error) {
          console.log(
            '🔴 [sllWatcher] error squaring off pending open SLL order id',
            sllOrderId,
            error
          )
          return Promise.resolve(
            `🔴 [sllWatcher] error squaring off open SLL order id ${sllOrderId}`
          )
        }
      }
      console.log('🔴 [sllWatcher] unhandled orderStateChecker caught', e)
      return Promise.resolve(
        `🔴 [sllWatcher] error squaring off open SLL order id ${sllOrderId}`
      )
    }
  } catch (e) {
    console.log('🔴 [sllWatcher] error. Checker terminated!', e)
    // a promise reject here could be dangerous due to retry logic.
    // It could lead to multiple exit orders for the same initial order_id
    // hence, resolve
    return Promise.resolve('[sllWatcher] error')
  }
}

export default sllWatcher
