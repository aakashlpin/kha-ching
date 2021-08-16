export interface KiteProfile {
  user_id: string
  user_name: string
  user_shortname?: string
  user_type: string
  email: string
  broker: string
  exchanges: string[]
  products: string[]
  order_types: string[]
  api_key?: string
  access_token?: string
  login_time?: string
  avatar_url: string
}

export interface KiteOrder {
  order_id?: string
  parent_order_id?: string | null
  exchange_order_id?: string | null
  placed_by?: string
  variety?: string
  status?: 'COMPLETE' | 'REJECTED' | 'CANCELLED' | 'OPEN' | 'TRIGGER PENDING'

  tradingsymbol: string
  exchange: string
  instrument_token?: number
  transaction_type: 'BUY' | 'SELL'
  order_type: string
  product: string
  validity?: string
  guid?: string

  price?: number
  quantity: number
  trigger_price?: number

  average_price?: number
  pending_quantity?: number
  filled_quantity?: number
  disclosed_quantity?: number
  market_protection?: number

  order_timestamp?: string
  exchange_timestamp?: string

  status_message?: string
  tag: string
  tags?: string[]
  meta?: {}
}

export interface KitePosition {
  average_price: number
  buy_m2m: number
  buy_price: number
  buy_quantity: number
  buy_value: number
  close_price: number
  day_buy_price: number
  day_buy_quantity: number
  day_buy_value: number
  day_sell_price: number
  day_sell_quantity: number
  day_sell_value: number
  exchange: string
  instrument_token: number
  last_price: number
  m2m: number
  multiplier: number
  overnight_quantity: number
  pnl: number
  product: string
  quantity: number
  realised: number
  sell_m2m: number
  sell_price: number
  sell_quantity: number
  sell_value: number
  tradingsymbol: string
  unrealised: number
  value: number
}
