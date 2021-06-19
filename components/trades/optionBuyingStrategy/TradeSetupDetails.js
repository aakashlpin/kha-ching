import { Button, Grid, Paper } from '@material-ui/core';
import dayjs from 'dayjs';
import React from 'react';
import TimeAgo from 'react-timeago';
import useSWR from 'swr';

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../../../lib/constants';
import OrdersTable from '../../lib/ordersTable';
// import OrdersTable from '../lib/ordersTable';

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
  const { runAt, runNow, lots, instrument } = job.data;

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
          { title: 'Lots', align: 'left' },
          { title: 'Scheduled time', align: 'left' }
        ]}
        rows={[
          [
            { value: lots, align: 'left' },
            { value: humanTime, align: 'left' }
          ]
        ]}
      />

      <div>
        <h3>Status: {jobDetails?.current_state?.toUpperCase() || 'Loading...'}</h3>
      </div>

      <Grid item style={{ marginTop: 16 }}>
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
