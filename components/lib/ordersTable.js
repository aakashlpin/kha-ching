import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import React from 'react';

const useStyles = makeStyles({
  table: {
    maxWidth: '100%'
  }
});

export default function OrdersTable({ rows }) {
  const classes = useStyles();

  return (
    <TableContainer component={Paper}>
      <Table className={classes.table} size="small" aria-label="a dense table">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Instrument</TableCell>
            <TableCell align="right">Qty.</TableCell>
            <TableCell align="right">Avg.</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.instrument}>
              <TableCell component="th" scope="row">
                {row.product}
              </TableCell>
              <TableCell>{row.instrument}</TableCell>
              <TableCell align="right">{row.qty}</TableCell>
              <TableCell align="right">{row.avg}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
