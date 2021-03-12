import { Queue, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const queueName = 'tradingQueue';
const redisConnection = new IORedis(redisUrl);

const tradingQueueScheduler = new QueueScheduler(queueName, {
  connection: redisConnection
});
const tradingQueue = new Queue(queueName, { connection: redisConnection });

export default {
  tradingQueue,
  redisConnection,
  tradingQueueScheduler
};
