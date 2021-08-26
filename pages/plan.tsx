import { Box, Container, Link, Paper } from '@material-ui/core'
import Accordion from '@material-ui/core/Accordion'
import AccordionDetails from '@material-ui/core/AccordionDetails'
import AccordionSummary from '@material-ui/core/AccordionSummary'
import Backdrop from '@material-ui/core/Backdrop'
import Button from '@material-ui/core/Button'
import Chip from '@material-ui/core/Chip'
import Fade from '@material-ui/core/Fade'
import FormControl from '@material-ui/core/FormControl'
import Grid from '@material-ui/core/Grid'
import InputLabel from '@material-ui/core/InputLabel'
import MenuItem from '@material-ui/core/MenuItem'
import Modal from '@material-ui/core/Modal'
import Select from '@material-ui/core/Select'
import { makeStyles } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import axios from 'axios'
import { omit } from 'lodash'
import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import ATMStraddleTradeForm from '../components/trades/atmStraddle/TradeSetupForm'
import ATMStrangleTradeForm from '../components/trades/atmStrangle/TradeSetupForm'
import DOSTradeForm from '../components/trades/directionalOptionSelling/TradeSetupForm'
import { getSchedulingStateProps } from '../lib/browserUtils'
import {
  INSTRUMENTS,
  INSTRUMENT_DETAILS,
  STRATEGIES,
  STRATEGIES_DETAILS
} from '../lib/constants'
import { DailyPlansConfig, DailyPlansDayKey } from '../types/misc'
import {
  ATM_STRADDLE_CONFIG,
  ATM_STRANGLE_CONFIG,
  AvailablePlansConfig,
  DIRECTIONAL_OPTION_SELLING_CONFIG
} from '../types/plans'

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%'
  },
  pillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    marginBottom: '16px',
    '& > *': {
      margin: theme.spacing(0.5)
    }
  },
  flexVertical: {
    flexDirection: 'column'
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120
  },
  selectEmpty: {
    marginTop: theme.spacing(2)
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'scroll',
    height: '100%',
    display: 'block'
  },
  backdrop: {
    background: 'rgba(0,0,0,0.75)'
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    border: '2px solid #000',
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3)
  }
}))

/**
 *
 * remote storage
 *
 * https://api.signalx.trade/key_16_digit_api_key/dayOfWeek
 */

interface StrategySelection {
  dayOfWeek: DailyPlansDayKey
  selectedStrategy: STRATEGIES
}

const getDefaultState = (strategy: STRATEGIES): AvailablePlansConfig =>
  ({
    ...STRATEGIES_DETAILS[strategy].defaultFormState,
    ...getSchedulingStateProps(strategy)
  } as AvailablePlansConfig)

const resetDefaultStratState = (): Record<STRATEGIES, AvailablePlansConfig> => {
  return {
    [STRATEGIES.ATM_STRADDLE]: getDefaultState(STRATEGIES.ATM_STRADDLE),
    [STRATEGIES.ATM_STRANGLE]: getDefaultState(STRATEGIES.ATM_STRANGLE),
    [STRATEGIES.DIRECTIONAL_OPTION_SELLING]: getDefaultState(
      STRATEGIES.DIRECTIONAL_OPTION_SELLING
    )
  } as Record<STRATEGIES, AvailablePlansConfig>
}

