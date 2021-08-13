import dayjs, { ConfigType } from 'dayjs'
import { KiteOrder } from '../../types/kite'
import { SignalXUser } from '../../types/misc'
import { ATM_STRADDLE_TRADE } from '../../types/trade'

import { INSTRUMENT_DETAILS, INSTRUMENT_PROPERTIES } from '../constants'
import { doSquareOffPositions } from '../exit-strategies/autoSquareOff'
import console from '../logging'
import { EXIT_TRADING_Q_NAME } from '../queue'
import {
  attemptBrokerOrders,
  delay,
  ensureMarginForBasketOrder,
  getCurrentExpiryTradingSymbol,
  getHedgeForStrike,
  getIndexInstruments,
  getInstrumentPrice,
  getSkew,
  ms,
  remoteOrderSuccessEnsurer,
  StrikeInterface,
  syncGetKiteInstance,
  withRemoteRetry
} from '../utils'
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore')

dayjs.extend(isSameOrBefore)

interface GET_ATM_STRADDLE_ARGS extends ATM_STRADDLE_TRADE, INSTRUMENT_PROPERTIES{
  startTime: ConfigType
  attempt?: number
  instrumentsData: [any]
}

export async function getATMStraddle (args: Partial<GET_ATM_STRADDLE_ARGS>): Promise<{
  PE_STRING: string
  CE_STRING: string
  atmStrike: number
}> {
  const {
    _kite,
    startTime,
    user,
    underlyingSymbol,
    exchange,
    nfoSymbol,
    strikeStepSize,
    maxSkewPercent,
    thresholdSkewPercent,
    takeTradeIrrespectiveSkew,
    expiresAt,
    attempt = 0
  } = args
  try {
    /**
     * getting a little smarter about skews
     *
     * if 50% time has elapsed, then start increasing skew % by weighing heavier towards thresholdSkewPercent
     * every passing equal split duration
     *
     * so for example - if skew checker is going to run for 10mins
     * and 5 mins have passed, divide the remaining time between equidistant buckets
     * so each fractional time remaining, keep gravitating towards thresholdSkewPercent
     * e.g. between 5-6min, skew = 50% * (maxSkewPercent) + 50% * (thresholdSkewPercent)
     * between 6-7min, skew = 40% * (maxSkewPercent) + 60% * (thresholdSkewPercent)
     * ...and so on and so forth
     *
     * and then eventually if the timer expires, then decide basis `takeTradeIrrespectiveSkew`
     */

    const kite = _kite || syncGetKiteInstance(user)
    const totalTime = dayjs(expiresAt).diff(startTime!)
    const remainingTime = dayjs(expiresAt).diff(dayjs())
    const timeExpired = dayjs().isAfter(dayjs(expiresAt))

    const fractionalTimeRemaining = remainingTime / totalTime
    const updatedSkewPercent = thresholdSkewPercent
      ? fractionalTimeRemaining >= 0.5
        ? maxSkewPercent
        : Math.round(
          fractionalTimeRemaining * maxSkewPercent! +
              (1 - fractionalTimeRemaining) * thresholdSkewPercent
        )
      : maxSkewPercent

    const underlyingLTP = await withRemoteRetry(async () => getInstrumentPrice(kite, underlyingSymbol!, exchange!))
    const atmStrike = Math.round(underlyingLTP / strikeStepSize!) * strikeStepSize!

    const { PE_STRING, CE_STRING } = await getCurrentExpiryTradingSymbol({
      nfoSymbol,
      strike: atmStrike
    }) as StrikeInterface

    // if time has expired
    if (timeExpired) {
      console.log(
        `🔔 [atmStraddle] time has run out! takeTradeIrrespectiveSkew = ${takeTradeIrrespectiveSkew!.toString()}`
      )
      if (takeTradeIrrespectiveSkew) {
        return {
          PE_STRING,
          CE_STRING,
          atmStrike
        }
      }

      return Promise.reject(new Error('[atmStraddle] time expired and takeTradeIrrespectiveSkew is false'))
    }

    // if time hasn't expired
    const { skew } = await withRemoteRetry(async () => getSkew(kite, PE_STRING, CE_STRING, 'NFO'))
    // if skew not fitting in, try again
    if (skew > updatedSkewPercent!) {
      console.log(
        `Retry #${
          attempt + 1
        }... Live skew (${skew as string}%) > Skew consideration (${String(updatedSkewPercent)}%)`
      )
      await delay(ms(2))
      return getATMStraddle({ ...args, attempt: attempt + 1 })
    }

    console.log(
      `[atmStraddle] punching with current skew ${String(skew)}%, and last skew threshold was ${String(updatedSkewPercent)}`
    )

    // if skew is fitting in, return
    return {
      PE_STRING,
      CE_STRING,
      atmStrike
    }
  } catch (e) {
    console.log('[getATMStraddle] exception', e)
    if (e?.error_type === 'NetworkException') {
      return getATMStraddle({ ...args, attempt: attempt + 1 })
    }
    return Promise.reject(e)
  }
}

