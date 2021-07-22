import Accordion from '@material-ui/core/Accordion'
import AccordionDetails from '@material-ui/core/AccordionDetails'
import AccordionSummary from '@material-ui/core/AccordionSummary'
import Backdrop from '@material-ui/core/Backdrop'
import Button from '@material-ui/core/Button'
import Chip from '@material-ui/core/Chip'
import Fade from '@material-ui/core/Fade'
import FormControl from '@material-ui/core/FormControl'
import FormHelperText from '@material-ui/core/FormHelperText'
import Grid from '@material-ui/core/Grid'
import InputLabel from '@material-ui/core/InputLabel'
import MenuItem from '@material-ui/core/MenuItem'
import Modal from '@material-ui/core/Modal'
import Select from '@material-ui/core/Select'
import { makeStyles } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
import DoneIcon from '@material-ui/icons/Done'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import axios from 'axios'
import { omit } from 'lodash'
import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import ATM_Straddle_TradeForm from '../components/trades/atmStraddle/TradeSetupForm'
import DOS_TradeForm from '../components/trades/directionalOptionSelling/TradeSetupForm'
import { getSchedulingStateProps } from '../lib/browserUtils'
import { INSTRUMENT_DETAILS, STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants'

const useStyles = makeStyles((theme) => ({
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

const Plan = () => {
  const [dayState, setDayState] = useState({
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
  const [currentEditDay, setCurrentEditDay] = useState(null)
  const [currentEditStrategy, setCurrentEditStrategy] = useState(null)

  const classes = useStyles()

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleSelectStrategy = ({ dayOfWeek, selectedStrategy }) => {
    setDayState({
      ...dayState,
      [dayOfWeek]: {
        ...dayState[dayOfWeek],
        selectedStrategy
      }
    })
  }

  const getDefaultState = (strategy) => ({
    ...STRATEGIES_DETAILS[strategy].defaultFormState,
    ...getSchedulingStateProps(strategy)
  })

  const resetDefaultStratState = () =>
    [
      STRATEGIES.ATM_STRADDLE,
      STRATEGIES.CM_WED_THURS,
      STRATEGIES.DIRECTIONAL_OPTION_SELLING
    ].reduce(
      (accum, strat) => ({
        ...accum,
        [strat]: getDefaultState(strat)
      }),
      {}
    )

  const [stratState, setStratState] = useState(resetDefaultStratState)

  const onClickConfigureStrategy = ({ dayOfWeek, selectedStrategy }) => {
    setCurrentEditDay(dayOfWeek)
    setCurrentEditStrategy(selectedStrategy)
    setStratState(resetDefaultStratState())
    handleOpen()
  }

  const stratOnChangeHandler = (changedProps, strategy) => {
    if (changedProps.instruments) {
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

  const cleanupForRemoteSync = (props) => {
    return omit(props, ['instruments', 'disableInstrumentChange'])
  }

  const commonOnSubmitHandler = async (formattedStateForApiProps) => {
    const selectedConfig = stratState[currentEditStrategy]
    console.log('commonOnSubmitHandler', selectedConfig)

    let updatedConfig
    if (selectedConfig._id) {
      // editing an existing strategy
      await axios.put('/api/plan', {
        _id: selectedConfig._id,
        dayOfWeek: currentEditDay,
        config: cleanupForRemoteSync({ ...selectedConfig, ...formattedStateForApiProps })
      })

      updatedConfig = { [selectedConfig._id]: selectedConfig }
    } else {
      // creating a new strategy
      const config = Object.keys(selectedConfig.instruments)
        .filter((instrument) => selectedConfig.instruments[instrument])
        .map((instrument) => ({
          ...selectedConfig,
          ...formattedStateForApiProps,
          instrument,
          strategy: currentEditStrategy
        }))
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
      [currentEditDay]: {
        ...dayState[currentEditDay],
        strategies: {
          ...dayState[currentEditDay].strategies,
          ...updatedConfig
        }
      }
    })
    handleClose()
  }

  const handleEditStrategyConfig = ({ dayOfWeek, strategyKey }) => {
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
        instruments: { [stratConfig.instrument]: true },
        disableInstrumentChange: true
      }
    })

    handleOpen()
  }

  const handleDeleteStrategyConfig = async ({ dayOfWeek, strategyKey }) => {
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
          .filter((key) => key !== strategyKey)
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
  // }, [dayState]);

  useEffect(() => {
    async function fn () {
      const { data } = await axios('/api/plan')
      const dayWiseData = data.reduce((accum, config) => {
        if (accum[config._collection]) {
          return {
            ...accum,
            [config._collection]: { ...accum[config._collection], [config._id]: config }
          }
        }
        return {
          ...accum,
          [config._collection]: { [config._id]: config }
        }
      }, {})
      const updatedDayState = Object.keys(dayState).reduce((accum, dayKey) => {
        return {
          ...accum,
          [dayKey]: {
            ...dayState[dayKey],
            strategies: dayWiseData[dayKey] || {}
          }
        }
      }, {})

      setDayState(updatedDayState)
    }

    fn()
  }, [])

  return (
    <Layout>
      <Typography variant='h5' component='h1' style={{ marginBottom: 16 }}>
        Your daily trade plan
      </Typography>
      {Object.keys(dayState).map((dayOfWeek) => {
        const dayProps = dayState[dayOfWeek]
        return (
          <Accordion key={dayOfWeek}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${dayOfWeek}-content`}
              id={`${dayOfWeek}-header`}
            >
              <Typography className={classes.heading}>{dayProps.heading}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.flexVertical}>
              {Object.keys(dayProps.strategies).length ? (
                <>
                  <Typography component='p' variant='subtitle1'>
                    Saved trades — (click to edit, or cross to delete)
                  </Typography>
                  <div className={classes.pillsContainer}>
                    {Object.keys(dayProps.strategies).map((strategyKey) => {
                      const config = dayProps.strategies[strategyKey]
                      return (
                        <Chip
                          color='secondary'
                          key={`${dayOfWeek}_${strategyKey}`}
                          label={`${STRATEGIES_DETAILS[config.strategy].heading}/${
                            INSTRUMENT_DETAILS[config.instrument].displayName
                          }`}
                          onClick={() => handleEditStrategyConfig({ dayOfWeek, strategyKey })}
                          onDelete={() => handleDeleteStrategyConfig({ dayOfWeek, strategyKey })}
                        />
                      )
                    })}
                  </div>
                </>
              ) : null}
              <Grid container alignItems='flex-start' spacing={2}>
                <FormControl className={classes.formControl}>
                  <InputLabel id={`${dayOfWeek}_label`}>Select trade here</InputLabel>
                  <Select
                    labelId={`${dayOfWeek}_label`}
                    id={`${dayOfWeek}_strat_select`}
                    value={dayProps.selectedStrategy}
                    style={{ minWidth: 200 }}
                    onChange={(e) =>
                      handleSelectStrategy({ dayOfWeek, selectedStrategy: e.target.value })}
                  >
                    {[
                      STRATEGIES.ATM_STRADDLE,
                      STRATEGIES.CM_WED_THURS,
                      STRATEGIES.DIRECTIONAL_OPTION_SELLING
                    ].map((strategyKey) => (
                      <MenuItem value={strategyKey} key={`${dayOfWeek}_${strategyKey}`}>
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
                        selectedStrategy: dayProps.selectedStrategy
                      })}
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
            timeout: 500
          }}
        >
          <Fade in={open}>
            <div className={classes.paper}>
              <h2 id='transition-modal-title'>
                {dayState[currentEditDay].heading} |{' '}
                {STRATEGIES_DETAILS[currentEditStrategy].heading}
              </h2>
              {currentEditStrategy === STRATEGIES.DIRECTIONAL_OPTION_SELLING ? (
                <DOS_TradeForm
                  state={stratState[STRATEGIES.DIRECTIONAL_OPTION_SELLING]}
                  onChange={(changedProps) =>
                    stratOnChangeHandler(changedProps, STRATEGIES.DIRECTIONAL_OPTION_SELLING)}
                  onSubmit={commonOnSubmitHandler}
                  onCancel={commonOnCancelHandler}
                  isRunnable={false}
                />
              ) : currentEditStrategy === STRATEGIES.ATM_STRADDLE ? (
                <ATM_Straddle_TradeForm
                  strategy={STRATEGIES.ATM_STRADDLE}
                  state={stratState[STRATEGIES.ATM_STRADDLE]}
                  onChange={(changedProps) =>
                    stratOnChangeHandler(changedProps, STRATEGIES.ATM_STRADDLE)}
                  onSubmit={commonOnSubmitHandler}
                  onCancel={commonOnCancelHandler}
                  isRunnable={false}
                />
              ) : currentEditStrategy === STRATEGIES.CM_WED_THURS ? (
                <ATM_Straddle_TradeForm
                  strategy={STRATEGIES.CM_WED_THURS}
                  state={stratState[STRATEGIES.CM_WED_THURS]}
                  onChange={(changedProps) =>
                    stratOnChangeHandler(changedProps, STRATEGIES.CM_WED_THURS)}
                  onSubmit={commonOnSubmitHandler}
                  onCancel={commonOnCancelHandler}
                  isRunnable={false}
                />
              ) : null}
            </div>
          </Fade>
        </Modal>
      ) : null}
    </Layout>
  )
}

export default Plan
