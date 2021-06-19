/* eslint-disable jsx-a11y/accessible-emoji */
import { Box, Button, Link, List, ListItem } from '@material-ui/core';
import axios from 'axios';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';

import Footer from '../components/Footer';
import Layout from '../components/Layout';
import PlanDash from '../components/PlanDash';
import TradesForDay from '../components/TradesForDay';
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

      <TradesForDay />

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
        {/* <ListItem>
          <Link href="/strat/obs">
            {STRATEGIES_DETAILS[STRATEGIES.OPTION_BUYING_STRATEGY].heading}
          </Link>
        </ListItem> */}
      </List>

      <Box align="center" marginBottom="120px">
        <Button
          color=""
          variant="contained"
          onClick={async () => {
            await axios.post('/api/revoke_session');
            router.push('/');
          }}>
          🔴 Stop SignalX and Logout!
        </Button>
      </Box>
      <Footer />
    </Layout>
  );
};

export default Dashboard;
