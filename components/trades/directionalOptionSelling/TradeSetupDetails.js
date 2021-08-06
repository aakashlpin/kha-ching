import React from 'react'
import commonDetailsRows from '../../lib/commonDetailsRows'

import OrdersTable from '../../lib/ordersTable'

const Details = (args) => {
  const {
    lots,
    martingaleIncrementSize,
    instrument,
    maxTrades,
    strikeByPrice
  } = args

  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Strike price' }, { value: strikeByPrice || 'ST Strike' }],
        [{ value: 'Initial lots' }, { value: lots }],
        [{ value: 'Martingale lots' }, { value: martingaleIncrementSize }],
        [{ value: 'Maximum trades' }, { value: maxTrades }],
        ...commonDetailsRows(args)
      ]}
    />
  )
}

export default Details
