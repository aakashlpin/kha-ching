/* eslint-disable jsx-a11y/accessible-emoji */
import { Link, List, ListItem } from '@material-ui/core';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
import { STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants';
import useUser from '../lib/useUser';

const Dashboard = () => {
  const { user } = useUser({ redirectTo: '/' });

  if (!user || user.isLoggedIn === false) {
    return <Layout>loading...</Layout>;
  }

  return (
    <Layout>
      <h1>{dayjs().format('dddd')}&apos;s trade setup</h1>

      <List>
        <ListItem>
          <Link href="/strat/straddle">{STRATEGIES_DETAILS[STRATEGIES.ATM_STRADDLE].heading}</Link>
        </ListItem>
        <ListItem>
          <Link href="/strat/cm-wed-thurs">
            {STRATEGIES_DETAILS[STRATEGIES.CM_WED_THURS].heading}
          </Link>
        </ListItem>
        <ListItem>
          <Link href="/strat/dos">
            {STRATEGIES_DETAILS[STRATEGIES.DIRECTIONAL_OPTION_SELLING].heading}
          </Link>
        </ListItem>
      </List>
    </Layout>
  );
};

export default Dashboard;
