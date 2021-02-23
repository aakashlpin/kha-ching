/* eslint-disable no-undef */
const https = require('https'); // or 'https' for https:// URLs
const fs = require('fs');
import csv from 'csvtojson';
import dayjs from 'dayjs';
import { KiteConnect } from 'kiteconnect';

import { INSTRUMENT_DETAILS } from '../constants';
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');

let kite;

dayjs.extend(isSameOrBefore);

const apiKey = process.env.KITE_API_KEY;
const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

function saveInstrumentsToFile() {
  return new Promise((resolve) => {
    const filename = `instrument_${new Date().getTime()}.csv`;
    const file = fs.createWriteStream(filename);
    https.get('https://api.kite.trade/instruments/NFO', function (response) {
      const stream = response.pipe(file);
      stream.on('finish', () => resolve(filename));
    });
  });
}

async function cleanupInstrumentsFile(filename) {
  return fs.unlink(filename, (e) => {});
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

async function getATMStraddle(args) {
  const {
    underlyingSymbol,
    exchange,
    nfoSymbol,
    strikeStepSize,
    maxSkewPercent,
    expiresAt,
    instrumentsFilename,
    attempt = 0
  } = args;

  if (dayjs().isAfter(dayjs(expiresAt))) {
    console.log('time expired!');
    return Promise.reject('time expired!');
  }

  const underlyingLTP = await getInstrumentPrice(underlyingSymbol, exchange);
  const atmStrike = Math.round(underlyingLTP / strikeStepSize) * strikeStepSize;

  const jsonArray = await csv().fromFile(instrumentsFilename);
  const rows = jsonArray
    .filter((item) => item.name === nfoSymbol && atmStrike == item.strike)
    .sort((row1, row2) => (dayjs(row1.expiry).isSameOrBefore(dayjs(row2.expiry)) ? -1 : 1))
    .slice(0, 2);

  console.log(rows);

  const peStrike = rows.find((item) => item.instrument_type === 'PE');
  const ceStrike = rows.find((item) => item.instrument_type === 'CE');

  const PE_STRING = peStrike.tradingsymbol;
  const CE_STRING = ceStrike.tradingsymbol;

  const { skew, ...prices } = await getCurrentSkew(PE_STRING, CE_STRING, 'NFO');
  console.log({ skew, ...prices });

  if (skew > maxSkewPercent) {
    console.log(
      `Retry #${attempt + 1}... Current skew (${skew}%) > Threshold skew (${maxSkewPercent}%)`
    );
    await delay(2 * 1000);
    return getATMStraddle({ ...args, attempt: attempt + 1 });
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

export default async ({
  instrument,
  lots,
  user,
  maxSkewPercent = 10,
  slmPercent = 50,
  expiresAt
}) => {
  const accessToken = user?.session?.access_token;
  const executeOrders = false;
  if (!accessToken) {
    return Promise.reject('no access_token');
  }

  kite = new KiteConnect({
    api_key: apiKey,
    access_token: accessToken
  });

  const { underlyingSymbol, exchange, nfoSymbol, lotSize, strikeStepSize } = INSTRUMENT_DETAILS[
    instrument
  ];

  const SLM_PERCENTAGE = 1 + slmPercent / 100;

  console.log('processing atm straddle for', {
    underlyingSymbol,
    exchange,
    nfoSymbol,
    strikeStepSize,
    lots,
    maxSkewPercent
  });

  const instrumentsFilename = await saveInstrumentsToFile();

  let PE_STRING, CE_STRING;
  try {
    const straddle = await getATMStraddle({
      instrumentsFilename,
      underlyingSymbol,
      exchange,
      nfoSymbol,
      strikeStepSize,
      maxSkewPercent,
      expiresAt
    });

    PE_STRING = straddle.PE_STRING;
    CE_STRING = straddle.CE_STRING;
  } catch (e) {
    return Promise.reject(e);
  }

  try {
    cleanupInstrumentsFile(instrumentsFilename);
  } catch (e) {
    console.log('error cleaning up file', e);
  }

  console.log('Straddle strikes', { PE_STRING, CE_STRING });

  const orders = [PE_STRING, CE_STRING].map((symbol) => ({
    tradingsymbol: symbol,
    quantity: lotSize * lots,
    exchange: kite.EXCHANGE_NFO,
    transaction_type: kite.TRANSACTION_TYPE_SELL,
    order_type: kite.ORDER_TYPE_MARKET,
    product: kite.PRODUCT_MIS,
    validity: kite.VALIDITY_DAY
  }));

  if (MOCK_ORDERS) {
    console.log('MOCK ORDERS = true! NOT PUNCHING ORDERS', orders);
    return Promise.resolve(orders);
  }

  try {
    console.log('placing orders...');
    console.log(JSON.stringify(orders, null, 2));
    const orderAckResponses = await Promise.all(
      orders.map((order) => kite.placeOrder(kite.VARIETY_REGULAR, order))
    );
    console.log(orderAckResponses);
    // delay by 5 seconds to ensure orders have went through
    await delay(5 * 1000);
    // get order responses from 0d
    const orderResponses = await Promise.all(
      orderAckResponses.map((orderAckRes) => kite.getOrderHistory(orderAckRes.order_id))
    );

    const exitOrders = orderResponses.map((orders) => {
      const order = orders.find((odr) => odr.status === 'COMPLETE');
      if (!order) {
        console.log('order not completed yet! Place exit orders manually', order);
        return Promise.resolve();
      }
      const exitPrice = Math.round(order.average_price * SLM_PERCENTAGE);
      return kite.placeOrder(kite.VARIETY_REGULAR, {
        trigger_price: exitPrice,
        tradingsymbol: order.tradingsymbol,
        quantity: lotSize * lots,
        exchange: kite.EXCHANGE_NFO,
        transaction_type: kite.TRANSACTION_TYPE_BUY,
        order_type: kite.ORDER_TYPE_SLM,
        product: kite.PRODUCT_MIS
      });
    });

    await Promise.all(exitOrders);
  } catch (e) {
    console.log(e);
    Promise.reject(e);
  }
};
