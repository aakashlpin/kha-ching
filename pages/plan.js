import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Backdrop from '@material-ui/core/Backdrop';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Fade from '@material-ui/core/Fade';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Modal from '@material-ui/core/Modal';
import Select from '@material-ui/core/Select';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import DoneIcon from '@material-ui/icons/Done';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { useState } from 'react';

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
}));
import Layout from '../components/Layout';
import DOS_TradeForm from '../components/trades/directionalOptionSelling/TradeSetupForm';
import { getSchedulingStateProps } from '../lib/browserUtils';
import { INSTRUMENT_DETAILS, INSTRUMENTS, STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants';

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
  });
  const [open, setOpen] = useState(false);
  const [currentEditDay, setCurrentEditDay] = useState(null);
  const [currentEditStrategy, setCurrentEditStrategy] = useState(null);

  const classes = useStyles();

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSelectStrategy = ({ dayOfWeek, selectedStrategy }) => {
    setDayState({
      ...dayState,
      [dayOfWeek]: {
        ...dayState[dayOfWeek],
        selectedStrategy
      }
    });
  };

  const onClickConfigureStrategy = ({ dayOfWeek, selectedStrategy }) => {
    setCurrentEditDay(dayOfWeek);
    setCurrentEditStrategy(selectedStrategy);
    handleOpen();
  };

  const getDefaultState = (strategy) => ({
    ...STRATEGIES_DETAILS[strategy].defaultFormState,
    ...getSchedulingStateProps(strategy)
  });

  const [stratState, setStratState] = useState(() => {
    return [
      STRATEGIES.ATM_STRADDLE,
      STRATEGIES.CM_WED_THURS,
      STRATEGIES.DIRECTIONAL_OPTION_SELLING
    ].reduce(
      (accum, strat) => ({
        ...accum,
        [strat]: getDefaultState(strat)
      }),
      {}
    );
  });

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
      });
    } else {
      setStratState({
        ...stratState,
        [strategy]: {
          ...stratState[strategy],
          ...changedProps
        }
      });
    }
  };

  const commonOnSubmitHandler = () => {
    const selectedConfig = stratState[currentEditStrategy];
    console.log('commonOnSubmitHandler', selectedConfig);
    setDayState({
      ...dayState,
      [currentEditDay]: {
        ...dayState[currentEditDay],
        strategies: {
          ...dayState[currentEditDay].strategies,
          ...Object.keys(selectedConfig.instruments)
            .filter((instrument) => selectedConfig.instruments[instrument])
            .reduce(
              (accum, instrument) => ({
                ...accum,
                [`${currentEditStrategy}_${instrument}`]: {
                  ...selectedConfig,
                  instrument,
                  strategy: currentEditStrategy
                }
              }),
              {}
            )
        }
      }
    });
    handleClose();
  };

  const handleEditStrategyConfig = ({ dayOfWeek, strategyKey }) => {
    setCurrentEditDay(dayOfWeek);
    const stratConfig = dayState[dayOfWeek].strategies[strategyKey];
    const { strategy } = stratConfig;
    setCurrentEditStrategy(strategy);
    setStratState({
      ...stratState,
      [strategy]: stratConfig
    });

    handleOpen();
  };

  const handleDeleteStrategyConfig = ({ dayOfWeek, strategyKey }) => {
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
    });
  };

  return (
    <Layout>
      <h1>Day-wise trade setup</h1>
      {Object.keys(dayState).map((dayOfWeek) => {
        const dayProps = dayState[dayOfWeek];
        return (
          <Accordion key={dayOfWeek}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${dayOfWeek}-content`}
              id={`${dayOfWeek}-header`}>
              <Typography className={classes.heading}>{dayProps.heading}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.flexVertical}>
              <div className={classes.pillsContainer}>
                {Object.keys(dayProps.strategies).map((strategyKey) => {
                  const config = dayProps.strategies[strategyKey];
                  return (
                    <Chip
                      key={`${dayOfWeek}_${strategyKey}`}
                      label={`${STRATEGIES_DETAILS[config.strategy].heading}/${
                        INSTRUMENT_DETAILS[config.instrument].displayName
                      }`}
                      onClick={() => handleEditStrategyConfig({ dayOfWeek, strategyKey })}
                      onDelete={() => handleDeleteStrategyConfig({ dayOfWeek, strategyKey })}
                    />
                  );
                })}
              </div>
              <Grid container alignItems="flex-start" spacing={2}>
                <FormControl className={classes.formControl}>
                  <InputLabel id={`${dayOfWeek}_label`}>Select strategy</InputLabel>
                  <Select
                    labelId={`${dayOfWeek}_label`}
                    id={`${dayOfWeek}_strat_select`}
                    value={dayProps.selectedStrategy}
                    onChange={(e) =>
                      handleSelectStrategy({ dayOfWeek, selectedStrategy: e.target.value })
                    }>
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
                    variant="contained"
                    color="primary"
                    type="button"
                    onClick={() =>
                      onClickConfigureStrategy({
                        dayOfWeek,
                        selectedStrategy: dayProps.selectedStrategy
                      })
                    }>
                    Configure
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}
      {currentEditStrategy ? (
        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          className={classes.modal}
          open={open}
          onClose={handleClose}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500
          }}>
          <Fade in={open}>
            <div className={classes.paper}>
              <h2 id="transition-modal-title">
                Configure {STRATEGIES_DETAILS[currentEditStrategy].heading} for{' '}
                {dayState[currentEditDay].heading}&apos;s
              </h2>
              {currentEditStrategy === STRATEGIES.DIRECTIONAL_OPTION_SELLING ? (
                <DOS_TradeForm
                  state={stratState[STRATEGIES.DIRECTIONAL_OPTION_SELLING]}
                  onChange={(changedProps) =>
                    stratOnChangeHandler(changedProps, STRATEGIES.DIRECTIONAL_OPTION_SELLING)
                  }
                  onSubmit={commonOnSubmitHandler}
                  isRunnable={false}
                />
              ) : null}
            </div>
          </Fade>
        </Modal>
      ) : null}
    </Layout>
  );
};

export default Plan;
