/* eslint-disable no-undef */
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

import { INSTRUMENTS } from '../../lib/constants';

const TwelveThirtyForm = ({ twelveThirtyState, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} noValidate>
    <Paper style={{ padding: 16 }}>
      <Grid container alignItems="flex-start" spacing={2}>
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Instruments</FormLabel>
            <FormGroup row>
              <FormControlLabel
                label="NIFTY 50"
                control={
                  <Checkbox
                    name="instruments"
                    checked={twelveThirtyState.instruments[INSTRUMENTS.NIFTY]}
                    onChange={(val) => {
                      onChange({
                        instruments: {
                          [INSTRUMENTS.NIFTY]: !twelveThirtyState.instruments[INSTRUMENTS.NIFTY]
                        }
                      });
                    }}
                  />
                }
              />
              <FormControlLabel
                label="BANKNIFTY"
                control={
                  <Checkbox
                    checked={twelveThirtyState.instruments[INSTRUMENTS.BANKNIFTY]}
                    onChange={() =>
                      onChange({
                        instruments: {
                          [INSTRUMENTS.BANKNIFTY]: !twelveThirtyState.instruments[
                            INSTRUMENTS.BANKNIFTY
                          ]
                        }
                      })
                    }
                  />
                }
              />
            </FormGroup>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="lots"
            value={twelveThirtyState.lots}
            onChange={(e) => onChange({ lots: e.target.value || '' })}
            label="Lots per instrument"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="maxSkewPercent"
            value={twelveThirtyState.maxSkewPercent}
            onChange={(e) => onChange({ maxSkewPercent: e.target.value || '' })}
            label="Acceptable skew %"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="slmPercent"
            value={twelveThirtyState.slmPercent}
            onChange={(e) => onChange({ slmPercent: e.target.value || '' })}
            label="SLM %"
          />
        </Grid>
        <Grid item style={{ marginTop: 16 }}>
          <Button variant="contained" color="primary" type="submit">
            Submit
          </Button>
        </Grid>
      </Grid>
    </Paper>
  </form>
);

export default TwelveThirtyForm;
