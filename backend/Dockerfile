FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (ffmpeg is required for pydub/whisper)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy dependencies first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and resources
COPY app /app/app
RUN mkdir -p /app/backend/templates /app/backend/uploads
COPY templates /app/backend/templates

# Fix permissions if needed (Render runs as non-root sometimes, but usually fine)

EXPOSE 10000

# Start Uvicorn on port 10000 (standard for Render)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
