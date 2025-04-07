import { useState } from 'react'
import PhoneInput from './PhoneInput'

export const App = () => {
	const [status, setStatus] = useState<string>('Idle')

	const handleClick = async () => {
		setStatus('Scanning...')

		try {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			})

			if (!tab?.id) throw new Error('No active tab')

			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: ['content.js'],
			})

			setStatus('Scanning...')
		} catch (err) {
			console.error('Failed to inject script', err)
			setStatus('Scan failed!')
		}
	}

	return (
		<div className="flex flex-col items-center justify-center h-[300px] w-[350px] text-center p-3">
			<h3 className="text-lg font-semibold mb-4">WhatsApp Sync</h3>
			<PhoneInput />
			<button
				onClick={handleClick}
				className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
			>
				{status === 'Idle' ? 'Sync' : status}
			</button>
			<p className="text-sm">
				Scan will be completed once bottom contact is reached
			</p>
		</div>
	)
}

export default App
