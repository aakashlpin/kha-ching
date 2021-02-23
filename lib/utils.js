const https = require('https');
const fs = require('fs');
import dayjs from 'dayjs';

export function saveInstrumentsToFile() {
  return new Promise((resolve) => {
    const filename = `instrument_${new Date().getTime()}.csv`;
    const file = fs.createWriteStream(filename);
    https.get('https://api.kite.trade/instruments/NFO', function (response) {
      const stream = response.pipe(file);
      stream.on('finish', () => resolve(filename));
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
