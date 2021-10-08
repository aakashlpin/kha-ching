import { Typography, Link, Button, Grid, Paper } from '@material-ui/core'

import axios from 'axios'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { formatFormDataForApi } from '../lib/browserUtils'

import { STRATEGIES_DETAILS } from '../lib/constants'
import { SUPPORTED_TRADE_CONFIG } from '../types/trade'
import ActionButtonOrLoader from './lib/ActionButtonOrLoader'
import TradeDetails from './lib/tradeDetails'

const PlanDash = () => {
  const [plans, setPlans] = useState({})
  const { data: tradesDay } = useSWR('/api/trades_day')
  const dayOfWeekHuman = dayjs().format('dddd')
  const dayOfWeek = dayOfWeekHuman.toLowerCase()
  // const dayOfWeek = 'monday';

  useEffect(() => {
    async function fn () {
      const { data } = await axios('/api/plan')
      const date = dayjs()
      const day = date.get('date')
      const month = date.get('month')
      const year = date.get('year')
      const dayWiseData = data.reduce((accum, config) => {
        const updatedConfig = { ...config }
        if (updatedConfig.runAt) {
          updatedConfig.runAt = dayjs(updatedConfig.runAt)
            .set('date', day)
            .set('month', month)
            .set('year', year)
            .set('seconds', 0)
            .format()
        }

        if (updatedConfig.squareOffTime) {
          updatedConfig.squareOffTime = dayjs(updatedConfig.squareOffTime)
            .set('date', day)
            .set('month', month)
            .set('year', year)
            .set('seconds', 0)
            .format()
        }

        if (Array.isArray(accum[updatedConfig.collection])) {
          return {
            ...accum,
            [updatedConfig.collection]: [
              ...accum[updatedConfig.collection],
              updatedConfig
            ]
          }
        }
        return {
          ...accum,
          [updatedConfig.collection]: [updatedConfig]
        }
      }, {})

      setPlans(dayWiseData)
    }

    fn()
  }, [])

  async function handleScheduleJob (plan) {
    const { runAt } = plan
    const runNow = dayjs().isAfter(dayjs(runAt))
    await axios.post(
      '/api/trades_day',
      formatFormDataForApi({
        strategy: plan.strategy,
        data: {
          ...plan,
          plan_ref: plan.id,
          runNow
        }
      })
    )
    mutate('/api/trades_day')
  }

  const getPendingTrades = () =>
    plans[dayOfWeek]
      ?.filter(plan => !tradesDay?.find(trade => trade.plan_ref === plan.id))
      .filter(plan => STRATEGIES_DETAILS[plan.strategy])

  const getScheduleableTrades = () => {
    const pendingTrades = getPendingTrades()
    if (!pendingTrades) {
      return null
    }

    return pendingTrades.filter(trade => dayjs().isBefore(dayjs(trade.runAt)))
  }

  async function handleScheduleEverything () {
    const pendingTrades = getScheduleableTrades()
    // this condition will never be reached as we don't show the button in the UI
    // if there's nothing to schedule
    // but keeping it just in case
    if (!(Array.isArray(pendingTrades) && pendingTrades.length)) {
      return
    }
    await Promise.all(pendingTrades.map(handleScheduleJob))
    mutate('/api/trades_day')
  }

  const pendingTrades = getPendingTrades()

  if (!pendingTrades?.length) {
    if (plans[dayOfWeek]) {
      return (
        <Typography>
          You&apos;ve scheduled all trades as per plan. Check &quot;Today&quot;
          tab for details.
        </Typography>
      )
    }
    return (
      <Typography>
        You don&apos;t have a plan for {dayOfWeekHuman} yet. Create one{' '}
        <Link href='/plan'>here</Link>.
      </Typography>
    )
  }

  const scheduleableTrades = getScheduleableTrades()

  return (
    <div>
      {plans[dayOfWeek] && scheduleableTrades ? (
        <ActionButtonOrLoader>
          {({ setLoading }) => (
            <Button
              style={{ marginBottom: 18 }}
              variant='contained'
              color='primary'
              type='button'
              onClick={async () => {
                setLoading(true)
                await handleScheduleEverything()
                setLoading(false)
              }}
            >
              Schedule all trades
            </Button>
          )}
        </ActionButtonOrLoader>
      ) : null}

      {pendingTrades.map((plan: SUPPORTED_TRADE_CONFIG, idx: number) => {
        const isPlanScheduleable = dayjs().isBefore(dayjs(plan.runAt))
        return (
          <div key={plan.id}>
            <Paper style={{ padding: 16, marginBottom: 32 }}>
              <h4>
                {`${idx + 1}`} · {STRATEGIES_DETAILS[plan.strategy].heading}
              </h4>

              <TradeDetails strategy={plan.strategy} tradeDetails={plan} />

              <Grid item style={{ marginTop: 16 }}>
                <ActionButtonOrLoader>
                  {({ setLoading }) => (
                    <Button
                      variant='contained'
                      type='button'
                      onClick={async () => {
                        setLoading(true)
                        await handleScheduleJob(plan)
                        setLoading(false)
                      }}
                    >
                      {isPlanScheduleable ? 'Schedule trade' : 'Run now'}
                    </Button>
                  )}
                </ActionButtonOrLoader>
              </Grid>
            </Paper>
          </div>
        )
      })}
    </div>
  )
}

export default PlanDash
