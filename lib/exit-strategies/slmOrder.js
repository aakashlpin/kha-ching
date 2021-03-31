export default async ({ kite, slmPercent, order }) => {
  const SLM_PERCENTAGE = 1 + slmPercent / 100;
  const completedOrder = order.find((odr) => odr.status === 'COMPLETE');
  if (!completedOrder) {
    console.log('order not completed yet! Place exit orders manually', completedOrder);
    return Promise.resolve();
  }
  const exitPrice = Math.round(order.average_price * SLM_PERCENTAGE);
  return kite.placeOrder(kite.VARIETY_REGULAR, {
    trigger_price: exitPrice,
    tradingsymbol: order.tradingsymbol,
    quantity: order.quantity,
    exchange: kite.EXCHANGE_NFO,
    transaction_type: kite.TRANSACTION_TYPE_BUY,
    order_type: kite.ORDER_TYPE_SLM,
    product: kite.PRODUCT_MIS
  });
};
