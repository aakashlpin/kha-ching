import { INSTRUMENTS, EXIT_STRATEGIES, DOS_ENTRY_STRATEGIES, STRATEGIES } from '../lib/constants'
import { DailyPlansDayKey, SignalXUser } from './misc'

// TODO: Discuss with @Aakash about these interfaces

export interface SavedPlanMeta {
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
}

export interface ATM_STRANGLE_CONFIG extends SavedPlanMeta {
  instruments: Record<INSTRUMENTS, boolean>
  lots: number
  slmPercent: number
  inverted: boolean
  exitStrategy: EXIT_STRATEGIES
  strategy: STRATEGIES.ATM_STRANGLE
  instrument: INSTRUMENTS
  disableInstrumentChange?: boolean
  rollback?: ROLLBACK_TYPE
  trailEveryPercentageChangeValue?: number
  trailingSlPercent?: number
  expireIfUnsuccessfulInMins?: number
  onSquareOffSetAborted?: boolean
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
