import axios from 'axios';
import csv from 'csvtojson';
import dayjs from 'dayjs';

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../constants';
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders';
import { addToNextQueue, EXIT_TRADING_Q_NAME, TRADING_Q_NAME } from '../queue';
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
    lastTrend,
    lastTradeTime
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
  const today = dayjs().format('YYYY-MM-DD');
  const nearestClosedCandleTime = dayjs(getNearestCandleTime(5 * 60 * 1000)).format('HH:mm:ss');

  const supertrendProps = {
    instrument_token: futInstrumentToken,
    from_date: lastOpenDate,
    to_date: `${today} ${nearestClosedCandleTime}`,
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

    console.log('[directionalOptionSelling] ST response', supertrendResponse);

    switch (entryStrategy) {
      case STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE: {
        const stDataAfterLastTrade = supertrendResponse.filter((i) =>
          dayjs(i.date).isAfter(dayjs(lastTradeTime))
        );
        if (!stDataAfterLastTrade?.length) {
          return '!stDataAfterLastTrade. will try again';
        }

        const [currentTrendData] = stDataAfterLastTrade.slice(-1);
        const { STX_10_3: currentTrend } = currentTrendData;
        if (currentTrend === lastTrend) {
          return 'currentTrend === lastTrend. will try again';
        }

        // trend has now changed
        await punchOrders(initialJobData, currentTrendData, jsonArray);
        break;
      }

      case STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.FIXED_TIME:
      default: {
        const [currentTrendData] = supertrendResponse.slice(-1);
        await punchOrders(initialJobData, currentTrendData, jsonArray);
        break;
      }
    }

    if (maxTrades > 1) {
      if (getTimeLeftInMarketClosingMs() < 25 * 60 * 1000) {
        return `🟢 [minXPercentOrSupertrend] Terminating DOS trade. ${maxTrades} attempts left but less than 25mins in market closing.`;
      }

      await addToNextQueue(
        {
          ...initialJobData,
          entryStrategy: STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE,
          lastTradeTime: dayjs(),
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
  const { instrument, user, lots } = initialJobData;
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
    return {
      __nextTradingQueue: EXIT_TRADING_Q_NAME,
      rawKiteOrdersResponse: [mockOrderResponse[0]],
      optionInstrumentToken
    };
  }

  try {
    const rawKiteOrderResponse = await kite.placeOrder(kite.VARIETY_REGULAR, order);
    const exitOrder = await ensureExitOrder({ initialJobData, rawKiteOrderResponse });
    const queueRes = await addToNextQueue(initialJobData, {
      __nextTradingQueue: EXIT_TRADING_Q_NAME,
      rawKiteOrdersResponse: [exitOrder],
      optionInstrumentToken
    });
    console.log('[directionalOptionSelling] trailing SL now..', queueRes);
    return queueRes;
  } catch (e) {
    console.log(e);
    return new Error(e);
  }
}
