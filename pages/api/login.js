// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import withSession from '../../lib/session'
import { invesKite } from '../../lib/utils'

export default withSession(async (req, res) => {
  const user = req.session.get('user');
  const kc = invesKite.getKC(user?.session?.access_token);

  if (!user) {
    return res.redirect(kc.getLoginURL())
  }

  return res.redirect('/dashboard')
})
