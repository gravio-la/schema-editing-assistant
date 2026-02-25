import Redis from 'ioredis'
import config from './config'

/** Shared ioredis client — imported by session store and any other Redis consumers. */
const redis = new Redis(config.REDIS_URL)

export default redis
