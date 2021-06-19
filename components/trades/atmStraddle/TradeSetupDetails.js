import dayjs from 'dayjs';
import React from 'react';

import { EXIT_STRATEGIES_DETAILS } from '../../../lib/constants';
import OrdersTable from '../../lib/ordersTable';

const Details = ({ lots, maxSkewPercent, instrument, exitStrategy, slmPercent, runAt }) => {
  const humanTime = dayjs(runAt).format('hh:mma');
  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Lots' }, { value: lots }],
        [{ value: 'Skew %' }, { value: maxSkewPercent }],
        [{ value: 'Exit Strategy' }, { value: EXIT_STRATEGIES_DETAILS[exitStrategy].label }],
        [{ value: 'SLM %' }, { value: slmPercent }],
        [{ value: dayjs().isBefore(runAt) ? 'ETA' : 'Run at' }, { value: humanTime }]
      ]}
    />
  );
};

export default Details;
