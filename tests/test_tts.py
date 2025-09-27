# Test the Googles Text to Speech Service
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from services.tts_service import TTSService

load_dotenv()

# Test the TTS service
tts_service = TTSService()

test_text = "Hello, This is a test of Goole's Natural voice sythesis for kids"

print("Testing Goole's Text to Speech...")
result = tts_service.text_to_speech(test_text)

print(f"Status: {result["status"]}")
if result["status"] == "success":
    print(f"Audio data length {len(result["audio_data"])} characters")
    print("Audio generated successfully")
else:
    print(f"Error: {result.get("message")}")
