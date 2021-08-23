import axios from 'axios'
import { getNearestContract } from '../../lib/strategies/strangle'
import { getMultipleInstrumentPrices, getStrikeByDelta } from '../../lib/utils'

const user = JSON.parse(process.env.USER_SESSION)

test('it should fetch strikes by delta', async () => {
  const { data } = await axios.post('https://indicator.signalx.trade/api/data/option_chain', {
    instrument: 'NIFTY',
    contract: '18AUG2021'
  }, {
    headers: {
      'X-API-KEY': process.env.SIGNALX_API_KEY
    }
  })
  const strikes = getStrikeByDelta(15, data)
  console.log(strikes)
  expect(strikes).toHaveProperty('callStrike')
  expect(strikes).toHaveProperty('putStrike')
})

test('it should get nearest expiry contract', async () => {
  const res = await getNearestContract(16500, 'NIFTY')
  const contract = res.format('DDMMMYYYY')
  console.log(contract)
  expect(contract).toBeDefined()
})

test('it should return ltp of multiple instruments', async () => {
  const instruments = [{
    exchange: 'NFO',
    tradingSymbol: 'NIFTY21AUG16500CE'
  }, {
    exchange: 'NFO',
    tradingSymbol: 'NIFTY21AUG16500PE'
  }]
  const res = await getMultipleInstrumentPrices(instruments, user)
  console.log(res)
  expect(res).toBeDefined()
})
