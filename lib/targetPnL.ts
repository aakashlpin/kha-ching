import { KiteOrder } from '../types/kite'
import {
  ATM_STRADDLE_TRADE,
  ATM_STRANGLE_TRADE,
  SUPPORTED_TRADE_CONFIG
} from '../types/trade'
import { USER_OVERRIDE } from './constants'
import console from './logging'

import { Promise } from 'bluebird'
import { doDeletePendingOrders, doSquareOffPositions } from './exit-strategies/autoSquareOff';
import {
  // logDeep,
  patchDbTrade,
  remoteOrderSuccessEnsurer,
  getInstrumentPrice,
  syncGetKiteInstance,
  getCompletedOrderFromOrderHistoryById,
  withRemoteRetry,
  logDeep
} from './utils'
interface totalPointsInterface { 
    points:number, 
    areAllOrdersCompleted:boolean, 
    pendingorders:KiteOrder[]
 }

const targetPnL = async ({
    initialJobData,
    orders
  }:{
    initialJobData: SUPPORTED_TRADE_CONFIG
     orders: KiteOrder []
  }) :Promise<any> =>
  {

    console.log(`[targetPnL] Number of orders=${orders.length} and tag=${initialJobData.orderTag}`)
    const kite = syncGetKiteInstance(initialJobData.user)
    try{
     const totalPoints=await orders.reduce(async (acc,curentVal)=>
     {  
        const accm=await(acc);
        if (curentVal.status==='COMPLETE' && curentVal.transaction_type==='SELL')
        {
            accm.points+=curentVal.average_price!;
            //return {points:previousVal.average_price!+(curentVal.average_price!);
        }
        else if (curentVal.status==='COMPLETE' && curentVal.transaction_type==='BUY')
        {
            accm.points-=curentVal.average_price!;
           //return await(previousVal) - curentVal.average_price!;
        }
        else
        {
            const getCompletedOder= await getCompletedOrderFromOrderHistoryById(kite,curentVal.order_id);
            if (getCompletedOder===undefined)
            {
                const underlyingLTP = await withRemoteRetry(async () =>
                getInstrumentPrice(kite,curentVal.tradingsymbol, 'NFO')
              )
              accm.areAllOrdersCompleted=false;
              accm.points=accm.points+(curentVal.transaction_type==='SELL'?underlyingLTP:-underlyingLTP);
              accm.pendingorders.push(curentVal);
            }
            else{
                accm.points=accm.points+ (getCompletedOder.transaction_type==='SELL'?
                            getCompletedOder.average_price:-getCompletedOder.average_price);
            }
        }
        return accm;
        },Promise.resolve(<totalPointsInterface>{points:0,
            areAllOrdersCompleted:true,
            pendingorders:[]
            })
        );
        logDeep(totalPoints);
        if (totalPoints.areAllOrdersCompleted)
        {
         console.log('[targetPnL] all orders are completed');
         return Promise.resolve('[targetPnL] all orders are completed')
        }
        else if (totalPoints.points<-1*(initialJobData.maxLossPoints!))
        {
            await doDeletePendingOrders(totalPoints.pendingorders, kite)
            await doSquareOffPositions(totalPoints.pendingorders, kite,
                 {orderTag:initialJobData.orderTag})
            console.log('[targetPnL] squared off as points are breached');
           return Promise.resolve('[targetPnL] squared off')
        }
        else
        {
          console.log('[targetPnL] retry after somtime');
           return  Promise.reject('[targetPnL] retry after sometime') 
        }
    
    }
    catch (e)
    {
        console.log(e.message,"🔴 [targetPnL] error in exception block")
        return Promise.resolve(
            `🔴 [targetPnL] error in exception block `
        )
    }
  }
export default targetPnL;