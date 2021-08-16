import { Box, Button, Grid, Link, Paper, Typography } from '@material-ui/core'
import { DeleteForever, Stop } from '@material-ui/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import router from 'next/router'
import React from 'react'
import useSWR, { mutate } from 'swr'

import { STRATEGIES_DETAILS, USER_OVERRIDE } from '../lib/constants'
import ActionButtonOrLoader from './lib/ActionButtonOrLoader'
import BrokerOrders from './lib/brokerOrders'
import PnLComponent from './lib/pnlComponent'
import TradeDetails from './lib/tradeDetails'

const HeadingWithError = ({ heading, error }) => (
  <>
    <Typography component='p' color='error'>
      {error}
    </Typography>
    <Typography component='p'>{heading}</Typography>
  </>
)

const WrapperComponent = (props) => {
  const jobWasQueued = props.status !== 'REJECT' && props.queue?.id
  const { data: jobDetails } = useSWR(jobWasQueued ? `/api/get_job?id=${props.queue.id}` : null)

  const { data: jobOrders } = useSWR(
    props.orderTag ? `/api/get_orders?order_tag=${props.orderTag}` : null
  )

  const { data: pnlData } = useSWR(props.orderTag ? `/api/pnl?order_tag=${props.orderTag}` : null)

  const strategyDetails = STRATEGIES_DETAILS[props.strategy]
  const Heading = () => {
    if (!jobWasQueued) {
      if (typeof props.status_message === 'string') {
        return <HeadingWithError error={props.status_message} heading={strategyDetails.heading} />
      } else {
        return <HeadingWithError error={'Unknown Error'} heading={strategyDetails.heading} />
      }
    } else if (jobWasQueued && jobDetails?.current_state === 'failed') {
      return <HeadingWithError error={jobDetails?.job?.failedReason} heading={strategyDetails.heading} />
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
      await mutate('/api/trades_day')
    } catch (e) {
      console.log('error deleting job', e)
    }
  }

  const userOverrideAborted = props.user_override && props.user_override === USER_OVERRIDE.ABORT

  const handleAbortTrade = async (tradeId) => {
    try {
      await axios.put('/api/trades_day', {
        _id: tradeId,
        user_override: USER_OVERRIDE.ABORT
      })
      await mutate('/api/trades_day')
    } catch (e) {
      console.log('error stopping job', e)
    }
  }

  return (
    <Paper style={{ marginBottom: 24, padding: 16 }}>
      <Box display='flex' justifyContent='space-between' alignItems='center' style={{ marginBottom: 16, minHeight: 36 }}>
        <Typography style={{ marginRight: '8px' }}>
          <Heading />
        </Typography>
        <Box>
          {['delayed', 'waiting', 'failed'].includes(jobDetails?.current_state)
            ? (
              <Grid item>
                <ActionButtonOrLoader>
                  {({ setLoading }) =>
                    <Button
                      variant='outlined'
                      type='button'
                      onClick={async () => {
                        setLoading(true)
                        await handleDeleteTrade(props._id)
                        setLoading(false)
                      }}
                    >
                      <DeleteForever />Delete
                    </Button>}
                </ActionButtonOrLoader>
              </Grid>
              )
            : null
          }
          {['active', 'completed'].includes(jobDetails?.current_state) && !pnlData?.pnl
            ? (
              <Grid item>
                <ActionButtonOrLoader>
                  {({ setLoading }) =>
                    <Button
                      variant='outlined'
                      color='default'
                      type='button'
                      onClick={async () => {
                        setLoading(true)
                        if (!userOverrideAborted) {
                          await handleAbortTrade(props._id)
                        } else {
                          await handleDeleteTrade(props._id)
                        }
                        setLoading(false)
                      }}
                    >
                      {userOverrideAborted ? <><DeleteForever /> Delete</> : <><Stop /> Stop</>}
                    </Button>}
                </ActionButtonOrLoader>
              </Grid>
              )
            : null
          }
        </Box>
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
  const { data: trades, error } = useSWR('/api/trades_day', { refreshInterval: 10000 })
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
          <Stop /> Kill Switch
        </Button>
      </Box>
    </>
  )
}

export default TradesForDay
