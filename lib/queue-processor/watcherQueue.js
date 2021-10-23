import { Worker } from 'bullmq'

import console from '../logging'
import { redisConnection, WATCHER_Q_NAME } from '../queue'
import { ms } from '../utils'
import sllWatcher from '../watchers/sllWatcher'

async function processJob (jobData) {
  const { initialJobData, jobResponse } = jobData
  const { rawKiteOrderResponse } = jobResponse

  return sllWatcher({
    sllOrderId: rawKiteOrderResponse.order_id,
    user: initialJobData.user
  })
}

const worker = new Worker(
  WATCHER_Q_NAME,
  async job => {
    const result = await processJob(job.data)
    return result
  },
  {
    connection: redisConnection,
    concurrency: 30,
    lockDuration: ms(5 * 60)
  }
)

worker.on('error', err => {
  // log the error
  console.log('🔴 [watcherQueue] worker error', err)
})
