# Main Flask Application entry point
import os
import time
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
from services.n2yo_service import N2YOService  # Allows connection to N2YO API
from services.gemini_service import GeminiService  # Allows connection to Gemini API
from services.tts_service import TTSService  # Allows conncetion to Googles TTS API
from services.rate_limiter import create_limiter  # adds limits to requests

# Loads environment from env. file
load_dotenv()

# Creates Flask application instance
app = Flask(__name__)
limiter = create_limiter(app)

# Configures Flask
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")


# Basic route - home page
@app.route("/")
def home():
    """Main dashboard - single page with all functionality"""
    return render_template("dashboard.html", title="Space Explorer's Dashboard")


@app.route("/api/iss-position")
@limiter.limit("15 per minute")  # Limits satelite requests
def get_iss_position():
    """API endpoint to get current ISS position"""
    # Creates a service instance
    n2yo_service = N2YOService()

    # Gets user location if provided, otherwise uses default
    latitude = request.args.get("lat", 51.45, type=float)
    longitude = request.args.get("lng", -2.59, type=float)

    # Calls the service
    position_data = n2yo_service.get_iss_position(latitude, longitude)

    # Returns the JSON response
    return jsonify(position_data)


# Imports: brings Flask components and dotenv for environment variables
# load_dotenv(): Reads .env file and makes variables available
# Flask(name): Creates the web application instance
# @app.route(): Decorator that tells Flask which URL triggers which function
# render_template(): Renders HTML files from the templates folder
# jsonify(): Returns JSON responses for API endpoints
# Service instantiation: N2YOService() creates our service object
# URL parameters: request.args.get() reads optional query parameters
# Type conversion: type=float ensures coordinates are numbers
# JSON API: Returns data that JavaScript can consume


@app.route("/api/ask", methods=["POST"])
@limiter.limit("10 per minute")  # Limits AI requests
def ask_ai():
    """API endpoint for AI chat questions"""

    try:
        # Get question from request
        data = request.get_json()
        question = data.get("question", "").strip()

        if not question:
            return jsonify({"status": "error", "message": "Please ask a question"})

        # Get conversation history if provided
        conversation_history = data.get("history", [])

        # Create gemini service and ask question
        gemini_service = GeminiService()
        result = gemini_service.ask_question(question, conversation_history)

        return jsonify(result)
    except Exception as error:
        return jsonify(
            {
                "status": "error",
                "message": "Sorry, something went wrong. Please try again!",
            }
        )


@app.route("/api/ask-with-voice", methods=["POST"])
@limiter.limit("10 per minute")  # Limits AI requests
def ask_ai_with_voice():
    """API endpoint for AI chat with voice response using Googles TTS"""
    try:
        # Get question from request
        data = request.get_json()
        question = data.get("question", "").strip()

        if not question:
            return jsonify({"status": "error", "message": "Please ask a question!"})

        # Get conversation history if provided
        conversation_history = data.get("history", [])

        # Create gemini service and ask question
        gemini_service = GeminiService()
        result = gemini_service.ask_question(question, conversation_history)

        # Convert response to natural speech
        tts_service = TTSService()
        audio_result = tts_service.text_to_speech(result["response"])

        # Combine text and audio response

        return jsonify(
            {
                "status": "success",
                "response": result["response"],
                "audio_data": audio_result.get("audio_data"),
                "audio_available": audio_result["status"] == "success",
                "source": result["source"],
            }
        )

    except Exception as error:
        return jsonify(
            {
                "status": "error",
                "message": "Sorry, something went wrong. Please try again",
            }
        )


# Test route to verify the app is working
@app.route("/test")
def test():
    """Test endpoint to verify Flask is running"""
    return jsonify(
        {
            "status": "success",
            "message": "Flask app is running!",
            "apis_configured": {
                "n2yo": bool(os.environ.get("N2YO_API_KEY")),
                "gemini": bool(os.environ.get("GOOGLE_API_KEY")),
            },
        }
    )


@app.route("/test-limit")
@limiter.limit("3 per minute")  # Very low limit for testing
def test_limit():
    """Test route to verify rate limiting works"""
    return jsonify({"message": "Rate limit test successful", "timestamp": time.time()})


# Main executation block
if __name__ == "__main__":
    # Check if we're running locally vs production
    import os

    # Cloud Run provides PORT environment variable
    port = int(os.environ.get("PORT", 5000))

    # Use HTTPS only for local development (when PORT is not set by Cloud Run)
    if os.environ.get("PORT") is None:
        # Local development with HTTPS
        app.run(
            debug=True, host="0.0.0.0", port=port, ssl_context=("cert.pem", "key.pem")
        )
    else:
        # Production (Cloud Run) - no SSL needed
        app.run(host="0.0.0.0", port=port)
