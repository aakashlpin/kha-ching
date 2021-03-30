import { Queue, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';

import { EXIT_STRATEGIES, MAX_MIS_ORDER_DURATION_SECONDS } from './constants';

const redisUrl = process.env.REDIS_URL;
export const TRADING_Q_NAME = 'tradingQueue';
export const EXIT_TRADING_Q_NAME = 'exitTradingQueue';
export const redisConnection = new IORedis(redisUrl);
const queueOptions = {
  connection: redisConnection
};
export const tradingQueueScheduler = new QueueScheduler(TRADING_Q_NAME, queueOptions);
export const tradingQueue = new Queue(TRADING_Q_NAME, queueOptions);
export const exitTradesQueueScheduler = new QueueScheduler(EXIT_TRADING_Q_NAME, queueOptions);
export const exitTradesQueue = new Queue(EXIT_TRADING_Q_NAME, queueOptions);

const ms = (seconds) => seconds * 1000;
const CHECK_EVERY_MS = ms(3);

export async function addToNextQueue(jobData, jobResponse) {
  try {
    switch (jobResponse.__nextTradingQueue) {
      case EXIT_TRADING_Q_NAME: {
        console.log('Adding job to exit trade queue', jobData);
        exitTradesQueue.add(
          `${EXIT_TRADING_Q_NAME}_${jobData.strategy}_${new Date().getTime()}`,
          {
            initialJobData: jobData,
            jobResponse
          },
          {
            attempts:
              jobData.exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
                ? Math.ceil(ms(MAX_MIS_ORDER_DURATION_SECONDS) / CHECK_EVERY_MS)
                : 20,
            backoff: {
              type: 'fixed',
              delay: CHECK_EVERY_MS
            }
          }
        );
        break;
      }
      default: {
        break;
      }
    }
  } catch (e) {
    console.log('addToNextQueue error');
    console.log(e);
  }
}
