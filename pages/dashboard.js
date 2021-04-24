import { Link, List, ListItem } from '@material-ui/core';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
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
          <Link href="/strat/straddle">Daily 12:30</Link>
        </ListItem>
        <ListItem>
          <Link href="/strat/cm-wed-thurs">CapitalMind 9:20</Link>
        </ListItem>
        <ListItem>
          <Link href="/strat/supertrend-bnf">Supertrend BNF</Link>
        </ListItem>
      </List>
    </Layout>
  );
};

export default Dashboard;
