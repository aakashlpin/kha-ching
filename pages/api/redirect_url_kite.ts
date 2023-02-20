//import { AxiosResponse } from 'axios'
import { KiteConnect } from 'kiteconnect';
import { addToAncillaryQueue, cleanupQueues,addToCoSquareOff } from '../../lib/queue';

import withSession from '../../lib/session';
import {
  checkHasSameAccessToken, getIndexInstruments, logDeep,
  //premiumAuthCheck,
  storeAccessTokenRemotely,
  cleanupTradesAndAccessToken,storeAccessTokeninRedis,checksameTokeninRedis
} from '../../lib/utils';
import { KiteProfile } from '../../types/kite';
import { SignalXUser } from '../../types/misc';
//import {ANCILLARY_TASKS} from '../../lib/constants'
import logger from '../../lib/logger';

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
  logger.info('[redirect_url_kite_logger] Logging in..');

  try {
    const sessionData: KiteProfile = await kc.generateSession(
      requestToken,
      kiteSecret
    )
    const user: SignalXUser = { isLoggedIn: true, session: sessionData }
    req.session.set('user', user)
    await req.session.save()

    getIndexInstruments().catch(e => {
      console.log(e)
    })

    const existingAccessToken = await checksameTokeninRedis(
      user.session.access_token!
    )
    if (!existingAccessToken) {
      // first login, or revoked login
      // cleanup queue in both cases
      logger.info('[redirect_url_kite_logger] cleaning up queues...');
      // cleanupQueues().catch(e => {
      //   console.log(e)
      // })
      await cleanupQueues();
      await cleanupTradesAndAccessToken();

      
      addToAncillaryQueue(user);
      addToCoSquareOff(user);
      

      // then store access token remotely for other services to use it
      //storeAccessTokenRemotely(user.session.access_token)
      storeAccessTokeninRedis(user.session.access_token!)
    }

    // then redirect
    res.redirect('/dashboard')
  } catch (error) {
    const { response: fetchResponse } = error
    res.status(fetchResponse?.status || 500).json(error.data)
  }
})
