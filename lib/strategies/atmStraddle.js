import csv from 'csvtojson';
import dayjs from 'dayjs';

import { INSTRUMENT_DETAILS } from '../constants';
import { EXIT_TRADING_Q_NAME } from '../queue';
import {
  cleanupInstrumentsFile,
  delay,
  getCurrentExpiryTradingSymbol,
  getInstrumentPrice,
  getSkew,
  saveInstrumentsToFile,
  syncGetKiteInstance
} from '../utils';
import orderResponse from './mockData/orderResponse';
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');

let kite;

dayjs.extend(isSameOrBefore);

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

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

  const underlyingLTP = await getInstrumentPrice(kite, underlyingSymbol, exchange);
  const atmStrike = Math.round(underlyingLTP / strikeStepSize) * strikeStepSize;

  const jsonArray = await csv().fromFile(instrumentsFilename);
  const { PE_STRING, CE_STRING } = getCurrentExpiryTradingSymbol({
    sourceData: jsonArray,
    nfoSymbol,
    strike: atmStrike
  });

  const { skew, ...prices } = await getSkew(kite, PE_STRING, CE_STRING, 'NFO');
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
    CE_STRING,
    atmStrike
  };
}

export default async ({ instrument, lots, user, maxSkewPercent = 10, expiresAt }) => {
  kite = syncGetKiteInstance(user);

  const { underlyingSymbol, exchange, nfoSymbol, lotSize, strikeStepSize } = INSTRUMENT_DETAILS[
    instrument
  ];

  console.log('processing atm straddle for', {
    underlyingSymbol,
    exchange,
    nfoSymbol,
    strikeStepSize,
    lots,
    maxSkewPercent
  });

  let instrumentsFilename;
  try {
    instrumentsFilename = await saveInstrumentsToFile();
  } catch (e) {
    return Promise.reject(e);
  }

  let PE_STRING, CE_STRING, straddle;
  try {
    straddle = await getATMStraddle({
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
    return {
      straddle,
      __nextTradingQueue: EXIT_TRADING_Q_NAME,
      rawKiteOrdersResponse: orderResponse
    };
  }

  try {
    console.log('placing orders...');
    console.log(JSON.stringify(orders, null, 2));
    const orderAckResponses = await Promise.all(
      orders.map((order) => kite.placeOrder(kite.VARIETY_REGULAR, order))
    );
    return {
      __nextTradingQueue: EXIT_TRADING_Q_NAME,
      straddle,
      rawKiteOrdersResponse: orderAckResponses
    };
  } catch (e) {
    console.log(e);
    throw e;
  }
};
