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
  MULTI_LEG_PREMIUM: 'MULTI_LEG_PREMIUM',
  DIRECTIONAL_OPTION_SELLING: 'DIRECTIONAL_OPTION_SELLING'
};

export const STRATEGIES_DETAILS = {
  [STRATEGIES.ATM_STRADDLE]: {
    heading: `ATM straddle`,
    defaultRunAt: dayjs().set('hour', 12).set('minutes', 25).set('seconds', 0).format()
  },
  [STRATEGIES.CM_WED_THURS]: {
    heading: `ATM straddle(1x) & OTM strangle(2x)`,
    defaultRunAt: dayjs().set('hour', 9).set('minutes', 20).set('seconds', 0).format()
  },
  [STRATEGIES.DIRECTIONAL_OPTION_SELLING]: {
    heading: `⭐️ Directional Option Selling`,
    defaultRunAt: dayjs().set('hour', 9).set('minutes', 20).set('seconds', 0).format()
  }
};

export const EXIT_STRATEGIES = {
  INDIVIDUAL_LEG_SLM_1X: 'INDIVIDUAL_LEG_SLM_1X',
  INDIVIDUAL_LEG_SLM_2X: 'INDIVIDUAL_LEG_SLM_2X',
  MULTI_LEG_PREMIUM_THRESHOLD: 'MULTI_LEG_PREMIUM_THRESHOLD',
  MULTI_LEG_PREMIUM_TARGET: 'MULTI_LEG_PREMIUM_TARGET',
  MIN_XPERCENT_OR_SUPERTREND: 'MIN_XPERCENT_OR_SUPERTREND'
};

export const EXIT_STRATEGIES_DETAILS = {
  [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X]: {
    label: 'SLM Buy orders on all legs.'
  },
  [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_2X]: {
    label: 'SLM Buy orders on all legs + Buy the leg that hits the SL.'
  },
  [EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD]: {
    label: 'No SLM orders. Exit both legs if total premium hits SLM %.'
  },
  [EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND]: {
    label: 'Initial SLM %, then trail Option Supertrend'
  }
};

export const MAX_MIS_ORDER_DURATION_SECONDS = 6 * 60 * 60; // [9.15am, 3.15pm]

export const getMisOrderLastSquareOffTime = () =>
  dayjs().set('hour', 15).set('minutes', 24).set('seconds', 0).format();

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
