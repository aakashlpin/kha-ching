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
  STRANGLE_ENTRY_STRATEGIES,
  STRATEGIES_DETAILS,
  OTS_ENTRY_STRATEGIES
} from '../../../lib/constants'
import { OTS_CONFIG, AvailablePlansConfig } from '../../../types/plans'
import VolatilityTypeComponent from '../../lib/VolatilityTypeComponent'
import ProductTypeComponent from '../../lib/ProductTypeComponent'
import DiscreteSlider from '../../lib/Slider'
import SlManagerComponent from '../../lib/SlManagerComponent'
import ExpiryTypeComponent from '../../lib/ExpiryTypeComponent'

interface OTSTradeSetupFormProps {
  formHeading?: string
  strategy: STRATEGIES
  state: OTS_CONFIG
  isRunnable?: boolean
  onChange: (changedProps: Partial<OTS_CONFIG>) => void
  onCancel: () => void
  onSubmit: (data: AvailablePlansConfig | null) => void
}

const TradeSetupForm = ({
  formHeading,
  strategy = STRATEGIES.OVERNIGHT_TREND_STATEGY,
  state,
  onChange,
  onSubmit,
  onCancel,
  isRunnable = true
}: OTSTradeSetupFormProps) => {
  const isSchedulingDisabled = false

  const enabledInstruments = [
    INSTRUMENTS.NIFTY,
    INSTRUMENTS.BANKNIFTY,
    INSTRUMENTS.FINNIFTY
  ]
  const entryStrategies = [
    OTS_ENTRY_STRATEGIES.DISTANCE_FROM_ATM
  ]
  const exitStrategies = [
    EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X,
    EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD,
    EXIT_STRATEGIES.NO_SL
  ]

  const handleFormSubmit = e => {
    e.preventDefault()
    onSubmit(formatFormDataForApi({ strategy, data: state }))
  }
  console.log(state);
  return (
    <form noValidate>
      <Paper style={{ padding: 16 }}>
        <Typography variant='h6' style={{ marginBottom: 16 }}>
          {formHeading ?? 'Setup new trade'}
        </Typography>
        <Grid container alignItems='flex-start' spacing={2}>
        <Grid item xs={12}>
            <TextField
              fullWidth
              name='name'
              value={state.name}
              onChange={e => onChange({ name: e.target.value || undefined })}
              label='Name of trade '
            />
         </Grid>
      
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

          <ExpiryTypeComponent state={state} onChange={onChange} />

          <Grid item xs={12}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Entry strategy</FormLabel>
              <RadioGroup
                aria-label='entryStrategy'
                name='entryStrategy'
                value={state.entryStrategy}
                onChange={e =>
                  onChange({
                    entryStrategy: e.target.value as OTS_ENTRY_STRATEGIES
                  })
                }
              >
                {entryStrategies.map(entryStrategy => (
                  <FormControlLabel
                    key={entryStrategy}
                    value={entryStrategy}
                    control={<Radio size='small' />}
                    label={
                      <Typography variant='body2'>
                        {
                          STRATEGIES_DETAILS[STRATEGIES.OVERNIGHT_TREND_STATEGY]
                            .ENTRY_STRATEGY_DETAILS[entryStrategy].label
                        }
                      </Typography>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item>
           
              <DiscreteSlider
                label={'Strikes away from ATM strike'}
                defaultValue={1}
                step={1}
                min={0}
                max={10}
                value={state.distanceFromAtm}
                onChange={(e, newValue) =>
                  onChange({ distanceFromAtm: newValue })
                }
              />
          </Grid>

          <Grid item xs={12} style={{ marginBottom: 8 }}>
            <TextField
              fullWidth
              name='lots'
              value={state.lots}
              onChange={e => onChange({ lots: +e.target.value || undefined })}
              label='# Lots'
            />
          </Grid>

          <SlManagerComponent
            state={state}
            onChange={onChange}
            exitStrategies={exitStrategies}
          />
          {isRunnable ? (
            <Grid item xs={12}>
              <Button
                variant='contained'
                color='secondary'
                type='button'
                onClick={e => {
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
