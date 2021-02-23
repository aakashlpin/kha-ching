const https = require('https'); // or 'https' for https:// URLs
const fs = require('fs');
import csv from 'csvtojson';
import dayjs from 'dayjs';
import { KiteConnect } from 'kiteconnect';

import withSession from '../../lib/session';
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');

let kite;

dayjs.extend(isSameOrBefore);

const apiKey = process.env.KITE_API_KEY;

function saveInstrumentsToFile() {
  return new Promise((resolve) => {
    const file = fs.createWriteStream('instruments.csv');
    https.get('https://api.kite.trade/instruments/NFO', function (response) {
      response.pipe(file);
      resolve();
    });
  });
}

async function getInstrumentPrice(underlying, exchange) {
  const instrumentString = `${exchange}:${underlying}`;
  const underlyingRes = await kite.getLTP(instrumentString);
  return underlyingRes[instrumentString].last_price;
}

async function getCurrentSkew(instrument1, instrument2, exchange) {
  const price1 = await getInstrumentPrice(instrument1, exchange);
  const price2 = await getInstrumentPrice(instrument2, exchange);

  const skew = Math.round((Math.abs(price1 - price2) / ((price1 + price2) / 2)) * 100);
  return {
    [instrument1]: price1,
    [instrument2]: price2,
    skew
  };
}

async function getATMStraddle(underlying, exchange, nfoSymbol, skewThreshold) {
  // await saveInstrumentsToFile();

  const underlyingLTP = await getInstrumentPrice(underlying, exchange);
  const atmStrike = Math.round(underlyingLTP / 50) * 50;
  // console.log({ ltp, atm_stike });

  const jsonArray = await csv().fromFile('instruments.csv');
  const rows = jsonArray
    .filter((item) => item.name === nfoSymbol && atmStrike == item.strike)
    .sort((row1, row2) => (dayjs(row1.expiry).isSameOrBefore(dayjs(row2.expiry)) ? -1 : 1))
    .slice(0, 2);

  const peStrike = rows.find((item) => item.instrument_type === 'PE');
  const ceStrike = rows.find((item) => item.instrument_type === 'CE');

  const PE_STRING = peStrike.tradingsymbol;
  const CE_STRING = ceStrike.tradingsymbol;

  const { skew, ...prices } = await getCurrentSkew(PE_STRING, CE_STRING, 'NFO');

  console.log(
    JSON.stringify({
      underlyingLTP,
      atmStrike,
      ...prices,
      skew
    })
  );

  if (skew >= skewThreshold) {
    await delay(2 * 1000);
    return getATMStraddle(underlying, exchange, nfoSymbol, skewThreshold);
  }

  return {
    PE_STRING,
    CE_STRING
  };
}

const delay = (ms) =>
  new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, ms)
  );

const getOrders = async () => {
  const orders = await kite.getOrders();
  return orders;
};

export default withSession(async (req, res) => {
  const user = req.session.get('user');
  const accessToken = user?.session?.access_token;
  kite = new KiteConnect({
    api_key: apiKey,
    access_token: accessToken
  });

  const LOTS = 1;
  const executeOrder = true;
  const UNDERLYING = 'NIFTY 50';
  const UNDERLYING_EXCHANGE = 'NSE';
  // const UNDERLYING = 'NSE:NIFTY 50';
  const NFO_SYMBOL = 'NIFTY';
  const SKEW_THRESHOLD = 10;

  // const orders = await getOrders();
  // const raymondBuy = orders.find(
  //   (order) => order.tradingsymbol === 'RAYMOND' && order.transaction_type === 'BUY'
  // );
  // // const avgBuyPrice = raymondBuy.average_price;
  // const orderRes = await kite.placeOrder(kite.VARIETY_REGULAR, {
  //   price: 390,
  //   tradingsymbol: 'RAYMOND',
  //   quantity: 65,
  //   exchange: kite.EXCHANGE_NSE,
  //   transaction_type: kite.TRANSACTION_TYPE_SELL,
  //   order_type: kite.ORDER_TYPE_LIMIT,
  //   product: kite.PRODUCT_CNC
  // });
  // return res.json({ orders, orderRes });

  // const { PE_STRING, CE_STRING } = await getATMStraddle(
  //   UNDERLYING,
  //   UNDERLYING_EXCHANGE,
  //   NFO_SYMBOL,
  //   SKEW_THRESHOLD
  // );
  // const PE_STRING = 'NIFTY21FEB15100PE';
  // const CE_STRING = 'NIFTY21FEB15100CE';
  // if (executeOrder) {
  // const orders = () =>
  //   [PE_STRING, CE_STRING].map((symbol) =>
  //     kite.placeOrder(kite.VARIETY_REGULAR, {
  //       tradingsymbol: symbol,
  //       quantity: 75 * LOTS,
  //       exchange: kite.EXCHANGE_NFO,
  //       transaction_type: kite.TRANSACTION_TYPE_SELL,
  //       order_type: kite.ORDER_TYPE_MARKET,
  //       product: kite.PRODUCT_MIS,
  //       validity: kite.VALIDITY_DAY
  //     })
  //   );

  // const orderAckResponses = await Promise.all(orders());
  // // delay by 10 seconds to ensure orders have went through
  // await delay(10 * 1000);
  // get order responses from 0d
  //   const orderAckResponses = [
  //     { order_id: '210222102563123' },
  //     { order_id: '210222102563121' },
  //     { order_id: '210222102563125' },
  //     { order_id: '210222102563124' }
  //   ];

  //   const orderResponses = await Promise.all(
  //     orderAckResponses.map((orderAckRes) => kite.getOrderHistory(orderAckRes.order_id))
  //   );

  //   // console.log(orderResponses);
  //   // res.json(orderResponses);

  //   const exitOrders = () =>
  //     orderResponses.map((orders) => {
  //       const order = orders.find((odr) => odr.status === 'COMPLETE');
  //       console.log(order);
  //       const exitPrice = Math.round(order.average_price * 1.5);
  //       return kite.placeOrder(kite.VARIETY_REGULAR, {
  //         trigger_price: exitPrice,
  //         tradingsymbol: order.tradingsymbol,
  //         quantity: 75 * LOTS,
  //         exchange: kite.EXCHANGE_NFO,
  //         transaction_type: kite.TRANSACTION_TYPE_BUY,
  //         order_type: kite.ORDER_TYPE_SLM,
  //         product: kite.PRODUCT_MIS
  //       });
  //     });

  //   await Promise.all(exitOrders());
  // }

  const positions = await kite.getPositions();
  const misPositions = positions.net.filter((position) => position.product === 'CNC');

  res.json(misPositions);
});
