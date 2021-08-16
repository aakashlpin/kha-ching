import { INSTRUMENTS, EXIT_STRATEGIES, DOS_ENTRY_STRATEGIES, STRATEGIES, STRANGLE_ENTRY_STRATEGIES, PRODUCT_TYPE, VOLATILITY_TYPE } from '../lib/constants'
import { DailyPlansDayKey, SignalXUser } from './misc'

interface COMMON_TRADE_PROPS {
  productType: PRODUCT_TYPE
}

export interface SavedPlanMeta extends COMMON_TRADE_PROPS {
  _id?: string
  _createdOn?: string
  _updatedOn?: string
  // _collection?: DailyPlansDayKey
  isAutoSquareOffEnabled: boolean
  runNow?: boolean
  autoSquareOffProps?: {time: string, deletePendingOrders: boolean}
  runAt?: string
  squareOffTime: string | undefined
  expiresAt?: string
}

export interface ROLLBACK_TYPE {
  onBrokenHedgeOrders: boolean
  onBrokenPrimaryOrders: boolean
  onBrokenExitOrders: boolean
}

export interface ATM_STRADDLE_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
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
}

export interface ATM_STRANGLE_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
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
  volatilityType: VOLATILITY_TYPE
}

export interface DIRECTIONAL_OPTION_SELLING_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
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
}

export type AvailablePlansConfig = ATM_STRADDLE_CONFIG | ATM_STRANGLE_CONFIG | DIRECTIONAL_OPTION_SELLING_CONFIG
