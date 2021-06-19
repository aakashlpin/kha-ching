import 'react-toastify/dist/ReactToastify.css';

import axios from 'axios';
import dayjs from 'dayjs';
import { omit } from 'lodash';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import {
  commonOnChangeHandler,
  getSchedulingStateProps,
  handleCreateJob
} from '../../../lib/browserUtils';
import {
  EXIT_STRATEGIES,
  INSTRUMENTS,
  STRATEGIES,
  STRATEGIES_DETAILS
} from '../../../lib/constants';
import Details from './TradeSetupDetails';
import Form from './TradeSetupForm';

/**
 *
 * lets show the details popup per instrument
 * set the actionable as "remove job" to clean up memory
 *
 * on the "days" section, show all jobs of the day only
 * and automatically clean up any jobs that belong to days before today
 */

const notify = (message) =>
  toast.error(message, {
    position: 'bottom-center',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined
  });

const DirectionTradeSetup = ({
  strategy = STRATEGIES.DIRECTIONAL_OPTION_SELLING,
  enabledInstruments = [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY],
  exitStrategies = [EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND],
  entryStrategies = [
    STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.FIXED_TIME,
    STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE
  ]
}) => {
  const router = useRouter();
  const { heading } = STRATEGIES_DETAILS[strategy];
  const getDefaultState = () => ({
    ...STRATEGIES_DETAILS[strategy].defaultFormState,
    ...getSchedulingStateProps(strategy)
  });

  const [state, setState] = useState(getDefaultState());

  const onSubmit = async (formattedStateForApiProps) => {
    if (state.runNow) {
      const yes = await window.confirm('This will schedule this trade immediately. Are you sure?');
      if (!yes) {
        setState({
          ...state,
          runNow: false
        });
        return;
      }
    }

    function handleSyncJob(props) {
      return axios.post('/api/trades_day', props);
    }

    try {
      await Promise.all(
        Object.keys(state.instruments)
          .filter((key) => state.instruments[key])
          .map((instrument) =>
            handleSyncJob({
              ...omit({ ...state, ...formattedStateForApiProps }, ['instruments']),
              instrument,
              strategy
            })
          )
      );

      setState(getDefaultState());

      router.push('/dashboard');
    } catch (e) {
      if (e.response) {
        notify(e.response.data);
      }
      console.error(e);
    }
  };

  const onChange = (props) => commonOnChangeHandler(props, state, setState);

  const onDeleteJob = async ({ jobId } = {}) => {
    if (!jobId) {
      throw new Error('onDeleteJob called without jobId');
    }

    try {
      await axios.post('/api/delete_job', {
        id: jobId
      });
    } catch (e) {
      console.log('error deleting job', e);
    }
  };

  useEffect(() => {
    if (state.runNow) {
      onSubmit();
    }
  }, [state.runNow]);

  return (
    <div style={{ marginBottom: '60px' }}>
      <h3>{heading}</h3>
      <Form
        state={state}
        onChange={onChange}
        onSubmit={onSubmit}
        enabledInstruments={enabledInstruments}
        exitStrategies={exitStrategies}
        entryStrategies={entryStrategies}
      />
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default DirectionTradeSetup;
