import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/database'

// Create contacts in batch
export async function createContactsBatch(
	userId: string,
	contacts: { name: string; lastInteraction?: string }[],
	tx?: Prisma.TransactionClient
) {
	const client = tx || prisma

	// Use createMany for batch insertion
	await client.contact.createMany({
		data: contacts.map((contact) => ({
			userId,
			name: contact.name,
		})),
		skipDuplicates: true, // Skip if the contact already exists
	})

	// Return the created/existing contacts
	return client.contact.findMany({
		where: {
			userId,
			name: { in: contacts.map((contact) => contact.name) },
		},
	})
}

// Get user contacts
export async function getUserContacts(
	userId: string,
	tx?: Prisma.TransactionClient
) {
	const client = tx || prisma
	return client.contact.findMany({
		where: {
			userId,
		},
		include: {
			metadata: true,
		},
	})
}

// Create metadata in batch
export async function createMetadatasBatch(
	metadatas: { contactId: string; lastInteraction: Date }[],
	tx?: Prisma.TransactionClient
) {
	const client = tx || prisma
	return client.metadata.createMany({
		data: metadatas.map((metadata) => ({
			contactId: metadata.contactId,
			lastInteraction: metadata.lastInteraction,
		})),
		skipDuplicates: true,
	})
}

// Log sync operation
export async function logSync(userId: string, tx?: Prisma.TransactionClient) {
	const client = tx || prisma
	return client.syncLog.create({
		data: {
			userId,
			syncedAt: new Date(),
		},
	})
}
