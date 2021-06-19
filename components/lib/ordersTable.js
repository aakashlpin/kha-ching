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

export default function OrdersTable({ headerItems, rows }) {
  const classes = useStyles();

  return (
    <TableContainer>
      <Table className={classes.table} size="small">
        <TableHead>
          <TableRow>
            {headerItems.map((headerItem) => (
              <TableCell key={headerItem.title} align={headerItem.align || 'left'}>
                {headerItem.title}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {row.map((cell) => (
                <TableCell key={cell.value} align={cell.align || 'left'}>
                  {cell.value}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
