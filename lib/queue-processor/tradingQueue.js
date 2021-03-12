import { Worker } from 'bullmq';

import { STRATEGIES } from '../constants';
import queue from '../queue';
import atmStraddle from '../strategies/atmStraddle';
import multiLegPremium from '../strategies/multiLegPremium';
import wedThurs from '../strategies/wedThurs';

async function processJob(job) {
  const {
    data: { strategy, instruments, ...otherJobProps }
  } = job;
  switch (strategy) {
    case STRATEGIES.ATM_STRADDLE: {
      await Promise.all(
        instruments.map((instrument) =>
          atmStraddle({
            instrument,
            ...otherJobProps
          })
        )
      );
      break;
    }
    case STRATEGIES.CM_WED_THURS: {
      await Promise.all(
        instruments.map((instrument) =>
          wedThurs({
            instrument,
            ...otherJobProps
          })
        )
      );
      break;
    }
    case STRATEGIES.MULTI_LEG_PREMIUM: {
      await multiLegPremium(job.data);
      break;
    }
    default: {
      Promise.resolve();
    }
  }
}

new Worker(
  'tradingQueue',
  async (job) => {
    console.log('processing', job.data);
    await processJob(job);
  },
  {
    connection: queue.redisConnection
  }
);
