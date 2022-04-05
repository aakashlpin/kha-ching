import withSession from '../../lib/session'
import { syncGetKiteInstance } from '../../lib/utils'
import { BROKER } from '../../constants'

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  const kite = syncGetKiteInstance(user, BROKER.KITE)

  const { id: orderId } = req.query

  const orderHistory = await kite.getOrderHistory(orderId)
  res.json(orderHistory.reverse())
})

// 210428200252388
