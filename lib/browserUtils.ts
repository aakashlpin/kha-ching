import dayjs from 'dayjs'
import { Dispatch } from 'react'
import {
  ATM_STRADDLE_CONFIG,
  ATM_STRANGLE_CONFIG,
  AvailablePlansConfig,
  COMBINED_SL_EXIT_STRATEGY,
  DIRECTIONAL_OPTION_SELLING_CONFIG
} from '../types/plans'
import {
  ATM_STRADDLE_TRADE,
  ATM_STRANGLE_TRADE,
  DIRECTIONAL_OPTION_SELLING_TRADE,
  SUPPORTED_TRADE_CONFIG
} from '../types/trade'

import { EXIT_STRATEGIES, STRATEGIES, STRATEGIES_DETAILS } from './constants'

export const ensureIST = date => {
  const IST_TZ = '+05:30'
  const [dateStr, timeWithZone] = dayjs(date)
    .format()
    .split('T')
  if (!timeWithZone) {
    return date
  }
  const [time, zone] = [timeWithZone.substr(0, 8), timeWithZone.substr(8)]
  const datetimeInIST =
    zone === IST_TZ ? date : dayjs(`${dateStr}T${time}${IST_TZ}`).toDate()
  return datetimeInIST
}

export function getScheduleableTradeTime (strategy: STRATEGIES) {
  const defaultDate = dayjs(STRATEGIES_DETAILS[strategy].defaultRunAt).format()

  if (dayjs().isAfter(dayjs(defaultDate))) {
    return dayjs()
      .add(10, 'minutes')
      .format()
  }

  return defaultDate
}

export function getDefaultSquareOffTime () {
  const [hours, minutes] = (
    process.env.NEXT_PUBLIC_DEFAULT_SQUARE_OFF_TIME ?? '15:20'
  ).split(':')
  return dayjs()
    .set('hours', +hours)
    .set('minutes', +minutes)
    .format()
}

export function getSchedulingStateProps (strategy: STRATEGIES) {
  return {
    runNow: false,
    isAutoSquareOffEnabled: true,
    runAt: getScheduleableTradeTime(strategy),
    squareOffTime: getDefaultSquareOffTime()
  }
}

export function commonOnChangeHandler (
  changedProps: Partial<AvailablePlansConfig>,
  state: AvailablePlansConfig,
  setState: Dispatch<AvailablePlansConfig>
) {
  if (changedProps.instruments) {
    setState({
      ...state,
      instruments: {
        ...state.instruments,
        ...changedProps.instruments
      }
    })
  } else {
    setState({
      ...state,
      ...changedProps
    } as AvailablePlansConfig)
  }
}

const getSchedulingApiProps = ({
  isAutoSquareOffEnabled,
  squareOffTime,
  exitStrategy,
  runAt,
  runNow,
  expireIfUnsuccessfulInMins
}) => ({
  runAt: runNow
    ? dayjs().format()
    : dayjs(runAt)
        .set('seconds', 0)
        .format(),
  autoSquareOffProps: isAutoSquareOffEnabled
    ? {
        time: squareOffTime,
        deletePendingOrders:
          exitStrategy !== EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD
      }
    : undefined,
  expiresAt: expireIfUnsuccessfulInMins
    ? dayjs(runNow ? new Date() : runAt)
        .add(Number(expireIfUnsuccessfulInMins), 'minutes')
        .set('seconds', 0)
        .format()
    : undefined
})

export const formatFormDataForApi = ({
  strategy,
  data
}: {
  strategy: string
  data: AvailablePlansConfig
}): SUPPORTED_TRADE_CONFIG | null => {
  const getOnSquareOffSetAborted = ({ exitStrategy, combinedExitStrategy }) =>
    exitStrategy === EXIT_STRATEGIES.MULTI_LEG_PREMIUM_THRESHOLD &&
    combinedExitStrategy === COMBINED_SL_EXIT_STRATEGY.EXIT_ALL

  switch (strategy) {
    case STRATEGIES.DIRECTIONAL_OPTION_SELLING: {
      const {
        lots,
        runNow,
        runAt,
        isAutoSquareOffEnabled,
        squareOffTime,
        maxTrades,
        martingaleIncrementSize,
        strikeByPrice,
        slmPercent,
        exitStrategy,
        expiryType
      } = data as DIRECTIONAL_OPTION_SELLING_CONFIG

      const apiProps: DIRECTIONAL_OPTION_SELLING_TRADE = {
        ...(data as DIRECTIONAL_OPTION_SELLING_CONFIG),
        lots: Number(lots),
        martingaleIncrementSize: Number(martingaleIncrementSize),
        slmPercent: Number(slmPercent),
        maxTrades: Number(maxTrades),
        expiryType,
        strikeByPrice: strikeByPrice ? Number(strikeByPrice) : undefined,
        ...getSchedulingApiProps({
          isAutoSquareOffEnabled,
          squareOffTime,
          exitStrategy,
          runNow,
          runAt
        } as any)
      }

      return apiProps
    }

    case STRATEGIES.ATM_STRADDLE: {
      const {
        lots,
        runNow,
        runAt,
        isAutoSquareOffEnabled,
        squareOffTime,
        slmPercent,
        maxSkewPercent,
        thresholdSkewPercent,
        expireIfUnsuccessfulInMins,
        trailEveryPercentageChangeValue,
        trailingSlPercent,
        exitStrategy,
        combinedExitStrategy,
        expiryType
      } = data as ATM_STRADDLE_CONFIG

      const apiProps: ATM_STRADDLE_TRADE = {
        ...(data as ATM_STRADDLE_CONFIG),
        lots: Number(lots),
        slmPercent: Number(slmPercent),
        trailEveryPercentageChangeValue: Number(
          trailEveryPercentageChangeValue
        ),
        trailingSlPercent: Number(trailingSlPercent),
        onSquareOffSetAborted: getOnSquareOffSetAborted({
          exitStrategy,
          combinedExitStrategy
        }),
        expiryType,
        maxSkewPercent: Number(maxSkewPercent),
        thresholdSkewPercent: Number(thresholdSkewPercent),
        ...getSchedulingApiProps({
          isAutoSquareOffEnabled,
          squareOffTime,
          exitStrategy,
          expireIfUnsuccessfulInMins,
          runAt,
          runNow
        })
      }

      return apiProps
    }

    case STRATEGIES.ATM_STRANGLE: {
      const {
        lots,
        runNow,
        runAt,
        isAutoSquareOffEnabled,
        squareOffTime,
        inverted,
        slmPercent,
        trailEveryPercentageChangeValue,
        trailingSlPercent,
        exitStrategy,
        expireIfUnsuccessfulInMins,
        combinedExitStrategy,
        expiryType
      } = data as ATM_STRANGLE_CONFIG

      const apiProps: ATM_STRANGLE_TRADE = {
        ...(data as ATM_STRANGLE_CONFIG),
        lots: Number(lots),
        slmPercent: Number(slmPercent),
        trailEveryPercentageChangeValue: Number(
          trailEveryPercentageChangeValue
        ),
        trailingSlPercent: Number(trailingSlPercent),
        onSquareOffSetAborted: getOnSquareOffSetAborted({
          exitStrategy,
          combinedExitStrategy
        }),
        expiryType,
        inverted: Boolean(inverted),
        ...getSchedulingApiProps({
          isAutoSquareOffEnabled,
          squareOffTime,
          exitStrategy,
          expireIfUnsuccessfulInMins,
          runAt,
          runNow
        })
      }

      return apiProps
    }

    default:
      return null
  }
}
