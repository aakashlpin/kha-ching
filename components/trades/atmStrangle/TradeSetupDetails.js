import dayjs from 'dayjs'
import React from 'react'

import { EXIT_STRATEGIES_DETAILS } from '../../../lib/constants'
import OrdersTable from '../../lib/ordersTable'

const Details = ({
  lots,
  instrument,
  exitStrategy,
  slmPercent,
  runNow,
  runAt,
  inverted,
  _createdOn
}) => {
  const scheduleString = runNow || dayjs().isAfter(runAt) ? 'Run at' : 'ETA'
  const humanTime = dayjs(runNow ? _createdOn : runAt).format('hh:mma')

  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Lots' }, { value: lots }],
        [{ value: 'Strangle Type' }, { value: inverted ? 'Inverted' : 'Regular' }],
        [{ value: 'Exit Strategy' }, { value: EXIT_STRATEGIES_DETAILS[exitStrategy].label }],
        [{ value: 'SL' }, { value: `${slmPercent}%` }],
        [{ value: scheduleString }, { value: humanTime }]
      ]}
    />
  )
}

export default Details
