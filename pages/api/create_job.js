import dayjs from 'dayjs'

import { EXIT_STRATEGIES, STRATEGIES_DETAILS } from '../../lib/constants'
import console from '../../lib/logging'
import { addToNextQueue, TRADING_Q_NAME } from '../../lib/queue'
import withSession from '../../lib/session'
import { isMarketOpen } from '../../lib/utils'

const MOCK_ORDERS = process.env.MOCK_ORDERS ? JSON.parse(process.env.MOCK_ORDERS) : false

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  const {
    instruments,
    runAt,
    runNow,
    strategy,
    exitStrategy,
    squareOffTime,
    expireIfUnsuccessfulInMins
  } = req.body

  if (STRATEGIES_DETAILS[strategy].premium && !process.env.SIGNALX_API_KEY?.length) {
    return res.status(401).send('Please upgrade to SignalX Premium to use this strategy!')
  }

  if (!MOCK_ORDERS && runNow && !isMarketOpen()) {
    return res.status(400).send('Market is closed right now!')
  }

  if (!MOCK_ORDERS && !runNow && runAt && !isMarketOpen(dayjs(runAt))) {
    return res.status(400).send('Market would be closed at your scheduled time!')
  }

  console.log('create job request', req.body)

  const addToQueueResponses = await Promise.all(
    instruments.map((instrument) =>
      addToNextQueue(
        {
          ...req.body,
          // reqCookies: req.cookies,
          instrument,
          user,
          autoSquareOffProps: squareOffTime
            ? {
                time: squareOffTime,
                deletePendingOrders: exitStrategy !== EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
              }
            : null,
          expiresAt: expireIfUnsuccessfulInMins
            ? dayjs(runNow ? new Date() : runAt)
                .add(expireIfUnsuccessfulInMins, 'minutes')
                .format()
            : null
        },
        {
          __nextTradingQueue: TRADING_Q_NAME
        }
      )
    )
  )

  res.json(addToQueueResponses)
})
