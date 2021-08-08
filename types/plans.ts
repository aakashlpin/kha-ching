import { INSTRUMENTS, EXIT_STRATEGIES, DOS_ENTRY_STRATEGIES, STRATEGIES } from '../lib/constants'
import { DailyPlansDayKey } from './misc'

// TODO: Discuss with @Aakash about these interfaces

export interface SavedPlanMeta {
  _id?: string
  _createdOn?: string
  _updatedOn?: string
  _collection?: DailyPlansDayKey
}

export interface ATM_STRADDLE_ROLLBACK_TYPE {
  onBrokenPrimaryOrders: boolean
  onBrokenExitOrders: boolean
}

export interface ATM_STRANGLE_ROLLBACK_TYPE extends ATM_STRADDLE_ROLLBACK_TYPE { }

export interface DIRECTIONAL_OPTION_SELLING_ROLLBACK_TYPE {
  onBrokenHedgeOrders: boolean
  onBrokenPrimaryOrders: boolean
  onBrokenExitOrders: boolean
}

export type AvailableRollbackConfig = ATM_STRADDLE_ROLLBACK_TYPE | ATM_STRANGLE_ROLLBACK_TYPE | DIRECTIONAL_OPTION_SELLING_ROLLBACK_TYPE

export interface ATM_STRADDLE_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
  lots: number
  thresholdSkewPercent: number
  takeTradeIrrespectiveSkew: boolean
  maxSkewPercent: number
  slmPercent: number
  runNow: boolean
  expireIfUnsuccessfulInMins: number
  exitStrategy: EXIT_STRATEGIES
  strategy: STRATEGIES.ATM_STRADDLE
  instrument: INSTRUMENTS
  disableInstrumentChange?: boolean
  isAutoSquareOffEnabled?: boolean
  squareOffTime?: string | null
  runAt?: string
  rollback?: ATM_STRADDLE_ROLLBACK_TYPE
  trailEveryPercentageChangeValue?: number
  trailingSlPercent?: number
}

export interface CM_WED_THURS_CONFIG extends ATM_STRADDLE_CONFIG { };

export interface ATM_STRANGLE_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
  lots: number
  slmPercent: number
  inverted: boolean
  runNow: boolean
  exitStrategy: EXIT_STRATEGIES
  strategy: STRATEGIES.ATM_STRANGLE
  instrument: INSTRUMENTS
  disableInstrumentChange?: boolean
  isAutoSquareOffEnabled?: boolean
  squareOffTime?: string | null
  runAt?: string
  rollback?: ATM_STRANGLE_ROLLBACK_TYPE
  trailEveryPercentageChangeValue?: number
  trailingSlPercent?: number
}

export interface DIRECTIONAL_OPTION_SELLING_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
  lots: number
  slmPercent: number
  maxTrades: number
  martingaleIncrementSize: number
  isHedgeEnabled: boolean
  hedgeDistance: number | null
  entryStrategy: DOS_ENTRY_STRATEGIES
  exitStrategy: EXIT_STRATEGIES
  strategy: STRATEGIES.DIRECTIONAL_OPTION_SELLING
  instrument: INSTRUMENTS
  disableInstrumentChange?: boolean
  isAutoSquareOffEnabled?: boolean
  squareOffTime?: string | null
  runAt?: string
  strikeByPrice?: number | null
  runNow: boolean
  rollback?: DIRECTIONAL_OPTION_SELLING_ROLLBACK_TYPE
}

export type AvailablePlansConfig = ATM_STRADDLE_CONFIG | CM_WED_THURS_CONFIG | ATM_STRANGLE_CONFIG | DIRECTIONAL_OPTION_SELLING_CONFIG
