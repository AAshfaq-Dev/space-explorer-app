# Test Type:
# Functional / E2E Test
# Layer Tested:
# System Feature / Performance
# Purpose:
# Tests a specific non-core feature by intentionally sending a burst of requests
# to confirm that the server successfully enforces the rate limit
# and returns the expected 429 Too Many Requests status.

import requests
import time

# -----------------
# CONFIGURATION CONSTANT
# Replace this placeholder with the actual, full path to your server's
# self-signed certificate file (e.g., 'server.crt' or 'cert.pem').
# -----------------
# Example on Windows: CERT_FILE_PATH = "C:\\path\\to\\my\\project\\server.crt"
CERT_FILE_PATH = (
    r"C:\Users\Arslan Ashfaq\CodingToLearn\Projects\Space_Explorer\cert.pem"
)


print("Testing rate limiting...")
print("Making 12 requests quickly to trigger limit...")

for i in range(12):
    try:
        response = requests.post(
            "https://127.0.0.1:5000/api/ask-with-voice",
            json={"question": f"Test question {i}"},
            timeout=5,
            # 🔑 FIX: Pass the path to the certificate file here.
            # requests will now use this file to verify the server's identity.
            verify=CERT_FILE_PATH,
        )
        print(f"Request {i+1}: Status {response.status_code}")
        if response.status_code == 429:
            print("Rate limit triggered! ✅")
            print(f"Response: {response.json()}")
            break
    except Exception as e:
        # The SSLError is now replaced by a normal connection or rate-limit error.
        print(f"Request {i+1}: Error - {e}")

    # Small delay to mimic burst but prevent instant overload
    time.sleep(0.05)
