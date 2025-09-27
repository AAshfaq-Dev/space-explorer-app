# Main Flask Application entry point
import os
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
from services.n2yo_service import N2YOService

# Loads environment from env. file
load_dotenv()

# Creates Flask application instance
app = Flask(__name__)

# Configures Flask
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")


# Basic route - home page
@app.route("/")
def home():
    """Home page route - this function runs when someone visits the root URL"""
    return render_template("index.html", title="Space Explorer")


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


# Imports: brings Flask components and dotenv for environment variables
# load_dotenv(): Reads .env file and makes variables available
# Flask(name): Creates the web application instance
# @app.route(): Decorator that tells Flask which URL triggers which function
# render_template(): Renders HTML files from the templates folder
# jsonify(): Returns JSON responses for API endpoints


# Page for Satellites


@app.route("/satellites")
def satellites():
    """Satellites page - shows satellite tracking interface"""
    return render_template("satellites.html", title="Satellite Tracker")


@app.route("/api/iss-position")
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


# Service instantiation: N2YOService() creates our service object
# URL parameters: request.args.get() reads optional query parameters
# Type conversion: type=float ensures coordinates are numbers
# JSON API: Returns data that JavaScript can consume

# Main executation block

if __name__ == "__main__":
    # Runs in debug mode for development
    app.run(debug=True, host="0.0.0.0", port=5000)
