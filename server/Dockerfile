# Use Node base image
FROM node:20

# Install compilers and tools for C++, Python, Java, Docker CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    python3 \
    default-jdk-headless \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all code
COPY . .

# Expose backend port
EXPOSE 5000

# Start server directly with node in production
CMD ["node", "server.js"]