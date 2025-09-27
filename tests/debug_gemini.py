# debug_gemini.py - Check available Gemini models
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GOOGLE_API_KEY")
print(f"API Key present: {bool(api_key)}")
print(f"API Key starts with: {api_key[:10] if api_key else 'None'}...")

if api_key:
    try:
        genai.configure(api_key=api_key)

        print("\nAvailable models:")
        for model in genai.list_models():
            if "generateContent" in model.supported_generation_methods:
                print(f"- {model.name}")

        # Test with the most basic model
        print("\nTesting basic model...")
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content("Say hello")
        print(f"Success: {response.text}")

    except Exception as e:
        print(f"Error: {e}")
else:
    print("No API key found in environment")
