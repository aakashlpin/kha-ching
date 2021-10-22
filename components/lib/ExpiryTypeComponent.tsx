import React from 'react'
import {
  FormControl,
  FormControlLabel,
  Typography,
  FormLabel,
  RadioGroup,
  Radio,
  Grid
} from '@material-ui/core'
import { EXPIRY_TYPE, EXPIRY_TYPE_HUMAN } from '../../lib/constants'

const ExpiryTypeComponent = ({ state, onChange }) => {
  const expiryTypes = [
    EXPIRY_TYPE.CURRENT,
    EXPIRY_TYPE.NEXT,
    EXPIRY_TYPE.MONTHLY
  ]
  return (
    <Grid item xs={12}>
      <FormControl component='fieldset'>
        <FormLabel component='legend'>Option Expiry</FormLabel>
        <RadioGroup
          aria-label='expiryTypes'
          name='expiryType'
          value={state.expiryType}
          onChange={e =>
            onChange({ expiryType: e.target.value as EXPIRY_TYPE })
          }
          row
        >
          {expiryTypes.map(expiryType => (
            <FormControlLabel
              key={expiryType}
              value={expiryType}
              control={<Radio size='small' />}
              label={
                <Typography variant='body2'>
                  {EXPIRY_TYPE_HUMAN[expiryType]}
                </Typography>
              }
            />
          ))}
        </RadioGroup>
      </FormControl>
    </Grid>
  )
}

export default ExpiryTypeComponent
