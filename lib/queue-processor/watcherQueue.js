import { Worker } from 'bullmq'

import console from '../logging'
import { redisConnection, WATCHER_Q_NAME } from '../queue'
import slmWatcher from '../watchers/slmWatcher'

async function processJob (jobData) {
  const { initialJobData, jobResponse } = jobData
  const { rawKiteOrderResponse, originalTriggerPrice } = jobResponse

  return slmWatcher({
    slmOrderId: rawKiteOrderResponse.order_id,
    originalTriggerPrice,
    user: initialJobData.user,
    __queueJobData: jobData
  })
}

new Worker(
  WATCHER_Q_NAME,
  async (job) => {
    const result = await processJob(job.data)
    console.log(`successfully processed watcherQueue id ${job.id}`, result)
    return result
  },
  {
    connection: redisConnection,
    concurrency: 30
  }
)
