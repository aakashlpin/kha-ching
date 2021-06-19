import axios from 'axios';
import { omit } from 'lodash';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { commonOnChangeHandler, getSchedulingStateProps } from '../../../lib/browserUtils';
import {
  EXIT_STRATEGIES,
  INSTRUMENTS,
  STRATEGIES,
  STRATEGIES_DETAILS
} from '../../../lib/constants';
import Form from './TradeSetupForm';

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

      router.push('/dashboard?tabId=0');
    } catch (e) {
      console.error(e);
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
      <Form
        state={state}
        onChange={onChange}
        onSubmit={onSubmit}
        enabledInstruments={enabledInstruments}
        exitStrategies={exitStrategies}
        entryStrategies={entryStrategies}
      />
    </div>
  );
};

export default DirectionTradeSetup;
