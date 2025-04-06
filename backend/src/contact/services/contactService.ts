import { prisma } from '../../utils/database'
import * as contactRepository from '../repositories/contactRepository'
import * as userRepository from '../../user/repositories/userRepository'

export async function syncContacts(
	name: string,
	phone: string,
	contacts: { name: string; lastInteraction?: string }[]
) {
	// Use a transaction to ensure data consistency
	return prisma.$transaction(async (tx) => {
		// Find or create user in a single operation
		let user = await userRepository.findUserByPhone(phone, tx)
		if (!user) {
			user = await userRepository.createUser(name, phone, tx)
		}

		// Create contacts in batch
		const savedContacts = await contactRepository.createContactsBatch(
			user.id,
			contacts,
			tx
		)

		// Process metadata in a more efficient way
		const metadataToInsert = savedContacts
			.map(
				(savedContact: {
					id: string
					name: string
					lastInteraction?: string
				}) => {
					const original = contacts.find(
						(contact) => contact.name === savedContact.name
					)
					if (!original?.lastInteraction) return null

					return {
						contactId: savedContact.id,
						lastInteraction: new Date(original.lastInteraction),
					}
				}
			)
			.filter(Boolean) as { contactId: string; lastInteraction: Date }[]

		// Batch insert metadata if any exists
		if (metadataToInsert.length > 0) {
			await contactRepository.createMetadatasBatch(metadataToInsert, tx)
		}

		// Log the sync within the same transaction
		await contactRepository.logSync(user.id, tx)

		return savedContacts
	})
}

export const getUserContacts = async (userId: string) => {
	return contactRepository.getUserContacts(userId)
}
