import { AxiosResponse } from 'axios'
import { KiteConnect } from 'kiteconnect'
import { cleanupQueues } from '../../lib/queue'

import withSession from '../../lib/session'
import {
  getIndexInstruments,
  premiumAuthCheck,
  storeAccessTokenRemotely,
  checkHasSameAccessToken
} from '../../lib/utils'
import { KiteProfile } from '../../types/kite'
import { SignalXUser } from '../../types/misc'
import getInvesBrokerInstance from '../../lib/invesBroker'
import { BrokerName } from 'inves-broker'

export default withSession(async (req, res) => {
  const { request_token: requestToken } = req.query

  if (!requestToken) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const invesBrokerInstance = await getInvesBrokerInstance(BrokerName.KITE)
    const sessionData = await invesBrokerInstance.generateSession({
      kiteRequestToken: requestToken
    })
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
      user.session.accessToken!
    )
    if (!existingAccessToken) {
      // first login, or revoked login
      // cleanup queue in both cases
      console.log('cleaning up queues...')
      cleanupQueues().catch(e => {
        console.log(e)
      })
      // then store access token remotely for other services to use it
      storeAccessTokenRemotely(
        user.session.accessToken as string,
        user.session.refreshToken
      )
    }

    // then redirect
    res.redirect('/dashboard')
  } catch (error) {
    const { response: fetchResponse } = error
    res.status(fetchResponse?.status || 500).json(error.data)
  }
})
