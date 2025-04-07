import { Redis } from 'ioredis'
import dotenv from 'dotenv'
dotenv.config()

export const redis = new Redis({
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(process.env.REDIS_PORT || '6379'),
	password: process.env.REDIS_PASSWORD || undefined,
	maxRetriesPerRequest: null,
})
