import { Worker } from 'bullmq'
import { KiteOrder } from '../../types/kite'
import {
  DIRECTIONAL_OPTION_SELLING_TRADE,
  SUPPORTED_TRADE_CONFIG
} from '../../types/trade'

import { EXIT_STRATEGIES } from '../constants'
// import fyersTrailObsSL from '../exit-strategies/fyersTrailObsSL'
import individualLegExitOrders from '../exit-strategies/individualLegExitOrders'
import minXPercentOrSupertrend, {
  DOS_TRAILING_INTERFACE
} from '../exit-strategies/minXPercentOrSupertrend'
import multiLegPremiumThreshold, {
  CombinedPremiumJobDataInterface
} from '../exit-strategies/multiLegPremiumThreshold'
import console from '../logging'
import { EXIT_TRADING_Q_NAME, redisConnection } from '../queue'
import { getCustomBackoffStrategies, ms } from '../utils'

function processJob (jobData: {
  initialJobData: SUPPORTED_TRADE_CONFIG
  jobResponse: {
    rawKiteOrdersResponse: KiteOrder[]
    squareOffOrders?: KiteOrder[]
  }
}) {
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
        initialJobData: initialJobData as CombinedPremiumJobDataInterface,
        ...jobResponse
      })
    }
    case EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND: {
      return minXPercentOrSupertrend({
        initialJobData: initialJobData as DIRECTIONAL_OPTION_SELLING_TRADE,
        ...jobResponse
      } as DOS_TRAILING_INTERFACE)
    }
    // case EXIT_STRATEGIES.OBS_TRAIL_SL: {
    //   return fyersTrailObsSL({
    //     initialJobData,
    //     ...jobResponse
    //   })
    // }
    default: {
      return null
    }
  }
}

const worker = new Worker(
  EXIT_TRADING_Q_NAME,
  async job => {
    try {
      const exitOrders = await processJob(job.data)
      return exitOrders
    } catch (e) {
      // console.log(e.message ? e.message : e)
      throw new Error(e)
    }
  },
  {
    connection: redisConnection,
    concurrency: 100,
    settings: {
      backoffStrategies: getCustomBackoffStrategies()
    },
    lockDuration: ms(5 * 60)
  }
)

worker.on('error', err => {
  // log the error
  console.log('🔴 [exitTradingQueue] worker error', err)
})

worker.on('completed', async job => {
  await job.remove()
  // const { id, name } = job
  // console.log('// job has completed', { id, name })
})

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
