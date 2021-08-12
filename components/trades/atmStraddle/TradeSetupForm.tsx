import DateFnsUtils from '@date-io/date-fns'
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
} from '@material-ui/core'
import { KeyboardTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers'
import dayjs from 'dayjs'
import React from 'react'

import { ensureIST, formatFormDataForApi } from '../../../lib/browserUtils'
import {
  EXIT_STRATEGIES,
  EXIT_STRATEGIES_DETAILS,
  INSTRUMENT_DETAILS,
  INSTRUMENTS,
  STRATEGIES
} from '../../../lib/constants'
import { ATM_STRADDLE_CONFIG, AvailablePlansConfig } from '../../../types/plans'
import HedgeComponent from '../../lib/HedgeComponent'
import RollbackComponent from '../../lib/RollbackComponent'

interface ATMStraddleTradeSetupFormProps {
  strategy: STRATEGIES
  state: ATM_STRADDLE_CONFIG
  isRunnable?: boolean
  onChange: (changedProps: Partial<ATM_STRADDLE_CONFIG>) => void
  onCancel: () => void
  onSubmit: (data: AvailablePlansConfig | null) => void
}

const TradeSetupForm = ({ strategy = STRATEGIES.ATM_STRADDLE, state, onChange, onSubmit, onCancel, isRunnable = true }: ATMStraddleTradeSetupFormProps) => {
  const isSchedulingDisabled = false

  const enabledInstruments =
    strategy === STRATEGIES.ATM_STRADDLE
      ? [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY, INSTRUMENTS.FINNIFTY]
      : [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY]

  const exitStrategies =
    strategy === STRATEGIES.ATM_STRADDLE
      ? [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X, EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD]
      : [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X]

  const handleFormSubmit = (e) => {
    e.preventDefault()
    onSubmit(formatFormDataForApi({ strategy, data: state }))
  }

  return (
    <form noValidate>
      <Paper style={{ padding: 16 }}>
        {isRunnable ? <h3>Setup new trade</h3> : null}
        <Grid container alignItems='flex-start' spacing={2}>
          <Grid item xs={12}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Instruments</FormLabel>
              <FormGroup row>
                {enabledInstruments.map((instrument) => (
                  <FormControlLabel
                    key={instrument}
                    label={INSTRUMENT_DETAILS[instrument].displayName}
                    control={
                      <Checkbox
                        name='instruments'
                        disabled={state.disableInstrumentChange}
                        checked={state.instruments[instrument]}
                        onChange={() => {
                          onChange({
                            instruments: {
                              [instrument]: !state.instruments[instrument]
                            } as Record<INSTRUMENTS, boolean>
                          })
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
              name='lots'
              value={state.lots}
              onChange={(e) => onChange({ lots: +e.target.value || undefined })}
              label='# Lots'
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              name='maxSkewPercent'
              value={state.maxSkewPercent}
              onChange={(e) => onChange({ maxSkewPercent: +e.target.value || undefined })}
              label='Ideal skew %'
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              name='thresholdSkewPercent'
              value={state.thresholdSkewPercent}
              onChange={(e) => onChange({ thresholdSkewPercent: +e.target.value || undefined })}
              label='Threshold skew %'
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name='expireIfUnsuccessfulInMins'
              value={state.expireIfUnsuccessfulInMins}
              onChange={(e) => onChange({ expireIfUnsuccessfulInMins: +e.target.value || undefined })}
              label='Run skew checker for (in mins)'
            />
          </Grid>

          <Grid item xs={12} style={{ marginBottom: 16 }}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Once skew checker has expired</FormLabel>
              <RadioGroup
                aria-label='takeTradeIrrespectiveSkew'
                name='takeTradeIrrespectiveSkew'
                value={state.takeTradeIrrespectiveSkew}
                onChange={() =>
                  onChange({ takeTradeIrrespectiveSkew: !state.takeTradeIrrespectiveSkew })}
              >
                <FormControlLabel
                  value={false}
                  control={<Radio size='small' />}
                  label={
                    <Typography variant='body2'>Reject trade as skew never converged</Typography>
                  }
                />
                <FormControlLabel
                  value
                  control={<Radio size='small' />}
                  label={<Typography variant='body2'>Enter trade irrespective of skew</Typography>}
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Exit Strategy</FormLabel>
              <RadioGroup
                aria-label='exitStrategy'
                name='exitStrategy'
                value={state.exitStrategy}
                onChange={(e) => onChange({ exitStrategy: e.target.value as EXIT_STRATEGIES })}
              >
                {exitStrategies.map((exitStrategy) => (
                  <FormControlLabel
                    key={exitStrategy}
                    value={exitStrategy}
                    control={<Radio size='small' />}
                    label={
                      <Typography variant='body2'>
                        {EXIT_STRATEGIES_DETAILS[exitStrategy].label}
                      </Typography>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>
          {state.exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
            ? (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name='trailEveryPercentageChangeValue'
                    value={state.trailEveryPercentageChangeValue}
                    onChange={(e) => onChange({ trailEveryPercentageChangeValue: +e.target.value || undefined })}
                    label='Trail SL everytime combined premium decreases by %'
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name='trailingSlPercent'
                    value={state.trailingSlPercent}
                    onChange={(e) => onChange({ trailingSlPercent: +e.target.value || undefined })}
                    label='Trailing SL %'
                  />
                </Grid>
              </>
              )
            : null}

          <Grid item xs={12} style={{ marginBottom: '16px' }}>
            <TextField
              fullWidth
              name='slmPercent'
              value={state.slmPercent}
              onChange={(e) => onChange({ slmPercent: +e.target.value || undefined })}
              label={state.exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD ? 'Initial SL %' : 'SL %'}
            />
          </Grid>

          <HedgeComponent
            isHedgeEnabled={state.isHedgeEnabled}
            hedgeDistance={state.hedgeDistance}
            onChange={onChange}
          />

          <Grid item xs={12}>
            <FormControl component='fieldset'>
              <FormGroup>
                <FormControlLabel
                  key='autoSquareOff'
                  label='Auto Square off'
                  control={
                    <Checkbox
                      checked={state.isAutoSquareOffEnabled}
                      onChange={() =>
                        onChange({
                          isAutoSquareOffEnabled: !state.isAutoSquareOffEnabled
                        })}
                    />
                  }
                />
                {state.isAutoSquareOffEnabled
                  ? (
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                      <KeyboardTimePicker
                        margin='normal'
                        id='time-picker'
                        label='Square off time'
                        value={state.squareOffTime}
                        onChange={(selectedDate) => {
                          onChange({ squareOffTime: ensureIST(selectedDate) })
                        }}
                        KeyboardButtonProps={{
                          'aria-label': 'change square off time'
                        }}
                      />
                    </MuiPickersUtilsProvider>
                    )
                  : null}
              </FormGroup>
            </FormControl>
          </Grid>

          <RollbackComponent rollback={state.rollback!} onChange={onChange} />

          {isRunnable
            ? (
              <Grid item xs={12}>
                <Button
                  variant='contained'
                  color='secondary'
                  type='button'
                  onClick={() => {
                    onChange({ runNow: true })
                  }}
                >
                  Schedule now
                </Button>
              </Grid>
              )
            : null}

          <Grid item xs={12}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardTimePicker
                margin='normal'
                id='time-picker'
                label='Schedule run'
                value={isSchedulingDisabled ? null : state.runAt}
                disabled={isSchedulingDisabled}
                onChange={(selectedDate) => {
                  onChange({ runAt: ensureIST(selectedDate) })
                }}
                KeyboardButtonProps={{
                  'aria-label': 'change time'
                }}
              />
            </MuiPickersUtilsProvider>
          </Grid>

          <Grid item xs={12}>
            <Button
              variant='contained'
              color='primary'
              type='button'
              onClick={handleFormSubmit}
              disabled={isSchedulingDisabled}
            >
              {isSchedulingDisabled
                ? 'Schedule run'
                : `Schedule for ${dayjs(state.runAt).format('hh:mma')}`}
            </Button>
            {!isRunnable
              ? (
                <Button
                  variant='contained'
                  color='default'
                  type='button'
                  onClick={onCancel}
                  style={{ marginLeft: 8 }}
                >
                  Cancel
                </Button>
                )
              : null}
          </Grid>
        </Grid>
      </Paper>
    </form>
  )
}
export default TradeSetupForm
