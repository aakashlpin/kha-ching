import dayjs from 'dayjs';
const NEXT_PUBLIC_DEFAULT_LOTS = process.env.NEXT_PUBLIC_DEFAULT_LOTS;
const NEXT_PUBLIC_DEFAULT_SKEW_PERCENT = process.env.NEXT_PUBLIC_DEFAULT_SKEW_PERCENT;
const NEXT_PUBLIC_DEFAULT_SLM_PERCENT = process.env.NEXT_PUBLIC_DEFAULT_SLM_PERCENT;

export const INSTRUMENTS = {
  NIFTY: 'NIFTY',
  BANKNIFTY: 'BANKNIFTY',
  FINNIFTY: 'FINNIFTY'
};

export const INSTRUMENT_DETAILS = {
  [INSTRUMENTS.NIFTY]: {
    lotSize: 75,
    displayName: 'NIFTY',
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
  },
  [INSTRUMENTS.FINNIFTY]: {
    lotSize: 40,
    displayName: 'FINNIFTY',
    underlyingSymbol: 'NIFTY FIN SERVICE',
    nfoSymbol: 'FINNIFTY',
    exchange: 'NSE',
    strikeStepSize: 100
  }
};

export const STRATEGIES = {
  ATM_STRADDLE: 'ATM_STRADDLE',
  CM_WED_THURS: 'CM_WED_THURS',
  DIRECTIONAL_OPTION_SELLING: 'DIRECTIONAL_OPTION_SELLING',
  OPTION_BUYING_STRATEGY: 'OPTION_BUYING_STRATEGY'
};

export const EXIT_STRATEGIES = {
  INDIVIDUAL_LEG_SLM_1X: 'INDIVIDUAL_LEG_SLM_1X',
  MULTI_LEG_PREMIUM_THRESHOLD: 'MULTI_LEG_PREMIUM_THRESHOLD',
  MIN_XPERCENT_OR_SUPERTREND: 'MIN_XPERCENT_OR_SUPERTREND',
  OBS_TRAIL_SL: 'OBS_TRAIL_SL'
};

const DOS_ENTRY_STRATEGIES = {
  FIXED_TIME: 'FIXED_TIME',
  ST_CHANGE: 'ST_CHANGE'
};

const getInstrumentsDefaultState = () =>
  Object.values(INSTRUMENTS).reduce(
    (accum, item) => ({
      ...accum,
      [item]: false
    }),
    {}
  );

export const STRATEGIES_DETAILS = {
  [STRATEGIES.ATM_STRADDLE]: {
    heading: `Short Straddle — ATM`,
    defaultRunAt: dayjs().set('hour', 12).set('minutes', 20).set('seconds', 0).format(),
    defaultFormState: {
      instruments: getInstrumentsDefaultState(),
      lots: NEXT_PUBLIC_DEFAULT_LOTS,
      maxSkewPercent: NEXT_PUBLIC_DEFAULT_SKEW_PERCENT,
      slmPercent: NEXT_PUBLIC_DEFAULT_SLM_PERCENT,
      runNow: false,
      expireIfUnsuccessfulInMins: 10,
      exitStrategy: EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X
    }
  },
  [STRATEGIES.CM_WED_THURS]: {
    heading: `Short Ratio — ATM(1/3) & OTM(2/3)`,
    defaultRunAt: dayjs().set('hour', 9).set('minutes', 20).set('seconds', 0).format(),
    defaultFormState: {
      instruments: getInstrumentsDefaultState(),
      lots: NEXT_PUBLIC_DEFAULT_LOTS % 3 === 0 ? NEXT_PUBLIC_DEFAULT_LOTS : 3,
      maxSkewPercent: NEXT_PUBLIC_DEFAULT_SKEW_PERCENT,
      slmPercent: NEXT_PUBLIC_DEFAULT_SLM_PERCENT,
      runNow: false,
      expireIfUnsuccessfulInMins: 10,
      exitStrategy: EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X
    }
  },
  [STRATEGIES.DIRECTIONAL_OPTION_SELLING]: {
    premium: true,
    heading: `Directional Option Selling`,
    defaultRunAt: dayjs().set('hour', 9).set('minutes', 20).set('seconds', 0).format(),
    defaultFormState: {
      instruments: getInstrumentsDefaultState(),
      lots: 1,
      slmPercent: 50,
      maxTrades: 3,
      martingaleIncrementSize: 1,
      isHedgeEnabled: true,
      hedgeDistance: 1500,
      entryStrategy: DOS_ENTRY_STRATEGIES.FIXED_TIME,
      exitStrategy: EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND
    },
    ENTRY_STRATEGIES: DOS_ENTRY_STRATEGIES,
    [DOS_ENTRY_STRATEGIES.FIXED_TIME]: {
      label: 'at the scheduled time and then every time trend reverses'
    },
    [DOS_ENTRY_STRATEGIES.ST_CHANGE]: {
      label: 'when trend reverses from live trend and then every time trend reverses'
    }
  },
  [STRATEGIES.OPTION_BUYING_STRATEGY]: {
    premium: true,
    heading: `Option Buying Strategy`,
    schedule: [
      {
        afterTime: () =>
          dayjs().set('hour', 9).set('minutes', 30).set('seconds', 0).subtract(1, 'second'),
        beforeTime: () => dayjs().set('hour', 11).set('minutes', 0).set('seconds', 0)
      },
      {
        afterTime: () =>
          dayjs().set('hour', 13).set('minutes', 0).set('seconds', 0).subtract(1, 'second'),
        beforeTime: () => dayjs().set('hour', 15).set('minutes', 0).set('seconds', 0)
      }
    ]
  }
};

