import { getInstrumentPrice, getPercentageChange } from '../utils';

export default async ({ kite, slmPercent, multiLegOrders, lotSize, lots }) => {
  // const SLM_PERCENTAGE = 1 + slmPercent / 100;
  const completedOrders = multiLegOrders.reduce((completedOrders, orderResponse) => {
    const completedOrder = orderResponse.find((order) => order.status === 'COMPLETE');
    return [...completedOrders, completedOrder];
  }, []);
  const averageOrderPrices = completedOrders.map((order) => order.average_price);
  const initialPremiumReceived = averageOrderPrices.reduce((sum, price) => sum + price, 0);

  const tradingSymbols = completedOrders.map((order) => order.tradingsymbol);
  try {
    const liveSymbolPrices = await Promise.all(
      tradingSymbols.map((symbol) => getInstrumentPrice(kite, symbol, kite.EXCHANGE_NFO))
    );

    const liveTotalPremium = liveSymbolPrices.reduce((sum, price) => sum + price, 0);
    const deltaInCombinedPremiumPercent = Math.round(
      getPercentageChange(initialPremiumReceived, liveTotalPremium)
    );
    if (deltaInCombinedPremiumPercent >= slmPercent) {
      return Promise.resolve({ deltaInCombinedPremiumPercent });
    }

    return Promise.reject({ deltaInCombinedPremiumPercent });
  } catch (e) {
    return Promise.reject(e);
  }

  // const completedOrder = order.find((odr) => odr.status === 'COMPLETE');
  // if (!completedOrder) {
  //   console.log('order not completed yet! Place exit orders manually', completedOrder);
  //   return Promise.resolve();
  // }
  // const exitPrice = Math.round(order.average_price * SLM_PERCENTAGE);
  // return kite.placeOrder(kite.VARIETY_REGULAR, {
  //   trigger_price: exitPrice,
  //   tradingsymbol: order.tradingsymbol,
  //   quantity: 2 * lotSize * lots,
  //   exchange: kite.EXCHANGE_NFO,
  //   transaction_type: kite.TRANSACTION_TYPE_BUY,
  //   order_type: kite.ORDER_TYPE_SLM,
  //   product: kite.PRODUCT_MIS
  // });
};
