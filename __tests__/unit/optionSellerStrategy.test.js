import { INSTRUMENTS } from '../../lib/constants'
import optionSellerOptionEntry from '../../lib/queue-processor/optionSellerStrategy/optionEntry'
import optionSellerEntryWatcher from '../../lib/queue-processor/optionSellerStrategy/optionEntryWatcher'
import { COMPLETED_ORDER_RESPONSE } from '../../lib/strategies/mockData/orderResponse'
import optionSellerStrategy from '../../lib/strategies/optionSellerStrategy'
import { syncGetKiteInstance } from '../../lib/utils'

const user = JSON.parse(process.env.USER_SESSION)
// jest.mock('kite')

test('Should fetch 15 min data', async () => {
  // const optionInstruments = await optionSellerStrategy({ instrument: INSTRUMENTS.NIFTY })
  // console.log({ optionInstruments })

  // const optionEvaluation = await Promise.all(optionInstruments.map(optionInstrument => optionSellerOptionEntry({ optionStrike: optionInstrument, initialJobData: { user, lots: 1, orderTag: 'dsasdad', instrument: INSTRUMENTS.NIFTY } })))

  const kite = syncGetKiteInstance(user)

  // console.log({ optionEvaluation })

  jest.spyOn(kite, 'getOrderHistory').mockImplementation(() => {
    return [COMPLETED_ORDER_RESPONSE]
  })

  jest.spyOn(kite, 'placeOrder').mockImplementation(() => {
    return {
      order_id: COMPLETED_ORDER_RESPONSE.order_id
    }
  })

  // expect(optionInstruments).toBeDefined()
  // expect(optionEvaluation).toBeDefined()

  optionSellerEntryWatcher({
    limitOrderAckId: COMPLETED_ORDER_RESPONSE.order_id,
    entryPrice: 5,
    slTriggerPrice: 7,
    watchForOrderState: 'COMPLETED',
    initialJobData: {
      user,
      orderTag: 'adasdad',
      instrument: INSTRUMENTS.NIFTY
    },
    addHedge: true
  })
})

// test('Should create message domain', () => {
//   const message = new Message(null, 'Some message', 'Some parsed message')

//   expect(message).toBeDefined()
// })

// test('Should messages be equal given they are the same', () => {
//   const messageOne = new Message(null, 'Some message', 'Some parsed message')
//   const messageTwo = new Message(null, 'Some message', 'Some parsed message')

//   expect(messageOne.equals(messageTwo)).toBe(true)
// })

// test('Should throw error given some required parameters are missing', () => {
//   const firstCreationAttempt = () => new Message()
//   const secondCreationAttempt = () => new Message(null, null)
//   const thirdCreationAttempt = () => new Message(null, null, null)

//   expect(firstCreationAttempt).toThrow('original is a required parameter')
//   expect(secondCreationAttempt).toThrow('parsed is a required parameter')
//   expect(thirdCreationAttempt).not.toThrow()
// })

// test('Should throw error if an attempt to alter attributes is fired', () => {
//   const message = new Message(null, 'Some message', 'Some parsed message')
//   const attempt = () => (message._original = 'Ops!')

//   expect(attempt).toThrow("Cannot assign to read only property '_original' of object '#<Message>'")
// })
