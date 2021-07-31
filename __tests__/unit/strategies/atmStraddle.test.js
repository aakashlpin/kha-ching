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
    placeOrder: jest.fn().mockResolvedValueOnce({
      order_id: '45834234213'
    }).mockResolvedValueOnce({
      order_id: '12321312312'
    }),
    getOrderHistory: jest.fn().mockImplementation(() => Promise.resolve([{
      status: kite.STATUS_COMPLETE
    }]))
  }

  // const orderTag = nanoid()
  const res = await atmStraddle({
    __kite: kite,
    instrument: INSTRUMENTS.NIFTY,
    lots: 1,
    user,
    expiresAt: dayjs().add(1, 'minutes').format(),
    orderTag: 'asdsad',
    maxSkewPercent: 10,
    thresholdSkewPercent: 30,
    takeTradeIrrespectiveSkew: true
  })

  console.log(JSON.stringify(res, null, 2))

  expect(res).toHaveProperty('__nextTradingQueue')
  expect(res).toHaveProperty('straddle')
  expect(res).toHaveProperty('rawKiteOrdersResponse')
})
