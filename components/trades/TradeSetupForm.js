import DateFnsUtils from '@date-io/date-fns';
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
import { KeyboardTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import dayjs from 'dayjs';
import React from 'react';

import { INSTRUMENT_DETAILS } from '../../lib/constants';

const TradeSetupForm = ({ enabledInstruments, state, onChange, onSubmit, helperText }) => {
  return (
    <form noValidate>
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
              label="Acceptable premium skew %"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="slmPercent"
              value={state.slmPercent}
              onChange={(e) => onChange({ slmPercent: e.target.value || '' })}
              label="SLM buy orders %"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="secondary"
              type="button"
              onClick={(e) => {
                onChange({ runNow: true });
              }}>
              Execute now
            </Button>
          </Grid>

          <Grid item xs={12}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardTimePicker
                margin="normal"
                id="time-picker"
                label="Schedule run"
                value={state.runAt}
                onChange={(selectedDate) => {
                  onChange({ runAt: selectedDate });
                }}
                KeyboardButtonProps={{
                  'aria-label': 'change time'
                }}
              />
            </MuiPickersUtilsProvider>
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" color="primary" type="button" onClick={() => onSubmit()}>
              Schedule for {dayjs(state.runAt).format('hh:mma')}
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
};
export default TradeSetupForm;
