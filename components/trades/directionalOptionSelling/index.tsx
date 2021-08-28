import axios from 'axios'
import { omit } from 'lodash'
import { useRouter } from 'next/router'
import React, { Dispatch, useCallback, useEffect, useState } from 'react'

import {
  commonOnChangeHandler,
  formatFormDataForApi,
  getSchedulingStateProps
} from '../../../lib/browserUtils'
import {
  EXIT_STRATEGIES,
  INSTRUMENTS,
  STRATEGIES,
  STRATEGIES_DETAILS
} from '../../../lib/constants'
import {
  AvailablePlansConfig,
  DIRECTIONAL_OPTION_SELLING_CONFIG
} from '../../../types/plans'
import Form from './TradeSetupForm'

const DirectionTradeSetup = ({
  enabledInstruments = [INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY],
  exitStrategies = [EXIT_STRATEGIES.MIN_XPERCENT_OR_SUPERTREND],
  entryStrategies = [
    STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.FIXED_TIME,
    STRATEGIES_DETAILS.DIRECTIONAL_OPTION_SELLING.ENTRY_STRATEGIES.ST_CHANGE
  ]
}) => {
  const router = useRouter()
  const strategy = STRATEGIES.DIRECTIONAL_OPTION_SELLING
  const { heading } = STRATEGIES_DETAILS[strategy]
  const getDefaultState = useCallback(
    (): Partial<DIRECTIONAL_OPTION_SELLING_CONFIG> => ({
      ...STRATEGIES_DETAILS[STRATEGIES.DIRECTIONAL_OPTION_SELLING]
        .defaultFormState,
      ...getSchedulingStateProps(strategy)
    }),
    [strategy]
  )

  const [state, setState] = useState(getDefaultState())

  const onSubmit = useCallback(
    async (formattedStateForApiProps = {}) => {
      if (state.runNow) {
        const yes = await window.confirm(
          'This will schedule this trade immediately. Are you sure?'
        )
        if (!yes) {
          setState({
            ...state,
            runNow: false
          })
          return
        }
      }

      async function handleSyncJob (props) {
        return axios.post(
          '/api/trades_day',
          formatFormDataForApi({ strategy, data: props })
        )
      }

      try {
        await Promise.all(
          Object.keys(state.instruments as {})
            .filter(key => state.instruments![key])
            .map(async instrument =>
              handleSyncJob({
                ...omit({ ...state, ...formattedStateForApiProps }, [
                  'instruments'
                ]),
                instrument,
                strategy
              })
            )
        )

        setState(getDefaultState())

        router.push('/dashboard?tabId=0')
      } catch (e) {
        console.error(e)
      }
    },
    [getDefaultState, router, state, strategy]
  )

  const onChange = props =>
    commonOnChangeHandler(
      props,
      state as AvailablePlansConfig,
      setState as Dispatch<AvailablePlansConfig>
    )

  useEffect(() => {
    if (state.runNow) {
      onSubmit()
    }
  }, [state.runNow, onSubmit])

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
  )
}

export default DirectionTradeSetup