const Plan = () => {
  const [dayState, setDayState] = useState<DailyPlansConfig>({
    monday: {
      heading: 'Monday',
      selectedStrategy: '',
      strategies: {}
    },
    tuesday: {
      heading: 'Tuesday',
      selectedStrategy: '',
      strategies: {}
    },
    wednesday: {
      heading: 'Wednesday',
      selectedStrategy: '',
      strategies: {}
    },
    thursday: {
      heading: 'Thursday',
      selectedStrategy: '',
      strategies: {}
    },
    friday: {
      heading: 'Friday',
      selectedStrategy: '',
      strategies: {}
    }
  })
  const [open, setOpen] = useState(false)
  const [currentEditDay, setCurrentEditDay] = useState<DailyPlansDayKey>()
  const [currentEditStrategy, setCurrentEditStrategy] = useState<STRATEGIES>()

  const [stratState, setStratState] = useState(resetDefaultStratState)

  const classes = useStyles()

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleSelectStrategy = ({
    dayOfWeek,
    selectedStrategy
  }: StrategySelection) => {
    setDayState({
      ...dayState,
      [dayOfWeek]: {
        ...dayState[dayOfWeek],
        selectedStrategy
      }
    })
  }

  const onClickConfigureStrategy = ({
    dayOfWeek,
    selectedStrategy
  }: StrategySelection) => {
    setCurrentEditDay(dayOfWeek)
    setCurrentEditStrategy(selectedStrategy)
    setStratState(resetDefaultStratState())
    handleOpen()
  }

  const stratOnChangeHandler = (
    changedProps: Partial<AvailablePlansConfig>,
    strategy: STRATEGIES
  ) => {
    if (changedProps.instruments != null) {
      setStratState({
        ...stratState,
        [strategy]: {
          ...stratState[strategy],
          instruments: {
            ...stratState[strategy].instruments,
            ...changedProps.instruments
          }
        }
      })
    } else {
      setStratState({
        ...stratState,
        [strategy]: {
          ...stratState[strategy],
          ...changedProps
        }
      })
    }
  }

  const commonOnCancelHandler = () => {
    handleClose()
  }

  const cleanupForRemoteSync = (props: AvailablePlansConfig) => {
    return omit(props, ['instruments', 'disableInstrumentChange'])
  }

  const commonOnSubmitHandler = async (
    formattedStateForApiProps: AvailablePlansConfig
  ): Promise<any> => {
    const selectedConfig = stratState[currentEditStrategy!]
    // console.log('commonOnSubmitHandler', selectedConfig)

    let updatedConfig
    if (selectedConfig._id) {
      // editing an existing strategy
      await axios.put('/api/plan', {
        _id: selectedConfig._id,
        dayOfWeek: currentEditDay,
        config: cleanupForRemoteSync({
          ...selectedConfig,
          ...formattedStateForApiProps
        } as AvailablePlansConfig)
      })

      updatedConfig = { [selectedConfig._id]: selectedConfig }
    } else {
      // creating a new strategy
      const config = Object.keys(selectedConfig.instruments)
        .filter(instrument => selectedConfig.instruments[instrument])
        .map(
          (instrument): AvailablePlansConfig => ({
            ...selectedConfig,
            ...formattedStateForApiProps,
            instrument: instrument as INSTRUMENTS,
            strategy: currentEditStrategy as any
          })
        )
        .map(cleanupForRemoteSync)

      const { data: newStrategyConfig } = await axios.post('/api/plan', {
        dayOfWeek: currentEditDay,
        config
      })

      updatedConfig = newStrategyConfig.reduce(
        (accum, item) => ({
          ...accum,
          [item._id]: item
        }),
        {}
      )
    }

    setDayState({
      ...dayState,
      [currentEditDay as string]: {
        ...dayState[currentEditDay!],
        strategies: {
          ...dayState[currentEditDay!].strategies,
          ...updatedConfig
        }
      }
    })
    handleClose()
  }

  const handleEditStrategyConfig = ({
    dayOfWeek,
    strategyKey
  }: {
    dayOfWeek: DailyPlansDayKey
    strategyKey: string
  }) => {
    setCurrentEditDay(dayOfWeek)
    const stratConfig = dayState[dayOfWeek].strategies[strategyKey]
    const { strategy } = stratConfig
    setCurrentEditStrategy(strategy)
    setStratState({
      ...stratState,
      [strategy]: {
        // spread the default state so as to future proof new properties getting added in the base strategy
        // note that the plan will need to be backwards compatible with new props that
        // newly exist in defaultFormState but don't exist in stratConfig
        ...STRATEGIES_DETAILS[strategy].defaultFormState,
        ...stratConfig,
        instruments: { [stratConfig.instrument]: true } as Record<
          INSTRUMENTS,
          boolean
        >,
        disableInstrumentChange: true
      }
    })

    handleOpen()
  }

  const handleDeleteStrategyConfig = async ({
    dayOfWeek,
    strategyKey
  }: {
    dayOfWeek: DailyPlansDayKey
    strategyKey: string
  }) => {
    const stratConfig = dayState[dayOfWeek].strategies[strategyKey]
    await axios.delete('/api/plan', {
      // notice the change in payload for delete request
      data: {
        dayOfWeek: currentEditDay,
        config: stratConfig
      }
    })

    setDayState({
      ...dayState,
      [dayOfWeek]: {
        ...dayState[dayOfWeek],
        strategies: Object.keys(dayState[dayOfWeek].strategies)
          .filter(key => key !== strategyKey)
          .reduce(
            (accum, key) => ({
              ...accum,
              [key]: dayState[dayOfWeek].strategies[key]
            }),
            {}
          )
      }
    })
  }

  // useEffect(() => {
  //   console.log('dayState updated', dayState);
  // }, []);

  useEffect(() => {
    async function fn () {
      const { data } = await axios('/api/plan')
      const dayWiseData = data.reduce((accum, config) => {
        if (accum[config._collection]) {
          return {
            ...accum,
            [config._collection]: {
              ...accum[config._collection],
              [config._id]: config
            }
          }
        }
        return {
          ...accum,
          [config._collection]: { [config._id]: config }
        }
      }, {})
      const updatedDayState: DailyPlansConfig = Object.keys(dayState).reduce(
        (accum: any, dayKey: DailyPlansDayKey) => {
          return {
            ...accum,
            [dayKey]: {
              ...dayState[dayKey],
              strategies: dayWiseData[dayKey] || {}
            }
          }
        },
        {}
      )

      setDayState(updatedDayState)
    }

    fn()
  }, [])

  return (
    <Layout>
      <Typography variant='h5' component='h1' style={{ marginBottom: 16 }}>
        Your daily trade plan
      </Typography>
      {Object.keys(dayState).map((dayOfWeek: DailyPlansDayKey) => {
        const dayProps = dayState[dayOfWeek]
        return (
          <Accordion key={dayOfWeek}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${dayOfWeek}-content`}
              id={`${dayOfWeek}-header`}
            >
              <Typography className={classes.heading}>
                {dayProps.heading}
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.flexVertical}>
              {Object.keys(dayProps.strategies).length > 0 ? (
                <>
                  <Typography component='p' variant='subtitle1'>
                    Saved trades — (click to edit, or cross to delete)
                  </Typography>
                  <div className={classes.pillsContainer}>
                    {Object.keys(dayProps.strategies)
                      .filter(
                        strategyKey =>
                          dayProps.strategies[strategyKey].strategy in
                          stratState
                      )
                      .map(strategyKey => {
                        const config = dayProps.strategies[strategyKey]
                        return (
                          <Chip
                            color='secondary'
                            key={`${dayOfWeek}_${strategyKey}`}
                            label={`${
                              STRATEGIES_DETAILS[config.strategy].heading
                            }/${
                              INSTRUMENT_DETAILS[config.instrument].displayName
                            }`}
                            onClick={() =>
                              handleEditStrategyConfig({
                                dayOfWeek,
                                strategyKey
                              })
                            }
                            onDelete={async () =>
                              await handleDeleteStrategyConfig({
                                dayOfWeek,
                                strategyKey
                              })
                            }
                          />
                        )
                      })}
                  </div>
                </>
              ) : null}
              <Grid container alignItems='flex-start' spacing={2}>
                <FormControl className={classes.formControl}>
                  <InputLabel id={`${dayOfWeek}_label`}>
                    Select trade here
                  </InputLabel>
                  <Select
                    labelId={`${dayOfWeek}_label`}
                    id={`${dayOfWeek}_strat_select`}
                    value={dayProps.selectedStrategy}
                    style={{ minWidth: 200 }}
                    onChange={e =>
                      handleSelectStrategy({
                        dayOfWeek,
                        selectedStrategy: e.target.value as STRATEGIES
                      })
                    }
                  >
                    {[
                      STRATEGIES.ATM_STRADDLE,
                      STRATEGIES.ATM_STRANGLE,
                      STRATEGIES.DIRECTIONAL_OPTION_SELLING
                    ].map(strategyKey => (
                      <MenuItem
                        value={strategyKey}
                        key={`${dayOfWeek}_${strategyKey}`}
                      >
                        {STRATEGIES_DETAILS[strategyKey].heading}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Grid item xs={12}>
                  <Button
                    variant='contained'
                    color='primary'
                    type='button'
                    onClick={() =>
                      onClickConfigureStrategy({
                        dayOfWeek,
                        selectedStrategy: dayProps.selectedStrategy as STRATEGIES
                      })
                    }
                  >
                    Configure
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )
      })}
      {currentEditStrategy ? (
        <Modal
          aria-labelledby='transition-modal-title'
          aria-describedby='transition-modal-description'
          className={classes.modal}
          open={open}
          onClose={handleClose}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            classes: {
              root: classes.backdrop
            },
            timeout: 500
          }}
        >
          <Container maxWidth='sm'>
            <Fade in={open}>
              <Box>
                <Typography variant='subtitle2'>
                  <Link
                    onClick={commonOnCancelHandler}
                    style={{ color: 'white' }}
                  >
                    &lt; cancel and go back
                  </Link>
                </Typography>
                {currentEditStrategy ===
                STRATEGIES.DIRECTIONAL_OPTION_SELLING ? (
                  <DOSTradeForm
                    formHeading={`Editing ${
                      STRATEGIES_DETAILS[currentEditStrategy].heading
                    } for ${dayState[currentEditDay!].heading}`}
                    state={
                      stratState[
                        STRATEGIES.DIRECTIONAL_OPTION_SELLING
                      ] as DIRECTIONAL_OPTION_SELLING_CONFIG
                    }
                    onChange={changedProps =>
                      stratOnChangeHandler(
                        changedProps,
                        STRATEGIES.DIRECTIONAL_OPTION_SELLING
                      )
                    }
                    onSubmit={commonOnSubmitHandler as any}
                    onCancel={commonOnCancelHandler}
                    isRunnable={false}
                  />
                ) : currentEditStrategy === STRATEGIES.ATM_STRADDLE ? (
                  <ATMStraddleTradeForm
                    formHeading={`Editing ${
                      STRATEGIES_DETAILS[currentEditStrategy].heading
                    } for ${dayState[currentEditDay!].heading}`}
                    state={
                      stratState[STRATEGIES.ATM_STRADDLE] as ATM_STRADDLE_CONFIG
                    }
                    onChange={changedProps =>
                      stratOnChangeHandler(
                        changedProps,
                        STRATEGIES.ATM_STRADDLE
                      )
                    }
                    onSubmit={commonOnSubmitHandler}
                    onCancel={commonOnCancelHandler}
                    isRunnable={false}
                    strategy={STRATEGIES.ATM_STRADDLE}
                  />
                ) : currentEditStrategy === STRATEGIES.ATM_STRANGLE ? (
                  <ATMStrangleTradeForm
                    formHeading={`Editing ${
                      STRATEGIES_DETAILS[currentEditStrategy].heading
                    } for ${dayState[currentEditDay!].heading}`}
                    state={
                      stratState[STRATEGIES.ATM_STRANGLE] as ATM_STRANGLE_CONFIG
                    }
                    onChange={changedProps =>
                      stratOnChangeHandler(
                        changedProps,
                        STRATEGIES.ATM_STRANGLE
                      )
                    }
                    onSubmit={commonOnSubmitHandler}
                    onCancel={commonOnCancelHandler}
                    isRunnable={false}
                    strategy={STRATEGIES.ATM_STRANGLE}
                  />
                ) : null}
              </Box>
            </Fade>
          </Container>
        </Modal>
      ) : null}
    </Layout>
  )
}

export default Plan
