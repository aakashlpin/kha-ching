import { DBMeta, SignalXUser } from './misc'
import { ATM_STRADDLE_CONFIG, ATM_STRANGLE_CONFIG, DIRECTIONAL_OPTION_SELLING_CONFIG } from './plans'

export interface TradeMeta extends DBMeta {
  _collection?: string
  isAutoSquareOffEnabled: boolean
  runNow?: boolean
  runAt?: string
  squareOffTime?: string
  autoSquareOffProps?: {time: string, deletePendingOrders: boolean}
  expiresAt?: string
  _kite?: unknown // this is only used in jest for unit tests
  user?: SignalXUser // this is only available once job has been created on server
  orderTag?: string // this is only available once job has been created on server
  _nextTradingQueue?: string
}

export interface ATM_STRADDLE_TRADE extends TradeMeta, ATM_STRADDLE_CONFIG{}
export interface ATM_STRANGLE_TRADE extends TradeMeta, ATM_STRANGLE_CONFIG{}
export interface DIRECTIONAL_OPTION_SELLING_TRADE extends TradeMeta, DIRECTIONAL_OPTION_SELLING_CONFIG{}
// export interface DIRECTIONAL_OPTION_SELLING_TRADE_SERVER extends DIRECTIONAL_OPTION_SELLING_TRADE{
//   user: SignalXUser
// }

export type SUPPORTED_TRADE_CONFIG = ATM_STRADDLE_TRADE | ATM_STRANGLE_TRADE | DIRECTIONAL_OPTION_SELLING_TRADE
