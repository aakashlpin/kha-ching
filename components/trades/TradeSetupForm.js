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

const TradeSetupForm = ({
  enabledInstruments,
  state,
  onChange,
  onSubmit,
  helperText,
  defaultRunAt
}) => {
  const [selectedDate, setSelectedDate] = React.useState(dayjs(defaultRunAt).toDate());

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

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
          <Grid item xs={12}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardTimePicker
                margin="normal"
                id="time-picker"
                label="Time"
                value={selectedDate}
                onChange={handleDateChange}
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
              style={{ marginRight: 16, marginBottom: 16 }}
              onClick={() => onSubmit()}>
              Schedule now
            </Button>
            <Button
              variant="contained"
              color="secondary"
              type="button"
              style={{ marginBottom: 16 }}
              onClick={() =>
                onSubmit({
                  runAt: selectedDate
                })
              }>
              Schedule for {dayjs(selectedDate).format('h.mma')}
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
