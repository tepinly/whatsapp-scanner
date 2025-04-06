// Replace the global scroll position variable with better scroll management
let scrollState = {
	lastScrollTop: 0,
	consecutiveNoChangeCount: 0,
	maxNoChangeAttempts: 5,
	scrollStep: 400,
	isComplete: false,
}
const uniqueContacts = new Set()
let lastLoggedCount = 0 // Track when we last logged contacts
let currentChunkContacts = [] // Store contacts in the current chunk
let isProcessingChunk = false // Flag to track if we're currently processing a chunk
let processedContactKeys = new Set() // Track which contacts we've already processed

function startScan() {
	console.log('WhatsApp Timestamp Logger is running!')

	// Get the pane-side element (scrollable container)
	const chatListContainer = document.getElementById('pane-side')
	if (chatListContainer) {
		const chatList = chatListContainer.querySelector('[aria-label="Chat list"]') // Find the actual contact list inside the container

		if (chatList) {
			// Initially scan the contact list and process the first chunk
			processNextChunk(chatListContainer, chatList)
		} else {
			console.error('Chat list not found.')
		}
	}
}

function scanContacts(chatList) {
	const contacts = chatList.querySelectorAll('div[role="listitem"]')
	currentChunkContacts = [] // Clear the current chunk

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

		// Find the most clickable element - the div with tabindex="-1"
		let clickTarget = contact.querySelector('div[tabindex="-1"]')
		if (!clickTarget) {
			// Fallback to 2 divs deep approach
			try {
				const firstLevelDiv = contact.querySelector(':scope > div')
				if (firstLevelDiv) {
					const secondLevelDiv = firstLevelDiv.querySelector(':scope > div')
					if (secondLevelDiv) {
						clickTarget = secondLevelDiv
					}
				}
			} catch (e) {
				console.error(`Error finding click target for ${name}:`, e)
			}

			// If still no target, use the main contact element
			if (!clickTarget) {
				clickTarget = contact
			}
		}

		// Create a contact object
		const contactInfo = {
			name,
			timestamp,
			element: contact, // Store the main contact element
			clickTarget: clickTarget, // Store the specific element to click
		}

		// Create a unique key for this contact
		const contactKey = JSON.stringify({ name, timestamp })

		// Only add if this is a new contact AND we haven't processed it yet
		if (!uniqueContacts.has(contactKey)) {
			uniqueContacts.add(contactKey)
			currentChunkContacts.push(contactInfo) // Add to our current chunk
			console.log(`Found ${uniqueContacts.size} unique contacts so far`)

			// Check if we need to log a batch of contacts
			checkAndLogBatch()
		} else if (!processedContactKeys.has(contactKey)) {
			// This is a contact we've seen before but haven't processed yet
			currentChunkContacts.push(contactInfo)
			console.log(`Adding previously seen but unprocessed contact: ${name}`)
		}
	})

	console.log(`Scanned chunk with ${currentChunkContacts.length} new contacts`)
	return currentChunkContacts.length > 0
}

// Helper function to restore scroll position and continue processing
function restoreScrollAndContinue(chatListContainer, currentIndex) {
	// Restore the saved scroll position
	chatListContainer.scrollTo({
		top: scrollState.lastScrollTop,
		behavior: 'auto',
	})

	console.log(`Restored scroll position to: ${scrollState.lastScrollTop}`)

	// Give time for the scroll to take effect
	setTimeout(() => {
		// Get the chat list again to ensure we have a reference
		const chatList = chatListContainer.querySelector('[aria-label="Chat list"]')
		if (!chatList) {
			console.error('Chat list not found when trying to continue processing')
			return
		}

		// Process the next contact in the chunk
		processChunkContacts(currentIndex + 1, chatListContainer, chatList)
	}, 500)
}

