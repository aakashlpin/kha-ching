import { Worker } from 'bullmq'

import console from '../logging'
import { redisConnection, TARGETPNL_Q_NAME } from '../queue'
import { ms } from '../utils'
import targetPnL from '../targetPnL'

async function processJob (jobData) {
  const { initialJobData, jobResponse } = jobData
  const { orders } = jobResponse
  console.log('[targetPnlQueue] Processing job in queue ')
  console.log(`[targetPnlQueue] ${orders}`)
  return targetPnL ({
    initialJobData,
    orders
  })  
}

const worker = new Worker(
  TARGETPNL_Q_NAME,
  async job => {
    console.log(`processing trargetPnlQueu id ${job.id}`, job.data)
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
  console.log('🔴 [targetPnLQueue] worker error', err)
})
