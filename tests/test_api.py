# Test Type:
# End to End (E2E) Test
# Layer Tested:
# HTTP API / System
# Purpose:
# Simulates a real client request to the running Flask server's /api/ask endpoint,
# checking the entire stack (HTTP connection, routing, and final response handling).


import requests
import json

# Test data
test_questions = {"question": "What makes stars shine?", "history": []}

# Run flask app
print("Testing /api/ask endpoint")
print("Make sure Flask is running on http://127.0.0.1:5000")
print("-" * 50)

try:
    response = requests.post(
        "http://127.0.0.1:5000/api/ask",
        json=test_questions,
        headers={"Content-Type": "application/json"},
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

except requests.exceptions.ConnectionError:
    print("Error: Can't connect to Flask app. Make sure its running")
except Exception as e:
    print(f"Error:{e}")
