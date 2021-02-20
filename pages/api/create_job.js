import dayjs from 'dayjs';
import { KiteConnect } from 'kiteconnect';

import queues from '../../lib/queue';
import withSession from '../../lib/session';

const kc = new KiteConnect({
  api_key: process.env.KITE_API_KEY
});

// TODO: init the queue processor function here

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const { instruments, lots } = req.body;

  const day = dayjs();
  const dayOfMonth = day.format('D');
  const month = day.format('M');
  // const dayOfWeek = day.format('d');

  const queueRes = await queues.tradingQueue.add(
    '12:30 ATM straddle',
    {
      strategy: 'ATM_STRADDLE',
      instruments,
      lots,
      user
    },
    {
      repeat: {
        cron: `29 12 ${dayOfMonth} ${month} *`,
        tz: 'Asia/Kolkata',
        limit: 1
      }
    }
  );

  res.json(queueRes);
});
