import {
  Button,
  Checkbox,
  CssBaseline,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  Link,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography
} from '@material-ui/core';
import React from 'react';
import useSWR from 'swr';

import { INSTRUMENT_DETAILS, INSTRUMENTS } from '../../lib/constants';

const TwelveThirtyDetails = ({ twelveThirtyDb, onDeleteJob }) => {
  const { data: jobDetails } = useSWR(`/api/get_job?id=${twelveThirtyDb.queue.id}`);

  function handleDeleteJob() {
    const userResponse = window.confirm('Are you sure?');
    if (userResponse) {
      onDeleteJob();
    }
  }

  return (
    <Paper style={{ padding: 16 }}>
      <h3>An ATM straddle will be executed at 12.30pm IST</h3>

      <h4>On the following instruments:</h4>
      <div>
        <ul>
          {twelveThirtyDb.queue.data.instruments.map((instrument) => (
            <li key={instrument}>{INSTRUMENT_DETAILS[instrument].displayName}</li>
          ))}
        </ul>
      </div>

      <p>
        with the lot size of <strong>{twelveThirtyDb.queue.data.lots}</strong>, max acceptable skew
        of <strong>{twelveThirtyDb.queue.data.maxSkewPercent}%</strong>, and SLM buy orders to be
        placed at <strong>{twelveThirtyDb.queue.data.slmPercent}%</strong> of avg sell prices
      </p>

      <div>
        <h2>Status: {jobDetails?.current_state}</h2>
      </div>

      <Grid item style={{ marginTop: 16 }}>
        <Button variant="contained" type="button" onClick={handleDeleteJob}>
          Delete
        </Button>
        <p>
          You can safely delete this task till 12.25PM, after which it&apos;ll go into processing
        </p>
      </Grid>
    </Paper>
  );
};

export default TwelveThirtyDetails;
