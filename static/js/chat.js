// --- Global State Management (Dashboard-Compatible Chat System) ---
// These variables manage the chat application's state within the dashboard
let conversationHistory = [];
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let isRecording = false;
let chatInitialized = false;
let currentAudio = null;


// --- Function: Text-to-Speech (TTS) and Audio Playback ---

/**
 * Stops all ongoing speech synthesis and audio playback.
 * Updated for dashboard compatibility
 */
function stopSpeaking() {
    // Stop browser TTS
    speechSynthesis.cancel();

    // Stop current Google TTS audio if it exists
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    // Hide stop button
    if (DOM.stopSpeakingButton) {
        DOM.stopSpeakingButton.style.display = 'none';
    }
}

/**
 * Uses the browser's native Speech Synthesis for basic text-to-speech fallback.
 * @param {string} textToSpeak - The text to be converted to speech.
 */
function speakText(textToSpeak) {
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
 * Useful for troubleshooting speaker/audio output issues.
 */
function playTestBeep() {
    try {
        // Create audio context (works across browsers)
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();

        // Create oscillator (tone generator) and gain (volume control)
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Connect: oscillator → gain → speakers
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure the beep
        oscillator.frequency.value = 440;  // A4 note (440 Hz) - pleasant tone
        oscillator.type = 'sine';          // Sine wave = smooth, pure tone
        gainNode.gain.value = 0.5;         // 50% volume - not too loud

        // Play beep for 1 second
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1);

        console.log('Test beep played successfully');

    } catch (error) {
        console.error('Failed to play test beep:', error);
        alert('Audio test failed. Check browser console for details.');
    }
}

/**
 * Plays the high-quality natural voice audio from base64 data, with fallback to speakText.
 * Enhanced for dashboard environment with better error handling.
 * @param {string} audioData - Base64 encoded audio data (e.g., MP3).
 * @param {string} responseText - The original text response for the fallback.
 */
function playNaturalVoice(audioData, responseText) {
    try {
        speechSynthesis.cancel(); // Prioritize the natural voice

        // Explicit, clear steps for converting Base64 to a Blob
        const audioBytes = atob(audioData);
        const arrayBuffer = new ArrayBuffer(audioBytes.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < audioBytes.length; i++) {
            uint8Array[i] = audioBytes.charCodeAt(i);
        }

        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        currentAudio = audio;  // Track this audio globally
        audio.preload = 'auto';

        if (DOM.stopSpeakingButton) {
            DOM.stopSpeakingButton.style.display = 'inline-block';
        }

        const cleanupAndHideButton = () => {
            if (DOM.stopSpeakingButton) {
                DOM.stopSpeakingButton.style.display = 'none';
            }
            currentAudio = null;
            URL.revokeObjectURL(audioUrl); // Essential memory cleanup
        };

        audio.onended = cleanupAndHideButton;
        audio.onerror = (e) => {
            console.error('Natural voice playback failed. Falling back to browser TTS.', e);
            cleanupAndHideButton();
            speakText(responseText);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn('Audio play failed (promise error).', error);
                cleanupAndHideButton();
                speakText(responseText); // Fallback
            });
        }
    } catch (error) {
        console.error('Error processing or playing natural voice data:', error);
        speakText(responseText);
    }
}

// --- Function: Voice Recognition Setup and Control ---

/**
 * Toggles the voice recording state (start/stop). 
 * Updated for dashboard compatibility with enhanced error handling.
 */
function toggleVoiceRecording() {
    if (!recognition) {
        alert('Voice recognition not available. Try using a different browser.');
        return;
    }

    if (isRecording) {
        recognition.stop();
        updateVoiceStatus('🛑 Stopped listening', '#9E9E9E');
    } else {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            updateVoiceStatus('❌ Voice not available. Try reloading page.', '#f44336');
        }
    }
}

/**
 * Initializes webkitSpeechRecognition and sets up event handlers.
 * Enhanced for dashboard environment.
 */
