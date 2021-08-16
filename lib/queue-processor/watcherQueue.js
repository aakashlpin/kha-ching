import { Worker } from 'bullmq'

import console from '../logging'
import { redisConnection, WATCHER_Q_NAME } from '../queue'
import { ms } from '../utils'
import slmWatcher from '../watchers/slmWatcher'

async function processJob (jobData) {
  const { initialJobData, jobResponse } = jobData
  const { rawKiteOrderResponse, originalTriggerPrice } = jobResponse

  return slmWatcher({
    slmOrderId: rawKiteOrderResponse.order_id,
    originalTriggerPrice,
    user: initialJobData.user,
    _queueJobData: jobData
  })
}

const worker = new Worker(
  WATCHER_Q_NAME,
  async (job) => {
    const result = await processJob(job.data)
    return result
  },
  {
    connection: redisConnection,
    concurrency: 30,
    lockDuration: ms(5 * 60)
  }
)

worker.on('error', (err) => {
  // log the error
  console.log('🔴 [watcherQueue] worker error', err)
})
