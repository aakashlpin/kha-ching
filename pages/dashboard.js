import { Link, Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import dayjs from 'dayjs';

import Layout from '../components/Layout';
import TradeSetup from '../components/trades/TradeSetup';
import { INSTRUMENTS, STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants';
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
        {['Wednesday', 'Thursday'].includes(dayjs().format('dddd')) ? (
          <TradeSetup
            strategy={STRATEGIES.CM_WED_THURS}
            LOCALSTORAGE_KEY={WED_THURS_TRADE_LS_KEY}
            enabledInstruments={[INSTRUMENTS.NIFTY]}
            heading={STRATEGIES_DETAILS[STRATEGIES.CM_WED_THURS].heading}
            runAt={STRATEGIES_DETAILS[STRATEGIES.CM_WED_THURS].runAt}
            detailsProps={
              dayjs().isAfter(dayjs(STRATEGIES_DETAILS[STRATEGIES.CM_WED_THURS].runAt))
                ? {
                    heading: `1x ATM straddle, and 2x +-50 strangle to be executed immediately`,
                    deleteDisclaimer: ''
                  }
                : {
                    heading: `1x ATM straddle, and 2x +-50 strangle will be executed at 9.20am`,
                    deleteDisclaimer: `You can safely delete this task until 9.20AM, after which it'll start processing.`
                  }
            }
          />
        ) : null}
        <TradeSetup
          strategy={STRATEGIES.ATM_STRADDLE}
          LOCALSTORAGE_KEY={TWELVE_THIRTY_TRADE_LS_KEY}
          enabledInstruments={[INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY]}
          heading={STRATEGIES_DETAILS[STRATEGIES.ATM_STRADDLE].heading}
          runAt={STRATEGIES_DETAILS[STRATEGIES.ATM_STRADDLE].runAt}
          detailsProps={
            dayjs().isAfter(dayjs(STRATEGIES_DETAILS[STRATEGIES.ATM_STRADDLE].runAt))
              ? {
                  heading: `1x short ATM straddle will be executed immediately`,
                  deleteDisclaimer: ''
                }
              : {
                  heading: `1x short ATM straddle will be executed at 12.30pm`,
                  deleteDisclaimer: `You can safely delete this task until 12.30pm, after which it'll start processing.`
                }
          }
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
              Buy me a coffee
            </Link>{' '}
            to support my work!
          </Box>
        </Typography>
      </div>
    </Layout>
  );
};

export default Dashboard;
