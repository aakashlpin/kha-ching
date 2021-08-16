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
import { VOLATILITY_TYPE } from '../../lib/constants'

const VolatilityTypeComponent = ({ state, onChange }) => {
  const volTypes = [VOLATILITY_TYPE.SHORT, VOLATILITY_TYPE.LONG]
  return (
    <Grid item xs={12}>
    <FormControl component='fieldset'>
      <FormLabel component='legend'>Vol type</FormLabel>
      <RadioGroup
        aria-label='volatilityType'
        name='volatilityType'
        value={state.volatilityType}
        onChange={(e) => onChange({ volatilityType: e.target.value as VOLATILITY_TYPE })}
        row
      >
        {volTypes.map((volatilityType) => (
          <FormControlLabel
            key={volatilityType}
            value={volatilityType}
            control={<Radio size='small' />}
            label={
              <Typography variant='body2'>
                {volatilityType}
              </Typography>
            }
          />
        ))}
      </RadioGroup>
    </FormControl>
  </Grid>
  )
}

export default VolatilityTypeComponent
