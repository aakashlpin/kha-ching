import withSession from '../../lib/session'
// import { storeAccessTokenRemotely } from '../../lib/utils';

const fyers = require('fyers-api')

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (user && user?.fyers?.access_token) {
    try {
      const profile = await fyers.get_profile({ token: user.fyers.access_token })
      return res.json(profile)
    } catch (e) {
      console.log('error', e)
      return res.status(401).end()
    }
  }

  res.status(401).end()
})
