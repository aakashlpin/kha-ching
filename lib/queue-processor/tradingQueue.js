import { Worker } from 'bullmq';
import dayjs from 'dayjs';

import { STRATEGIES } from '../constants';
import { addToAutoSquareOffQueue, addToNextQueue, redisConnection, TRADING_Q_NAME } from '../queue';
import atmStraddle from '../strategies/atmStraddle';
import directionalOptionSelling from '../strategies/directionalOptionSelling';
import wedThurs from '../strategies/wedThurs';
import { getDateTimeInIST, getNextNthMinute } from '../utils';

async function processJob(job) {
  const {
    data,
    data: { strategy }
  } = job;
  switch (strategy) {
    case STRATEGIES.ATM_STRADDLE: {
      return atmStraddle(data);
    }
    case STRATEGIES.CM_WED_THURS: {
      return wedThurs(data);
    }
    case STRATEGIES.DIRECTIONAL_OPTION_SELLING: {
      return directionalOptionSelling(data);
    }
    default: {
      return null;
    }
  }
}

const worker = new Worker(
  TRADING_Q_NAME,
  async (job) => {
    console.log(`processing tradingQueue id ${job.id}`, job.data);
    const result = await processJob(job);
    console.log(`successfully processed tradingQueue id ${job.id}`, result);
    const { isAutoSquareOffEnabled, strategy } = job.data;
    // can't enable auto square off for DOS
    // because we don't know upfront how many orders would get punched
    if (strategy !== STRATEGIES.DIRECTIONAL_OPTION_SELLING && isAutoSquareOffEnabled) {
      try {
        console.log('enabling auto square off...');
        const asoResponse = await addToAutoSquareOffQueue({
          initialJobData: job.data,
          jobResponse: result
        });
        const { data, name } = asoResponse;
        console.log('🟢 success enable auto square off', { data, name });
      } catch (e) {
        console.log('🔴 failed to enable auto square off', e);
      }
    }
    return result;
  },
  {
    connection: redisConnection,
    concurrency: 20,
    settings: {
      backoffStrategies: {
        backOffToNearest5thMinute() {
          return dayjs(getNextNthMinute(5 * 60 * 1000)).diff(dayjs(getDateTimeInIST()));
        }
      }
    }
  }
);

worker.on('completed', async (job) => {
  // job has completed
  console.log('inside worker completed event');
  const { data, returnvalue } = job;
  try {
    if (job.returnvalue?.__nextTradingQueue) {
      await addToNextQueue(data, returnvalue);
    }
  } catch (e) {
    console.log('job return value', job.returnvalue);
    console.log('failed inside trading queue worked completed event!', e);
  }
});
