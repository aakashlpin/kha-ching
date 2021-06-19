import axios from 'axios';
import dayjs from 'dayjs';
import { omit } from 'lodash';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { commonOnChangeHandler, getSchedulingStateProps } from '../../../lib/browserUtils';
import { STRATEGIES_DETAILS } from '../../../lib/constants';
import Form from './TradeSetupForm';

const AtmStraddle = ({ strategy }) => {
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
      const trades = await Promise.all(
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
      // if (e.response) {
      //   notify(e.response.data);
      // }
      // console.error(e);
    }

    // const {
    //   lots,
    //   maxSkewPercent,
    //   slmPercent,
    //   runNow,
    //   runAt,
    //   expireIfUnsuccessfulInMins,
    //   exitStrategy,
    //   isAutoSquareOffEnabled,
    //   squareOffTime
    // } = state;

    // const jobProps = {
    //   instruments: Object.keys(state.instruments).filter((key) => state.instruments[key]),
    //   lots,
    //   maxSkewPercent,
    //   slmPercent,
    //   runNow,
    //   runAt: runNow ? dayjs().format() : runAt,
    //   expireIfUnsuccessfulInMins,
    //   strategy,
    //   exitStrategy,
    //   isAutoSquareOffEnabled,
    //   squareOffTime: isAutoSquareOffEnabled ? dayjs(squareOffTime).set('seconds', 0).format() : null
    // };

    // try {
    //   const { data } = await axios.post('/api/create_job', jobProps);
    //   setState(getDefaultState());

    //   window.scrollTo({
    //     top: 0,
    //     behavior: 'smooth'
    //   });
    // } catch (e) {
    //   console.error(e);
    // }
  };

  const onChange = (props) => commonOnChangeHandler(props, state, setState);

  // const onDeleteJob = async ({ jobId } = {}) => {
  //   if (!jobId) {
  //     throw new Error('onDeleteJob called without jobId');
  //   }

  //   try {
  //     await axios.post('/api/delete_job', {
  //       id: jobId
  //     });
  //   } catch (e) {
  //     console.log('error deleting job', e);
  //   }
  // };

  useEffect(() => {
    if (state.runNow) {
      onSubmit();
    }
  }, [state.runNow]);

  return (
    <div style={{ marginBottom: '60px' }}>
      <h3>{heading}</h3>
      <Form strategy={strategy} state={state} onChange={onChange} onSubmit={onSubmit} />
    </div>
  );
};

export default AtmStraddle;
