import axios from 'axios';
import dayjs from 'dayjs';
import { pick } from 'lodash';

import { tradingQueue } from '../../lib/queue';
const { DATABASE_HOST_URL, DATABASE_USER_KEY, DATABASE_API_KEY } = process.env;

import { EXIT_STRATEGIES, STRATEGIES_DETAILS } from '../../lib/constants';
import console from '../../lib/logging';
import { addToNextQueue, TRADING_Q_NAME } from '../../lib/queue';
import withSession from '../../lib/session';
import { isMarketOpen } from '../../lib/utils';

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

async function createJob({ jobData, user }) {
  const {
    runAt,
    runNow,
    strategy,
    exitStrategy,
    squareOffTime,
    expireIfUnsuccessfulInMins
  } = jobData;

  if (STRATEGIES_DETAILS[strategy].premium && !process.env.SIGNALX_API_KEY?.length) {
    return Promise.reject('You need SignalX Premium to use this strategy.');
  }

  if (!MOCK_ORDERS && runNow && !isMarketOpen()) {
    return Promise.reject('Exchange is offline right now.');
  }

  if (!MOCK_ORDERS && !runNow && runAt && !isMarketOpen(dayjs(runAt))) {
    return Promise.reject('Exchange would be offline at the scheduled time.');
  }

  const qRes = addToNextQueue(
    {
      ...jobData,
      user,
      autoSquareOffProps: squareOffTime
        ? {
            time: squareOffTime,
            deletePendingOrders: exitStrategy !== EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
          }
        : null,
      expiresAt: expireIfUnsuccessfulInMins
        ? dayjs(runNow ? new Date() : runAt)
            .add(expireIfUnsuccessfulInMins, 'minutes')
            .format()
        : null
    },
    {
      __nextTradingQueue: TRADING_Q_NAME
    }
  );

  return qRes;
}

async function deleteJob(id) {
  try {
    if (id.includes('repeat')) {
      await tradingQueue.removeRepeatableByKey(id);
    } else {
      const job = await tradingQueue.getJob(id);
      await job.remove();
    }
  } catch (e) {
    console.log('[deleteJob] failed', e);
    return Promise.reject(e);
  }
}

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).end();
  }

  const urlDateParam = dayjs().format('DDMMYYYY');
  const endpoint = `${DATABASE_HOST_URL}/day_${DATABASE_USER_KEY}/${urlDateParam}`;

  console.log({ dailyTradesEndpoint: endpoint });

  const SIGNALX_AXIOS_DB_AUTH = {
    headers: {
      'x-api-key': DATABASE_API_KEY
    }
  };

  if (req.method === 'POST') {
    const { data } = await axios[req.method.toLowerCase()](
      endpoint,
      req.body,
      SIGNALX_AXIOS_DB_AUTH
    );

    try {
      const qRes = await createJob({
        jobData: data,
        user
      });
      await axios.put(
        `${endpoint}/${data._id}`,
        {
          ...data,
          status: 'QUEUE',
          queue: pick(qRes, ['id', 'name', 'opts', 'timestamp', 'stacktrace', 'returnvalue'])
        },
        SIGNALX_AXIOS_DB_AUTH
      );
      return res.json(data);
    } catch (e) {
      await axios.put(
        `${endpoint}/${data._id}`,
        {
          ...data,
          status: 'REJECT',
          status_message: e
        },
        SIGNALX_AXIOS_DB_AUTH
      );

      return res.json(data);
    }
  }

  if (req.method === 'DELETE') {
    const { data } = await axios(`${endpoint}/${req.body._id}`);
    if (data.queue.id) {
      await deleteJob(data.queue.id);
    }
    await axios.delete(`${endpoint}/${req.body._id}`, SIGNALX_AXIOS_DB_AUTH);
    return res.end();
  }

  if (req.method === 'GET') {
    const { data } = await axios(endpoint);
    return res.json(data);
  }

  res.status(400).end();
});
