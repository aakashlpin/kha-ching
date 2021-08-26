import dayjs from 'dayjs'
import { INSTRUMENTS } from '../../../lib/constants'
import atmStraddle from '../../../lib/strategies/atmStraddle'
import { ms, syncGetKiteInstance } from '../../../lib/utils'

jest.setTimeout(ms(3 * 60))

const user = JSON.parse(process.env.USER_SESSION)

test('it should work when everything is okay', async () => {
  let kite = syncGetKiteInstance(user)

  expect(kite).toBeDefined()

  kite = {
    ...kite,
    placeOrder: jest.fn().mockResolvedValue({
      order_id: '45834234213'
    }),
    getOrderHistory: jest.fn().mockImplementation(async () =>
      Promise.resolve([
        {
          status: kite.STATUS_COMPLETE
        }
      ])
    )
  }

  // const orderTag = nanoid()
  const res = await atmStraddle({
    _kite: kite,
    instrument: INSTRUMENTS.NIFTY,
    lots: 1,
    user,
    expiresAt: dayjs()
      .add(1, 'minutes')
      .format(),
    orderTag: 'alKOiwR2',
    maxSkewPercent: 60,
    thresholdSkewPercent: 100,
    takeTradeIrrespectiveSkew: true,
    isHedgeEnabled: false,
    hedgeDistance: 500
  })

  console.log(JSON.stringify(res, null, 2))

  expect(res).toHaveProperty('_nextTradingQueue')
  expect(res).toHaveProperty('straddle')
  expect(res).toHaveProperty('rawKiteOrdersResponse')
})
