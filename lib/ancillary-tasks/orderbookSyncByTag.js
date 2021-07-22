import axios from 'axios'

import { syncGetKiteInstance } from '../utils'

const DATABASE_HOST_URL = process.env.DATABASE_HOST_URL
const DATABASE_USER_KEY = process.env.DATABASE_USER_KEY
const DATABASE_API_KEY = process.env.DATABASE_API_KEY

async function orderbookSyncByTag ({ orderTag, user }) {
  try {
    const kite = syncGetKiteInstance(user)
    const allOrders = await kite.getOrders()
    const ordersForTag = allOrders.filter((order) => order.tag === orderTag)
    const res = await axios.post(
      `${DATABASE_HOST_URL}/odr_${DATABASE_USER_KEY}/${orderTag}`,
      ordersForTag,
      {
        headers: {
          'x-api-key': DATABASE_API_KEY
        }
      }
    )
    return res
  } catch (e) {
    return Promise.reject(e)
  }
}

export default orderbookSyncByTag
