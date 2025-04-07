/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="typescript" />

declare global {
	interface Window {
		whatsappContacts?: Map<string, any>
		runWhatsAppScanner?: () => void
	}
}

function initWhatsAppScanner() {
	console.log('🔍 Scanner running')
	const contactsMap = new Map()
	const CONTACT_HEIGHT = 72

	const scrollPane = document.getElementById('pane-side')
	if (!scrollPane || scrollPane === null) {
		console.error('Chat list pane not found!')
		return
	}

	function simulateRealClick(element: any) {
		if (!element) return false

		const rect = element.getBoundingClientRect()
		const centerX = rect.left + rect.width / 2
		const centerY = rect.top + rect.height / 2

		const events = [
			new MouseEvent('mousemove', {
				bubbles: true,
				cancelable: true,
				view: window,
				clientX: centerX,
				clientY: centerY,
			}),
			new MouseEvent('mousedown', {
				bubbles: true,
				cancelable: true,
				view: window,
				clientX: centerX,
				clientY: centerY,
				button: 0,
				buttons: 1,
			}),
			new MouseEvent('mouseup', {
				bubbles: true,
				cancelable: true,
				view: window,
				clientX: centerX,
				clientY: centerY,
				button: 0,
				buttons: 0,
			}),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				view: window,
				clientX: centerX,
				clientY: centerY,
				button: 0,
				buttons: 0,
			}),
		]

		try {
			events.forEach((event) => {
				const targetElement = document.elementFromPoint(centerX, centerY)
				if (targetElement) {
					targetElement.dispatchEvent(event)
				} else {
					console.warn('No element found at coordinates:', centerX, centerY)
				}
			})
			return true
		} catch (error) {
			console.error('Error simulating click:', error)
			return false
		}
	}

	function convertTimestampToDate(timestamp: string) {
		if (!timestamp || timestamp === 'Unknown') return null

		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

		// Case 1: Time format (e.g., "09:45")
		if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
			const [hours, minutes] = timestamp.split(':').map(Number)
			const date = new Date(today)
			date.setHours(hours, minutes, 0, 0)
			return date
		}

		// Case 2: "Yesterday"
		if (timestamp === 'Yesterday') {
			const yesterday = new Date(today)
			yesterday.setDate(yesterday.getDate() - 1)
			return yesterday
		}

		// Case 3: Day of week (e.g., "Monday", "Tuesday", etc.)
		const daysOfWeek = [
			'Sunday',
			'Monday',
			'Tuesday',
			'Wednesday',
			'Thursday',
			'Friday',
			'Saturday',
		]
		const dayIndex = daysOfWeek.indexOf(timestamp)

		if (dayIndex !== -1) {
			const currentDayIndex = today.getDay()
			let daysAgo = currentDayIndex - dayIndex
			if (daysAgo <= 0) daysAgo += 7

			const date = new Date(today)
			date.setDate(date.getDate() - daysAgo)
			return date
		}

		// Case 4: Date format (e.g., "30/03/2025" or "30/03/2023")
		if (/^\d{2}\/\d{2}\/\d{4}$/.test(timestamp)) {
			const [day, month, year] = timestamp.split('/').map(Number)
			return new Date(year, month - 1, day) // month is 0-indexed in JavaScript Date
		}

		return null
	}

	function extractContacts() {
		// Find all contact elements in the chat list
		const contactElements = document.querySelectorAll('div[role="listitem"]')

		let newContactsFound = 0
		const contactsList: any = []

		contactElements.forEach((element) => {
			try {
				// Find the name element within the contact - look for span with title attribute
				const nameElement = element.querySelector('span[dir="auto"][title]')
				if (nameElement) {
					const contactName = nameElement.textContent?.trim()

					// Extract timestamp (last interaction date)
					const allDivs = element.querySelectorAll('div')
					const timestampElement = [...allDivs].find((el) => {
						const text = el.textContent?.trim() ?? ''
						return (
							/^\d{1,2}:\d{2}$/.test(text) || // Time e.g., 09:45
							/^(Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/.test(
								text
							) || // Day e.g., Yesterday, Monday
							/^\d{2}\/\d{2}\/\d{4}$/.test(text) // Date e.g., 30/03/2025
						)
					})

					const timestampText =
						timestampElement?.textContent?.trim() || 'Unknown'
					const lastInteractionDate = convertTimestampToDate(timestampText)

					// Store both the original text and the converted date
					const lastInteraction = {
						text: timestampText,
						date: lastInteractionDate
							? lastInteractionDate.toISOString()
							: null,
					}

					if (!contactsMap.has(contactName) && contactName) {
						// Find the specific div with tabindex="-1"
						const clickableDiv = element.querySelector('div[tabindex="-1"]')

						contactsMap.set(contactName, {
							element: element,
							clickableDiv: clickableDiv,
							messages: [],
							processed: false,
							position: element.getBoundingClientRect().top, // Store current position
							lastInteraction: lastInteraction, // Add the last interaction timestamp
						})
						newContactsFound++
						contactsList.push(contactName)
					} else if (contactsMap.has(contactName)) {
						// Update the element reference and position for existing contacts
						const existingData = contactsMap.get(contactName)
						existingData.element = element
						existingData.clickableDiv =
							element.querySelector('div[tabindex="-1"]')
						existingData.position = element.getBoundingClientRect().top
						existingData.lastInteraction = lastInteraction // Update the timestamp
					}
				}
			} catch (error) {
				console.error('Error processing contact element:', error)
			}
		})

		return { newContactsFound, contactsList }
	}

	async function extractMessages() {
		const messages: { id: string; text: string; direction: string }[] = []
		const MAX_MESSAGES = 20 // Maximum number of messages to collect
		const SCROLL_DELAY = 1500 // Increased delay after scrolling (1.5 seconds)
		const LOAD_CHECK_INTERVAL = 300 // Check for new messages every 300ms
		const MAX_LOAD_WAIT = 1000 // Maximum time to wait for messages to load (5 seconds)

		try {
			// Find the copyable area that contains messages
			const copyableArea = document.querySelector('.copyable-area')
			if (!copyableArea) {
				console.error('Copyable area not found')
				return messages
			}

			// Find the scrollable container - it's the second div inside copyable-area with tabindex="0"
			const scrollableContainer =
				copyableArea.querySelector('div[tabindex="0"]')
			if (!scrollableContainer) {
				console.error('Scrollable container not found')
				return messages
			}

			function extractVisibleMessages() {
				const messageRows =
					copyableArea?.querySelectorAll('div[role="row"]') ?? []
				const newMessages = []

				// Process in reverse order (bottom to top)
				for (let i = messageRows.length - 1; i >= 0; i--) {
					const row = messageRows[i]

					try {
						// Check if this is a message row (has message-in or message-out class)
						const messageDiv = row.querySelector('.message-in, .message-out')
						if (!messageDiv) continue // Skip if not a message

						// Check if we've already processed this message (by using a data attribute or message ID)
						const messageId = row
							.querySelector('div[data-id]')
							?.getAttribute('data-id')
						if (messageId && messages.some((m) => m.id === messageId)) continue

						// Determine if this is an outgoing or incoming message
						const isOutgoing = messageDiv.classList.contains('message-out')
						const direction = isOutgoing ? 'outgoing' : 'incoming'

						// Find the message text content
						const textElement = row.querySelector(
							'.selectable-text.copyable-text'
						)
						if (!textElement) continue

						const text = textElement.textContent?.trim()

						// Add the message to our collection
						if (text) {
							newMessages.push({
								id:
									messageId ||
									`msg_${Date.now()}_${Math.random()
										.toString(36)
										.substr(2, 9)}`,
								text: text,
								direction: direction,
							})
						}
					} catch (error) {
						console.error('Error processing message row:', error)
					}
				}

				return newMessages
			}

			function scrollUp() {
				try {
					if (!scrollableContainer?.scrollTop) {
						throw new Error('scrollTop is not defined')
					}
					const previousScrollTop = scrollableContainer.scrollTop

					// Use a smaller scroll amount for more controlled scrolling
					const scrollAmount = 800 // Reduced from 1000 to 800

					// Method 1: Direct scrollTop manipulation
					scrollableContainer.scrollTop -= scrollAmount

					// Method 2: If that didn't work, try scrollBy
					if (scrollableContainer.scrollTop === previousScrollTop) {
						scrollableContainer.scrollBy({
							top: -scrollAmount,
							behavior: 'auto',
						})
					}

					// Check if scroll was successful
					const scrolled = scrollableContainer.scrollTop !== previousScrollTop
					const actualScrollAmount =
						previousScrollTop - scrollableContainer.scrollTop

					return { scrolled, scrollAmount: actualScrollAmount }
				} catch (error) {
					console.error('Error during scroll:', error)
					return { scrolled: false, scrollAmount: 0 }
				}
			}

			async function waitForMessagesToLoad(previousMessageCount: number) {
				const startTime = Date.now()
				let currentMessageCount =
					copyableArea?.querySelectorAll('div[role="row"]').length ?? 0

				while (
					currentMessageCount <= previousMessageCount &&
					Date.now() - startTime < MAX_LOAD_WAIT
				) {
					await new Promise((resolve) =>
						setTimeout(resolve, LOAD_CHECK_INTERVAL)
					)
					currentMessageCount =
						copyableArea?.querySelectorAll('div[role="row"]').length ?? 0

					// If we see new messages, give them a bit more time to fully load
					if (currentMessageCount > previousMessageCount) {
						console.log(
							`New messages detected: ${
								currentMessageCount - previousMessageCount
							} new messages`
						)
						await new Promise((resolve) => setTimeout(resolve, 1600)) // Additional 1600ms for rendering
						break
					}
				}

				return currentMessageCount
			}

			let newMessages = extractVisibleMessages()
			messages.push(...newMessages)

			// Scroll up and extract more messages until we have enough or can't scroll further
			// let scrollAttempts = 0
			let consecutiveEmptyScrolls = 0

			while (
				messages.length < MAX_MESSAGES &&
				// scrollAttempts < MAX_SCROLL_ATTEMPTS &&
				consecutiveEmptyScrolls < 2
			) {
				// Get current message count before scrolling
				const previousMessageCount =
					copyableArea.querySelectorAll('div[role="row"]').length

				const { scrolled, scrollAmount } = scrollUp()
				if (!scrolled || scrollAmount < 10) {
					break
				}

				// Wait for the initial delay after scrolling
				await new Promise((resolve) => setTimeout(resolve, SCROLL_DELAY))
				await waitForMessagesToLoad(previousMessageCount)

				newMessages = extractVisibleMessages()

				if (newMessages.length > 0) {
					messages.push(...newMessages)
					consecutiveEmptyScrolls = 0
				} else {
					consecutiveEmptyScrolls++
				}

				// scrollAttempts++
			}

			if (messages.length > MAX_MESSAGES) {
				messages.splice(MAX_MESSAGES)
			}
		} catch (error) {
			console.error('Error extracting messages:', error)
		}

		return messages
	}

	function isElementVisible(element: any, tolerance = 0.5) {
		if (!element) return false

		const rect = element.getBoundingClientRect()
		const containerRect = scrollPane?.getBoundingClientRect()

		// Element is considered visible if at least 50% of its height is in the viewport
		const visibleHeight =
			Math.min(rect.bottom, containerRect?.bottom ?? 0) -
			Math.max(rect.top, containerRect?.top ?? 0)
		const visibleRatio = visibleHeight / rect.height

		return (
			visibleRatio >= tolerance &&
			rect.left >= 0 &&
			rect.right <= window.innerWidth
		)
	}

	function getVisibleContacts() {
		const visibleContacts = []

		for (const [name, data] of contactsMap.entries()) {
			if (!data.processed && data.element && isElementVisible(data.element)) {
				visibleContacts.push({
					name: name,
					data: data,
					position: data.element.getBoundingClientRect().top,
				})
			}
		}

		// Sort by position (top to bottom)
		visibleContacts.sort((a, b) => a.position - b.position)

		return visibleContacts
	}

	async function processVisibleContact() {
		const visibleContacts = getVisibleContacts()

		if (visibleContacts.length === 0) {
			return false
		}

		// Process the topmost visible contact
		const { name: contactName, data: contactToProcess } = visibleContacts[0]

		// Get the clickable div with tabindex="-1"
		const clickTarget =
			contactToProcess.clickableDiv || contactToProcess.element

		if (!clickTarget) {
			console.error(`No clickable element found for contact: ${contactName}`)
			contactToProcess.processed = true
			return true
		}

		const clickSuccess = simulateRealClick(clickTarget)

		if (!clickSuccess) {
			console.error(`Failed to click on contact: ${contactName}`)
			contactToProcess.processed = true
			return true
		}

		// Wait for chat to load
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const messages = await extractMessages()
		contactToProcess.messages = messages
		contactToProcess.processed = true

		console.log(`Processed ${contactName}: ${messages.length} messages`)

		// Wait a bit before processing the next contact
		await new Promise((resolve) => setTimeout(resolve, 500))

		return true
	}

	async function performScroll() {
		const previousScrollTop = scrollPane?.scrollTop

		// Scroll by exactly 4 contact heights (4 × 72px = 288px)
		const scrollAmount = 4 * CONTACT_HEIGHT

		scrollPane?.scrollBy({
			top: scrollAmount,
			behavior: 'auto', // Use 'auto' instead of 'smooth' for immediate scrolling
		})

		// Wait for the scroll to complete
		await new Promise((resolve) => setTimeout(resolve, 100))

		return scrollPane?.scrollTop !== previousScrollTop
	}

	async function scanContacts() {
		let scanning = true
		let noNewContactsCount = 0
		let noScrollCount = 0

		while (scanning) {
			const { newContactsFound } = extractContacts()

			if (newContactsFound > 0) {
				noNewContactsCount = 0
			}

			let contactsProcessedInThisBatch = 0
			let shouldScroll = false

			// Process up to 4 contacts before scrolling
			while (contactsProcessedInThisBatch < 4 && !shouldScroll) {
				const processedContact = await processVisibleContact()

				if (processedContact) {
					contactsProcessedInThisBatch++
				} else {
					// No more visible contacts to process, need to scroll
					shouldScroll = true
				}
			}

			const scrolled = await performScroll()

			// Wait longer for content to load after scrolling
			await new Promise((resolve) => setTimeout(resolve, 1600))

			// Re-extract contacts after scrolling to update positions
			extractContacts()

			// Check if we've reached the bottom
			if (!scrolled) {
				noScrollCount++

				if (noScrollCount > 3) {
					scanning = false // Stop scanning if we can't scroll further
					console.log('Reached the end of the contact list')
				}
			} else {
				noScrollCount = 0
			}

			if (getVisibleContacts().length === 0) {
				noNewContactsCount++

				if (noNewContactsCount > 4) {
					// Double-check if we've processed all contacts
					const unprocessedCount = Array.from(contactsMap.values()).filter(
						(data) => !data.processed
					).length

					if (unprocessedCount === 0 || noNewContactsCount > 10) {
						scanning = false
						console.log(
							`Stopping scan. No new contacts found after multiple attempts.`
						)
					}
				}
			} else {
				noNewContactsCount = 0
			}
		}

		console.log(`Scanning complete! Total contacts found: ${contactsMap.size}`)

		const processedCount = Array.from(contactsMap.values()).filter(
			(data) => data.processed && data.messages.length > 0
		).length
		console.log(
			`Successfully processed ${processedCount} contacts with messages.`
		)

		// Convert Map to a more readable object
		const contactsObject: Record<
			string,
			{
				messageCount: number
				messages: { id: string; text: string; direction: string }[]
				processed: boolean
				lastInteraction: { text: string; date: string | null }
			}
		> = {}
		contactsMap.forEach((data, name) => {
			contactsObject[name] = {
				messageCount: data.messages.length,
				messages: data.messages,
				processed: data.processed,
				lastInteraction: data.lastInteraction,
			}
		})

		console.log('Contacts and messages:', contactsObject)

		try {
			localStorage.setItem(
				'whatsappContactsData',
				JSON.stringify(contactsObject)
			)
			console.log(
				'Data saved to localStorage. Access with: JSON.parse(localStorage.getItem("whatsappContactsData"))'
			)
		} catch (e) {
			console.error('Failed to save to localStorage:', e)
		}
	}

	scanContacts()

	// Expose the contacts map to the console for easy access
	window.whatsappContacts = contactsMap

	console.log(
		'WhatsApp contact and message scanner started. Access data with window.whatsappContacts'
	)
}

console.log('WhatsApp scanner content script loaded')

initWhatsAppScanner()
window.runWhatsAppScanner = initWhatsAppScanner
