import { Worker } from 'bullmq'

import { EXIT_STRATEGIES } from '../constants'
import fyersTrailObsSL from '../exit-strategies/fyersTrailObsSL'
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders'
import minXPercentOrSupertrend from '../exit-strategies/minXPercentOrSupertrend'
import multiLegPremiumThreshold from '../exit-strategies/multiLegPremiumThreshold'
import console from '../logging'
import { addToNextQueue, EXIT_TRADING_Q_NAME, redisConnection, WATCHER_Q_NAME } from '../queue'
import { getCustomBackoffStrategies, ms } from '../utils'

function processJob (jobData) {
  const { initialJobData, jobResponse } = jobData

  const { exitStrategy } = initialJobData
  switch (exitStrategy) {
    case EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X: {
      return individualLegExitOrders({
        initialJobData,
        ...jobResponse
      })
    }
    case EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD: {
      return multiLegPremiumThreshold({
        initialJobData,
        ...jobResponse
      })
    }
    case EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND: {
      return minXPercentOrSupertrend({
        initialJobData,
        ...jobResponse
      })
    }
    case EXIT_STRATEGIES.OBS_TRAIL_SL: {
      return fyersTrailObsSL({
        initialJobData,
        ...jobResponse
      })
    }
    default: {
      return null
    }
  }
}

const worker = new Worker(
  EXIT_TRADING_Q_NAME,
  async (job) => {
    try {
      const exitOrders = await processJob(job.data)
      const { exitStrategy } = job.data.initialJobData
      if (exitStrategy === EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X) {
        const watcherQueueJobs = exitOrders.map((exitOrder) => {
          return addToNextQueue(job.data.initialJobData, {
            __nextTradingQueue: WATCHER_Q_NAME,
            rawKiteOrderResponse: exitOrder
          })
        })

        try {
          await Promise.all(watcherQueueJobs)
        } catch (e) {
          console.log('error adding to `watcherQueueJobs`')
          console.log(e.message ? e.message : e)
        }
      }

      return exitOrders
    } catch (e) {
      console.log(e.message ? e.message : e)
      throw new Error(e)
    }
  },
  {
    connection: redisConnection,
    concurrency: 20,
    settings: {
      backoffStrategies: getCustomBackoffStrategies()
    },
    lockDuration: ms(5 * 60)
  }
)

worker.on('error', (err) => {
  // log the error
  console.log('🔴 [exitTradingQueue] worker error', err)
})

// worker.on('completed', (job) => {
//   // const { id, name } = job
//   // console.log('// job has completed', { id, name })
// })

// worker.on('failed', (job) => {
//   try {
//     const { id, name, data, attemptsMade, returnvalue } = job;
//     const { initialJobData, jobResponse } = data;
//     console.log('// job failed/retried', {
//       id,
//       name,
//       initialJobData,
//       jobResponse,
//       returnvalue,
//       attemptsMade
//     });
//   } catch (e) {
//     //
//   }
// });
