import { createLogger, transports, format } from "winston";
import  'winston-daily-rotate-file';

const transport = new transports.DailyRotateFile({
  filename: 'application-%DATE%.log',
  datePattern: 'YYYYMMDD',
  maxFiles: '10d',
  dirname:'./logs/'
});
const formatMeta = (meta) => {
    // You can format the splat yourself
    const splat = meta[Symbol.for('splat')];
    if (splat && splat.length) {
      return splat.length === 1 ? JSON.stringify(splat[0]) : JSON.stringify(splat);
    }
    return '';
  };
  
  const customFormat = format.printf(({
    timestamp,
    level,
    message,
    ...meta
  }) => `[${timestamp}] ${level} ${message} ${formatMeta(meta)}`);
const logger = createLogger({
  transports: [
    transport,
    new transports.Console(),
  ],
  format: format.combine(
    format.splat(),
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:SS' }),
    customFormat,
    )
});

export default logger