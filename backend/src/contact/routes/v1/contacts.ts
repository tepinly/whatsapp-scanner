import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../utils/database'
import * as contactService from '../../services/contactService'
import * as userService from '../../../user/services/userService'
import { contactSyncQueue } from '../../../queues/ContactSyncQueue'

export default async function contactRoutesV1(fastify: FastifyInstance) {
	// POST /v1/sync
	fastify.post('/sync', async (request, reply) => {
		const { name, phone, contacts } = request.body as {
			name: string
			phone: string
			contacts: {
				name: string
				lastInteraction?: string
				messages?: {
					direction: 'incoming' | 'outgoing'
					content: string
				}[]
			}[]
		}

		let user = await prisma.user.findUnique({ where: { phone } })
		if (!user) {
			user = await prisma.user.create({ data: { name, phone } })
		}

		await contactSyncQueue.add(
			'sync',
			{ name, phone, contacts },
			{ jobId: phone }
		)

		return reply.code(202).send({ message: 'Sync job queued' })
	})

	// GET /v1/:phone/contacts
	fastify.get('/:phone/contacts', async (request, reply) => {
		const { phone } = request.params as { phone: string }

		const user = await userService.getUserByPhone(phone)

		if (!user) {
			return reply.status(404).send({ error: 'User not found' })
		}

		const contacts = await contactService.getUserContacts(user.id)

		return {
			contacts: contacts.map((contact) => ({
				name: contact.name,
				lastInteraction: contact.metadata?.lastInteraction,
			})),
		}
	})
}
