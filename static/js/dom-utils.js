// --- DOM Element Selection (Updated for Dashboard Layout) ---
/**
 * Utility object for consistently accessing all required DOM elements in the dashboard.
 * This has been updated to work with the new single-page dashboard structure.
 */
const DOM = {
    // Chat-related elements (left panel)
    voiceButton: document.getElementById('voice-button'),
    stopSpeakingButton: document.getElementById('stop-speaking-button'),
    voiceStatus: document.getElementById('voice-status'),
    questionInput: document.getElementById('question-input'),
    askButton: document.getElementById('ask-button'),
    loading: document.getElementById('loading'),
    chatMessages: document.getElementById('chat-messages'),

    // Dashboard-specific elements (right panel)
    currentTime: document.getElementById('current-time'),
    currentDate: document.getElementById('current-date'),
    issLoading: document.getElementById('iss-loading'),
    issInfo: document.getElementById('iss-info'),
    trackIssButton: document.getElementById('track-iss-button'),
    planetDisplay: document.getElementById('planet-display'),
    orbitDisplay: document.getElementById('orbit-display')
};

/**
 * Updates the voice status message and color for user feedback.
 * @param {string} message - The status message to display.
 * @param {string} color - The CSS color code for the text.
 */
function updateVoiceStatus(message, color) {
    if (DOM.voiceStatus) {
        DOM.voiceStatus.textContent = message;
        DOM.voiceStatus.style.color = color;
    }
}

/**
 * Resets the voice button appearance to the default 'Tap to Talk' state.
 */
function resetVoiceButton() {
    if (DOM.voiceButton) {
        DOM.voiceButton.textContent = '🎤 Tap to Talk';
        DOM.voiceButton.style.backgroundColor = '#FF5722';
    }
}

/**
 * Controls the visibility of the loading indicator.
 * @param {boolean} show - True to show, false to hide.
 */
function showLoading(show) {
    if (DOM.loading) {
        DOM.loading.style.display = show ? 'block' : 'none';
    }
}

/**
 * Disables or enables the input elements during API processing.
 * @param {boolean} disable - True to disable, false to enable.
 */
function disableInput(disable) {
    if (DOM.questionInput) DOM.questionInput.disabled = disable;
    if (DOM.askButton) DOM.askButton.disabled = disable;
    if (DOM.voiceButton) DOM.voiceButton.disabled = disable;
}

/**
 * Adds a new message to the chat display using CSS classes for styling.
 * @param {string} sender - 'You' or 'Space AI'.
 * @param {string} message - The content of the message.
 * @param {('user'|'ai'|'error')} type - The type of message for styling.
 */
function addMessage(sender, message, type) {
    if (!DOM.chatMessages) {
        console.error('Chat messages container not found');
        return;
    }

    const messageDiv = document.createElement('div');
    // Determine the class based on type
    const className = (type === 'user') ? 'user-message' : (type === 'error') ? 'error-message' : 'ai-message';

    messageDiv.className = 'message ' + className;
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;

    DOM.chatMessages.appendChild(messageDiv);

    // Scroll to the bottom of the chat container
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

/**
 * Dashboard-specific utility: Updates ISS widget loading state
 * @param {boolean} isLoading - True to show loading, false to hide
 */
function updateISSLoadingState(isLoading) {
    if (DOM.issLoading) {
        DOM.issLoading.style.display = isLoading ? 'block' : 'none';
    }
    if (DOM.trackIssButton) {
        DOM.trackIssButton.disabled = isLoading;
        DOM.trackIssButton.textContent = isLoading ? 'Tracking...' : 'Track ISS';
    }
}

/**
 * Dashboard-specific utility: Checks if all required elements are present
 * This helps with debugging if elements are missing from the dashboard
 */
function validateDashboardElements() {
    const requiredElements = [
        'voice-button', 'question-input', 'ask-button',
        'chat-messages'//, 'current-time', 'iss-info'
    ];

    const missingElements = [];

    for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
            missingElements.push(elementId);
        }
    }

    if (missingElements.length > 0) {
        console.warn('Missing dashboard elements:', missingElements);
        return false;
    }

    console.log('All dashboard elements found successfully');
    return true;
}