import { Worker } from 'bullmq';

import { STRATEGIES } from '../constants';
import atmStraddle from '../strategies/atmStraddle';
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
    default: {
      Promise.resolve();
    }
  }
}

new Worker('tradingQueue', async (job) => {
  console.log('processing', job.data);
  await processJob(job);
});
