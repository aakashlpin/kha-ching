import axios from 'axios';
import csv from 'csvtojson';
const fyers = require('fyers-api');
import dayjs from 'dayjs';
import { before, isNumber } from 'lodash';

import { BROKERS, placeOrder } from '../broker';
import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../constants';
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders';
import console from '../logging';
import {
  addToAutoSquareOffQueue,
  addToNextQueue,
  EXIT_TRADING_Q_NAME,
  TRADING_Q_NAME,
  WATCHER_Q_NAME
} from '../queue';
import {
  cleanupInstrumentsFile,
  delay,
  getCurrentExpiryTradingSymbol,
  getInstrumentPrice,
  getLastOpenDateSince,
  getNearestCandleTime,
  getNextNthMinute,
  getTimeLeftInMarketClosingMs,
  getTradingSymbolsByOptionPrice,
  ms,
  randomIntFromInterval,
  saveInstrumentsToFile,
  syncGetKiteInstance
} from '../utils';
import mockOrderResponse from './mockData/orderResponse';

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;
const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade';

/**
 * Weekly options
 *
 * Time frame: 1min
 * Entry times: (9.30 - 11am) and (1pm to 3pm) - so for every job created, you add 2 entries to this queue
 *
 * Get LTP option prices for ATM+-10strikes
 *  - Find strike closest to 80 bucks and greater than it
 *  - Get 1min OHLC data of this strike
 *    - check if C is highest in the day so far
 *    - if yes, check if RSI(14) > 60
 *      - if both true, buy the option strike, set an initial SL, and then start the trailing process like DOS
 *
 *
 */

async function ensureExitOrder({ initialJobData, rawFyersOrderResponse }) {
  try {
    console.log('[ensureExitOrder] attempt');
    if (MOCK_ORDERS) {
      console.log('🟢 [ensureExitOrder] success', mockOrderResponse[0]);
      return mockOrderResponse[0];
    }

    const buyOrderStatus = await fyers.orderStatus({
      token: initialJobData.user.fyers.access_token,
      data: { id: rawFyersOrderResponse.data.id }
    });

    const { status, symbol, qty, tradedPrice } = buyOrderStatus.data;

    if (status !== 2) {
      throw new Error('initial order not completed yet!');
    }

    const initialSLPrice = 0.7 * tradedPrice;
    const exitOrderProps = {
      symbol,
      qty,
      type: 3,
      side: -1,
      stopPrice: 0.7 * tradedPrice, // (30% SL)
      productType: 'INTRADAY',
      validity: 'DAY'
    };

    const exitOrder = await fyers.place_orders({
      token: initialJobData.user.fyers.access_token,
      data: exitOrderProps
    });

    return {
      exitOrder,
      entryPrice: tradedPrice,
      initialSLPrice
    };
  } catch (e) {
    console.log('🔴 [ensureExitOrder] error', e);
    await delay(2 * 1000);
    return ensureExitOrder({ initialJobData, rawFyersOrderResponse });
  }
}

async function checkIfStrikeTradeable({ instrument_token, from_date, to_date }) {
  try {
    const props = {
      instrument_token,
      from_date,
      to_date,
      interval: 'minute'
    };
    console.log('[optionBuyingStrategy] trigger_obs request', props);
    const { data } = await axios.post(`${SIGNALX_URL}/api/strat/trigger_obs`, props, {
      headers: {
        'X-API-KEY': process.env.SIGNALX_API_KEY
      }
    });

    return data.triggerObs;
  } catch (e) {
    console.log('🔴 [optionBuyingStrategy] error in fetching from signalx', e);
    return false;
  }
}

const allowedTimes = [
  {
    afterTime: dayjs().set('hour', 9).set('minute', 30).set('second', 0).subtract(1, 'second'),
    beforeTime: dayjs().set('hour', 11).set('minute', 0).set('second', 0)
  },
  {
    afterTime: dayjs().set('hour', 13).set('minute', 0).set('second', 0).subtract(1, 'second'),
    beforeTime: dayjs().set('hour', 15).set('minute', 0).set('second', 0)
  }
];

