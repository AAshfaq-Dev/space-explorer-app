# Dockerfile - container config for Google Cloud Run
FROM python:3.12-slim

# Directory
WORKDIR /app

# Copy dependencies
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

#Copy app code
COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Run with Gunicorn (web server)
CMD ["sh", "-c", "exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app"]
