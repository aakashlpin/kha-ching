import axios from 'axios'
import dayjs from 'dayjs'
import { uniq } from 'lodash'

import withSession from '../../lib/session'
import {
  syncGetKiteInstance,
  withoutFwdSlash
} from '../../lib/utils'
import { KiteOrder } from '../../types/kite'
import { SignalXUser } from '../../types/misc'
import { SUPPORTED_TRADE_CONFIG } from '../../types/trade'

const { DATABASE_HOST_URL, DATABASE_USER_KEY } = process.env

export default withSession(async (req, res) => {
  const date = dayjs().format('DDMMYYYY')
  const user: SignalXUser = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  const kite = syncGetKiteInstance(user)
  const orders: KiteOrder[] = await kite.getOrders()

  if (req.method === 'PUT') {
    const { orderId, orderTag } = req.body
    const dbUrl = `${withoutFwdSlash(
      DATABASE_HOST_URL!
    )}/odr_${DATABASE_USER_KEY!}?q=order_id:${orderId as string}`
    const { data }: { data: SUPPORTED_TRADE_CONFIG[] } = await axios(dbUrl)
    const [order] = data

    if (order) {
      await axios.delete(
        `${withoutFwdSlash(
          DATABASE_HOST_URL!
        )}/odr_${DATABASE_USER_KEY!}/${order.collection!}/${order._id as string}`
      )
    }

    // create a new entry

    const newDbOrder = orders.find(order => order.order_id === orderId)
    const { data: updatedRes } = await axios.post(
      `${withoutFwdSlash(
        DATABASE_HOST_URL!
      )}/odr_${DATABASE_USER_KEY!}/${orderTag as string}`,
      {
        ...newDbOrder,
        tag: orderTag
      }
    )

    return res.json(updatedRes)
  }

  const allTags = uniq(orders.map(order => order.tag).filter(o => o))

  const dbOrdersUrls = allTags.map(
    tag =>
      `${withoutFwdSlash(
        DATABASE_HOST_URL!
      )}/odr_${DATABASE_USER_KEY!}?limit=100&q=tag:${tag as string}`
  )
  // console.log({ dbOrdersUrl });
  const responses = await Promise.all(
    dbOrdersUrls.map(async dbOrdersUrl => axios(dbOrdersUrl))
  )
  const dbOrders = responses.reduce(
    (accum, response) => [...(accum as any), ...(response as any).data],
    []
  )

  const dayTrades = `${withoutFwdSlash(
    DATABASE_HOST_URL!
  )}/day_${DATABASE_USER_KEY!}/${date}`
  const { data: trades } = await axios(dayTrades)

  return res.json({ orders, trades, dbOrders })
})
