import React from 'react'

import { STRATEGIES } from '../../lib/constants'
import ATMStraddleDetails from '../trades/atmStraddle/TradeSetupDetails'
import ATMStrangleDetails from '../trades/atmStrangle/TradeSetupDetails'
import DOSDetails from '../trades/directionalOptionSelling/TradeSetupDetails'

const TradeDetails = ({ strategy, tradeDetails, jobDetails }) => {
  return (
    <>
      {strategy === STRATEGIES.ATM_STRADDLE
        ? <ATMStraddleDetails {...tradeDetails} {...jobDetails} />

        : strategy === STRATEGIES.DIRECTIONAL_OPTION_SELLING
          ? <DOSDetails {...tradeDetails} {...jobDetails} />

          : strategy === STRATEGIES.ATM_STRANGLE
            ? <ATMStrangleDetails {...tradeDetails} {...jobDetails} />
            : null}
    </>
  )
}

export default TradeDetails
