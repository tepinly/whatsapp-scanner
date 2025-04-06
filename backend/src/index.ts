import Fastify from 'fastify'
import contactsRoutesV1 from './contact/routes/v1/contacts'

const server = Fastify({ logger: true })

server.register(contactsRoutesV1, { prefix: '/v1' })

server.listen({ port: 3000 }, (err, address) => {
	if (err) throw err
	console.log(`Server listening at ${address}`)
})
