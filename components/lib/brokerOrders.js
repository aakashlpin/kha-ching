import { Box, Button, Divider, Grid, Typography } from '@material-ui/core'
import Chip from '@material-ui/core/Chip'
import FormControl from '@material-ui/core/FormControl'
import FormHelperText from '@material-ui/core/FormHelperText'
import InputLabel from '@material-ui/core/InputLabel'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import { makeStyles } from '@material-ui/core/styles'
import ScheduleIcon from '@material-ui/icons/Schedule'
import axios from 'axios'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120
  },
  selectEmpty: {
    marginTop: theme.spacing(2)
  },
  greyColor: { color: '#636363' }
}))

export default function BrokerOrders ({ orders, trades, dbOrders }) {
  const classes = useStyles()
  const [tradeMapByOrderTag, setTradeMapByOrderTag] = useState({})
  const [allTags, setAllTags] = useState([])

  useEffect(() => {
    if (!trades?.length) {
      return
    }

    const reducedTags = trades.reduce(
      (accum, trade) => ({
        ...accum,
        [trade.orderTag]: {
          ...trade,
          selectDisplayName: `${trade.strategy} / ${trade.instrument} / ${
            trade.exitStrategy
          } / ${dayjs(trade.runAt).format('hh:mm A')}`
        }
      }),
      {}
    )

    setTradeMapByOrderTag(reducedTags)
    setAllTags(Object.keys(reducedTags))
  }, [trades])

  const handleChange = async ({ orderId, orderTag }) => {
    await axios.put('/api/reconcile', {
      orderId,
      orderTag
    })
  }

  return (
    <>
      <Typography variant='subtitle2' style={{ textAlign: 'right' }}>
        {orders.length} Orders
      </Typography>
      {orders.map((order, idx) => {
        return (
          <div key={order._id}>
            <Divider style={idx === 0 ? { margin: '0 0 12px 0' } : { margin: '12px 0' }} />
            <Box display='flex' justifyContent='space-between'>
              <Box
                display='flex'
                flexDirection='column'
                justifyContent='space-between'
                style={{ marginRight: 8 }}
              >
                <Box display='flex' alignItems='center' style={{ marginBottom: 4 }}>
                  <div style={{ marginRight: 8 }}>
                    <Chip
                      size='small'
                      disabled={order.status !== 'COMPLETE'}
                      label={order.transaction_type}
                      color={order.transaction_type === 'SELL' ? 'primary' : 'secondary'}
                    />
                  </div>
                  <Typography variant='body2'>
                    {order.filled_quantity} / {order.quantity}
                  </Typography>
                </Box>
                <Typography variant='body2'>
                  {order.humanTradingSymbol || order.tradingsymbol}
                </Typography>
                <Typography variant='body2' className={classes.greyColor}>
                  {order.exchange}
                </Typography>
              </Box>
              <Box display='flex' flexDirection='column' justifyContent='space-between'>
                <Box
                  display='flex'
                  justifyContent='space-between'
                  alignItems='center'
                  style={{ marginBottom: 4 }}
                >
                  <div style={{ marginRight: 8 }}>
                    <Box
                      display='flex'
                      justifyContent='space-between'
                      alignItems='center'
                      style={{ marginBottom: 4 }}
                    >
                      <ScheduleIcon fontSize='small' color='disabled' style={{ marginRight: 2 }} />
                      <Typography variant='body2'>
                        {dayjs(order.order_timestamp).format('hh:mm:ss')}
                      </Typography>
                    </Box>
                  </div>
                  <Chip
                    size='small'
                    label={order.status}
                    disabled
                    color={order.status === 'COMPLETE' ? 'secondary' : 'disabled'}
                  />
                </Box>
                <Box>
                  <Box display='flex' justifyContent='space-between'>
                    <Typography variant='body2' className={classes.greyColor}>
                      {order.average_price ? 'Avg.' : order.trigger_price ? 'SL Trigger' : null}
                    </Typography>
                    <Typography>
                      {order.average_price?.toFixed(2) || order.trigger_price || ''}
                    </Typography>
                  </Box>
                  <Box display='flex' justifyContent='space-between'>
                    <Typography variant='body2' className={classes.greyColor}>
                      {order.product}
                    </Typography>
                    <Typography variant='body2'>{order.order_type}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            {trades
              ? (
              <Box>
                <Grid item xs={6}>
                  <FormControl className={classes.formControl}>
                    <InputLabel id={`tag_${idx}`}>Broker Tag</InputLabel>
                    <Select
                      style={{ fontSize: '12px' }}
                      labelId={`tag_${idx}`}
                      id={`tag_${idx}`}
                      value={order.tag}
                      onChange={(e) =>
                        handleChange({
                          orderId: order.order_id,
                          orderTag: e.target.value
                        })}
                    >
                      <MenuItem key={`tag_${idx}_null`} value={null}>
                        Delete tag
                      </MenuItem>
                      {allTags.map((tag) => (
                        <MenuItem key={`tag_${idx}_${tag}`} value={tag}>
                          ({tag}) {tradeMapByOrderTag[tag]?.selectDisplayName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='subtitle2'>
                    System tag:{' '}
                    {dbOrders.find((dbOrder) => dbOrder.order_id === order.order_id)?.tag ||
                      'Untagged'}
                    {order.tag
                      ? (
                      <Button
                        variant='contained'
                        onClick={() =>
                          handleChange({
                            orderTag: order.tag,
                            orderId: order.order_id
                          })}
                      >
                        Copy broker tag
                      </Button>
                        )
                      : null}
                  </Typography>
                </Grid>
              </Box>
                )
              : null}
          </div>
        )
      })}
    </>
  )
}
