import { Worker } from 'bullmq'

import autoSquareOffStrat from '../exit-strategies/autoSquareOff'
import console from '../logging'
import { AUTO_SQUARE_OFF_Q_NAME, redisConnection } from '../queue'
import { ms } from '../utils'

const worker = new Worker(
  AUTO_SQUARE_OFF_Q_NAME,
  async job => {
    console.log(`processing auto square off id ${job.id}`, job.data)
    return autoSquareOffStrat(job.data)
  },
  {
    connection: redisConnection,
    concurrency: 1,
    lockDuration: ms(5 * 60)
  }
)

worker.on('failed', job => {
  const { name, data, failedReason, returnvalue, id } = job
  console.log('auto square off failed', {
    name,
    data,
    failedReason,
    returnvalue,
    id
  })
})

worker.on('error', err => {
  // log the error
  console.log('🔴 [squareOffQueue] worker error', err)
})
