import { STRATEGIES } from '../constants';
import queue from '../queue';
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

(() => {
  console.log('hello from tradingQueue!');
  queue.tradingQueue.process(async (job) => {
    console.log(`Init tradingQueue job# ${job.id}...`);
    await processJob(job);
  });
})();
