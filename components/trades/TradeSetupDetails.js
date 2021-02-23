import { Button, Grid, Paper } from '@material-ui/core';
import React from 'react';
import useSWR from 'swr';

import { INSTRUMENT_DETAILS } from '../../lib/constants';

const Details = ({ db, onDeleteJob, heading, deleteDisclaimer }) => {
  const { data: jobDetails, error } = useSWR(`/api/get_job?id=${db.queue.id}`);

  if (error) {
    onDeleteJob();
    return null;
  }

  function handleDeleteJob() {
    const userResponse = window.confirm('Are you sure?');
    if (userResponse) {
      onDeleteJob();
    }
  }

  return (
    <Paper style={{ padding: 16 }}>
      <h3>{heading}</h3>

      <h4>On the following instruments:</h4>
      <div>
        <ul>
          {db.queue.data.instruments.map((instrument) => (
            <li key={instrument}>{INSTRUMENT_DETAILS[instrument].displayName}</li>
          ))}
        </ul>
      </div>

      <p>
        with the lot size of <strong>{db.queue.data.lots}</strong>, max acceptable skew of{' '}
        <strong>{db.queue.data.maxSkewPercent}%</strong>, and SLM buy orders to be placed at{' '}
        <strong>{db.queue.data.slmPercent}%</strong> of avg sell prices
      </p>

      <div>
        <h2>Status: {jobDetails?.current_state}</h2>
      </div>

      <Grid item style={{ marginTop: 16 }}>
        <Button
          variant="contained"
          type="button"
          onClick={handleDeleteJob}
          disabled={jobDetails?.current_state === 'active'}>
          Delete
        </Button>
        <p>{deleteDisclaimer}</p>
      </Grid>
    </Paper>
  );
};

export default Details;
