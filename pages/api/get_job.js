import dayjs from 'dayjs';

import queues from '../../lib/queue';
import withSession from '../../lib/session';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const { id: jobId } = req.query;
  const jobRes = await queues.tradingQueue.getJob(jobId);
  const jobState = await jobRes.getState();
  res.json({
    job: jobRes,
    current_state: jobState
  });
});
