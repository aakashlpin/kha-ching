import { Button, Grid, Paper } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import TimeAgo from 'react-timeago';
import useSWR from 'swr';

import { INSTRUMENT_DETAILS, STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants';
import OrdersTable from './lib/ordersTable';
import ATM_StraddleDetails from './trades/atmStraddle/TradeSetupDetails';
import DOS_Details from './trades/directionalOptionSelling/TradeSetupDetails';

const WrapperComponent = (props) => {
  const strategyDetails = STRATEGIES_DETAILS[props.strategy];
  const humanTime = dayjs(props.runAt).format('h.mma');
  const Heading = () => (
    <>
      #{props.queue.id} · {strategyDetails.heading}{' '}
      {props.runNow ? (
        <>
          was run <TimeAgo date={new Date(props.queue.timestamp)} />.
        </>
      ) : (
        <>is scheduled to run at {humanTime}.</>
      )}
    </>
  );

  const deleteDisclaimer = !props.runNow
    ? `⏰ This task can be safely deleted before the clock hits ${humanTime}.`
    : null;

  return (
    <Paper style={{ padding: 16, marginBottom: 32 }}>
      <h4>
        <Heading />
      </h4>

      <h2>{INSTRUMENT_DETAILS[props.instrument].displayName}</h2>

      {props.detailsComponent(props.strategy)}

      {/* <div>
        <h3>Status: {jobDetails?.current_state?.toUpperCase() || 'Loading...'}</h3>
      </div> */}

      <Grid item style={{ marginTop: 16 }}>
        {/* <div style={{ marginBottom: 16 }}>
        {jobDetails?.current_state === 'completed' ? (
          <OrdersTable
            rows={jobDetails.job.returnvalue.rawKiteOrdersResponse.map((row) => {
              const [item] = row;
              return {
                product: item.product,
                instrument: item.tradingsymbol,
                qty: item.quantity * (item.transaction_type === 'SELL' ? -1 : 1),
                avg: item.average_price
              };
            })}
          />
        ) : null}
      </div> */}
        {/* <Button
          variant="contained"
          type="button"
          onClick={() => handleDeleteJob({ jobId: job.id })}
          disabled={jobDetails?.current_state === 'active'}>
          Cleanup Job
        </Button>
        {['delayed', 'waiting'].includes(jobDetails?.current_state) && deleteDisclaimer ? (
          <p>{deleteDisclaimer}</p>
        ) : null} */}
      </Grid>
    </Paper>
  );
};

const TradeDetails = (props) => {
  const { data: jobDetails, error } = useSWR(
    props.queue?.id ? `/api/get_job?id=${props.queue.id}` : null
  );

  if (!jobDetails || error) {
    return null;
  }

  return (
    <WrapperComponent
      {...props}
      detailsComponent={(strategy) => {
        switch (strategy) {
          case STRATEGIES.ATM_STRADDLE:
          case STRATEGIES.CM_WED_THURS: {
            return <ATM_StraddleDetails {...jobDetails.job.data} />;
          }
          case STRATEGIES.DIRECTIONAL_OPTION_SELLING: {
            return <DOS_Details {...jobDetails.job.data} />;
          }
          default:
            return null;
        }
      }}
    />
  );
};

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
