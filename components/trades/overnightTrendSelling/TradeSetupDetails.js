import dayjs from 'dayjs'
import React from 'react'

import {
  EXIT_STRATEGIES,
  EXIT_STRATEGIES_DETAILS,
  OTS_ENTRY_STRATEGIES,
  STRATEGIES_DETAILS
} from '../../../lib/constants'
import commonDetailsRows from '../../lib/commonDetailsRows'
import OrdersTable from '../../lib/ordersTable'

const Details = args => {
  const {
    lots,
    instrument,
    entryStrategy,
    strategy,
    distanceFromAtm
  } = args

  return (
    <OrdersTable
      rows={[
        [{value:'Strategy'},{value: strategy}],
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Lots' }, { value: lots }],
        [
          { value: 'Entry strategy' },
          {
            value:
              STRATEGIES_DETAILS.ATM_STRANGLE.ENTRY_STRATEGY_DETAILS[
                entryStrategy
              ].label
          }
        ],
          [{ value: 'Distance from ATM' }, { value: distanceFromAtm }],
        ...commonDetailsRows(args)
      ]}
    />
  )
}

export default Details
