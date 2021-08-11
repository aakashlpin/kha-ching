import { KiteConnect } from 'kiteconnect'
import { cleanupQueues } from '../../lib/queue'

import withSession from '../../lib/session'
import { getIndexInstruments, premiumAuthCheck, storeAccessTokenRemotely, checkHasSameAccessToken } from '../../lib/utils'
import { KiteProfile } from '../../types/kite'
import { SignalXUser } from '../../types/misc'

const apiKey = process.env.KITE_API_KEY
const kiteSecret = process.env.KITE_API_SECRET
const kc = new KiteConnect({
  api_key: apiKey
})

export default withSession(async (req, res) => {
  const { request_token: requestToken } = req.query

  if (!requestToken) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const sessionData: KiteProfile = await kc.generateSession(requestToken, kiteSecret)
    const user: SignalXUser = { isLoggedIn: true, session: sessionData }
    req.session.set('user', user)
    await req.session.save()

    // prepare the day
    // fire and forget
    premiumAuthCheck()
    getIndexInstruments()

    const existingAccessToken = await checkHasSameAccessToken(user.session.access_token!)
    if (!existingAccessToken) {
      // first login, or revoked login
      // cleanup queue in both cases
      console.log('cleaning up queues...')
      cleanupQueues()
      // then store access token remotely for other services to use it
      storeAccessTokenRemotely(user.session.access_token)
    }

    // then redirect
    res.redirect('/dashboard')
  } catch (error) {
    const { response: fetchResponse } = error
    res.status(fetchResponse?.status || 500).json(error.data)
  }
})
