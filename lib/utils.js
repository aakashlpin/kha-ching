const https = require('https');
const fs = require('fs');
import csv from 'csvtojson';
import dayjs from 'dayjs';

export function saveInstrumentsToFile() {
  return new Promise((resolve) => {
    const filename = `instrument_${new Date().getTime()}.csv`;
    const file = fs.createWriteStream(filename);
    https.get('https://api.kite.trade/instruments/NFO', function (response) {
      const stream = response.pipe(file);
      stream.on('finish', async () => {
        try {
          const jsonArray = await csv().fromFile(filename);
          // sometimes 0d returns 200 status code but 502 gateway error in file
          if (Object.keys(jsonArray[0]).length === 12) {
            return resolve(filename);
          }
          //retry if that's the case
          return saveInstrumentsToFile();
        } catch (e) {
          return saveInstrumentsToFile();
        }
      });
    });
  });
}

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
        item.strike == strike &&
        (instrumentType ? item.instrument_type === instrumentType : true)
    )
    .sort((row1, row2) => (dayjs(row1.expiry).isSameOrBefore(dayjs(row2.expiry)) ? -1 : 1));

  if (instrumentType) {
    return rows[0].tradingsymbol;
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