// Fix the processChunkContacts function to properly handle the end of a chunk
function processChunkContacts(index, chatListContainer, chatList) {
	// Check if we've processed all contacts in this chunk
	if (index >= currentChunkContacts.length) {
		console.log('Finished processing current chunk of contacts')

		// Clear the current chunk to prevent reprocessing
		currentChunkContacts = []

		// Reset processing flag
		isProcessingChunk = false

		// Move to the next chunk by scrolling
		console.log('Moving to next chunk of contacts...')
		setTimeout(() => {
			scrollToNextChunk(chatListContainer, chatList)
		}, 1000)
		return
	}

	const contact = currentChunkContacts[index]
	console.log(
		`Attempting to click on contact ${index + 1}/${
			currentChunkContacts.length
		}: ${contact.name}`
	)

	// Create a unique key for this contact
	const contactKey = JSON.stringify({
		name: contact.name,
		timestamp: contact.timestamp,
	})

	// Mark this contact as processed
	processedContactKeys.add(contactKey)

	// Ensure the contact is visible
	try {
		// Scroll the contact into view smoothly
		contact.element.scrollIntoView({ behavior: 'auto', block: 'center' })

		// Wait a moment for scrolling to complete
		setTimeout(() => {
			try {
				// Find the best clickable element
				const clickableElement =
					contact.element.querySelector('div[tabindex="-1"]') ||
					contact.clickTarget ||
					contact.element

				console.log('Clicking on element:', clickableElement)

				// Use our realistic click simulation
				simulateRealClick(clickableElement)

				// Wait to verify if the chat opened and collect messages
				setTimeout(() => {
					// Check if the chat panel is visible
					const chatPanel = document.querySelector(
						'[data-testid="conversation-panel-wrapper"]'
					)
					const backButton = document.querySelector('[data-icon="back"]')

					if (chatPanel || backButton) {
						console.log('Chat opened successfully for:', contact.name)

						// Collect messages
						collectMessages(5)
							.then((messages) => {
								// Process messages and update contact
								if (messages && messages.length > 0) {
									console.log(
										`Collected ${messages.length} messages for ${contact.name}`
									)

									// Remove the old contact entry from uniqueContacts
									uniqueContacts.delete(contactKey)

									// Create an updated contact object with messages
									const updatedContact = {
										name: contact.name,
										timestamp: contact.timestamp,
										messages: messages,
									}

									// Add the updated contact to uniqueContacts
									uniqueContacts.add(JSON.stringify(updatedContact))
								} else {
									console.log('No messages found for contact:', contact.name)
								}

								// Return to contact list
								goBackToContactList(
									chatListContainer,
									index,
									backButton,
									chatList
								)
							})
							.catch((error) => {
								console.error('Error collecting messages:', error)
								goBackToContactList(
									chatListContainer,
									index,
									backButton,
									chatList
								)
							})
					} else {
						console.log('Failed to open chat for:', contact.name)
						// Move to the next contact anyway
						restoreScrollAndContinue(chatListContainer, index, chatList)
					}
				}, 2000)
			} catch (e) {
				console.error(`Error clicking contact ${contact.name}:`, e)
				restoreScrollAndContinue(chatListContainer, index, chatList)
			}
		}, 1000)
	} catch (e) {
		console.error(`Error scrolling to contact ${contact.name}:`, e)
		restoreScrollAndContinue(chatListContainer, index, chatList)
	}
}

// Fix the goBackToContactList function to properly pass all parameters
function goBackToContactList(
	chatListContainer,
	currentIndex,
	backButton,
	chatList
) {
	if (backButton) {
		simulateRealClick(backButton)
	} else {
		// Alternative: press Escape key
		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Escape',
				code: 'Escape',
				keyCode: 27,
				which: 27,
				bubbles: true,
			})
		)
	}

	// Wait for the contact list to reappear
	setTimeout(() => {
		restoreScrollAndContinue(chatListContainer, currentIndex, chatList)
	}, 1500)
}

