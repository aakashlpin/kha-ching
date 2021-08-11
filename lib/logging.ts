// import { createLogger } from 'winston';
// import Console from 'winston-console-transport';
// import { Loggly } from 'winston-loggly-bulk';

// const logger = createLogger({
//   transports: [
//     new Loggly({
//       token: process.env.LOGGLY_TOKEN,
//       subdomain: process.env.LOGGLY_SUBDOMAIN,
//       tags: ['Winston-NodeJS'],
//       json: true
//     })
//   ]
// });

const logging = {
  log: (...args) => {
    console.log(...args)
    // logger.log('info', ...args);
  },
  error: (...args) => {
    console.error(...args)
    // logger.log('error', ...args);
  }
}

export default logging
