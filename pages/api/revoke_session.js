import axios from 'axios';

import withSession from '../../lib/session';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  await axios.delete(
    `https://api.kite.trade/session/token?api_key=${process.env.KITE_API_KEY}&access_token=${user.session.access_token}`,
    {
      headers: {
        'X-Kite-Version': 3
      }
    }
  );

  res.json({ status: 'ok' });
});
