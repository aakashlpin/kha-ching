// this file is a wrapper with defaults to be used in both API routes and `getServerSideProps` functions
import { withIronSession } from 'next-iron-session'
import dayjs from 'dayjs'
// NB: not the best place to require these
// ideally these should live in their own file that gets included as a middleware
import './queue-processor'
import './exit-strategies'
import './watchers'

export default function withSession (handler) {
  const hoursLefttill8:number=dayjs().get('hours')>8?(32- dayjs().get('hours')) * 60 * 60:(8- dayjs().get('hours')) * 60 * 60;
  return withIronSession(handler, {
    password: process.env.SECRET_COOKIE_PASSWORD!,
    cookieName: 'khaching/kite/session',
    cookieOptions: {
      // the next line allows to use the session in non-https environments like
      // Next.js dev mode (http://localhost:3000)
      secure: process.env.NODE_ENV === 'production',
      maxAge: hoursLefttill8// 1 day
    }
  })
}
