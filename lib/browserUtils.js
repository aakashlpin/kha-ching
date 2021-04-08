import dayjs from 'dayjs';

export const ensureIST = (date) => {
  const IST_TZ = '+05:30';
  const [dateStr, timeWithZone] = dayjs(date).format().split('T');
  const [time, zone] = [timeWithZone.substr(0, 8), timeWithZone.substr(8)];
  const datetimeInIST = zone !== IST_TZ ? date : dayjs(`${dateStr}T${time}${IST_TZ}`).toDate();
  return datetimeInIST;
};
