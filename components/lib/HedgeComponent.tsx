import React from 'react'
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  TextField
} from '@material-ui/core'
import { VOLATILITY_TYPE } from '../../lib/constants'

const HedgeComponent = ({
  volatilityType,
  isHedgeEnabled,
  hedgeDistance,
  onChange
}) => {
  if (volatilityType === VOLATILITY_TYPE.LONG) {
    return null
  }

  return (
    <Grid item xs={12}>
      <FormControl component='fieldset'>
        <FormGroup>
          <FormControlLabel
            key='isHedgeEnabled'
            label='Add OTM hedge'
            control={
              <Checkbox
                checked={isHedgeEnabled}
                onChange={() =>
                  onChange({
                    isHedgeEnabled: !isHedgeEnabled
                  })
                }
              />
            }
          />
          {isHedgeEnabled ? (
            <TextField
              fullWidth
              name='hedgeDistance'
              value={hedgeDistance}
              onChange={e =>
                onChange({ hedgeDistance: +e.target.value || undefined })
              }
              label='Hedge Distance'
            />
          ) : null}
        </FormGroup>
      </FormControl>
    </Grid>
  )
}

export default HedgeComponent
