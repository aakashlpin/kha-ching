import withSession from '../../lib/session'
import { invesKite } from '../../lib/utils'
import { SignalXUser } from '../../types/misc'

const apiKey = process.env.KITE_API_KEY

export default withSession(async (req, res) => {
  const user: SignalXUser = req.session.get('user')
  const kc = invesKite;

  if (user) {
    try {
      // see if we're able to fetch profile with the access token
      // in case access token is expired, then log out the user
      const kcInstance = kc.getKC(user.session.access_token);
      await kcInstance.getProfile();

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
