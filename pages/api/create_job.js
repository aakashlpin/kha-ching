require('../../lib/queue-processor');

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

import { STRATEGIES } from '../../lib/constants';
import queues from '../../lib/queue';
import withSession from '../../lib/session';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const {
    instruments,
    lots,
    maxSkewPercent,
    slmPercent,
    runAt,
    expireIfUnsuccessfulInMins
  } = req.body;

  console.log('create job request', req.body);

  const queueRes = await queues.tradingQueue.add(
    {
      strategy: STRATEGIES.ATM_STRADDLE,
      instruments,
      lots,
      maxSkewPercent,
      slmPercent,
      user,
      expiresAt: dayjs(runAt).add(expireIfUnsuccessfulInMins, 'minutes').utc().format()
    },
    {
      delay: dayjs(runAt).subtract(dayjs()).get('milliseconds')
    }
  );

  console.log('create job response', queueRes);

  res.json(queueRes);
});
