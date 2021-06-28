import { Typography } from '@material-ui/core';
import { Link } from '@material-ui/core';
import { Button, Grid, Paper } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';
import router from 'next/router';
import React, { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../lib/constants';
import TradeDetails from './lib/tradeDetails';

const PlanDash = () => {
  const [plans, setPlans] = useState({});
  const { data: tradesDay, error } = useSWR('/api/trades_day');
  const dayOfWeekHuman = dayjs().format('dddd');
  const dayOfWeek = dayOfWeekHuman.toLowerCase();
  // const dayOfWeek = 'monday';

  useEffect(() => {
    async function fn() {
      const { data } = await axios('/api/plan');
      const date = dayjs();
      const day = date.format('D');
      const month = Number(date.format('M')) - 1;
      const year = date.format('YYYY');
      const dayWiseData = data.reduce((accum, config) => {
        const updatedConfig = { ...config };
        if (updatedConfig.runAt) {
          updatedConfig.runAt = dayjs(updatedConfig.runAt)
            .set('date', day)
            .set('month', month)
            .set('year', year)
            .format();
        }

        if (updatedConfig.squareOffTime) {
          updatedConfig.squareOffTime = dayjs(updatedConfig.squareOffTime)
            .set('date', day)
            .set('month', month)
            .set('year', year)
            .format();
        }

        if (Array.isArray(accum[updatedConfig._collection])) {
          return {
            ...accum,
            [updatedConfig._collection]: [...accum[updatedConfig._collection], updatedConfig]
          };
        }
        return {
          ...accum,
          [updatedConfig._collection]: [updatedConfig]
        };
      }, {});

      setPlans(dayWiseData);
    }

    fn();
  }, []);

  async function handleScheduleJob(plan) {
    const { runAt } = plan;
    const runNow = dayjs().isAfter(dayjs(runAt));
    await axios.post('/api/trades_day', {
      ...plan,
      plan_ref: plan._id,
      runNow
    });
    mutate('/api/trades_day');
  }

  const getPendingTrades = () =>
    plans[dayOfWeek]?.filter((plan) => !tradesDay?.find((trade) => trade.plan_ref === plan._id));

  const getScheduleableTrades = () => {
    const pendingTrades = getPendingTrades();
    if (!pendingTrades) {
      return null;
    }

    return pendingTrades.filter((trade) => dayjs().isBefore(dayjs(trade.runAt)));
  };

  async function handleScheduleEverything() {
    const pendingTrades = getScheduleableTrades();
    // this condition will never be reached as we don't show the button in the UI
    // if there's nothing to schedule
    // but keeping it just in case
    if (!(Array.isArray(pendingTrades) && pendingTrades.length)) {
      return;
    }
    await Promise.all(pendingTrades.map(handleScheduleJob));
    mutate('/api/trades_day');
  }

  const pendingTrades = getPendingTrades();

  if (!pendingTrades?.length) {
    if (plans[dayOfWeek]) {
      return (
        <Typography variant="">
          You&apos;ve scheduled all trades as per plan. Check "Today" tab for details.
        </Typography>
      );
    }
    return (
      <Typography variant="">
        You don&apos;t have a plan for {dayOfWeekHuman} yet. Create one{' '}
        <Link href="/plan">here</Link>.
      </Typography>
    );
  }

  const scheduleableTrades = getScheduleableTrades();

  return (
    <div>
      {plans[dayOfWeek] && scheduleableTrades ? (
        <Button
          style={{ marginBottom: 18 }}
          variant="contained"
          color="primary"
          type="button"
          onClick={handleScheduleEverything}>
          Schedule all trades
        </Button>
      ) : null}

      {pendingTrades.map((plan, idx) => {
        return (
          <div key={plan._id}>
            <Paper style={{ padding: 16, marginBottom: 32 }}>
              <h4>
                {idx + 1} · {STRATEGIES_DETAILS[plan.strategy].heading}
              </h4>

              <TradeDetails strategy={plan.strategy} tradeDetails={plan} />

              <Grid item style={{ marginTop: 16 }}>
                <Button variant="contained" type="button" onClick={() => handleScheduleJob(plan)}>
                  {dayjs().isBefore(dayjs(plan.runAt)) ? `Schedule trade` : `Run now`}
                </Button>
              </Grid>
            </Paper>
          </div>
        );
      })}
    </div>
  );
};

export default PlanDash;
