import { STRATEGIES } from '../lib/constants'
import { KiteOrder, KiteProfile, KiteSession } from './kite'
import { AvailablePlansConfig } from './plans'

export type DailyPlansDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'

export interface DailyPlansDisplayValue {
  heading: string
  selectedStrategy: STRATEGIES | ''
  strategies: Record<string, AvailablePlansConfig>
}

export type DailyPlansConfig = Record<DailyPlansDayKey, DailyPlansDisplayValue>

export interface SignalXOrder extends KiteOrder {
  humanTradingSymbol: string
}

export interface SignalXUser {
  session: KiteSession
  isLoggedIn: boolean
}

export interface DBMeta {
  _id?: string
  _createdOn?: string
  _updatedOn?: string
}
