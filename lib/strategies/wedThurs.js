import csv from 'csvtojson';
import { KiteConnect } from 'kiteconnect';

import { INSTRUMENT_DETAILS } from '../constants';
import slmOrder from '../exit-strategies/slmOrder';
import {
  cleanupInstrumentsFile,
  delay,
  getCurrentExpiryTradingSymbol,
  saveInstrumentsToFile
} from '../utils';
import atmStraddle from './atmStraddle';

const apiKey = process.env.KITE_API_KEY;
const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

export default async (args) => {
  const { instrument, lots, user, slmPercent = 50 } = args;
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

    const LOWER_LEG_PE_STRING = getCurrentExpiryTradingSymbol({
      sourceData: jsonArray,
      nfoSymbol,
      strike: lowerLegPEStrike,
      instrumentType: 'PE'
    });

    const HIGHER_LEG_CE_STRING = getCurrentExpiryTradingSymbol({
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
      return Promise.resolve(orders);
    }

    try {
      console.log('placing strangle orders...');
      console.log(JSON.stringify(orders, null, 2));
      const strangleOrdersAckResponses = await Promise.all(
        orders.map((order) => kite.placeOrder(kite.VARIETY_REGULAR, order))
      );
      console.log(strangleOrdersAckResponses);
      // delay by 10 seconds to ensure orders have went through
      await delay(10 * 1000);
      // get order responses from 0d
      const allOrders = await Promise.all(
        [...straddleOrdersAckResponse, ...strangleOrdersAckResponses].map((orderAckRes) =>
          kite.getOrderHistory(orderAckRes.order_id)
        )
      );

      await Promise.all(allOrders.map((order) => slmOrder({ kite, slmPercent, order })));
      return Promise.resolve({ straddle });
    } catch (e) {
      console.log(e);
      Promise.reject(e);
    }
  } catch (e) {
    return Promise.reject(e);
  }
};
