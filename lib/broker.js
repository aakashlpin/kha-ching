/**
 * Broker management lib
 *
 * different type of orders going through the system should flow via this
 *
 * we can keep the nomenclature same as zerodha
 * and have a mapper of keys for each broker
 *
 *
 */
import { KiteConnect } from 'kiteconnect'

import { syncGetKiteInstance } from './utils'
const fyers = require('fyers-api')

export const BROKERS = {
  ZERODHA: 'ZERODHA',
  FYERS: 'FYERS'
}

// export const getBrokerApiInstance = ({ user, broker }) => {
//   switch (broker) {
//     case BROKERS.ZERODHA:
//       return new KiteConnect({
//         api_key: process.env.KITE_API_KEY,
//         access_token: user?.session?.access_token
//       });
//     case BROKERS.FYERS:
//   }
// };

/**
 *
 * fyers.place_orders({
    token : token,
    data : {
      "symbol" : "NSE:SBIN-EQ",
      "qty" : 1,
      "type" : 2,
      "side" : 1,
      "productType" : "INTRADAY",
      "limitPrice" : 0,
      "stopPrice" : 0,
      "disclosedQty" : 0,
      "validity" : "DAY",
      "offlineOrder" : "False",
      "stopLoss" : 0,
      "takeProfit" : 0
  })
 */

const MAPPER = {
  ZERODHA_TO_FYERS: {
    EXCHANGE: {
      NFO: 'NSE'
    }
  }
}

// const ORDER_TYPE

export const mapOrderPropsForBroker = (order, broker) => {
  if (broker === BROKERS.ZERODHA) return order

  if (broker === BROKERS.FYERS) {
    const {
      tradingsymbol,
      quantity,
      exchange,
      transaction_type,
      order_type,
      product,
      validity
    } = order

    const mappedOrder = MAPPER.ZERODHA_TO_FYERS.EXCHANGE[exchange]
  }
}

export const placeOrder = async ({ order, user, broker }) => {
  if (broker === BROKERS.ZERODHA) {
    const kc = syncGetKiteInstance(user)
    return kc.placeOrder(order)
  }

  if (broker === BROKERS.FYERS) {
    const orderProps = mapOrderPropsForBroker(order, broker)
  }
}

export const modifyOrder = async ({ user }) => {}

export const getPositions = async ({ user }) => {}

export const getOrders = async ({ user }) => {}

export const getOrderHistoryById = async ({ user }) => {}
