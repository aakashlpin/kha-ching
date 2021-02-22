/* eslint-disable no-undef */
import { STRATEGIES } from '../constants';
import queue from '../queue';
import atmStraddle from '../strategies/atmStraddle';

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
