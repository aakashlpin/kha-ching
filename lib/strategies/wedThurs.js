import csv from 'csvtojson';
import { KiteConnect } from 'kiteconnect';

import { INSTRUMENT_DETAILS } from '../constants';
import { EXIT_TRADING_Q_NAME } from '../queue';
import {
  cleanupInstrumentsFile,
  getCurrentExpiryTradingSymbol,
  saveInstrumentsToFile
} from '../utils';
import atmStraddle from './atmStraddle';
import strangleMockOrderResponse from './mockData/orderResponse';

const apiKey = process.env.KITE_API_KEY;
const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

export default async (args) => {
  const { instrument, lots, user, __nextTradingQueue = EXIT_TRADING_Q_NAME } = args;
  const accessToken = user?.session?.access_token;
  if (!accessToken) {
    return Promise.reject('no access_token');
  }

  try {
    const straddleResponse = await atmStraddle({ ...args, __nextTradingQueue: null });
    if (!straddleResponse?.straddle) {
      return Promise.reject(straddleResponse);
    }

    const { straddle, rawKiteOrdersResponse: straddleOrdersAckResponse } = straddleResponse;

    const kite = new KiteConnect({
      api_key: apiKey,
      access_token: accessToken
    });

    const { atmStrike } = straddleResponse.straddle;
    const { nfoSymbol, lotSize, strikeStepSize } = INSTRUMENT_DETAILS[instrument];

    const lowerLegPEStrike = atmStrike - strikeStepSize;
    const higherLegCEStrike = atmStrike + strikeStepSize;

    const instrumentsFilename = await saveInstrumentsToFile();
    const jsonArray = await csv().fromFile(instrumentsFilename);

    const { tradingsymbol: LOWER_LEG_PE_STRING } = getCurrentExpiryTradingSymbol({
      sourceData: jsonArray,
      nfoSymbol,
      strike: lowerLegPEStrike,
      instrumentType: 'PE'
    });

    const { tradingsymbol: HIGHER_LEG_CE_STRING } = getCurrentExpiryTradingSymbol({
      sourceData: jsonArray,
      nfoSymbol,
      strike: higherLegCEStrike,
      instrumentType: 'CE'
    });

    try {
      cleanupInstrumentsFile(instrumentsFilename);
    } catch (e) {
      console.log(e);
    }

    const orders = [LOWER_LEG_PE_STRING, HIGHER_LEG_CE_STRING].map((symbol) => ({
      tradingsymbol: symbol,
      quantity: 2 * lotSize * lots,
      exchange: kite.EXCHANGE_NFO,
      transaction_type: kite.TRANSACTION_TYPE_SELL,
      order_type: kite.ORDER_TYPE_MARKET,
      product: kite.PRODUCT_MIS,
      validity: kite.VALIDITY_DAY
    }));

    if (MOCK_ORDERS) {
      console.log('MOCK_ORDERS only! Not sending to broker', orders);
      return Promise.resolve({
        __nextTradingQueue,
        straddle,
        rawKiteOrdersResponse: [...straddleOrdersAckResponse, ...strangleMockOrderResponse]
      });
    }

    try {
      console.log('placing strangle orders...', orders);
      const strangleOrdersAckResponses = await Promise.all(
        orders.map((order) => kite.placeOrder(kite.VARIETY_REGULAR, order))
      );
      console.log(strangleOrdersAckResponses);
      return Promise.resolve({
        __nextTradingQueue,
        straddle,
        rawKiteOrdersResponse: [...straddleOrdersAckResponse, ...strangleOrdersAckResponses]
      });
    } catch (e) {
      console.log('🔴 strangle orders failed!', e);
      Promise.reject(e);
    }
  } catch (e) {
    return Promise.reject(e);
  }
};
