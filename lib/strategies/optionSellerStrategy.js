import axios from 'axios'
import dayjs from 'dayjs'
import { isNumber } from 'lodash'

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../constants'
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders'
import console from '../logging'
import {
  addToAutoSquareOffQueue,
  addToNextQueue,
  EXIT_TRADING_Q_NAME,
  TRADING_Q_NAME,
  WATCHER_Q_NAME
} from '../queue'
import {
  delay,
  getCurrentExpiryTradingSymbol,
  getIndexInstruments,
  getInstrumentPrice,
  getLastOpenDateSince,
  getNearestCandleTime,
  getNextNthMinute,
  getTimeLeftInMarketClosingMs,
  getTradingSymbolsByOptionPrice,
  ms,
  syncGetKiteInstance
} from '../utils'
import mockOrderResponse from './mockData/orderResponse'

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false
const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade'

export const fetchHistoricalPrice = async (instrumentToken) => {
  const apiDateFormat = 'YYYY-MM-DD HH:mm:ss'
  const now = dayjs().set('date', 20).set('hours', 9).set('minutes', 45).set('seconds', 0).toDate()
  const toDate = getNearestCandleTime(ms(15 * 60), now)
  const fromDate = toDate.subtract(14, 'minutes').set('seconds', 0)
  const props = {
    instrument_token: instrumentToken,
    from_date: fromDate.format(apiDateFormat),
    to_date: toDate.format(apiDateFormat),
    interval: '15minute'
  }
  console.log('[optionSellerStrategy] signalx request', props)
  const { data } = await axios.post(`${SIGNALX_URL}/api/data/prices`, props, {
    headers: {
      'X-API-KEY': process.env.SIGNALX_API_KEY
    }
  })
  return data
}

export default async (initialJobData) => {
  try {
    const { instrument } = initialJobData

    const { underlyingSymbol, strikeStepSize, nfoSymbol } = INSTRUMENT_DETAILS[instrument]
    const allInstruments = await getIndexInstruments('NSE')

    const instrumentToken = allInstruments.find(
      (ins) => ins.name === underlyingSymbol
    )?.instrument_token

    try {
      const data = await fetchHistoricalPrice(instrumentToken)
      const [lastCandle] = data
      const { low, high } = lastCandle
      const callOptionPrice = high + 100
      const putOptionPrice = low - 100

      const callOptionStrike = Math.round(callOptionPrice / strikeStepSize) * strikeStepSize
      const putOptionStrike = Math.round(putOptionPrice / strikeStepSize) * strikeStepSize

      // not sure why's memoizer not caching by argument
      // so clear cache right now
      getIndexInstruments.clear()

      const nfoInstruments = await getIndexInstruments('NFO')

      const callStrike = getCurrentExpiryTradingSymbol({
        sourceData: nfoInstruments,
        nfoSymbol,
        strike: callOptionStrike,
        instrumentType: 'CE'
      })

      const putStrike = getCurrentExpiryTradingSymbol({
        sourceData: nfoInstruments,
        nfoSymbol,
        strike: putOptionStrike,
        instrumentType: 'PE'
      })

      // return {
      //   callStrike,
      //   putStrike
      // }

      return [callStrike, putStrike]
    } catch (e) {
      console.log(e)
      return null
    }
  } catch (e) {
    console.log('[optionSellerStrategy] error', e)
    return new Error(e)
  }
}
