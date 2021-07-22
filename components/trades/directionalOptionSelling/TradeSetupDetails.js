import dayjs from 'dayjs'
import React from 'react'

import OrdersTable from '../../lib/ordersTable'

const Details = ({
  lots,
  martingaleIncrementSize,
  instrument,
  maxTrades,
  slmPercent,
  runNow,
  runAt,
  strikeByPrice,
  _createdAt
}) => {
  const scheduleString = runNow || dayjs().isAfter(runAt) ? 'Run at' : 'ETA'
  const humanTime = dayjs(runNow ? _createdAt : runAt).format('hh:mma')

  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Strike price' }, { value: strikeByPrice || 'ST Strike' }],
        [{ value: 'Initial lots' }, { value: lots }],
        [{ value: 'Martingale lots' }, { value: martingaleIncrementSize }],
        [{ value: 'Maximum trades' }, { value: maxTrades }],
        [{ value: 'SLM %' }, { value: slmPercent }],
        [{ value: scheduleString }, { value: humanTime }]
      ]}
    />
  )
}

export default Details
