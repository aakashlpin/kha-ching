/* eslint-disable jsx-a11y/accessible-emoji */
import { Box, Button, Divider, Link, List, ListItem } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Typography from '@material-ui/core/Typography';
import axios from 'axios';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { useState } from 'react';
import SwipeableViews from 'react-swipeable-views';

import Footer from '../components/Footer';
import Layout from '../components/Layout';
import PlanDash from '../components/PlanDash';
import TradesForDay from '../components/TradesForDay';
import { STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants';
import useUser from '../lib/useUser';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}>
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`
  };
}

const Dashboard = () => {
  const { user } = useUser({ redirectTo: '/' });
  const [value, setValue] = useState(0);
  const router = useRouter();

  if (!user || user.isLoggedIn === false) {
    return <Layout>loading...</Layout>;
  }

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index) => {
    setValue(index);
  };

  return (
    <Layout>
      <h1>
        {dayjs().format('dddd')} — {dayjs().format('DD MMM YYYY')}
      </h1>

      <AppBar position="static" color="default">
        <Tabs
          value={value}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="dashboard options">
          <Tab label="Today" {...a11yProps(0)} />
          <Tab label="New Trade" {...a11yProps(1)} />
          <Tab label="Plan" {...a11yProps(2)} />
        </Tabs>
      </AppBar>
      <SwipeableViews axis={'x'} index={value} onChangeIndex={handleChangeIndex}>
        <TabPanel value={value} index={0}>
          <TradesForDay />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <List>
            <ListItem>
              <Link href="/strat/straddle">
                {STRATEGIES_DETAILS[STRATEGIES.ATM_STRADDLE].heading}
              </Link>
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
        </TabPanel>
        <TabPanel value={value} index={2}>
          <PlanDash />
        </TabPanel>
      </SwipeableViews>

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
