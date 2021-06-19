import React from 'react';

import { EXIT_STRATEGIES_DETAILS } from '../../../lib/constants';
import OrdersTable from '../../lib/ordersTable';

const Details = ({ lots, maxSkewPercent, exitStrategy, slmPercent }) => {
  return (
    <OrdersTable
      headerItems={[
        { title: 'Lots', align: 'right' },
        { title: 'Skew %', align: 'right' },
        { title: 'Exit Strategy' },
        { title: 'SLM %', align: 'right' }
      ]}
      rows={[
        [
          { value: lots, align: 'right' },
          { value: maxSkewPercent, align: 'right' },
          { value: EXIT_STRATEGIES_DETAILS[exitStrategy].label },
          { value: slmPercent, align: 'right' }
        ]
      ]}
    />
  );
};

export default Details;
