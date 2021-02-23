import dayjs from 'dayjs';

import Layout from '../components/Layout';
import TradeSetup from '../components/trades/TradeSetup';
import { INSTRUMENTS, STRATEGIES } from '../lib/constants';
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
          strategy={STRATEGIES.CM_WED_THURS}
          LOCALSTORAGE_KEY={WED_THURS_TRADE_LS_KEY}
          enabledInstruments={[INSTRUMENTS.NIFTY]}
          heading={`Wed & Thurs trade`}
          runAt={dayjs().set('hour', 9).set('minutes', 25).set('seconds', 0).format()}
          detailsProps={{
            heading: `1x ATM straddle, and 2x +-50 strangle will be executed at 9.25am`,
            deleteDisclaimer: `You can safely delete this task until 9.20AM, after which it'll start processing.`
          }}
        />
        <TradeSetup
          strategy={STRATEGIES.ATM_STRADDLE}
          LOCALSTORAGE_KEY={TWELVE_THIRTY_TRADE_LS_KEY}
          enabledInstruments={[INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY]}
          heading={`12:30pm trade`}
          runAt={dayjs().set('hour', 12).set('minutes', 30).set('seconds', 0).format()}
          detailsProps={{
            heading: `1x short ATM straddle will be executed at 12.30pm`,
            deleteDisclaimer: `You can safely delete this task until 12.25pm, after which it'll start processing.`
          }}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;
