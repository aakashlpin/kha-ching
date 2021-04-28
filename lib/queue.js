import { Queue, QueueScheduler } from 'bullmq';
import dayjs from 'dayjs';
import IORedis from 'ioredis';

import { getMisOrderLastSquareOffTime } from './constants';
import { getExitAttemptsCount, getRetryBackoffDelayMs } from './utils';

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
  const now = new Date().getTime();
  const finalOrderTime = getMisOrderLastSquareOffTime();
  const runAtTime = process.env.MOCK_ORDERS
    ? time
    : dayjs(time).isAfter(dayjs(finalOrderTime))
    ? finalOrderTime
    : time;

  return autoSquareOffQueue.add(
    `${AUTO_SQUARE_OFF_Q_NAME}_${strategy}_${now}`,
    {
      rawKiteOrdersResponse,
      deletePendingOrders,
      initialJobData
    },
    {
      delay: dayjs(runAtTime).diff(dayjs())
    }
  );
}
