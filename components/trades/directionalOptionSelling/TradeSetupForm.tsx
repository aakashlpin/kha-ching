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
import {
  KeyboardTimePicker,
  MuiPickersUtilsProvider
} from '@material-ui/pickers'
import dayjs from 'dayjs'
import React from 'react'

import { ensureIST, formatFormDataForApi } from '../../../lib/browserUtils'
import {
  EXIT_STRATEGIES,
  INSTRUMENT_DETAILS,
  INSTRUMENTS,
  STRATEGIES,
  STRATEGIES_DETAILS,
  DOS_ENTRY_STRATEGIES,
  VOLATILITY_TYPE
} from '../../../lib/constants'
import {
  AvailablePlansConfig,
  DIRECTIONAL_OPTION_SELLING_CONFIG
} from '../../../types/plans'
import HedgeComponent from '../../lib/HedgeComponent'
import RollbackComponent from '../../lib/RollbackComponent'
import ProductTypeComponent from '../../lib/ProductTypeComponent'
import SlManagerComponent from '../../lib/SlManagerComponent'

interface DOSTradeSetupFormProps {
  state: Partial<DIRECTIONAL_OPTION_SELLING_CONFIG>
  formHeading?: string
  isRunnable?: boolean
  onChange: (changedProps: Partial<DIRECTIONAL_OPTION_SELLING_CONFIG>) => void
  onCancel?: () => void
  onSubmit: (data: Partial<DIRECTIONAL_OPTION_SELLING_CONFIG>) => Promise<any>
  enabledInstruments?: INSTRUMENTS[]
  exitStrategies?: EXIT_STRATEGIES[]
  entryStrategies?: DOS_ENTRY_STRATEGIES[]
}

const TradeSetupForm = ({
  state,
  formHeading,
  onChange,
  onSubmit,
  onCancel,
  isRunnable = true,
  enabledInstruments = [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY],
  exitStrategies = [EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND],
  entryStrategies = [
    STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.FIXED_TIME,
    STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE
  ]
}: DOSTradeSetupFormProps) => {
  const isSchedulingDisabled = false

  const handleFormSubmit = e => {
    e.preventDefault()
    onSubmit(
      formatFormDataForApi({
        strategy: STRATEGIES.DIRECTIONAL_OPTION_SELLING,
        data: state as AvailablePlansConfig
      }) as Partial<DIRECTIONAL_OPTION_SELLING_CONFIG>
    )
  }

  return (
    <form noValidate>
      <Paper style={{ padding: 16 }}>
        <Typography variant='h6' style={{ marginBottom: 16 }}>
          {formHeading ?? 'Setup new trade'}
        </Typography>
        <Grid container alignItems='flex-start' spacing={2}>
          <Grid item xs={12}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Instruments</FormLabel>
              <FormGroup row>
                {enabledInstruments.map(instrument => (
                  <FormControlLabel
                    key={instrument}
                    label={INSTRUMENT_DETAILS[instrument].displayName}
                    control={
                      <Checkbox
                        name='instruments'
                        disabled={state.disableInstrumentChange}
                        checked={state.instruments![instrument]}
                        onChange={() => {
                          onChange({
                            instruments: {
                              [instrument]: !state.instruments![instrument]
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

          <ProductTypeComponent state={state} onChange={onChange} />

          <Grid item xs={12}>
            <TextField
              fullWidth
              name='lots'
              value={state.lots}
              onChange={e => onChange({ lots: +e.target.value || undefined })}
              label='Initial lots'
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name='martingaleIncrementSize'
              value={state.martingaleIncrementSize}
              onChange={e =>
                onChange({
                  martingaleIncrementSize: +e.target.value || undefined
                })
              }
              label='Martingale additional lots'
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name='maxTrades'
              value={state.maxTrades}
              onChange={e =>
                onChange({ maxTrades: +e.target.value || undefined })
              }
              label='Maximum trades'
            />
          </Grid>
          <Grid item xs={12} style={{ marginBottom: 16 }}>
            <TextField
              fullWidth
              name='strikeByPrice'
              value={state.strikeByPrice}
              onChange={e =>
                onChange({ strikeByPrice: +e.target.value || undefined })
              }
              label='(Optional) Select strikes close to price'
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Enter trade</FormLabel>
              <RadioGroup
                aria-label='entryStrategy'
                name='entryStrategy'
                value={state.entryStrategy}
                onChange={e =>
                  onChange({
                    entryStrategy: e.target.value as DOS_ENTRY_STRATEGIES
                  })
                }
              >
                {entryStrategies.map(entryStrategy => (
                  <FormControlLabel
                    key={entryStrategy}
                    value={entryStrategy}
                    control={<Radio />}
                    label={
                      <Typography style={{ fontSize: '14px' }}>
                        {
                          STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING[
                            entryStrategy
                          ].label
                        }
                      </Typography>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>

          <SlManagerComponent
            state={state}
            onChange={onChange}
            exitStrategies={exitStrategies}
          />

          <HedgeComponent
            volatilityType={VOLATILITY_TYPE.SHORT}
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
                        })
                      }
                    />
                  }
                />
                {state.isAutoSquareOffEnabled ? (
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardTimePicker
                      margin='normal'
                      id='time-picker'
                      label='Square off time'
                      value={state.squareOffTime}
                      onChange={selectedDate => {
                        onChange({ squareOffTime: ensureIST(selectedDate) })
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

          <RollbackComponent rollback={state.rollback!} onChange={onChange} />

          {isRunnable ? (
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
          ) : null}

          <Grid item xs={12}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardTimePicker
                margin='normal'
                id='time-picker'
                label='Schedule run'
                value={isSchedulingDisabled ? null : state.runAt}
                disabled={isSchedulingDisabled}
                onChange={selectedDate => {
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
            {!isRunnable ? (
              <Button
                variant='contained'
                color='default'
                type='button'
                onClick={onCancel}
                style={{ marginLeft: 8 }}
                disabled={isSchedulingDisabled}
              >
                Cancel
              </Button>
            ) : null}
          </Grid>
        </Grid>
      </Paper>
    </form>
  )
}
export default TradeSetupForm
