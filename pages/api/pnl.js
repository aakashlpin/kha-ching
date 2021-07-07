import axios from 'axios';
import dayjs from 'dayjs';
import { uniqBy } from 'lodash';
const advancedFormat = require('dayjs/plugin/advancedFormat');
dayjs.extend(advancedFormat);

import withSession from '../../lib/session';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const { order_tag: orderTag } = req.query;

    if (!orderTag) {
      return res.status(400).json({ error: 'expected orderTag in query' });
    }

    const { data: orders } = await axios(
      `${process.env.DATABASE_HOST_URL}/odr_${process.env.DATABASE_USER_KEY}/${orderTag}`
    );

    if (!orders.length) {
      return res.status(400).json({ error: 'PnL not ready yet!' });
    }

    const uniqueOrders = uniqBy(orders, (order) => order.order_id);
    const completedOrders = uniqueOrders.filter((order) => order.status === 'COMPLETE');
    const taggedOrders = completedOrders.filter((order) => order.tag === orderTag);
    const pnl = taggedOrders.reduce((accum, order) => {
      const { transaction_type, filled_quantity, average_price } = order;
      const transactedAmount = filled_quantity * average_price;
      if (transaction_type === 'BUY') {
        return accum - transactedAmount;
      }
      return accum + transactedAmount;
    }, 0);

    res.json({ pnl });
  } catch (e) {
    res.status(500).send(e);
  }
});
