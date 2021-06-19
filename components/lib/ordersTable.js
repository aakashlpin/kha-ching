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
    <TableContainer>
      <Table className={classes.table} size="small">
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {row.map((cell, rIdx) => (
                <TableCell
                  idx={rIdx}
                  key={cell.value}
                  align={cell.align || 'left'}
                  style={idx === 0 ? { fontWeight: 900 } : null}>
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
