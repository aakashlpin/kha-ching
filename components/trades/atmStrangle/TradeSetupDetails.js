import dayjs from 'dayjs'
import React from 'react'

import { EXIT_STRATEGIES, EXIT_STRATEGIES_DETAILS } from '../../../lib/constants'
import commonDetailsRows from '../../lib/commonDetailsRows'
import OrdersTable from '../../lib/ordersTable'

const Details = (args) => {
  const {
    lots,
    instrument,
    inverted
  } = args

  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Lots' }, { value: lots }],
        [{ value: 'Strangle Type' }, { value: inverted ? 'Inverted' : 'Regular' }],
        ...commonDetailsRows(args)
      ]}
    />
  )
}

export default Details
