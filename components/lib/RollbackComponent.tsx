import React, { useEffect, useState } from 'react'
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid
} from '@material-ui/core'
import { ROLLBACK_KEY_MAP } from '../../lib/constants'
import { ROLLBACK_TYPE } from '../../types/plans'

interface RollbackComponentProps {
  rollback: ROLLBACK_TYPE
  onChange: ({ rollback: ROLLBACK_TYPE }) => void
}

const RollbackComponent = ({ rollback, onChange }: RollbackComponentProps) => {
  const getIsSomeRollbackOptionEnabled = () =>
    !!Object.keys(rollback).find(key => rollback[key])
  const [
    isSomeRollbackOptionEnabled,
    setIsSomeRollbackOptionEnabled
  ] = useState(() => getIsSomeRollbackOptionEnabled())

  useEffect(() => {
    setIsSomeRollbackOptionEnabled(getIsSomeRollbackOptionEnabled())
  }, [rollback])

  return (
    <Grid item xs={12}>
      <FormControl component='fieldset'>
        <FormGroup>
          <FormControlLabel
            key='rollback'
            label='Rollback trades (BETA)'
            control={
              <Checkbox
                checked={isSomeRollbackOptionEnabled}
                onChange={() =>
                  onChange({
                    rollback: Object.keys(rollback).reduce(
                      (accum, key) => ({
                        ...accum,
                        [key]: !isSomeRollbackOptionEnabled
                      }),
                      {}
                    )
                  })
                }
              />
            }
          />
          <FormGroup style={{ marginLeft: 24 }}>
            {Object.keys(rollback).map(rollbackKey => (
              <FormControlLabel
                key={rollbackKey}
                label={ROLLBACK_KEY_MAP[rollbackKey]}
                control={
                  <Checkbox
                    name='rollback'
                    checked={rollback[rollbackKey]}
                    onChange={() => {
                      onChange({
                        rollback: {
                          ...rollback,
                          [rollbackKey]: !rollback[rollbackKey]
                        }
                      })
                    }}
                  />
                }
              />
            ))}
          </FormGroup>
        </FormGroup>
      </FormControl>
    </Grid>
  )
}

export default RollbackComponent
