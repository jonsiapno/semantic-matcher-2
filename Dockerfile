# Semantic Matcher Docker Image
# Professional Node.js application with Python dependencies for ChromaDB embeddings

FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies for ChromaDB embeddings
# Includes Python, pip, and curl for health checks
RUN apt-get update && \
    apt-get install -y \
        python3-full \
        python3-pip \
        python3-venv \
        curl \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create and activate Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies for ChromaDB embeddings
# sentence-transformers is required for automatic embedding generation
RUN /opt/venv/bin/pip install --no-cache-dir sentence-transformers

# Copy package files for dependency installation
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production && \
    npm cache clean --force

# Copy application source code
COPY src/ ./src/

# Create non-root user for security
RUN groupadd -r semantic && useradd -r -g semantic semantic && \
    chown -R semantic:semantic /app
USER semantic

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Default command (can be overridden in docker-compose)
CMD ["node", "src/cli.mjs"]