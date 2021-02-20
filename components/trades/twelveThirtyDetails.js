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

import { INSTRUMENT_DETAILS, INSTRUMENTS } from '../../lib/constants';

const TwelveThirtyDetails = ({ twelveThirtyDb, onDeleteJob }) => {
  return (
    <Paper style={{ padding: 16 }}>
      <h3>An ATM straddle will be executed at 12.30pm IST</h3>

      <h4>On the following instruments:</h4>
      <div>
        <ul>
          {twelveThirtyDb.queue.data.instruments.map((instrument) => (
            <li key={instrument}>{INSTRUMENT_DETAILS[instrument].name}</li>
          ))}
        </ul>
      </div>

      <p>
        with the lot size of <strong>{twelveThirtyDb.queue.data.lots}</strong>
      </p>
    </Paper>
  );
};

export default TwelveThirtyDetails;
