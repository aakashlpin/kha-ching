import axios from 'axios';
import { KiteConnect } from 'kiteconnect';

import withSession from '../../lib/session';
import { useKiteTicker } from '../../lib/socket/ticker';
const apiKey = process.env.KITE_API_KEY;

// Giveaway to the publisher
// 1. SIGNALX_MIRROR_URL=SHARED_PRIVATE_URL
// 2. TRADES_HOST_URL - the trades received via webhook
// 3. SIGNALX_MIRROR_USER_TYPE=PUBLISHER

// Giveaway to the consumer
// 1. SIGNALX_MIRROR_URL=SHARED_PRIVATE_URL
// 2. TRADES_HOST_URL - the trades actually punched on his account
// 3. SIGNALX_MIRROR_USER_TYPE=CONSUMER

const { SIGNALX_MIRROR_URL, TRADES_HOST_URL, SIGNALX_MIRROR_USER_TYPE } = process.env;

async function updateStatus(statusCode, ...params) {
  console.log(statusCode, ...params);
  try {
    const {
      data: { status_history = [], ...props }
    } = await axios(SIGNALX_MIRROR_URL);

    await axios.put(SIGNALX_MIRROR_URL, {
      ...props,
      connected: statusCode === 'connect',
      status_history: [
        {
          status_code: statusCode,
          // status_args: params || null,
          timestamp: new Date()
        },
        ...status_history
      ]
    });
  } catch (e) {
    console.log('[updateStatus] error', e);
  }
}

async function orderUpdate(trade, kc) {
  try {
    axios.post(TRADES_HOST_URL, trade);

    if (SIGNALX_MIRROR_USER_TYPE !== 'PUBLISHER') {
      return;
    }

    const {
      variety,
      exchange,
      status,
      // instrument_token,
      tradingsymbol,
      transaction_type,
      validity,
      product,
      quantity
    } = trade;

    if (status !== kc.STATUS_COMPLETE) {
      return;
    }

    const orderRes = await kc.placeOrder(variety, {
      tradingsymbol,
      quantity,
      exchange,
      transaction_type,
      order_type: kc.ORDER_TYPE_MARKET,
      product: product,
      validity
    });

    console.log(orderRes);
  } catch (e) {
    console.log('[orderUpdate] error', e);
  }
}

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const { data: subscribersDetails } = await axios(SIGNALX_MIRROR_URL);
  const { api_key: subscriberApiKey, access_token: subscriberAccessToken } = subscribersDetails;

  if (SIGNALX_MIRROR_USER_TYPE === 'PUBLISHER' && !(subscriberApiKey && subscriberAccessToken)) {
    return res.status(400).send('No subscriber!');
  }

  const subscribersKiteConnect = new KiteConnect({
    api_key: subscriberApiKey,
    access_token: subscriberAccessToken
  });

  useKiteTicker({
    apiKey,
    accessToken: user.session.access_token,
    onConnect: () => updateStatus('connect'),
    onDisconnect: (e) => updateStatus('disconnect', e),
    onError: (e) => updateStatus('closed_with_error', e),
    onClose: () => updateStatus('clean_close'),
    onReconnect: (...args) => updateStatus('reconnect', ...args),
    onNoReconnect: () => updateStatus('noreconnect'),
    onOrderUpdate: (trade) => orderUpdate(trade, subscribersKiteConnect)
  });

  res.json({ mirrorUrl: SIGNALX_MIRROR_URL, userType: SIGNALX_MIRROR_USER_TYPE });
});
