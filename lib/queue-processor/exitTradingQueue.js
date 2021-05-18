import { Worker } from 'bullmq';
import dayjs from 'dayjs';

import { EXIT_STRATEGIES } from '../constants';
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders';
import minXPercentOrSupertrend from '../exit-strategies/minXPercentOrSupertrend';
import multiLegPremiumThreshold from '../exit-strategies/multiLegPremiumThreshold';
import console from '../logging';
import { EXIT_TRADING_Q_NAME, redisConnection } from '../queue';
import { getNextNthMinute } from '../utils';

function processJob(jobData) {
  const { initialJobData, jobResponse } = jobData;

  const { exitStrategy } = initialJobData;
  switch (exitStrategy) {
    case EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X: {
      return individualLegExitOrders({
        initialJobData,
        ...jobResponse
      });
    }
    case EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_2X: {
      return individualLegExitOrders({
        quantityMultiplier: 2,
        initialJobData,
        ...jobResponse
      });
    }
    case EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD: {
      return multiLegPremiumThreshold({
        initialJobData,
        ...jobResponse
      });
    }
    case EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND: {
      return minXPercentOrSupertrend({
        initialJobData,
        ...jobResponse
      });
    }
    default: {
      return null;
    }
  }
}

const worker = new Worker(EXIT_TRADING_Q_NAME, async (job) => processJob(job.data), {
  connection: redisConnection,
  concurrency: 20,
  settings: {
    backoffStrategies: {
      backOffToNearest5thMinute() {
        return dayjs(getNextNthMinute(5 * 60 * 1000)).diff(dayjs());
      }
    }
  }
});

worker.on('completed', (job) => {
  const { id, name } = job;
  console.log('// job has completed', { id, name });
});

worker.on('failed', (job) => {
  try {
    const { id, name, data, attemptsMade, returnvalue } = job;
    const { initialJobData, jobResponse } = data;
    console.log('// job has failed', {
      id,
      name,
      initialJobData,
      jobResponse,
      returnvalue,
      attemptsMade
    });
  } catch (e) {
    //
  }
});