export const EXIT_STRATEGIES_DETAILS = {
  [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X]: {
    label: 'SL-M orders on all legs'
  },
  [EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD]: {
    label: '(BETA) No SL-M orders. Exit both legs if total premium hits SLM %'
  },
  [EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND]: {
    label: 'Initial SL-M %, then trail Option Supertrend'
  },
  [EXIT_STRATEGIES.OBS_TRAIL_SL]: {
    label: 'Initial 30%, then trail SL on every higher close (1min TF)'
  }
};

export const WATCHERS = {
  SLM_WATCHER: 'SLM_WATCHER'
};

export const WATCHERS_DETAILS = {
  [WATCHERS.SLM_WATCHER]: {
    label: 'Ensure order even if SL-M gets "Cancelled"'
  }
};

export const MAX_MIS_ORDER_DURATION_SECONDS = 6 * 60 * 60; // [9.15am, 3.15pm]

export const STOCKS_NFO_SCRIPS = [
  'AARTIIND',
  'ACC',
  'ADANIENT',
  'ADANIPORTS',
  'ALKEM',
  'AMARAJABAT',
  'AMBUJACEM',
  'APLLTD',
  'APOLLOHOSP',
  'APOLLOTYRE',
  'ASHOKLEY',
  'ASIANPAINT',
  'AUBANK',
  'AUROPHARMA',
  'AXISBANK',
  'BAJAJ-AUTO',
  'BAJAJFINSV',
  'BAJFINANCE',
  'BALKRISIND',
  'BANDHANBNK',
  'BANKBARODA',
  'BATAINDIA',
  'BEL',
  'BERGEPAINT',
  'BHARATFORG',
  'BHARTIARTL',
  'BHEL',
  'BIOCON',
  'BOSCHLTD',
  'BPCL',
  'BRITANNIA',
  'CADILAHC',
  'CANBK',
  'CHOLAFIN',
  'CIPLA',
  'COALINDIA',
  'COFORGE',
  'COLPAL',
  'CONCOR',
  'CUB',
  'CUMMINSIND',
  'DABUR',
  'DEEPAKNTR',
  'DIVISLAB',
  'DLF',
  'DRREDDY',
  'EICHERMOT',
  'ESCORTS',
  'EXIDEIND',
  'FEDERALBNK',
  'GAIL',
  'GLENMARK',
  'GMRINFRA',
  'GODREJCP',
  'GODREJPROP',
  'GRANULES',
  'GRASIM',
  'GUJGASLTD',
  'HAVELLS',
  'HCLTECH',
  'HDFC',
  'HDFCAMC',
  'HDFCBANK',
  'HDFCLIFE',
  'HEROMOTOCO',
  'HINDALCO',
  'HINDPETRO',
  'HINDUNILVR',
  'IBULHSGFIN',
  'ICICIBANK',
  'ICICIGI',
  'ICICIPRULI',
  'IDEA',
  'IDFCFIRSTB',
  'IGL',
  'INDIGO',
  'INDUSINDBK',
  'INDUSTOWER',
  'INFY',
  'IOC',
  'IRCTC',
  'ITC',
  'JINDALSTEL',
  'JSWSTEEL',
  'JUBLFOOD',
  'KOTAKBANK',
  'L&TFH',
  'LALPATHLAB',
  'LICHSGFIN',
  'LT',
  'LTI',
  'LTTS',
  'LUPIN',
  'M&M',
  'M&MFIN',
  'MANAPPURAM',
  'MARICO',
  'MARUTI',
  'MCDOWELL-N',
  'MFSL',
  'MGL',
  'MINDTREE',
  'MOTHERSUMI',
  'MPHASIS',
  'MRF',
  'MUTHOOTFIN',
  'NAM-INDIA',
  'NATIONALUM',
  'NAUKRI',
  'NAVINFLUOR',
  'NESTLEIND',
  'NMDC',
  'NTPC',
  'ONGC',
  'PAGEIND',
  'PEL',
  'PETRONET',
  'PFC',
  'PFIZER',
  'PIDILITIND',
  'PIIND',
  'PNB',
  'POWERGRID',
  'PVR',
  'RAMCOCEM',
  'RBLBANK',
  'RECLTD',
  'RELIANCE',
  'SAIL',
  'SBILIFE',
  'SBIN',
  'SHREECEM',
  'SIEMENS',
  'SRF',
  'SRTRANSFIN',
  'SUNPHARMA',
  'SUNTV',
  'TATACHEM',
  'TATACONSUM',
  'TATAMOTORS',
  'TATAPOWER',
  'TATASTEEL',
  'TCS',
  'TECHM',
  'TITAN',
  'TORNTPHARM',
  'TORNTPOWER',
  'TRENT',
  'TVSMOTOR',
  'UBL',
  'ULTRACEMCO',
  'UPL',
  'VEDL',
  'VOLTAS',
  'WIPRO',
  'ZEEL'
];
