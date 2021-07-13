import { Button, Card, CardContent, Grid, Paper, Typography } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';

import { STRATEGIES_DETAILS } from '../../lib/constants';
import TradeDetails from '../lib/tradeDetails';
import { isLengthyArray } from "../../lib/uiHelpers";

export default function AvailablePlansToday({ plan, scheduleableTrades, pendingTrades }) {
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

  async function handleScheduleEverything() {
    // this condition will never be reached as we don't show the button in the UI
    // if there's nothing to schedule
    // but keeping it just in case
    if (!isLengthyArray(scheduleableTrades)) {
      return;
    }
    await Promise.all(scheduleableTrades.map(handleScheduleJob));
    mutate('/api/trades_day');
  }

  return (
    <div style={{ padding: 8, margin: '16px 0' }}>
      {plan && scheduleableTrades ? (
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
          <Card key={plan._id}>
            <CardContent>
              <Typography variant="h6">
                {idx + 1} · {STRATEGIES_DETAILS[plan.strategy].heading}
              </Typography>

              <TradeDetails strategy={plan.strategy} tradeDetails={plan} />

              <Grid item style={{ marginTop: 16 }}>
                <Button variant="contained" type="button" onClick={() => handleScheduleJob(plan)}>
                  {dayjs().isBefore(dayjs(plan.runAt)) ? `Schedule trade` : `Run now`}
                </Button>
              </Grid>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
