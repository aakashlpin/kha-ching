import dayjs from 'dayjs'
import { EXIT_STRATEGIES, EXIT_STRATEGIES_DETAILS } from '../../lib/constants'

const commonDetailsRows = ({
  runNow,
  runAt,
  _createdOn,
  exitStrategy,
  slmPercent,
  isAutoSquareOffEnabled,
  squareOffTime,
  liveTrailingSl,
  lastTrailingSlSetAt,
  lastHeartbeatAt
}) => {
  const scheduleString = runNow || dayjs().isAfter(runAt) ? 'Run at' : 'ETA'
  const humanTime = dayjs(runNow ? _createdOn : runAt).format('hh:mma')
  const squareOffString = !isAutoSquareOffEnabled ? 'Manual' : dayjs(squareOffTime).format('hh:mma')
  const liveTrailingSlString = liveTrailingSl ? Number(liveTrailingSl).toFixed(2) : '-'
  const lastTrailedAtString = !lastTrailingSlSetAt ? '-' : dayjs(lastTrailingSlSetAt).format('hh:mma')
  const lastHeartbeatAtString = !lastHeartbeatAt ? '-' : dayjs(lastHeartbeatAt).format('hh:mma')
  const algoStatus = !lastHeartbeatAt ? '🔴 Offline' : dayjs().diff(dayjs(lastHeartbeatAt), 'seconds') > 60 ? '🔴 Offline' : '⚡️ Online'

  return [
    [{ value: 'Exit Strategy' }, { value: EXIT_STRATEGIES_DETAILS[exitStrategy].label }],
    [{ value: 'SL' }, { value: `${slmPercent}%` }],
    [{ value: scheduleString }, { value: humanTime }],
    [{ value: 'Auto Square-off' }, { value: squareOffString }],
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD ? [{ value: 'Last Trail time' }, { value: lastTrailedAtString }] : null,
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD ? [{ value: 'Last Heartbeat' }, { value: lastHeartbeatAtString }] : null,
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD ? [{ value: 'Live Trailing SL' }, { value: liveTrailingSlString }] : null,
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD ? [{ value: 'Automation status' }, { value: algoStatus }] : null
  ].filter(o => o)
}

export default commonDetailsRows
