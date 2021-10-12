import axios from 'axios'
import dayjs from 'dayjs'
import { KiteOrder } from '../../types/kite'
import { SL_ORDER_TYPE } from '../../types/plans'
import { DIRECTIONAL_OPTION_SELLING_TRADE } from '../../types/trade'

import console from '../logging'
import { addToNextQueue, EXIT_TRADING_Q_NAME } from '../queue'
import {
  attemptBrokerOrders,
  getLastOpenDateSince,
  getNearestCandleTime,
  getPercentageChange,
  logDeep,
  remoteOrderSuccessEnsurer,
  syncGetKiteInstance,
  withRemoteRetry
} from '../utils'
import { doSquareOffPositions } from './autoSquareOff'
import { convertSlmToSll } from './individualLegExitOrders'

const SIGNALX_URL = process.env.SIGNALX_URL ?? 'https://indicator.signalx.trade'

export interface DOS_TRAILING_INTERFACE {
  initialJobData: DIRECTIONAL_OPTION_SELLING_TRADE
  rawKiteOrdersResponse: KiteOrder[]
  optionInstrumentToken: string
  hedgeOrderResponse: KiteOrder
}

async function minXPercentOrSupertrend ({
  initialJobData,
  rawKiteOrdersResponse,
  optionInstrumentToken,
  hedgeOrderResponse
}: DOS_TRAILING_INTERFACE): Promise<any> {
  const { user, orderTag, slLimitPricePercent = 1, instrument } = initialJobData
  const slOrderType = SL_ORDER_TYPE.SLL
  try {
    const kite = syncGetKiteInstance(user)
    const [rawKiteOrderResponse] = rawKiteOrdersResponse
    // NB: rawKiteOrderResponse here is of pending SLM Order
    const orderHistory: KiteOrder[] = await withRemoteRetry(() =>
      kite.getOrderHistory(rawKiteOrderResponse.order_id)
    )
    const byRecencyOrderHistory = orderHistory.reverse()

    const isSlOrderCancelled = byRecencyOrderHistory.find(
      odr => odr.status === 'CANCELLED'
    )
    if (isSlOrderCancelled) {
      return Promise.resolve('🔴 [minXPercentOrSupertrend] SL order cancelled!')
    }

    const slTriggeredOrder = byRecencyOrderHistory.find(
      odr => odr.status === 'COMPLETE'
    )
    if (slTriggeredOrder) {
      if (hedgeOrderResponse) {
        // take off the hedge
        try {
          await doSquareOffPositions([hedgeOrderResponse], kite, initialJobData)
        } catch (e) {
          console.log(
            '🔴 [minXPercentOrSupertrend] error taking out the hedge!',
            e
          )
        }
      }
      return Promise.resolve('SL triggered')
    }

    const triggerPendingOrder = byRecencyOrderHistory.find(
      odr => odr.status === 'TRIGGER PENDING'
    )
    const punchedTriggerPrice = (triggerPendingOrder as KiteOrder).trigger_price

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

    // console.log('[minXPercentOrSupertrend] ST request', supertrendProps)
    const { data: optionSuperTrend } = await withRemoteRetry(async () =>
      axios.post(`${SIGNALX_URL}/api/indicator/supertrend`, supertrendProps, {
        headers: {
          'X-API-KEY': process.env.SIGNALX_API_KEY
        }
      })
    )

    // console.log('[minXPercentOrSupertrend] ST response')
    // logDeep(optionSuperTrend)
    const [latestST] = optionSuperTrend.slice(-1)
    const { ST_10_3, STX_10_3 } = latestST
    const newST = Math.floor(ST_10_3)
    const newSL = Math.floor(Math.min(0.1 * newST, 10) + newST)
    const percentChange = getPercentageChange(punchedTriggerPrice!, newSL)
    // logDeep({ latestST, newSL, percentChange })

    // possible that the ST on option strike is still trending "up"
    if (
      !(
        STX_10_3 === 'down' &&
        newSL < punchedTriggerPrice! &&
        percentChange >= 3
      )
    ) {
      return Promise.reject(
        new Error('SL not triggered and no trailing required!')
      )
    }

    // console.log('should trail SL!')
    try {
      const sllOrderProps =
        slOrderType === SL_ORDER_TYPE.SLL
          ? convertSlmToSll(
              {
                transaction_type: kite.TRANSACTION_TYPE_BUY,
                trigger_price: newSL
              } as KiteOrder,
              slLimitPricePercent!,
              kite
            )
          : null
      const res = await kite.modifyOrder(
        triggerPendingOrder!.variety,
        triggerPendingOrder!.order_id,
        slOrderType === SL_ORDER_TYPE.SLL
          ? {
              trigger_price: sllOrderProps!.trigger_price,
              price: sllOrderProps!.price
            }
          : {
              trigger_price: newSL
            }
      )
      console.log(
        `🟢 [minXPercentOrSupertrend] SL modified from ${String(
          punchedTriggerPrice
        )} to ${newSL}`,
        res
      )
    } catch (e) {
      console.error('🔴 [minXPercentOrSupertrend] error in modifyOrder', e)
      if (
        e.status === 'error' &&
        e.error_type === 'NetworkException' &&
        e.message === 'Maximum allowed order modifications exceeded.'
      ) {
        // place a new SL order
        try {
          let exitOrder: KiteOrder = {
            trigger_price: newSL,
            tradingsymbol: triggerPendingOrder!.tradingsymbol,
            quantity: triggerPendingOrder!.quantity,
            exchange: triggerPendingOrder!.exchange,
            transaction_type: kite.TRANSACTION_TYPE_BUY,
            order_type: kite.ORDER_TYPE_SLM,
            product: triggerPendingOrder!.product,
            tag: orderTag!
          }

          if (slOrderType === SL_ORDER_TYPE.SLL) {
            exitOrder = convertSlmToSll(exitOrder, slLimitPricePercent!, kite)
          }

          const remoteOrder = remoteOrderSuccessEnsurer({
            ensureOrderState: 'TRIGGER PENDING',
            instrument,
            orderProps: exitOrder,
            user: user!
          })

          const { allOk, statefulOrders } = await attemptBrokerOrders([
            remoteOrder
          ])

          if (!allOk) {
            logDeep(statefulOrders)
            throw new Error(
              '[minXPercentOrSupertrend] replacement order failed!'
            )
          }

          // once replacement is ensured, cancel the existing order
          await withRemoteRetry(() =>
            kite.cancelOrder(
              triggerPendingOrder!.variety,
              triggerPendingOrder!.order_id
            )
          )

          const [newExitOrder] = statefulOrders

          console.log(
            '[minXPercentOrSupertrend] placed new exit order',
            exitOrder,
            newExitOrder
          )

          const queueRes = await addToNextQueue(initialJobData, {
            _nextTradingQueue: EXIT_TRADING_Q_NAME,
            rawKiteOrderResponse: newExitOrder,
            hedgeOrderResponse,
            optionInstrumentToken
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
    return Promise.reject(
      new Error('[minXPercentOrSupertrend] Rejecting to retry in next interval')
    )
  } catch (e) {
    console.log('🔴 [minXPercentOrSupertrend] global caught error', e)
    return Promise.reject(
      new Error('[minXPercentOrSupertrend] global caught error. Will retry!')
    )
  }
}

export default minXPercentOrSupertrend
