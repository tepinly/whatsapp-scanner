import { useState } from 'react'
import { Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PhoneInput from '@/components/PhoneInput'

const App = () => {
	const [status, setStatus] = useState<string>('Idle')
	const [phoneNumber, setPhoneNumber] = useState<string>('')
	const [isScanning, setIsScanning] = useState(false)

	// Add phone number validation
	const isValidPhoneNumber = (phone: string) => {
		// Basic validation: must start with + and contain only numbers
		return phone.startsWith('+') && phone.length >= 8 && /^\+\d+$/.test(phone)
	}

	const handleClick = async () => {
		if (!isValidPhoneNumber(phoneNumber)) {
			setStatus('Invalid phone number!')
			return
		}

		setIsScanning(true)
		setStatus('Scanning...')

		try {
			// Get the active tab
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
				url: 'https://web.whatsapp.com/*',
			})

			if (!tab?.id) {
				throw new Error('WhatsApp Web is not open')
			}

			try {
				// Try to send message to content script
				const response = await chrome.tabs.sendMessage(tab.id, {
					action: 'startScanner',
					phoneNumber: phoneNumber,
				})

				console.log('Response from content script:', response)

				if (response?.status === 'Scanner started') {
					setStatus('Scanning in progress...')
				} else {
					throw new Error('Failed to start scanner')
				}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (messageError: any) {
				// If content script isn't ready, inject it
				if (messageError.message.includes('Receiving end does not exist')) {
					await chrome.scripting.executeScript({
						target: { tabId: tab.id },
						files: ['content.js'],
					})

					// Wait a moment for the script to initialize
					await new Promise((resolve) => setTimeout(resolve, 1000))

					// Try sending the message again
					const retryResponse = await chrome.tabs.sendMessage(tab.id, {
						action: 'startScanner',
						phoneNumber: phoneNumber,
					})

					if (retryResponse?.status === 'Scanner started') {
						setStatus('Scanning in progress...')
					} else {
						throw new Error('Failed to start scanner after injection')
					}
				} else {
					throw messageError
				}
			}
		} catch (err) {
			console.error('Scanner error:', err)
			setStatus(err instanceof Error ? err.message : 'Failed to start scanner')
			setIsScanning(false)
		}
	}

	const isButtonDisabled = !isValidPhoneNumber(phoneNumber) || isScanning

	return (
		<div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white p-4 flex items-center justify-center">
			<div className="max-w-md w-full space-y-4">
				<div className="flex flex-col items-center text-center">
					<div className="h-12 w-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-blue-500/20">
						<Phone className="h-6 w-6 text-white" />
					</div>
					<h1 className="text-3xl p-1 font-bold bg-gradient-to-r from-blue-500 to-green-400 text-transparent bg-clip-text">
						WhatsApp Sync
					</h1>
					<p className="text-zinc-400 mt-2 max-w-sm">
						Begin syncing your WhatsApp contacts
					</p>
				</div>

				<Card className="bg-zinc-800/50 border-zinc-700 backdrop-blur-sm">
					<CardContent className="pt-1 pb-1">
						<PhoneInput onChange={setPhoneNumber} />

						{!isValidPhoneNumber(phoneNumber) && phoneNumber && (
							<p className="text-red-500 text-xs mt-2 mb-4">
								Please enter a valid phone number with country code
							</p>
						)}

						<Button
							onClick={handleClick}
							disabled={isButtonDisabled}
							className="mt-4 w-full bg-gradient-to-r from-blue-500 to-green-400 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold"
						>
							{status === 'Idle' ? 'Sync' : status}
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

export default App
