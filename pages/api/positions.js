import withSession from '../../lib/session';
import { syncGetKiteInstance } from '../../lib/utils';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const kite = syncGetKiteInstance(user);
  const positions = await kite.getPositions();

  const { net } = positions;
  const misPositions = net.filter((position) => position.product === 'MIS');

  res.json(misPositions);
});
