# CodeBridge Execution Service

Independent, lightweight background worker service responsible for consuming code execution jobs from BullMQ, running them inside secure Docker sandboxes (or native Linux runner fallback), saving verdicts to MongoDB, and publishing real-time results via Redis Pub/Sub.

## Requirements
- Node.js 20+
- Docker Engine (for AWS EC2 primary deployment) or Native compilers (g++, python3, default-jdk)
- Redis & MongoDB access

## Setup & Running
```bash
npm install
npm start
```

## Running Tests
```bash
npm test
```
