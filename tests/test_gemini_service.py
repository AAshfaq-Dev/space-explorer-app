# Test Type:
# Internal and External Integration Test
# Layer Tested:
# Custom Service Logic
# Purpose:
# Verifies the core logic of the GeminiService class,
# ensuring it handles input and returns the structured output
# (status, source, response) correctly by running multiple test questions.

from dotenv import load_dotenv
from services.gemini_service import GeminiService

# Loads the env variable
load_dotenv()

# Creates a service instance
gemini_service = GeminiService()

# Test questions
test_questions = [
    "What is the International Space Station?",
    "How far is the Moon?",
    "Why do satellites stay in space",
]

print("Testing Gemini Service...")
print("=" * 50)

for question in test_questions:
    print(f"\nQuestion: {question}")
    result = gemini_service.ask_question(question)
    print(f"Status: {result["status"]}")
    print(f"Source: {result["source"]}")
    print(f"Response: {result["response"]}")
    print("-" * 30)
