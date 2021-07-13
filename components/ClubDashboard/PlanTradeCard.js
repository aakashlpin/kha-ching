import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';

import TradeCompletedInfo from './TradeCompletedInfo';
import TradeStatus from './TradeStatus';

/**
 * Assumption: If a club user has trade for the day, then he/she must have plan too
 * If user has trade entry for the day, don't show plan view
 */
export default function PlanTradeCard({ tradesDay, todaysPlans }) {
  const [isTradeCompleted, setIsTradeCompleted] = useState(false);
  const [completedTradesWithPnl, setCompletedTradesWithPnl] = useState(null);
  const dayOfWeekHuman = dayjs().format('dddd');

  const handleTradeComplete = useCallback((tradesWithPnl) => {
    setIsTradeCompleted(true);
    setCompletedTradesWithPnl(tradesWithPnl);
  });

  if (!todaysPlans || todaysPlans.length < 1) {
    return (
      <Card style={{ backgroundColor: '#FFE68F', padding: '16px' }}>
        <Typography variant="body2">
          You don&apos;t have any plan for {dayOfWeekHuman} yet.
        </Typography>
      </Card>
    );
  }

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

  const todaysPlanAggregatedMeta = todaysPlans.reduce(
    (accm, plan) => {
      // TODO: @Aakash Remove this once meta data starts coming in plan and trade api
      plan.meta = {
        tradingAmount: 1000000,
        optionsTraded: ['NIFTY', 'BANK NIFTY'],
        maxLoss: 9700,
        avgProfit: 5500,
        successChance: 7.5
      };
      return {
        tradingAmount: accm.tradingAmount + plan.meta.tradingAmount,
        optionsTraded: accm.optionsTraded.concat(plan.meta.optionsTraded),
        maxLoss: accm.maxLoss + plan.meta.maxLoss,
        avgProfit: accm.avgProfit + plan.meta.avgProfit,
        successChance: (accm.successChance + plan.meta.successChance) / 2
      };
    },
    {
      tradingAmount: 0,
      optionsTraded: [],
      maxLoss: 0,
      avgProfit: 0,
      successChance: 0
    }
  );

  const hasTradeStarted = tradesDay && tradesDay.length;

  const planInfoToDisplay = [
    {
      label: 'Trading Amount',
      value: `upto ₹ ${todaysPlanAggregatedMeta.tradingAmount}`,
      valueColor: 'primary'
    },
    {
      label: 'Options traded',
      value: [...new Set(todaysPlanAggregatedMeta.optionsTraded)].join(', '),
      valueColor: 'primary'
    },
    { label: 'Max loss possible', value: todaysPlanAggregatedMeta.maxLoss, valueColor: 'error' },
    { label: 'Average profit', value: todaysPlanAggregatedMeta.avgProfit, valueColor: 'success' },
    {
      label: 'Chances of positive returns',
      value: `${todaysPlanAggregatedMeta.successChance}/10`,
      valueColor: 'primary'
    }
  ];

  const title = hasTradeStarted ? "Today's trade" : 'Your plan for the day';

  return (
    <Card>
      <CardContent>
        <Typography gutterBottom variant="h6" component="h2">
          {title}
        </Typography>
        <Box>
          {isTradeCompleted && completedTradesWithPnl && completedTradesWithPnl.length ? (
            <TradeCompletedInfo completedTradesWithPnl={completedTradesWithPnl} />
          ) : (
            planInfoToDisplay.map((info) => (
              <Box display="flex" justifyContent="space-between" mb="4px" key={info.label}>
                <Typography variant="caption" className="primaryLight">
                  {info.label}
                </Typography>
                <Typography variant="caption" className={`semiBold ${info.valueColor}`}>
                  {info.value}
                </Typography>
              </Box>
            ))
          )}
        </Box>
        {hasTradeStarted ? (
          <>
            <Divider style={{ marginBottom: '16px' }} />
            <TradeStatus trades={tradesDay} handleTradeComplete={handleTradeComplete} />
          </>
        ) : null}
      </CardContent>
      {!hasTradeStarted ? (
        <CardActions>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleScheduleJob(plan)}
            fullWidth>
            schedule trade
          </Button>
        </CardActions>
      ) : null}
    </Card>
  );
}
