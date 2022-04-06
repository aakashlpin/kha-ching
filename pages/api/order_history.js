import withSession from '../../lib/session'
import { getOrderHistory, syncGetKiteInstance } from '../../lib/utils'

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  const kite = syncGetKiteInstance(user)

  const { id: orderId } = req.query

  const orderHistory = await getOrderHistory(kite, orderId)
  res.json(orderHistory)
})

// 210428200252388
