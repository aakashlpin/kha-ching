import { ms, remoteOrderSuccessEnsurer, syncGetKiteInstance, withRemoteRetry } from '../../lib/utils'

test('should retry failed remote response', async () => {
  const remoteFn = jest.fn()
    .mockResolvedValue(true)
    .mockRejectedValueOnce(new Error('Async error'))

  const res = await withRemoteRetry(remoteFn, ms(4))
  console.log({ res })
  expect(res).toEqual(true)
})

test('should fail after 2 seconds', async () => {
  const remoteFn = jest.fn()
    .mockResolvedValue(true)
    .mockRejectedValueOnce(new Error('Async error'))
    .mockRejectedValueOnce(new Error('Async error'))
    .mockRejectedValueOnce(new Error('Async error'))

  const res = await withRemoteRetry(remoteFn, ms(2))
  expect(res).toBe(undefined)
})

const user = JSON.parse(process.env.USER_SESSION)

test('should return true for successful order', async () => {
  jest.setTimeout(ms(60))

  const kite = syncGetKiteInstance(user)
  expect(kite).toBeDefined()

  kite.placeOrder = jest.fn().mockResolvedValue({
    order_id: '210722200439620'
  })

  const ensured = await remoteOrderSuccessEnsurer({
    __kite: kite,
    ensureOrderState: kite.STATUS_COMPLETE,
    orderProps: {},
    retryEveryMs: ms(1),
    retryAttempts: 5,
    user
  })

  expect(ensured).toBe(true)
})

test('should retry 3 times for orders that after punching continue to not exist, and then throw timeout', async () => {
  jest.setTimeout(ms(60))

  const kite = syncGetKiteInstance(user)
  expect(kite).toBeDefined()

  kite.placeOrder = jest.fn().mockResolvedValue({
    order_id: '21172220232443'
  })

  await expect(remoteOrderSuccessEnsurer({
    __kite: kite,
    ensureOrderState: kite.STATUS_COMPLETE,
    orderProps: {},
    retryEveryMs: ms(1),
    retryAttempts: 3,
    user
  })).rejects.toThrow('TIMEDOUT')
})

test('should return false when order history api check times out', async () => {
  jest.setTimeout(ms(15))

  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest.fn().mockResolvedValue({
      order_id: '21072220232443'
    }),
    getOrderHistory: jest.fn().mockImplementation(() => Promise.resolve([{
      status: 'VALIDATION PENDING'
    }]))
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    __kite: kite,
    orderProps: {},
    retryEveryMs: ms(1),
    retryAttempts: 5,
    user
  })

  console.log({ ensured })

  expect(ensured).toBe(false)
})
