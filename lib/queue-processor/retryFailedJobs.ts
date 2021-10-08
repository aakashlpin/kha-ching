import axios from 'axios'
import dayjs from 'dayjs'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'
import { addToNextQueue } from '../queue'
import { baseTradeUrl } from "../utils"

let isDone = false;
export const checkAndRetryFailedJobs = async (force = false) => {
    if (isDone && !force) return;
    console.log('checking for failed jobs')
    const urlDateParam = dayjs().format('DDMMYYYY')
    const endpoint = `${baseTradeUrl}/${urlDateParam}`
    const { data }: { data: Array<Partial<SUPPORTED_TRADE_CONFIG>> } = await axios(`${endpoint}?limit=100`)
    if (data && data.length) {
        await Promise.all(data.map(async (tradeInfo) => {
            const { queuesArray } = tradeInfo;
            if (!queuesArray || queuesArray.length < 1) return

            const lastJob = queuesArray[queuesArray.length - 1]
            if (lastJob && lastJob.hasOwnProperty('isProcessed') && !lastJob.isProcessed && lastJob._nextTradingQueue) {
                console.log(`Found job ${tradeInfo._id} with isProcessed flag false. Queue: ${lastJob._nextTradingQueue} `)
                addToNextQueue(tradeInfo, { _nextTradingQueue: lastJob._nextTradingQueue })
            }
        }))
        isDone = true;
    }
}

checkAndRetryFailedJobs();