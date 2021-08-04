import dayjs from 'dayjs'

import { STRATEGIES, STRATEGIES_DETAILS } from './constants'

export const ensureIST = (date) => {
  const IST_TZ = '+05:30'
  const [dateStr, timeWithZone] = dayjs(date).format().split('T')
  if (!timeWithZone) {
    return date
  }
  const [time, zone] = [timeWithZone.substr(0, 8), timeWithZone.substr(8)]
  const datetimeInIST = zone === IST_TZ ? date : dayjs(`${dateStr}T${time}${IST_TZ}`).toDate()
  return datetimeInIST
}

export function getScheduleableTradeTime (strategy) {
  const defaultDate = dayjs(STRATEGIES_DETAILS[strategy].defaultRunAt).format()

  if (dayjs().isAfter(dayjs(defaultDate))) {
    return dayjs().add(10, 'minutes').format()
  }

  return defaultDate
}

export function getDefaultSquareOffTime () {
  try {
    const [hours, minutes] = (process.env.NEXT_PUBLIC_DEFAULT_SQUARE_OFF_TIME || '15:20').split(
      ':'
    )
    return dayjs().set('hours', hours).set('minutes', minutes).format()
  } catch (e) {
    return null
  }
}

export function getSchedulingStateProps (strategy) {
  return {
    runNow: false,
    isAutoSquareOffEnabled: true,
    runAt: getScheduleableTradeTime(strategy),
    squareOffTime: getDefaultSquareOffTime()
  }
}

export function commonOnChangeHandler (changedProps, state, setState) {
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
    })
  }
}

export const formatFormDataForApi = ({ strategy, data }) => {
  if (!strategy || !data) {
    throw new Error('[formatFormDataForApi] args missing')
  }

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
        isHedgeEnabled,
        hedgeDistance
      } = data

      const apiProps = {
        ...data,
        lots: Number(lots),
        martingaleIncrementSize: Number(martingaleIncrementSize),
        slmPercent: Number(slmPercent),
        maxTrades: Number(maxTrades),
        runAt: runNow ? dayjs().format() : runAt,
        strikeByPrice: strikeByPrice ? Number(strikeByPrice) : null,
        squareOffTime: isAutoSquareOffEnabled
          ? dayjs(squareOffTime).set('seconds', 0).format()
          : null,
        isHedgeEnabled,
        hedgeDistance: isHedgeEnabled ? Number(hedgeDistance) : null
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
        trailingSlPercent
      } = data

      const apiProps = {
        ...data,
        lots: Number(lots),
        slmPercent: Number(slmPercent),
        trailEveryPercentageChangeValue: Number(trailEveryPercentageChangeValue),
        trailingSlPercent: Number(trailingSlPercent),
        maxSkewPercent: Number(maxSkewPercent),
        thresholdSkewPercent: Number(thresholdSkewPercent),
        expireIfUnsuccessfulInMins: Number(expireIfUnsuccessfulInMins),
        runAt: runNow ? dayjs().format() : runAt,
        squareOffTime: isAutoSquareOffEnabled
          ? dayjs(squareOffTime).set('seconds', 0).format()
          : null
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
        trailingSlPercent
      } = data

      const apiProps = {
        ...data,
        lots: Number(lots),
        slmPercent: Number(slmPercent),
        trailEveryPercentageChangeValue: Number(trailEveryPercentageChangeValue),
        trailingSlPercent: Number(trailingSlPercent),
        runAt: runNow ? dayjs().format() : runAt,
        inverted: Boolean(inverted),
        squareOffTime: isAutoSquareOffEnabled
          ? dayjs(squareOffTime).set('seconds', 0).format()
          : null
      }

      return apiProps
    }

    default:
      return null
  }
}
