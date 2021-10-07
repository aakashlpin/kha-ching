import { Queue, QueueScheduler, JobsOptions, Job } from 'bullmq'
import dayjs from 'dayjs'
import IORedis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import { pick } from 'lodash'
import { SUPPORTED_TRADE_CONFIG } from '../types/trade'

import console from './logging'
import {
  getBackoffStrategy,
  getDbTrade,
  getEntryAttemptsCount,
  getMisOrderLastSquareOffTime,
  getQueueOptionsForExitStrategy,
  getTimeLeftInMarketClosingMs,
  isMockOrder,
  ms,
  patchDbTrade
} from './utils'

const redisUrl = `${process.env
  .REDIS_URL as string}?enableReadyCheck=false&maxRetriesPerRequest=null`

const SIGNALX_API_KEY = process.env.SIGNALX_API_KEY ?? ''
const KITE_API_KEY = process.env.KITE_API_KEY ?? ''

// just a hack to ensure if someone left a placeholder in env variables
const QID = SIGNALX_API_KEY.length === 16 ? SIGNALX_API_KEY : KITE_API_KEY
export const TRADING_Q_NAME = `tradingQueue_${QID}`
export const EXIT_TRADING_Q_NAME = `exitTradingQueue_${QID}`
export const AUTO_SQUARE_OFF_Q_NAME = `autoSquareOffQueue_${QID}`
export const WATCHER_Q_NAME = `watcherQueue_${QID}`
export const ANCILLARY_Q_NAME = `ancillaryQueue_${QID}`
export const redisConnection = new IORedis(redisUrl)
const queueOptions = {
  connection: redisConnection
}
const schedulerQueueOptions = {
  ...queueOptions,
  // prevent jobs from being double processed even if they're stalled
  maxStalledCount: 0
}

export const tradingQueueScheduler = new QueueScheduler(
  TRADING_Q_NAME,
  schedulerQueueOptions
)
export const tradingQueue = new Queue(TRADING_Q_NAME, queueOptions)
export const exitTradesQueueScheduler = new QueueScheduler(
  EXIT_TRADING_Q_NAME,
  schedulerQueueOptions
)
export const exitTradesQueue = new Queue(EXIT_TRADING_Q_NAME, queueOptions)
export const autoSquareOffQueueScheduler = new QueueScheduler(
  AUTO_SQUARE_OFF_Q_NAME,
  schedulerQueueOptions
)
export const autoSquareOffQueue = new Queue(
  AUTO_SQUARE_OFF_Q_NAME,
  queueOptions
)
export const watcherQueueScheduler = new QueueScheduler(
  WATCHER_Q_NAME,
  schedulerQueueOptions
)
export const watcherQueue = new Queue(WATCHER_Q_NAME, queueOptions)
export const ancillaryQueueScheduler = new QueueScheduler(
  ANCILLARY_Q_NAME,
  schedulerQueueOptions
)
export const ancillaryQueue = new Queue(ANCILLARY_Q_NAME, queueOptions)

const allQueues = [
  tradingQueue,
  exitTradesQueue,
  autoSquareOffQueue,
  watcherQueue,
  ancillaryQueue
]

const updateTradeQueuesArray = async (tradeDbId: string, qRes: Job | undefined, _nextTradingQueue: string) => {
  if (!qRes) return;
  const dbData: Partial<SUPPORTED_TRADE_CONFIG> = await getDbTrade({ _id: tradeDbId });
  const { queuesArray = [] } = dbData;
  if (queuesArray && queuesArray.length) {
    queuesArray[queuesArray.length - 1] = {
      ...queuesArray[queuesArray.length - 1],
      isProcessed: true
    }
  }
  const patchProps = {
    queuesArray: [
      ...queuesArray,
      {
        ...pick(qRes, [
          'id',
          'name',
          'opts',
          'timestamp',
          'stacktrace',
          'returnvalue'
        ]),
        isProcessed: false,
        _nextTradingQueue
      }
    ]
  }

  await patchDbTrade({ _id: tradeDbId, patchProps })
}

