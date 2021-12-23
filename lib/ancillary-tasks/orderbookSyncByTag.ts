import axios from 'axios'
import { SignalXUser } from '../../types/misc'

import {
  syncGetKiteInstance,
  withRemoteRetry
} from '../utils'

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
 
    const res=await axios.post(
      `${ORCL_HOST_URL}/rest-v1/trades`,
      ordersForTag,
    )
    return res
  } catch (e) {
    return Promise.reject(e)
  }
}

export default orderbookSyncByTag
