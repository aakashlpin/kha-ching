import { Link } from '@material-ui/core'
import { useRouter } from 'next/router'

import Layout from '../../components/Layout'
import StratLayout from '../../components/StratLayout'
import AtmStraddleSetup from '../../components/trades/atmStraddle'
import DirectionalOptionSellingTradeSetup from '../../components/trades/directionalOptionSelling'
import OptionBuyingStrategyTradeSetup from '../../components/trades/optionBuyingStrategy'
import { EXIT_STRATEGIES, INSTRUMENTS, STRATEGIES } from '../../lib/constants'

const Strategy = () => {
  const router = useRouter()
  const { strategy } = router.query

  switch (strategy) {
    case 'straddle': {
      return (
        <StratLayout>
          <AtmStraddleSetup
            strategy={STRATEGIES.ATM_STRADDLE}
            enabledInstruments={[INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY, INSTRUMENTS.FINNIFTY]}
            exitStrategies={[
              EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X,
              EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
            ]}
          />
        </StratLayout>
      )
    }
    case 'straddle1x-strangle2x': {
      return (
        <StratLayout>
          <AtmStraddleSetup
            strategy={STRATEGIES.CM_WED_THURS}
            enabledInstruments={[INSTRUMENTS.NIFTY, INSTRUMENTS.BANKNIFTY]}
            exitStrategies={[EXIT_STRATEGIES.INDIVIDUAL_LEG_SLM_1X]}
          />
        </StratLayout>
      )
    }
    case 'dos': {
      return (
        <StratLayout>
          <DirectionalOptionSellingTradeSetup />
        </StratLayout>
      )
    }
    case 'obs': {
      return (
        <StratLayout>
          <OptionBuyingStrategyTradeSetup
            enabledInstruments={[INSTRUMENTS.BANKNIFTY]}
            exitStrategies={[EXIT_STRATEGIES.OBS_TRAIL_SL]}
          />
        </StratLayout>
      )
    }
    default: {
      return (
        <StratLayout>
          <Link href='/dashboard'>Nothing here. Go back to dashboard!</Link>
        </StratLayout>
      )
    }
  }
}

export default Strategy
