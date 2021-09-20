import { KiteConnect } from 'kiteconnect'

import withSession from '../../lib/session'
import { getIsDevelopWithoutBrokerEnabled } from '../../lib/utils'
import { SignalXUser } from '../../types/misc'

const isDevelopWithoutBrokerEnabled = getIsDevelopWithoutBrokerEnabled()

const apiKey = process.env.KITE_API_KEY

export default withSession(async (req, res) => {
  const user: SignalXUser = req.session.get('user')
  if (isDevelopWithoutBrokerEnabled) {
    res.json({
      ...user,
      isLoggedIn: true
    })
    return
  }

  if (user) {
    const kc = new KiteConnect({
      api_key: apiKey,
      access_token: user?.session?.access_token
    })

    try {
      // see if we're able to fetch profile with the access token
      // in case access token is expired, then log out the user
      await kc.getProfile()

      res.json({
        ...user,
        isLoggedIn: true
      })
    } catch (e) {
      req.session.destroy()
      res.json({
        isLoggedIn: false
      })
    }
  } else {
    res.json({
      isLoggedIn: false
    })
  }
})
