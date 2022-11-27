/**
 * handle the following incoming signals
 *
 *
  const signal = {
    state: SLS_STATE.INIT,
    orderType: ORDER_TYPE.SL,
    productType: PRODUCT_TYPE.NRML,
    validityType: VALIDITY_TYPE.DAY,
    positionType: liveBias,
    weightagePercent: 100,
    price:
      triggerPrice +
      (liveBias === POSITION_TYPE.BUY
        ? initConfig.triggerBufferPoints
        : -1 * initConfig.triggerBufferPoints),
    triggerPrice,
  };

  const signal = {
    state: SLS_STATE.INVALIDATED,
    // [TODO] remove these when backend supports
    orderType: ORDER_TYPE.MARKET,
    productType: PRODUCT_TYPE.NRML,
    validityType: VALIDITY_TYPE.DAY,
    positionType:
      prevBias === POSITION_TYPE.BUY ? POSITION_TYPE.SELL : POSITION_TYPE.BUY,
  };

  const signal = {
    state: SLS_STATE.SL_CREATE,
    orderType: ORDER_TYPE.SL,
    productType: PRODUCT_TYPE.NRML,
    validityType: VALIDITY_TYPE.DAY,
    positionType:
      prevBias === POSITION_TYPE.BUY ? POSITION_TYPE.SELL : POSITION_TYPE.BUY,
    triggerPrice: slValue,
    price:
      prevBias === POSITION_TYPE.BUY
        ? slValue - riderConfig.triggerBufferPoints
        : slValue + riderConfig.triggerBufferPoints,
  };


  const signal = {
    state: SLS_STATE.SL_UPDATE,
    orderType: ORDER_TYPE.SL,
    productType: PRODUCT_TYPE.NRML,
    validityType: VALIDITY_TYPE.DAY,
    positionType:
      positionType === POSITION_TYPE.BUY
        ? POSITION_TYPE.SELL
        : POSITION_TYPE.BUY,
    triggerPrice: newSlValue,
    price:
      positionType === POSITION_TYPE.BUY
        ? newSlValue - riderConfig.triggerBufferPoints
        : newSlValue + riderConfig.triggerBufferPoints,
  };

 */

import { NextApiRequest, NextApiResponse } from 'next'
import { syncGetKiteInstance } from '../../lib/utils'

// Q - how do I get the session when request initiated from external source

export default async function handler (req: NextApiRequest, res: NextApiResponse) {
  // const user = req.session.get('user')

  const accessToken = req.headers['broker-access-token']

  if (!accessToken) {
    return res.status(401).send('Unauthorized')
  }

  const kc = syncGetKiteInstance({
    session: {
      access_token: accessToken
    }
  })

  try {
    // see if we're able to fetch profile with the access token
    // in case access token is expired, then log out the user
    await kc.getProfile()

    const positions = await kc.getPositions()
    const { net } = positions
    const riderPosition = net.find(position =>
        position.tradingsymbol.startsWith('NIFTY') &&
        position.tradingsymbol.endsWith('FUT') &&
        position.product === 'NRML' &&
        position.quantity > 0
      )

    switch (req.body.signal?.state) {
      case 'INIT': {
        const { instrumentConfig, modelConfig } = req.body
        const { tradingSymbol } = instrumentConfig
        const { lots } = modelConfig

        const { orderType,
          productType,
          validityType,
          positionType,
          price,
          triggerPrice,
        } = req.body.signal

        await kc.placeOrder(kc.VARIETY_REGULAR, {
          tradingsymbol: tradingSymbol,
          quantity: lots * 50,
          exchange: 'NFO',
          transaction_type: positionType,
          order_type: orderType,
          product: productType,
          validity: validityType,
          price,
          trigger_price: triggerPrice,
          tag: 'investmint_nr'
        })

        break;
      }
      case 'SL_CREATE':
      case 'SL_UPDATE': {
        const { modelConfig } = req.body
        const { tradingsymbol } = riderPosition
        const { lots } = modelConfig

        const { orderType,
          productType,
          validityType,
          positionType,
          price,
          triggerPrice,
        } = req.body.signal

        await kc.placeOrder(kc.VARIETY_REGULAR, {
          tradingsymbol,
          quantity: lots * 50,
          exchange: 'NFO',
          transaction_type: positionType,
          order_type: orderType,
          product: productType,
          validity: validityType,
          price,
          trigger_price: triggerPrice,
        })
        break;
      }

      case 'INVALIDATED': {
        const orders = await kc.getOrders()
        const triggerPendingOrder = orders.find(order => order.tag === 'investmint_nr' && order.status === 'TRIGGER PENDING')
        if (triggerPendingOrder) {
          await kc.cancelOrder(kc.VARIETY_REGULAR, triggerPendingOrder.order_id)
        }
        break;
      }
      default: {
        break;

      }
    }

    // if (!riderPosition) {
    //   return res.json({ status: 'no rider position'})
    // }

  } catch (e) {
    return res.status(401).send('Unauthorized')
  }
}
