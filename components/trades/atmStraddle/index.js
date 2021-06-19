import axios from 'axios';
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
  };

  const onChange = (props) => commonOnChangeHandler(props, state, setState);

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
