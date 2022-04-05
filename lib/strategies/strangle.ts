import { ATM_STRANGLE_TRADE } from '../../types/trade'
import {
  BROKER,
  ERROR_STRINGS,
  EXPIRY_TYPE,
  INSTRUMENTS,
  INSTRUMENT_DETAILS,
  PRODUCT_TYPE,
  STRANGLE_ENTRY_STRATEGIES,
  VOLATILITY_TYPE
} from '../constants'
import console from '../logging'
import { EXIT_TRADING_Q_NAME } from '../queue'
import {
  apiResponseObject,
  attemptBrokerOrders,
  ensureMarginForBasketOrder,
  getExpiryTradingSymbol,
  getHedgeForStrike,
  getIndexInstruments,
  getStrikeByDelta,
  remoteOrderSuccessEnsurer,
  SIGNALX_URL,
  syncGetKiteInstance,
  TradingSymbolInterface
} from '../utils'
import { createOrder, getATMStraddle as getATMStrikes } from './atmStraddle'
import { doSquareOffPositions } from '../exit-strategies/autoSquareOff'
import dayjs, { Dayjs } from 'dayjs'
import { KiteOrder } from '../../types/kite'
import axios from 'axios'

export const getNearestContractDate = async (
  atmStrike: number,
  nfoSymbol: string
): Promise<Dayjs> => {
  const instrumentsData = await getIndexInstruments()
  const rows = instrumentsData
    .filter(
      item =>
        item.name === nfoSymbol &&
        Number(item.strike) === atmStrike &&
        item.instrument_type === 'PE'
    )
    .sort((row1, row2) =>
      dayjs(row1.expiry).isSameOrBefore(dayjs(row2.expiry)) ? -1 : 1
    )

  const [dataRow] = rows
  return dayjs(dataRow.expiry)
}

