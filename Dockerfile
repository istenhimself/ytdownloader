# Dockerfile for YouTube Downloader using Bun
FROM oven/bun:latest

# Install Python, pip, yt-dlp, and FFmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp in a virtual environment
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir yt-dlp

# Add venv to PATH
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Create tmp directory for downloads
RUN mkdir -p /tmp/downloads && chmod 777 /tmp/downloads

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=development

# Start in development mode
CMD ["bun", "run", "dev"]
