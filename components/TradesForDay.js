import { Button, Grid, Paper, Typography } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import TimeAgo from 'react-timeago';
import useSWR, { mutate } from 'swr';

import { INSTRUMENT_DETAILS, STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants';
import OrdersTable from './lib/ordersTable';
import ATM_StraddleDetails from './trades/atmStraddle/TradeSetupDetails';
import DOS_Details from './trades/directionalOptionSelling/TradeSetupDetails';

const WrapperComponent = (props) => {
  const jobWasQueued = props.status !== 'REJECT' && props.queue?.id;
  const { data: jobDetails, error } = useSWR(
    jobWasQueued ? `/api/get_job?id=${props.queue.id}` : null
  );

  const strategyDetails = STRATEGIES_DETAILS[props.strategy];
  const humanTime = dayjs(props.runAt).format('h.mma');
  const isJobPastScheduledTime = props.runNow || dayjs().isAfter(props.runAt);
  const Heading = () => {
    if (!jobWasQueued) {
      if (props.status_message) {
        return (
          <>
            <Typography variant="p" color="error">
              FAILED: {props.status_message}
            </Typography>
            <p>{strategyDetails.heading}</p>
          </>
        );
      } else {
        return <>Something went wrong!</>;
      }
    }

    return (
      <Typography variant="p" color="">
        #{props.queue.id} · {strategyDetails.heading}{' '}
        {isJobPastScheduledTime ? (
          <>
            was run <TimeAgo date={new Date(props.queue.timestamp)} />.
          </>
        ) : (
          <>is scheduled to run at {humanTime}.</>
        )}
      </Typography>
    );
  };

  const deleteDisclaimer = !props.runNow
    ? `⏰ This task can be safely deleted before the clock hits ${humanTime}.`
    : null;

  const handleDeleteTrade = async (tradeId) => {
    try {
      await axios.delete('/api/trades_day', {
        data: {
          _id: tradeId
        }
      });
      mutate('/api/trades_day');
    } catch (e) {
      console.log('error deleting job', e);
    }
  };

  return (
    <Paper style={{ padding: 16, marginBottom: 32 }}>
      <Heading />

      <h2>{INSTRUMENT_DETAILS[props.instrument].displayName}</h2>

      {props.detailsComponent(props.strategy)}

      {jobWasQueued ? (
        <>
          <h3>
            Status: {jobDetails?.current_state?.toUpperCase() || jobDetails?.error || 'Loading...'}
          </h3>
          {!isJobPastScheduledTime ? (
            <Grid item style={{ marginTop: 16 }}>
              <Button
                variant="contained"
                type="button"
                onClick={() => handleDeleteTrade(props._id)}
                disabled={jobDetails?.current_state === 'active'}>
                Delete trade
              </Button>
              {['delayed', 'waiting'].includes(jobDetails?.current_state) && deleteDisclaimer ? (
                <p>{deleteDisclaimer}</p>
              ) : null}
            </Grid>
          ) : null}
        </>
      ) : null}
    </Paper>
  );
};

const TradeDetails = (props) => (
  <WrapperComponent
    {...props}
    detailsComponent={(strategy) => {
      switch (strategy) {
        case STRATEGIES.ATM_STRADDLE:
        case STRATEGIES.CM_WED_THURS: {
          return <ATM_StraddleDetails {...props} />;
        }
        case STRATEGIES.DIRECTIONAL_OPTION_SELLING: {
          return <DOS_Details {...props} />;
        }
        default:
          return null;
      }
    }}
  />
);

const TradesForDay = () => {
  const { data: trades, error } = useSWR('/api/trades_day');
  if (!trades?.length || error) {
    return null;
  }

  return (
    <div>
      <h3>Trades executed today</h3>
      {trades.map((trade) => (
        <TradeDetails key={trade._id} {...trade} />
      ))}
    </div>
  );
};

export default TradesForDay;
