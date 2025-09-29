// ============================================
// CHAT.JS - AI Chat Interface Logic
// ============================================
// Handles voice recognition, chat messages,
// and API communication with Gemini AI
// 
// Features:
// - Voice input via Web Speech API
// - Text-to-speech output (browser + Google TTS)
// - Request cancellation (prevents stale responses)
// - Conversation history management
// ============================================

/* ============================================
   TABLE OF CONTENTS
   ============================================
   1. Configuration Constants
   2. Global State Variables
   3. Request Cancellation System
   4. Audio Playback Functions
      4.1 Stop All Audio
      4.2 Browser Text-to-Speech
      4.3 Google Natural Voice
      4.4 Test Audio
   5. Voice Recognition Functions
      5.1 Initialize Speech Recognition
      5.2 Toggle Recording
   6. Chat Interaction Functions
      6.1 Handle Key Press
      6.2 Ask Question (Main Logic)
   7. Initialization Functions
   8. Event Listeners
   ============================================ */


// ============================================
// 1. CONFIGURATION CONSTANTS
// Centralized settings - change once, affect everywhere
// ============================================

const CHAT_CONFIG = {
    // Timing settings (milliseconds)
    timing: {
        autoAskDelay: 1500,         // Wait before auto-asking after voice input
        testBeepDuration: 1000      // Test beep length
    },

    // Voice recognition settings
    voice: {
        language: 'en-US',
        maxAlternatives: 1,
        continuous: false,           // Stop after one phrase
        interimResults: false        // Only final results
    },

    // Speech synthesis settings (kid-friendly)
    speech: {
        rate: 0.9,                   // Slightly slower for clarity
        pitch: 1.1,                  // Slightly higher/friendlier
        volume: 0.8                  // Comfortable volume
    },

    // Test beep settings (Web Audio API)
    testBeep: {
        frequency: 440,              // A4 note (Hz)
        type: 'sine',                // Sine wave
        gain: 0.5                    // Volume
    },

    // API endpoints
    api: {
        askWithVoice: '/api/ask-with-voice',
        ask: '/api/ask'
    },

    // Conversation management
    conversation: {
        maxHistoryLength: 5,         // Keep last 5 exchanges for context
        maxQuestionLength: 500,      // Character limit per question
        minQuestionLength: 1         // Minimum characters to process
    }
};

// Status messages (reusable text)
const STATUS_MESSAGES = {
    ready: 'Voice ready! Tap microphone to start.',
    listening: 'Listening... speak now!',
    processing: 'Processing what you said...',
    stopped: 'Stopped listening',
    error: 'Could not hear that. Try again!',
    noSupport: 'Voice not supported in this browser. Try Chrome!',
    thinking: (question) => `Thinking about: "${question}"`,
    readyAfterResponse: 'Ready! Ask me anything about space.'
};


// ============================================
// 2. GLOBAL STATE VARIABLES
// Application state - modified during runtime
// ============================================

// Conversation tracking
let conversationHistory = [];

// Voice recognition
let recognition = null;
let isRecording = false;

// Audio playback
let speechSynthesis = window.speechSynthesis;
let currentAudio = null;

// Request management (prevents race conditions)
let currentRequestController = null;  // AbortController for active request
let requestCounter = 0;               // Incremental request ID
let latestRequestId = 0;              // Most recent request ID

// Initialization tracking
let chatInitialized = false;


// ============================================
// 3. REQUEST CANCELLATION SYSTEM
// Prevents stale responses from old requests
// ============================================

/**
 * Cancels all ongoing operations (API calls, audio playback)
 * Call this before starting a new question to prevent overlapping responses
 * 
 * How it works:
 * 1. Aborts active fetch request via AbortController
 * 2. Stops all audio playback (TTS and natural voice)
 * 3. Resets UI to ready state
 */
