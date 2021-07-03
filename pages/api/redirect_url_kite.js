import { KiteConnect } from 'kiteconnect';

import withSession from '../../lib/session';
import { getIndexInstruments, premiumAuthCheck } from '../../lib/utils';

const apiKey = process.env.KITE_API_KEY;
const kiteSecret = process.env.KITE_API_SECRET;
const kc = new KiteConnect({
  api_key: apiKey
});

export default withSession(async (req, res) => {
  const { request_token: requestToken } = req.query;

  if (!requestToken) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const sessionData = await kc.generateSession(requestToken, kiteSecret);
    const user = { isLoggedIn: true, session: sessionData };
    req.session.set('user', user);
    await req.session.save();

    // prepare the day
    // fire and forget
    premiumAuthCheck();
    getIndexInstruments();

    // then redirect
    res.redirect('/dashboard');
  } catch (error) {
    const { response: fetchResponse } = error;
    res.status(fetchResponse?.status || 500).json(error.data);
  }
});
