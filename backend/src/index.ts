import Fastify from 'fastify'
import cors from '@fastify/cors'
import contactsRoutesV1 from './contact/routes/v1/contacts'
import { redis } from './cache/redis'
import './workers/ContactSyncWorker'

const server = Fastify({ logger: true })

await server.register(cors, {
	origin: [
		'chrome-extension://*',
		'http://localhost:5173',
		'https://web.whatsapp.com',
	],
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	credentials: true,
	allowedHeaders: ['Content-Type', 'Authorization'],
	exposedHeaders: ['Content-Range', 'X-Content-Range'],
	maxAge: 86400, // 24 hours
})

server.register(contactsRoutesV1, { prefix: '/v1' })

server.listen({ port: 3000 }, (err, address) => {
	if (err) throw err
	console.log(`Server listening at ${address}`)
})

server.addHook('onClose', async () => {
	await redis.quit()
})
