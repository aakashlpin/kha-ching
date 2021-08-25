import dayjs from 'dayjs'
import React from 'react'

import {
  EXIT_STRATEGIES,
  EXIT_STRATEGIES_DETAILS,
  STRANGLE_ENTRY_STRATEGIES,
  STRATEGIES_DETAILS
} from '../../../lib/constants'
import commonDetailsRows from '../../lib/commonDetailsRows'
import OrdersTable from '../../lib/ordersTable'

const Details = args => {
  const {
    lots,
    instrument,
    inverted,
    entryStrategy,
    deltaStrikes,
    distanceFromAtm
  } = args

  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Lots' }, { value: lots }],
        [
          { value: 'Strangle Type' },
          { value: inverted ? 'Inverted' : 'Regular' }
        ],
        [
          { value: 'Entry strategy' },
          {
            value:
              STRATEGIES_DETAILS.ATM_STRANGLE.ENTRY_STRATEGY_DETAILS[
                entryStrategy
              ].label
          }
        ],
        entryStrategy === STRANGLE_ENTRY_STRATEGIES.DELTA_STIKES
          ? [{ value: 'Strikes delta' }, { value: deltaStrikes }]
          : [{ value: 'Distance from ATM' }, { value: distanceFromAtm }],
        ...commonDetailsRows(args)
      ]}
    />
  )
}

export default Details
