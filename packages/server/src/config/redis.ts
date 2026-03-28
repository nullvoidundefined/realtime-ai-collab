import IORedis from 'ioredis';

export const redis = new IORedis.default(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  },
);

redis.on('error', (err: Error) => {
  console.error('Redis error:', err.message);
});
