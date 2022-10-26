import { OTS_TRADE } from '../../types/trade'
import {
  ERROR_STRINGS,
  EXPIRY_TYPE,
  INSTRUMENTS,
  INSTRUMENT_DETAILS,
  PRODUCT_TYPE,
  OTS_ENTRY_STRATEGIES,
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
  StrikeInterface,
  TradingSymbolInterface,
  getOHLC
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
  distanceFromAtm = 1,
  percentfromAtm=2,
  expiryType
}: {
  atmStrike: number
  instrument: INSTRUMENTS
  distanceFromAtm?: number
  percentfromAtm?:number
  expiryType?: EXPIRY_TYPE
}) => {
  const { nfoSymbol, strikeStepSize } = INSTRUMENT_DETAILS[instrument]

  const lowerLegPEStrike = atmStrike - distanceFromAtm * strikeStepSize
  const higherLegCEStrike= atmStrike + distanceFromAtm * strikeStepSize

  
   // lowerLegPEStrike
   // higherLegCEStrike 


  const { tradingsymbol: PE_STRING } = (await getExpiryTradingSymbol({
    nfoSymbol,
    strike: lowerLegPEStrike,
    instrumentType: 'PE',
    expiry: expiryType
  })) as TradingSymbolInterface

  const { tradingsymbol: CE_STRING } = (await getExpiryTradingSymbol(
    {
      nfoSymbol,
      strike: higherLegCEStrike,
      instrumentType: 'CE',
      expiry: expiryType
    }
  )) as TradingSymbolInterface

  return {
    peStrike:lowerLegPEStrike ,
    ceStrike: higherLegCEStrike,
    PE_STRING,
    CE_STRING
  }
}

async function overnightTrend (args: OTS_TRADE) {
  try {
    const {
      instrument,
      lots,
      user,
      orderTag,
      deltaStrikes,
      entryStrategy = OTS_ENTRY_STRATEGIES.DISTANCE_FROM_ATM,
      distanceFromAtm = 1,
      percentfromAtm,
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
    const tradingSymbol=INSTRUMENT_DETAILS[instrument].exchange+":"+INSTRUMENT_DETAILS[instrument].underlyingSymbol
    const sourceData = await getIndexInstruments()
    const kite = syncGetKiteInstance(user)
    const data=await getOHLC({kite,symbol:tradingSymbol,instrument});
    console.log(data);
    //const atmStrike=data.last_price
    const atmStrike =
      Math.round(Number(data.last_price) / strikeStepSize!) * strikeStepSize!
    console.log(`atm strike is ${atmStrike}`);
      let strike:number;
    if (data.trend==='CE')
    {
       strike=atmStrike + distanceFromAtm * strikeStepSize
    }
    else 
  {
      strike=atmStrike - distanceFromAtm * strikeStepSize
  }
      const { PE_STRING, CE_STRING } = (await getExpiryTradingSymbol({
        nfoSymbol,
        strike: strike,
        expiry: expiryType
      })) as StrikeInterface
      console.log(`Expiry ${expiryType} strikes: ${PE_STRING} & ${CE_STRING}`)
      
      const symbol=data.trend==='CE'?CE_STRING:PE_STRING
    
    let allOrdersLocal: KiteOrder[] = []
    const hedgeOrdersLocal: KiteOrder[] = []
    let allOrders: KiteOrder[] = []

    const orders:KiteOrder[]=[createOrder({
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
      })];
    
    
    allOrdersLocal = [...allOrdersLocal, ...orders]

    const hasMargin = await ensureMarginForBasketOrder(user, allOrdersLocal)
    if (!hasMargin) {
      throw new Error('insufficient margin')
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

    return {
      _nextTradingQueue,
      rawKiteOrdersResponse: statefulOrders,
      squareOffOrders: allOrders
    }
  } catch (e) {
    console.log('🔴 OTS orders failed!', e)
    throw e
  }
}

export default overnightTrend
