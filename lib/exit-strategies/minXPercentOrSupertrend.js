import axios from 'axios';
import dayjs from 'dayjs';

import { getLastOpenDateSince, syncGetKiteInstance } from '../utils';

export default async ({ initialJobData, rawKiteOrdersResponse, optionInstrumentToken }) => {
  const { user, lots = 1, lotStepUpSize = 1, remainingAttempts = 2 } = initialJobData;
  const kite = syncGetKiteInstance(user);
  const [rawKiteOrderResponse] = rawKiteOrdersResponse;
  // NB: rawKiteOrderResponse here is of pending SLM Order
  const orderHistory = await kite.getOrderHistory(rawKiteOrderResponse.order_id);

  const slTriggeredOrder = orderHistory.find((odr) => odr.status === 'COMPLETE');
  if (slTriggeredOrder) {
    // if the SL exit order is completed - we need to punch in another order as per maxTradesPerDay
    // 1. terminate this checker
    // 2. place another order for the same strategy with new lotsize = previous lotsize + 1
    if (remainingAttempts) {
      const jobProps = {
        ...initialJobData,
        instruments: [initialJobData.instrument],
        lots: lots + lotStepUpSize,
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

  const triggerPendingOrder = orderHistory.find((odr) => odr.status === 'TRIGGER PENDING');
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
    `${process.env.SIGNALX_URL}/api/indicator/supertrend`,
    supertrendProps,
    {
      headers: {
        'X-API-KEY': process.env.SIGNALX_API_KEY
      }
    }
  );

  const latestST = optionSuperTrend.pop();
  console.log({ latestST });
  if (latestST.ST_10_3 < punchedTriggerPrice) {
    try {
      const newSL = Math.round(latestST.ST_10_3);
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
      console.error('🔴 [minXPercentOrSupertrned] error in modifyOrder', e);
    }
  }

  return Promise.reject('SL not triggered');
};
