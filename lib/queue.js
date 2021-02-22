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
  exportQueues[exportName]
    .on('completed', (job) => {
      const { id, data: jobData } = job;
      console.log(`[State change] queue:${exportName}:${id}: ✅ Completed!`);
      // if (childQueue) {
      //   redis.sadd(`spawnedBy:${jobData.parentJobId}:completed`, `${exportName}${id}`);
      // }
      // job.remove();
    })
    .on('waiting', function (jobId) {
      // A Job is waiting to be processed as soon as a worker is idling.
    })

    .on('active', function (job, jobPromise) {
      // A job has started. You can use `jobPromise.cancel()`` to abort it.
    })

    .on('stalled', function (job) {
      // A job has been marked as stalled. This is useful for debugging job
      // workers that crash or pause the event loop.
      console.log('job stalled', job.id);
    })

    .on('progress', function (job, progress) {
      // A job's progress was updated!
    })

    .on('completed', function (job, result) {
      // A job successfully completed with a `result`.
    })

    .on('failed', function (job, err) {
      // A job failed with reason `err`!
      console.log('job failed', job.id, err);
    })

    .on('paused', function () {
      // The queue has been paused.
    })

    .on('resumed', function (job) {
      // The queue has been resumed.
    })

    .on('cleaned', function (jobs, type) {
      // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
      // jobs, and `type` is the type of jobs cleaned.
    })

    .on('drained', function () {
      // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
    })

    .on('removed', function (job) {
      // A job successfully removed.
    });
});

export default exportQueues;
