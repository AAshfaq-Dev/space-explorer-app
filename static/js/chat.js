// --- Global State Management (Enhanced with Request Control) ---
let conversationHistory = [];
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let isRecording = false;
let chatInitialized = false;
let currentAudio = null;

// NEW: Request management variables
let currentRequestController = null;  // Stores the AbortController for the active request
let requestCounter = 0;  // Incremental counter to track request order
let latestRequestId = 0;  // ID of the most recent request sent


// --- Function: Cancel All Active Operations ---

/**
 * Cancels any ongoing API request and stops all audio playback.
 * This ensures only the latest question is processed.
 * 
 * HOW IT WORKS:
 * 1. Aborts fetch request if one is in progress
 * 2. Stops Google TTS audio playback
 * 3. Cancels browser speech synthesis
 * 4. Resets UI elements to ready state
 */
function cancelAllActiveOperations() {
    console.log('Cancelling all active operations...');

    // Cancel the ongoing fetch request (if any)
    if (currentRequestController) {
        currentRequestController.abort();
        currentRequestController = null;
        console.log('Previous API request cancelled');
    }

    // Stop any playing audio immediately
    stopSpeaking();

    // Reset UI to ready state
    showLoading(false);
    disableInput(false);
}


// --- Function: Text-to-Speech (TTS) and Audio Playback ---

/**
 * Stops all ongoing speech synthesis and audio playback.
 * Enhanced to work with the cancellation system.
 */
function stopSpeaking() {
    // Stop browser TTS
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        console.log('Browser TTS cancelled');
    }

    // Stop current Google TTS audio if it exists
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

/**
 * Uses the browser's native Speech Synthesis for basic text-to-speech fallback.
 * Enhanced with request ID tracking to prevent stale audio.
 * 
 * @param {string} textToSpeak - The text to be converted to speech.
 * @param {number} requestId - The ID of the request that generated this speech.
 */
function speakText(textToSpeak, requestId) {
    // CRITICAL CHECK: Only speak if this is still the latest request
    if (requestId !== latestRequestId) {
        console.log(`Skipping stale TTS (request ${requestId} vs latest ${latestRequestId})`);
        return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;

    if (DOM.stopSpeakingButton) {
        DOM.stopSpeakingButton.style.display = 'inline-block';
    }

    utterance.onend = () => {
        if (DOM.stopSpeakingButton) {
            DOM.stopSpeakingButton.style.display = 'none';
        }
    };

    utterance.onerror = () => {
        console.error('Browser TTS error occurred.');
        if (DOM.stopSpeakingButton) {
            DOM.stopSpeakingButton.style.display = 'none';
        }
    };

    speechSynthesis.speak(utterance);
}

/**
 * Plays a test beep to verify audio output is working.
 * Uses Web Audio API to generate a simple tone programmatically.
 */
function playTestBeep() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.5;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1);

        console.log('Test beep played successfully');

    } catch (error) {
        console.error('Failed to play test beep:', error);
        alert('Audio test failed. Check browser console for details.');
    }
}

/**
 * Plays the high-quality natural voice audio from base64 data.
 * Enhanced with request ID tracking to prevent stale audio playback.
 * 
 * @param {string} audioData - Base64 encoded audio data (e.g., MP3).
 * @param {string} responseText - The original text response for the fallback.
 * @param {number} requestId - The ID of the request that generated this audio.
 */
function playNaturalVoice(audioData, responseText, requestId) {
    // CRITICAL CHECK: Only play if this is still the latest request
    if (requestId !== latestRequestId) {
        console.log(`Skipping stale audio (request ${requestId} vs latest ${latestRequestId})`);
        return;
    }

    try {
        speechSynthesis.cancel();

        const audioBytes = atob(audioData);
        const arrayBuffer = new ArrayBuffer(audioBytes.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < audioBytes.length; i++) {
            uint8Array[i] = audioBytes.charCodeAt(i);
        }

        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        currentAudio = audio;
        audio.preload = 'auto';

        if (DOM.stopSpeakingButton) {
            DOM.stopSpeakingButton.style.display = 'inline-block';
        }

        const cleanupAndHideButton = () => {
            if (DOM.stopSpeakingButton) {
                DOM.stopSpeakingButton.style.display = 'none';
            }
            currentAudio = null;
            URL.revokeObjectURL(audioUrl);
        };

        audio.onended = cleanupAndHideButton;
        audio.onerror = (e) => {
            console.error('Natural voice playback failed. Falling back to browser TTS.', e);
            cleanupAndHideButton();
            speakText(responseText, requestId);  // Pass requestId to fallback
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn('Audio play failed (promise error).', error);
                cleanupAndHideButton();
                speakText(responseText, requestId);  // Pass requestId to fallback
            });
        }
    } catch (error) {
        console.error('Error processing or playing natural voice data:', error);
        speakText(responseText, requestId);  // Pass requestId to fallback
    }
}


