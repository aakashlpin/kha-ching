import axios from 'axios'
import dayjs from 'dayjs'
import { uniqBy } from 'lodash'
import { Promise } from 'bluebird'

import withSession from '../../lib/session'
import {
  getCurrentExpiryTradingSymbol,
  syncGetKiteInstance
} from '../../lib/utils'
import advancedFormat from 'dayjs/plugin/advancedFormat'
dayjs.extend(advancedFormat)

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const { order_tag: orderTag } = req.query

    if (!orderTag) {
      return res.status(400).json({ error: 'expected orderTag in query' })
    }
    const kite = syncGetKiteInstance(user)
   // const rawOrders = ordersInDB?.length ? ordersInDB : await kite.getOrders()
    const rawOrders = await kite.getOrders()
    const uniqueOrders = uniqBy(rawOrders, order => order.order_id)

    const orders = uniqueOrders
      .filter(order => order.tag === orderTag)
      .sort((a, b) =>
        dayjs(a.order_timestamp).isSame(b.order_timestamp)
          ? a.status === 'TRIGGER PENDING'
            ? 1
            : a.transaction_type === 'BUY'
            ? 1
            : -1
          : dayjs(a.order_timestamp).isBefore(b.order_timestamp)
          ? 1
          : -1
      )

    // const getHumanTradingSymbol = async ({ tradingsymbol }) => {
    //   const instrumentType = tradingsymbol.substr(tradingsymbol.length - 2, 2)
    //   const expiryData = await getCurrentExpiryTradingSymbol({
    //     tradingsymbol,
    //     instrumentType
    //   })
    //   if (!expiryData) {
    //     return null
    //   }
    //   const { expiry, name, strike } = expiryData
    //   const dateString = dayjs(expiry)
    //     .format('Do MMM')
    //     .split(' ')
    //     .map((str, idx) => (idx === 1 ? str.toUpperCase() : str))
    //     .join(' ')
    //   return `${name} ${dateString} ${strike} ${instrumentType}`
    // }

    // const humanOrders = await Promise.map(orders, async order => {
    //   return {
    //     ...order,
    //     humanTradingSymbol: await getHumanTradingSymbol({
    //       tradingsymbol: order.tradingsymbol
    //     })
    //   }
    // })

    res.json(orders)
  } catch (e) {
    res.status(500).send(e)
  }
})
