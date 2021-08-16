import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
import Slider from '@material-ui/core/Slider'

const useStyles = makeStyles({
  root: {
    width: 300
  }
})

export default function DiscreteSlider ({ label, defaultValue, step, min, max, value, onChange }) {
  const classes = useStyles()

  return (
    <div className={classes.root}>
      <Typography gutterBottom>
        {label}
      </Typography>
      <Slider
        value={value}
        defaultValue={defaultValue}
        step={step}
        marks
        min={min}
        max={max}
        valueLabelDisplay="auto"
        onChange={onChange}
      />
    </div>
  )
}
