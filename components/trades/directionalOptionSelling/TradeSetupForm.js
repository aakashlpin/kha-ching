/* eslint-disable jsx-a11y/accessible-emoji */
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

import { ensureIST } from '../../../lib/browserUtils';
import {
  EXIT_STRATEGIES,
  EXIT_STRATEGIES_DETAILS,
  INSTRUMENT_DETAILS,
  INSTRUMENTS,
  STRATEGIES_DETAILS
} from '../../../lib/constants';

const TradeSetupForm = ({
  state,
  onChange,
  onSubmit,
  isRunnable = true,
  enabledInstruments = [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY],
  exitStrategies = [EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND],
  entryStrategies = [
    STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.FIXED_TIME,
    STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE
  ]
}) => {
  // const isSchedulingDisabled =
  //   dayjs().get('hours') > 15 || (dayjs().get('hours') === 15 && dayjs().get('minutes') > 30);
  const isSchedulingDisabled = false;

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
              label="Initial lots"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="martingaleIncrementSize"
              value={state.martingaleIncrementSize}
              onChange={(e) => onChange({ martingaleIncrementSize: e.target.value || '' })}
              label="⚡️ Martingale additional lots"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="maxTrades"
              value={state.maxTrades}
              onChange={(e) => onChange({ maxTrades: e.target.value || '' })}
              label="⚡️ Maximum trades to take"
            />
          </Grid>
          <Grid item xs={12} style={{ marginBottom: 16 }}>
            <TextField
              fullWidth
              name="strikeByPrice"
              value={state.strikeByPrice}
              onChange={(e) => onChange({ strikeByPrice: e.target.value || '' })}
              label="(Optional) Select strikes close to price"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Enter trade</FormLabel>
              <RadioGroup
                aria-label="entryStrategy"
                name="entryStrategy"
                value={state.entryStrategy}
                onChange={(e) => onChange({ entryStrategy: e.target.value })}>
                {entryStrategies.map((entryStrategy) => (
                  <FormControlLabel
                    key={entryStrategy}
                    value={entryStrategy}
                    control={<Radio />}
                    label={
                      <Typography style={{ fontSize: '14px' }}>
                        {STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING[entryStrategy].label}
                      </Typography>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
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
          <Grid item xs={12} style={{ marginBottom: 16 }}>
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
              onClick={() => onSubmit()}
              disabled={isSchedulingDisabled}>
              {isSchedulingDisabled
                ? `Schedule run`
                : `Schedule for ${dayjs(state.runAt).format('hh:mma')}`}
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <Box fontStyle="italic" fontSize={14}>
                <p>Note —</p>
                <ol>
                  <li>
                    ⚡️ Martingale additional lots — if Supertrend (10,3) on futures changes, next
                    trade gets taken with last lot size + martingale additional lots. Set it to 0 if
                    you wish to deactivate the martingale method.
                  </li>
                  <li>
                    ⚡️ Maximum trades to take — it&apos;s recommended to NOT trade more than 3
                    Supertrend changes per day. Set it to 1 if you wish to take only 1 trade/day.
                  </li>
                  {isRunnable ? (
                    <li>You can delete the task until scheduled time on the next step.</li>
                  ) : null}
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
