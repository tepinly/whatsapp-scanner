import { useState } from 'react'
import PhoneInput from './PhoneInput'

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
		<div className="flex flex-col items-center justify-center h-[300px] w-[350px] text-center p-3">
			<h3 className="text-lg font-semibold mb-4">WhatsApp Sync</h3>
			<PhoneInput onChange={setPhoneNumber} />
			<button
				onClick={handleClick}
				className={`font-bold py-2 px-4 rounded mb-4 ${
					isButtonDisabled
						? 'bg-gray-300 text-gray-500 cursor-not-allowed'
						: 'bg-green-500 hover:bg-green-700 text-white'
				}`}
				disabled={isButtonDisabled}
			>
				{status === 'Idle' ? 'Sync' : status}
			</button>
			{!isValidPhoneNumber(phoneNumber) && phoneNumber && (
				<p className="text-red-500 text-xs mb-2">
					Please enter a valid phone number with country code
				</p>
			)}
			<p className="text-sm">
				Sync will be completed once the bottom contact is reached
			</p>
		</div>
	)
}

export default App
