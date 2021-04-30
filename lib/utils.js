const https = require('https');
const fs = require('fs');
import axios from 'axios';
import csv from 'csvtojson';
import dayjs from 'dayjs';
import { KiteConnect } from 'kiteconnect';

import {
  EXIT_STRATEGIES,
  getMisOrderLastSquareOffTime,
  MAX_MIS_ORDER_DURATION_SECONDS
} from './constants';
const apiKey = process.env.KITE_API_KEY;

export const saveInstrumentsToFile = () =>
  new Promise((resolve, reject) => {
    const filename = `instrument_${new Date().getTime()}.csv`;
    const file = fs.createWriteStream(filename);
    https.get('https://api.kite.trade/instruments/NFO', function (response) {
      const stream = response.pipe(file);
      stream.on('finish', async () => {
        try {
          const jsonArray = await csv().fromFile(filename);
          // sometimes 0d returns 200 status code but 502 gateway error in file
          if (Object.keys(jsonArray[0]).length === 12) {
            console.log('instruments file success!');
            return resolve(filename);
          }
          //retry if that's the case
          console.log('🔴 Failed downloading instruments file! Retrying...');
          // resolve this promise with a recursive promise fn call
          resolve(saveInstrumentsToFile());
        } catch (e) {
          console.log('💀 Errored downloading instruments file!', e);
          reject(e);
        }
      });
    });
  });

export function cleanupInstrumentsFile(filename) {
  return fs.unlink(filename, (e) => {});
}

export const delay = (ms) =>
  new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, ms)
  );

export const getCurrentExpiryTradingSymbol = ({
  sourceData,
  nfoSymbol,
  strike,
  instrumentType
}) => {
  const rows = sourceData
    .filter(
      (item) =>
        item.name === nfoSymbol &&
        (strike ? item.strike == strike : true) &&
        (instrumentType ? item.instrument_type === instrumentType : true)
    )
    .sort((row1, row2) => (dayjs(row1.expiry).isSameOrBefore(dayjs(row2.expiry)) ? -1 : 1));

  if (instrumentType) {
    return rows[0];
  }

  const relevantRows = rows.slice(0, 2);

  const peStrike = relevantRows.find((item) => item.instrument_type === 'PE').tradingsymbol;
  const ceStrike = relevantRows.find((item) => item.instrument_type === 'CE').tradingsymbol;

  return {
    PE_STRING: peStrike,
    CE_STRING: ceStrike
  };
};

export function getPercentageChange(price1, price2) {
  return Math.round((Math.abs(price1 - price2) / ((price1 + price2) / 2)) * 100);
}

export async function getInstrumentPrice(kite, underlying, exchange) {
  const instrumentString = `${exchange}:${underlying}`;
  const underlyingRes = await kite.getLTP(instrumentString);
  return underlyingRes[instrumentString].last_price;
}

export async function getSkew(kite, instrument1, instrument2, exchange) {
  const [price1, price2] = await Promise.all([
    getInstrumentPrice(kite, instrument1, exchange),
    getInstrumentPrice(kite, instrument2, exchange)
  ]);

  const skew = getPercentageChange(price1, price2);
  return {
    [instrument1]: price1,
    [instrument2]: price2,
    skew
  };
}

export function syncGetKiteInstance(user) {
  const accessToken = user?.session?.access_token;
  if (!accessToken) {
    throw 'missing access_token in `user` object, or `user` is undefined';
  }

  return new KiteConnect({
    api_key: apiKey,
    access_token: accessToken
  });
}

export async function getCompletedOrderFromOrderHistoryById(kite, orderId) {
  const orders = await kite.getOrderHistory(orderId);
  return orders.find((odr) => odr.status === 'COMPLETE');
}

export async function getAllOrNoneCompletedOrdersByKiteResponse(kite, rawKiteOrdersResponse) {
  try {
    const completedOrders = (
      await Promise.all(
        rawKiteOrdersResponse.map(({ order_id }) =>
          getCompletedOrderFromOrderHistoryById(kite, order_id)
        )
      )
    ).filter((o) => o);

    if (completedOrders.length !== rawKiteOrdersResponse.length) {
      return null;
    }

    return completedOrders;
  } catch (e) {
    console.error('getAllOrNoneCompletedOrdersByKiteResponse error', e);
    return null;
  }
}

export const logObject = (heading, object) =>
  typeof heading === 'string'
    ? console.log(heading, JSON.stringify(object, null, 2))
    : console.log(JSON.stringify(heading, null, 2));

const ms = (seconds) => seconds * 1000;

export const getTimeLeftInMarketClosingMs = () =>
  dayjs(getMisOrderLastSquareOffTime()).diff(dayjs());

export const getExitAttemptsCount = ({ exitStrategy }) => {
  switch (exitStrategy) {
    case EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD: {
      return Math.ceil(getTimeLeftInMarketClosingMs() / ms(3));
    }
    case EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND: {
      return Math.ceil(getTimeLeftInMarketClosingMs() / ms(5 * 60));
    }
    default:
      return 20;
  }
};

export const getRetryBackoffDelayMs = ({ exitStrategy }) => {
  switch (exitStrategy) {
    case EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND: {
      return ms(5 * 60);
    }
    default:
      return ms(3);
  }
};

const marketHolidays = [
  ['May 13,2021', 'Thursday'],
  ['July 21,2021', 'Wednesday'],
  ['August 19,2021', 'Thursday'],
  ['September 10,2021', 'Friday'],
  ['October 15,2021', 'Friday'],
  ['November 04,2021', 'Thursday'],
  ['November 05,2021', 'Friday'],
  ['November 19,2021', 'Friday']
];

export const isDateHoliday = (date) =>
  marketHolidays.find((holidays) => holidays[0] === date.format('MMMM DD,YYYY'));

export const getLastOpenDateSince = (from) => {
  const fromDay = from.format('dddd');
  const yesterday = from.subtract(fromDay === 'Monday' ? 3 : 1, 'days');
  if (isDateHoliday(yesterday)) {
    return getLastOpenDateSince(yesterday);
  }

  return yesterday;
};

export const storeAccessTokenRemotely = (accessToken) => {
  try {
    if (process.env.ACCESS_TOKEN_JSONBOX_URL) {
      axios.put(process.env.ACCESS_TOKEN_JSONBOX_URL, {
        access_token: accessToken
      });
    }
  } catch (e) {
    console.log('🔴 [storeAccessTokenRemotely] error', e);
  }
};
