import { syncGetKiteInstance } from '../utils';
import {
  getAllOrNoneCompletedOrdersByKiteResponse,
  getInstrumentPrice,
  getPercentageChange
} from '../utils';

export default async ({ type = 'BUY', initialJobData, rawKiteOrdersResponse }) => {
  const { slmPercent, user } = initialJobData;
  const kite = syncGetKiteInstance(user);

  const legsOrders = await getAllOrNoneCompletedOrdersByKiteResponse(kite, rawKiteOrdersResponse);
  if (!legsOrders) {
    console.log('🔴 Initial order not punched on Zerodha!');
    return Promise.reject('Initial order not completed yet! Waiting for `Completed` order type...');
  }
  // check here if the open positions include these legs
  // and quantities should be greater than equal to `legsOrders`
  // if not, resolve this checker assuming the user has squared off the positions themselves

  const tradingSymbols = legsOrders.map((order) => order.tradingsymbol);

  const openPositions = await kite.getPositions();

  const { net } = openPositions;
  const netPositionsForLegs = legsOrders
    .reduce((accum, order) => {
      const { tradingsymbol, quantity, product } = order;
      const openPositionForLeg = net.find(
        (position) =>
          position.product === product &&
          Math.abs(position.quantity) >= Math.abs(quantity) &&
          position.tradingsymbol === tradingsymbol
      );
      return [...accum, openPositionForLeg];
    }, [])
    .filter((o) => o);

  if (netPositionsForLegs.length !== legsOrders.length) {
    return Promise.resolve('Open position not found! Terminating checker...');
  }

  const averageOrderPrices = legsOrders.map((order) => order.average_price);
  const initialPremiumReceived = averageOrderPrices.reduce((sum, price) => sum + price, 0);

  try {
    // [TODO] check for bid value here instead of LTP
    // makes more sense for illiquid underlying
    const liveSymbolPrices = await Promise.all(
      tradingSymbols.map((symbol) => getInstrumentPrice(kite, symbol, kite.EXCHANGE_NFO))
    );

    const liveTotalPremium = liveSymbolPrices.reduce((sum, price) => sum + price, 0);
    const deltaInCombinedPremiumPercent = Math.round(
      getPercentageChange(initialPremiumReceived, liveTotalPremium)
    );

    if (deltaInCombinedPremiumPercent < slmPercent) {
      const rejectMsg = `[multiLegPremiumThreshold] combined delta (${deltaInCombinedPremiumPercent}%) < threshold (${slmPercent}%)`;
      console.log(rejectMsg);
      return Promise.reject(rejectMsg);
    }

    const exitMsg = `☢️ [multiLegPremiumThreshold] triggered! combined delta (${deltaInCombinedPremiumPercent}%) > threshold (${slmPercent}%)`;
    console.log(exitMsg);

    const exitOrders = legsOrders.map((order) => {
      const exitOrder = {
        tradingsymbol: order.tradingsymbol,
        quantity: order.quantity,
        exchange: order.exchange,
        transaction_type: type === 'BUY' ? kite.TRANSACTION_TYPE_BUY : kite.TRANSACTION_TYPE_SELL,
        order_type: kite.ORDER_TYPE_MARKET,
        product: kite.PRODUCT_MIS,
        validity: kite.VALIDITY_DAY
      };

      console.log('placing exit order at market price...', exitOrder);
      return kite.placeOrder(kite.VARIETY_REGULAR, exitOrder);
    });

    try {
      const response = await Promise.all(exitOrders);
      console.log(response);
      return Promise.resolve(response);
    } catch (e) {
      // NB: this could be disastrous although I don't know why it'd fail!
      console.log('exit orders failed!!', e);
      return Promise.reject(e);
    }
  } catch (e) {
    return Promise.reject(e);
  }
};