export const createOrder = (
  { symbol, lots, lotSize, user, orderTag, transactionType }:
  { symbol: string, lots: number, lotSize: number, user: SignalXUser, orderTag: string, transactionType?: string }
): KiteOrder => {
  const kite = syncGetKiteInstance(user)
  return {
    tradingsymbol: symbol,
    quantity: lotSize * lots,
    exchange: kite.EXCHANGE_NFO,
    transaction_type: transactionType ?? kite.TRANSACTION_TYPE_SELL,
    order_type: kite.ORDER_TYPE_MARKET,
    product: kite.PRODUCT_MIS,
    validity: kite.VALIDITY_DAY,
    tag: orderTag
  }
}

async function atmStraddle ({
  _kite,
  instrument,
  lots,
  user,
  expiresAt,
  orderTag,
  rollback,
  maxSkewPercent,
  thresholdSkewPercent, // will be missing for existing plans
  takeTradeIrrespectiveSkew,
  isHedgeEnabled,
  hedgeDistance,
  _nextTradingQueue = EXIT_TRADING_Q_NAME
}: ATM_STRADDLE_TRADE): Promise<{
    _nextTradingQueue: string
    straddle: {}
    rawKiteOrdersResponse: KiteOrder[]
    squareOffOrders: KiteOrder[]
  } | undefined> {
  const kite = _kite || syncGetKiteInstance(user)

  const { underlyingSymbol, exchange, nfoSymbol, lotSize, strikeStepSize } = INSTRUMENT_DETAILS[
    instrument
  ]

  const instrumentsData = await getIndexInstruments()

  try {
    const straddle = await getATMStraddle({
      _kite,
      startTime: dayjs(),
      user,
      instrumentsData,
      underlyingSymbol,
      exchange,
      nfoSymbol,
      strikeStepSize,
      maxSkewPercent,
      thresholdSkewPercent,
      takeTradeIrrespectiveSkew,
      expiresAt
    })

    const { PE_STRING, CE_STRING, atmStrike } = straddle

    let allOrdersLocal: KiteOrder[] = []
    let hedgeOrdersLocal: KiteOrder[] = []
    let allOrders: KiteOrder[] = []

    if (isHedgeEnabled) {
      const [putHedge, callHedge] = await Promise.all(
        ['PE', 'CE'].map(async (type) => getHedgeForStrike({ strike: atmStrike, distance: hedgeDistance!, type, nfoSymbol }))
      )
      hedgeOrdersLocal = [putHedge, callHedge].map(symbol => createOrder({
        symbol, lots, lotSize, user: user!, orderTag: orderTag!, transactionType: kite.TRANSACTION_TYPE_BUY
      }))
      allOrdersLocal = [...hedgeOrdersLocal]
    }

    const orders: KiteOrder[] = [PE_STRING, CE_STRING].map((symbol) =>
      createOrder({ symbol, lots, lotSize, user: user!, orderTag: orderTag! })
    )

    allOrdersLocal = [...allOrdersLocal, ...orders]

    const hasMargin = await withRemoteRetry(async () => ensureMarginForBasketOrder(user, allOrdersLocal))
    if (!hasMargin) {
      throw Error('insufficient margin!')
    }

    if (hedgeOrdersLocal.length) {
      const hedgeOrdersPr = hedgeOrdersLocal.map(async (order) => remoteOrderSuccessEnsurer({
        _kite: kite,
        orderProps: order,
        ensureOrderState: kite.STATUS_COMPLETE,
        user: user!
      }))

      const { allOk, statefulOrders } = await attemptBrokerOrders(hedgeOrdersPr)
      if (!allOk && rollback?.onBrokenHedgeOrders) {
        await doSquareOffPositions(statefulOrders, kite, {
          orderTag
        })

        throw Error('rolled back onBrokenHedgeOrders')
      }

      allOrders = [...statefulOrders]
    }

    const brokerOrdersPr = orders.map(async (order) => remoteOrderSuccessEnsurer({
      _kite: kite,
      orderProps: order,
      ensureOrderState: kite.STATUS_COMPLETE,
      user: user!
    }))

    const { allOk, statefulOrders } = await attemptBrokerOrders(brokerOrdersPr)
    allOrders = [...allOrders, ...statefulOrders]
    if (!allOk && rollback?.onBrokenPrimaryOrders) {
      await doSquareOffPositions(allOrders, kite, {
        orderTag
      })

      throw Error('rolled back on onBrokenPrimaryOrders')
    }

    return {
      _nextTradingQueue,
      straddle,
      rawKiteOrdersResponse: statefulOrders,
      squareOffOrders: allOrders
    }
  } catch (e) {
    console.log(e)
    throw e
  }
}

export default atmStraddle
