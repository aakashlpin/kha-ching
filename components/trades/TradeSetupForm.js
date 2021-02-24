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
import Box from '@material-ui/core/Box';
import React from 'react';

import { INSTRUMENT_DETAILS } from '../../lib/constants';

const TwelveThirtyForm = ({
  enabledInstruments,
  state,
  onChange,
  onSubmit,
  buttonText = 'Submit',
  helperText
}) => (
  <form onSubmit={onSubmit} noValidate>
    <Paper style={{ padding: 16 }}>
      <Grid container alignItems="flex-start" spacing={2}>
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Instruments</FormLabel>
            <FormGroup row>
              {enabledInstruments.map((instrument) => (
                <FormControlLabel
                  key={instrument}
                  label={INSTRUMENT_DETAILS[instrument].displayName}
                  control={
                    <Checkbox
                      name="instruments"
                      checked={state.instruments[instrument]}
                      onChange={() => {
                        onChange({
                          instruments: {
                            [instrument]: !state.instruments[instrument]
                          }
                        });
                      }}
                    />
                  }
                />
              ))}
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="lots"
            value={state.lots}
            onChange={(e) => onChange({ lots: e.target.value || '' })}
            label="Lots per instrument"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="maxSkewPercent"
            value={state.maxSkewPercent}
            onChange={(e) => onChange({ maxSkewPercent: e.target.value || '' })}
            label="Acceptable skew %"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="slmPercent"
            value={state.slmPercent}
            onChange={(e) => onChange({ slmPercent: e.target.value || '' })}
            label="SLM %"
          />
        </Grid>
        <Grid item style={{ marginTop: 16 }}>
          <Button variant="contained" color="primary" type="submit">
            {buttonText}
          </Button>
        </Grid>
        <Grid item xs={12}>
          <Typography>
            <Box fontStyle="italic" fontSize={14}>
              {helperText}
            </Box>
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  </form>
);

export default TwelveThirtyForm;
