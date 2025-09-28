// --- DOM Element Selection (Utility Module) ---
/**
 * Utility object for consistently accessing all required DOM elements.
 * This avoids repeated document.getElementById calls in the main script.
 */
export const DOM = {
    voiceButton: document.getElementById('voice-button'),
    stopSpeakingButton: document.getElementById('stop-speaking-button'),
    voiceStatus: document.getElementById('voice-status'),
    questionInput: document.getElementById('question-input'),
    askButton: document.getElementById('ask-button'),
    loading: document.getElementById('loading'),
    chatMessages: document.getElementById('chat-messages'),
};

/**
 * Updates the voice status message and color for user feedback.
 * @param {string} message - The status message to display.
 * @param {string} color - The CSS color code for the text.
 */
export function updateVoiceStatus(message, color) {
    DOM.voiceStatus.textContent = message;
    DOM.voiceStatus.style.color = color;
}

/**
 * Resets the voice button appearance to the default 'Tap to Talk' state.
 */
export function resetVoiceButton() {
    DOM.voiceButton.textContent = '🎤 Tap to Talk';
    DOM.voiceButton.style.backgroundColor = '#FF5722';
}

/**
 * Controls the visibility of the loading indicator.
 * @param {boolean} show - True to show, false to hide.
 */
export function showLoading(show) {
    DOM.loading.style.display = show ? 'block' : 'none';
}

/**
 * Disables or enables the input elements during API processing.
 * @param {boolean} disable - True to disable, false to enable.
 */
export function disableInput(disable) {
    DOM.questionInput.disabled = disable;
    DOM.askButton.disabled = disable;
    DOM.voiceButton.disabled = disable;
}

/**
 * Adds a new message to the chat display using CSS classes for styling.
 * @param {string} sender - 'You' or 'Space AI'.
 * @param {string} message - The content of the message.
 * @param {('user'|'ai'|'error')} type - The type of message for styling.
 */
export function addMessage(sender, message, type) {
    const messageDiv = document.createElement('div');
    // Determine the class based on type
    const className = (type === 'user') ? 'user-message' : (type === 'error') ? 'error-message' : 'ai-message';

    messageDiv.className = 'message ' + className;
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;

    DOM.chatMessages.appendChild(messageDiv);

    // Scroll to the bottom of the chat container
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}