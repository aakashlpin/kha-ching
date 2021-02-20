const Queue = require('bull');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL;

const client = new Redis(redisUrl);
const subscriber = new Redis(redisUrl);

const opts = {
  createClient(type) {
    switch (type) {
      case 'client':
        return client;
      case 'subscriber':
        return subscriber;
      default:
        return new Redis(redisUrl);
    }
  }
};

export const redis = opts.createClient();

const queues = [
  {
    exportName: 'tradingQueue',
    bullName: 'kha-ching-trades',
    bullOpts: {
      // limit to sending 1 message/ few seconds
    }
  }
];

const exportQueues = {};
queues.forEach(({ exportName, bullName, childQueue, bullOpts = {} }) => {
  exportQueues[exportName] = new Queue(bullName, { ...opts, ...bullOpts });

  // NB: https://stackoverflow.com/a/44446859/721084
  // this line is causing the below warning
  // (node:50280) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 error listeners added. Use emitter.setMaxListeners() to increase limit
  //
  // it's largely okay because we do want to attach complete events on each queue
  exportQueues[exportName].on('completed', (job) => {
    const { id, data: jobData } = job;
    console.log(`[State change] queue:${exportName}:${id}: ✅ Completed!`);
    // if (childQueue) {
    //   redis.sadd(`spawnedBy:${jobData.parentJobId}:completed`, `${exportName}${id}`);
    // }
    job.remove();
  });
});

export default exportQueues;
