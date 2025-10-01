import os
import time  # added for mock tests.

import requests


class N2YOService:
    """Service class for interacting with N2Y0 satellite tracking API."""

    def __init__(self):
        """Initialise the service with API key and base URL"""
        self.api_key = os.environ.get("N2YO_API_KEY")
        self.base_url = "https://api.n2yo.com/rest/v1/satellite"

        # Checks if mock mode is enabled via env var.
        self.mock_mode = os.environ.get("MOCK_MODE", "false").lower() == "true"

    def get_mock_data(self):
        """Generates consistent mock data for testing"""
        return {
            "satellite_name": "ISS",
            "latitude": 25.2048,
            "longitude": 55.2708,
            "altitude_km": 408.5,
            "timestamp": int(time.time()),
            "status": "success",
        }

    def get_iss_position(self, latitude=51.45, longitude=-2.59):
        """Gets current position of the ISS in relation to default coordinates"""

        # Force mock data in test env
        if self.mock_mode:
            return self.get_mock_data()

        # Auto-detect: if no API key, use mock data
        if not self.api_key:
            return self.get_mock_data()
        # Tries the real API, falls back to mock on error.
        try:
            # ISS NORAD ID is 25544
            iss_norad_id = 25544
            # Builds the API URL
            url = (
                f"{self.base_url}/positions/{iss_norad_id}/{latitude}/{longitude}/0/2/"
            )
            # Parameters for the request
            params = {"apiKey": self.api_key}

            # Makes the API request
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()  # Raises exception for bad status codes.
            # Parses JSON response
            data = response.json()

            # Extracts relevant information
            if "positions" in data and len(data["positions"]) > 0:
                position = data["positions"][0]
                return {
                    "satellite_name": data.get("info", {}).get("satname", "ISS"),
                    "latitude": position.get("satlatitude"),
                    "longitude": position.get("satlongitude"),
                    "altitude_km": position.get("sataltitude"),
                    "timestamp": position.get("timestamp"),
                    "status": "success",
                    "data_source": "n2yo_api",
                }
            else:
                return {"status": "error", "message": "No position data available"}

        except requests.exceptions.RequestException as error:
            # Handle network errors - fallback to mock data
            print(f"API request failed, using mock data: {str(error)}")
            return self.get_mock_data()

        except Exception as error:
            # Handle other errors - fallback to mock data
            print(f"Unexpected error, using mock data: {str(error)}")
            return self.get_mock_data()


# __init__ method: Sets up the service with API key and base URL
# Error handling: Uses try/except to handle network and parsing errors
# Default coordinates: Dubai/Abu Dhabi area (relevant to Orbitworks!)
# ISS NORAD ID: 25544 is the unique identifier for the ISS
# Timeout: 10-second timeout prevents hanging requests
