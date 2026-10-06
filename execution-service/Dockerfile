# Dockerfile for CodeBridge Execution Service
FROM node:20

# Install compilers and tools for C++, Python, Java, Docker CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    python3 \
    default-jdk-headless \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
