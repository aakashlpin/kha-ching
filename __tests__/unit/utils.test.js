import axios from 'axios'
import { getStrikeByDelta } from '../../lib/utils'

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
