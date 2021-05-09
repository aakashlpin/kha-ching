import axios from 'axios';
import csv from 'csvtojson';
import dayjs from 'dayjs';

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../constants';
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders';
import {
  addToAutoSquareOffQueue,
  addToNextQueue,
  EXIT_TRADING_Q_NAME,
  TRADING_Q_NAME
} from '../queue';
import {
  cleanupInstrumentsFile,
  delay,
  getCurrentExpiryTradingSymbol,
  getLastOpenDateSince,
  getNearestCandleTime,
  getTimeLeftInMarketClosingMs,
  saveInstrumentsToFile,
  syncGetKiteInstance
} from '../utils';
import mockOrderResponse from './mockData/orderResponse';

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;
const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade';

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
    if (MOCK_ORDERS) {
      console.log('🟢 [ensureExitOrder] success', mockOrderResponse[0]);
      return mockOrderResponse[0];
    }

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
  const {
    instrument,
    lots = 1,
    martingaleIncrementSize = 0,
    maxTrades = 0,
    entryStrategy = STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.FIXED_TIME,
    lastTrend
  } = initialJobData;

  const { nfoSymbol } = INSTRUMENT_DETAILS[instrument];
  const instrumentsFilename = await saveInstrumentsToFile();
  const jsonArray = await csv().fromFile(instrumentsFilename);

  const { instrument_token: futInstrumentToken } = getCurrentExpiryTradingSymbol({
    sourceData: jsonArray,
    nfoSymbol,
    instrumentType: 'FUT'
  });

  const lastOpenDate = getLastOpenDateSince(dayjs()).format('YYYY-MM-DD');
  const nearestClosedCandleTime = getNearestCandleTime(5 * 60 * 1000).format('YYYY-MM-DD HH:mm:ss');

  const supertrendProps = {
    instrument_token: futInstrumentToken,
    from_date: lastOpenDate,
    to_date: nearestClosedCandleTime,
    interval: '5minute',
    period: 10,
    multiplier: 3
  };

  console.log('[directionalOptionSelling] ST request', supertrendProps);
  try {
    const { data: supertrendResponse } = await axios.post(
      `${SIGNALX_URL}/api/indicator/supertrend`,
      supertrendProps,
      {
        headers: {
          'X-API-KEY': process.env.SIGNALX_API_KEY
        }
      }
    );

    // console.log('[directionalOptionSelling] ST response', supertrendResponse);

    const [currentTrendData] = supertrendResponse.slice(-1);
    if (
      entryStrategy === STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE
    ) {
      const compareWithTrendValue = lastTrend
        ? lastTrend
        : supertrendResponse.slice(-2)[0].STX_10_3;
      if (compareWithTrendValue === currentTrendData.STX_10_3) {
        console.error('currentTrend === lastTrend. will try again');
        return Promise.reject('currentTrend === lastTrend. will try again');
      }
    }

    await punchOrders(initialJobData, currentTrendData, jsonArray);

    if (maxTrades > 1) {
      if (getTimeLeftInMarketClosingMs() < 25 * 60 * 1000) {
        return `🟢 [minXPercentOrSupertrend] Terminating DOS trade. ${maxTrades} attempts left but less than 25mins in market closing.`;
      }

      // flow should never reach here if the orders haven't been punched in
      await addToNextQueue(
        {
          ...initialJobData,
          entryStrategy: STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE,
          lastTrend: currentTrendData.STX_10_3,
          maxTrades: maxTrades - 1,
          lots: lots + martingaleIncrementSize
        },
        {
          __nextTradingQueue: TRADING_Q_NAME
        }
      );
    }

    try {
      cleanupInstrumentsFile(instrumentsFilename);
    } catch (e) {
      console.log('error cleaning up file', e);
    }
  } catch (e) {
    console.log(e);
    return new Error(e);
  }
};

async function punchOrders(initialJobData, superTrend, instrumentsRawData) {
  const { instrument, user, lots, isAutoSquareOffEnabled } = initialJobData;
  const kite = syncGetKiteInstance(user);
  const { nfoSymbol, strikeStepSize, lotSize } = INSTRUMENT_DETAILS[instrument];

  const { close, ST_10_3 } = superTrend;
  const stStrike = Math.round(ST_10_3 / strikeStepSize) * strikeStepSize;
  const {
    tradingsymbol: optionTradingSymbol,
    instrument_token: optionInstrumentToken
  } = getCurrentExpiryTradingSymbol({
    sourceData: instrumentsRawData,
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

  if (MOCK_ORDERS) {
    console.log('MOCK ORDERS! Not punching order —', order);
  }

  try {
    const rawKiteOrderResponse = MOCK_ORDERS
      ? mockOrderResponse[0]
      : await kite.placeOrder(kite.VARIETY_REGULAR, order);
    const exitOrder = await ensureExitOrder({ initialJobData, rawKiteOrderResponse });
    const queueRes = await addToNextQueue(initialJobData, {
      __nextTradingQueue: EXIT_TRADING_Q_NAME,
      rawKiteOrdersResponse: [exitOrder],
      optionInstrumentToken
    });

    const { id, name, data } = queueRes;
    console.log('🟢 [directionalOptionSelling] trailing SL now..', { id, name, data });

    if (isAutoSquareOffEnabled) {
      try {
        const asoResponse = await addToAutoSquareOffQueue({
          initialJobData,
          jobResponse: {
            rawKiteOrdersResponse: [rawKiteOrderResponse]
          }
        });
        const { id, data, name } = asoResponse;
        console.log('🟢 success enable auto square off', { data, name });
      } catch (e) {
        console.log('🔴 failed to enable auto square off', e);
      }
    }
    return queueRes;
  } catch (e) {
    console.log(e);
    return new Error(e);
  }
}
