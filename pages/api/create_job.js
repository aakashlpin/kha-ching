require('../../lib/queue-processor');

import dayjs from 'dayjs';

import { STRATEGIES } from '../../lib/constants';
import queues from '../../lib/queue';
import withSession from '../../lib/session';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const { instruments, lots, maxSkewPercent, slmPercent } = req.body;

  // NB: adding 2 mins only for local testing
  // REMOVE IT BEFORE PUSHING TO PROD
  const day = dayjs().add('2', 'minutes');
  const hour = day.format('H');
  const minute = day.format('m');
  const dayOfMonth = day.format('D');
  const month = day.format('M');
  // const dayOfWeek = day.format('d');

  const queueRes = await queues.tradingQueue.add(
    {
      strategy: STRATEGIES.ATM_STRADDLE,
      instruments,
      lots,
      maxSkewPercent,
      slmPercent,
      user
    },
    {
      repeat: {
        cron: `${minute} ${hour} ${dayOfMonth} ${month} *`,
        tz: 'Asia/Kolkata',
        limit: 1
      }
    }
  );

  res.json(queueRes);
});
