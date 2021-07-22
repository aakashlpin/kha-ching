import withSession from '../../../lib/session'

const fyers = require('fyers-api')

// For Process

const app_id = process.env.FYERS_API_ID
const app_secret = process.env.FYERS_SECRET_ID
const user_id = process.env.FYERS_USER_ID

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).end()
  }

  const reqBody = { app_id, secret_key: app_secret }

  const result = await fyers.auth(reqBody)
  console.log(result)
  const redirectUrl = fyers.generateToken(user_id)

  res.redirect(redirectUrl)
})
