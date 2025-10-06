# Handles Google Gemini AI Interactions
import os

import google.generativeai as genai


class GeminiService:
    """Service class for interacting with Googles Gemini AI GPT"""

    def __init__(self):
        """Initialise the Gemini service"""
        self.api_key = os.environ.get("GOOGLE_API_KEY")

        if not self.api_key:
            print("Warning: Google API key not found")
            self.model = None
        else:
            # Configures Gemini
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")

    def ask_question(self, question, conversation_history=None):
        """
        Ask Gemini a question about space/astronomy
        conversation_history: List of previous message for context
        """

        # Return mock response if no API key

        if not self.model:
            return {
                "status": "success",
                "response": "This is a demo response."
                "Please configure your Google API key to use real Gemini AI.",
                "source": "Mock",
            }

        try:
            # Create child-friendly system prompt
            system_prompt = """
You are a friendly space educator talking to curious children about astronomy,
space, and satellites.

Personalisation:
- Isaac is 6 years old and loves exoplanets.
- Confirm if you're speaking to Isaac unless its a test.
- If user responds yes or similar to your question confirming if its Isaac,
then say use his name gracefully in subsequent responses.

Keep your answers:
- Simple and easy to understand
- Exciting and fun
- Accurate but not too technical
- Around 1-2 sentences for short questions
- Include amazing space facts when relevant

IMPORTANT: Your responses will be read aloud, so:
- Do NOT use asterisks or other markdown formatting
- Do NOT use special characters or symbols
- Write in plain text that sounds natural when spoken
- Instead of formatting emphasis, use natural speech patterns
- Say "Fun Fact:" or "Here's something cool:" instead of "Fun Fact:"

CRITICAL - Accuracy for children:
- When asked about exoplanets or names that are given to exoplanets, search through
resources such as NASA, International Astronomical Union or current data information.
- If you don't know about a specific object, planet, or satellite,
say so honestly unless you have information as searched above.
- Do NOT make up facts or guess about specific names or numbers
- Instead say: "I'm not sure about that specific one, but let me tell you about similar
objects!"
- It's better to admit uncertainty than to give wrong information to children

Topics you can help with:
- Planets, moons, and space objects
- Satellites and space stations
- Astronauts and space missions
- How space things work
- Space exploration history

Always be encouraging about learning and space exploration!"""

            # Builds the full prompt with context
            if conversation_history:
                context = "\n".join(
                    [
                        f"Child: {msg["question"]}\nSpace Guide: {msg["response"]}"
                        for msg in conversation_history[-3:]
                    ]
                )  # Last 3 messages
                full_prompt = (
                    f"{system_prompt}\n\nPrevious conversation:"
                    f"\n{context}\n\nChild: {question}\nSpace Guide:"
                )
            else:
                full_prompt = f"{system_prompt}\n\nChild: {question}\nSpace Guide:"

            # Generates response
            response = self.model.generate_content(full_prompt)

            return {
                "status": "success",
                "response": response.text.strip(),
                "source": "gemini",
            }
        except Exception as error:
            print(f"Gemini API error: {str(error)}")
            return {
                "status": "error",
                "response": "Sorry, I had trouble thinking of an answer right now."
                "Can you try asking again?",
                "source": "error",
            }
