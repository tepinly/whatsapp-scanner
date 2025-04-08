import { prisma } from '../../utils/database'
import * as contactRepository from '../repositories/contactRepository'
import * as userRepository from '../../user/repositories/userRepository'

export async function syncContacts(
	name: string,
	phone: string,
	contacts: {
		name: string
		lastInteraction?: string
		messages?: {
			direction: 'incoming' | 'outgoing'
			content: string
		}[]
	}[]
) {
	return prisma.$transaction(async (tx) => {
		let user = await userRepository.findUserByPhone(phone, tx)
		if (!user) {
			user = await userRepository.createUser(name, phone, tx)
		}

		const savedContacts = await contactRepository.createContactsBatch(
			user.id,
			contacts,
			tx
		)

		const contactsMap = new Map(
			contacts.map((contact) => [contact.name, contact])
		)

		const metadataToInsert = savedContacts
			.map((savedContact) => {
				const original = contactsMap.get(savedContact.name)
				if (!original?.lastInteraction) return null

				return {
					contactId: savedContact.id,
					lastInteraction: new Date(original.lastInteraction),
					messageCount: original.messages?.length || 0,
				}
			})
			.filter(Boolean) as {
			contactId: string
			lastInteraction: Date
			messageCount: number
		}[]

		const messagesToInsert = savedContacts.flatMap((savedContact) => {
			const original = contactsMap.get(savedContact.name)
			if (!original?.messages?.length) return []

			return original.messages.map((message) => ({
				contactId: savedContact.id,
				direction: message.direction,
				content: message.content,
			}))
		})

		// Insertions
		await Promise.all([
			contactRepository.createMetadatasBatch(metadataToInsert, tx),
			contactRepository.createMessagesBatch(messagesToInsert, tx),
			contactRepository.logSync(user.id, tx),
		])

		return savedContacts
	})
}

export const getUserContacts = async (userId: string) => {
	return contactRepository.getUserContacts(userId)
}
