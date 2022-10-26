import {
  INSTRUMENTS,
  EXIT_STRATEGIES,
  DOS_ENTRY_STRATEGIES,
  STRATEGIES,
  STRANGLE_ENTRY_STRATEGIES,
  OTS_ENTRY_STRATEGIES,
  PRODUCT_TYPE,
  VOLATILITY_TYPE,
  EXPIRY_TYPE
} from '../lib/constants'

interface COMMON_TRADE_PROPS {
  productType: PRODUCT_TYPE
  expiryType: EXPIRY_TYPE
}

export interface SavedPlanMeta extends COMMON_TRADE_PROPS {
  id?: string
  // _collection?: DailyPlansDayKey
  isAutoSquareOffEnabled: boolean
  isMaxLossEnabled:boolean
  maxLossPoints?:number
  isMaxProfitEnabled:boolean
  maxProfitPoints?:number
  runNow?: boolean
  autoSquareOffProps?: { time: string; deletePendingOrders: boolean }
  runAt?: string
  squareOffTime: string | undefined
  expiresAt?: string
}

export interface ROLLBACK_TYPE {
  onBrokenHedgeOrders: boolean
  onBrokenPrimaryOrders: boolean
  onBrokenExitOrders: boolean
}

export enum SL_ORDER_TYPE {
  SLL = 'SLL',
  SLM = 'SLM'
}

export enum COMBINED_SL_EXIT_STRATEGY {
  EXIT_ALL = 'EXIT_ALL',
  EXIT_LOSING = 'EXIT_LOSING'
}

export interface ATM_STRADDLE_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
  name:string
  lots: number
  thresholdSkewPercent: number
  takeTradeIrrespectiveSkew: boolean
  maxSkewPercent: number
  slmPercent: number
  expireIfUnsuccessfulInMins: number
  exitStrategy: EXIT_STRATEGIES
  strategy: STRATEGIES.ATM_STRADDLE
  instrument: INSTRUMENTS
  disableInstrumentChange?: boolean
  rollback?: ROLLBACK_TYPE
  trailEveryPercentageChangeValue?: number
  trailingSlPercent?: number
  onSquareOffSetAborted?: boolean
  isHedgeEnabled: boolean
  hedgeDistance?: number
  volatilityType: VOLATILITY_TYPE
  slOrderType: SL_ORDER_TYPE
  slLimitPricePercent?: number
  combinedExitStrategy?: COMBINED_SL_EXIT_STRATEGY
}

export interface ATM_STRANGLE_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
  name:string
  lots: number
  slmPercent: number
  inverted: boolean
  entryStrategy: STRANGLE_ENTRY_STRATEGIES
  exitStrategy: EXIT_STRATEGIES
  strategy: STRATEGIES.ATM_STRANGLE
  instrument: INSTRUMENTS
  disableInstrumentChange?: boolean
  rollback?: ROLLBACK_TYPE
  trailEveryPercentageChangeValue?: number
  trailingSlPercent?: number
  expireIfUnsuccessfulInMins?: number
  onSquareOffSetAborted?: boolean
  isHedgeEnabled: boolean
  hedgeDistance?: number
  distanceFromAtm: number
  deltaStrikes?: number
  percentfromAtm?:number
  volatilityType: VOLATILITY_TYPE
  slOrderType: SL_ORDER_TYPE
  slLimitPricePercent?: number
  combinedExitStrategy?: COMBINED_SL_EXIT_STRATEGY
}

export interface OTS_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
  name:string
  lots: number
  slmPercent: number
  entryStrategy: OTS_ENTRY_STRATEGIES
  exitStrategy: EXIT_STRATEGIES
  strategy: STRATEGIES.OVERNIGHT_TREND_STATEGY
  instrument: INSTRUMENTS
  disableInstrumentChange?: boolean
  trailEveryPercentageChangeValue?: number
  trailingSlPercent?: number
  expireIfUnsuccessfulInMins?: number
  onSquareOffSetAborted?: boolean
  isAutoSquareOffEnabled:boolean
  rollback?: ROLLBACK_TYPE
  distanceFromAtm: number
  deltaStrikes?: number
  percentfromAtm?:number
  volatilityType: VOLATILITY_TYPE
  slOrderType: SL_ORDER_TYPE
  slLimitPricePercent?: number
  combinedExitStrategy?: COMBINED_SL_EXIT_STRATEGY
}

export interface DIRECTIONAL_OPTION_SELLING_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
  name:string
  lots: number
  slmPercent: number
  maxTrades: number
  martingaleIncrementSize: number
  isHedgeEnabled: boolean
  hedgeDistance: number | undefined
  entryStrategy: DOS_ENTRY_STRATEGIES
  exitStrategy: EXIT_STRATEGIES
  strategy: STRATEGIES.DIRECTIONAL_OPTION_SELLING
  instrument: INSTRUMENTS
  disableInstrumentChange?: boolean
  strikeByPrice?: number | undefined
  rollback?: ROLLBACK_TYPE
  slOrderType: SL_ORDER_TYPE
  slLimitPricePercent?: number
}

export type AvailablePlansConfig =
  | ATM_STRADDLE_CONFIG
  | ATM_STRANGLE_CONFIG
  | DIRECTIONAL_OPTION_SELLING_CONFIG
  | OTS_CONFIG
