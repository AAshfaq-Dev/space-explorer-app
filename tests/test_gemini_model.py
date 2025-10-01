# Test Type:
# External Integration Test
# Layer Tested:
# Gemini API / Infrastructure
# Purpose:
# Verifies that the Python SDK is configured,
# That the API key is valid,
# Connectivity to Google's Gemini servers is successful.


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

        # print("\nAvailable models:")
        # for model in genai.list_models():
        #     if "generateContent" in model.supported_generation_methods:
        #         print(f"- {model.name}")
        # Uncomment if want list of more models.

        model_to_check = "gemini-2.5-flash-lite"
        model_instance = genai.GenerativeModel(model_to_check)
        full_model_name = model_instance.model_name
        print(f"\nTesting {model_to_check} model...")
        print("\nSuccess! ")
        clean_name = full_model_name.replace("models/", "")
        print(f"\nThe model name is {clean_name}\n")

    except Exception as e:
        print(f"Error: {e}")
else:
    print("No API key found in environment")
