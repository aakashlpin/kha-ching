import axios from 'axios'
import { SignalXUser } from '../../types/misc'

import {
  SIGNALX_AXIOS_DB_AUTH,
  syncGetKiteInstance,
  withRemoteRetry
} from '../utils'

const ORCL_HOST_URL=process.env.ORCL_HOST_URL!

async function orderbookSync ({
  user
}: {
  user: SignalXUser
}) {
  try {
    const kite = syncGetKiteInstance(user)
    const allOrders = await withRemoteRetry(() => kite.getOrders())
    const ordersForNFO = allOrders.filter(order =>( order.exchange === 'NFO'
                                    && order.status === 'COMPLETE'))
    const res=await axios.post(
      `${ORCL_HOST_URL}/rest-v1/trades`,
      ordersForNFO,
    )
    return res
  } catch (e) {
    return Promise.reject(e)
  }
}

export default orderbookSync
