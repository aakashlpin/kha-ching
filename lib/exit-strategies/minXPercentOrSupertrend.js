import axios from 'axios';
import dayjs from 'dayjs';

import { addToNextQueue, EXIT_TRADING_Q_NAME } from '../queue';
import {
  getLastOpenDateSince,
  getPercentageChange,
  getTimeLeftInMarketClosingMs,
  syncGetKiteInstance
} from '../utils';

const SIGNALX_URL = process.env.SIGNALX_URL || 'https://indicator.signalx.trade';

export default async ({ initialJobData, rawKiteOrdersResponse, optionInstrumentToken }) => {
  const { user, lots = 1, martingaleIncrementSize = 0, remainingAttempts = 0 } = initialJobData;
  try {
    const kite = syncGetKiteInstance(user);
    const [rawKiteOrderResponse] = rawKiteOrdersResponse;
    // NB: rawKiteOrderResponse here is of pending SLM Order
    const orderHistory = await kite.getOrderHistory(rawKiteOrderResponse.order_id);
    const byRecencyOrderHistory = orderHistory.reverse();

    const isSlOrderCancelled = byRecencyOrderHistory.find((odr) => odr.status === 'CANCELLED');
    if (isSlOrderCancelled) {
      return Promise.resolve(
        `🔴 [minXPercentOrSupertrend] SL order cancelled! Khaching didn't cancel this.`
      );
    }

    const slTriggeredOrder = byRecencyOrderHistory.find((odr) => odr.status === 'COMPLETE');
    if (slTriggeredOrder) {
      // if the SL exit order is completed - we need to punch in another order as per maxTradesPerDay
      // 1. terminate this checker
      // 2. place another order for the same strategy with new lotsize = previous lotsize + 1
      if (remainingAttempts) {
        if (getTimeLeftInMarketClosingMs() < 60 * 60 * 1000) {
          return Promise.resolve(
            `🟢 [minXPercentOrSupertrend] Terminating DOS trade. ${remainingAttempts} attempts left but less than 1 hour in market closing.`
          );
        }

        const jobProps = {
          ...initialJobData,
          instruments: [initialJobData.instrument],
          lots: lots + martingaleIncrementSize,
          remainingAttempts: remainingAttempts - 1,
          runNow: true
        };

        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/create_job`,
            jobProps,
            {
              headers: {
                Cookie: Object.keys(initialJobData.reqCookies)
                  .map((cookieKey) => `${cookieKey}=${initialJobData.reqCookies[cookieKey]}`)
                  .join('; ')
              }
            }
          );
          console.log('🟢 [minXPercentOrSupertrend] SL hit! Now running another trade', data);
        } catch (e) {
          console.log('🔴 [minXPercentOrSupertrend] SL hit! Setting up another trade failed!', e);
        }
      }

      return Promise.resolve('SL triggered');
    }

    const triggerPendingOrder = byRecencyOrderHistory.find(
      (odr) => odr.status === 'TRIGGER PENDING'
    );
    const punchedTriggerPrice = triggerPendingOrder.trigger_price;

    // 1. whenever this gets called - check supertrend value and the current punched in SL value
    // update pending order if supertrend value is lower

    const today = dayjs().format('YYYY-MM-DD');
    const lastOpenDate = getLastOpenDateSince(dayjs()).format('YYYY-MM-DD');

    const supertrendProps = {
      instrument_token: optionInstrumentToken,
      from_date: lastOpenDate,
      to_date: today,
      interval: '5minute',
      period: 10,
      multiplier: 3
    };

    const { data: optionSuperTrend } = await axios.post(
      `${SIGNALX_URL}/api/indicator/supertrend`,
      supertrendProps,
      {
        headers: {
          'X-API-KEY': process.env.SIGNALX_API_KEY
        }
      }
    );

    const latestST = optionSuperTrend.pop();
    console.log({ latestST });
    const newSL = Math.round(latestST.ST_10_3);
    if (newSL < punchedTriggerPrice && getPercentageChange(punchedTriggerPrice, newSL) >= 3) {
      try {
        const res = await kite.modifyOrder(
          triggerPendingOrder.variety,
          triggerPendingOrder.order_id,
          {
            trigger_price: newSL
          }
        );
        console.log(
          `🟢 [minXPercentOrSupertrend] SL modified from ${punchedTriggerPrice} to ${newSL}`,
          res
        );
      } catch (e) {
        console.error('🔴 [minXPercentOrSupertrend] error in modifyOrder', e);
        if (
          e.status === 'error' &&
          e.error_type === 'NetworkException' &&
          e.message === 'Maximum allowed order modifications exceeded.'
        ) {
          // cancel this order, place a new SL order and then trail that
          try {
            await kite.cancelOrder(triggerPendingOrder.variety, triggerPendingOrder.order_id);
            const exitOrder = {
              trigger_price: newSL,
              tradingsymbol: triggerPendingOrder.tradingsymbol,
              quantity: triggerPendingOrder.quantity,
              exchange: triggerPendingOrder.exchange,
              transaction_type: kite.TRANSACTION_TYPE_BUY,
              order_type: kite.ORDER_TYPE_SLM,
              product: triggerPendingOrder.product
            };
            const newExitOrder = await kite.placeOrder(kite.VARIETY_REGULAR, exitOrder);
            console.log(
              '[minXPercentOrSupertrend] placing new exit order',
              exitOrder,
              newExitOrder
            );
            const queueRes = await addToNextQueue(initialJobData, {
              __nextTradingQueue: EXIT_TRADING_Q_NAME,
              rawKiteOrdersResponse: [newExitOrder],
              optionInstrumentToken
            });
            console.log('[minXPercentOrSupertrend] addToNextQueue', queueRes);

            return Promise.resolve(
              '🟢 [minXPercentOrSupertrend] Maximum allowed order modifications exceeded. Placed a new SL order and terminated this checker!'
            );
          } catch (e) {
            console.log(
              '🔴 [minXPercentOrSupertrend] error in cancelOrder or placeOrder or addToNextQueue',
              e
            );
            return Promise.resolve(
              '🔴 [minXPercentOrSupertrend] Maximum allowed order modifications exceeded. Failed to place new SL order!'
            );
          }
        }
      }
    }

    return Promise.reject('SL not triggered');
  } catch (e) {
    console.log('🔴 [minXPercentOrSupertrend] global caught error', e);
    return Promise.reject('[minXPercentOrSupertrend] global caught error. Will retry!');
  }
};
