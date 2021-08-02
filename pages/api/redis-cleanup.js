import { cleanupQueues } from '../../lib/queue'

export default async (req, res) => {
  try {
    await cleanupQueues()
    return res.json({ status: 'ok' })
  } catch (e) {
    return res.status(500).send(e)
  }
}
