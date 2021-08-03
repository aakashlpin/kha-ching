import axios from 'axios'
import dayjs from 'dayjs'
import { uniq } from 'lodash'

import withSession from '../../lib/session'
import { SIGNALX_AXIOS_DB_AUTH, syncGetKiteInstance, withoutFwdSlash } from '../../lib/utils'

const { DATABASE_HOST_URL, DATABASE_USER_KEY } = process.env

export default withSession(async (req, res) => {
  const date = dayjs().format('DDMMYYYY')
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  const kite = syncGetKiteInstance(user)
  const orders = await kite.getOrders()

  if (req.method === 'PUT') {
    const { orderId, orderTag } = req.body
    const dbUrl = `${withoutFwdSlash(
      DATABASE_HOST_URL
    )}/odr_${DATABASE_USER_KEY}?q=order_id:${orderId}`
    const { data } = await axios(dbUrl)
    const [order] = data

    if (order) {
      await axios.delete(`${withoutFwdSlash(DATABASE_HOST_URL)}/odr_${DATABASE_USER_KEY}/${order._collection}/${order._id}`, SIGNALX_AXIOS_DB_AUTH)
    }

    // create a new entry

    const newDbOrder = orders.find((order) => order.order_id === orderId)
    const { data: updatedRes } = await axios.post(
      `${withoutFwdSlash(DATABASE_HOST_URL)}/odr_${DATABASE_USER_KEY}/${orderTag}`,
      {
        ...newDbOrder,
        tag: orderTag
      },
      SIGNALX_AXIOS_DB_AUTH
    )

    return res.json(updatedRes)
  }

  const allTags = uniq(orders.map((order) => order.tag).filter((o) => o))

  const dbOrdersUrls = allTags.map(
    (tag) => `${withoutFwdSlash(DATABASE_HOST_URL)}/odr_${DATABASE_USER_KEY}?limit=100&q=tag:${tag}`
  )
  // console.log({ dbOrdersUrl });
  const responses = await Promise.all(dbOrdersUrls.map((dbOrdersUrl) => axios(dbOrdersUrl)))
  const dbOrders = responses.reduce((accum, response) => [...accum, ...response.data], [])

  const dayTrades = `${withoutFwdSlash(DATABASE_HOST_URL)}/day_${DATABASE_USER_KEY}/${date}`
  const { data: trades } = await axios(dayTrades)

  return res.json({ orders, trades, dbOrders })
})
