import axios from 'axios'
import dayjs from 'dayjs'
import { pick } from 'lodash'
import { customAlphabet } from 'nanoid'

import { tradingQueue, addToNextQueue, TRADING_Q_NAME } from '../../lib/queue'

import { EXIT_STRATEGIES, STRATEGIES_DETAILS } from '../../lib/constants'
import console from '../../lib/logging'

import withSession from '../../lib/session'
import {
  isMarketOpen,
  premiumAuthCheck,
  SIGNALX_AXIOS_DB_AUTH,
  withoutFwdSlash
} from '../../lib/utils'
const { DATABASE_HOST_URL, DATABASE_USER_KEY, DATABASE_API_KEY } = process.env

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8)

async function createJob ({ jobData, user }) {
  const {
    runAt,
    runNow,
    strategy,
    exitStrategy,
    squareOffTime,
    expireIfUnsuccessfulInMins
  } = jobData

  if (STRATEGIES_DETAILS[strategy].premium) {
    if (!process.env.SIGNALX_API_KEY?.length) {
      return Promise.reject('You need SignalX Premium to use this strategy.')
    }

    try {
      // multifold objective
      // 1. stop the non premium members trying this out super early
      // 2. memoize the auth key in the SIGNALX_URL service making the first indicator request real fast
      const res = await premiumAuthCheck()
      if (!res) {
        return Promise.reject('You need SignalX Premium to use this strategy.')
      }
    } catch (e) {
      if (e.isAxiosError) {
        if (e.response.status === 401) {
          return Promise.reject('You need SignalX Premium to use this strategy.')
        }
        return Promise.reject(e.response.data)
      }
    }
  }

  if (!MOCK_ORDERS && runNow && !isMarketOpen()) {
    return Promise.reject('Exchange is offline right now.')
  }

  if (!MOCK_ORDERS && !runNow && runAt && !isMarketOpen(dayjs(runAt))) {
    return Promise.reject('Exchange would be offline at the scheduled time.')
  }

  const qRes = addToNextQueue(
    {
      ...jobData,
      user,
      autoSquareOffProps: squareOffTime
        ? {
            time: squareOffTime,
            deletePendingOrders: exitStrategy !== EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
          }
        : null,
      expiresAt: expireIfUnsuccessfulInMins
        ? dayjs(runNow ? new Date() : runAt)
            .add(expireIfUnsuccessfulInMins, 'minutes')
            .format()
        : null
    },
    {
      __nextTradingQueue: TRADING_Q_NAME
    }
  )

  return qRes
}

async function deleteJob (id) {
  try {
    if (id.includes('repeat')) {
      await tradingQueue.removeRepeatableByKey(id)
    } else {
      const job = await tradingQueue.getJob(id)
      await job.remove()
    }
  } catch (e) {
    console.log('[deleteJob] failed', e)
    return Promise.reject(e)
  }
}

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).end()
  }

  const urlDateParam = dayjs().format('DDMMYYYY')
  const endpoint = `${withoutFwdSlash(DATABASE_HOST_URL)}/day_${DATABASE_USER_KEY}/${urlDateParam}`

  console.log({ dailyTradesEndpoint: endpoint })

  if (req.method === 'POST') {
    let data
    const orderTag = nanoid()
    try {
      // for every new job, first create a db entry
      const postData = {
        ...req.body,
        orderTag
      }
      const response = await axios[req.method.toLowerCase()](
        endpoint,
        postData,
        SIGNALX_AXIOS_DB_AUTH
      )
      data = response.data
    } catch (e) {
      return res.status(e.response.status).json(e.response.data || {})
    }

    try {
      // then create the queue entry
      const qRes = await createJob({
        jobData: data,
        user
      })
      // then patch the db entry with queue entry
      await axios.put(
        `${endpoint}/${data._id}`,
        {
          ...data,
          status: 'QUEUE',
          queue: pick(qRes, ['id', 'name', 'opts', 'timestamp', 'stacktrace', 'returnvalue'])
        },
        SIGNALX_AXIOS_DB_AUTH
      )
      // done!
      return res.json(data)
    } catch (e) {
      await axios.put(
        `${endpoint}/${data._id}`,
        {
          ...data,
          status: 'REJECT',
          status_message: e
        },
        SIGNALX_AXIOS_DB_AUTH
      )

      return res.json(data)
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { data } = await axios(`${endpoint}/${req.body._id}`)
      if (data.queue.id) {
        await deleteJob(data.queue.id)
      }
      await axios.delete(`${endpoint}/${req.body._id}`, SIGNALX_AXIOS_DB_AUTH)
      return res.end()
    } catch (e) {
      return res.status(e.response.status).json(e.response.data || {})
    }
  }

  if (req.method === 'GET') {
    try {
      const { data } = await axios(`${endpoint}?limit=100`)
      return res.json(data)
    } catch (e) {
      return res.status(e.response.status).json(e.response.data || {})
    }
  }

  res.status(400).end()
})
