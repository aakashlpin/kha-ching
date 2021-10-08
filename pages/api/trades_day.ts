import axios from 'axios'
import dayjs from 'dayjs'
import { pick } from 'lodash'
import { customAlphabet } from 'nanoid'

import { tradingQueue, addToNextQueue, TRADING_Q_NAME } from '../../lib/queue'

import { ERROR_STRINGS, STRATEGIES_DETAILS } from '../../lib/constants'
import console from '../../lib/logging'

import withSession from '../../lib/session'
import {
  baseTradeUrl,
  isMarketOpen,
  isMockOrder,
  premiumAuthCheck,
  SIGNALX_AXIOS_DB_AUTH,
  orclsodaUrl
} from '../../lib/utils'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'
import { SignalXUser } from '../../types/misc'

const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  8
)

async function createJob ({
  jobData,
  user
}: {
  jobData: SUPPORTED_TRADE_CONFIG
  user: SignalXUser
}) {
  const { runAt, runNow, strategy } = jobData

  if (STRATEGIES_DETAILS[strategy].premium) {
    if (!process.env.SIGNALX_API_KEY?.length) {
      return Promise.reject(new Error(ERROR_STRINGS.PAID_STRATEGY))
    }

    try {
      // multifold objective
      // 1. stop the non premium members trying this out super early
      // 2. memoize the auth key in the SIGNALX_URL service making the first indicator request real fast
      const res = await premiumAuthCheck()
      if (!res) {
        return Promise.reject(new Error(ERROR_STRINGS.PAID_STRATEGY))
      }
    } catch (e) {
      if (e.isAxiosError) {
        if (e.response.status === 401) {
          return Promise.reject(new Error(ERROR_STRINGS.PAID_STRATEGY))
        }
        return Promise.reject(new Error(e.response.data))
      }
    }
  }

  if (!isMockOrder() && runNow && !isMarketOpen()) {
    return Promise.reject(new Error('Exchange is offline right now.'))
  }

  if (!isMockOrder() && !runNow && runAt && !isMarketOpen(dayjs(runAt))) {
    return Promise.reject(
      new Error('Exchange would be offline at the scheduled time.')
    )
  }

  return addToNextQueue(
    {
      ...jobData,
      user
    },
    {
      _nextTradingQueue: TRADING_Q_NAME
    }
  )
}

async function deleteJob (id) {
  try {
    if (id.includes('repeat')) {
      await tradingQueue.removeRepeatableByKey(id)
    } else {
      const job = await tradingQueue.getJob(id)
      job && (await job.remove())
    }
  } catch (e) {
    console.log('🔴 [deleteJob] failed', e)
    return Promise.reject(e)
  }
}

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).end()
  }

  const urlDateParam = dayjs().format('DDMMYYYY')
  const dayparam=dayjs().format('YYYYMMDD') // This will be helfpul to delete earlier daily plans
  const endpoint = `${baseTradeUrl}/${urlDateParam}`
  const orclEndpoint=`${orclsodaUrl}/dailyplan`
  const orclGetPoint=`${orclsodaUrl}/custom-actions/query/dailyplan`
  /*ANILTODO: 1. Check if that colletions exist
  2. If it exists, keep posting , else crete a collection
  */

  if (req.method === 'POST') {
    let data: SUPPORTED_TRADE_CONFIG
    const orderTag = nanoid()
    try {
      //Check if collection is already created
      
      // for every new job, first create a db entry
      const postData = {
        ...req.body,
        orderTag,
        dayparam
      }
      // const response = await axios[req.method.toLowerCase()](
      //   endpoint,
      //   postData,
      //   SIGNALX_AXIOS_DB_AUTH
      // )
      // data = response.data
      const response =await axios.post(orclEndpoint,postData);
      data={...response.data.items[0].value,id:response.data.items[0].id};
    } catch (e) {
      console.log('🔴 failed to post', e)
      return res
        .status(e?.response?.status || 500)
        .json(e?.response?.data || {})
    }

    try {
      // then create the queue entry
      const qRes = await createJob({
        jobData: data,
        user
      })
      // then patch the db entry with queue entry
      // await axios.put(
      //   `${endpoint}/${data._id!}`,
      //   {
      //     ...data,
      //     status: 'QUEUE',
      //     queue: pick(qRes, [
      //       'id',
      //       'name',
      //       'opts',
      //       'timestamp',
      //       'stacktrace',
      //       'returnvalue'
      //     ])
      //   },
      //   SIGNALX_AXIOS_DB_AUTH
      // )

      await axios.put(
        `${orclEndpoint}/${data.id!}`,
        {
          ...data,
          status: 'QUEUE',
          queue: pick(qRes, [
            'id',
            'name',
            'opts',
            'timestamp',
            'stacktrace',
            'returnvalue'
          ])
        }
      )
      // done!
      return res.json(data)
    } catch (e) {
      console.log('🔴 job creation failed', e)
      // await axios.put(
      //   `${endpoint}/${data._id!}`,
      //   {
      //     ...data,
      //     status: 'REJECT',
      //     status_message: e?.message
      //   },
      //   SIGNALX_AXIOS_DB_AUTH
      // )
      await axios.put(
        `${orclEndpoint}/${data.id!}`,
        {
          ...data,
          status: 'REJECT',
          status_message: e?.message
        },
        SIGNALX_AXIOS_DB_AUTH
      )

      return res.json(data)
    }
  }

  if (req.method === 'DELETE') {
    try {
      // const { data } = await axios(`${endpoint}/${req.body._id as string}`)
      // if (data.queue?.id) {
      //   await deleteJob(data.queue.id)
      // }
      // await axios.delete(
      //   `${endpoint}/${req.body._id as string}`,
      //   SIGNALX_AXIOS_DB_AUTH
      // )
      const { data } = await axios(`${orclEndpoint}/${req.body.id as string}`)
      if (data.queue?.id) {
        await deleteJob(data.queue.id)
      }
      await axios.delete(
        `${endpoint}/${req.body.id as string}`,
        SIGNALX_AXIOS_DB_AUTH
      )
      return res.end()
    } catch (e) {
      console.log('🔴 failed to delete', e)
      return res
        .status(e?.response?.status || 500)
        .json(e?.response?.data || {})
    }
  }

  if (req.method === 'PUT') {
    try {
      // const { _id, ...props } = req.body
      // const { data } = await axios(`${endpoint}/${_id as string}`)
      // await axios.put(
      //   `${endpoint}/${_id as string}`,
      //   {
      //     ...data,
      //     ...props
      //   },
      //   SIGNALX_AXIOS_DB_AUTH
      // )
      const { id, ...props } = req.body
      const { data } = await axios(`${orclEndpoint}/${id as string}`)
      await axios.put(
        `${orclEndpoint}/${id as string}`,
        {
          ...data,
          ...props
        }
      )
      return res.end()
    } catch (e) {
      console.log('🔴 failed to put', e)
      return res
        .status(e?.response?.status || 500)
        .json(e?.response?.data || {})
    }
  }

  if (req.method === 'GET') {
    try {
      //const { data } = await axios(`${endpoint}?limit=100`)
      let body:Object={day:dayparam};
      const {data:{items}}= await axios.post(
        `${orclGetPoint}`,
        body);
    
    const data=items.map(items=>{
      return ({...items.value,id:items.id})
     });
      return res.json(data)
    } catch (e) {
      console.log('🔴 failed to get', e)
      return res
        .status(e?.response?.status || 500)
        .json(e?.response?.data || {})
    }
  }

  res.status(400).end()
})
