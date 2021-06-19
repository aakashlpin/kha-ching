import React from 'react';

import OrdersTable from '../../lib/ordersTable';

const Details = ({ lots, martingaleIncrementSize, maxTrades, slmPercent }) => {
  return (
    <OrdersTable
      headerItems={[
        { title: 'Initial lots', align: 'right' },
        { title: 'Martingale lots', align: 'right' },
        { title: 'Maximum trades', align: 'right' },
        { title: 'SLM %', align: 'right' }
      ]}
      rows={[
        [
          { value: lots, align: 'right' },
          { value: martingaleIncrementSize, align: 'right' },
          { value: maxTrades, align: 'right' },
          { value: slmPercent, align: 'right' }
        ]
      ]}
    />
  );
};

export default Details;
