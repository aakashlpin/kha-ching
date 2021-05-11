import dayjs from 'dayjs';

import { getDateTimeInIST, getMisOrderLastSquareOffTime, getNearestCandleTime } from '../lib/utils';

const nearestCandle = getNearestCandleTime(5 * 60 * 1000);
const formatted = dayjs(nearestCandle).format();
console.log(formatted);

// const now = getDateTimeInIST().getTime();
const finalOrderTime = getMisOrderLastSquareOffTime();
console.log({ finalOrderTime: dayjs(finalOrderTime).format() });
const time = '2021-05-11T23:20:00+05:30';
const runAtTime = dayjs(time).isAfter(dayjs(finalOrderTime)) ? finalOrderTime : time;
console.log({ runAtTime: dayjs(runAtTime).format() });
