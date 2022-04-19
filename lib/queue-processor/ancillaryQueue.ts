import { Worker } from 'bullmq'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'

import orderbookSyncByTag from '../ancillary-tasks/orderbookSyncByTag'
import orderbookSync from '../ancillary-tasks/orderbookSync'
import { ANCILLARY_TASKS } from '../constants'
//import console from '../logging'
import logger from '../logger'
import { ANCILLARY_Q_NAME, redisConnection } from '../queue'

function processJob (jobData: { initialJobData: SUPPORTED_TRADE_CONFIG }) {
  const { initialJobData } = jobData

  const { ancillaryTask, orderTag, user } = initialJobData
  switch (ancillaryTask) {
    case ANCILLARY_TASKS.ORDERBOOK_SYNC_BY_TAG: {
      return orderbookSyncByTag({
        orderTag: orderTag!,
        user: user!
      })
    }
    case ANCILLARY_TASKS.ORDERBOOKSYNC: {
      logger.info(' [ancillaryQueue] ProcessJob started');
      return orderbookSync({
        user: user!
      })
    }
    default: {
      return null
    }
  }
}

const worker = new Worker(
  ANCILLARY_Q_NAME,
  async job => {
    try {
      return processJob(job.data)
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  },
  {
    connection: redisConnection,
    concurrency: 20
  }
)

worker.on('error', err => {
  // log the error
  //console.log('🔴 [ancillaryQueue] worker error', err)
  logger.error('🔴 [ancillaryQueue] worker error', err);
})
