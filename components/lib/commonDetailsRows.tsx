import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'

import {
  EXIT_STRATEGIES,
  EXIT_STRATEGIES_DETAILS,
  PRODUCT_TYPE,
  VOLATILITY_TYPE
} from '../../lib/constants'

const CommonDetailsRows = ({
  runNow,
  runAt,
  created,
  exitStrategy,
  slmPercent,
  orderTag,
  isAutoSquareOffEnabled,
  squareOffTime,
  isMaxProfitEnabled,
  maxProfitPoints,
  isMaxLossEnabled,
  maxLossPoints,
  currentPoints,
  productType,
  volatilityType,
  liveTrailingSl,
  lastTrailingSlSetAt,
  lastHeartbeatAt,
  lastTargetAt,
  expiryType
}) => {
  const getAlgoStatus = useCallback(
    () =>
      !lastHeartbeatAt
        ? '🔴 Offline'
        : dayjs().diff(dayjs(lastHeartbeatAt), 'seconds') > 60
        ? '🔴 Offline'
        : '⚡️ Online',
    [lastHeartbeatAt]
  )
 
  const [algoStatus, setAlgoStatus] = useState(() => getAlgoStatus())
  const scheduleString = runNow || dayjs().isAfter(runAt) ? 'Run at' : 'ETA'
  const humanTime = dayjs(runNow ? created : runAt).format('hh:mma')
  const squareOffString = !isAutoSquareOffEnabled
    ? 'Manual'
    : dayjs(squareOffTime).format('hh:mma')
  const liveTrailingSlString = liveTrailingSl
    ? Number(liveTrailingSl).toFixed(2)
    : '-'
  const lastTrailedAtString = !lastTrailingSlSetAt
    ? '-'
    : dayjs(lastTrailingSlSetAt).format('hh:mma')
    const lastTargetAtString = !lastTargetAt
    ? '-'
    : dayjs(lastTargetAt).format('hh:mma')
    
  const lastHeartbeatAtString = !lastHeartbeatAt
    ? '-'
    : dayjs(lastHeartbeatAt).format('hh:mma')

  useEffect(() => {
    setAlgoStatus(getAlgoStatus())
  }, [lastHeartbeatAt, getAlgoStatus])

  return [
    volatilityType ? [{ value: 'Vol type' }, { value: volatilityType }] : null,
    productType ? [{ value: 'Product' }, { value: productType }] : null,
    expiryType ? [{ value: 'Expiry' }, { value: expiryType }] : null,

    [
      { value: 'Exit Strategy' },
      { value: EXIT_STRATEGIES_DETAILS[exitStrategy].label }
    ],
    [{ value: 'SL' }, { value: `${slmPercent as string}%` }],
    isMaxProfitEnabled?[{value: 'Max Profit '},{value:maxProfitPoints}]:null,
    isMaxLossEnabled?[{value: 'Max Loss '},{value:maxLossPoints}]:null,
    [{value:'Tag'},{value:orderTag}],
    (isMaxLossEnabled||isMaxProfitEnabled)
    ? [{ value: 'Current Points' }, { value: currentPoints }]
    : null,
    (isMaxLossEnabled||isMaxProfitEnabled)
    ? [{ value: 'Last Targetsl at' }, { value: lastTargetAtString }]
    : null,
    
    [{ value: scheduleString }, { value: humanTime }],
    [{ value: 'Auto Square-off' }, { value: squareOffString }],
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
      ? [{ value: 'Last Trail time' }, { value: lastTrailedAtString }]
      : null,
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
      ? [{ value: 'Last Heartbeat' }, { value: lastHeartbeatAtString }]
      : null,
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
      ? [{ value: 'Live Trailing SL' }, { value: liveTrailingSlString }]
      : null,
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
      ? [{ value: 'Automation status' }, { value: algoStatus }]
      : null
  ].filter(o => o)
}

export default CommonDetailsRows
