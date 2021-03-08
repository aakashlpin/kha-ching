import dayjs from 'dayjs';

export const INSTRUMENTS = {
  NIFTY: 'nf',
  BANKNIFTY: 'bnf'
};

export const INSTRUMENT_DETAILS = {
  [INSTRUMENTS.NIFTY]: {
    lotSize: 75,
    displayName: 'NIFTY 50',
    underlyingSymbol: 'NIFTY 50',
    nfoSymbol: 'NIFTY',
    exchange: 'NSE',
    strikeStepSize: 50
  },
  [INSTRUMENTS.BANKNIFTY]: {
    lotSize: 25,
    displayName: 'BANKNIFTY',
    underlyingSymbol: 'NIFTY BANK',
    nfoSymbol: 'BANKNIFTY',
    exchange: 'NSE',
    strikeStepSize: 100
  }
};

export const STRATEGIES = {
  ATM_STRADDLE: 'ATM_STRADDLE',
  CM_WED_THURS: 'CM_WED_THURS'
};

export const STRATEGIES_DETAILS = {
  [STRATEGIES.ATM_STRADDLE]: {
    heading: `ATM Short Straddle`,
    defaultRunAt: dayjs().set('hour', 12).set('minutes', 30).set('seconds', 0).format()
  },
  [STRATEGIES.CM_WED_THURS]: {
    heading: `CM Wed & Thurs trade`,
    defaultRunAt: dayjs().set('hour', 9).set('minutes', 20).set('seconds', 0).format()
  }
};
