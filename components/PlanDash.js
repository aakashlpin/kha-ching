import { Button, Grid, Paper } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../lib/constants';
import OrdersTable from './lib/ordersTable';

const PlanDash = () => {
  const [plans, setPlans] = useState({});
  const dayOfWeek = dayjs().format('dddd').toLowerCase();

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

  function handleScheduleJob(plan) {
    const { runAt } = plan;
    if (dayjs().isBefore(dayjs(runAt))) {
      // we can schedule
    } else {
      // we can only run now
    }
  }

  return (
    <div>
      <h3>Your day plan</h3>
      {plans[dayOfWeek]?.map((plan) => {
        console.log(plan);
        return (
          <div key={plan._id}>
            <Paper style={{ padding: 16, marginBottom: 32 }}>
              <h4>{STRATEGIES_DETAILS[plan.strategy].heading}</h4>

              <h2>{INSTRUMENT_DETAILS[plan.instrument].displayName}</h2>

              <OrdersTable
                headerItems={[
                  { title: 'Initial Qty.', align: 'right' },
                  { title: 'Martingale additional lots', align: 'right' },
                  { title: 'Maximum trades', align: 'right' },
                  { title: 'SLM %', align: 'right' }
                ]}
                rows={[
                  [
                    {
                      value: plan.lots * INSTRUMENT_DETAILS[plan.instrument].lotSize,
                      align: 'right'
                    },
                    { value: plan.martingaleIncrementSize, align: 'right' },
                    { value: plan.maxTrades, align: 'right' },
                    { value: plan.slmPercent, align: 'right' }
                  ]
                ]}
              />

              <div>
                <h3>Status: Unscheduled</h3>
              </div>

              <Grid item style={{ marginTop: 16 }}>
                <Button variant="contained" type="button" onClick={() => handleScheduleJob(plan)}>
                  {dayjs().isBefore(dayjs(plan.runAt))
                    ? `Schedule for ${dayjs(plan.runAt).format('hh:mm a')}`
                    : `Run now`}
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
