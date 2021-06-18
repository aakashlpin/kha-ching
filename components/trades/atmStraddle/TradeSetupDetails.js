import { Button, Grid, Paper } from '@material-ui/core';
import dayjs from 'dayjs';
import React from 'react';
import TimeAgo from 'react-timeago';
import useSWR from 'swr';

import {
  EXIT_STRATEGIES_DETAILS,
  INSTRUMENT_DETAILS,
  STRATEGIES_DETAILS
} from '../../../lib/constants';
import OrdersTable from '../../lib/ordersTable';

const Details = ({ job, strategy, onDeleteJob }) => {
  const { data: jobDetails, error } = useSWR(`/api/get_job?id=${job.id}`);

  if (error) {
    onDeleteJob({ jobId: job.id });
    return null;
  }

  function handleDeleteJob({ jobId }) {
    const currentState = jobDetails?.current_state;
    if (currentState === 'delayed' || currentState === 'waiting') {
      const userResponse = window.confirm('This will delete the scheduled task. Are you sure?');
      if (userResponse) {
        onDeleteJob({ jobId });
      }
    } else {
      onDeleteJob({ jobId });
    }
  }

  const strategyDetails = STRATEGIES_DETAILS[strategy];
  const { runAt, runNow, lots, maxSkewPercent, slmPercent, instrument, exitStrategy } = job.data;
  const humanTime = dayjs(runAt).format('h.mma');
  const Heading = () => (
    <>
      #{job.id} · {strategyDetails.heading}{' '}
      {runNow ? (
        <>
          was run <TimeAgo date={new Date(job.timestamp)} />.
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
          { title: 'Qty.', align: 'right' },
          { title: 'Skew %', align: 'right' },
          { title: 'Exit Strat' },
          { title: 'SLM %', align: 'right' }
        ]}
        rows={[
          [
            { value: lots * INSTRUMENT_DETAILS[instrument].lotSize, align: 'right' },
            { value: maxSkewPercent, align: 'right' },
            { value: EXIT_STRATEGIES_DETAILS[exitStrategy].label },
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
        <Button
          variant="contained"
          type="button"
          onClick={() => handleDeleteJob({ jobId: job.id })}
          disabled={jobDetails?.current_state === 'active'}>
          Cleanup Job
        </Button>
        {['delayed', 'waiting'].includes(jobDetails?.current_state) && deleteDisclaimer ? (
          <p>{deleteDisclaimer}</p>
        ) : null}
      </Grid>
    </Paper>
  );
};

export default Details;
