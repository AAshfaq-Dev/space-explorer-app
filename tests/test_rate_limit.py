# Create test_rate_limit.py

import requests
import time

print("Testing rate limiting...")
print("Making 12 requests quickly to trigger limit...")

for i in range(12):
    try:
        response = requests.post(
            "http://127.0.0.1:5000/api/ask-with-voice",
            json={"question": f"Test question {i}"},
            timeout=5,
        )
        print(f"Request {i+1}: Status {response.status_code}")
        if response.status_code == 429:
            print("Rate limit triggered! ✅")
            print(f"Response: {response.json()}")
            break
    except Exception as e:
        print(f"Request {i+1}: Error - {e}")

    time.sleep(0.5)  # Small delay between requests
