# Render Deployment Guide: API Service & Fallback Worker

This guide details how to deploy CodeBridge onto **Render** as two independently configured and scalable services:
1. **API Web Service** (Express REST API, Auth, Rooms, Questions, Socket.IO)
2. **Fallback Execution Worker** (Background Worker using native Linux execution when AWS EC2 worker is offline)

---

## 1. Architecture on Render

```
                                      +------------------------+
                                      |   Browser Frontend     |
                                      +-----------+------------+
                                                  |
                                                  v
                                      +------------------------+
                                      |  Render Web Service    |
                                      |  (API Service)         |
                                      |  cmd: npm run start:api|
                                      +-----------+------------+
                                                  |
                                                  v
                                      +------------------------+
                                      |  Upstash / Redis Cloud |
                                      |  (BullMQ executionQueue|
                                      +-----+------------+-----+
                                            |            |
                                (Competes)  |            |  (Competes)
                                            v            v
           +----------------------------------+        +----------------------------------+
           | AWS EC2 Worker                   |        | Render Background Worker         |
           | (Primary: Docker sandbox runner) |        | (Fallback: Native Linux runner)  |
           | cmd: npm run start:worker        |        | cmd: npm run start:worker        |
           +----------------------------------+        +----------------------------------+
```

---

## 2. Service 1: API Web Service

### Configuration on Render Dashboard
- **Type**: Web Service
- **Name**: `codebridge-api`
- **Root Directory**: `server`
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm run start:api`
- **Auto-Deploy**: Yes

### Environment Variables
| Variable | Value / Description |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Render automatically binds to this) |
| `FRONTEND_URL` | `https://your-frontend-app.onrender.com,http://localhost:5173` |
| `BACKEND_URL` | `https://codebridge-api.onrender.com` |
| `MONGO_URI` | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/codebridge` |
| `REDIS_URL` | `rediss://default:<password>@<host>:6379` |
| `ACCESS_SECRET` | Strong random secret string (min 32 chars) |
| `REFRESH_SECRET` | Strong random secret string (min 32 chars) |
| `ENABLE_QUEUE_BOARD` | `false` (or `true` if inspecting BullMQ admin) |

> [!NOTE]
> The API Service does **not** evaluate code and does **not** start a BullMQ worker. It only creates `Submission` records, pushes jobs to BullMQ, and relays real-time Socket.IO notifications via Redis Pub/Sub.

---

## 3. Service 2: Fallback Execution Worker

### Configuration on Render Dashboard
- **Type**: Background Worker (recommended) or Web Service
- **Name**: `codebridge-worker`
- **Root Directory**: `execution-service`
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Auto-Deploy**: Yes

### Environment Variables
| Variable | Value / Description |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Same MongoDB URI as API Service |
| `REDIS_URL` | Same Redis URL as API Service |
| `EXECUTION_RUNNER` | `native` (Docker is not available in standard Render environments) |
| `WORKER_CONCURRENCY` | `1` (Crucial on 512MB RAM free instances) |

---

## 4. How Job Distribution Works Between AWS & Render

1. Both the **AWS EC2 Worker** and **Render Fallback Worker** subscribe to the identical BullMQ queue (`executionQueue`) over the shared Redis instance.
2. In BullMQ, workers **compete for jobs atomically** via Redis:
   - When an execution request arrives, whichever healthy worker has available capacity immediately claims the job.
   - If the AWS EC2 worker is running, it processes jobs with full Docker container isolation.
   - If the AWS EC2 instance is stopped or offline, the Render fallback worker seamlessly processes queued jobs without downtime.
   - If **both** workers are temporarily sleeping or offline, jobs remain persistently stored in Redis. As soon as any worker boots up, it pulls and processes the pending jobs.

---

## 5. Security & Limitations of Native Execution on Render

> [!WARNING]
> **Native Linux execution is inherently less isolated than Docker containers.**

### Sandbox Safeguards Applied in Native Mode
1. **OS Resource Limits (`ulimit`)**:
   - `ulimit -v 524288`: Restricts virtual memory to 512 MB.
   - `ulimit -f 65536`: Restricts generated file sizes to 64 MB.
   - `ulimit -u 64`: Restricts process table / child processes to mitigate fork bombs.
   - `ulimit -t <sec>`: Enforces max CPU time.
2. **Process Group Termination**:
   - Spawns using detached process groups so child processes spawned by untrusted scripts are killed upon timeout.
3. **Execution Timeouts**:
   - Hard `timeout -s 9` signal kills stubborn or hanging processes.
4. **Temporary Scratch Workdir**:
   - Submissions run inside dedicated `server/temp/<uuid>` directories and are deleted immediately in a `finally` block upon completion.

### Residual Limitations on Render Free Tier
- **Shared Host Network**: Untrusted code running natively has access to host loopback unless system-level network namespaces are enforced.
- **Compiler Availability**: Render default Node environment includes basic tools; if a compiler (like `g++` or `javac`) is missing from the Render environment image, C++ or Java jobs will return a `Compilation Error (CE)`. Python and JavaScript run natively out of the box.
- **Memory Pressure**: Free Render instances provide 512 MB RAM. Running multiple concurrent compilations risks OOM-killing the worker. For this reason, `WORKER_CONCURRENCY=1` is strictly enforced.
- **Cold Starts**: Render free services may spin down after 15 minutes of inactivity. The first job after an idle period may experience a cold-start delay while the instance spins back up.
