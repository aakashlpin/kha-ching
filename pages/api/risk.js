import axios from 'axios';

import { STRATEGIES } from '../../lib/constants';
import { withoutFwdSlash } from '../../lib/utils';

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

export default async function getRisk(req, res) {
  const { plan_id, trade_id } = req.query;
  if (plan_id && trade_id && !(plan_id && trade_id)) {
    return res.status(400).json({ error: 'Send either plan_id or trade_id' });
  }

  const baseUrl = `${withoutFwdSlash(DATABASE_HOST_URL)}/set_${DATABASE_USER_KEY}`;

  if (plan_id) {
    const { data: plan } = await axios(`${baseUrl}/${plan_id}`);
    if (!plan) {
      return res.status(400).json({ error: 'plan not found' });
    }

    const { strategy, instrument, lots, slmPercent } = plan;
    switch (strategy) {
      case STRATEGIES.ATM_STRADDLE: {
      }
    }

    return res.json(plan);
  }
}
