import { KiteOrder } from '../types/kite'

export interface allSettledInterface {
  status: string
  value: {
    successful: boolean
    response: KiteOrder
  }
}

export const allSettled = async (promises) => Promise.allSettled(promises)
