import { cleanupQueues } from '../../lib/queue'
import withSession from '../../lib/session'

export default withSession(async (req, res) => {
  try {
    await cleanupQueues()
    return res.json({ status: 'ok' })
  } catch (e) {
    return res.status(500).send(e)
  }
})
