import dayjs from 'dayjs'
import { COMBINED_SL_EXIT_STRATEGY, SL_ORDER_TYPE } from '../types/plans'
const NEXT_PUBLIC_DEFAULT_LOTS = process.env.NEXT_PUBLIC_DEFAULT_LOTS
const NEXT_PUBLIC_DEFAULT_SKEW_PERCENT =
  process.env.NEXT_PUBLIC_DEFAULT_SKEW_PERCENT
const NEXT_PUBLIC_DEFAULT_SLM_PERCENT =
  process.env.NEXT_PUBLIC_DEFAULT_SLM_PERCENT

export enum INSTRUMENTS {
  NIFTY = 'NIFTY',
  BANKNIFTY = 'BANKNIFTY',
  FINNIFTY = 'FINNIFTY'
}

export interface INSTRUMENT_PROPERTIES {
  lotSize: number
  displayName: string
  underlyingSymbol: string
  nfoSymbol: string
  exchange: string
  strikeStepSize: number
  freezeQty: number
}

export const INSTRUMENT_DETAILS: Record<INSTRUMENTS, INSTRUMENT_PROPERTIES> = {
  [INSTRUMENTS.NIFTY]: {
    lotSize: 50,
    displayName: 'NIFTY',
    underlyingSymbol: 'NIFTY 50',
    nfoSymbol: 'NIFTY',
    exchange: 'NSE',
    strikeStepSize: 50,
    // [11501-17250]
    // freezeQty: 200
    freezeQty: 1800
  },
  [INSTRUMENTS.BANKNIFTY]: {
    lotSize: 25,
    displayName: 'BANKNIFTY',
    underlyingSymbol: 'NIFTY BANK',
    nfoSymbol: 'BANKNIFTY',
    exchange: 'NSE',
    strikeStepSize: 100,
    // [27501-40000]
    // freezeQty: 100
    freezeQty: 1200
  },
  [INSTRUMENTS.FINNIFTY]: {
    lotSize: 40,
    displayName: 'FINNIFTY',
    underlyingSymbol: 'NIFTY FIN SERVICE',
    nfoSymbol: 'FINNIFTY',
    exchange: 'NSE',
    strikeStepSize: 100,
    // [17251-27500]
    freezeQty: 1800
  }
}

export enum STRATEGIES {
  ATM_STRADDLE = 'ATM_STRADDLE',
  ATM_STRANGLE = 'ATM_STRANGLE',
  DIRECTIONAL_OPTION_SELLING = 'DIRECTIONAL_OPTION_SELLING',
  OPTION_BUYING_STRATEGY = 'OPTION_BUYING_STRATEGY'
}

export enum EXIT_STRATEGIES {
  INDIVIDUAL_LEG_SLM_1X = 'INDIVIDUAL_LEG_SLM_1X',
  MULTI_LEG_PREMIUM_THRESHOLD = 'MULTI_LEG_PREMIUM_THRESHOLD',
  MIN_XPERCENT_OR_SUPERTREND = 'MIN_XPERCENT_OR_SUPERTREND',
  OBS_TRAIL_SL = 'OBS_TRAIL_SL'
}

export enum DOS_ENTRY_STRATEGIES {
  FIXED_TIME = 'FIXED_TIME',
  ST_CHANGE = 'ST_CHANGE'
}

export enum PRODUCT_TYPE {
  MIS = 'MIS',
  NRML = 'NRML'
}

