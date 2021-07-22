import Chip from '@material-ui/core/Chip'
import React from 'react'

export default function PnLComponent ({ pnl }) {
  return (
    <Chip
      label={`₹${pnl} ${pnl < 0 ? '🥵' : '🎉'}`}
      color={pnl < 0 ? 'default' : 'secondary'}
      style={{ fontWeight: 'bold' }}
    />
  )
}
