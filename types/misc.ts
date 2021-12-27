import { STRATEGIES } from '../lib/constants'
import { KiteOrder, KiteProfile } from './kite'
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

export interface combinedOrders {
  tradingsymbol: string
  order_id?: string
  average_price?: number
  transaction_type: 'BUY' | 'SELL'
  status?: 'COMPLETE' | 'REJECTED' | 'CANCELLED' | 'OPEN' | 'TRIGGER PENDING'
  tag: string
}

export interface SignalXUser {
  session: KiteProfile
  isLoggedIn: boolean
}

export interface DBMeta {
  _id?: string
  _createdOn?: string
  _updatedOn?: string
}
