import withSession from '../../lib/session';
// import { storeAccessTokenRemotely } from '../../lib/utils';

const fyers = require('fyers-api');

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (user) {
    const profile = await fyers.get_profile({ token: user.fyers.access_token });
    res.json(profile);
  }

  res.status(401).end();
});
