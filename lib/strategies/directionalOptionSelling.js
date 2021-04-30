import axios from 'axios';
import csv from 'csvtojson';
import dayjs from 'dayjs';

import { INSTRUMENT_DETAILS } from '../constants';
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders';
import { EXIT_TRADING_Q_NAME } from '../queue';
import {
  cleanupInstrumentsFile,
  delay,
  getCurrentExpiryTradingSymbol,
  getLastOpenDateSince,
  saveInstrumentsToFile,
  syncGetKiteInstance
} from '../utils';
import mockOrderResponse from './mockData/orderResponse';

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

// grab the instrument id of the most recent expiry of banknifty
// get the supertrend value (10,3)
// round up the supertrend to nearest strike
// if supertrend < LTP
//    sell CE and call exit strategy of 1x SLM order
//    record the order id of the exit order and watch for 'Completed' event
// get supertrend value of CE option every 5mins
// update SL = min(SLM%, Supertrend)

async function ensureExitOrder({ initialJobData, rawKiteOrderResponse }) {
  try {
    console.log('[ensureExitOrder] attempt');
    const [exitOrder] = await individualLegExitOrders({
      initialJobData,
      rawKiteOrdersResponse: [rawKiteOrderResponse]
    });
    console.log('🟢 [ensureExitOrder] success', exitOrder);
    return exitOrder;
  } catch (e) {
    console.log('🔴 [ensureExitOrder] error', e);
    await delay(2 * 1000);
    return ensureExitOrder({ initialJobData, rawKiteOrderResponse });
  }
}

export default async (initialJobData) => {
  const { lots = 1, instrument, user, __nextTradingQueue = EXIT_TRADING_Q_NAME } = initialJobData;
  const kite = syncGetKiteInstance(user);

  const { nfoSymbol, strikeStepSize, lotSize } = INSTRUMENT_DETAILS[instrument];
  const instrumentsFilename = await saveInstrumentsToFile();
  const jsonArray = await csv().fromFile(instrumentsFilename);

  const { instrument_token: futInstrumentToken } = getCurrentExpiryTradingSymbol({
    sourceData: jsonArray,
    nfoSymbol,
    instrumentType: 'FUT'
  });

  const today = dayjs().format('YYYY-MM-DD');
  const lastOpenDate = getLastOpenDateSince(dayjs()).format('YYYY-MM-DD');

  const supertrendProps = {
    instrument_token: futInstrumentToken,
    from_date: lastOpenDate,
    to_date: today,
    interval: '5minute',
    period: 10,
    multiplier: 3
  };

  console.log({ supertrendProps });

  try {
    const { data: supertrendResponse } = await axios.post(
      `${process.env.SIGNALX_URL}/api/indicator/supertrend`,
      supertrendProps,
      {
        headers: {
          'X-API-KEY': process.env.SIGNALX_API_KEY
        }
      }
    );

    const latestST = supertrendResponse.pop();
    const { close, ST_10_3 } = latestST;
    const stStrike = Math.round(ST_10_3 / strikeStepSize) * strikeStepSize;
    const {
      tradingsymbol: optionTradingSymbol,
      instrument_token: optionInstrumentToken
    } = getCurrentExpiryTradingSymbol({
      sourceData: jsonArray,
      nfoSymbol,
      strike: stStrike,
      instrumentType: ST_10_3 > close ? 'CE' : 'PE'
    });

    const order = {
      tradingsymbol: optionTradingSymbol,
      quantity: lots * lotSize,
      exchange: kite.EXCHANGE_NFO,
      transaction_type: kite.TRANSACTION_TYPE_SELL,
      order_type: kite.ORDER_TYPE_MARKET,
      product: kite.PRODUCT_MIS,
      validity: kite.VALIDITY_DAY
    };

    try {
      cleanupInstrumentsFile(instrumentsFilename);
    } catch (e) {
      console.log('error cleaning up file', e);
    }

    if (MOCK_ORDERS) {
      console.log('MOCK ORDERS! Not punching order —', order);
      return {
        __nextTradingQueue,
        rawKiteOrdersResponse: [mockOrderResponse[0]],
        optionInstrumentToken
      };
    }

    try {
      const rawKiteOrderResponse = await kite.placeOrder(kite.VARIETY_REGULAR, order);
      const exitOrder = await ensureExitOrder({ initialJobData, rawKiteOrderResponse });

      return {
        __nextTradingQueue,
        rawKiteOrdersResponse: [exitOrder],
        optionInstrumentToken
      };
    } catch (e) {
      console.log(e);
      return new Error(e);
    }
  } catch (e) {
    console.log(e);
  }
};
