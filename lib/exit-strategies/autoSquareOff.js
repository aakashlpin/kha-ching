import { getAllOrNoneCompletedOrdersByKiteResponse, syncGetKiteInstance } from '../utils';

async function doDeletePendingOrders(orders, kite) {
  const allOrders = await kite.getOrders();
  const openOrders = allOrders.filter((order) => order.status === 'OPEN');
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
    .filter((o) => o);

  // some positions might have squared off during the day when the SL hit
  return Promise.all(
    openOrdersForPositions.map((openOrder) =>
      kite.cancelOrder(openOrder.variety, openOrder.order_id)
    )
  );
}

async function doSquareOffPositions(orders, kite) {
  const openPositions = await kite.getPositions();
  const { net } = openPositions;
  const openPositionsForOrders = orders
    .map((order) => {
      return net.find(
        (openPosition) =>
          openPosition.product === order.product &&
          openPosition.exchange === order.exchange &&
          openPosition.tradingsymbol === order.tradingsymbol &&
          Math.abs(openPosition.quantity) !== openPosition.quantity
            ? openPosition.quantity <= order.quantity // openPosition is short order
            : openPosition.quantity >= order.quantity // long order
      );
    })
    .filter((o) => o);

  return Promise.all(
    openPositionsForOrders.map((order) => {
      const exitOrder = {
        tradingsymbol: order.tradingsymbol,
        quantity: order.quantity * -1,
        exchange: order.exchange,
        transaction_type:
          order.quantity < 0 ? kite.TRANSACTION_TYPE_BUY : kite.TRANSACTION_TYPE_SELL,
        order_type: kite.ORDER_TYPE_MARKET,
        product: order.product
      };
      console.log('auto square off order...', exitOrder);
      return kite.placeOrder(kite.VARIETY_REGULAR, exitOrder);
    })
  );
}

async function autoSquareOffStrat({ rawKiteOrdersResponse, deletePendingOrders, initialJobData }) {
  const { user } = initialJobData;
  const kite = syncGetKiteInstance(user);
  const completedOrders = await getAllOrNoneCompletedOrdersByKiteResponse(
    kite,
    rawKiteOrdersResponse
  );

  if (!completedOrders) {
    console.error('Initial order not completed yet!?');
    throw 'Initial order not completed yet!? Auto Square Off failed!';
  }

  if (deletePendingOrders) {
    try {
      await doDeletePendingOrders(completedOrders, kite);
    } catch (e) {
      console.log(e);
    }
  }
  return doSquareOffPositions(completedOrders, kite);
}

export default autoSquareOffStrat;
