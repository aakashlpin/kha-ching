import axios from 'axios'
import { SignalXUser } from '../../types/misc'
import { BROKER } from '../constants'

import {
  SIGNALX_AXIOS_DB_AUTH,
  syncGetKiteInstance,
  withRemoteRetry
} from '../utils'

const DATABASE_HOST_URL: string = process.env.DATABASE_HOST_URL!
const DATABASE_USER_KEY: string = process.env.DATABASE_USER_KEY!

async function orderbookSyncByTag ({
  orderTag,
  user
}: {
  orderTag: string
  user: SignalXUser
}) {
  try {
    const kite = syncGetKiteInstance(user, BROKER.KITE)
    const allOrders = await withRemoteRetry(() => kite.getOrders())
    const ordersForTag = allOrders.filter(order => order.tag === orderTag)
    const res = await axios.post(
      `${DATABASE_HOST_URL}/odr_${DATABASE_USER_KEY}/${orderTag}`,
      ordersForTag,
      SIGNALX_AXIOS_DB_AUTH
    )
    return res
  } catch (e) {
    return Promise.reject(e)
  }
}

export default orderbookSyncByTag
