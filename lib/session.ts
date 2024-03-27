// this file is a wrapper with defaults to be used in both API routes and `getServerSideProps` functions
import { withIronSession } from 'next-iron-session'
import { KiteConnect } from 'kiteconnect'
// NB: not the best place to require these
// ideally these should live in their own file that gets included as a middleware
import './queue-processor'
import './exit-strategies'
import './watchers'
import { setUserSession, premiumAuthCheck } from './utils'
import { KiteProfile } from '../types/kite'

const withAdminCheck = handler => {
  return async function withAdminWrapper (req, res) {
    const sxApiKey = req.headers['signalx-api-key']
    const kiteApiKey = req.headers['signalx-kite-key']
    const kiteAccessToken = req.headers['signalx-kite-token']

    if (!sxApiKey && !kiteApiKey) {
      // UI based flow
      return handler(req, res)
    }

    // for premium and club users
    let validSxUser = false
    try {
      validSxUser = await premiumAuthCheck()
    } catch (e) {
      validSxUser = false
    }

    // block intrusion
    if (!validSxUser) {
      return handler(req, res)
    }

    if (!kiteAccessToken) {
      // sx admin work, no broker authorization
      await setUserSession(req, {} as KiteProfile)
    } else {
      console.log(
        'key and token found in headers. attempting to connect kite and save session'
      )
      try {
        const kc = new KiteConnect({
          api_key: kiteApiKey,
          access_token: kiteAccessToken
        })

        const kiteProfile = await kc.getProfile()
        await setUserSession(req, {
          access_token: kiteAccessToken,
          ...kiteProfile
        })
        console.log('session generated from headers')
        return handler(req, res)
      } catch (error) {
        console.log(error)
        return res
          .status(403)
          .send('Forbidden. Unauthorized key or token provided')
      }
    }
  }
}

export default function withSession (handler) {
  return withIronSession(withAdminCheck(handler), {
    password: process.env.SECRET_COOKIE_PASSWORD!,
    cookieName: 'khaching/kite/session',
    cookieOptions: {
      // the next line allows to use the session in non-https environments like
      // Next.js dev mode (http://localhost:3000)
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1 * 24 * 60 * 60 // 1 day
    }
  })
}
