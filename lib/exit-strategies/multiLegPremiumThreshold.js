import console from '../logging'
import { getTimeLeftInMarketClosingMs, syncGetKiteInstance, getInstrumentPrice, getPercentageChange } from '../utils'

import { doSquareOffPositions } from './autoSquareOff'

export default async ({ initialJobData, rawKiteOrdersResponse }) => {
  try {
    if (getTimeLeftInMarketClosingMs() < 0) {
      return Promise.resolve(
        '🟢 [multiLegPremiumThreshold] Terminating Combined Premium checker as market closing...'
      )
    }

    const { slmPercent, user, trailEveryPercentageChangeValue = 1, lastTrailingSlTriggerAtPremium, trailingSlPremium } = initialJobData
    const kite = syncGetKiteInstance(user)

    /**
     * Trailing SL method
     * 1. initial total SL = initialPremiumReceived + sl% * initialPremiumReceived
     * 2. trailing SL
     *    on every decrease in combined premium by X%, trail the SL by initial SL %
     *
     * e.g. initial premium = 400
     * initial SL = 10%
     * total SL = 440
     *
     *
     * At 10.00am
     * combined premium = 380
     * decrease in premium = 5%
     * new SL = 380 + 10% * 380 = 418
     *  terminate this job, add a replica to same queue
     *  with lastTrailingSlTriggerAtPremium = 380
     *
     *
     * At 10.15am
     * combined premium = 390
     * ideal SL = 400 + 10%*440 = 440
     * trailing SL = 418
     * SL = min(ideal SL, trailing SL)
     * no changes
     */

    const legsOrders = rawKiteOrdersResponse
    // check here if the open positions include these legs
    // and quantities should be greater than equal to `legsOrders`
    // if not, resolve this checker assuming the user has squared off the positions themselves

    const tradingSymbols = legsOrders.map((order) => order.tradingsymbol)

    const averageOrderPrices = legsOrders.map((order) => order.average_price)
    const initialPremiumReceived = averageOrderPrices.reduce((sum, price) => sum + price, 0)

    const liveSymbolPrices = await Promise.all(
      tradingSymbols.map((symbol) => getInstrumentPrice(kite, symbol, kite.EXCHANGE_NFO))
    )

    const liveTotalPremium = liveSymbolPrices.reduce((sum, price) => sum + price, 0)

    const initialSlValue = initialPremiumReceived + (slmPercent / 100 * initialPremiumReceived) // 440
    const trailingSlValue = lastTrailingSlTriggerAtPremium ? (liveTotalPremium + (slmPercent / 100 * liveTotalPremium)) : null //
    const slPremium = Math.min(initialSlValue, trailingSlValue)
    const lastInflectionPoint = lastTrailingSlTriggerAtPremium || initialPremiumReceived

    const changeFromLastInflectionPoint =
      ((liveTotalPremium - lastInflectionPoint) / liveTotalPremium) * 100

    if (liveTotalPremium < slPremium) {
      //
      if (changeFromLastInflectionPoint < 0 && Math.abs(changeFromLastInflectionPoint) >= trailEveryPercentageChangeValue) {
        // update lastTrailingSlTriggerAtPremium
        // if current liveTotalPremium is X% lesser than lastTrailingSlTriggerAtPremium

        // [TODO] terminate this job, and add to same queue with updated params
        return
      }

      const rejectMsg = `🟢 [multiLegPremiumThreshold] liveTotalPremium (${liveTotalPremium}) < threshold (${slPremium})`
      return Promise.reject(new Error(rejectMsg))
    }

    const exitMsg = `☢️ [multiLegPremiumThreshold] triggered! liveTotalPremium (${liveTotalPremium}) > threshold (${slPremium}%)`
    console.log(exitMsg)

    return doSquareOffPositions(legsOrders, kite, initialJobData)
  } catch (e) {
    return Promise.reject(e)
  }
}
