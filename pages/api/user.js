import { KiteConnect } from 'kiteconnect';

import withSession from '../../lib/session';

const apiKey = process.env.KITE_API_KEY;

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (user) {
    const kc = new KiteConnect({
      api_key: apiKey,
      access_token: user?.session?.access_token
    });

    try {
      // see if we're able to fetch profile with the access token
      // in case access token is expired, then log out the user
      await kc.getProfile();

      res.json({
        isLoggedIn: true,
        ...user
      });
    } catch (e) {
      res.json({
        isLoggedIn: false
      });
    }
  } else {
    res.json({
      isLoggedIn: false
    });
  }
});
