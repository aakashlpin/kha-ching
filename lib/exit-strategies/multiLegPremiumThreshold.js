import console from '../logging'
import { getTimeLeftInMarketClosingMs, syncGetKiteInstance, getInstrumentPrice } from '../utils'

import { doSquareOffPositions } from './autoSquareOff'

export default async ({ initialJobData, rawKiteOrdersResponse }) => {
  try {
    if (getTimeLeftInMarketClosingMs() < 0) {
      return Promise.resolve(
        '🟢 [multiLegPremiumThreshold] Terminating Combined Premium checker as market closing...'
      )
    }

    const { slmPercent, user } = initialJobData
    const kite = syncGetKiteInstance(user)

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
    const deltaInCombinedPremiumPercent =
      ((liveTotalPremium - initialPremiumReceived) / initialPremiumReceived) * 100

    if (deltaInCombinedPremiumPercent < slmPercent) {
      const rejectMsg = `🟢 [multiLegPremiumThreshold] combined delta (${deltaInCombinedPremiumPercent}%) < threshold (${slmPercent}%)`
      console.log(rejectMsg)
      return Promise.reject(rejectMsg)
    }

    const exitMsg = `☢️ [multiLegPremiumThreshold] triggered! combined delta (${deltaInCombinedPremiumPercent}%) > threshold (${slmPercent}%)`
    console.log(exitMsg)

    return doSquareOffPositions(legsOrders, kite, initialJobData)
  } catch (e) {
    return Promise.reject(e)
  }
}
