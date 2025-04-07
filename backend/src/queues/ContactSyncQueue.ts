// queues/contactSyncQueue.ts
import { Queue } from 'bullmq'
import { redis } from '../cache/redis' // You should have a shared redis client

export const contactSyncQueue = new Queue('contact-sync', {
	connection: redis,
})
