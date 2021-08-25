import React, { useState } from 'react'
import CircularProgress from '@material-ui/core/CircularProgress'

function ActionButtonOrLoader ({ children }) {
  const [isLoading, setLoading] = useState(false)

  const setLoadingState = isComponentLoading => {
    setLoading(isComponentLoading)
  }

  if (isLoading) {
    return (
      <CircularProgress size={28} thickness={2} color='inherit' disableShrink />
    )
  }

  return <>{children({ setLoading: setLoadingState })}</>
}

export default ActionButtonOrLoader
