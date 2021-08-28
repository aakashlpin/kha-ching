import axios from 'axios'

import console from '../logging'
import { getNearestCandleTime, isMockOrder, ms } from '../utils'
import { FYERS_ORDER_RESPONSE } from '../strategies/mockData/orderResponse'
const fyers = require('fyers-api')

const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade'

async function getPreviousMinClose (instrumentToken) {
  const apiDateFormat = 'YYYY-MM-DD HH:mm:ss'
  const toDate = getNearestCandleTime(ms(60))
  const fromDate = toDate.set('seconds', 0)
  try {
    const props = {
      instrument_token: instrumentToken,
      from_date: fromDate.format(apiDateFormat),
      to_date: toDate.format(apiDateFormat),
      interval: 'minute'
    }
    console.log('[fyersTrailObsSL] signalx request', props)
    const { data } = await axios.post(`${SIGNALX_URL}/api/data/prices`, props, {
      headers: {
        'X-API-KEY': process.env.SIGNALX_API_KEY
      }
    })

    const [latestPriceObject] = data
    const { close } = latestPriceObject
    return close
  } catch (e) {
    console.log('🔴 [fyersTrailObsSL] error in fetching price from signalx', e)
    return null
  }
}

export default async ({
  initialJobData,
  exitOrder,
  entryPrice,
  initialSLPrice,
  instrumentToken
}) => {
  const { user } = initialJobData
  try {
    // NB: exitOrder here is of pending SLM Order

    // on each run, grab the `trigger_price` of the pending SLM order
    // this is so that we don't need to pass around reference to the previous price

    // from kite api, get the latest close
    // calculate the revised SL as per formula
    // update the SL if new SL > triggerPrice

    const orderStatus = isMockOrder()
      ? FYERS_ORDER_RESPONSE
      : await fyers.orderStatus({
          token: user.fyers.access_token,
          data: {
            id: exitOrder.data.orderDetails.id
          }
        })

    const { status, stopPrice, id } = orderStatus.data.orderDetails
    const STATUS_KEY = {
      1: 'CANCELLED',
      2: 'COMPLETED',
      3: null,
      4: 'TRANSIT',
      5: 'REJECTED',
      6: 'PENDING'
    }

    if (status !== 6) {
      // not pending
      return Promise.resolve(
        `[fyersTrailObsSL] Terminating checker! order is in ${STATUS_KEY[status]} state!`
      )
    }

    const currentClose = isMockOrder()
      ? 200
      : await getPreviousMinClose(instrumentToken)
    const profitPercent = ((currentClose - entryPrice) / entryPrice) * 100
    const trailingPercent = profitPercent / 2
    const revisedSL = Math.round(
      (initialSLPrice * trailingPercent) / 100 + initialSLPrice
    )
    if (revisedSL > stopPrice) {
      // new SL greater than SL entered in the system (the source of truth)
      const fyersApiData = {
        id,
        stopLoss: revisedSL
      }
      if (!isMockOrder()) {
        const response = await fyers.update_orders({
          token: user.fyers.access_token,
          data: fyersApiData
        })
        console.log('🟢 [fyersTrailObsSL] update_order response', response)
      }
      console.log(`updated SL from ${stopPrice} to ${revisedSL}`)
    }
    return Promise.reject(new Error('[fyersTrailObsSL] will retry!'))
  } catch (e) {
    console.log('[fyersTrailObsSL] global caught error', e)
    return Promise.reject(
      new Error('[fyersTrailObsSL] global caught error. Will retry!')
    )
  }
}
