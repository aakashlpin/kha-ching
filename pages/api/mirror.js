import axios from 'axios'
import { KiteConnect } from 'kiteconnect'

import withSession from '../../lib/session'
import { useKiteTicker } from '../../lib/socket/ticker'
const apiKey = process.env.KITE_API_KEY

// Giveaway to the publisher
// 1. SIGNALX_MIRROR_URL=SHARED_PRIVATE_URL
// 2. TRADES_HOST_URL - the trades received via webhook
// 3. SIGNALX_MIRROR_USER_TYPE=PUBLISHER

// Giveaway to the consumer
// 1. SIGNALX_MIRROR_URL=SHARED_PRIVATE_URL
// 2. TRADES_HOST_URL - the trades actually punched on his account
// 3. SIGNALX_MIRROR_USER_TYPE=CONSUMER

const { SIGNALX_MIRROR_URL, TRADES_HOST_URL, SIGNALX_MIRROR_USER_TYPE } = process.env

async function updateStatus (statusCode, ...params) {
  console.log(statusCode, ...params)
  try {
    const {
      data: { status_history = [], ...props }
    } = await axios(SIGNALX_MIRROR_URL)

    await axios.put(SIGNALX_MIRROR_URL, {
      ...props,
      connected: statusCode === 'connect',
      status_history: [
        {
          user: SIGNALX_MIRROR_USER_TYPE,
          status_code: statusCode,
          timestamp: new Date()
        },
        ...status_history
      ]
    })
  } catch (e) {
    console.log('[updateStatus] error', e)
  }
}

async function orderUpdate (trade, isTestTrade = false) {
  console.log('[mirror new orderUpdate]', trade, isTestTrade)
  try {
    if (!isTestTrade) {
      axios.post(TRADES_HOST_URL, trade)
    }

    if (SIGNALX_MIRROR_USER_TYPE !== 'PUBLISHER') {
      return
    }

    const { data: subscribersDetails } = await axios(SIGNALX_MIRROR_URL)
    const { api_key: subscriberApiKey, access_token: subscriberAccessToken } = subscribersDetails

    const kc =
      subscriberApiKey && subscriberAccessToken
        ? new KiteConnect({
          api_key: subscriberApiKey,
          access_token: subscriberAccessToken
        })
        : null

    if (!kc) {
      return
    }

    const {
      variety,
      exchange,
      status,
      tradingsymbol,
      transaction_type,
      validity,
      product,
      quantity
    } = trade

    if (status !== kc.STATUS_COMPLETE || exchange !== kc.EXCHANGE_NFO) {
      return
    }

    const orderRes = await kc.placeOrder(variety, {
      tradingsymbol,
      quantity,
      exchange,
      transaction_type,
      order_type: kc.ORDER_TYPE_MARKET,
      product: product,
      validity
    })

    console.log(orderRes)
  } catch (e) {
    console.log('[orderUpdate] error', e)
  }
}

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  useKiteTicker({
    apiKey,
    accessToken: user.session.access_token,
    onConnect: () => updateStatus('connect'),
    onDisconnect: (e) => updateStatus('disconnect', e),
    onError: (e) => updateStatus('closed_with_error', e),
    onClose: () => updateStatus('clean_close'),
    onReconnect: (...args) => updateStatus('reconnect', ...args),
    onNoReconnect: () => updateStatus('noreconnect'),
    onOrderUpdate: (trade) => orderUpdate(trade)
  })

  if (req.body?.test_trade) {
    orderUpdate(testPayload, true)// eslint-disable-line
  }

  res.json({ mirrorUrl: SIGNALX_MIRROR_URL, userType: SIGNALX_MIRROR_USER_TYPE })
})

const testPayload = {
  unfilled_quantity: 0,
  checksum: '',
  parent_order_id: null,
  status: 'COMPLETE',
  status_message: null,
  status_message_raw: null,
  order_timestamp: '2021-06-16 10:01:12',
  exchange_update_timestamp: '2021-06-16 10:01:12',
  exchange_timestamp: '2021-06-16 10:01:12',
  variety: 'regular',
  exchange: 'NFO',
  tradingsymbol: 'BANKNIFTY21JUN40000CE',
  instrument_token: 11247618,
  order_type: 'MARKET',
  transaction_type: 'BUY',
  validity: 'DAY',
  product: 'MIS',
  quantity: 25,
  disclosed_quantity: 0,
  price: 0,
  trigger_price: 0,
  average_price: 178.72083332999998,
  filled_quantity: 25,
  pending_quantity: 0,
  cancelled_quantity: 0,
  market_protection: 0,
  tag: null,
  _createdOn: '2021-06-16T04:31:13.195Z'
}
