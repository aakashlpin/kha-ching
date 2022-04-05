import withSession from '../../lib/session'
import { syncGetKiteInstance } from '../../lib/utils'
import { BROKER } from '../../constants'

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  const kite = syncGetKiteInstance(user, BROKER.KITE)
  const positions = await kite.getPositions()

  const { net } = positions
  const misPositions = net.filter(position => position.product === 'MIS')

  res.json(misPositions)
})
