// workers/contactSyncWorker.ts
import { Worker } from 'bullmq'
import * as contactService from '../contact/services/contactService'
import { redis } from '../cache/redis'

new Worker(
	'contact-sync',
	async (job) => {
		const { name, phone, contacts } = job.data
		await contactService.syncContacts(name, phone, contacts)
	},
	{ connection: redis }
)
