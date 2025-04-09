import Fastify from 'fastify'
import cors from '@fastify/cors'
import contactsRoutesV1 from './contact/routes/v1/contacts'
import { redis } from './cache/redis'
import './workers/ContactSyncWorker'

const host = process.env.HOST || '0.0.0.0'
const port = +(process.env.PORT ?? 3000)

const server = Fastify({ logger: true })

;(async () => {
	const allowedOrigins =
		process.env.NODE_ENV === 'development'
			? [
					'http://localhost:5173',
					'chrome-extension://*',
					'https://web.whatsapp.com',
			  ]
			: [
					'https://my-whatsapp-sync.fly.dev',
					'chrome-extension://*',
					'https://web.whatsapp.com',
			  ]

	await server.register(cors, {
		origin: allowedOrigins,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		credentials: true,
		allowedHeaders: ['Content-Type', 'Authorization'],
		exposedHeaders: ['Content-Range', 'X-Content-Range'],
		maxAge: 86400,
	})
	server.get('/', async () => {
		return { status: 'ok' }
	})

	server.register(contactsRoutesV1, { prefix: '/v1' })

	await server.listen({ port, host })
	console.log(`Server listening on http://${host}:${port}`)
})()

server.addHook('onClose', async () => {
	await redis.quit()
})
