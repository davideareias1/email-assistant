// Constants
const BUTTON_ID = 'ai-response-button';

// Debounce function to limit function calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Helper function to create the response div
function createResponseButton() {
    const button = document.createElement('div');
    button.id = BUTTON_ID;
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'Generate AI response');
    button.style.cssText = `
        background-color: #1a73e8;
        border: none;
        border-radius: 18px;
        color: #ffffff;
        cursor: pointer;
        font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
        font-size: 14px;
        font-weight: 500;
        height: 36px !important;
        line-height: 36px;
        margin: 0 4px;
        min-width: 96px;
        padding: 0 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: static !important;
        white-space: nowrap;
        flex-shrink: 0;
    `;

    button.innerHTML = `
        <span class="button-text" style="pointer-events: none;">AI Response</span>
        <div class="loading-spinner" style="display: none; width: 14px; height: 14px; border: 2px solid #ffffff; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite; margin-left: 6px; pointer-events: none;"></div>
    `;

    // Only add error notification styles
    if (!document.getElementById('ai-response-styles')) {
        const style = document.createElement('style');
        style.id = 'ai-response-styles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .ai-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 4px;
                background-color: #F44336;
                color: white;
                font-size: 14px;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                opacity: 0;
                transform: translateY(20px);
                animation: notificationFadeIn 0.3s forwards;
            }
            @keyframes notificationFadeIn {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    return button;
}

// Safely extract text content from an element
function safeExtractText(element) {
    if (!element) return '';

    try {
        return element.innerText.trim();
    } catch (e) {
        try {
            return element.textContent.trim();
        } catch (e) {
            return '';
        }
    }
}

// Extract email content with better error handling
function extractEmailContent() {
    // Try different selectors for email content
    const selectors = [
        // Original message in reply view
        '.h7 .ii.gt [dir="ltr"]',
        // Full email view
        '.a3s.aiL [dir="ltr"]',
        // Simple view
        '.a3s.aiL',
        // Expanded conversation view
        '.adP.adO [dir="ltr"]',
        // Last resort - any email content
        '[role="main"] .a3s.aiL'
    ];

    for (const selector of selectors) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                const content = safeExtractText(element);
                if (content) return content;
            }
        } catch (e) {
            console.error(`Error extracting from ${selector}:`, e);
        }
    }

    // Try to get any content from compose box as fallback
    const composeBox = getComposeBox();
    if (composeBox) {
        return safeExtractText(composeBox);
    }

    return null;
}

// Function to extract sender's name with better error handling
async function getSenderName() {
    try {
        const result = await chrome.storage.sync.get(['userName']);
        if (result.userName) {
            const nameParts = result.userName.split(' ');
            return {
                firstName: nameParts[0],
                lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
                fullName: result.userName
            };
        }
        return null;
    } catch (e) {
        console.error('Error getting sender name from storage:', e);
        return null;
    }
}

