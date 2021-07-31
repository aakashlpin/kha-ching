import withSession from '../../lib/session'

export default withSession(async (req, res) => {
  const { access_token: requestToken, user_id: userId } = req.query

  if (!requestToken) {
    return res.status(401).send('Unauthorized')
  }

  if (userId !== process.env.FYERS_USER_ID) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const currentUserSessionData = req.session.get('user')
    const updatedSessionData = {
      ...currentUserSessionData,
      fyers: {
        access_token: requestToken
      }
    }
    req.session.set('user', updatedSessionData)
    await req.session.save()
    res.redirect('/dashboard')
  } catch (error) {
    const { response: fetchResponse } = error
    res.status(fetchResponse?.status || 500).json(error.data)
  }
})
