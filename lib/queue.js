import { Queue, QueueScheduler } from 'bullmq';
import dayjs from 'dayjs';
import IORedis from 'ioredis';

import console from './logging';
import {
  getEntryAttemptsCount,
  getExitAttemptsCount,
  getMisOrderLastSquareOffTime,
  getRetryBackoffDelayMs
} from './utils';

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false;

const redisUrl = process.env.REDIS_URL;
export const TRADING_Q_NAME = 'tradingQueue';
export const EXIT_TRADING_Q_NAME = 'exitTradingQueue';
export const AUTO_SQUARE_OFF_Q_NAME = 'autoSquareOffQueue';
export const redisConnection = new IORedis(redisUrl);
const queueOptions = {
  connection: redisConnection
};
export const tradingQueueScheduler = new QueueScheduler(TRADING_Q_NAME, queueOptions);
export const tradingQueue = new Queue(TRADING_Q_NAME, queueOptions);
export const exitTradesQueueScheduler = new QueueScheduler(EXIT_TRADING_Q_NAME, queueOptions);
export const exitTradesQueue = new Queue(EXIT_TRADING_Q_NAME, queueOptions);
export const autoSquareOffQueueScheduler = new QueueScheduler(AUTO_SQUARE_OFF_Q_NAME, queueOptions);
export const autoSquareOffQueue = new Queue(AUTO_SQUARE_OFF_Q_NAME, queueOptions);

export async function addToNextQueue(jobData, jobResponse) {
  try {
    switch (jobResponse.__nextTradingQueue) {
      case EXIT_TRADING_Q_NAME: {
        console.log('Adding job to exit trade queue', jobData);
        return exitTradesQueue.add(
          `${EXIT_TRADING_Q_NAME}_${jobData.strategy}_${new Date().getTime()}`,
          {
            initialJobData: jobData,
            jobResponse
          },
          {
            attempts: getExitAttemptsCount({ exitStrategy: jobData.exitStrategy }),
            backoff: {
              type: 'fixed',
              delay: getRetryBackoffDelayMs({ exitStrategy: jobData.exitStrategy })
            }
          }
        );
      }
      case TRADING_Q_NAME: {
        const queueOptions = {};
        const { strategy, runNow, runAt } = jobData;
        const maxEntryAttempts = getEntryAttemptsCount({ strategy });
        if (maxEntryAttempts) {
          queueOptions.attempts = maxEntryAttempts;
          // NOTE:this backoff stragey only makes sense for DOS
          // however given no other strat depends on this yet, letting this be here instead of it being a config param
          queueOptions.backoff = {
            type: 'backOffToNearest5thMinute'
          };
        }

        if (!runNow) {
          const delay = dayjs(runAt).diff(dayjs());
          console.log(`queueOptions.delay == ${Math.ceil(delay / 60000)} mins`);
          queueOptions.delay = delay;
        }

        return tradingQueue.add(
          `${TRADING_Q_NAME}_${jobData.strategy}_${jobData.instrument}_${new Date().getTime()}`,
          jobData,
          queueOptions
        );
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

export async function addToAutoSquareOffQueue({ initialJobData, jobResponse }) {
  const {
    autoSquareOffProps: { time, deletePendingOrders },
    strategy
  } = initialJobData;
  const { rawKiteOrdersResponse } = jobResponse;
  const finalOrderTime = getMisOrderLastSquareOffTime();
  const runAtTime = MOCK_ORDERS
    ? time
    : dayjs(time).isAfter(dayjs(finalOrderTime))
    ? finalOrderTime
    : time;

  const delay = dayjs(runAtTime).diff(dayjs());
  console.log(`>>> auto square off scheduled for ${Math.ceil(delay / 60000)} minutes from now`);
  return autoSquareOffQueue.add(
    `${AUTO_SQUARE_OFF_Q_NAME}_${strategy}_${new Date().getTime()}`,
    {
      rawKiteOrdersResponse,
      deletePendingOrders,
      initialJobData
    },
    {
      delay
    }
  );
}
