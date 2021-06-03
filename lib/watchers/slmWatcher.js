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
 *  2. SLM order is in state `*CANCELLED` or `COMPLETED`
 *  3. Cancel checker if `COMPLETED`
 *  4. Square off open position qty that was managed by this order_id
 *  5. If `*Cancelled`, get the order history of this order_id,
 *    1. Get the item with status *Cancelled.
 *    2. Fetch its filled_quantity, pending_quantity, cancelled_quantity
 *    3. Place a market exit order for pending_quantity for the tradingsymbol
 *
 */

import console from '../logging';
import { NSE_OUT_OF_RANGE_ERROR_MOCKDATA } from '../strategies/mockData/orderResponse';
import { syncGetKiteInstance } from '../utils';

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

const slmWatcher = async ({ slmOrderId, user }) => {
  try {
    const kite = syncGetKiteInstance(user);
    const orderHistory = MOCK_ORDERS
      ? NSE_OUT_OF_RANGE_ERROR_MOCKDATA
      : (await kite.getOrderHistory(slmOrderId)).reverse();
    const isOrderCompleted = orderHistory.find((order) => order.status === kite.STATUS_COMPLETE);
    if (isOrderCompleted) {
      return Promise.resolve('[slmWatcher] order COMPLETED!');
    }

    const cancelledOrder = orderHistory.find((order) =>
      order.status.includes(kite.STATUS_CANCELLED)
    );

    const {
      status_message_raw: statusMessageRaw,
      tradingsymbol,
      exchange,
      product
    } = cancelledOrder;

    if (statusMessageRaw !== '17070 : The Price is out of the current execution range') {
      return Promise.resolve('[slmWatcher] order cancelled by user!');
    }

    const lastOpenOrder = orderHistory.find((order) => order.status === 'OPEN');
    if (!lastOpenOrder) {
      // this condition is not ideally possible
      // if the order got cancelled by the exchange, then it got def. opened up
      return Promise.resolve(
        '🔴 [slmWatcher] weird case of order cancelled by exchange but no open order found!'
      );
    }

    const { pending_quantity: pendingQty } = lastOpenOrder;

    console.log('🔴 [slmWatcher] found Exchange cancelled SLM order!', {
      slmOrderId,
      pendingQty
    });

    if (pendingQty) {
      const positions = await kite.getPositions();

      const { net } = positions;
      const openPositionThatMustBeSquaredOff = net.find(
        (position) =>
          position.tradingsymbol === tradingsymbol &&
          position.product === product &&
          position.exchange === exchange &&
          Math.abs(position.quantity) >= pendingQty
      );

      if (!openPositionThatMustBeSquaredOff) {
        return Promise.resolve('[slmWatcher] no open position to be squared off!');
      }

      console.log(
        '[slmWatcher] openPositionThatMustBeSquaredOff',
        openPositionThatMustBeSquaredOff
      );

      const exitOrder = {
        tradingsymbol,
        exchange,
        product,
        quantity: pendingQty,
        transaction_type:
          openPositionThatMustBeSquaredOff.quantity < 0
            ? kite.TRANSACTION_TYPE_BUY
            : kite.TRANSACTION_TYPE_SELL,
        order_type: kite.ORDER_TYPE_MARKET
      };

      console.log('[slmWatcher] placing exit order', exitOrder);
      if (!MOCK_ORDERS) {
        await kite.placeOrder(kite.VARIETY_REGULAR, exitOrder);
      }
      return Promise.resolve('[slmWatcher] placing exit order');
    }
  } catch (e) {
    console.log('[slmWatcher] error', e);
    return Promise.reject('[slmWatcher] error');
  }
};

export default slmWatcher;
