import console from '../../lib/logging';
import { tradingQueue } from '../../lib/queue';
import withSession from '../../lib/session';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const { id } = req.body;

  try {
    if (id.includes('repeat')) {
      await tradingQueue.removeRepeatableByKey(id);
    } else {
      const job = await tradingQueue.getJob(id);
      console.log('Job deleted from API', job.name);
      await job.remove();
    }
    res.json({ status: 'ok' });
  } catch (e) {
    // console.log(e);
    res.status(500).json({ error: e });
  }
});
