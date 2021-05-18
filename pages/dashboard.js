/* eslint-disable jsx-a11y/accessible-emoji */
import { Box, Button, Link, List, ListItem } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';

import Layout from '../components/Layout';
import PlanDash from '../components/PlanDash';
import { STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants';
import useUser from '../lib/useUser';

const Dashboard = () => {
  const { user } = useUser({ redirectTo: '/' });
  const router = useRouter();

  if (!user || user.isLoggedIn === false) {
    return <Layout>loading...</Layout>;
  }

  return (
    <Layout>
      <h1>{dayjs().format('dddd')}&apos;s trade setup</h1>

      <PlanDash />

      <List style={{ marginBottom: '60px' }}>
        <ListItem>
          <Link href="/strat/straddle">{STRATEGIES_DETAILS[STRATEGIES.ATM_STRADDLE].heading}</Link>
        </ListItem>
        <ListItem>
          <Link href="/strat/straddle1x-strangle2x">
            {STRATEGIES_DETAILS[STRATEGIES.CM_WED_THURS].heading}
          </Link>
        </ListItem>
        <ListItem>
          <Link href="/strat/dos">
            {STRATEGIES_DETAILS[STRATEGIES.DIRECTIONAL_OPTION_SELLING].heading}
          </Link>
        </ListItem>
      </List>

      <Box align="center">
        <Button
          color="primary"
          variant="contained"
          onClick={async () => {
            await axios.post('/api/revoke_session');
            router.push('/');
          }}>
          🔴 Stop and Kill all!
        </Button>

        <br />
        <br />

        <Link
          href="https://www.notion.so/Khaching-5a43061a2b1f4e3ea10843f65186c30d"
          target="_blank"
          style={{ color: 'darkgray', fontStyle: 'italic' }}>
          Learn more about Khaching ↗
        </Link>
      </Box>
    </Layout>
  );
};

export default Dashboard;
