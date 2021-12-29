import dayjs from 'dayjs'
import { KiteOrder } from '../types/kite'
import {  SUPPORTED_TRADE_CONFIG } from '../types/trade'
import { addToNextQueue, TARGETPNL_Q_NAME } from './queue'
import { USER_OVERRIDE } from './constants'
import console from './logging'

import { Promise } from 'bluebird'
import autoSquareOffStrat  from './exit-strategies/autoSquareOff';
import {
  // logDeep,
  patchDbTrade,
  round,
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
    completedOrders:KiteOrder[]
 }

const targetPnL = async ({
    initialJobData,
    orders
  }:{
    initialJobData: SUPPORTED_TRADE_CONFIG
     orders: KiteOrder []
  }) :Promise<any> =>
  {
    const {maxLossPoints,isMaxLossEnabled,orderTag,isMaxProfitEnabled,maxProfitPoints} = initialJobData;
    const kite = syncGetKiteInstance(initialJobData.user)
    try{
     const totalPoints=await orders.reduce(async (acc,curentVal)=>
     {  
        const accm=await(acc);
        if (curentVal.status==='COMPLETE' && curentVal.transaction_type==='SELL')
        {
          accm.completedOrders.push(curentVal);
            accm.points+=curentVal.average_price!;
            //return {points:previousVal.average_price!+(curentVal.average_price!);
        }
        else if (curentVal.status==='COMPLETE' && curentVal.transaction_type==='BUY')
        {
          accm.completedOrders.push(curentVal);
            accm.points-=curentVal.average_price!;
           //return await(previousVal) - curentVal.average_price!;
        }
        else
        {
            const completedOrder= await getCompletedOrderFromOrderHistoryById(kite,curentVal.order_id);
            if (completedOrder===undefined)
            {
                const underlyingLTP = await withRemoteRetry(async () =>
                getInstrumentPrice(kite,curentVal.tradingsymbol, 'NFO')
              )
              accm.areAllOrdersCompleted=false;
              accm.points=accm.points+(curentVal.transaction_type==='SELL'?underlyingLTP:-underlyingLTP);
              accm.pendingorders.push(curentVal);
            }
            else{
                accm.points=accm.points+ (completedOrder.transaction_type==='SELL'?
                completedOrder.average_price:-completedOrder.average_price);
                accm.completedOrders.push(completedOrder);
            }
        }
        return accm;
        },Promise.resolve(<totalPointsInterface>{points:0,
            areAllOrdersCompleted:true,
            pendingorders:[],
            completedOrders:[]
            })
        );
        totalPoints.points=round(totalPoints.points);
    
        console.log(`[targetPnL] Points: ${totalPoints.points} for tag:  ${orderTag} `);
        try {
          await patchDbTrade({
            id: initialJobData.id!,
            patchProps: {
              lastHeartbeatAt: dayjs().format(),
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
        else if (totalPoints.completedOrders.length>orders.filter(order => order.status==='COMPLETE').length)
        {
          console.log(`[targetPnL] Points: ${totalPoints.points} for tag:  ${orderTag} ; Adding to queue again`);
          await addToNextQueue(initialJobData, {
            _nextTradingQueue: TARGETPNL_Q_NAME,
             orders:totalPoints.completedOrders
          });

          return Promise.resolve('[targetPnL] Some more orders are completed')
        }
        else if (isMaxLossEnabled && totalPoints.points<-1*(maxLossPoints!))
        {
            await autoSquareOffStrat({rawKiteOrdersResponse:totalPoints.pendingorders,
                                      deletePendingOrders:true,
                                      initialJobData});
            // await doDeletePendingOrders(totalPoints.pendingorders, kite)
            // await doSquareOffPositions(totalPoints.pendingorders, kite,
            //      {orderTag:initialJobData.orderTag})
            console.log(`[targetPnL] ${orderTag} squared off as max loss is breached`);
           return Promise.resolve('[targetPnL] squared off')
        }
        else if (isMaxProfitEnabled && totalPoints.points>(maxProfitPoints!))   {
          await autoSquareOffStrat({rawKiteOrdersResponse:totalPoints.pendingorders,
                                    deletePendingOrders:true,
                                    initialJobData});
          // await doDeletePendingOrders(totalPoints.pendingorders, kite)
          // await doSquareOffPositions(totalPoints.pendingorders, kite,
          //      {orderTag:initialJobData.orderTag})
          console.log(`[targetPnL] squared off ${orderTag} as max profit is reached`);
         return Promise.resolve('[targetPnL] squared off')
      }
        else
        {
          const rejectMsg = `🟢('[targetPnL] retry for tag: ${orderTag} Points: ${totalPoints.points} ')`;
          return Promise.reject(new Error(rejectMsg));
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