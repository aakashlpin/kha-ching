import { ms, withRemoteRetry } from '../../lib/utils'

test('should retry failed remote response', async () => {
  const remoteFn = jest.fn()
    .mockResolvedValue(true)
    // .mockRejectedValueOnce(new Error('Async error'))

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
