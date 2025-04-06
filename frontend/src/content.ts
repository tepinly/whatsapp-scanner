document.getElementById('scanButton')?.addEventListener('click', () => {
	// Get the active tab first
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (tabs[0]) {
			const tabId = tabs[0].id ?? 0 // Get the active tab's ID

			// Send a message to execute the script on the active tab
			chrome.scripting.executeScript({
				target: { tabId }, // Use the actual tab ID
				func: startScan,
			})
		}
	})
})

function startScan() {
	console.log('WhatsApp Timestamp Logger is running!')

	// Get the pane-side element (scrollable container)
	const chatListContainer = document.getElementById('pane-side')
	if (chatListContainer) {
		const chatList = chatListContainer.querySelector('[aria-label="Chat list"]') // Find the actual contact list inside the container

		if (chatList) {
			// Initially scan the contact list
			scanContacts(chatList)

			// Scroll to the bottom of the chat list
			scrollToBottom(chatListContainer, chatList)
		} else {
			console.error('Chat list not found.')
		}
	}
}

function scanContacts(chatList: Element) {
	const contacts = chatList.querySelectorAll('div[role="listitem"]')
	contacts.forEach((contact) => {
		const name =
			contact.querySelector('span[dir="auto"]')?.textContent?.trim() ??
			'Unknown'

		const allDivs = contact.querySelectorAll('div')
		if (!allDivs || allDivs.length === 0) {
			console.error('No divs found in contact:', name)
			return
		}

		const timestamp =
			[...allDivs]
				.find((el) => {
					const text = el.textContent?.trim() ?? ''
					return (
						/^\d{1,2}:\d{2}$/.test(text) || // Time e.g., 09:45
						/^(Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/.test(
							text
						) || // Day e.g., Yesterday, Monday
						/^\d{2}\/\d{2}\/\d{4}$/.test(text) // Date e.g., 30/03/2025
					)
				})
				?.textContent?.trim() ?? 'Unknown'

		console.log({ name, timestamp })
	})
}

function scrollToBottom(chatListContainer: Element, chatList: Element) {
	const scrollHeight = chatListContainer.scrollHeight
	const currentScroll = chatListContainer.scrollTop
	const clientHeight = chatListContainer.clientHeight

	// If we're not at the bottom of the list, scroll down
	if (currentScroll + clientHeight < scrollHeight) {
		chatListContainer.scrollTop = scrollHeight
	}

	// Wait a bit for more contacts to load and then call scanContacts again
	setTimeout(() => {
		scanContacts(chatList) // Continue scanning the contacts
		scrollToBottom(chatListContainer, chatList) // Continue scrolling
	}, 2000) // Adjust the timeout (in milliseconds) as needed, to let new contacts load
}