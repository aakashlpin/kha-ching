/* eslint-disable jsx-a11y/accessible-emoji */
import { Button, Paper } from '@material-ui/core';
import axios from 'axios';
import { omit } from 'lodash';
import useSWR from 'swr';

import StratLayout from '../components/StratLayout';
import useUser from '../lib/useUser';

const Mirror = () => {
  const { data: mirrorDetails, mirrorApiError } = useSWR('/api/mirror');

  const { data: subsDetails, mirrorUrlError } = useSWR(
    mirrorDetails ? mirrorDetails?.mirrorUrl : null
  );

  const { user } = useUser({ redirectTo: '/' });

  if (mirrorApiError || mirrorUrlError) {
    return <>Something went wrong!</>;
  }

  async function handleStopMirror() {
    try {
      const { data } = await axios(mirrorDetails?.mirrorUrl);
      const deletedKeys = omit(data, ['api_key', 'access_token']);
      axios.put(mirrorDetails?.mirrorUrl, deletedKeys);
    } catch (e) {
      console.log('[mirror handleStopMirror] error', e);
    }
  }

  async function handleStartMirror() {
    try {
      const { data } = await axios(mirrorDetails?.mirrorUrl);
      await axios.put(mirrorDetails?.mirrorUrl, {
        ...data,
        api_key: user.session.api_key,
        access_token: user.session.access_token
      });
    } catch (e) {
      console.log('[mirror handleStartMirror] error', e);
    }
  }

  return (
    <StratLayout>
      <Paper style={{ padding: 16, marginBottom: 60 }}>
        <h1>Trade Mirror</h1>

        <h4>
          Socket status: {subsDetails?.connected ? '🟢 Connected' : '🔴 Disconnected'} |{' '}
          {mirrorDetails?.userType}
        </h4>

        {subsDetails?.access_token ? (
          <Button variant="contained" color="primary" type="button" onClick={handleStopMirror}>
            🔴 Stop mirroring
          </Button>
        ) : mirrorDetails?.userType === 'CONSUMER' ? (
          <Button variant="contained" color="primary" type="button" onClick={handleStartMirror}>
            Start mirroring
          </Button>
        ) : mirrorDetails?.userType === 'PUBLISHER' ? (
          <h2>Waiting for subscriber!</h2>
        ) : (
          <i>No idea why I&apos;m here!</i>
        )}
      </Paper>
    </StratLayout>
  );
};

export default Mirror;