function scrollToNextChunk(chatListContainer, chatList) {
	// Don't continue if we've already completed scanning
	if (scrollState.isComplete) {
		console.log('Scanning is already complete')
		return
	}

	const scrollHeight = chatListContainer.scrollHeight
	const currentScroll = chatListContainer.scrollTop
	const clientHeight = chatListContainer.clientHeight

	// Check if we've reached the bottom
	if (currentScroll + clientHeight >= scrollHeight - 20) {
		console.log('Reached the bottom of the chat list!')
		console.log(`Total unique contacts found: ${uniqueContacts.size}`)

		// Log the final batch if needed
		if (uniqueContacts.size > lastLoggedCount) {
			const contactArray = getUniqueContacts()
			console.log(
				`===== FINAL BATCH: ${lastLoggedCount + 1} to ${
					uniqueContacts.size
				} =====`
			)
			console.log(contactArray.slice(lastLoggedCount))
		}

		// Log all contacts at the end
		console.log('===== ALL UNIQUE CONTACTS =====')
		console.log(getUniqueContacts())

		scrollState.isComplete = true
		return
	}

	// Check if scroll position hasn't changed
	if (Math.abs(currentScroll - scrollState.lastScrollTop) < 10) {
		scrollState.consecutiveNoChangeCount++
		console.log(
			`Scroll appears stuck (attempt ${scrollState.consecutiveNoChangeCount}/${scrollState.maxNoChangeAttempts})`
		)

		if (
			scrollState.consecutiveNoChangeCount >= scrollState.maxNoChangeAttempts
		) {
			console.log('Scroll is definitely stuck, trying a larger jump...')
			// Try a much larger scroll jump to break out of the stuck state
			const newScrollPosition = currentScroll + 1000
			chatListContainer.scrollTo({
				top: newScrollPosition,
				behavior: 'auto',
			})
			scrollState.consecutiveNoChangeCount = 0
			scrollState.scrollStep += 200 // Increase the default step size for future scrolls
		} else {
			// Try a progressively larger scroll step
			const scrollStep =
				scrollState.scrollStep + scrollState.consecutiveNoChangeCount * 200
			chatListContainer.scrollTo({
				top: currentScroll + scrollStep,
				behavior: 'auto',
			})
		}
	} else {
		// Scroll position changed, reset the counter
		scrollState.consecutiveNoChangeCount = 0

		// Use the standard scroll step
		chatListContainer.scrollTo({
			top: currentScroll + scrollState.scrollStep,
			behavior: 'auto',
		})
	}

	// Update the last scroll position
	scrollState.lastScrollTop = chatListContainer.scrollTop

	console.log(
		`Scrolled to position ${chatListContainer.scrollTop}/${scrollHeight}`
	)

	// Wait for content to load - use a longer timeout if we were stuck
	const waitTime = scrollState.consecutiveNoChangeCount > 0 ? 5000 : 2500
	setTimeout(() => {
		// Process the next chunk
		processNextChunk(chatListContainer, chatList)
	}, waitTime)
}

function processNextChunk(chatListContainer, chatList) {
	// Check if we're already processing a chunk
	if (isProcessingChunk) {
		console.log('Already processing a chunk, skipping...')
		return
	}

	// First, scan the current visible contacts
	const hasNewContacts = scanContacts(chatList)

	// If we found new contacts, process them before scrolling
	if (hasNewContacts) {
		console.log(
			`Processing chunk of ${currentChunkContacts.length} contacts...`
		)
		isProcessingChunk = true
		// Save current scroll position before processing
		scrollState.lastScrollTop = chatListContainer.scrollTop
		processChunkContacts(0, chatListContainer, chatList)
	} else {
		// No new contacts in this chunk, scroll to the next chunk
		scrollToNextChunk(chatListContainer, chatList)
	}
}

