import {
  attemptBrokerOrders,
  finiteStateChecker,
  ms,
  remoteOrderSuccessEnsurer,
  syncGetKiteInstance,
  withRemoteRetry
} from '../../lib/utils'
import { Promise } from 'bluebird'
import { INSTRUMENTS } from '../../lib/constants'

jest.setTimeout(ms(60))

test('should retry failed remote response', async () => {
  const remoteFn = jest
    .fn()
    .mockResolvedValue(true)
    .mockRejectedValueOnce(new Error('Async error'))

  const res = await withRemoteRetry(remoteFn, ms(4))
  console.log({ res })
  expect(res).toEqual(true)
})

test('should fail after 2 seconds', async () => {
  const remoteFn = jest
    .fn()
    .mockResolvedValue(true)
    .mockRejectedValueOnce(new Error('2 sec error'))
    .mockRejectedValueOnce(new Error('2 sec error'))
    .mockRejectedValueOnce(new Error('2 sec error'))

  await expect(withRemoteRetry(remoteFn, ms(2))).rejects.toThrow(
    Promise.TimeoutError
  )
})

const user = JSON.parse(process.env.USER_SESSION)

test('should return true for successful order', async () => {
  jest.setTimeout(ms(60))

  const kite = syncGetKiteInstance(user)
  expect(kite).toBeDefined()

  kite.placeOrder = jest.fn().mockResolvedValue({
    order_id: '210827200359595'
  })

  // kite.getOrderHistory = jest.fn().mockImplementation(() =>
  //   Promise.resolve([
  //     {
  //       status: kite.STATUS_COMPLETE
  //     }
  //   ])
  // )

  const ensured = await remoteOrderSuccessEnsurer({
    _kite: kite,
    ensureOrderState: kite.STATUS_COMPLETE,
    orderProps: {
      quantity: 200
    },
    onFailureRetryAfterMs: ms(1),
    retryAttempts: 5,
    orderStatusCheckTimeout: ms(5),
    remoteRetryTimeout: ms(5),
    instrument: INSTRUMENTS.NIFTY,
    user
  })

  console.log(ensured)

  // expect(ensured).toStrictEqual({
  //   response: { status: kite.STATUS_COMPLETE },
  //   successful: true
  // })
})
test('should retry 3 times for orders that after punching continue to not exist, and then throw timeout', async () => {
  jest.setTimeout(ms(60))

  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest.fn().mockRejectedValue({
      status: 'error',
      error_type: 'NetworkException'
    }),
    getOrders: jest.fn().mockResolvedValue([])
  }

  expect(kite).toBeDefined()
  try {
    remoteOrderSuccessEnsurer({
      _kite: kite,
      ensureOrderState: kite.STATUS_COMPLETE,
      orderProps: {},
      onFailureRetryAfterMs: ms(5),
      retryAttempts: 3,
      orderStatusCheckTimeout: ms(5),
      remoteRetryTimeout: ms(5),
      user
    })
  } catch (error) {
    expect(error).toBe(Promise.TimeoutError)
  }
})

test('should return false when order history api check times out', async () => {
  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest.fn().mockResolvedValue({
      order_id: '21072220232443'
    }),
    getOrderHistory: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          status: 'VALIDATION PENDING'
        }
      ])
    )
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    _kite: kite,
    orderProps: {},
    ensureOrderState: kite.STATUS_COMPLETE,
    onFailureRetryAfterMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  console.log({ ensured })

  expect(ensured).toStrictEqual({
    response: { order_id: '21072220232443' },
    successful: false
  })
})

test('should handle `placeOrder` NetworkException and then find an existing completed order in broker system', async () => {
  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest.fn().mockRejectedValue({
      status: 'error',
      error_type: 'NetworkException'
    }),
    getOrders: jest
      .fn(() =>
        Promise.resolve([
          {
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
          }
        ])
      )
      .mockImplementationOnce(() =>
        Promise.reject(
          new Error({
            status: 'error',
            error_type: 'NetworkException'
          })
        )
      ),
    getOrderHistory: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          status: 'COMPLETE'
        }
      ])
    )
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    _kite: kite,
    orderProps: {
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    },
    remoteRetryTimeout: ms(15),
    ensureOrderState: kite.STATUS_COMPLETE,
    onFailureRetryAfterMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  expect(ensured).toStrictEqual({
    successful: true,
    response: { status: 'COMPLETE' }
  })
})

