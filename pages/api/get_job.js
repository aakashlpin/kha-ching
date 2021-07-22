import { tradingQueue } from '../../lib/queue'
import withSession from '../../lib/session'

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  const { id: jobId } = req.query
  try {
    const jobRes = await tradingQueue.getJob(jobId)
    if (!jobRes) {
      return res.status(200).json({
        error: 'job not found'
      })
    }

    const jobState = await jobRes.getState()
    res.json({
      job: jobRes,
      current_state: jobState
    })
  } catch (e) {
    console.log(e)
    res.status(500).json({
      status: 'something went wrong'
    })
  }
})
