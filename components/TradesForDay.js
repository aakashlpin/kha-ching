/* eslint-disable jsx-a11y/accessible-emoji */
import { Box, Button, Grid, Link, Paper, Typography } from '@material-ui/core'
import axios from 'axios'
import dayjs from 'dayjs'
import router from 'next/router'
import React from 'react'
import useSWR, { mutate } from 'swr'

import { INSTRUMENT_DETAILS, STRATEGIES_DETAILS } from '../lib/constants'
import BrokerOrders from './lib/brokerOrders'
import PnLComponent from './lib/pnlComponent'
import TradeDetails from './lib/tradeDetails'

const WrapperComponent = (props) => {
  const jobWasQueued = props.status !== 'REJECT' && props.queue?.id
  const { data: jobDetails } = useSWR(jobWasQueued ? `/api/get_job?id=${props.queue.id}` : null)

  const { data: jobOrders } = useSWR(
    props.orderTag ? `/api/get_orders?order_tag=${props.orderTag}` : null
  )

  const { data: pnlData } = useSWR(props.orderTag ? `/api/pnl?order_tag=${props.orderTag}` : null)

  const strategyDetails = STRATEGIES_DETAILS[props.strategy]
  const isJobPastScheduledTime = props.runNow || dayjs().isAfter(props.runAt)
  const Heading = () => {
    if (!jobWasQueued) {
      if (typeof props.status_message === 'string') {
        return (
          <>
            <Typography component='p' color='error'>
              FAILED: {props.status_message}
            </Typography>
            <Typography component='p'>{strategyDetails.heading}</Typography>
          </>
        )
      } else {
        return (
          <>
            <Typography component='p' color='error'>
              FAILED: Unknown Error
            </Typography>
            <Typography component='p'>{strategyDetails.heading}</Typography>
          </>
        )
      }
    }

    return (
      <Typography component='p' color=''>
        #{props.queue.id} · {strategyDetails.heading}
      </Typography>
    )
  }

  const handleDeleteTrade = async (tradeId) => {
    try {
      await axios.delete('/api/trades_day', {
        data: {
          _id: tradeId
        }
      })
      mutate('/api/trades_day')
    } catch (e) {
      console.log('error deleting job', e)
    }
  }

  return (
    <Paper style={{ marginBottom: 24, padding: 16 }}>
      <Box display='flex' justifyContent='space-between' alignItems='center' style={{ marginBottom: 16 }}>
        <Typography style={{ marginRight: '8px' }}>
          <Heading />
        </Typography>
        {jobWasQueued
          ? (
            <Box>
              {!isJobPastScheduledTime && ['delayed', 'waiting'].includes(jobDetails?.current_state)
                ? (
                  <Grid item>
                    <Button
                      variant='outlinedPrimary'
                      type='button'
                      onClick={() => handleDeleteTrade(props._id)}
                    >
                      ❌Delete
                    </Button>
                  </Grid>
                  )
                : null}
              {['active', 'completed'].includes(jobDetails?.current_state) && !pnlData?.pnl
                ? (
                  <Grid item>
                    <Button
                      variant='outlinedPrimary'
                      color='default'
                      type='button'
                      onClick={() => handleDeleteTrade(props._id)}
                    >
                      🔴Stop
                    </Button>
                  </Grid>
                  )
                : null}
            </Box>
            )
          : null}
      </Box>

      <div style={{ marginBottom: 16 }}>{props.detailsComponent(props.strategy, jobDetails)}</div>

      {jobWasQueued
        ? (
          <div style={{ marginBottom: 8 }}>
            <Box display='flex' justifyContent='space-between' alignItems='center'>
              <Typography variant='subtitle2'>
                Live status —{' '}
                {jobDetails?.current_state?.toUpperCase() || jobDetails?.error || 'Loading...'}
              </Typography>
              {pnlData?.pnl ? <PnLComponent pnl={pnlData.pnl} /> : null}
            </Box>
          </div>
          )
        : null}

      {Array.isArray(jobOrders) && jobOrders.length ? <BrokerOrders orders={jobOrders} /> : null}
    </Paper>
  )
}

const TradesForDay = () => {
  const { data: trades, error } = useSWR('/api/trades_day')
  if (!trades?.length || error) {
    return (
      <Typography variant=''>
        You don&apos;t have any trades scheduled today. Run from{' '}
        <Link
          href='/dashboard?tabId=2'
          onClick={(e) => {
            e.preventDefault()
            router.push('/dashboard?tabId=2')
          }}
        >
          your trade plan
        </Link>{' '}
        or{' '}
        <Link
          href='/dashboard?tabId=1'
          onClick={(e) => {
            e.preventDefault()
            router.push('/dashboard?tabId=1')
          }}
        >
          create a new trade
        </Link>
        .
      </Typography>
    )
  }

  return (
    <>
      <div style={{ marginBottom: 48 }}>
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

      <Box align='center' marginBottom='60px'>
        <Button
          variant='contained'
          onClick={async () => {
            await axios.post('/api/revoke_session')
            router.push('/')
          }}
        >
          🔴 Kill Switch (no further trades)
        </Button>
      </Box>
    </>
  )
}

export default TradesForDay
