/* eslint-disable jsx-a11y/accessible-emoji */
import { Button, Paper } from '@material-ui/core'
import axios from 'axios'
import { omit } from 'lodash'
import useSWR, { mutate } from 'swr'

import StratLayout from '../components/StratLayout'
import useUser from '../lib/useUser'

const Mirror = () => {
  const { data: mirrorDetails, mirrorApiError } = useSWR('/api/mirror')

  const { data: subsDetails, mirrorUrlError } = useSWR(
    mirrorDetails ? mirrorDetails?.mirrorUrl : null
  )

  const { user } = useUser({ redirectTo: '/' })

  if (mirrorApiError || mirrorUrlError) {
    return <>Something went wrong!</>
  }

  async function handleStopMirror () {
    try {
      const { data } = await axios(mirrorDetails?.mirrorUrl)
      const deletedKeys = omit(data, ['api_key', 'access_token'])
      await axios.put(mirrorDetails?.mirrorUrl, deletedKeys)
      mutate(mirrorDetails.mirrorUrl)
    } catch (e) {
      console.log('[mirror handleStopMirror] error', e)
    }
  }

  async function handleStartMirror () {
    try {
      const { data } = await axios(mirrorDetails?.mirrorUrl)
      await axios.put(mirrorDetails?.mirrorUrl, {
        ...data,
        api_key: user.session.api_key,
        access_token: user.session.access_token
      })
      mutate(mirrorDetails.mirrorUrl)
    } catch (e) {
      console.log('[mirror handleStartMirror] error', e)
    }
  }

  // async function handlePunchTestTrade() {
  //   try {
  //     await axios.post('/api/mirror', {
  //       test_trade: true
  //     });
  //   } catch (e) {
  //     console.log('[mirror handlePunchTestTrade] error', e);
  //   }
  // }

  return (
    <StratLayout>
      <Paper style={{ padding: 16, marginBottom: 60 }}>
        <h1>Trade Mirror</h1>

        <h4>
          Socket status: {subsDetails?.connected ? '🟢 Connected' : '🔴 Disconnected'} |{' '}
          {mirrorDetails?.userType}
        </h4>

        {subsDetails?.access_token ? (
          <>
            <Button
              variant='contained'
              color='primary'
              type='button'
              onClick={handleStopMirror}
              style={{ marginRight: 8 }}
            >
              🔴 Stop mirroring
            </Button>
            {/* {mirrorDetails?.userType === 'PUBLISHER' ? (
              <Button variant="contained" color="" type="button" onClick={handlePunchTestTrade}>
                Punch test trade
              </Button>
            ) : null} */}
          </>
        ) : mirrorDetails?.userType === 'CONSUMER' ? (
          <Button variant='contained' color='primary' type='button' onClick={handleStartMirror}>
            Start mirroring
          </Button>
        ) : mirrorDetails?.userType === 'PUBLISHER' ? (
          <h2>Waiting for subscriber!</h2>
        ) : (
          <i>No idea why I&apos;m here!</i>
        )}

        {/* {mirrorDetails?.userType === 'PUBLISHER' && subsDetails?.access_token ? (
          <p>
            Subscriber connected at:{' '}
            {
              subsDetails?.status_history?.find(
                (history) => history.user === 'CONSUMER' && history.status_code === 'connect'
              )?.timestamp
            }{' '}
          </p>
        ) : null} */}
      </Paper>
    </StratLayout>
  )
}

export default Mirror
