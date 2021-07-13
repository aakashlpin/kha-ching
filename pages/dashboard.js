/* eslint-disable jsx-a11y/accessible-emoji */
import { Box, Link, Typography } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import Skeleton from '@material-ui/lab/Skeleton';
import dayjs from 'dayjs';

import ClubDashboardLayout from '../components/ClubDashboard/ClubDashboardLayout';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import TradesDashboardLayout from '../components/TradesDashboard/TradesDashboardLayout';
import { useUser } from '../lib/customHooks';

const Dashboard = ({ hasDbSetup }) => {
  const { user } = useUser({ redirectTo: '/' });

  if (!user || user.isLoggedIn === false) {
    return (
      <>
        <Skeleton variant="rect" width={'100%'} height={40} style={{ marginBottom: '16px' }} />
        <Skeleton variant="rect" width={'100%'} height={200} />
      </>
    );
  }

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb="24px">
        <Typography variant="h5">Hello, {user?.session?.user_shortname}</Typography>
        <Typography variant="subtitle2">
          {dayjs().format('dddd')} / {dayjs().format('DD MMM YYYY')}
        </Typography>
      </Box>

      {!hasDbSetup ? (
        <Alert variant="outlined" severity="error" style={{ marginBottom: 24 }}>
          [IMP] Your app no longer works. Follow upgrade instruction{' '}
          <Link href="https://www.notion.so/Release-notes-20-06-2021-84859083abca4f5bb2ed229eea8642f2">
            here
          </Link>
          .
        </Alert>
      ) : null}

      {user?.isClubMember ? (
        <ClubDashboardLayout />
      ) : (
        <>
          <TradesDashboardLayout />
          <Footer />
        </>
      )}
    </Layout>
  );
};

export async function getStaticProps(context) {
  const DATABASE_HOST_URL = process.env.DATABASE_HOST_URL;
  const DATABASE_USER_KEY = process.env.DATABASE_USER_KEY;
  const DATABASE_API_KEY = process.env.DATABASE_API_KEY;

  const hasDbSetup = !!(DATABASE_HOST_URL && DATABASE_USER_KEY && DATABASE_API_KEY);
  return {
    props: {
      hasDbSetup
    } // will be passed to the page component as props
  };
}

export default Dashboard;
