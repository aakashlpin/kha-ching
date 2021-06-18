import axios from 'axios';
import { KiteTicker } from 'kiteconnect';

import withSession from '../../lib/session';

const apiKey = process.env.KITE_API_KEY;

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).end();
  }

  const ticker = new KiteTicker({
    api_key: apiKey,
    access_token: user?.session?.access_token
  });

  function onTicks(ticks) {
    console.log('Ticks', ticks);
  }

  function subscribe() {
    console.log('connected!');
    // var items = [738561];
    // ticker.subscribe(items);
    // ticker.setMode(ticker.modeFull, items);
  }

  function orderUpdate(trade) {
    console.log(trade);
    axios.post(`${process.env.TRADES_HOST_URL}`, trade);
  }

  ticker.connect();
  ticker.on('ticks', onTicks);
  ticker.on('connect', subscribe);

  ticker.on('order_update', orderUpdate);
});
