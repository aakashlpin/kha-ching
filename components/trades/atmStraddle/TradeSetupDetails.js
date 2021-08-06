import React from 'react'

import commonDetailsRows from '../../lib/commonDetailsRows'
import OrdersTable from '../../lib/ordersTable'

const Details = (args) => {
  const {
    lots,
    maxSkewPercent,
    thresholdSkewPercent,
    instrument,
    expireIfUnsuccessfulInMins,
    takeTradeIrrespectiveSkew = true
  } = args

  const afterCheckerString = takeTradeIrrespectiveSkew ? 'Enter irrespective skew' : 'Reject trade'

  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Lots' }, { value: lots }],
        [{ value: 'Ideal Skew' }, { value: `${maxSkewPercent}%` }],
        [{ value: 'Threshold Skew' }, { value: thresholdSkewPercent ? `${thresholdSkewPercent}%` : '-' }],
        [{ value: 'Skew checker' }, { value: `${expireIfUnsuccessfulInMins} mins` }],
        [{ value: 'After checker' }, { value: afterCheckerString }],
        ...commonDetailsRows(args)
      ]}
    />
  )
}

export default Details
