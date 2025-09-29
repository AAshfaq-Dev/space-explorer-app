// ============================================
// DOM-UTILS.JS - DOM Element Access and Updates
// ============================================
// Centralized DOM element references and utility functions
// Used by: chat.js, dashboard.js
// ============================================

/* ============================================
   TABLE OF CONTENTS
   ============================================
   1. DOM Element References
   2. Voice Status Updates
   3. UI State Management
   4. Chat Message Functions
   5. Dashboard Widget Utilities
   6. Validation Functions
   ============================================ */


// ============================================
// 1. DOM ELEMENT REFERENCES
// Single source of truth for all DOM elements
// ============================================

/**
 * Centralized DOM element access
 * Makes it easy to find and update element references
 */
const DOM = {
    // --- Chat Interface Elements ---
    voiceButton: document.getElementById('voice-button'),
    stopSpeakingButton: document.getElementById('stop-speaking-button'),
    voiceStatus: document.getElementById('voice-status'),
    questionInput: document.getElementById('question-input'),
    askButton: document.getElementById('ask-button'),
    loading: document.getElementById('loading'),
    chatMessages: document.getElementById('chat-messages'),

    // --- Dashboard Widget Elements ---
    currentTime: document.getElementById('current-time'),
    currentDate: document.getElementById('current-date'),
    issLoading: document.getElementById('iss-loading'),
    issInfo: document.getElementById('iss-info'),
    trackIssButton: document.getElementById('track-iss-button'),
    planetDisplay: document.getElementById('planet-display'),
    orbitDisplay: document.getElementById('orbit-display')
};


// ============================================
// 2. VOICE STATUS UPDATES
// Functions for updating voice recognition status
// ============================================

/**
 * Updates voice status message and applies appropriate CSS class
 * 
 * @param {string} message - Status message to display
 * @param {string} statusClass - CSS class for color (e.g., 'voice-status--ready')
 */
function updateVoiceStatus(message, statusClass) {
    if (DOM.voiceStatus) {
        DOM.voiceStatus.textContent = message;

        // Remove all status classes first
        DOM.voiceStatus.className = 'voice-status';

        // Add the new status class for color coding
        if (statusClass) {
            DOM.voiceStatus.classList.add(statusClass);
        }
    }
}

/**
 * Resets voice button to default "Tap to Talk" state
 * Called after recording stops or errors occur
 */
function resetVoiceButton() {
    if (DOM.voiceButton) {
        // Use data attribute if available, otherwise hardcoded text
        const defaultText = DOM.voiceButton.dataset.defaultText || '🎤 Tap to Talk';
        DOM.voiceButton.textContent = defaultText;
        DOM.voiceButton.style.backgroundColor = '#FF5722';
    }
}


// ============================================
// 3. UI STATE MANAGEMENT
// Control visibility and disabled states
// ============================================

/**
 * Shows or hides loading indicator
 * 
 * @param {boolean} show - True to show, false to hide
 */
function showLoading(show) {
    if (DOM.loading) {
        DOM.loading.style.display = show ? 'block' : 'none';
    }
}

/**
 * Enables or disables input elements during API processing
 * Prevents multiple simultaneous requests
 * 
 * @param {boolean} disable - True to disable, false to enable
 */
function disableInput(disable) {
    if (DOM.questionInput) DOM.questionInput.disabled = disable;
    if (DOM.askButton) DOM.askButton.disabled = disable;
    if (DOM.voiceButton) DOM.voiceButton.disabled = disable;
}


// ============================================
// 4. CHAT MESSAGE FUNCTIONS
// Add and display messages in chat container
// ============================================

/**
 * Adds a message to the chat display
 * Uses CSS classes for styling different message types
 * 
 * @param {string} sender - 'You' or 'Space AI'
 * @param {string} message - The message content
 * @param {('user'|'ai'|'error')} type - Message type for styling
 */
function addMessage(sender, message, type) {
    if (!DOM.chatMessages) {
        console.error('Chat messages container not found');
        return;
    }

    // Create message element
    const messageDiv = document.createElement('div');

    // Determine CSS class based on message type
    const className = (type === 'user') ? 'user-message'
        : (type === 'error') ? 'error-message'
            : 'ai-message';

    messageDiv.className = 'message ' + className;
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;

    // Add to chat container
    DOM.chatMessages.appendChild(messageDiv);

    // Auto-scroll to show latest message
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}


// ============================================
// 5. DASHBOARD WIDGET UTILITIES
// Helper functions for right panel widgets
// ============================================

/**
 * Updates ISS widget loading state
 * Shows/hides loading indicator and updates button
 * 
 * @param {boolean} isLoading - True when fetching data
 */
function updateISSLoadingState(isLoading) {
    if (DOM.issLoading) {
        DOM.issLoading.style.display = isLoading ? 'block' : 'none';
    }

    if (DOM.trackIssButton) {
        DOM.trackIssButton.disabled = isLoading;

        // Use data attributes if available
        const loadingText = DOM.trackIssButton.dataset.loadingText || 'Tracking...';
        const defaultText = DOM.trackIssButton.dataset.defaultText || 'Track ISS';

        DOM.trackIssButton.textContent = isLoading ? loadingText : defaultText;
    }
}


// ============================================
// 6. VALIDATION FUNCTIONS
// Check if required DOM elements exist
// ============================================

/**
 * Validates that all required dashboard elements are present
 * Useful for debugging if elements are missing
 * 
 * @returns {boolean} True if all elements found, false otherwise
 */
function validateDashboardElements() {
    // List of required element IDs
    const requiredElements = [
        'voice-button',
        'question-input',
        'ask-button',
        'chat-messages'
    ];

    const missingElements = [];

    // Check each required element
    for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
            missingElements.push(elementId);
        }
    }

    // Log results
    if (missingElements.length > 0) {
        console.warn('Missing dashboard elements:', missingElements);
        return false;
    }

    console.log('All dashboard elements found successfully');
    return true;
}