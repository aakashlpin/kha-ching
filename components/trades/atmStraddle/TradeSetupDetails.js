import dayjs from 'dayjs';
import React from 'react';

import { EXIT_STRATEGIES_DETAILS } from '../../../lib/constants';
import OrdersTable from '../../lib/ordersTable';

const Details = ({
  lots,
  maxSkewPercent,
  thresholdSkewPercent,
  instrument,
  exitStrategy,
  slmPercent,
  runNow,
  runAt,
  expireIfUnsuccessfulInMins,
  takeTradeIrrespectiveSkew,
  _createdOn
}) => {
  const scheduleString = runNow || dayjs().isAfter(runAt) ? 'Run at' : 'ETA';
  const humanTime = dayjs(runNow ? _createdOn : runAt).format('hh:mma');

  return (
    <OrdersTable
      rows={[
        [{ value: 'Instrument' }, { value: instrument }],
        [{ value: 'Lots' }, { value: lots }],
        [{ value: 'Ideal Skew' }, { value: `${maxSkewPercent}%` }],
        [{ value: 'Threshold Skew' }, { value: `${thresholdSkewPercent}%` }],
        [{ value: 'Exit Strategy' }, { value: EXIT_STRATEGIES_DETAILS[exitStrategy].label }],
        [{ value: 'SL' }, { value: `${slmPercent}%` }],
        [{ value: 'Skew checker' }, { value: `${expireIfUnsuccessfulInMins} mins` }],
        [
          { value: 'After checker' },
          {
            value: takeTradeIrrespectiveSkew ? 'Enter irrespective skew' : 'Reject trade'
          }
        ],
        [{ value: scheduleString }, { value: humanTime }]
      ]}
    />
  );
};

export default Details;
