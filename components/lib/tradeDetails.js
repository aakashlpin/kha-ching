import React from 'react'

import { STRATEGIES } from '../../lib/constants'
import ATM_StraddleDetails from '../trades/atmStraddle/TradeSetupDetails'
import DOS_Details from '../trades/directionalOptionSelling/TradeSetupDetails'

const TradeDetails = ({ strategy, tradeDetails, jobDetails }) => {
  return (
    <>
      {strategy === STRATEGIES.ATM_STRADDLE || strategy === STRATEGIES.CM_WED_THURS ? (
        <ATM_StraddleDetails {...tradeDetails} {...jobDetails} />
      ) : strategy === STRATEGIES.DIRECTIONAL_OPTION_SELLING ? (
        <DOS_Details {...tradeDetails} {...jobDetails} />
      ) : null}
    </>
  )
}

export default TradeDetails