function cancelAllActiveOperations() {
    console.log('Cancelling all active operations...');

    // Cancel ongoing fetch request if one exists
    if (currentRequestController) {
        currentRequestController.abort();
        currentRequestController = null;
        console.log('Previous API request cancelled');
    }

    // Stop all audio playback
    stopSpeaking();

    // Reset UI to ready state
    showLoading(false);
    disableInput(false);
}


// ============================================
// 4. AUDIO PLAYBACK FUNCTIONS
// Functions for playing responses via voice
// ============================================

// --- 4.1 Stop All Audio ---

/**
 * Stops all ongoing speech synthesis and audio playback
 * Works with both browser TTS and Google TTS audio
 */
function stopSpeaking() {
    // Stop browser TTS
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        console.log('Browser TTS cancelled');
    }

    // Stop Google TTS audio if it exists
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;  // Reset to beginning
        currentAudio = null;
        console.log('Google TTS audio stopped');
    }

    // Hide stop button
    if (DOM.stopSpeakingButton) {
        DOM.stopSpeakingButton.style.display = 'none';
    }
}


// --- 4.2 Browser Text-to-Speech (Fallback) ---

/**
 * Converts text to speech using browser's built-in TTS
 * Used as fallback when Google TTS is unavailable or fails
 * 
 * @param {string} textToSpeak - Text to convert to speech
 * @param {number} requestId - Request tracking ID (prevents stale audio)
 */
function speakText(textToSpeak, requestId) {
    // CRITICAL: Only speak if this is still the latest request
    if (requestId !== latestRequestId) {
        console.log(`Skipping stale TTS (request ${requestId} vs latest ${latestRequestId})`);
        return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Create speech utterance with kid-friendly settings
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = CHAT_CONFIG.speech.rate;
    utterance.pitch = CHAT_CONFIG.speech.pitch;
    utterance.volume = CHAT_CONFIG.speech.volume;

    // Show stop button while speaking
    if (DOM.stopSpeakingButton) {
        DOM.stopSpeakingButton.style.display = 'inline-block';
    }

    // Hide stop button when finished
    utterance.onend = () => {
        if (DOM.stopSpeakingButton) {
            DOM.stopSpeakingButton.style.display = 'none';
        }
    };

    // Handle errors
    utterance.onerror = () => {
        console.error('Browser TTS error occurred.');
        if (DOM.stopSpeakingButton) {
            DOM.stopSpeakingButton.style.display = 'none';
        }
    };

    speechSynthesis.speak(utterance);
}


// --- 4.3 Google Natural Voice (High Quality) ---

/**
 * Plays high-quality natural voice audio from Google TTS
 * This is the preferred audio method (sounds more natural than browser TTS)
 * 
 * @param {string} audioData - Base64 encoded audio data (MP3 format)
 * @param {string} responseText - Original text response (for fallback)
 * @param {number} requestId - Request tracking ID (prevents stale audio)
 */
function playNaturalVoice(audioData, responseText, requestId) {
    // CRITICAL: Only play if this is still the latest request
    if (requestId !== latestRequestId) {
        console.log(`Skipping stale audio (request ${requestId} vs latest ${latestRequestId})`);
        return;
    }

    try {
        // Stop any existing speech
        speechSynthesis.cancel();

        // Decode base64 audio data
        const audioBytes = atob(audioData);
        const arrayBuffer = new ArrayBuffer(audioBytes.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to byte array
        for (let i = 0; i < audioBytes.length; i++) {
            uint8Array[i] = audioBytes.charCodeAt(i);
        }

        // Create audio blob and URL
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create audio element
        const audio = new Audio(audioUrl);
        currentAudio = audio;
        audio.preload = 'auto';

        // Show stop button while playing
        if (DOM.stopSpeakingButton) {
            DOM.stopSpeakingButton.style.display = 'inline-block';
        }

        // Cleanup function (runs on end or error)
        const cleanupAndHideButton = () => {
            if (DOM.stopSpeakingButton) {
                DOM.stopSpeakingButton.style.display = 'none';
            }
            currentAudio = null;
            URL.revokeObjectURL(audioUrl);  // Free memory
        };

        // Event handlers
        audio.onended = cleanupAndHideButton;

        audio.onerror = (e) => {
            console.error('Natural voice playback failed. Falling back to browser TTS.', e);
            cleanupAndHideButton();
            speakText(responseText, requestId);  // Fallback to browser TTS
        };

        // Play audio (with promise handling)
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn('Audio play failed (promise error).', error);
                cleanupAndHideButton();
                speakText(responseText, requestId);  // Fallback to browser TTS
            });
        }

    } catch (error) {
        console.error('Error processing or playing natural voice data:', error);
        speakText(responseText, requestId);  // Fallback to browser TTS
    }
}


