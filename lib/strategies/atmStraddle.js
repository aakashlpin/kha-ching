import csv from 'csvtojson';
import dayjs from 'dayjs';

import { INSTRUMENT_DETAILS, INSTRUMENTS } from '../constants';
import console from '../logging';
import { EXIT_TRADING_Q_NAME } from '../queue';
import {
  cleanupInstrumentsFile,
  delay,
  ensureMarginForBasketOrder,
  getCurrentExpiryTradingSymbol,
  getInstrumentPrice,
  getSkew,
  saveInstrumentsToFile,
  syncGetKiteInstance
} from '../utils';
import mockOrderResponse from './mockData/orderResponse';
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');

dayjs.extend(isSameOrBefore);

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

export async function getATMStraddle(args) {
  const {
    user,
    underlyingSymbol,
    exchange,
    nfoSymbol,
    strikeStepSize,
    maxSkewPercent,
    expiresAt,
    instrumentsFilename,
    attempt = 0
  } = args;

  let { ignoreSkew = false } = args;

  if (dayjs().isAfter(dayjs(expiresAt))) {
    console.log('🔔 skew check time expired! now taking trade irrespective of skew');
    // take trade irrespective of skew
    ignoreSkew = true;
  }

  const kite = syncGetKiteInstance(user);
  const underlyingLTP = await getInstrumentPrice(kite, underlyingSymbol, exchange);
  const atmStrike = Math.round(underlyingLTP / strikeStepSize) * strikeStepSize;

  const jsonArray = await csv().fromFile(instrumentsFilename);
  const { PE_STRING, CE_STRING } = getCurrentExpiryTradingSymbol({
    sourceData: jsonArray,
    nfoSymbol,
    strike: atmStrike
  });

  const { skew, ...prices } = await getSkew(kite, PE_STRING, CE_STRING, 'NFO');
  console.log({ ignoreSkew, skew, ...prices });

  if (!ignoreSkew && skew > maxSkewPercent) {
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

export const createOrder = ({ symbol, lots, lotSize, user, transactionType = 'SELL' }) => {
  const kite = syncGetKiteInstance(user);
  return {
    tradingsymbol: symbol,
    quantity: lotSize * lots,
    exchange: kite.EXCHANGE_NFO,
    transaction_type: transactionType,
    order_type: kite.ORDER_TYPE_MARKET,
    product: kite.PRODUCT_MIS,
    validity: kite.VALIDITY_DAY
  };
};

export default async ({
  instrument,
  lots,
  user,
  expiresAt,
  isHedgeEnabled,
  maxSkewPercent = 10,
  __nextTradingQueue = EXIT_TRADING_Q_NAME
}) => {
  const kite = syncGetKiteInstance(user);

  const {
    underlyingSymbol,
    exchange,
    nfoSymbol,
    lotSize,
    strikeStepSize,
    hedgeStrikeDistance
  } = INSTRUMENT_DETAILS[instrument];

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
      user,
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

  const orders = [PE_STRING, CE_STRING].map((symbol) =>
    createOrder({ symbol, lots, lotSize, user })
  );

  // DO THIS - simply buy the 300 point hedge first and then sell the straddle

  if (isHedgeEnabled) {
    try {
      const hedgeOrders = [
        getSymbol({ strike: straddle.atmStrike - hedgeStrikeDistance, type: 'PE' }),
        getSymbol({ strike: straddle.atmStrike + hedgeStrikeDistance, type: 'CE' })
      ].map((symbol) =>
        createOrder({ symbol, lots, lotSize, user, transactionType: kite.TRANSACTION_TYPE_BUY })
      );

      await Promise.all(hedgeOrders.map((order) => kite.placeOrder(kite.VARIETY_REGULAR, order)));
    } catch (e) {}
  }

  try {
    const { requiredMargin, balanceMargin } = await ensureMarginForBasketOrder(user, orders);
    if (requiredMargin < balanceMargin && isHedgeEnabled) {
      // TODO find out how many lots can be added in the available margin
    }
  } catch (e) {
    return Promise.reject('insufficient margin!');
  }

  if (MOCK_ORDERS) {
    console.log('MOCK ORDERS = true! NOT PUNCHING ORDERS', orders);
    return {
      __nextTradingQueue,
      straddle,
      rawKiteOrdersResponse: mockOrderResponse
    };
  }

  try {
    console.log('placing orders...');
    console.log(JSON.stringify(orders, null, 2));
    const orderAckResponses = await Promise.all(
      orders.map((order) => kite.placeOrder(kite.VARIETY_REGULAR, order))
    );
    return {
      __nextTradingQueue,
      straddle,
      rawKiteOrdersResponse: orderAckResponses
    };
  } catch (e) {
    console.log(e);
    throw e;
  }
};
