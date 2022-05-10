import dayjs from 'dayjs'
import { KiteOrder } from '../types/kite'
import {  SUPPORTED_TRADE_CONFIG } from '../types/trade'
import { addToNextQueue, TARGETPNL_Q_NAME } from './queue'
import { USER_OVERRIDE,COMPLETED_BY_TAG } from './constants'
import console from './logging'

import { Promise } from 'bluebird'
import autoSquareOffStrat,{squareOffTag}  from './exit-strategies/autoSquareOff';
import {
  // logDeep,
  patchDbTrade,
  round,
  getInstrumentPrice,
  syncGetKiteInstance,
  withRemoteRetry,
  getTimeLeftInMarketClosingMs,
  isTimeAfterAutoSquareOff,
  getCompletedOrdersbyTag
} from './utils'

const targetPnL = async ({
  _kite,
  initialJobData,
    rawKiteOrdersResponse
  }:{
    _kite?:any,
    initialJobData: SUPPORTED_TRADE_CONFIG
    rawKiteOrdersResponse: KiteOrder []
  }) :Promise<any> =>
  {
    const {maxLossPoints,isMaxLossEnabled,orderTag,isMaxProfitEnabled,
      maxProfitPoints
    ,isAutoSquareOffEnabled,
    autoSquareOffProps:{time}={}} = initialJobData;


    if (getTimeLeftInMarketClosingMs() < 0 ||
    (isAutoSquareOffEnabled &&
      isTimeAfterAutoSquareOff(time!))) {
    return Promise.resolve(
      '🟢 [targetPnL] Terminating the targetPnl queue as market closing or after square off time..'
    )
  }
  const kite = _kite || syncGetKiteInstance(initialJobData.user)
  const completedOrders:COMPLETED_BY_TAG[]= await getCompletedOrdersbyTag(orderTag!, kite)

  const totalPoints=await completedOrders.reduce(async (prev,current)=>{
    let currentPosition=await (prev);
    if (current.quantity==0)
      currentPosition.points+=current.points;
    else
    {
      const underlyingLTP = await withRemoteRetry(async () =>
                getInstrumentPrice(kite,current.tradingsymbol, 'NFO'));
      currentPosition.points+=current.points+ (current.quantity>0?underlyingLTP:-1*underlyingLTP); 
      currentPosition.areAllOrdersCompleted=false;

    }
    return currentPosition;
  },Promise.resolve({points:0,
    areAllOrdersCompleted:true
    }));

    totalPoints.points=round(totalPoints.points);
  try {
    await patchDbTrade({
      id: initialJobData.id!,
      patchProps: {
        lastTargetAt: dayjs().format(),
        currentPoints:totalPoints.points
      }
    })
  } catch (error) {
    console.log('[targetPnL]error in patchDbTrade', error)
  }
  if (totalPoints.areAllOrdersCompleted)
        {
         console.log(`[targetPnL] ${orderTag} all orders are completed`);
         return Promise.resolve('[targetPnL] all orders are completed')
        }
  else if ((isMaxProfitEnabled && totalPoints.points>(maxProfitPoints!))
  ||
  (isMaxLossEnabled && totalPoints.points<-1*(maxLossPoints!)))
  {
    try{
        await squareOffTag(orderTag!, kite)
    }
    catch (error) {
      console.log('[targetPnL]error in squaring Off', error)

    }
    return Promise.resolve('[targetPnL] orders are squared off as loss/profit has been breached');
    //Square off the tag
  }
  else
  {
  const rejectMsg = `🟢[targetPnL] retry for tag: ${orderTag} Points: ${totalPoints.points} `;
    return Promise.reject(new Error(rejectMsg));
  }
  }
export default targetPnL;