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
        <Grid item>
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
              <FormControlLabel
                label="FINNIFTY"
                control={
                  <Checkbox
                    name="instruments"
                    checked={twelveThirtyState.instruments[INSTRUMENTS.FINNIFTY]}
                    onChange={() =>
                      onChange({
                        instruments: {
                          [INSTRUMENTS.FINNIFTY]: !twelveThirtyState.instruments[
                            INSTRUMENTS.FINNIFTY
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
        <Grid item xs={6}>
          <TextField
            fullWidth
            name="lots"
            value={twelveThirtyState.lots}
            onChange={(val) => onChange({ lots: val })}
            label="Number of lots per instrument"
          />
        </Grid>
        <Grid item xs={6}>
          <FormControlLabel
            name="autoSquareOff"
            label="Auto square off (3.20pm)"
            control={<Checkbox name="autoSquareOff" type="checkbox" disabled />}
          />
        </Grid>

        <Grid item style={{ marginTop: 16 }}>
          <Button variant="contained" color="primary" type="submit">
            Submit
          </Button>
        </Grid>
      </Grid>
    </Paper>
    <pre>{JSON.stringify(twelveThirtyState, 0, 2)}</pre>
  </form>
);

export default TwelveThirtyForm;
