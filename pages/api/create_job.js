import dayjs from 'dayjs';

import { EXIT_STRATEGIES } from '../../lib/constants';
import { tradingQueue } from '../../lib/queue';
import withSession from '../../lib/session';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const {
    instruments,
    runAt,
    runNow,
    strategy,
    exitStrategy,
    squareOffTime,
    expireIfUnsuccessfulInMins
  } = req.body;

  console.log('create job request', req.body);

  const queueOptions = runNow
    ? {}
    : {
        delay: dayjs(runAt).diff(dayjs())
      };

  const addToQueueResponses = await Promise.all(
    instruments.map((instrument) =>
      tradingQueue.add(
        `${strategy}_${instrument}_${dayjs().format()}`,
        {
          ...req.body,
          reqCookies: req.cookies,
          instrument,
          user,
          autoSquareOffProps: {
            time: squareOffTime,
            deletePendingOrders: exitStrategy !== EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLDs
          },
          expiresAt: expireIfUnsuccessfulInMins
            ? dayjs(runNow ? new Date() : runAt)
                .add(expireIfUnsuccessfulInMins, 'minutes')
                .format()
            : null
        },
        queueOptions
      )
    )
  );

  res.json(addToQueueResponses);
});
