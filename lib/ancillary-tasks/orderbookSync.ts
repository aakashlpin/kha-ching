import axios from 'axios'
import { SignalXUser } from '../../types/misc'
//import console from '../logging'
import logger from '../logger'
import {
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
    const completedOrders = allOrders.filter(order =>(order.status === 'COMPLETE'))
    if (completedOrders.length>0)
    {
      logger.info(`Completed orers in ancillary queue`,completedOrders);
      const res=await axios.post(
        `${ORCL_HOST_URL}/rest-v1/trades`,
        completedOrders,
      )
      return res
    } 
    else
      return null;
  } catch (e) {
    return Promise.reject(e)
  }
}

export default orderbookSync
