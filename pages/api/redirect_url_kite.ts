import { BROKER } from '../../lib/constants'
import { cleanupQueues } from '../../lib/queue'

import withSession from '../../lib/session'
import {
  getIndexInstruments,
  premiumAuthCheck,
  storeAccessTokenRemotely,
  checkHasSameAccessToken,
  invesKite,
  initialiseBroker
} from '../../lib/utils'
import { KiteProfile } from '../../types/kite'
import { SignalXUser } from '../../types/misc'

export default withSession(async (req, res) => {
  const { request_token: requestToken,  broker: broker } = req.query

  if (!requestToken) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const sessionData = {};
    const kiteProfile = await initialiseBroker(BROKER.KITE, requestToken)
    sessionData[BROKER.KITE] = kiteProfile;

    const session = await invesKite.init({requestToken: req.query.request_token});
    const user: SignalXUser = { isLoggedIn: true, session: sessionData }
    req.session.set('user', user)
    await req.session.save()
    

    // prepare the day
    // fire and forget
    premiumAuthCheck().catch(e => {
      console.log(e)
    })
    getIndexInstruments().catch(e => {
      console.log(e)
    })

    const existingAccessToken = await checkHasSameAccessToken(
      user?.session?.KITE?.access_token || ''
    )
    if (!existingAccessToken) {
      // first login, or revoked login
      // cleanup queue in both cases
      console.log('cleaning up queues...')
      cleanupQueues().catch(e => {
        console.log(e)
      })
      // then store access token remotely for other services to use it
      storeAccessTokenRemotely(user.session.KITE?.access_token)
    }

    // then redirect
    res.redirect('/dashboard')
  } catch (error) {
    const { response: fetchResponse } = error
    res.status(fetchResponse?.status || 500).json(error.data)
  }
})
