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
  INSTRUMENT_DETAILS,
  INSTRUMENTS,
  STRATEGIES,
  STRANGLE_ENTRY_STRATEGIES,
  STRATEGIES_DETAILS
} from '../../../lib/constants'
import { ATM_STRANGLE_CONFIG, AvailablePlansConfig } from '../../../types/plans'
import HedgeComponent from '../../lib/HedgeComponent'
import VolatilityTypeComponent from '../../lib/VolatilityTypeComponent'
import ProductTypeComponent from '../../lib/ProductTypeComponent'
import RollbackComponent from '../../lib/RollbackComponent'
import DiscreteSlider from '../../lib/Slider'
import SlManagerComponent from '../../lib/SlManagerComponent'

interface ATMStrangleTradeSetupFormProps {
  formHeading?: string
  strategy: STRATEGIES
  state: ATM_STRANGLE_CONFIG
  isRunnable?: boolean
  onChange: (changedProps: Partial<ATM_STRANGLE_CONFIG>) => void
  onCancel: () => void
  onSubmit: (data: AvailablePlansConfig | null) => void
}

const TradeSetupForm = ({ formHeading, strategy = STRATEGIES.ATM_STRANGLE, state, onChange, onSubmit, onCancel, isRunnable = true }: ATMStrangleTradeSetupFormProps) => {
  const isSchedulingDisabled = false

  const enabledInstruments = [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY, INSTRUMENTS.FINNIFTY]
  const entryStrategies = [STRANGLE_ENTRY_STRATEGIES.DISTANCE_FROM_ATM, STRANGLE_ENTRY_STRATEGIES.DELTA_STIKES]
  const exitStrategies = [EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X, EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD]

  const handleFormSubmit = (e) => {
    e.preventDefault()
    onSubmit(formatFormDataForApi({ strategy, data: state }))
  }

  return (
    <form noValidate>
      <Paper style={{ padding: 16 }}>
        <Typography variant="h6" style={{ marginBottom: 16 }}>{formHeading ?? 'Setup new trade'}</Typography>
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

          <VolatilityTypeComponent state={state} onChange={onChange} />

          <ProductTypeComponent state={state} onChange={onChange} />

          <Grid item xs={12}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Entry strategy</FormLabel>
              <RadioGroup
                aria-label='entryStrategy'
                name='entryStrategy'
                value={state.entryStrategy}
                onChange={(e) => onChange({ entryStrategy: e.target.value as STRANGLE_ENTRY_STRATEGIES })}
              >
                {entryStrategies.map((entryStrategy) => (
                  <FormControlLabel
                    key={entryStrategy}
                    value={entryStrategy}
                    control={<Radio size='small' />}
                    label={
                      <Typography variant='body2'>
                        {STRATEGIES_DETAILS[STRATEGIES.ATM_STRANGLE].ENTRY_STRATEGY_DETAILS[entryStrategy].label}
                      </Typography>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item>
            {state.entryStrategy === STRANGLE_ENTRY_STRATEGIES.DISTANCE_FROM_ATM
              ? (
                <DiscreteSlider
                  label={'Strikes away from ATM strike'}
                  defaultValue={1}
                  step={1}
                  min={1}
                  max={20}
                  value={state.distanceFromAtm}
                  onChange={(e, newValue) => onChange({ distanceFromAtm: newValue })}
                />
              )
              : (
                <TextField
                  fullWidth
                  name='deltaStrikes'
                  value={state.deltaStrikes}
                  onChange={(e) => onChange({ deltaStrikes: +e.target.value || undefined })}
                  label='Strike delta'
                />
              )
            }
          </Grid>

          <Grid item xs={12} style={{ marginBottom: 8 }}>
            <TextField
              fullWidth
              name='lots'
              value={state.lots}
              onChange={(e) => onChange({ lots: +e.target.value || undefined })}
              label='# Lots'
            />
          </Grid>

          <SlManagerComponent state={state} onChange={onChange} exitStrategies={exitStrategies} />

          <Grid item xs={12}>
            <FormControl component='fieldset'>
              <FormGroup row>
                <FormControlLabel
                  label='Inverted Strangle'
                  control={
                    <Checkbox
                      name='instruments'
                      checked={state.inverted}
                      onChange={() => onChange({ inverted: !state.inverted })}
                    />
                  }
                />
              </FormGroup>
            </FormControl>
          </Grid>

          <HedgeComponent
            volatilityType={state.volatilityType}
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
                  onClick={(e) => {
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
