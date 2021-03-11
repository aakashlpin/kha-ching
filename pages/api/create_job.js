require('../../lib/queue-processor');

import dayjs from 'dayjs';

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
    runNow,
    expireIfUnsuccessfulInMins,
    strategy
  } = req.body;

  console.log('create job request', req.body);

  const queueOptions = runNow
    ? {}
    : {
        delay: dayjs(runAt).diff(dayjs(), 'milliseconds')
      };

  const queueRes = await queues.tradingQueue.add(
    `${strategy}_${dayjs().format()}`,
    {
      strategy,
      instruments,
      lots,
      maxSkewPercent,
      slmPercent,
      user,
      runAt,
      runNow,
      expiresAt: dayjs(runAt).add(expireIfUnsuccessfulInMins, 'minutes').format()
    },
    queueOptions
  );

  console.log('create job response', queueRes.name, queueRes.data);

  res.json(queueRes);
});
