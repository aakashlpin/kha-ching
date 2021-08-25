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
import { PRODUCT_TYPE } from '../../lib/constants'

const ProductTypeComponent = ({ state, onChange }) => {
  const productTypes = [PRODUCT_TYPE.MIS, PRODUCT_TYPE.NRML]
  return (
    <Grid item xs={12}>
      <FormControl component='fieldset'>
        <FormLabel component='legend'>Product</FormLabel>
        <RadioGroup
          aria-label='productType'
          name='productType'
          value={state.productType}
          onChange={e =>
            onChange({ productType: e.target.value as PRODUCT_TYPE })
          }
          row
        >
          {productTypes.map(productType => (
            <FormControlLabel
              key={productType}
              value={productType}
              control={<Radio size='small' />}
              label={<Typography variant='body2'>{productType}</Typography>}
            />
          ))}
        </RadioGroup>
      </FormControl>
    </Grid>
  )
}

export default ProductTypeComponent
