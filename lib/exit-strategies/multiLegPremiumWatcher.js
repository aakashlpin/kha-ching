import { getInstrumentPrice, getPercentageChange } from '../utils';

export default async ({ kite, slmPercent, multiLegOrders, lotSize, lots }) => {
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
};
