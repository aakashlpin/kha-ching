import { Link } from '@material-ui/core';
import { useRouter } from 'next/router';

import Layout from '../../components/Layout';
import StratLayout from '../../components/StratLayout';
import DirectionalOptionSellingTradeSetup from '../../components/trades/DirectionalOptionSellingTradeSetup';
import OptionBuyingStrategyTradeSetup from '../../components/trades/OptionBuyingStrategyTradeSetup';
import TradeSetup from '../../components/trades/TradeSetup';
import { EXIT_STRATEGIES, INSTRUMENTS, STRATEGIES, STRATEGIES_DETAILS } from '../../lib/constants';

const STRADDLE_TRADE_LS_KEY = 'khaching/trades/straddle';
const WED_THURS_TRADE_LS_KEY = 'khaching/trades/atm1x-otm2x';
const DIRECTIONAL_OPTION_SELLING = 'khaching/trades/dos';
const OPTION_BUYING_STRATEGY = 'khaching/trades/obs';

const Strategy = () => {
  const router = useRouter();
  const { strategy } = router.query;

  switch (strategy) {
    case 'straddle': {
      return (
        <StratLayout>
          <TradeSetup
            LOCALSTORAGE_KEY={STRADDLE_TRADE_LS_KEY}
            strategy={STRATEGIES.ATM_STRADDLE}
            enabledInstruments={[INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY]}
            exitStrategies={[
              EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X,
              EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
            ]}
          />
        </StratLayout>
      );
    }
    case 'straddle1x-strangle2x': {
      return (
        <StratLayout>
          <TradeSetup
            LOCALSTORAGE_KEY={WED_THURS_TRADE_LS_KEY}
            strategy={STRATEGIES.CM_WED_THURS}
            enabledInstruments={[INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY]}
            exitStrategies={[EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X]}
          />
        </StratLayout>
      );
    }
    case 'dos': {
      return (
        <StratLayout>
          <DirectionalOptionSellingTradeSetup LOCALSTORAGE_KEY={DIRECTIONAL_OPTION_SELLING} />
        </StratLayout>
      );
    }
    case 'obs': {
      return (
        <StratLayout>
          <OptionBuyingStrategyTradeSetup
            LOCALSTORAGE_KEY={OPTION_BUYING_STRATEGY}
            strategy={STRATEGIES.OPTION_BUYING_STRATEGY}
            enabledInstruments={[INSTRUMENTS.BANKNIFTY]}
            exitStrategies={[EXIT_STRATEGIES.OBS_TRAIL_SL]}
          />
        </StratLayout>
      );
    }
    default: {
      return (
        <Layout>
          <Link href="/dashboard">Nothing here. Go back to dashboard!</Link>
        </Layout>
      );
    }
  }
};

export default Strategy;