// Updated generateResponse: use the email content to extract recipient's name.
// We no longer rely on scraping the DOM.
// The recipient's name is assumed to be written in the signature at the end of the email.
async function generateResponse(emailContent) {
    try {
        const senderInfo = await getSenderName();

        const response = await fetch('https://email-assistant-beryl.vercel.app/api/make-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-extension-secret': 'P9qwNMcjwgLcC7U5nWDiQ87sGo9bwB2PRhS634dYR7qmomEjZP'
            },
            body: JSON.stringify({
                emailContent,
                senderInfo
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API error (${response.status}): Failed to generate response.`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error generating response:', error);
        throw error;
    }
}

// Simplified text parsing
function parseFormattedResponse(response) {
    // Remove any potential AI prefixes or instructions
    let cleanResponse = response
        .replace(/^Here is a response to the email:\s*\n+/i, '')
        .replace(/^Subject: .+\n+/i, '')
        .replace(/^Here's a draft response:?\s*\n+/i, '')
        .replace(/^Draft response:?\s*\n+/i, '');

    // Convert line breaks to <br> tags for HTML insertion
    return cleanResponse.replace(/\n/g, '<br>');
}

// Get compose box with better error handling
function getComposeBox() {
    const composeBoxSelectors = [
        'div[role="textbox"][aria-label*="Body"]',
        'div[role="textbox"][aria-label*="Message Body"]',
        'div[aria-label*="Message text"]',
        '.Am.Al.editable',
        '.Ar.Au [contenteditable="true"]'
    ];

    for (const selector of composeBoxSelectors) {
        try {
            const composeBox = document.querySelector(selector);
            if (composeBox) return composeBox;
        } catch (e) {
            console.error(`Error finding compose box with ${selector}:`, e);
        }
    }

    return null;
}

// Insert response into Gmail compose box with typewriter effect
async function insertResponse(response, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 500;
    const typeDelay = 10; // Delay between each character (milliseconds)

    try {
        const composeBox = getComposeBox();

        if (!composeBox) {
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return insertResponse(response, retryCount + 1);
            }
            throw new Error('Could not find Gmail compose box');
        }

        // Parse and format the response
        const formattedResponse = parseFormattedResponse(response);
        const characters = formattedResponse.split('');

        // Focus the compose box
        composeBox.focus();
        composeBox.innerHTML = '';

        // Type each character with a delay
        for (let i = 0; i < characters.length; i++) {
            await new Promise(resolve => setTimeout(resolve, typeDelay));

            if (characters[i] === '<' && characters.slice(i, i + 4).join('') === '<br>') {
                composeBox.innerHTML += '<br>';
                i += 3; // Skip the rest of the <br> tag
            } else {
                composeBox.innerHTML += characters[i];
            }

            // Dispatch events to ensure Gmail recognizes the changes
            composeBox.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Final dispatch of events
        composeBox.dispatchEvent(new Event('change', { bubbles: true }));

        // Verify the content was inserted
        if (!composeBox.textContent.trim()) {
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return insertResponse(response, retryCount + 1);
            }
            throw new Error('Failed to insert response');
        }
    } catch (error) {
        console.error('Error inserting response:', error);
        if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return insertResponse(response, retryCount + 1);
        }
        throw error;
    }
}

// Show notification with improved styling
function showNotification(message, isError = false) {
    // Remove any existing notifications
    document.querySelectorAll('.ai-notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `ai-notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Automatically remove after a delay
    setTimeout(() => {
        if (notification.parentNode) {
            // Add fade-out effect
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            notification.style.transition = 'opacity 0.3s, transform 0.3s';

            // Remove after animation completes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

// Main function to handle response generation
async function handleGenerateResponse(button) {
    try {
        const spinner = button.querySelector('.loading-spinner');
        const buttonText = button.querySelector('.button-text');

        // Prevent double-clicking
        if (spinner.style.display === 'block') {
            return;
        }

        // Disable button and show loading state
        button.style.pointerEvents = 'none';
        buttonText.style.display = 'none';
        spinner.style.display = 'block';

        const emailContent = extractEmailContent();
        if (!emailContent) {
            throw new Error('Could not find email content to respond to.');
        }

        const response = await generateResponse(emailContent);
        if (!response || response.trim() === '') {
            throw new Error('Generated response was empty.');
        }

        await insertResponse(response);
        // Success case - no notification
    } catch (error) {
        console.error('Generate response error:', error);
        showNotification(error.message || 'Unknown error occurred', true);
    } finally {
        // Re-enable button and restore original state
        const spinner = button.querySelector('.loading-spinner');
        const buttonText = button.querySelector('.button-text');
        spinner.style.display = 'none';
        buttonText.style.display = 'block';
        button.style.pointerEvents = 'auto';
    }
}

// Find the best place to insert the button with better error handling
function findButtonContainer() {
    const selectors = [
        '.dC',  // Primary container for send button
        '.btA .dC', // Alternative path
        '.gU.Up .dC' // Full path from your HTML
    ];

    for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container) {
            return container;
        }
    }
    return null;
}

// Check if we're in compose/reply mode with better error handling
function isInComposeMode() {
    try {
        return !!getComposeBox();
    } catch (e) {
        console.error('Error checking compose mode:', e);
        return false;
    }
}

// Add button to toolbar with improved placement
function addButtonToToolbar() {
    try {
        if (!isInComposeMode()) return;

        const existingButton = document.getElementById(BUTTON_ID);
        if (existingButton) return;

        const container = findButtonContainer();
        if (!container) {
            setTimeout(addButtonToToolbar, 500);
            return;
        }

        const button = createResponseButton();

        // Insert before the send button (which is the first child)
        const sendButton = container.firstChild;
        if (sendButton) {
            container.insertBefore(button, sendButton);
        } else {
            container.appendChild(button);
        }

        button.addEventListener('click', () => handleGenerateResponse(button));
    } catch (e) {
        console.error('Error adding button to toolbar:', e);
        setTimeout(addButtonToToolbar, 1000);
    }
}

// Debounced version of addButtonToToolbar
const debouncedAddButton = debounce(addButtonToToolbar, 200);

// Check if extension is already initialized to prevent duplicate observers
if (!window.gmailAIResponseInitialized) {
    window.gmailAIResponseInitialized = true;

    // Set up a more efficient observer with error handling
    try {
        const observer = new MutationObserver((mutations) => {
            try {
                if (mutations.some(mutation => {
                    return mutation.addedNodes.length > 0 ||
                        (mutation.type === 'attributes' &&
                            (mutation.target.getAttribute('role') === 'toolbar' ||
                                mutation.target.classList.contains('btC') ||
                                mutation.target.classList.contains('ams')));
                })) {
                    debouncedAddButton();
                }
            } catch (e) {
                console.error('Error in mutation observer callback:', e);
            }
        });

        // Start observing with specific targets
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['role', 'class'],
            characterData: false
        });

        // Initial check
        debouncedAddButton();

        // Handle navigation and dynamic content changes
        window.addEventListener('hashchange', debouncedAddButton);
        window.addEventListener('load', debouncedAddButton);

        // Check for dynamic content loading with a more efficient approach
        let lastCheck = Date.now();
        const contentCheckInterval = setInterval(() => {
            try {
                // Only check if sufficient time has passed since last check
                const now = Date.now();
                if (now - lastCheck > 500) {
                    lastCheck = now;
                    if (isInComposeMode()) {
                        debouncedAddButton();
                    }
                }
            } catch (e) {
                console.error('Error in content check interval:', e);
            }
        }, 1000);

        // Cleanup interval when navigating away
        window.addEventListener('unload', () => {
            try {
                clearInterval(contentCheckInterval);
                observer.disconnect();
            } catch (e) {
                console.error('Error during cleanup:', e);
            }
        });
    } catch (e) {
        console.error('Error during initialization:', e);
    }
}