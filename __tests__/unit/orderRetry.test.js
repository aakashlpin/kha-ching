import { ms, remoteOrderSuccessEnsurer, syncGetKiteInstance, withRemoteRetry } from '../../lib/utils'

jest.setTimeout(ms(60))

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

  await expect(withRemoteRetry(remoteFn, ms(2))).rejects.toThrow(Promise.TimeoutError)
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
    ensureOrderState: kite.STATUS_COMPLETE,
    retryEveryMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  console.log({ ensured })

  expect(ensured).toBe(false)
})

test('should handle `placeOrder` NetworkException and then find an existing completed order in broker system', async () => {
  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest.fn().mockRejectedValue({
      status: 'error',
      error_type: 'NetworkException'
    }),
    getOrders: jest.fn(() => Promise.resolve([{
      order_id: '210722200262556',
      status: 'COMPLETE',
      variety: 'regular',
      exchange: 'NFO',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      order_type: 'MARKET',
      transaction_type: 'SELL',
      validity: 'DAY',
      product: 'MIS',
      quantity: 250,
      tag: 'X0uE0cKR'
    }])).mockImplementationOnce(() => Promise.reject(new Error({
      status: 'error',
      error_type: 'NetworkException'
    }))),
    getOrderHistory: jest.fn().mockImplementation(() => Promise.resolve([{
      status: 'COMPLETE'
    }]))
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    __kite: kite,
    orderProps: {
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    },
    ensureOrderState: kite.STATUS_COMPLETE,
    retryEveryMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  console.log({ ensured })

  expect(ensured).toBe(true)
})

test('should handle `placeOrder` NetworkException, and then successfully retry when no such order exists with broker', async () => {
  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest.fn(() => Promise.resolve({
      order_id: '210722200262556'
    })).mockRejectedValueOnce({
      status: 'error',
      error_type: 'NetworkException'
    }),
    getOrders: jest.fn(() => Promise.resolve([])).mockImplementationOnce(() => Promise.reject(new Error({
      status: 'error',
      error_type: 'NetworkException'
    }))),
    getOrderHistory: jest.fn().mockImplementation(() => Promise.resolve([{
      status: 'COMPLETE'
    }]))
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    __kite: kite,
    orderProps: {
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    },
    ensureOrderState: kite.STATUS_COMPLETE,
    retryEveryMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  console.log({ ensured })

  expect(ensured).toBe(true)
})

test('should handle `placeOrder` NetworkException, and then successfully retry an existing REJECTED order', async () => {
  /**
   * steps:
   * 1. request - `.placeOrder` with props `p`; response NetworkException
   * 2. checks broker for orders and finds a matching order with props `p`
   * 3. finds that the status of this matching order is rejected
   * 4. places another order if attemptCount < retryAttempts
   * 5. ensures this order is COMPLETE
   */
  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest.fn(() => Promise.resolve({
      order_id: '210722200262556'
    })).mockRejectedValueOnce({
      status: 'error',
      error_type: 'NetworkException'
    }),
    getOrders: jest.fn(() => Promise.resolve([{
      order_id: '210722200262556',
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    }])).mockRejectedValueOnce([{
      order_id: '210722200262556',
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    }]),
    getOrderHistory: jest.fn().mockImplementation(() => Promise.resolve([{
      status: kite.STATUS_COMPLETE
    }])).mockRejectedValueOnce([{
      status: kite.STATUS_REJECTED
    }])
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    __kite: kite,
    orderProps: {
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    },
    ensureOrderState: kite.STATUS_COMPLETE,
    retryEveryMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  console.log({ ensured })

  expect(ensured).toBe(true)
})
