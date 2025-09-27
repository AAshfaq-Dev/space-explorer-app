# Google cloud run entry point
import os
from app import app

if __name__ == "__main__":
    # Cloud run provides port env variable
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
