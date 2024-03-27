// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { KiteConnect } from 'kiteconnect'

import withSession from '../../lib/session'
import getInvesBrokerInstance from '../../lib/invesBroker'
import { BrokerName } from 'inves-broker'

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    const invesBrokerInstance = await getInvesBrokerInstance(BrokerName.KITE)
    return res.redirect(await invesBrokerInstance.getLoginURL({}))
  }

  return res.redirect('/dashboard')
})
