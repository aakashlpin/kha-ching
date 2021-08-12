import { ATM_STRANGLE_TRADE } from '../../types/trade'
import { INSTRUMENTS, INSTRUMENT_DETAILS } from '../constants'
import console from '../logging'
import { EXIT_TRADING_Q_NAME } from '../queue'
import {
  attemptBrokerOrders,
  ensureMarginForBasketOrder,
  getCurrentExpiryTradingSymbol,
  getHedgeForStrike,
  getIndexInstruments,
  remoteOrderSuccessEnsurer,
  syncGetKiteInstance,
  TradingSymbolInterface
} from '../utils'
import { createOrder, getATMStraddle as getATMStrikes } from './atmStraddle'
import { doSquareOffPositions } from '../exit-strategies/autoSquareOff'
import dayjs from 'dayjs'
import { KiteOrder } from '../../types/kite'

const getStrangleStrikes = async (
  { atmStrike, instrument, inverted = false, distanceFromAtm = 1 }:
  { atmStrike: number, instrument: INSTRUMENTS, inverted?: boolean, distanceFromAtm?: number}
) => {
  const { nfoSymbol, strikeStepSize } = INSTRUMENT_DETAILS[
    instrument
  ]
  const lowerLegPEStrike = atmStrike - (distanceFromAtm * strikeStepSize)
  const higherLegCEStrike = atmStrike + (distanceFromAtm * strikeStepSize)

  const { tradingsymbol: LOWER_LEG_PE_STRING } = await getCurrentExpiryTradingSymbol({
    nfoSymbol,
    strike: lowerLegPEStrike,
    instrumentType: 'PE'
  }) as TradingSymbolInterface

  const { tradingsymbol: HIGHER_LEG_CE_STRING } = await getCurrentExpiryTradingSymbol({
    nfoSymbol,
    strike: higherLegCEStrike,
    instrumentType: 'CE'
  }) as TradingSymbolInterface

  const PE_STRING = !inverted ? LOWER_LEG_PE_STRING : HIGHER_LEG_CE_STRING.replace('CE', 'PE')
  const CE_STRING = !inverted ? HIGHER_LEG_CE_STRING : LOWER_LEG_PE_STRING.replace('PE', 'CE')

  return {
    peStrike: !inverted ? lowerLegPEStrike : higherLegCEStrike,
    ceStrike: !inverted ? higherLegCEStrike : lowerLegPEStrike,
    PE_STRING,
    CE_STRING
  }
}

async function atmStrangle (args: ATM_STRANGLE_TRADE) {
  try {
    const {
      instrument,
      inverted = false,
      lots,
      user,
      orderTag,
      rollback,
      isHedgeEnabled,
      hedgeDistance,
      distanceFromAtm,
      _nextTradingQueue = EXIT_TRADING_Q_NAME
    } = args
    const { lotSize, nfoSymbol, strikeStepSize, exchange, underlyingSymbol } = INSTRUMENT_DETAILS[instrument]

    const sourceData = await getIndexInstruments()

    const {
      atmStrike
    } = await getATMStrikes({
      ...args,
      takeTradeIrrespectiveSkew: true,
      instrumentsData: sourceData,
      startTime: dayjs(),
      expiresAt: dayjs().subtract(1, 'seconds').format(),
      underlyingSymbol,
      exchange,
      nfoSymbol,
      strikeStepSize
    } as any)

    const {
      peStrike,
      ceStrike,
      PE_STRING,
      CE_STRING
    } = await getStrangleStrikes({
      atmStrike,
      instrument,
      inverted,
      distanceFromAtm
    })

    const kite = syncGetKiteInstance(user)

    let allOrdersLocal: KiteOrder[] = []
    let hedgeOrdersLocal: KiteOrder[] = []
    let allOrders: KiteOrder[] = []

    if (isHedgeEnabled) {
      const hedges = [{ strike: peStrike, type: 'PE' }, { strike: ceStrike, type: 'CE' }]
      const [putHedge, callHedge] = await Promise.all(hedges.map(async ({ strike, type }) =>
        getHedgeForStrike({ strike, distance: hedgeDistance!, type, nfoSymbol })))

      hedgeOrdersLocal = [putHedge, callHedge].map(symbol => createOrder({ symbol, lots, lotSize, user: user!, orderTag: orderTag!, transactionType: kite.TRANSACTION_TYPE_BUY }))
      allOrdersLocal = [...hedgeOrdersLocal]
    }

    const orders = [PE_STRING, CE_STRING].map((symbol) => createOrder({ symbol, lots, lotSize, user: user!, orderTag: orderTag! }))
    allOrdersLocal = [...allOrdersLocal, ...orders]

    const hasMargin = await ensureMarginForBasketOrder(user, allOrdersLocal)
    if (!hasMargin) {
      throw new Error('insufficient margin')
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

    allOrders = [...allOrders, ...statefulOrders]

    return {
      _nextTradingQueue,
      rawKiteOrdersResponse: statefulOrders,
      squareOffOrders: allOrders
    }
  } catch (e) {
    console.log('🔴 strangle orders failed!', e)
    throw e
  }
}

export default atmStrangle
