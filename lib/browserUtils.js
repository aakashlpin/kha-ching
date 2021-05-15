import dayjs from 'dayjs';

import { STRATEGIES_DETAILS } from './constants';

export const ensureIST = (date) => {
  const IST_TZ = '+05:30';
  const [dateStr, timeWithZone] = dayjs(date).format().split('T');
  const [time, zone] = [timeWithZone.substr(0, 8), timeWithZone.substr(8)];
  const datetimeInIST = zone === IST_TZ ? date : dayjs(`${dateStr}T${time}${IST_TZ}`).toDate();
  return datetimeInIST;
};

export function getScheduleableTradeTime(strategy) {
  const defaultDate = dayjs(STRATEGIES_DETAILS[strategy].defaultRunAt).format();

  if (dayjs().isAfter(dayjs(defaultDate))) {
    return dayjs().add(10, 'minutes').format();
  }

  return defaultDate;
}

export function getDefaultSquareOffTime() {
  try {
    const [hours, minutes] = (process.env.NEXT_PUBLIC_DEFAULT_SQUARE_OFF_TIME || '15:20').split(
      ':'
    );
    return dayjs().set('hours', hours).set('minutes', minutes).format();
  } catch (e) {
    return null;
  }
}

export function getSchedulingStateProps(strategy) {
  return {
    runNow: false,
    isAutoSquareOffEnabled: true,
    runAt: getScheduleableTradeTime(strategy),
    squareOffTime: getDefaultSquareOffTime()
  };
}

export function commonOnChangeHandler(changedProps, state, setState) {
  if (changedProps.instruments) {
    setState({
      ...state,
      instruments: {
        ...state.instruments,
        ...changedProps.instruments
      }
    });
  } else {
    setState({
      ...state,
      ...changedProps
    });
  }
}