export enum VOLATILITY_TYPE {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum STRANGLE_ENTRY_STRATEGIES {
  DISTANCE_FROM_ATM = 'DISTANCE_FROM_ATM',
  DELTA_STIKES = 'DELTA_STIKES'
}

export enum ANCILLARY_TASKS {
  ORDERBOOK_SYNC_BY_TAG = 'ORDERBOOK_SYNC_BY_TAG',
  CLEANUP_COMPLETED_JOBS = 'CLEANUP_COMPLETED_JOBS',
  ORDERBOOKSYNC='ORDERBOOKSYNC'
}

export const COMBINED_SL_EXIT_STRATEGY_LABEL = {
  [COMBINED_SL_EXIT_STRATEGY.EXIT_ALL]: 'Exit all legs',
  [COMBINED_SL_EXIT_STRATEGY.EXIT_LOSING]:
    'Exit losing legs only and bring others to cost'
}

const getInstrumentsDefaultState = (): Record<INSTRUMENTS, boolean> =>
  Object.values(INSTRUMENTS).reduce<Record<string, boolean>>(
    (accum, item) => ({
      ...accum,
      [item]: false
    }),
    {}
  )

export const STRATEGIES_DETAILS = {
  [STRATEGIES.ATM_STRADDLE]: {
    premium: false,
    heading: 'Long/Short Straddle — ATM',
    defaultRunAt: dayjs()
      .set('hour', 12)
      .set('minutes', 20)
      .set('seconds', 0)
      .format(),
    margin1x: {
      [INSTRUMENTS.NIFTY]: 145000,
      [INSTRUMENTS.BANKNIFTY]: 150000,
      [INSTRUMENTS.FINNIFTY]: 100000
    },
    defaultFormState: {
      instruments: getInstrumentsDefaultState(),
      lots: NEXT_PUBLIC_DEFAULT_LOTS,
      maxSkewPercent: NEXT_PUBLIC_DEFAULT_SKEW_PERCENT,
      thresholdSkewPercent: 20,
      takeTradeIrrespectiveSkew: false,
      slmPercent: NEXT_PUBLIC_DEFAULT_SLM_PERCENT,
      trailEveryPercentageChangeValue: 2,
      trailingSlPercent: NEXT_PUBLIC_DEFAULT_SLM_PERCENT,
      productType: PRODUCT_TYPE.MIS,
      volatilityType: VOLATILITY_TYPE.SHORT,
      runNow: false,
      expireIfUnsuccessfulInMins: 10,
      exitStrategy: EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X,
      slOrderType: SL_ORDER_TYPE.SLL,
      slLimitPricePercent: 1,
      combinedExitStrategy: COMBINED_SL_EXIT_STRATEGY.EXIT_ALL,
      rollback: {
        onBrokenHedgeOrders: false,
        onBrokenPrimaryOrders: false,
        onBrokenExitOrders: false
      }
    }
  },
  [STRATEGIES.ATM_STRANGLE]: {
    premium: false,
    heading: 'Long/Short Strangle',
    defaultRunAt: dayjs()
      .set('hour', 12)
      .set('minutes', 20)
      .set('seconds', 0)
      .format(),
    margin1x: {
      [INSTRUMENTS.NIFTY]: 420000,
      [INSTRUMENTS.BANKNIFTY]: 425000
    },
    defaultFormState: {
      instruments: getInstrumentsDefaultState(),
      lots: NEXT_PUBLIC_DEFAULT_LOTS,
      slmPercent: NEXT_PUBLIC_DEFAULT_SLM_PERCENT,
      trailEveryPercentageChangeValue: 2,
      trailingSlPercent: NEXT_PUBLIC_DEFAULT_SLM_PERCENT,
      inverted: false,
      entryStrategy: STRANGLE_ENTRY_STRATEGIES.DISTANCE_FROM_ATM,
      distanceFromAtm: 1,
      deltaStrikes: 20,
      productType: PRODUCT_TYPE.MIS,
      volatilityType: VOLATILITY_TYPE.SHORT,
      runNow: false,
      exitStrategy: EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X,
      slOrderType: SL_ORDER_TYPE.SLL,
      slLimitPricePercent: 1,
      combinedExitStrategy: COMBINED_SL_EXIT_STRATEGY.EXIT_ALL,
      rollback: {
        onBrokenHedgeOrders: false,
        onBrokenPrimaryOrders: false,
        onBrokenExitOrders: false
      }
    },
    ENTRY_STRATEGIES: STRANGLE_ENTRY_STRATEGIES,
    ENTRY_STRATEGY_DETAILS: {
      [STRANGLE_ENTRY_STRATEGIES.DISTANCE_FROM_ATM]: {
        label: 'by distance from ATM strike'
      },
      [STRANGLE_ENTRY_STRATEGIES.DELTA_STIKES]: {
        label: 'by option strike delta from live option chain ⚡️'
      }
    }
  },
  [STRATEGIES.DIRECTIONAL_OPTION_SELLING]: {
    premium: true,
    heading: 'Directional Option Selling',
    defaultRunAt: dayjs()
      .set('hour', 9)
      .set('minutes', 20)
      .set('seconds', 0)
      .format(),
    margin1x: {
      [INSTRUMENTS.NIFTY]: 675000,
      [INSTRUMENTS.BANKNIFTY]: 750000
    },
    defaultFormState: {
      instruments: getInstrumentsDefaultState(),
      lots: 1,
      slmPercent: 50,
      maxTrades: 3,
      martingaleIncrementSize: 1,
      isHedgeEnabled: true,
      productType: PRODUCT_TYPE.MIS,
      hedgeDistance: 2000,
      entryStrategy: DOS_ENTRY_STRATEGIES.FIXED_TIME,
      exitStrategy: EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND,
      slOrderType: SL_ORDER_TYPE.SLL,
      slLimitPricePercent: 1,
      rollback: {
        onBrokenHedgeOrders: false,
        onBrokenPrimaryOrders: false,
        onBrokenExitOrders: false
      }
    },
    ENTRY_STRATEGIES: DOS_ENTRY_STRATEGIES,
    [DOS_ENTRY_STRATEGIES.FIXED_TIME]: {
      label: 'at the scheduled time and then every time trend reverses'
    },
    [DOS_ENTRY_STRATEGIES.ST_CHANGE]: {
      label:
        'when trend reverses from live trend and then every time trend reverses'
    }
  },
  [STRATEGIES.OPTION_BUYING_STRATEGY]: {
    premium: true,
    heading: 'Option Buying Strategy',
    defaultRunAt: dayjs()
      .set('hour', 9)
      .set('minutes', 30)
      .set('seconds', 0)
      .format(),
    schedule: [
      {
        afterTime: () =>
          dayjs()
            .set('hour', 9)
            .set('minutes', 30)
            .set('seconds', 0)
            .subtract(1, 'second'),
        beforeTime: () =>
          dayjs()
            .set('hour', 11)
            .set('minutes', 0)
            .set('seconds', 0)
      },
      {
        afterTime: () =>
          dayjs()
            .set('hour', 13)
            .set('minutes', 0)
            .set('seconds', 0)
            .subtract(1, 'second'),
        beforeTime: () =>
          dayjs()
            .set('hour', 15)
            .set('minutes', 0)
            .set('seconds', 0)
      }
    ],
    defaultFormState: {}
  }
}

export const ROLLBACK_KEY_MAP = {
  onBrokenHedgeOrders: 'If taking the hedge position fails',
  onBrokenPrimaryOrders: 'If taking the primary position fails',
  onBrokenExitOrders: 'If placing any SL order fail'
}

export const EXIT_STRATEGIES_DETAILS = {
  [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X]: {
    label: 'Fixed SL% on all legs'
  },
  [EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD]: {
    label: 'Combined/trailing SL%'
  },
  [EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND]: {
    label: 'Initial SL%, then trail Option Supertrend'
  },
  [EXIT_STRATEGIES.OBS_TRAIL_SL]: {
    label: 'Initial 30%, then trail SL on every higher close (1min TF)'
  }
}

export const WATCHERS = {
  SLM_WATCHER: 'SLM_WATCHER'
}

export const WATCHERS_DETAILS = {
  [WATCHERS.SLM_WATCHER]: {
    label: 'Ensure order even if SL-M gets "Cancelled"'
  }
}

export const MAX_MIS_ORDER_DURATION_SECONDS = 6 * 60 * 60 // [9.15am, 3.15pm]

export const USER_OVERRIDE = {
  ABORT: 'ABORT',
  RESUME: 'RESUME'
}

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
]

export const ERROR_STRINGS = {
  PAID_FEATURE: 'Invalid SignalX Club or Premium subscription',
  PAID_STRATEGY: 'Invalid SignalX Club or Premium subscription'
}

export const SUBSCRIPTION_TYPE = {
  SUBSCRIBER: 'SUBSCRIBER',
  NOT_SUBSCRIBER: 'NOT_SUBSCRIBER'
}

export const SUBSCRIBER_TYPE = {
  PREMIUM: 'PREMIUM',
  CLUB: 'CLUB'
}