export default async (initialJobData) => {
  if (
    !allowedTimes.find(
      ({ afterTime, beforeTime }) => dayjs().isAfter(afterTime) && dayjs().isBefore(beforeTime)
    )
  ) {
    return `🟢 [optionBuyingStrategy] Terminating OBS trade as time is outside allowed range`;
  }

  const { user, instrument, lots = 1 } = initialJobData;
  const { nfoSymbol, exchange, strikeStepSize } = INSTRUMENT_DETAILS[instrument];
  const instrumentsFilename = await saveInstrumentsToFile();
  const jsonArray = await csv().fromFile(instrumentsFilename);

  try {
    cleanupInstrumentsFile(instrumentsFilename);
  } catch (e) {
    console.log('error cleaning up file', e);
  }

  // lets find option prices for call and put where prices are greater than 80 bucks
  const kite = syncGetKiteInstance(initialJobData.user);
  // get the pivot strike
  const instrumentLTP = await getInstrumentPrice(kite, nfoSymbol, exchange);
  const pivotStrike = Math.round(instrumentLTP / strikeStepSize) * strikeStepSize;

  const [
    { tradingsymbol: ceTradingSymbol, instrument_token: ceInstrumentToken },
    { tradingsymbol: peTradingSymbol, instrument_token: peInstrumentToken }
  ] = await Promise.all(
    ['CE', 'PE'].map((instrumentType) =>
      getTradingSymbolsByOptionPrice({
        sourceData: jsonArray,
        nfoSymbol,
        instrumentType,
        pivotStrike,
        user,
        price: 80
      })
    )
  );

  const DATE_FORMAT = 'YYYY-MM-DD';
  const DATE_TIME_FORMAT = `${DATE_FORMAT} HH:mm:ss`;
  const today = dayjs().format(DATE_FORMAT);
  const nearestClosedCandleTime = getNearestCandleTime(1 * 60 * 1000).format(DATE_TIME_FORMAT);
  const [ceTradeable, peTradeable] = await Promise.all(
    [ceInstrumentToken, peInstrumentToken].map((instrumentToken) =>
      checkIfStrikeTradeable({
        instrument_token: instrumentToken,
        from_date: today,
        to_date: nearestClosedCandleTime
      })
    )
  );

  if (!(ceTradeable || peTradeable)) {
    return Promise.reject('neither of call or put strikes tradeable. Will retry!');
  }

  await punchOrders(
    initialJobData,
    ceTradeable ? ceTradingSymbol : peTradingSymbol,
    ceTradeable ? ceInstrumentToken : peInstrumentToken
  );
};

async function punchOrders(initialJobData, tradingSymbol, instrumentToken) {
  // [TODO] this isn't going to zerodha
  // figure out a broker management solution and get this done

  // WRT Session management, should I stop storing access_token keys in user object, and instead add a key in redis?
  // YES!

  // however, that would make the Stop and Kill all functionality to stop working
  // as per its current logic

  // if we do that, we'd need to store the Kill switch boolean with a timestamp
  // - and then use that as a reference to understand whether access_token has been recreated after the kill switch got hit

  // that'd be the only way to
  const { instrument, user, lots } = initialJobData;
  // const kite = syncGetKiteInstance(user);
  const { lotSize } = INSTRUMENT_DETAILS[instrument];

  const order = {
    symbol: `NSE:${tradingSymbol}`,
    qty: lots * lotSize,
    type: 2,
    side: 1,
    productType: 'INTRADAY',
    validity: 'DAY'
  };

  if (MOCK_ORDERS) {
    console.log('MOCK ORDERS! Not punching order —', order);
  }

  try {
    const rawFyersOrderResponse = MOCK_ORDERS
      ? mockOrderResponse[0]
      : await fyers.place_orders({
          token: user.fyers.access_token,
          data: order
        });

    const { exitOrder, entryPrice, initialSLPrice } = await ensureExitOrder({
      initialJobData,
      rawFyersOrderResponse
    });

    const queueRes = await addToNextQueue(initialJobData, {
      __nextTradingQueue: EXIT_TRADING_Q_NAME,
      rawFyersOrderResponse: exitOrder,
      entryPrice,
      initialSLPrice,
      instrumentToken
    });

    const { id, name, data } = queueRes;
    console.log('🟢 [optionBuyingStrategy] trailing SL now..', { id, name, data });

    // if (isAutoSquareOffEnabled) {
    //   try {
    //     const asoResponse = await addToAutoSquareOffQueue({
    //       initialJobData,
    //       jobResponse: {
    //         rawKiteOrdersResponse: [rawKiteOrderResponse]
    //       }
    //     });
    //     const { data, name } = asoResponse;
    //     console.log('🟢 [optionBuyingStrategy] success enable auto square off', { data, name });
    //   } catch (e) {
    //     console.log('🔴 [optionBuyingStrategy] failed to enable auto square off', e);
    //   }
    // }
    return queueRes;
  } catch (e) {
    console.log(e);
    return new Error(e);
  }
}