// --- 4.4 Test Audio (Debugging Tool) ---

/**
 * Plays a test beep to verify audio output is working
 * Uses Web Audio API to generate a simple tone programmatically
 * Useful for debugging when audio seems to not work
 */
function playTestBeep() {
    try {
        // Create audio context (cross-browser)
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();

        // Create oscillator (tone generator) and gain node (volume control)
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Connect nodes: oscillator → gain → speakers
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure tone
        oscillator.frequency.value = CHAT_CONFIG.testBeep.frequency;
        oscillator.type = CHAT_CONFIG.testBeep.type;
        gainNode.gain.value = CHAT_CONFIG.testBeep.gain;

        // Play beep for configured duration
        oscillator.start();
        oscillator.stop(audioContext.currentTime + CHAT_CONFIG.testBeep.duration / 1000);

        console.log('Test beep played successfully');

    } catch (error) {
        console.error('Failed to play test beep:', error);
        alert('Audio test failed. Check browser console for details.');
    }
}


// ============================================
// 5. VOICE RECOGNITION FUNCTIONS
// Web Speech API integration
// ============================================

// --- 5.1 Initialize Speech Recognition ---

/**
 * Initializes webkitSpeechRecognition and sets up event handlers
 * Checks browser support and configures recognition settings
 */
function initSpeechRecognition() {
    const isSpeechSupported = 'webkitSpeechRecognition' in window;

    if (isSpeechSupported) {
        // Create recognition instance
        recognition = new webkitSpeechRecognition();

        // Configure recognition settings
        recognition.lang = CHAT_CONFIG.voice.language;
        recognition.continuous = CHAT_CONFIG.voice.continuous;
        recognition.interimResults = CHAT_CONFIG.voice.interimResults;
        recognition.maxAlternatives = CHAT_CONFIG.voice.maxAlternatives;

        // Event: Recording started
        recognition.onstart = () => {
            isRecording = true;
            updateVoiceStatus(STATUS_MESSAGES.listening, 'voice-status--listening');

            if (DOM.voiceButton) {
                const recordingText = DOM.voiceButton.dataset.recordingText || 'Tap to Stop';
                DOM.voiceButton.textContent = recordingText;
                DOM.voiceButton.classList.add('recording');
            }
        };

        // Event: Speech recognized
        recognition.onresult = (event) => {
            const resultList = event.results;
            const finalTranscript = resultList[0][0].transcript;

            // Fill input field with recognized speech
            if (DOM.questionInput) {
                DOM.questionInput.value = finalTranscript;
            }

            updateVoiceStatus(
                `Got it: "${finalTranscript}"`,
                'voice-status--ready'
            );

            // Automatically ask the question after a short delay
            setTimeout(askQuestion, CHAT_CONFIG.timing.autoAskDelay);
        };

        // Event: Recognition error
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            updateVoiceStatus(STATUS_MESSAGES.error, 'voice-status--error');

            // Reset button state
            if (DOM.voiceButton) {
                const defaultText = DOM.voiceButton.dataset.defaultText || '🎤 Tap to Talk';
                DOM.voiceButton.textContent = defaultText;
                DOM.voiceButton.classList.remove('recording');
            }
        };

        // Event: Recognition ended
        recognition.onend = () => {
            isRecording = false;

            // Only show processing if button still says "Tap to Stop"
            if (DOM.voiceButton && DOM.voiceButton.textContent.includes('Stop')) {
                updateVoiceStatus(STATUS_MESSAGES.processing, 'voice-status--processing');
            }

            // Reset button state
            if (DOM.voiceButton) {
                const defaultText = DOM.voiceButton.dataset.defaultText || '🎤 Tap to Talk';
                DOM.voiceButton.textContent = defaultText;
                DOM.voiceButton.classList.remove('recording');
            }
        };

        updateVoiceStatus(STATUS_MESSAGES.ready, 'voice-status--ready');
        console.log('Speech recognition initialized successfully');

    } else {
        // Browser doesn't support speech recognition
        if (DOM.voiceButton) {
            DOM.voiceButton.style.display = 'none';
        }
        updateVoiceStatus(STATUS_MESSAGES.noSupport, 'voice-status--stopped');
        console.warn('Speech recognition not supported in this browser');
    }
}


