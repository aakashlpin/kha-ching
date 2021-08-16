// this file is a wrapper with defaults to be used in both API routes and `getServerSideProps` functions
import { withIronSession } from 'next-iron-session'
// NB: not the best place to require these
// ideally these should live in their own file that gets included as a middleware
import './queue-processor'
import './exit-strategies'
import './watchers'

export default function withSession (handler) {
  return withIronSession(handler, {
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