const getStrangleStrikes = async ({
  atmStrike,
  instrument,
  inverted = false,
  entryStrategy,
  distanceFromAtm = 1,
  deltaStrikes,
  expiryType
}: {
  atmStrike: number
  instrument: INSTRUMENTS
  inverted?: boolean
  entryStrategy: STRANGLE_ENTRY_STRATEGIES
  distanceFromAtm?: number
  deltaStrikes?: number
  expiryType?: EXPIRY_TYPE
}) => {
  const { nfoSymbol, strikeStepSize } = INSTRUMENT_DETAILS[instrument]

  let lowerLegPEStrike
  let higherLegCEStrike
  if (entryStrategy === STRANGLE_ENTRY_STRATEGIES.DELTA_STIKES) {
    const nearestContractDate = await getNearestContractDate(
      atmStrike,
      nfoSymbol
    )
    try {
      const { data: optionChain } = await axios.post(
        `${SIGNALX_URL}/api/data/option_chain`,
        {
          instrument,
          contract: nearestContractDate.format('DDMMMYYYY').toUpperCase()
        },
        {
          headers: {
            'X-API-KEY': process.env.SIGNALX_API_KEY
          }
        }
      )
      const strikes = getStrikeByDelta(deltaStrikes!, optionChain)
      const { putStrike, callStrike } = strikes as {
        putStrike: apiResponseObject
        callStrike: apiResponseObject
      }

      lowerLegPEStrike = putStrike.StrikePrice
      higherLegCEStrike = callStrike.StrikePrice
    } catch (e) {
      if (e.isAxiosError) {
        if (e.response.status === 401) {
          return Promise.reject(new Error(ERROR_STRINGS.PAID_FEATURE))
        }
        return Promise.reject(new Error(e.response.data))
      }
    }
  } else {
    lowerLegPEStrike = atmStrike - distanceFromAtm * strikeStepSize
    higherLegCEStrike = atmStrike + distanceFromAtm * strikeStepSize
  }

  const { tradingsymbol: LOWER_LEG_PE_STRING } = (await getExpiryTradingSymbol({
    nfoSymbol,
    strike: lowerLegPEStrike,
    instrumentType: 'PE',
    expiry: expiryType
  })) as TradingSymbolInterface

  const { tradingsymbol: HIGHER_LEG_CE_STRING } = (await getExpiryTradingSymbol(
    {
      nfoSymbol,
      strike: higherLegCEStrike,
      instrumentType: 'CE',
      expiry: expiryType
    }
  )) as TradingSymbolInterface

  const PE_STRING = !inverted
    ? LOWER_LEG_PE_STRING
    : HIGHER_LEG_CE_STRING.replace('CE', 'PE')
  const CE_STRING = !inverted
    ? HIGHER_LEG_CE_STRING
    : LOWER_LEG_PE_STRING.replace('PE', 'CE')

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
      inverted,
      lots,
      user,
      orderTag,
      rollback,
      isHedgeEnabled,
      hedgeDistance,
      deltaStrikes,
      entryStrategy = STRANGLE_ENTRY_STRATEGIES.DISTANCE_FROM_ATM,
      distanceFromAtm = 1,
      productType = PRODUCT_TYPE.MIS,
      volatilityType = VOLATILITY_TYPE.SHORT,
      expiryType,
      _nextTradingQueue = EXIT_TRADING_Q_NAME
    } = args
    const {
      lotSize,
      nfoSymbol,
      strikeStepSize,
      exchange,
      underlyingSymbol
    } = INSTRUMENT_DETAILS[instrument]

    const sourceData = await getIndexInstruments()

    const { atmStrike } = await getATMStrikes({
      ...args,
      takeTradeIrrespectiveSkew: true,
      instrumentsData: sourceData,
      startTime: dayjs(),
      expiresAt: dayjs()
        .subtract(1, 'seconds')
        .format(),
      underlyingSymbol,
      exchange,
      nfoSymbol,
      strikeStepSize,
      expiryType
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
      distanceFromAtm,
      entryStrategy,
      deltaStrikes,
      expiryType
    })

    const kite = syncGetKiteInstance(user, BROKER.KITE)

    let allOrdersLocal: KiteOrder[] = []
    let hedgeOrdersLocal: KiteOrder[] = []
    let allOrders: KiteOrder[] = []

    if (volatilityType === VOLATILITY_TYPE.SHORT && isHedgeEnabled) {
      const hedges = [
        { strike: peStrike, type: 'PE' },
        { strike: ceStrike, type: 'CE' }
      ]
      const [putHedge, callHedge] = await Promise.all(
        hedges.map(async ({ strike, type }) =>
          getHedgeForStrike({
            strike,
            distance: hedgeDistance!,
            type,
            nfoSymbol,
            expiryType
          })
        )
      )

      hedgeOrdersLocal = [putHedge, callHedge].map(symbol =>
        createOrder({
          symbol,
          lots,
          lotSize,
          user: user!,
          orderTag: orderTag!,
          transactionType: kite.TRANSACTION_TYPE_BUY,
          productType
        })
      )
      allOrdersLocal = [...hedgeOrdersLocal]
    }

    const orders = [PE_STRING, CE_STRING].map(symbol =>
      createOrder({
        symbol,
        lots,
        lotSize,
        user: user!,
        orderTag: orderTag!,
        productType,
        transactionType:
          volatilityType === VOLATILITY_TYPE.SHORT
            ? kite.TRANSACTION_TYPE_SELL
            : kite.TRANSACTION_TYPE_BUY
      })
    )

    allOrdersLocal = [...allOrdersLocal, ...orders]

    const hasMargin = await ensureMarginForBasketOrder(user, allOrdersLocal)
    if (!hasMargin) {
      throw new Error('insufficient margin')
    }

    if (hedgeOrdersLocal.length) {
      const hedgeOrdersPr = hedgeOrdersLocal.map(async order =>
        remoteOrderSuccessEnsurer({
          _kite: kite,
          orderProps: order,
          instrument,
          ensureOrderState: kite.STATUS_COMPLETE,
          user: user!
        })
      )

      const { allOk, statefulOrders } = await attemptBrokerOrders(hedgeOrdersPr)
      if (!allOk && rollback?.onBrokenHedgeOrders) {
        await doSquareOffPositions(statefulOrders, kite, {
          orderTag
        })

        throw Error('rolled back onBrokenHedgeOrders')
      }

      allOrders = [...statefulOrders]
    }

    const brokerOrdersPr = orders.map(async order =>
      remoteOrderSuccessEnsurer({
        _kite: kite,
        orderProps: order,
        instrument,
        ensureOrderState: kite.STATUS_COMPLETE,
        user: user!
      })
    )

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
      rawKiteOrdersResponse: statefulOrders,
      squareOffOrders: allOrders
    }
  } catch (e) {
    console.log('🔴 strangle orders failed!', e)
    throw e
  }
}

export default atmStrangle