// Function to collect messages from the copyable-area with scrolling
function collectMessages(maxMessages = 100, maxScrollAttempts = 30) {
	console.log(`Starting message collection (limit: ${maxMessages})`)

	return new Promise((resolve, reject) => {
		try {
			// Find the copyable-area
			const copyableArea = document.querySelector('.copyable-area')
			if (!copyableArea) {
				console.log('Copyable area not found')
				return resolve([])
			}

			// Navigate through the divs as specified
			const divs = copyableArea.querySelectorAll(':scope > div')
			if (divs.length < 2) {
				console.log('Not enough divs in copyable area')
				return resolve([])
			}

			const secondDiv = divs[1] // Get the 2nd div (index 1)

			// This is the scrollable container for messages
			const messageContainer = secondDiv

			// Get the initial set of messages
			let allMessages = []
			let previousHeight = 0
			let scrollAttempts = 0
			let noNewMessagesCount = 0

			// Function to collect messages from current view
			function collectVisibleMessages() {
				const secondDivChildren = secondDiv.querySelectorAll(':scope > div')
				if (secondDivChildren.length < 3) {
					console.log('Not enough child divs in second div')
					return []
				}

				const thirdDiv = secondDivChildren[2] // Get the 3rd div (index 2)

				// Get all message elements
				const messageElements = thirdDiv.querySelectorAll(':scope > div')

				// Extract message data
				const messages = []
				messageElements.forEach((msgElement, index) => {
					try {
						// Skip elements with class "focusable-list-item"
						if (msgElement.classList.contains('focusable-list-item')) {
							return // Skip this element
						}

						// Extract message text using the getMessageText function
						const messageText = getMessageText(msgElement)

						// Get message direction using the getMessageDirection function
						const direction = getMessageDirection(msgElement)

						// Try to extract timestamp
						let timestamp = ''
						const timestampElement = msgElement.querySelector(
							'[data-pre-plain-text]'
						)
						if (timestampElement) {
							const preText =
								timestampElement.getAttribute('data-pre-plain-text') || ''
							// Extract timestamp from format like "[12:34, 1/1/2023]"
							const match = preText.match(/\[(.*?)\]/)
							if (match && match[1]) {
								timestamp = match[1]
							}
						}

						// Only add messages with actual content
						if (messageText) {
							// Create a unique ID for the message to avoid duplicates
							const messageId = `${direction}-${timestamp}-${messageText.substring(
								0,
								20
							)}`

							messages.push({
								id: messageId,
								index,
								text: messageText,
								direction: direction,
								timestamp: timestamp,
							})
						}
					} catch (e) {
						console.error('Error processing message element:', e)
					}
				})

				return messages
			}

			// Function to scroll up and collect more messages
			function scrollAndCollect() {
				// Get current messages before scrolling
				const currentSize = allMessages.length

				// Check if we've already reached the message limit
				if (currentSize >= maxMessages) {
					console.log(
						`Already reached message limit (${maxMessages}), stopping collection`
					)
					return true // We're done
				}

				const newMessages = collectVisibleMessages()

				// Add new messages to our collection, avoiding duplicates
				const existingIds = new Set(allMessages.map((m) => m.id))
				let newMessageCount = 0

				// Only add messages up to the maximum limit
				for (const msg of newMessages) {
					if (!existingIds.has(msg.id) && allMessages.length < maxMessages) {
						allMessages.push(msg)
						existingIds.add(msg.id)
						newMessageCount++

						// If we've reached the limit, stop adding messages
						if (allMessages.length >= maxMessages) {
							console.log(
								`Reached message limit of ${maxMessages}, stopping collection`
							)
							break
						}
					}
				}

				console.log(
					`Collected ${newMessageCount} new messages, total: ${allMessages.length}/${maxMessages}`
				)

				// Check if we found any new messages
				if (newMessageCount === 0) {
					noNewMessagesCount++
				} else {
					noNewMessagesCount = 0 // Reset counter if we found new messages
				}

				// Check if we've reached our target or should stop
				if (
					allMessages.length >= maxMessages ||
					scrollAttempts >= maxScrollAttempts ||
					noNewMessagesCount >= 3
				) {
					// Stop if we get no new messages 3 times in a row
					console.log(
						`Stopping message collection: ${allMessages.length}/${maxMessages} messages collected`
					)
					return true // We're done
				}

				// Remember current scroll height
				previousHeight = messageContainer.scrollHeight

				// Scroll up - try a more aggressive scroll
				messageContainer.scrollTop = 0

				// Increment scroll attempts
				scrollAttempts++

				// Check if we've reached the top (no more messages)
				if (
					messageContainer.scrollTop === 0 &&
					Math.abs(previousHeight - messageContainer.scrollHeight) < 20
				) {
					console.log('Reached the top of conversation history')
					return true // We're done
				}

				return false // Continue scrolling
			}

			// Function to recursively scroll and collect messages
			function scrollAndCollectRecursive() {
				const isDone = scrollAndCollect()

				if (isDone) {
					// Ensure we don't exceed the message limit
					if (allMessages.length > maxMessages) {
						console.log(
							`Trimming messages from ${allMessages.length} to ${maxMessages}`
						)
						allMessages = allMessages.slice(0, maxMessages)
					}

					// Sort messages by timestamp if available
					allMessages.sort((a, b) => {
						if (a.timestamp && b.timestamp) {
							return new Date(a.timestamp) - new Date(b.timestamp)
						}
						return a.index - b.index
					})

					console.log(
						`Finished collecting ${allMessages.length}/${maxMessages} messages`
					)
					resolve(allMessages)
				} else {
					// Wait for content to load after scrolling, then continue
					setTimeout(scrollAndCollectRecursive, 1000)
				}
			}

			// Start the recursive collection process
			scrollAndCollectRecursive()
		} catch (e) {
			console.error('Error collecting messages:', e)
			resolve([])
		}
	})
}

