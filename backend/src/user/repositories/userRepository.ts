import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../../utils/database'

// Find user by phone number
export async function findUserByPhone(
	phone: string,
	tx?: Prisma.TransactionClient
) {
	const client = tx || prisma
	return client.user.findUnique({
		where: { phone },
	})
}

// Create a new user
export async function createUser(
	name: string,
	phone: string,
	tx?: Prisma.TransactionClient
) {
	const client = tx || prisma
	return client.user.create({
		data: { name, phone },
	})
}
