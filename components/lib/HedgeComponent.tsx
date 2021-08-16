import React from 'react'
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  TextField
} from '@material-ui/core'

const HedgeComponent = ({ isHedgeEnabled, hedgeDistance, onChange }) => {
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
                })}
            />
          }
        />
        {isHedgeEnabled
          ? (
          <TextField
            fullWidth
            name='hedgeDistance'
            value={hedgeDistance}
            onChange={(e) => onChange({ hedgeDistance: +e.target.value || undefined })}
            label='Hedge Distance'
          />
            )
          : null}
      </FormGroup>
    </FormControl>
  </Grid>

  )
}

export default HedgeComponent
