import console from '../logging'
import {
  remoteOrderSuccessEnsurer,
  syncGetKiteInstance,
  withRemoteRetry
} from '../utils'

async function doDeletePendingOrders (orders, kite) {
  const allOrders = await withRemoteRetry(() => kite.getOrders())
  const openOrders = allOrders.filter((order) => order.status === 'TRIGGER PENDING')

  const openOrdersForPositions = orders
    .map((order) =>
      openOrders.find(
        (openOrder) =>
          openOrder.product === order.product &&
          openOrder.exchange === order.exchange &&
          openOrder.tradingsymbol === order.tradingsymbol &&
          // reverse trade on same exchange + tradingsybol is not possible,
          // so doing `abs`
          Math.abs(openOrder.quantity) === Math.abs(order.quantity)
      )
    )
    .filter((o) => o)

  // some positions might have squared off during the day when the SL hit
  return Promise.all(
    openOrdersForPositions.map((openOrder) =>
      withRemoteRetry(() => kite.cancelOrder(openOrder.variety, openOrder.order_id))
    )
  )
}

export async function doSquareOffPositions (orders, kite, initialJobData) {
  const openPositions = await withRemoteRetry(() => kite.getPositions())
  const { net } = openPositions
  const openPositionsForOrders = orders
    .filter(o => o)
    .map((order) => {
      const position = net.find(
        (openPosition) =>
          openPosition.tradingsymbol === order.tradingsymbol &&
          openPosition.exchange === order.exchange &&
          openPosition.product === order.product &&
          (openPosition.quantity < 0
            // openPosition is short order
            ? openPosition.quantity <= order.quantity * -1
            // long order
            : openPosition.quantity >= order.quantity)
      )

      if (!position) {
        return null
      }

      return {
        ...position,
        quantity: position.quantity < 0 ? order.quantity * -1 : order.quantity
      }
    })
    .filter((o) => o)

  return Promise.all(
    openPositionsForOrders.map((order) => {
      const exitOrder = {
        tradingsymbol: order.tradingsymbol,
        quantity: Math.abs(order.quantity),
        exchange: order.exchange,
        transaction_type:
          order.quantity < 0 ? kite.TRANSACTION_TYPE_BUY : kite.TRANSACTION_TYPE_SELL,
        order_type: kite.ORDER_TYPE_MARKET,
        product: order.product,
        tag: initialJobData.orderTag
      }
      // console.log('square off position...', exitOrder)
      return remoteOrderSuccessEnsurer({
        __kite: kite,
        orderProps: exitOrder,
        ensureOrderState: kite.STATUS_COMPLETE
      })
    })
  )
}

async function autoSquareOffStrat ({ rawKiteOrdersResponse, deletePendingOrders, initialJobData }) {
  const { user } = initialJobData
  const kite = syncGetKiteInstance(user)
  const completedOrders = rawKiteOrdersResponse

  if (deletePendingOrders) {
    // console.log('deletePendingOrders init')
    try {
      await doDeletePendingOrders(completedOrders, kite)
      // console.log('🟢 deletePendingOrders success', res)
    } catch (e) {
      console.log('🔴 deletePendingOrders failed')
      console.error(e)
    }
  }
  return doSquareOffPositions(completedOrders, kite, initialJobData)
}

export default autoSquareOffStrat