test('should handle `placeOrder` NetworkException, and then successfully retry when no such order exists with broker', async () => {
  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest
      .fn(() =>
        Promise.resolve({
          order_id: '210722200262556'
        })
      )
      .mockRejectedValueOnce({
        status: 'error',
        error_type: 'NetworkException'
      }),
    getOrders: jest
      .fn(() => Promise.resolve([]))
      .mockImplementationOnce(() =>
        Promise.reject(
          new Error({
            status: 'error',
            error_type: 'NetworkException'
          })
        )
      ),
    getOrderHistory: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          status: 'COMPLETE'
        }
      ])
    )
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    _kite: kite,
    orderProps: {
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    },
    ensureOrderState: kite.STATUS_COMPLETE,
    onFailureRetryAfterMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  console.log({ ensured })

  expect(ensured).toStrictEqual({
    response: { status: 'COMPLETE' },
    successful: true
  })
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
    placeOrder: jest
      .fn(() =>
        Promise.resolve({
          order_id: '210722200262556'
        })
      )
      .mockRejectedValueOnce({
        status: 'error',
        error_type: 'NetworkException'
      }),
    getOrders: jest
      .fn(() =>
        Promise.resolve([
          {
            order_id: '210722200262556',
            orderTag: 'X0uE0cKR',
            tradingsymbol: 'BANKNIFTY2172234500PE',
            quantity: 250,
            product: 'MIS',
            transaction_type: 'SELL',
            exchange: 'NFO'
          }
        ])
      )
      .mockRejectedValueOnce([
        {
          order_id: '210722200262556',
          orderTag: 'X0uE0cKR',
          tradingsymbol: 'BANKNIFTY2172234500PE',
          quantity: 250,
          product: 'MIS',
          transaction_type: 'SELL',
          exchange: 'NFO'
        }
      ]),
    getOrderHistory: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve([
          {
            status: kite.STATUS_COMPLETE
          }
        ])
      )
      .mockRejectedValueOnce([
        {
          status: kite.STATUS_REJECTED
        }
      ])
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    _kite: kite,
    orderProps: {
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    },
    ensureOrderState: kite.STATUS_COMPLETE,
    onFailureRetryAfterMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  console.log({ ensured })

  expect(ensured).toStrictEqual({
    response: { status: 'COMPLETE' },
    successful: true
  })
})

test('finiteStateChecker should work', async () => {
  const infinitePr = new Promise((resolve, reject, onCancel) => {
    let cancelled = false
    const fn = async () => {
      if (!cancelled) {
        console.log('hello world')
        await Promise.delay(ms(2))
        return fn()
      }
    }

    onCancel(() => {
      cancelled = true
    })

    fn()
  })

  const finitePr = finiteStateChecker(infinitePr, ms(10))
  await expect(finitePr).rejects.toThrow(Promise.TimeoutError)
})

test('attemptBrokerOrders should work', async () => {
  const pr1 = Promise.resolve({
    successful: true,
    response: {
      hello: 'world'
    }
  })
  const pr2 = Promise.resolve({
    successful: true,
    response: {
      hello: 'world2'
    }
  })

  const res = await attemptBrokerOrders([pr1, pr2])
  console.log(res)
})

test('freeze qty should work', async () => {
  let kite = syncGetKiteInstance(user)
  kite = {
    ...kite,
    placeOrder: jest.fn(() =>
      Promise.resolve({
        order_id: '210722200262556'
      })
    ),
    getOrders: jest.fn(() =>
      Promise.resolve([
        {
          order_id: '210722200262556',
          orderTag: 'X0uE0cKR',
          tradingsymbol: 'BANKNIFTY2172234500PE',
          quantity: 250,
          product: 'MIS',
          transaction_type: 'SELL',
          exchange: 'NFO'
        }
      ])
    ),
    getOrderHistory: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          status: kite.STATUS_COMPLETE
        }
      ])
    )
  }

  expect(kite).toBeDefined()

  const ensured = await remoteOrderSuccessEnsurer({
    _kite: kite,
    instrument: INSTRUMENTS.BANKNIFTY,
    orderProps: {
      orderTag: 'X0uE0cKR',
      tradingsymbol: 'BANKNIFTY2172234500PE',
      quantity: 250,
      product: 'MIS',
      transaction_type: 'SELL',
      exchange: 'NFO'
    },
    ensureOrderState: kite.STATUS_COMPLETE,
    onFailureRetryAfterMs: ms(1),
    retryAttempts: 2,
    orderStatusCheckTimeout: ms(5),
    user
  })

  console.log({ ensuredRes: ensured.response })

  expect(ensured).toBeDefined()

  // expect(ensured).toStrictEqual({
  //   response: { status: 'COMPLETE' },
  //   successful: true
  // })
})
