import { Button, Grid, Paper } from '@material-ui/core';
import dayjs from 'dayjs';
import React from 'react';
import useSWR from 'swr';

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../../lib/constants';

const Details = ({ db, strategy, onDeleteJob }) => {
  const { data: jobDetails, error } = useSWR(`/api/get_job?id=${db.queue.id}`);

  if (error) {
    onDeleteJob();
    return null;
  }

  function handleDeleteJob() {
    const currentState = jobDetails?.current_state;
    if (currentState === 'delayed' || currentState === 'waiting') {
      const userResponse = window.confirm('This will delete the scheduled task. Are you sure?');
      if (userResponse) {
        onDeleteJob();
      }
    } else {
      onDeleteJob();
    }
  }

  const strategyDetails = STRATEGIES_DETAILS[strategy];
  const { runAt, runNow, lots, maxSkewPercent, slmPercent, instruments } = db.queue.data;
  const humanTime = dayjs(runAt).format('h.mma');
  const heading = [
    strategyDetails.heading,
    runNow ? 'will be executed immediately!' : `is scheduled to run at ${humanTime}.`
  ].join(' ');

  const deleteDisclaimer = !runNow
    ? `⏰ This task can be safely deleted before the clock hits ${humanTime}.`
    : null;

  return (
    <Paper style={{ padding: 16 }}>
      <h3>{heading}</h3>

      <h4>On the following instruments:</h4>
      <div>
        <ul>
          {instruments.map((instrument) => (
            <li key={instrument}>{INSTRUMENT_DETAILS[instrument].displayName}</li>
          ))}
        </ul>
      </div>

      <p>
        with the lot size of <strong>{lots}</strong>, max acceptable skew of{' '}
        <strong>{maxSkewPercent}%</strong>, and SLM buy orders to be placed at{' '}
        <strong>{slmPercent}%</strong> of avg sell prices
      </p>

      <div>
        <h2>Status: {jobDetails?.current_state?.toUpperCase()}</h2>
      </div>

      <Grid item style={{ marginTop: 16 }}>
        <Button
          variant="contained"
          type="button"
          onClick={handleDeleteJob}
          disabled={jobDetails?.current_state === 'active'}>
          {['failed', 'completed'].includes(jobDetails?.current_state) ? 'Go back' : 'Delete'}
        </Button>
        {['delayed', 'waiting'].includes(jobDetails?.current_state) && deleteDisclaimer ? (
          <p>{deleteDisclaimer}</p>
        ) : null}
      </Grid>
    </Paper>
  );
};

export default Details;
