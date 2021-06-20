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
  const isJobPastScheduledTime = props.runNow || dayjs().isAfter(props.runAt);
  const Heading = () => {
    if (!jobWasQueued) {
      if (props.status_message) {
        return (
          <>
            <Typography component="p" color="error">
              FAILED: {props.status_message}
            </Typography>
            <Typography component="p">{strategyDetails.heading}</Typography>
          </>
        );
      } else {
        return (
          <Typography component="p" color="error">
            Something went wrong!
          </Typography>
        );
      }
    }

    return (
      <Typography component="p" color="">
        #{props.queue.id} · {strategyDetails.heading}
        {/* {isJobPastScheduledTime ? (
          <>
            was run <TimeAgo date={new Date(props.queue.timestamp)} />
          </>
        ) : (
          <>will run at {humanTime}</>
        )} */}
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
      <Typography variant="subtitle2" style={{ marginBottom: 16 }}>
        <Heading />
      </Typography>

      <div style={{ marginBottom: 16 }}>{props.detailsComponent(props.strategy, jobDetails)}</div>

      {jobWasQueued ? (
        <>
          <Typography variant="subtitle2">
            Live status —{' '}
            {jobDetails?.current_state?.toUpperCase() || jobDetails?.error || 'Loading...'}
          </Typography>
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
      {trades.map((trade) => (
        <WrapperComponent
          key={trade._id}
          {...trade}
          detailsComponent={(strategy, jobDetails) => (
            <TradeDetails strategy={strategy} tradeDetails={trade} jobDetails={jobDetails} />
          )}
        />
      ))}
    </div>
  );
};

export default TradesForDay;
