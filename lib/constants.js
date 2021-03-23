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
  CM_WED_THURS: 'CM_WED_THURS',
  MULTI_LEG_PREMIUM: 'MULTI_LEG_PREMIUM'
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

export const EXIT_STRATEGIES = {
  INDIVIDUAL_LEG_SLM_1X: 'INDIVIDUAL_LEG_SLM_1X',
  INDIVIDUAL_LEG_SLM_2X: 'INDIVIDUAL_LEG_SLM_2X',
  MULTI_LEG_PREMIUM_THRESHOLD: 'MULTI_LEG_PREMIUM_THRESHOLD',
  MULTI_LEG_PREMIUM_TARGET: 'MULTI_LEG_PREMIUM_TARGET'
};

export const EXIT_STRATEGIES_DETAILS = {
  [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X]: {
    label: 'SLM Buy orders on all legs.'
  },
  [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_2X]: {
    label: 'SLM Buy orders on all legs + Buy the leg that hits the SL.'
  },
  [EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD]: {
    label: 'No SLM orders. Exit both legs if total premium crosses SLM %.'
  }
  // [EXIT_STRATEGIES.MULTI_LEG_PREMIUM_TARGET]: {
  //   label: 'Target — Exit both legs if one leg were to hit SL and other brought to cost.'
  // }
};

export const MAX_MIS_ORDER_DURATION_SECONDS = 6 * 60 * 60; // [9.15am, 3.15pm]
