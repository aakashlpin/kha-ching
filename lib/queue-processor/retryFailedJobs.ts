import axios from 'axios'
import dayjs from 'dayjs'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'
import { addToNextQueue } from '../queue'
import { baseTradeUrl } from "../utils"




export const checkAndRetryFailedJobs = async () => {
    const urlDateParam = dayjs().format('DDMMYYYY')
    const endpoint = `${baseTradeUrl}/${urlDateParam}`
    const { data }: { data: Array<Partial<SUPPORTED_TRADE_CONFIG>> } = await axios(`${endpoint}?limit=100`)
    if (data && data.length) {
        await Promise.all(data.map(async (tradeInfo) => {
            const { queuesArray } = tradeInfo;
            if (!queuesArray || queuesArray.length < 1) return

            const lastJob = queuesArray[queuesArray.length - 1]
            if (lastJob && !lastJob.isProcessed) {
                return addToNextQueue(tradeInfo, { _nextTradingQueue: lastJob._nextTradingQueue })
            }
        }))
    }
}