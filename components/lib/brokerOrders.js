import { Box, Divider, Typography } from '@material-ui/core';
import Chip from '@material-ui/core/Chip';
import { makeStyles } from '@material-ui/core/styles';
import ScheduleIcon from '@material-ui/icons/Schedule';
import dayjs from 'dayjs';
import React from 'react';

const useStyles = makeStyles({
  greyColor: { color: '#636363' }
});

export default function BrokerOrders({ orders }) {
  const classes = useStyles();

  return (
    <>
      <Typography variant="subtitle2" style={{ textAlign: 'right' }}>
        {orders.length} Orders
      </Typography>
      {orders.map((order, idx) => {
        return (
          <div key={order._id}>
            <Divider style={idx === 0 ? { margin: '0 0 12px 0' } : { margin: '12px 0' }} />
            <Box display="flex" justifyContent="space-between">
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                style={{ marginRight: 8 }}>
                <Box display="flex" alignItems="center" style={{ marginBottom: 4 }}>
                  <div style={{ marginRight: 8 }}>
                    <Chip
                      size="small"
                      disabled={order.status !== 'COMPLETE'}
                      label={order.transaction_type}
                      color={order.transaction_type === 'SELL' ? 'primary' : 'secondary'}
                    />
                  </div>
                  <Typography variant="body2">
                    {order.filled_quantity} / {order.quantity}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {order.humanTradingSymbol || order.tradingsymbol}
                </Typography>
                <Typography variant="body2" className={classes.greyColor}>
                  {order.exchange}
                </Typography>
              </Box>
              <Box display="flex" flexDirection="column" justifyContent="space-between">
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  style={{ marginBottom: 4 }}>
                  <div style={{ marginRight: 8 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      style={{ marginBottom: 4 }}>
                      <ScheduleIcon fontSize="small" color="disabled" style={{ marginRight: 2 }} />
                      <Typography variant="body2">
                        {dayjs(order.order_timestamp).format('hh:mm:ss')}
                      </Typography>
                    </Box>
                  </div>
                  <Chip
                    size="small"
                    label={order.status}
                    disabled
                    color={order.status === 'COMPLETE' ? 'secondary' : 'disabled'}
                  />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" className={classes.greyColor}>
                      {order.average_price ? 'Avg.' : order.trigger_price ? 'SL Trigger' : null}
                    </Typography>
                    <Typography>
                      {order.average_price?.toFixed(2) || order.trigger_price || ''}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" className={classes.greyColor}>
                      {order.product}
                    </Typography>
                    <Typography variant="body2">{order.order_type}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </div>
        );
      })}
    </>
  );
}