// --- 5.2 Toggle Recording ---

/**
 * Toggles voice recording state (start/stop)
 * Cancels any previous operations before starting new recording
 */
function toggleVoiceRecording() {
    if (!recognition) {
        alert('Voice recognition not available. Try using a different browser.');
        return;
    }

    if (isRecording) {
        // Stop recording
        recognition.stop();
        updateVoiceStatus(STATUS_MESSAGES.stopped, 'voice-status--stopped');
    } else {
        // IMPORTANT: Cancel any ongoing operations before starting new recording
        cancelAllActiveOperations();

        // Start recording
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            updateVoiceStatus(
                'Voice not available. Try reloading page.',
                'voice-status--error'
            );
        }
    }
}


// ============================================
// 6. CHAT INTERACTION FUNCTIONS
// Handle user input and API communication
// ============================================

// --- 6.1 Handle Key Press ---

/**
 * Handles Enter key press in the input field
 * Triggers question submission
 * 
 * @param {Event} event - Keyboard event
 */
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        askQuestion();
    }
}


// --- 6.2 Ask Question (Main Chat Logic) ---

/**
 * Main function to process user's question and get AI response
 * 
 * Process flow:
 * 1. Validate question input
 * 2. Cancel any previous requests
 * 3. Create new request with tracking ID
 * 4. Send to API with abort signal
 * 5. Handle response (text + optional audio)
 * 6. Update conversation history
 * 
 * Uses request cancellation to prevent race conditions when user
 * asks multiple questions quickly
 */
