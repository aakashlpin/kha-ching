import DateFnsUtils from '@date-io/date-fns';
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography
} from '@material-ui/core';
import Box from '@material-ui/core/Box';
import { KeyboardTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import dayjs from 'dayjs';
import React from 'react';

import { ensureIST, formatFormDataForApi } from '../../../lib/browserUtils';
import {
  EXIT_STRATEGIES,
  EXIT_STRATEGIES_DETAILS,
  INSTRUMENT_DETAILS,
  INSTRUMENTS,
  STRATEGIES
} from '../../../lib/constants';

const TradeSetupForm = ({ strategy, state, onChange, onSubmit, onCancel, isRunnable = true }) => {
  const isSchedulingDisabled = false;

  const enabledInstruments =
    strategy === STRATEGIES.ATM_STRADDLE
      ? [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY, INSTRUMENTS.FINNIFTY]
      : [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY];

  const exitStrategies =
    strategy === STRATEGIES.ATM_STRADDLE
      ? [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X, EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD]
      : [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(formatFormDataForApi({ strategy, data: state }));
  };

  return (
    <form noValidate>
      <Paper style={{ padding: 16 }}>
        {isRunnable ? <h3>Setup new trade</h3> : null}
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
                        disabled={state.disableInstrumentChange}
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
              label="# Lots (in multiples of 3 for 1:2 trade)"
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
          <Grid item xs={12} style={{ marginBottom: 16 }}>
            <TextField
              fullWidth
              name="expireIfUnsuccessfulInMins"
              value={state.expireIfUnsuccessfulInMins}
              onChange={(e) => onChange({ expireIfUnsuccessfulInMins: e.target.value || '' })}
              label="Enter trade irrespective skew after (in mins)"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Exit Strategy</FormLabel>
              <RadioGroup
                aria-label="exitStrategy"
                name="exitStrategy"
                value={state.exitStrategy}
                onChange={(e) => onChange({ exitStrategy: e.target.value })}>
                {exitStrategies.map((exitStrategy) => (
                  <FormControlLabel
                    key={exitStrategy}
                    value={exitStrategy}
                    control={<Radio />}
                    label={
                      <Typography style={{ fontSize: '14px' }}>
                        {EXIT_STRATEGIES_DETAILS[exitStrategy].label}
                      </Typography>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12} style={{ marginBottom: '16px' }}>
            <TextField
              fullWidth
              name="slmPercent"
              value={state.slmPercent}
              onChange={(e) => onChange({ slmPercent: e.target.value || '' })}
              label="SLM %"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormGroup column>
                <FormControlLabel
                  key={'autoSquareOff'}
                  label={'Auto Square off'}
                  control={
                    <Checkbox
                      checked={state.isAutoSquareOffEnabled}
                      onChange={() =>
                        onChange({
                          isAutoSquareOffEnabled: !state.isAutoSquareOffEnabled
                        })
                      }
                    />
                  }
                />
                {state.isAutoSquareOffEnabled ? (
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardTimePicker
                      margin="normal"
                      id="time-picker"
                      label="Square off time"
                      value={state.squareOffTime}
                      onChange={(selectedDate) => {
                        onChange({ squareOffTime: ensureIST(selectedDate) });
                      }}
                      KeyboardButtonProps={{
                        'aria-label': 'change square off time'
                      }}
                    />
                  </MuiPickersUtilsProvider>
                ) : null}
              </FormGroup>
            </FormControl>
          </Grid>
          {isRunnable ? (
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="secondary"
                type="button"
                onClick={(e) => {
                  onChange({ runNow: true });
                }}>
                Schedule now
              </Button>
            </Grid>
          ) : null}

          <Grid item xs={12}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardTimePicker
                margin="normal"
                id="time-picker"
                label="Schedule run"
                value={isSchedulingDisabled ? null : state.runAt}
                disabled={isSchedulingDisabled}
                onChange={(selectedDate) => {
                  onChange({ runAt: ensureIST(selectedDate) });
                }}
                KeyboardButtonProps={{
                  'aria-label': 'change time'
                }}
              />
            </MuiPickersUtilsProvider>
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              type="button"
              onClick={handleFormSubmit}
              disabled={isSchedulingDisabled}>
              {isSchedulingDisabled
                ? `Schedule run`
                : `Schedule for ${dayjs(state.runAt).format('hh:mma')}`}
            </Button>
            {!isRunnable ? (
              <Button
                variant="contained"
                color="default"
                type="button"
                onClick={onCancel}
                style={{ marginLeft: 8 }}>
                Cancel
              </Button>
            ) : null}
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <Box fontStyle="italic" fontSize={14}>
                <p>Note —</p>
                <ol>
                  {isRunnable ? (
                    <li>You can delete the task until scheduled time on the next step.</li>
                  ) : null}
                  <li>
                    Once task is active, if &quot;Acceptable Premium Skew&quot; does not happen
                    within &quot;Enter trade irrespective skew after (in mins)&quot;, the trade will
                    be punched irrespective of skew.`
                  </li>
                </ol>
              </Box>
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </form>
  );
};
export default TradeSetupForm;
