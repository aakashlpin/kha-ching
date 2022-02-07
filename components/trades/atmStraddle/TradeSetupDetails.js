import React from 'react'

import commonDetailsRows from '../../lib/commonDetailsRows'
import OrdersTable from '../../lib/ordersTable'

const Details = args => {
  const {
    lots,
    maxSkewPercent,
    thresholdSkewPercent,
    instrument,
    strategy,
    expireIfUnsuccessfulInMins,
    takeTradeIrrespectiveSkew = true
  } = args

  const afterCheckerString = takeTradeIrrespectiveSkew
    ? 'Enter irrespective skew'
    : 'Reject trade'

  return (
    <OrdersTable
      rows={[
        [{value:'Strategy'},{value: strategy}],
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Lots' }, { value: lots }],
        [{ value: 'Ideal Skew' }, { value: `${maxSkewPercent}%` }],
        [
          { value: 'Threshold Skew' },
          { value: thresholdSkewPercent ? `${thresholdSkewPercent}%` : '-' }
        ],
        [
          { value: 'Skew checker' },
          { value: `${expireIfUnsuccessfulInMins ?? 0} mins` }
        ],
        [{ value: 'After checker' }, { value: afterCheckerString }],
        ...commonDetailsRows(args)
      ]}
    />
  )
}

export default Details
