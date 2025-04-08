'use client'

import { useState } from 'react'
import { MessageSquare, Calendar, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PhoneInput from '@/components/PhoneInput'

export default function WhatsAppSync() {
	const [phone, setPhone] = useState('')
	const [contacts, setContacts] = useState<
		Array<{ name: string; lastInteraction?: string }>
	>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleGetContacts = async () => {
		setLoading(true)
		setError('')
		try {
			const response = await fetch(
				`http://localhost:3000/v1/${encodeURIComponent(phone)}/contacts`
			)
			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.error || 'Failed to fetch contacts')
			}
			const data = await response.json()
			setContacts(data.contacts)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white p-4 md:p-8 flex items-center justify-center">
			<div className="max-w-md w-full">
				<div className="flex flex-col items-center text-center mb-10">
					<div className="h-16 w-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
						<MessageSquare className="h-8 w-8 text-white" />
					</div>
					<h1 className="text-4xl p-1 font-bold bg-gradient-to-r from-blue-500 to-green-400 text-transparent bg-clip-text">
						WhatsApp Sync
					</h1>
					<p className="text-zinc-400 mt-2 max-w-sm">
						Connect and view your synced WhatsApp contacts
					</p>
				</div>

				<Card className="bg-zinc-800/50 border-zinc-700 backdrop-blur-sm mb-8">
					<CardContent className="pt-6">
						<PhoneInput onChange={setPhone} />

						<div className="mt-6">
							<Button
								onClick={handleGetContacts}
								disabled={loading || !phone}
								className="w-full bg-gradient-to-r from-blue-500 to-green-400 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-white border-0"
								size="lg"
							>
								{loading ? (
									<span className="flex items-center gap-2">
										<svg
											className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Loading...
									</span>
								) : (
									<span className="flex items-center gap-2 font-semibold">
										Get Contacts
									</span>
								)}
							</Button>
						</div>

						{error && (
							<div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-sm">
								{error}
							</div>
						)}
					</CardContent>
				</Card>

				{contacts.length > 0 && (
					<div className="space-y-4 animate-in fade-in duration-500">
						<div className="flex items-center gap-2 mb-4">
							<div className="h-8 w-8 bg-green-400/20 rounded-full flex items-center justify-center">
								<Check className="h-4 w-4 text-green-400" />
							</div>
							<h2 className="text-xl font-semibold text-green-400">
								Synced Contacts
							</h2>
						</div>

						{contacts.map((contact, index) => (
							<Card
								key={index}
								className="bg-zinc-800/50 border-zinc-700 backdrop-blur-sm overflow-hidden transition-all hover:bg-zinc-700/50"
							>
								<CardContent className="p-4">
									<div className="flex justify-between items-center">
										<span className="text-white font-medium">
											{contact.name}
										</span>
										{contact.lastInteraction && (
											<div className="flex items-center text-xs text-zinc-400 gap-1">
												<span>
													{new Date(
														contact.lastInteraction
													).toLocaleDateString()}
												</span>
												<Calendar className="h-3 w-3" />
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
