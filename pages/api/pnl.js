import axios from 'axios'
import dayjs from 'dayjs'
import withSession from '../../lib/session'
import advancedFormat from 'dayjs/plugin/advancedFormat'
dayjs.extend(advancedFormat)

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const { order_tag: orderTag } = req.query

    if (!orderTag) {
      return res.status(400).json({ error: 'expected orderTag in query' })
    }
    const day330=dayjs()
    .set('hour', 15)
    .set('minutes', 30)
    .set('seconds', 0)
    .format()
    if (dayjs().isBefore(dayjs(day330)))
    return res.json({ error: 'PnL not ready yet!' })

    const {data:{profit}}=await axios (
     `${process.env.ORCL_HOST_URL}/rest-v1/profits/${orderTag}`
    )
    console.log(`Profit from ORCL is:${profit} `)
    if (profit===null)
    {
      return res.json({ error: 'PnL not ready yet!' })
    }
    else
    res.json({ pnl: profit});
  } catch (e) {
    res.status(500).send(e)
  }
})
