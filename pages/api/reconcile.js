import axios from 'axios';
import dayjs from 'dayjs';
import { uniq } from 'lodash';

import { STRATEGIES } from '../../lib/constants';
import withSession from '../../lib/session';
import { SIGNALX_AXIOS_DB_AUTH, syncGetKiteInstance, withoutFwdSlash } from '../../lib/utils';

const { DATABASE_HOST_URL, DATABASE_USER_KEY, DATABASE_API_KEY } = process.env;

/**
 *
 * this api can accept plan id or internal order id
 *
 * and should be able to return {
 *    margin: 1000000,
 *    loss_range: [34000,54000],
 *    win_range: [1000,20000],
 *    pop: 6.5,
 * }
 */

export default withSession(async (req, res) => {
  // https://db.signalx.trade/day_kt3d3p6gel2j3i17/15072021
  const date = dayjs().format('DDMMYYYY');
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  if (req.method === 'PUT') {
    const { orderId, orderTag } = req.body;
    const dbUrl = `${withoutFwdSlash(
      DATABASE_HOST_URL
    )}/odr_${DATABASE_USER_KEY}?q=order_id:${orderId}`;
    const { data } = await axios(dbUrl);
    const [order] = data;
    const updatedOrder = {
      ...order,
      tag: orderTag
    };

    const { data: updatedRes } = await axios.put(
      `${withoutFwdSlash(DATABASE_HOST_URL)}/odr_${DATABASE_USER_KEY}/${updatedOrder._id}`,
      updatedOrder,
      SIGNALX_AXIOS_DB_AUTH
    );

    return res.json(updatedRes);
  }

  const kite = syncGetKiteInstance(user);
  const orders = await kite.getOrders();

  const allTags = uniq(orders.map((order) => order.tag).filter((o) => o));

  const dbOrdersUrl = `${withoutFwdSlash(
    DATABASE_HOST_URL
  )}/odr_${DATABASE_USER_KEY}?limit=200&q=${allTags.map((tag) => `tag:${tag}`).join(',')}`;
  console.log({ dbOrdersUrl });
  const { data: dbOrders } = await axios(dbOrdersUrl);

  const dayTrades = `${withoutFwdSlash(DATABASE_HOST_URL)}/day_${DATABASE_USER_KEY}/${date}`;
  const { data: trades } = await axios(dayTrades);

  return res.json({ orders, trades, dbOrders });
});
