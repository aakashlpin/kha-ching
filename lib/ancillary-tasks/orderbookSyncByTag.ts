import axios from 'axios'
import { SignalXUser } from '../../types/misc'

import {
  SIGNALX_AXIOS_DB_AUTH,
  syncGetKiteInstance,
  withRemoteRetry
} from '../utils'

const DATABASE_HOST_URL: string = process.env.DATABASE_HOST_URL!
const DATABASE_USER_KEY: string = process.env.DATABASE_USER_KEY!
const ORCL_HOST_URL=process.env.ORCL_HOST_URL!

async function orderbookSyncByTag ({
  orderTag,
  user
}: {
  orderTag: string
  user: SignalXUser
}) {
  try {
    const kite = syncGetKiteInstance(user)
    const allOrders = await withRemoteRetry(() => kite.getOrders())
    const ordersForTag = allOrders.filter(order => order.tag === orderTag)
    console.log(`Order tag is ${orderTag}`)
    const res = await axios.post(
      `${DATABASE_HOST_URL}/odr_${DATABASE_USER_KEY}/${orderTag}`,
      ordersForTag,
      SIGNALX_AXIOS_DB_AUTH
    )
    const res1=await axios.post(
      `${ORCL_HOST_URL}/rest-v1/trades`,
      ordersForTag,
    )
    return res
  } catch (e) {
    return Promise.reject(e)
  }
}

export default orderbookSyncByTag
