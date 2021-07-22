import axios from 'axios'
import dayjs from 'dayjs'

import console from '../logging'
import { addToNextQueue, EXIT_TRADING_Q_NAME, WATCHER_Q_NAME } from '../queue'
import {
  delay,
  getCompletedOrderFromOrderHistoryById,
  getLastOpenDateSince,
  getNearestCandleTime,
  getPercentageChange,
  ms,
  randomIntFromInterval,
  syncGetKiteInstance
} from '../utils'
import { doSquareOffPositions } from './autoSquareOff'

const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade'

export default async ({
  initialJobData,
  rawKiteOrdersResponse,
  optionInstrumentToken,
  hedgeOrderResponse
}) => {
  const { user, orderTag } = initialJobData
  try {
    const kite = syncGetKiteInstance(user)
    const [rawKiteOrderResponse] = rawKiteOrdersResponse
    // NB: rawKiteOrderResponse here is of pending SLM Order
    const orderHistory = await kite.getOrderHistory(rawKiteOrderResponse.order_id)
    const byRecencyOrderHistory = orderHistory.reverse()

    const isSlOrderCancelled = byRecencyOrderHistory.find((odr) => odr.status === 'CANCELLED')
    if (isSlOrderCancelled) {
      return Promise.resolve(
        '🔴 [minXPercentOrSupertrend] SL order cancelled! Khaching didn\'t cancel this.'
      )
    }

    const slTriggeredOrder = byRecencyOrderHistory.find((odr) => odr.status === 'COMPLETE')
    if (slTriggeredOrder) {
      if (hedgeOrderResponse) {
        // take off the hedge
        try {
          const hedgeOrder = await getCompletedOrderFromOrderHistoryById(
            kite,
            hedgeOrderResponse.order_id
          )
          // do this only if this buy position is still active
          await doSquareOffPositions([hedgeOrder], kite, initialJobData)
        } catch (e) {
          console.log('🔴 [minXPercentOrSupertrend] error taking out the hedge!', e)
        }
      }
      return Promise.resolve('SL triggered')
    }

    const triggerPendingOrder = byRecencyOrderHistory.find(
      (odr) => odr.status === 'TRIGGER PENDING'
    )
    const punchedTriggerPrice = triggerPendingOrder.trigger_price

    // 1. whenever this gets called - check supertrend value and the current punched in SL value
    // update pending order if supertrend value is lower

    const lastOpenDate = getLastOpenDateSince(dayjs()).format('YYYY-MM-DD')
    const nearestClosedCandleTime = getNearestCandleTime(5 * 60 * 1000).format(
      'YYYY-MM-DD HH:mm:ss'
    )

    const supertrendProps = {
      instrument_token: optionInstrumentToken,
      from_date: lastOpenDate,
      to_date: nearestClosedCandleTime,
      interval: '5minute',
      period: 10,
      multiplier: 3,
      latest_only: true
    }

    // create a random delay here of 0-30seconds
    // to prevent concurrent requests on signalx service
    // potentially causing delays for everyone anyways
    await delay(ms(randomIntFromInterval(0, 30)))

    console.log('[minXPercentOrSupertrend] ST request', supertrendProps)
    const { data: optionSuperTrend } = await axios.post(
      `${SIGNALX_URL}/api/indicator/supertrend`,
      supertrendProps,
      {
        headers: {
          'X-API-KEY': process.env.SIGNALX_API_KEY
        }
      }
    )

    console.log('[minXPercentOrSupertrend] ST response', optionSuperTrend)
    const [latestST] = optionSuperTrend.slice(-1)
    const { ST_10_3, STX_10_3 } = latestST
    const newST = Math.floor(ST_10_3)
    const newSL = Math.floor(Math.min(0.1 * newST, 10) + newST)
    if (
      // possible that the ST on option strike is still trending "up"
      STX_10_3 === 'down' &&
      newSL < punchedTriggerPrice &&
      getPercentageChange(punchedTriggerPrice, newSL) >= 3
    ) {
      try {
        const res = await kite.modifyOrder(
          triggerPendingOrder.variety,
          triggerPendingOrder.order_id,
          {
            trigger_price: newSL
          }
        )
        console.log(
          `🟢 [minXPercentOrSupertrend] SL modified from ${punchedTriggerPrice} to ${newSL}`,
          res
        )
      } catch (e) {
        console.error('🔴 [minXPercentOrSupertrend] error in modifyOrder', e)
        if (
          e.status === 'error' &&
          e.error_type === 'NetworkException' &&
          e.message === 'Maximum allowed order modifications exceeded.'
        ) {
          // cancel this order, place a new SL order and then trail that
          try {
            await kite.cancelOrder(triggerPendingOrder.variety, triggerPendingOrder.order_id)
            const exitOrder = {
              trigger_price: newSL,
              tradingsymbol: triggerPendingOrder.tradingsymbol,
              quantity: triggerPendingOrder.quantity,
              exchange: triggerPendingOrder.exchange,
              transaction_type: kite.TRANSACTION_TYPE_BUY,
              order_type: kite.ORDER_TYPE_SLM,
              product: triggerPendingOrder.product,
              tag: orderTag
            }
            const newExitOrder = await kite.placeOrder(kite.VARIETY_REGULAR, exitOrder)
            console.log(
              '[minXPercentOrSupertrend] placing new exit order',
              exitOrder,
              newExitOrder
            )
            const queueRes = await addToNextQueue(initialJobData, {
              __nextTradingQueue: EXIT_TRADING_Q_NAME,
              rawKiteOrdersResponse: [newExitOrder],
              optionInstrumentToken
            })

            await addToNextQueue(initialJobData, {
              __nextTradingQueue: WATCHER_Q_NAME,
              rawKiteOrderResponse: exitOrder
            })

            console.log('[minXPercentOrSupertrend] addToNextQueue', queueRes)

            return Promise.resolve(
              '🟢 [minXPercentOrSupertrend] Maximum allowed order modifications exceeded. Placed a new SL order and terminated this checker!'
            )
          } catch (e) {
            console.log(
              '🔴 [minXPercentOrSupertrend] error in cancelOrder or placeOrder or addToNextQueue',
              e
            )
            return Promise.resolve(
              '🔴 [minXPercentOrSupertrend] Maximum allowed order modifications exceeded. Failed to place new SL order!'
            )
          }
        }
      }
    }

    return Promise.reject('SL not triggered')
  } catch (e) {
    console.log('🔴 [minXPercentOrSupertrend] global caught error', e)
    return Promise.reject('[minXPercentOrSupertrend] global caught error. Will retry!')
  }
}
