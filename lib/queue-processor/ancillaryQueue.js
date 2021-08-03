import { Worker } from 'bullmq'

import orderbookSyncByTag from '../ancillary-tasks/orderbookSyncByTag'
import { ANCILLARY_TASKS } from '../constants'
import console from '../logging'
import { ANCILLARY_Q_NAME, redisConnection } from '../queue'

function processJob (jobData) {
  const { initialJobData } = jobData

  const { ancillaryTask, orderTag, user } = initialJobData
  switch (ancillaryTask) {
    case ANCILLARY_TASKS.ORDERBOOK_SYNC_BY_TAG: {
      return orderbookSyncByTag({
        orderTag,
        user
      })
    }
    default: {
      return null
    }
  }
}

const worker = new Worker(
  ANCILLARY_Q_NAME,
  async (job) => {
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

worker.on('error', (err) => {
  // log the error
  console.log('🔴 [ancillaryQueue] worker error', err)
})
