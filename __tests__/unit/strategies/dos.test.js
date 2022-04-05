import { when } from 'jest-when'
import { EXIT_STRATEGIES, INSTRUMENTS, BROKER } from '../../../lib/constants'
import directionalOptionSelling from '../../../lib/strategies/directionalOptionSelling'
import { ms, syncGetKiteInstance } from '../../../lib/utils'

jest.setTimeout(ms(3 * 60))

const user = JSON.parse(process.env.USER_SESSION)
const SIGNALX_URL = process.env.SIGNALX_URL
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')

// This sets the mock adapter on the default instance
const mockAxios = new MockAdapter(axios, { onNoMatch: 'passthrough' })

test('it should work without hedge order', async () => {
  let kite = syncGetKiteInstance(user, BROKER.KITE)

  expect(kite).toBeDefined()

  const getOrderHistoryMock = jest.fn()

  when(getOrderHistoryMock)
    .calledWith('slm order')
    .mockResolvedValue([
      {
        order_id: 'slm order',
        status: 'TRIGGER PENDING',
        variety: 'regular',
        exchange: 'NFO',
        tradingsymbol: 'BANKNIFTY2172234500PE',
        order_type: 'SL-M',
        trigger_price: 150,
        transaction_type: 'BUY',
        validity: 'DAY',
        product: 'MIS',
        quantity: 25,
        tag: 'X0uE0cKR'
      }
    ])

  when(getOrderHistoryMock)
    .calledWith('original order')
    .mockResolvedValue([
      {
        order_id: 'original order',
        status: kite.STATUS_COMPLETE,
        variety: 'regular',
        exchange: 'NFO',
        tradingsymbol: 'BANKNIFTY2172234500PE',
        order_type: 'MARKET',
        average_price: 100,
        transaction_type: 'SELL',
        validity: 'DAY',
        product: 'MIS',
        quantity: 25,
        tag: 'X0uE0cKR'
      }
    ])

  const placeOrderMock = jest.fn()
  when(placeOrderMock)
    .calledWith(
      expect.anything(),
      expect.objectContaining({ trigger_price: expect.any(Number) })
    )
    .mockResolvedValue({
      order_id: 'slm order'
    })

  when(placeOrderMock)
    .calledWith(
      expect.anything(),
      expect.not.objectContaining({ trigger_price: expect.any(Number) })
    )
    .mockResolvedValue({
      order_id: 'original order'
    })

  kite = {
    ...kite,
    placeOrder: placeOrderMock,
    getOrderHistory: getOrderHistoryMock
  }

  mockAxios.onPost(`${SIGNALX_URL}/api/indicator/supertrend`).reply(200, [
    {
      date: 1627033800000,
      open: 35062.85,
      high: 35067.25,
      low: 35002.35,
      close: 35012.7,
      volume: 127750,
      TR: 64.9,
      ATR_10: 46.480481764,
      ST_10_3: 34955.0356717531,
      STX_10_3: 'up'
    }
  ])

  const res = await directionalOptionSelling({
    _kite: kite,
    instrument: INSTRUMENTS.BANKNIFTY,
    exitStrategy: EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND,
    lots: 1,
    martingaleIncrementSize: 1,
    maxTrades: 2,
    slmPercent: 50,
    user,
    orderTag: 'X0uE0cKR'
  })

  console.log(JSON.stringify(res, null, 2))

  expect(res).toBeDefined()
})
