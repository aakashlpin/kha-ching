import dayjs from 'dayjs';
import React from 'react';

import OrdersTable from '../../lib/ordersTable';

const Details = ({ lots, martingaleIncrementSize, instrument, maxTrades, slmPercent, runAt }) => {
  const humanTime = dayjs(runAt).format('hh:mma');

  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Initial lots' }, { value: lots }],
        [{ value: 'Martingale lots' }, { value: martingaleIncrementSize }],
        [{ value: 'Maximum trades' }, { value: maxTrades }],
        [{ value: 'SLM %' }, { value: slmPercent }],
        [{ value: dayjs().isBefore(runAt) ? 'ETA' : 'Run at' }, { value: humanTime }]
      ]}
    />
  );
};

export default Details;
