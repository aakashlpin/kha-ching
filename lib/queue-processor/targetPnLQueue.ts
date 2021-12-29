import { Worker } from 'bullmq'

import console from '../logging'
import { redisConnection, TARGETPNL_Q_NAME } from '../queue'
import { ms } from '../utils'
import targetPnL from '../targetPnL'

async function processJob (jobData) {
  const { initialJobData, jobResponse } = jobData
  const { orders } = jobResponse
  return targetPnL ({
    initialJobData,
    orders
  })  
}

const worker = new Worker(
  TARGETPNL_Q_NAME,
  async job => {
    try
  {
    console.log(`processing trargetPnlQueu id ${job.id}`)
    const result = await processJob(job.data)
    return result
  }
  catch (e) {
    console.log(e.message ? e.message : e)
    throw new Error(e)
  }
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