export async function addToNextQueue(
  jobData: Partial<SUPPORTED_TRADE_CONFIG>,
  jobResponse,
  tradeId?: string
): Promise<Job | undefined> {
  try {
    let qRes: Promise<Job | undefined>;
    let qResResolved: Job | undefined;
    if (tradeId) {
      jobData = await getDbTrade({ _id: tradeId })
    }
    switch (jobResponse._nextTradingQueue) {
      case ANCILLARY_Q_NAME: {
        // console.log('Adding job to ancillary queue', jobData, jobResponse)
        const marketClosing = dayjs()
          .set('hours', 15)
          .set('minutes', 30)
          .set('seconds', 0)
        qRes = ancillaryQueue.add(
          `${ANCILLARY_Q_NAME}_${uuidv4() as string}`,
          {
            initialJobData: jobData,
            jobResponse
          },
          {
            delay: marketClosing.diff(dayjs())
          }
        )
        break
      }

      case WATCHER_Q_NAME: {
        // console.log('Adding job to watcher queue', jobData, jobResponse)
        qRes = watcherQueue.add(
          `${WATCHER_Q_NAME}_${uuidv4() as string}`,
          {
            initialJobData: jobData,
            jobResponse
          },
          {
            attempts: Math.ceil(getTimeLeftInMarketClosingMs() / ms(5)),
            backoff: {
              type: 'fixed',
              delay: ms(5)
            }
          }
        )
        break
      }

      case EXIT_TRADING_Q_NAME: {
        // console.log('Adding job to exit trade queue', jobData)
        const queueOptions = getQueueOptionsForExitStrategy(
          jobData.exitStrategy
        )
        qRes = exitTradesQueue.add(
          `${EXIT_TRADING_Q_NAME}_${uuidv4() as string}`,
          {
            initialJobData: jobData,
            jobResponse
          },
          queueOptions
        )
        break
      }
      case TRADING_Q_NAME: {
        const queueOptions: JobsOptions = {}
        const { strategy, runNow, runAt } = jobData
        const maxEntryAttempts = getEntryAttemptsCount({ strategy })
        if (maxEntryAttempts) {
          queueOptions.attempts = maxEntryAttempts
          queueOptions.backoff = {
            type: getBackoffStrategy({ strategy })
          }
        }

        if (!runNow) {
          const delay = dayjs(runAt).diff(dayjs())
          // console.log(`queueOptions.delay == ${Math.ceil(delay / 60000)} mins`)
          queueOptions.delay = delay
        }

        qRes = tradingQueue.add(
          `${TRADING_Q_NAME}_${uuidv4() as string}`,
          jobData,
          queueOptions
        )
        break
      }

      default: {
        qRes = Promise.resolve(undefined)
        break
      }
    }
    qResResolved = await qRes;
    await updateTradeQueuesArray(jobData._id!, qResResolved, jobResponse._nextTradingQueue);
    return qResResolved;
  } catch (e) {
    console.log('addToNextQueue error')
    console.log(e)
  }
}

export async function addToAutoSquareOffQueue({
  initialJobData,
  jobResponse
}) {
  const {
    autoSquareOffProps: { time, deletePendingOrders }
  } = initialJobData
  const { rawKiteOrdersResponse, squareOffOrders } = jobResponse
  const finalOrderTime = getMisOrderLastSquareOffTime()
  const runAtTime = isMockOrder()
    ? time
    : dayjs(time).isAfter(dayjs(finalOrderTime))
      ? finalOrderTime
      : time

  const delay = dayjs(runAtTime).diff(dayjs())
  // console.log(`>>> auto square off scheduled for ${Math.ceil(delay / 60000)} minutes from now`)
  return autoSquareOffQueue.add(
    `${AUTO_SQUARE_OFF_Q_NAME}_${uuidv4() as string}`,
    {
      rawKiteOrdersResponse: squareOffOrders || rawKiteOrdersResponse,
      deletePendingOrders,
      initialJobData
    },
    {
      delay
    }
  )
}

export const cleanupQueues = async () =>
  await Promise.all(allQueues.map(async queue => await queue.obliterate()))
