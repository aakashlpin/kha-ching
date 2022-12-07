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
    price,
    triggerPrice,
  };

  const signal = {
    state: SLS_STATE.INVALIDATED,
    orderType: ORDER_TYPE.MARKET,
    productType: PRODUCT_TYPE.NRML,
    validityType: VALIDITY_TYPE.DAY,
    positionType: BUY/SELL
  };

  const signal = {
    state: SLS_STATE.EXIT,
    orderType: ORDER_TYPE.MARKET,
    productType: PRODUCT_TYPE.NRML,
    validityType: VALIDITY_TYPE.DAY,
    price: close,
    exitReason: EXIT_REASON.EOL,
    positionType: BUY/SELL,
  };

  const signal = {
    state: SLS_STATE.SL_CREATE,
    orderType: ORDER_TYPE.SL,
    productType: PRODUCT_TYPE.NRML,
    validityType: VALIDITY_TYPE.DAY,
    positionType: BUY/SELL,
    triggerPrice: slValue,
    price: number,
  };


  const signal = {
    state: SLS_STATE.SL_UPDATE,
    orderType: ORDER_TYPE.SL,
    productType: PRODUCT_TYPE.NRML,
    validityType: VALIDITY_TYPE.DAY,
    positionType: BUY/SELL
    triggerPrice: newSlValue,
    price: number,
  };

 */

import { NextApiRequest, NextApiResponse } from 'next'
import { syncGetKiteInstance } from '../../lib/utils'

export default async function handler (req: NextApiRequest, res: NextApiResponse) {
  // const user = req.session.get('user')

  const accessToken = req.headers['x-broker-access-token']

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
        Math.abs(position.quantity) > 0
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
        if (!riderPosition) {
          console.log(`${req.body.signal?.state}: didn't find any NR position`)
          break;
        }
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
        } else {
          console.log(`INVALIDATED: didn't find any NR in this list`)
          console.log(orders)
        }
        break;
      }

      case 'EXIT': {
        const { modelConfig } = req.body
        if (!riderPosition) {
          console.log(`${req.body.signal?.state}: didn't find any NR position`)
          break;
        }

        const { tradingsymbol } = riderPosition
        const { lots } = modelConfig

        const {
          orderType,
          productType,
          validityType,
          positionType,
        } = req.body.signal

        await kc.placeOrder(kc.VARIETY_REGULAR, {
          tradingsymbol,
          quantity: lots * 50,
          exchange: 'NFO',
          transaction_type: positionType,
          order_type: orderType,
          product: productType,
          validity: validityType,
        })
        break;
      }
      default: {
        console.log('default case???')
        break;
      }
    }

    return res.json({ status: 'ok' })

  } catch (e) {
    return res.status(401).send('Unauthorized')
  }
}
