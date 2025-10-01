# Googles Natual Text to Speech API Service
# Updated to using REST API with API Key (simpler)
import os

import requests

base_url = "https://texttospeech.googleapis.com/v1/text:synthesize"


class TTSService:
    """Service for Google Text to Speech with natural voices"""

    def __init__(self):
        """Initialise the TTS service"""
        self.api_key = os.environ.get("GOOGLE_API_KEY")

        if not self.api_key:
            print("Warning: Google API key not found for TTS")
            self.client = None

    def text_to_speech(self, text):
        """
        Convert text to natural speech audio
        Returns base64 encoded audio data for web playback
        """

        if not self.api_key:
            return {"status": "error", "message": "TTS service not available"}

        try:
            # Set the text input to be synthesized
            url = (
                "https://texttospeech.googleapis.com/v1/text:"
                f"synthesize?key={self.api_key}"
            )
            # request payload
            payload = {
                "input": {"text": text},
                # Build kid friendly voice request
                "voice": {
                    "languageCode": "en-us",
                    "name": "en-us-Neural2-F",  # Natural sounding
                    "ssmlGender": "FEMALE",
                },
                # Select the type of audio file
                "audio_config": {
                    "audioEncoding": "MP3",
                    "speakingRate": "1.0",  # slowed for kids
                    "pitch": "2.0",  # increased for kids making it friendlier.
                },
            }

            # Perform the TTS request
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()

            # Extract audio data
            result = response.json()
            audio_data = result.get("audioContent")

            if audio_data:
                return {
                    "status": "success",
                    "audio_data": audio_data,
                    "source": "google_tts",
                }
            else:
                return {"status": "error", "message": "No audio data returned"}

        except Exception as error:
            print(f"TTS Error: {str(error)}")
            return {
                "status": "error",
                "message": f"Text To Speech failed: {str(error)}",
            }
