import { Worker } from 'bullmq';

import { EXIT_STRATEGIES } from '../constants';
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders';
import minXPercentOrSupertrend from '../exit-strategies/minXPercentOrSupertrend';
import multiLegPremiumThreshold from '../exit-strategies/multiLegPremiumThreshold';
import { EXIT_TRADING_Q_NAME, redisConnection } from '../queue';
import { logObject } from '../utils';

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
  concurrency: 20
});

worker.on('completed', (job) => {
  const { id, name, data, returnvalue, attemptsMade } = job;
  logObject('// job has completed', { id, name, data, returnvalue, attemptsMade });
});

worker.on('failed', (job) => {
  const { id, name, data, attemptsMade, returnvalue } = job;
  logObject('// job has failed', { id, name, data, returnvalue, attemptsMade });
});
