document.addEventListener('DOMContentLoaded', () => {
	const button = document.getElementById('scanButton')

	if (!button) {
		console.error("'scanButton' not found in DOM")
		return
	}

	button.addEventListener('click', async () => {
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
		} catch (err) {
			console.error('Failed to inject script', err)
			alert(
				`Injection failed:\n${
					err instanceof Error ? err.message : JSON.stringify(err)
				}`
			)
		}
	})
})
