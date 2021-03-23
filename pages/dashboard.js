/* eslint-disable jsx-a11y/accessible-emoji */
import { Link, Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
import TradeSetup from '../components/trades/TradeSetup';
import { EXIT_STRATEGIES, INSTRUMENTS, STRATEGIES } from '../lib/constants';
import useUser from '../lib/useUser';

const TWELVE_THIRTY_TRADE_LS_KEY = 'khaching/trades/1230';
const WED_THURS_TRADE_LS_KEY = 'khaching/trades/wed_thurs';

const Dashboard = () => {
  const { user } = useUser({ redirectTo: '/' });

  if (!user || user.isLoggedIn === false) {
    return <Layout>loading...</Layout>;
  }

  return (
    <Layout>
      <h1>{dayjs().format('dddd')}&apos;s trade setup</h1>

      <div>
        <TradeSetup
          LOCALSTORAGE_KEY={TWELVE_THIRTY_TRADE_LS_KEY}
          strategy={STRATEGIES.ATM_STRADDLE}
          enabledInstruments={[INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY]}
          exitStrategies={[
            EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X,
            EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_2X,
            EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
          ]}
        />
        <TradeSetup
          LOCALSTORAGE_KEY={WED_THURS_TRADE_LS_KEY}
          strategy={STRATEGIES.CM_WED_THURS}
          enabledInstruments={[INSTRUMENTS.NIFTY]}
          exitStrategies={[EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X]}
        />
        <Typography>
          <Box fontStyle="italic" fontSize={14} css={{ marginBottom: '16px' }}>
            Something not working or task failed? Goto{' '}
            <Link href="https://cloud.digitalocean.com/apps">DigitalOcean apps</Link>, select your
            app, goto the "Logs" section, copy paste all you see into a file and{' '}
            <Link href="mailto:me@aakashgoel.com">email me</Link>.
          </Box>
          <Box fontStyle="bold" fontSize={14}>
            <Link target="_blank" href="https://www.buymeacoffee.com/aakashgoel">
              Buy me a coffee ☕️
            </Link>{' '}
            to support this work.
          </Box>
        </Typography>
      </div>
    </Layout>
  );
};

export default Dashboard;
