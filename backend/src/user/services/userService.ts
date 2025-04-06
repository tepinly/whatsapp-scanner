import * as userRepository from '../repositories/userRepository'

export const getUserByPhone = async (phone: string) => {
	return userRepository.findUserByPhone(phone)
}

export const createUser = async (name: string, phone: string) => {
	return userRepository.createUser(name, phone)
}