function checkAndLogBatch() {
	// If we've found 50 more contacts since last log, log them
	if (uniqueContacts.size >= lastLoggedCount + 50) {
		const contactArray = getUniqueContacts()
		console.log(
			`===== BATCH LOG: ${lastLoggedCount + 1} to ${uniqueContacts.size} =====`
		)
		console.log(contactArray.slice(lastLoggedCount))

		// Update the last logged count
		lastLoggedCount = uniqueContacts.size
	}
}

function getUniqueContacts() {
	return Array.from(uniqueContacts).map((contactString) => {
		const contact = JSON.parse(contactString)
		return contact
	})
}

// Alternative approach - add this function and call it instead of the click methods
function simulateRealClick(element) {
	const rect = element.getBoundingClientRect()
	const centerX = rect.left + rect.width / 2
	const centerY = rect.top + rect.height / 2

	// Create and dispatch a real-looking click event sequence
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
		}),
		new MouseEvent('mouseup', {
			bubbles: true,
			cancelable: true,
			view: window,
			clientX: centerX,
			clientY: centerY,
		}),
		new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			view: window,
			clientX: centerX,
			clientY: centerY,
		}),
	]

	events.forEach((event) => {
		document.elementFromPoint(centerX, centerY).dispatchEvent(event)
	})
}

// Function to get message direction
function getMessageDirection(messageElement) {
	// Check for message-out class (outgoing message)
	if (
		messageElement.classList.contains('message-out') ||
		messageElement.querySelector('.message-out')
	) {
		return 'outgoing'
	}

	// Check for message-in class (incoming message)
	if (
		messageElement.classList.contains('message-in') ||
		messageElement.querySelector('.message-in')
	) {
		return 'incoming'
	}

	// Alternative check using data attributes
	const dataId = messageElement
		.querySelector('[data-id]')
		?.getAttribute('data-id')
	if (dataId && dataId.includes('_out')) {
		return 'outgoing'
	}
	if (dataId && dataId.includes('_in')) {
		return 'incoming'
	}

	// If no direction is found
	return 'unknown'
}

// Function to extract message text
function getMessageText(messageElement) {
	// Skip if this is a focusable-list-item
	if (messageElement.classList.contains('focusable-list-item')) {
		return '' // Skip this element
	}

	// First try to get any copyable text content
	const copyableText = messageElement.querySelector(
		'.selectable-text.copyable-text'
	)
	if (copyableText) {
		return copyableText.textContent.trim()
	}

	// If no copyable text, try to get any visible text content
	const allTextElements = messageElement.querySelectorAll('[dir="auto"]')
	const textContents = Array.from(allTextElements)
		.map((el) => el.textContent.trim())
		.filter((text) => text.length > 0)

	return textContents.join(' ')
}
