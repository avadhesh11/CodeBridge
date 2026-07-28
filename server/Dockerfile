# Use Node base image
FROM node:20

# Install g++ and docker CLI for C++ execution
RUN apt-get update && apt-get install -y g++ docker.io

# Set working directory
WORKDIR /src/services

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all code
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["npm", "start"]