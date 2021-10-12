import withSession from '../../lib/session'
import { delay, ms } from '../../lib/utils'
// import { storeAccessTokenRemotely } from '../../lib/utils';

import fyers from 'fyers-api'

export default withSession(async (req, res) => {
  const user = req.session.get('user')

  if (!user) {
    return res.status(401).send('Unauthorized')
  }

  if (req.query.type === 'buy') {
    // const order = {
    //   symbol: `NSE:BANKNIFTY2161734900PE`,
    //   qty: 1 * 25,
    //   type: 2,
    //   side: 1,
    //   productType: 'INTRADAY',
    //   validity: 'DAY',
    //   limitPrice: 0,
    //   stopPrice: 0,
    //   disclosedQty: 0,
    //   offlineOrder: 'False',
    //   stopLoss: 0,
    //   takeProfit: 0
    // };

    // const buyOrderRes = await fyers.place_orders({
    //   token: user.fyers.access_token,
    //   data: order
    // });

    // console.log('===buyOrderRes===');
    // console.log(JSON.stringify(buyOrderRes, null, 2));

    // await delay(ms(5 * 60));

    const buyOrderId = '221061144362'

    const buyOrderStatus = await fyers.orderStatus({
      token: user.fyers.access_token,
      data: { id: buyOrderId }
    })

    console.log('===buyOrderStatus===')
    console.log(JSON.stringify(buyOrderStatus, null, 2))
    // const { status, symbol, qty, tradedPrice } = buyOrderStatus.data.orderDetails;

    // if (status !== 2) {
    //   throw new Error('initial order not completed yet!');
    // }

    // // const initialSLPrice = 0.7 * tradedPrice;
    // const exitOrderProps = {
    //   symbol,
    //   qty,
    //   type: 3,
    //   side: -1,
    //   stopPrice: Math.round(0.7 * tradedPrice), // (30% SL)
    //   productType: 'INTRADAY',
    //   validity: 'DAY',
    //   limitPrice: 0,
    //   disclosedQty: 0,
    //   offlineOrder: 'False',
    //   stopLoss: 0,
    //   takeProfit: 0
    // };

    // const exitOrder = await fyers.place_orders({
    //   token: user.fyers.access_token,
    //   data: exitOrderProps
    // });
    // console.log(JSON.stringify(exitOrder, null, 2));
    const exitOrderId = '221061147362'
    console.log('===exitOrder===')

    const exitOrderStatus = await fyers.orderStatus({
      token: user.fyers.access_token,
      data: { id: exitOrderId }
    })

    console.log(JSON.stringify(exitOrderStatus, null, 2))
    res.json({
      // buyOrderRes,
      buyOrderStatus,
      exitOrderStatus
    })
  }
})

/**
 * {
  buyOrderStatus: {
    code: 200,
    data: {
      orderDetails: {
        status: 2,
        symbol: "NSE:BANKNIFTY2161734900PE",
        qty: 25,
        orderNumStatus: "221061144362:2",
        dqQtyRem: 0,
        orderDateTime: "11-Jun-2021 11:24:17",
        orderValidity: "DAY",
        fyToken: "101121061751059",
        slNo: 4,
        message: "TRADE CONFIRMED",
        segment: "D",
        id: "221061144362",
        stopPrice: 0,
        instrument: "OPTIDX",
        exchOrdId: "1600000022524649",
        remainingQuantity: 0,
        filledQty: 25,
        limitPrice: 0,
        offlineOrder: false,
        source: "ITS",
        productType: "INTRADAY",
        type: 2,
        side: 1,
        tradedPrice: 290.45,
        discloseQty: 0
      }
    },
    message: ""
  },
  exitOrderStatus: {
    code: 200,
    data: {
      orderDetails: {
        status: 6,
        symbol: "NSE:BANKNIFTY2161734900PE",
        qty: 25,
        orderNumStatus: "221061147362:6",
        dqQtyRem: 0,
        orderDateTime: "11-Jun-2021 11:32:39",
        orderValidity: "DAY",
        fyToken: "101121061751059",
        slNo: 1,
        message: "CONFIRMED",
        segment: "D",
        id: "221061147362",
        stopPrice: 203,
        instrument: "OPTIDX",
        exchOrdId: "1600000024313430",
        remainingQuantity: 25,
        filledQty: 0,
        limitPrice: 0,
        offlineOrder: false,
        source: "ITS",
        productType: "INTRADAY",
        type: 3,
        side: -1,
        tradedPrice: 0,
        discloseQty: 0
      }
    },
    message: ""
  }
}
 */
