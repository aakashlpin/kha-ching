const fyers = require('fyers-api');
import axios from 'axios';
import dayjs from 'dayjs';

import console from '../logging';
import { addToNextQueue, EXIT_TRADING_Q_NAME, WATCHER_Q_NAME } from '../queue';
import {
  delay,
  getLastOpenDateSince,
  getNearestCandleTime,
  getPercentageChange,
  ms,
  randomIntFromInterval,
  syncGetKiteInstance
} from '../utils';

const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade';

async function getPreviousClose({ instrument_token, from_date, to_date }) {
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

export default async ({
  initialJobData,
  rawFyersOrderResponse,
  entryPrice,
  initialSLPrice,
  instrumentToken
}) => {
  const { user } = initialJobData;
  try {
    const kite = syncGetKiteInstance(user);
    // NB: rawFyersOrderResponse here is of pending SLM Order

    // on each run, grab the `trigger_price` of the pending SLM order
    // this is so that we don't need to pass around reference to the previous price

    // from kite api, get the latest close
    // calculate the revised SL as per formula
    // update the SL if new SL > triggerPrice

    const orderStatus = await fyers.orderStatus({
      token: user.fyers.access_token,
      data: {
        id: rawFyersOrderResponse.data.id
      }
    });

    const { status, symbol, qty, stopPrice, tradedPrice } = orderStatus.data;
    const STATUS_KEY = {
      1: 'CANCELLED',
      2: 'COMPLETED',
      3: null,
      4: 'TRANSIT',
      5: 'REJECTED',
      6: 'PENDING'
    };

    if (status !== 6) {
      // cancelled
      return Promise.resolve(
        `[fyersTrailObsSL] Terminating checker! order is in ${STATUS_KEY[status]} state!`
      );
    }

    const previousMinClose = await getPreviousClose();
  } catch (e) {
    console.log(e);
  }
};