function askQuestion() {
    if (!DOM.questionInput) {
        console.error('Question input element not found');
        return;
    }

    const questionText = DOM.questionInput.value.trim();

    // Validate input
    if (!questionText) {
        speakText('Please ask me a question!', ++requestCounter);
        return;
    }

    // --- STEP 1: Cancel all previous operations ---
    // This is critical - immediately stop everything from previous requests
    cancelAllActiveOperations();

    // --- STEP 2: Create new request tracking ---
    // Increment counter and store as the latest request
    requestCounter++;
    const thisRequestId = requestCounter;
    latestRequestId = thisRequestId;

    // Create new AbortController for this request
    currentRequestController = new AbortController();
    const signal = currentRequestController.signal;

    console.log(`Starting new request ${thisRequestId}, cancelling any previous requests`);

    // --- STEP 3: UI Update and Input Management ---
    addMessage('You', questionText, 'user');
    DOM.questionInput.value = '';
    showLoading(true);
    disableInput(true);
    updateVoiceStatus(STATUS_MESSAGES.thinking(questionText), 'voice-status--processing');

    // --- STEP 4: API Call Setup ---
    const apiEndpoint = CHAT_CONFIG.api.askWithVoice;
    const postBody = {
        question: questionText,
        history: conversationHistory
    };

    // --- STEP 5: Execute API Call with AbortSignal ---
    fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
        signal: signal  // CRITICAL: This allows request cancellation
    })
        .then(response => {
            // Check if this response is still relevant
            if (thisRequestId !== latestRequestId) {
                console.log(`Ignoring stale response (request ${thisRequestId})`);
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Double-check this is still the latest request before processing
            if (!data || thisRequestId !== latestRequestId) {
                console.log(`Skipping processing for stale request ${thisRequestId}`);
                return;
            }

            // --- STEP 6: Handle successful response and UI cleanup ---
            showLoading(false);
            disableInput(false);

            if (data.status === 'success') {
                const aiResponse = data.response;
                addMessage('Space AI', aiResponse, 'ai');
                updateVoiceStatus(STATUS_MESSAGES.readyAfterResponse, 'voice-status--ready');

                // Play audio if available, otherwise use browser TTS
                const hasNaturalAudio = data.audio_available && data.audio_data;

                if (hasNaturalAudio) {
                    playNaturalVoice(data.audio_data, aiResponse, thisRequestId);
                } else {
                    speakText(aiResponse, thisRequestId);
                }

                // --- STEP 7: Update Conversation History ---
                conversationHistory.push({
                    question: questionText,
                    response: aiResponse
                });

                // Limit context size to prevent token overflow
                if (conversationHistory.length > CHAT_CONFIG.conversation.maxHistoryLength) {
                    conversationHistory = conversationHistory.slice(
                        -CHAT_CONFIG.conversation.maxHistoryLength
                    );
                }

            } else {
                // API returned error status
                const errorMessage = data.message || 'Sorry, I had trouble with that question.';
                addMessage('Space AI', errorMessage, 'error');
                speakText(errorMessage, thisRequestId);
            }
        })
        .catch(error => {
            // --- STEP 8: Handle network/fetch errors ---
            // Ignore errors from aborted requests (this is expected behavior)
            if (error.name === 'AbortError') {
                console.log(`Request ${thisRequestId} was cancelled (expected behavior)`);
                return;
            }

            // Only show error if this was the latest request
            if (thisRequestId === latestRequestId) {
                showLoading(false);
                disableInput(false);
                const errorMessage = 'Oops! Something went wrong with the network. Please try again.';
                addMessage('Space AI', errorMessage, 'error');
                updateVoiceStatus(STATUS_MESSAGES.readyAfterResponse, 'voice-status--ready');
                speakText(errorMessage, thisRequestId);
                console.error('Fetch Error:', error);
            }
        });
}


// ============================================
// 7. INITIALIZATION FUNCTIONS
// Setup chat system when dashboard loads
// ============================================

/**
 * Initializes the chat system within the dashboard environment
 * Sets up voice recognition and validates required DOM elements
 */
function initializeChatSystem() {
    if (chatInitialized) {
        console.log('Chat system already initialized');
        return;
    }

    console.log('Initializing chat system for dashboard...');

    // Validate all required DOM elements exist
    if (!validateDashboardElements()) {
        console.error('Cannot initialize chat - missing required elements');
        // Retry initialization after 1 second
        setTimeout(initializeChatSystem, 1000);
        return;
    }

    // Initialize voice recognition
    initSpeechRecognition();

    // Log successful initialization
    if (DOM.chatMessages && DOM.chatMessages.children.length <= 1) {
        console.log('Chat system ready in dashboard mode');
    }

    chatInitialized = true;
    console.log('Chat system initialization complete');
}


// ============================================
// 8. EVENT LISTENERS
// Automatic initialization when page loads
// ============================================

/**
 * Initialize chat system when DOM is ready
 * Small delay ensures all elements are loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, preparing chat system...');
    setTimeout(initializeChatSystem, 500);
});

/**
 * Fallback initialization on window load
 * Catches cases where DOMContentLoaded already fired
 */
window.addEventListener('load', () => {
    if (!chatInitialized) {
        console.log('Window loaded, initializing chat system...');
        initializeChatSystem();
    }
});