import dayjs from 'dayjs';

import { EXIT_STRATEGIES, STRATEGIES } from '../../lib/constants';
import { addToNextQueue, TRADING_Q_NAME } from '../../lib/queue';
import withSession from '../../lib/session';
import { getDateTimeInIST } from '../../lib/utils';

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

  if (strategy === STRATEGIES.DIRECTIONAL_OPTION_SELLING) {
    if (!process.env.SIGNALX_API_KEY?.length) {
      return res.status(401).send('Reserved for Khaching Premium users!');
    }
  }

  console.log('create job request', req.body);

  const addToQueueResponses = await Promise.all(
    instruments.map((instrument) =>
      addToNextQueue(
        {
          ...req.body,
          reqCookies: req.cookies,
          instrument,
          user,
          autoSquareOffProps: {
            time: squareOffTime,
            deletePendingOrders: exitStrategy !== EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
          },
          expiresAt: expireIfUnsuccessfulInMins
            ? dayjs(runNow ? getDateTimeInIST() : runAt)
                .add(expireIfUnsuccessfulInMins, 'minutes')
                .format()
            : null
        },
        {
          __nextTradingQueue: TRADING_Q_NAME
        }
      )
    )
  );

  res.json(addToQueueResponses);
});