function initSpeechRecognition() {
    const isSpeechSupported = 'webkitSpeechRecognition' in window;

    if (isSpeechSupported) {
        // Explicit configuration for the speech recognition object
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // --- Event handlers for the voice recording lifecycle ---
        recognition.onstart = () => {
            isRecording = true;
            updateVoiceStatus('🎤 Listening... speak now!', '#FF5722');
            if (DOM.voiceButton) {
                DOM.voiceButton.textContent = '🔴 Tap to Stop';
                DOM.voiceButton.style.backgroundColor = '#f44336';
            }
        };

        recognition.onresult = (event) => {
            const resultList = event.results;
            const finalTranscript = resultList[0][0].transcript;

            if (DOM.questionInput) {
                DOM.questionInput.value = finalTranscript;
            }
            updateVoiceStatus('✅ Got it: "' + finalTranscript + '"', '#4CAF50');

            // Automatically ask the question after a short delay
            setTimeout(askQuestion, 1500);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            updateVoiceStatus('❌ Couldn\'t hear that. Try again!', '#f44336');
            resetVoiceButton();
        };

        recognition.onend = () => {
            isRecording = false;
            if (DOM.voiceButton && DOM.voiceButton.textContent === '🔴 Tap to Stop') {
                updateVoiceStatus('🤔 Processing what you said...', '#FF9800');
            }
            resetVoiceButton();
        };

        updateVoiceStatus('✅ Voice ready! Tap microphone to start.', '#4CAF50');
        console.log('Speech recognition initialized successfully');
    } else {
        if (DOM.voiceButton) {
            DOM.voiceButton.style.display = 'none';
        }
        updateVoiceStatus('Voice not supported in this browser. Try Chrome!', '#9E9E9E');
        console.warn('Speech recognition not supported in this browser');
    }
}

// --- Function: Chat Interaction and API Handling ---

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
 * Enhanced for dashboard environment with better error handling.
 */
function askQuestion() {
    if (!DOM.questionInput) {
        console.error('Question input element not found');
        return;
    }

    const questionText = DOM.questionInput.value.trim();

    if (!questionText) {
        speakText('Please ask me a question!');
        return;
    }

    // --- 1. UI Update and Input Management ---
    addMessage('You', questionText, 'user');
    DOM.questionInput.value = '';
    showLoading(true);
    disableInput(true);

    // --- 2. API Call Setup ---
    const apiEndpoint = '/api/ask-with-voice';
    const postBody = {
        question: questionText,
        history: conversationHistory // Send the state for context
    };

    // --- 3. Execute API Call ---
    fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // --- 4. Handle successful response and UI cleanup ---
            showLoading(false);
            disableInput(false);

            if (data.status === 'success') {
                const aiResponse = data.response;
                addMessage('Space AI', aiResponse, 'ai');

                // Play audio if available, otherwise use browser TTS
                const hasNaturalAudio = data.audio_available && data.audio_data;

                if (hasNaturalAudio) {
                    playNaturalVoice(data.audio_data, aiResponse);
                } else {
                    speakText(aiResponse);
                }

                // --- 5. Update Conversation History (State Management) ---
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
                // Handle functional error message from the API
                const errorMessage = data.message || 'Sorry, I had trouble with that question.';
                addMessage('Space AI', errorMessage, 'error');
                speakText(errorMessage);
            }
        })
        .catch(error => {
            // --- 6. Handle network/fetch errors ---
            showLoading(false);
            disableInput(false);
            const errorMessage = 'Oops! Something went wrong with the network. Please try again.';
            addMessage('Space AI', errorMessage, 'error');
            speakText(errorMessage);
            console.error('Fetch Error:', error);
        });
}

// --- Chat Initialization for Dashboard ---

/**
 * Initializes the chat system within the dashboard environment
 * This ensures chat is ready when the dashboard loads
 */
function initializeChatSystem() {
    if (chatInitialized) {
        console.log('Chat system already initialized');
        return;
    }

    console.log('Initializing chat system for dashboard...');

    // Validate required elements are present
    if (!validateDashboardElements()) {
        console.error('Cannot initialize chat - missing required elements');
        setTimeout(initializeChatSystem, 1000); // Retry after 1 second
        return;
    }

    // Initialize speech recognition
    initSpeechRecognition();

    // Add welcome message if chat is empty
    if (DOM.chatMessages && DOM.chatMessages.children.length <= 1) {
        // Only add if there's just the initial message or no messages
        console.log('Chat system ready in dashboard mode');
    }

    chatInitialized = true;
    console.log('Chat system initialization complete');
}

// --- Event Listeners for Dashboard Integration ---

/**
 * Initialize chat system when DOM is ready
 * This works with the dashboard's initialization sequence
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, preparing chat system...');
    // Small delay to ensure dashboard elements are ready
    setTimeout(initializeChatSystem, 500);
});

/**
 * Also initialize when window loads (backup)
 */
window.addEventListener('load', () => {
    if (!chatInitialized) {
        console.log('Window loaded, initializing chat system...');
        initializeChatSystem();
    }
});