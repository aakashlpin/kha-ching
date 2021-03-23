import { Worker } from 'bullmq';

import { EXIT_STRATEGIES } from '../constants';
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders';
import { EXIT_TRADING_Q_NAME, redisConnection } from '../queue';

function processJob(jobData) {
  const {
    initialJobData,
    jobResponse: { rawKiteOrdersResponse }
  } = jobData;

  const { exitStrategy } = initialJobData;
  switch (exitStrategy) {
    case EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X: {
      return individualLegExitOrders({
        type: 'BUY',
        quantityMultiplier: 1,
        initialJobData,
        rawKiteOrdersResponse
      });
    }
    case EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_2X: {
      return individualLegExitOrders({
        type: 'BUY',
        quantityMultiplier: 2,
        initialJobData,
        rawKiteOrdersResponse
      });
    }
    case EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD: {
      return null;
    }
    default: {
      return null;
    }
  }
}

const worker = new Worker(EXIT_TRADING_Q_NAME, async (job) => processJob(job.data), {
  connection: redisConnection
});

worker.on('completed', (job) => {
  const { id, name, data, returnvalue } = job;
  console.log('// job has completed', { id, name, data, returnvalue });
});

worker.on('failed', (job) => {
  const { id, name, data, attemptsMade } = job;
  console.log('// job has failed', { id, name, data, attemptsMade });
});