// --- Function: Voice Recognition Setup and Control ---

/**
 * Toggles the voice recording state (start/stop). 
 * Enhanced to cancel previous operations before starting new recording.
 */
function toggleVoiceRecording() {
    if (!recognition) {
        alert('Voice recognition not available. Try using a different browser.');
        return;
    }

    if (isRecording) {
        recognition.stop();
        updateVoiceStatus('Stopped listening', '#9E9E9E');
    } else {
        // IMPORTANT: Cancel any ongoing operations before starting new recording
        cancelAllActiveOperations();

        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            updateVoiceStatus('Voice not available. Try reloading page.', '#f44336');
        }
    }
}

/**
 * Initializes webkitSpeechRecognition and sets up event handlers.
 */
function initSpeechRecognition() {
    const isSpeechSupported = 'webkitSpeechRecognition' in window;

    if (isSpeechSupported) {
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isRecording = true;
            updateVoiceStatus('Listening... speak now!', '#FF5722');
            if (DOM.voiceButton) {
                DOM.voiceButton.textContent = 'Tap to Stop';
                DOM.voiceButton.style.backgroundColor = '#f44336';
            }
        };

        recognition.onresult = (event) => {
            const resultList = event.results;
            const finalTranscript = resultList[0][0].transcript;

            if (DOM.questionInput) {
                DOM.questionInput.value = finalTranscript;
            }
            updateVoiceStatus('Got it: "' + finalTranscript + '"', '#4CAF50');

            // Automatically ask the question after a short delay
            setTimeout(askQuestion, 1500);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            updateVoiceStatus('Could not hear that. Try again!', '#f44336');
            resetVoiceButton();
        };

        recognition.onend = () => {
            isRecording = false;
            if (DOM.voiceButton && DOM.voiceButton.textContent === 'Tap to Stop') {
                updateVoiceStatus('Processing what you said...', '#FF9800');
            }
            resetVoiceButton();
        };

        updateVoiceStatus('Voice ready! Tap microphone to start.', '#4CAF50');
        console.log('Speech recognition initialized successfully');
    } else {
        if (DOM.voiceButton) {
            DOM.voiceButton.style.display = 'none';
        }
        updateVoiceStatus('Voice not supported in this browser. Try Chrome!', '#9E9E9E');
        console.warn('Speech recognition not supported in this browser');
    }
}


// --- Function: Chat Interaction and API Handling (Enhanced) ---

/**
 * Handles the 'Enter' key press in the input field.
 * @param {Event} event - The keypress event.
 */
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        askQuestion();
    }
}

/**
 * Main function to process the user's question, call the API, and handle the response.
 * ENHANCED with request cancellation and priority management.
 * 
 * KEY FEATURES:
 * - Cancels previous requests before starting new one
 * - Uses AbortController for fetch cancellation
 * - Tracks request IDs to ignore stale responses
 * - Stops all audio playback immediately
 */
function askQuestion() {
    if (!DOM.questionInput) {
        console.error('Question input element not found');
        return;
    }

    const questionText = DOM.questionInput.value.trim();

    if (!questionText) {
        speakText('Please ask me a question!', ++requestCounter);
        return;
    }

    // --- STEP 1: Cancel all previous operations ---
    // This is the critical fix - immediately stop everything from previous requests
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

    // --- STEP 4: API Call Setup ---
    const apiEndpoint = '/api/ask-with-voice';
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

                // Limit context size to the last 5 exchanges
                const MAX_HISTORY_LENGTH = 5;
                if (conversationHistory.length > MAX_HISTORY_LENGTH) {
                    conversationHistory = conversationHistory.slice(conversationHistory.length - MAX_HISTORY_LENGTH);
                }
            } else {
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
                speakText(errorMessage, thisRequestId);
                console.error('Fetch Error:', error);
            }
        });
}


// --- Chat Initialization for Dashboard ---

/**
 * Initializes the chat system within the dashboard environment
 */
function initializeChatSystem() {
    if (chatInitialized) {
        console.log('Chat system already initialized');
        return;
    }

    console.log('Initializing chat system for dashboard...');

    if (!validateDashboardElements()) {
        console.error('Cannot initialize chat - missing required elements');
        setTimeout(initializeChatSystem, 1000);
        return;
    }

    initSpeechRecognition();

    if (DOM.chatMessages && DOM.chatMessages.children.length <= 1) {
        console.log('Chat system ready in dashboard mode');
    }

    chatInitialized = true;
    console.log('Chat system initialization complete');
}


// --- Event Listeners for Dashboard Integration ---

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, preparing chat system...');
    setTimeout(initializeChatSystem, 500);
});

window.addEventListener('load', () => {
    if (!chatInitialized) {
        console.log('Window loaded, initializing chat system...');
        initializeChatSystem();
    }
});