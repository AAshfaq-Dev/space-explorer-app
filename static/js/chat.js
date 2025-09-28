// Abstracting the UI helps keep this main logic file clean.

// --- Global State Management (Core Application Data) ---
// These variables manage the application's current working state.
let conversationHistory = [];
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let isRecording = false;


// --- Function: Text-to-Speech (TTS) and Audio Playback ---

/**
 * Stops all ongoing speech synthesis and audio playback.
 */
function stopSpeaking() {
    speechSynthesis.cancel();

    // Explicitly stop any currently playing audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });

    DOM.stopSpeakingButton.style.display = 'none';
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

    DOM.stopSpeakingButton.style.display = 'inline-block';

    utterance.onend = () => { DOM.stopSpeakingButton.style.display = 'none'; };
    utterance.onerror = () => {
        console.error('Browser TTS error occurred.');
        DOM.stopSpeakingButton.style.display = 'none';
    };

    speechSynthesis.speak(utterance);
}

/**
 * Plays the high-quality natural voice audio from base64 data, with fallback to speakText.
 * The logic is kept verbose for maximum readability, as requested.
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
        audio.preload = 'auto';

        DOM.stopSpeakingButton.style.display = 'inline-block';

        const cleanupAndHideButton = () => {
            DOM.stopSpeakingButton.style.display = 'none';
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
 * Toggles the voice recording state (start/stop). Exported for use in chat.html.
 */
function toggleVoiceRecording() {
    if (!recognition) {
        alert('Voice recognition not available. Try using Chrome browser.');
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
            DOM.voiceButton.textContent = '🔴 Tap to Stop';
            DOM.voiceButton.style.backgroundColor = '#f44336';
        };

        recognition.onresult = (event) => {
            const resultList = event.results;
            const finalTranscript = resultList[0][0].transcript;

            DOM.questionInput.value = finalTranscript;
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
            if (DOM.voiceButton.textContent === '🔴 Tap to Stop') {
                updateVoiceStatus('🤔 Processing what you said...', '#FF9800');
            }
            resetVoiceButton();
        };

        updateVoiceStatus('✅ Voice ready! Tap microphone to start.', '#4CAF50');
    } else {
        DOM.voiceButton.style.display = 'none';
        updateVoiceStatus('Voice not supported in this browser. Try Chrome!', '#9E9E9E');
    }
}


// --- Function: Chat Interaction and API Handling ---

/**
 * Handles the 'Enter' key press in the input field. Exported for use in chat.html.
 * @param {Event} event - The keypress event.
 */
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        askQuestion();
    }
}

/**
 * Main function to process the user's question, call the API, and handle the response.
 * Exported for use in chat.html.
 */
function askQuestion() {
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

                // Limit context size to the last 5 exchanges (Dumb Code principle)
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


// --- Initialization ---

/**
 * Entry point for the application. Starts up voice recognition once the page is loaded.
 */
window.addEventListener('load', initSpeechRecognition);