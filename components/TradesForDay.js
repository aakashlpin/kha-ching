import { Button, Grid, Paper } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import TimeAgo from 'react-timeago';
import useSWR from 'swr';

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../lib/constants';
import OrdersTable from './lib/ordersTable';

const TradeDetails = (props) => {
  const { data: jobDetails, error } = useSWR(
    props.queue?.id ? `/api/get_job?id=${props.queue.id}` : null
  );

  const strategyDetails = STRATEGIES_DETAILS[props.strategy];
  const {
    runAt,
    runNow,
    lots,
    slmPercent,
    instrument,
    maxTrades,
    martingaleIncrementSize,
    queue
  } = props;

  const humanTime = dayjs(runAt).format('h.mma');
  const Heading = () => (
    <>
      #{queue.id} · {strategyDetails.heading}{' '}
      {runNow ? (
        <>
          was run <TimeAgo date={new Date(queue.timestamp)} />.
        </>
      ) : (
        <>is scheduled to run at {humanTime}.</>
      )}
    </>
  );

  const deleteDisclaimer = !runNow
    ? `⏰ This task can be safely deleted before the clock hits ${humanTime}.`
    : null;

  return (
    <Paper style={{ padding: 16, marginBottom: 32 }}>
      <h4>
        <Heading />
      </h4>

      <h2>{INSTRUMENT_DETAILS[instrument].displayName}</h2>

      <OrdersTable
        headerItems={[
          { title: 'Initial lots', align: 'right' },
          { title: 'Additional lots', align: 'right' },
          { title: 'Max trades', align: 'right' },
          { title: 'SL(%)', align: 'right' }
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

      <div>
        <h3>Status: {jobDetails?.current_state?.toUpperCase() || 'Loading...'}</h3>
      </div>

      <Grid item style={{ marginTop: 16 }}>
        {/* <div style={{ marginBottom: 16 }}>
        {jobDetails?.current_state === 'completed' ? (
          <OrdersTable
            rows={jobDetails.job.returnvalue.rawKiteOrdersResponse.map((row) => {
              const [item] = row;
              return {
                product: item.product,
                instrument: item.tradingsymbol,
                qty: item.quantity * (item.transaction_type === 'SELL' ? -1 : 1),
                avg: item.average_price
              };
            })}
          />
        ) : null}
      </div> */}
        {/* <Button
          variant="contained"
          type="button"
          onClick={() => handleDeleteJob({ jobId: job.id })}
          disabled={jobDetails?.current_state === 'active'}>
          Cleanup Job
        </Button>
        {['delayed', 'waiting'].includes(jobDetails?.current_state) && deleteDisclaimer ? (
          <p>{deleteDisclaimer}</p>
        ) : null} */}
      </Grid>
    </Paper>
  );
};

const TradesForDay = () => {
  const { data: trades, error } = useSWR('/api/trades_day');
  if (!trades?.length || error) {
    return 'No trades setup yet!';
  }

  return (
    <div>
      <h3>Trades setup for the day</h3>
      {trades.map((trade) => (
        <TradeDetails key={trade._id} {...trade} />
      ))}
    </div>
  );
};

export default TradesForDay;
