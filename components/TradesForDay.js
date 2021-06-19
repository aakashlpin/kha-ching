import { Button, Grid, Paper, Typography } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';
import React from 'react';
import TimeAgo from 'react-timeago';
import useSWR, { mutate } from 'swr';

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../lib/constants';
import TradeDetails from './lib/tradeDetails';

const WrapperComponent = (props) => {
  const jobWasQueued = props.status !== 'REJECT' && props.queue?.id;
  const { data: jobDetails, error } = useSWR(
    jobWasQueued ? `/api/get_job?id=${props.queue.id}` : null
  );

  const strategyDetails = STRATEGIES_DETAILS[props.strategy];
  const humanTime = dayjs(props.runAt).format('hh:mma');
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
            was run <TimeAgo date={new Date(props.queue.timestamp)} />
          </>
        ) : (
          <>will run at {humanTime}</>
        )}
      </Typography>
    );
  };

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
    <Paper style={{ marginBottom: 24, padding: 16 }}>
      <h4>
        <Heading />
      </h4>

      <h2>{INSTRUMENT_DETAILS[props.instrument].displayName}</h2>

      {props.detailsComponent(props.strategy)}

      {jobWasQueued ? (
        <>
          <h3>
            Status: {jobDetails?.current_state?.toUpperCase() || jobDetails?.error || 'Loading...'}
          </h3>
          {!isJobPastScheduledTime && ['delayed', 'waiting'].includes(jobDetails?.current_state) ? (
            <Grid item style={{ marginTop: 16 }}>
              <Button
                variant="contained"
                type="button"
                onClick={() => handleDeleteTrade(props._id)}>
                Delete trade
              </Button>
            </Grid>
          ) : null}
        </>
      ) : null}
    </Paper>
  );
};

const TradesForDay = () => {
  const { data: trades, error } = useSWR('/api/trades_day');
  if (!trades?.length || error) {
    return null;
  }

  return (
    <div>
      <h3>Your trades today</h3>
      {trades.map((trade) => (
        <WrapperComponent
          key={trade._id}
          {...trade}
          detailsComponent={(strategy) => <TradeDetails strategy={strategy} tradeDetails={trade} />}
        />
      ))}
    </div>
  );
};

export default TradesForDay;
