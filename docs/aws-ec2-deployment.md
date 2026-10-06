# AWS EC2 Deployment Guide: CodeBridge Execution Worker

This guide details the step-by-step procedure to deploy the **CodeBridge Execution Worker** as a managed background service on a clean **Ubuntu 22.04 / 24.04 LTS Amazon EC2 instance**.

---

## 1. Architecture Overview

```
                      +-----------------------------+
                      |   Render API Service        |
                      |   (Express + Socket.IO)     |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Cloud Redis (BullMQ)      |
                      +--------------+--------------+
                                     | (Pulls execution jobs)
                                     v
+--------------------------------------------------------------------------+
| AWS EC2 Instance (Ubuntu LTS)                                            |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | systemd Service: codebridge-worker.service                         |  |
|  | - Node.js Execution Worker process                                 |  |
|  | - Consumes from BullMQ 'executionQueue'                            |  |
|  | - Strict Docker isolation runner (`EXECUTION_RUNNER=docker`)       |  |
|  +-------------------+------------------------------------------------+  |
|                      | (Unix socket /var/run/docker.sock)                |
|                      v                                                   |
|  +--------------------------------------------------------------------+  |
|  | Host Docker Engine Daemon                                          |  |
|  | - Spawns ephemeral sandboxed containers per testcase               |  |
|  | - Flags: --network=none --memory=128m --cpus=0.5 --pids-limit=32   |  |
|  |          --read-only --tmpfs /tmp --rm                             |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

### Security & Isolation Guarantees
- **No Inbound Ports**: The EC2 instance **does not open any public HTTP/TCP ports** for code execution. The worker connects **outbound only** to Redis and MongoDB to pull jobs.
- **Docker Socket Security**: The Docker daemon communicates strictly over the local Unix socket (`/var/run/docker.sock`). It is **never** exposed over a TCP socket.
- **Container Sandboxing**: User submissions run inside temporary Docker containers with:
  - `--network=none`: Zero network access; untrusted code cannot scan or contact local or external networks.
  - `--read-only` root filesystem: Untrusted code cannot modify the container image.
  - `--tmpfs /tmp`: Writable scratch space in RAM only.
  - `--pids-limit=32`: Prevents fork bomb attacks.
  - `--memory=128m` & `--memory-swap=128m`: Strict RAM limits, preventing memory exhaustion.
  - `--cpus=0.5`: Limits CPU utilization to half a core.
  - `timeout -s 9`: Hard wall-clock watchdog termination.
  - Host secrets and application `.env` files are **never** mounted or passed into submission containers.

---

## 2. Recommended Instance Sizing
- **Minimum**: `t3.small` (2 vCPU, 2 GB RAM, 20 GB gp3 EBS)
- **Production**: `t3.medium` or `c6i.large` (Compute Optimized for compiling C++ and running JVM)

---

## 3. Host Setup (Ubuntu 22.04 / 24.04 LTS)

### Step 3.1: System Update & Essential Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ca-certificates gnupg lsb-release
```

### Step 3.2: Install Docker Engine
Install Docker using the official Docker repository:
```bash
# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add ubuntu user to docker group (avoids sudo for docker commands)
sudo usermod -aG docker $USER
```
*(Log out and log back in, or run `newgrp docker` to apply group changes).*

### Step 3.3: Pre-pull Judge Sandbox Images
Pre-pull all language images to eliminate container startup latency during submissions:
```bash
docker pull frolvlad/alpine-gxx:latest
docker pull python:3.9-slim
docker pull openjdk:17-jdk-slim
docker pull node:18-slim
```

### Step 3.4: Install Node.js (v20 LTS)
Install Node.js via the NodeSource official repository:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Should display v20.x
npm -v
```

---

## 4. Deploying the CodeBridge Worker

### Step 4.1: Clone Repository
```bash
sudo mkdir -p /opt/codebridge
sudo chown -R $USER:$USER /opt/codebridge
git clone https://github.com/avadhesh11/CodeBridge.git /opt/codebridge
cd /opt/codebridge/execution-service
npm install --production
```

### Step 4.2: Configure Environment Variables
Create the production environment file at `/opt/codebridge/execution-service/.env`:
```bash
nano /opt/codebridge/execution-service/.env
```
Populate with your production endpoints:
```ini
# Production Redis (Upstash or AWS ElastiCache)
REDIS_URL=rediss://default:YOUR_REDIS_PASSWORD@YOUR_REDIS_HOST:6379

# MongoDB Connection String (Atlas or dedicated MongoDB)
MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASS@YOUR_CLUSTER.mongodb.net/codebridge?retryWrites=true&w=majority

# Execution Settings
EXECUTION_RUNNER=docker
WORKER_CONCURRENCY=1
NODE_ENV=production
```

Secure the environment file permissions:
```bash
chmod 600 /opt/codebridge/execution-service/.env
```

---

## 5. Configure systemd Service

Create a systemd unit file to manage the worker process:
```bash
sudo nano /etc/systemd/system/codebridge-worker.service
```

Paste the following configuration:
```ini
[Unit]
Description=CodeBridge Code Execution Worker
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/codebridge/execution-service
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
KillMode=process
TimeoutStopSec=30
Environment=NODE_ENV=production

# Resource Limits
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal
SyslogIdentifier=codebridge-worker

[Install]
WantedBy=multi-user.target
```

### Step 5.1: Start and Enable the Worker Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable codebridge-worker
sudo systemctl start codebridge-worker
```

---

## 6. Worker Management & Operations

### Check Service Status
```bash
sudo systemctl status codebridge-worker
```

### View Live Execution Logs
```bash
sudo journalctl -u codebridge-worker -f
```

### Restart Service (e.g. after code update)
```bash
sudo systemctl restart codebridge-worker
```

### Stop Service
```bash
sudo systemctl stop codebridge-worker
```

---

## 7. Periodic Docker Maintenance (Cron)
Over time, temporary volumes and exited containers might accumulate. Add a maintenance cron job:
```bash
sudo crontab -e
```
Add:
```cron
# Clean stopped containers and dangling images every night at 3 AM
0 3 * * * docker system prune -f --volumes > /dev/null 2>&1
```
