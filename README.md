<div align="center">

# 🌉 CodeBridge

**A real-time, collaborative technical interview platform with a sandboxed multi-language code execution engine, live WebRTC video, and AI-resistant proctoring.**

[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?logo=socket.io)](https://socket.io)
[![Redis](https://img.shields.io/badge/Redis-Upstash-red?logo=redis)](https://upstash.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Sandbox-blue?logo=docker)](https://www.docker.com)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Feature Breakdown](#-feature-breakdown)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Data Models](#-data-models)
- [API Reference](#-api-reference)
- [Socket.io Event Map](#-socketio-event-map)
- [Security & Sandbox](#-security--sandbox)
- [Anti-Cheat System](#-anti-cheat--proctoring-engine)
- [Horizontal Scaling](#-horizontal-scaling)
- [Testing](#-testing)
- [Environment Variables](#-environment-variables)
- [Quick Start](#-quick-start)
- [Docker Deployment](#-docker-deployment)

---

## 🌐 Overview

**CodeBridge** is a full-stack, production-ready platform designed for **live technical interviews**. An interviewer creates a room, shares a link, and the candidate joins. Both participants get:

- A shared **Monaco editor** with language selection and real-time code sync
- **WebRTC video/audio** call (no third-party service required)
- An in-room **chat sidebar**
- **One-click code execution** against sample or hidden test cases
- **Live proctoring** with server-enforced violation tracking

The system is horizontally scalable via Socket.io + Redis pub/sub and uses Docker to sandbox every code execution in an isolated, resource-constrained container.

---

## 🏛 Architecture

CodeBridge is refactored into two independently deployable services sharing an external Redis and MongoDB cluster:

```
+-------------------------------------------------------------------------+
|                          BROWSER (React + Vite)                         |
|                                                                         |
|  +----------+  +-------------------+  +--------------+  +----------+  |
|  |  Monaco  |  |  Socket.io Client |  |  WebRTC Peer |  |   Chat   |  |
|  |  Editor  |  |  (code/chat/AC)   |  |  (SimplePeer)|  | Sidebar  |  |
|  +----+-----+  +--------+----------+  +------+-------+  +-----+----+  |
+-------+-----------------+-----------------------+---------------+-------+
        | HTTP REST        | WebSocket             | WebRTC SDP/ICE
        v                 v                        v (signaling)
+------------------------------------------------------------------------+
|                      API SERVICE (Render / Node.js)                    |
|                                                                        |
|  +-------------+  +-------------------+  +------------------------+   |
|  |  REST API   |  |  Socket Handlers  |  |   Middleware Stack     |   |
|  |  /api/auth  |  |  roomSocket.js    |  | - JWT Auth             |   |
|  |  /api/room  |  |  webrtc-offer     |  | - Rate Limiter (Redis) |   |
|  |  /api/quest |  |  code-change      |  | - Idempotency (Redis)  |   |
|  +------+------+  |  anti-cheat       |  | - CORS                 |   |
|         |         +--------+----------+  +------------------------+   |
|         | Creates          | Redis Pub/Sub                             |
|         | Submission       | (Socket.io horizontal adapter)           |
|         | Record           |                                           |
|         v                  v                                           |
|  +------------------------------------------------------------------+  |
|  | BullMQ Job Producer (enqueues to Redis 'executionQueue')         |  |
|  +------------------------------------------------------------------+  |
+---------------------+-------------------------------+------------------+
                      |                               |
              +-------v-------+               +-------v-------------------------+
              | MongoDB Atlas |               | Cloud Redis (BullMQ / Pub/Sub)  |
              | (Submissions, |               | - 'executionQueue'              |
              |  Rooms, Users)|               | - 'codebridge:execution:results'|
              +-------^-------+               +-------+-------------------------+
                      |                               |
                      | Persists Results              | Consumes execution jobs
                      +-------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v (Primary: AWS EC2)                                      v (Fallback: Render)
+------------------------------------+    +------------------------------------+
| AWS EC2 EXECUTION WORKER           |    | RENDER FALLBACK WORKER             |
| - Node.js BullMQ Worker            |    | - Node.js BullMQ Worker            |
| - Docker Engine Container Sandbox  |    | - Native Linux Runner with ulimit  |
| - --network=none --memory=128m     |    | - Memory & CPU timeout watchdog    |
| - Publishes to Redis pub/sub       |    | - Publishes to Redis pub/sub       |
+------------------------------------+    +------------------------------------+
```

### Deployment Guides
- 📖 [AWS EC2 Worker Deployment Guide](docs/aws-ec2-deployment.md)
- 📖 [Render API & Fallback Worker Deployment Guide](docs/render-deployment.md)

---

## 🚀 Feature Breakdown

### 🎙 Interview Room
| Feature | Details |
|---|---|
| Room modes | `interview` (interviewer + candidate) or `practice` (solo) |
| Timed rooms | Optional countdown with server-side auto-expiry |
| Room status | `active` → `closed` (on end-session or timer expiry) |
| Session end | Interviewer or practice user can end session; room closes & archives |
| Code persistence | Current code synced to MongoDB on every keystroke |
| Language sync | Language selection broadcast to all room participants |
| Question history | All attempted questions archived in `room.questions[]` |

### 💻 Code Editor
| Feature | Details |
|---|---|
| Editor | Monaco (VS Code's editor, same syntax highlighting) |
| Languages | C++, Python, Java, JavaScript |
| Real-time sync | Every `code-change` event is broadcast to room peers |
| Default code | Starter C++ template auto-loaded on question change |
| Code size limit | 50,000 characters max, enforced server-side |

### ⚡ Code Execution Engine
| Feature | Details |
|---|---|
| Sample run | Runs candidate code against visible test cases |
| Hidden submit | Runs against private test cases, verdicts stored |
| Sandbox | Docker with `--memory=128m --cpus=0.5 --pids-limit=32 --network=none --read-only` |
| Verdicts | `AC` (Accepted), `WA` (Wrong Answer), `TLE`, `RE` (Runtime Error), `CE` (Compile Error) |
| Evaluation | Fail-fast sequential — stops at first failing test case |
| Output limit | 1MB cap to prevent output flooding |
| Rate limit | `sample`: 1 req / 10s; `submit`: 1 req / 60s (per user, Redis-backed) |
| Idempotency | Duplicate submissions return cached result instantly (SHA-256 keyed) |
| Queue | BullMQ single-worker queue (concurrency=1) prevents OOM on low-memory hosts |
| Native fallback | If Docker unavailable, uses `ulimit` for sandboxing on Linux |
| Image prewarm | All language Docker images warmed at startup for fast first-run |

### 📹 WebRTC Video Call
| Feature | Details |
|---|---|
| Library | SimplePeer (WebRTC wrapper) |
| Signaling | WebRTC offer/answer/ICE relayed through Socket.io |
| Initiation | Server automatically emits `start-call` when both users join |
| Screen share | Candidate or interviewer can share screen |

### 💬 Chat
| Feature | Details |
|---|---|
| Persistence | All messages stored in MongoDB (`chats` collection) |
| History | Full chat history delivered to user on room join |
| Participants | Sender/receiver tracked per message |

### 🛡 Anti-Cheat Proctoring Engine
_(See dedicated section below)_

### 📁 Question Bank
| Feature | Details |
|---|---|
| Public questions | 2 pre-seeded problems: "Two Sum", "Valid Parentheses" |
| Private questions | Interviewer can create custom problems |
| Test cases | Sample (visible) and hidden test cases per question |
| Constraints | Free-text constraints field |
| Time limit | Per-question time limit (default: 2 seconds) |
| Memory limit | Schema field only (`memorylimit`, default 256 MB) — **not enforced by sandbox**; Docker hard limit is `--memory=128m` |
| Import | Bulk import via `ImportQuestionsModal` component |

### 👤 User & Auth
| Feature | Details |
|---|---|
| Auth methods | Email/password + GitHub OAuth |
| Tokens | Access token (short-lived, httpOnly cookie) + Refresh token (DB-validated) |
| Token refresh | `/api/auth/refresh` — refresh token revocation on logout |
| Profile | Name, bio, company, location, skills, avatar |
| Role | Default role: `interviewer` |

### 📊 Dashboard & Management
| Feature | Details |
|---|---|
| Dashboard | Lists all rooms created by user with status |
| Manage room | Question selection, anti-cheat log viewer, submission history |
| Create room | Form to configure name, mode, duration, settings |
| Profile page | Editable profile with skills management |

---

## 🔧 Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| `express` | 5.x | HTTP server & REST API |
| `socket.io` | 4.8 | Real-time WebSocket communication |
| `@socket.io/redis-adapter` | 8.3 | Horizontal scaling pub/sub |
| `mongoose` | 9.x | MongoDB ODM |
| `bullmq` | 5.x | Redis-backed job queue for code execution |
| `ioredis` | 5.x | Redis client (Upstash-compatible with TLS) |
| `jsonwebtoken` | 9.x | JWT access & refresh tokens |
| `bcryptjs` | 3.x | Password hashing |
| `passport` + `passport-github2` | — | GitHub OAuth |
| `@bull-board` | 9.x | BullMQ visual dashboard (`/admin/queues`) |
| `nanoid` | 5.x | Unique room ID generation |
| `uuid` | 13.x | Temporary execution directory IDs |
| `cookie` + `cookie-parser` | — | Cookie parsing for JWT |
| `cors` | — | Cross-origin request handling |
| `dotenv` | — | Environment variable loading |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| `react` | 19 | UI framework |
| `react-router-dom` | 7.x | Client-side routing |
| `@monaco-editor/react` | 4.7 | VS Code-quality code editor |
| `socket.io-client` | 4.8 | WebSocket client |
| `simple-peer` | 9.x | WebRTC peer-to-peer |
| `axios` | 1.x | HTTP client |
| `tailwindcss` | 4.x | Utility-first CSS |
| `vite` | 7.x | Build tool & dev server |

---

## 📁 Repository Structure

```
CodeBridge/
├── docker-compose.yml          # Full stack: api + worker + frontend + mongo + redis
│
├── server/                     # API Service (Render Web Service)
│   ├── server.js               # HTTP & Socket.io server entry point
│   ├── Dockerfile              # Container image for API service
│   ├── package.json            # Express, Socket.io, Auth, Sockets dependencies
│   ├── .env.example            # API environment variables template
│   │
│   ├── src/
│   │   ├── app.js              # Express setup, CORS, MongoDB connect, route mounting
│   │   │
│   │   ├── models/
│   │   │   ├── room.js         # Room schema (anti-cheat logs, submissions, settings)
│   │   │   ├── user.js         # User schema (GitHub OAuth, profile fields)
│   │   │   ├── question.js     # Question schema (sample/hidden TCs, timelimit)
│   │   │   ├── submission.js   # Standalone Submission lifecycle model
│   │   │   └── chats.js        # Chat message schema
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/           # Login, signup, logout, GitHub OAuth, token refresh
│   │   │   ├── room/           # Create room, run code, submission status, get rooms
│   │   │   └── questions/      # CRUD for questions
│   │   │
│   │   ├── sockets/
│   │   │   ├── index.js        # Socket.io init + Redis adapter + cross-process worker relay
│   │   │   └── roomSocket.js   # All real-time handlers (join, code, chat, WebRTC, anti-cheat)
│   │   │
│   │   ├── services/
│   │   │   └── queueService.js # BullMQ queue producer, connection pool, Upstash backoff
│   │   │
│   │   ├── middleware/
│   │   │   ├── authmiddleware.js # JWT cookie verification
│   │   │   ├── rateLimiter.js    # Redis sliding-window rate limiter (circuit-breaker enabled)
│   │   │   ├── idempotency.js    # SHA-256 request deduplication cache (circuit-breaker enabled)
│   │   │   └── errorHandler.js   # Global Express error handler
│   │   │
│   │   └── utils/
│   │
│   └── test/
│       ├── refactorVerification.js # Verification suite for API and worker decoupling
│       ├── securitySandbox.js      # Sandbox security test suite
│       └── loadTest.js             # Concurrency & multi-socket load test
│
├── execution-service/          # Standalone Code Execution Service (AWS EC2 / Render Fallback)
│   ├── index.js                # Worker entry point, connects to DB & boots BullMQ worker
│   ├── test.js                 # Standalone execution engine test suite
│   ├── package.json            # Ultra-lean (bullmq, ioredis, mongoose, uuid, dotenv)
│   ├── Dockerfile              # Compilers (g++, python3, default-jdk) + Docker CLI
│   ├── .env.example            # Worker environment configuration template
│   │
│   └── src/
│       ├── engine.js           # Multi-language sandbox runner (Docker & Native Linux fallback)
│       ├── worker.js           # BullMQ worker consumer, result persistence, Redis Pub/Sub
│       ├── config.js           # Redis connection factory with Upstash quota circuit breaker
│       └── models/             # Lean Submission & Room models for persistence
│
├── docs/                       # Production Deployment Documentation
│   ├── aws-ec2-deployment.md   # Complete AWS EC2 (Docker sandbox + systemd) guide
│   └── render-deployment.md    # Render API and Fallback Worker deployment guide
│
└── Frontend/                   # React + Vite frontend application
    ├── Dockerfile              # Nginx-based production build
    ├── nginx.conf              # SPA fallback config
    ├── vite.config.js
    │
    └── src/
        ├── App.jsx             # Route definitions
        ├── ProtectedRoute.jsx  # Auth guard HOC
        ├── context/
        │   └── authContext.jsx # Global auth state (user, login, logout)
        │
        ├── pages/
        │   ├── Home.jsx        # Landing page
        │   ├── Login.jsx       # Auth page (login + signup tabs)
        │   ├── Dashboard.jsx   # User's rooms list
        │   ├── CreateRoom.jsx  # Room configuration form
        │   ├── Interview.jsx   # Main interview room (editor + video + chat + anti-cheat)
        │   ├── Manage.jsx      # Room management, question bank, violation logs
        │   └── Profile.jsx     # User profile editor
        │
        ├── components/
        │   ├── ImportQuestionsModal.jsx  # Bulk question import UI
        │   └── Loading.jsx              # Loading spinner
        │
        └── utils/              # API helpers, socket utilities
```

---

## 🗄 Data Models

### Room
```js
Room {
  roomID:              String (unique, indexed)
  roomName:            String
  interviewer:         ObjectId -> User
  candidate:           ObjectId -> User | null
  status:              "active" | "closed"
  mode:                "interview" | "practice"
  isTimed:             Boolean
  durationMinutes:     Number | null
  expiresAt:           Date | null
  currentCode:         String
  currentLanguage:     "C++" | "Python" | "Java" | "JavaScript"
  currentQuestion:     ObjectId -> Question | null
  questions:           [ObjectId -> Question]   // archived questions
  settings: {
    videoEnabled:      Boolean
    screenShare:       Boolean
    chatEnabled:       Boolean
    codeExecution:     Boolean
  }
  submissions: [{
    user:              ObjectId -> User
    question:          ObjectId -> Question
    verdict:           String
    code:              String
    language:          String
    createdAt:         Date
  }]
  antiCheatLogs: [{
    event:             String   // e.g. "TAB_SWITCH", "FULLSCREEN_EXIT"
    details:           String
    timestamp:         Date
    severity:          "warning" | "violation"
  }]
  cheatViolationsCount: Number
  createdAt:           Date
}
```

### User
```js
User {
  name:                 String (required)
  email:                String (required, unique)
  password:             String | null
  githubId:             String | null (unique sparse)
  currentRefreshToken:  String | null   // for server-side logout/revocation
  bio:                  String
  company:              String
  location:             String
  skills:               [String]
  role:                 String (default: "interviewer")
  avatar:               String
  createdAt:            Date
}
```

### Question
```js
Question {
  owner:        ObjectId -> User
  qtype:        "public" | "private"
  tag:          "Easy" | "Medium" | "Hard"
  title:        String
  description:  String
  constraints:  String
  timelimit:    Number (seconds, default 2)
  memorylimit:  Number (MB, default 256)  // schema field only; actual sandbox limit is --memory=128m
  sampletcs:    [{ input, output, explanation }]
  hiddentcs:    [{ input, output }]
  createdAt, updatedAt
}
```

### Chat
```js
Chat {
  sender:    ObjectId -> User
  receiver:  ObjectId -> User
  roomId:    ObjectId -> Room
  message:   String
  createdAt: Date
}
```

---

## 📡 API Reference

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/login` | ❌ | Email/password login — sets `accessToken` + `refreshToken` cookies |
| `POST` | `/signup` | ❌ | Register new user |
| `POST` | `/logout` | ❌ | Clears cookies + revokes refresh token in DB |
| `GET` | `/github` | ❌ | Redirect to GitHub OAuth |
| `GET` | `/github/callback` | ❌ | OAuth callback, issues tokens |
| `POST` | `/refresh` | ❌ | Issues new access token (validates refresh token against DB) |
| `PUT` | `/profile` | ✅ | Update user profile fields |

### Room — `/api/room`
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/new` | ✅ | Create a new room |
| `POST` | `/codeTest` | ✅ | Execute code (rate-limited + idempotent) |
| `POST` | `/close/:roomID` | ✅ | Manually close a room |
| `GET` | `/user/all` | ✅ | List all rooms for authenticated user |
| `GET` | `/:roomID` | ✅ | Get room details |
| `GET` | `/questions/:roomID` | ✅ | Get questions in a room |

### Questions — `/api/question`
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | ✅ | Create question |
| `GET` | `/` | ✅ | List user's questions |
| `PUT` | `/:id` | ✅ | Update question |
| `DELETE` | `/:id` | ✅ | Delete question |

### Utility
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | ❌ | Health check: `{ status: "OK" }` |
| `GET` | `/api/me` | ✅ | Current authenticated user |
| `GET` | `/admin/queues` | — | BullMQ dashboard (set `ENABLE_QUEUE_BOARD=true`) |

---

## ⚡ Socket.io Event Map

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomID }` | Join a room, receive history + state |
| `code-change` | `{ code }` | Broadcast code update to room |
| `language-change` | `{ language }` | Broadcast language change |
| `chat` | `{ message }` | Send a chat message |
| `select-question` | `{ questionId }` | Set active question (interviewer only) |
| `anti-cheat-violation` | `{ event, details, severity }` | Report a proctoring violation |
| `candidate-left-fullscreen` | — | Legacy fullscreen exit event |
| `interviewer-warn-candidate` | `{ message }` | Send warning to candidate |
| `interviewer-disqualify-candidate` | `{ reason }` | Close room, end session |
| `end-session` | — | End session (interviewer/practice) |
| `webrtc-offer` | `offer` | Forward WebRTC offer |
| `webrtc-answer` | `answer` | Forward WebRTC answer |
| `webrtc-ice` | `candidate` | Forward ICE candidate |
| `screen-share-start` | — | Notify peers of screen share start |
| `screen-share-stop` | — | Notify peers of screen share stop |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `joined-successfully` | `{ role, roomID, currentLanguage, mode, isTimed, ... }` | Join confirmation with room state |
| `code-update` | `{ code, sender }` | Peer's code change |
| `language-update` | `{ language, sender }` | Peer's language change |
| `question-selected` | `{ question }` | Active question data |
| `chat` | `{ sender, message }` | Incoming chat message |
| `chat-history` | `[messages]` | Full chat on join |
| `candidate-violation-alert` | `{ event, details, timestamp, totalViolations }` | Alert to interviewer |
| `candidate-left-fullscreen-alert` | same as above | Legacy alias |
| `candidate-warning` | `{ message }` | Warning to candidate |
| `anti-cheat-status` | `{ totalViolations, lastViolation }` | Strike count to candidate |
| `session-ended` | `{ reason? }` | Session closed |
| `start-call` | — | Trigger WebRTC call initiation |
| `webrtc-offer/answer/ice` | — | Forwarded WebRTC signaling |
| `screen-share-start/stop` | — | Screen share state |
| `error-message` | `String` | Error from any handler |

---

## 🔐 Security & Sandbox

Every code execution runs inside a Docker container with a hardened profile:

```bash
docker run \
  --rm                    # auto-remove after exit
  --log-driver=none       # no log disk I/O overhead
  --memory=128m           # 128MB RAM hard limit
  --memory-swap=128m      # swap disabled — fail fast, not thrash
  --cpus=0.5              # max 1/2 CPU core
  --pids-limit=32         # blocks fork bombs (max 32 processes)
  --network=none          # no internet access (SSRF-proof)
  --read-only             # root filesystem is immutable
  --tmpfs /tmp            # writable scratch at /tmp only
  -i                      # accept stdin for test case input
  <image> sh -c "timeout -s 9 <timelimit> <binary>"
```

**Native fallback (Linux without Docker-in-Docker):**
```bash
ulimit -v 524288 -f 65536 -u 64 -t <sec>
timeout -s 9 <sec> <binary>
```

### Security Test Results

| # | Attack | Result |
|---|---|---|
| 1 | Infinite loop (Python) — CPU exhaustion | ✅ PASS — TLE, terminated within timeout |
| 2 | Infinite loop (C++) — compiler/CPU limit | ✅ PASS — TLE, sandbox watchdog killed it |
| 3 | 1GB memory allocation — OOM attack | ✅ PASS — RE, OOM killed (128MB limit enforced) |
| 4 | Fork bomb (100 forks) | ✅ PASS — pids-limit=32 contained it |
| 5 | SSRF / network egress | ✅ PASS — `--network=none` blocked connection |
| 6 | Root filesystem write (`/bin/malicious`) | ✅ PASS — `--read-only` denied the write |

Run the tests:
```bash
cd server
npm run test:security
```

---

## 🕵️ Anti-Cheat & Proctoring Engine

The anti-cheat system has **two independent layers** — tampering with the client does not defeat the server.

### Layer 1 — Client-Side Detection (`Interview.jsx`)

| Signal | Detection |
|---|---|
| Fullscreen exit | `fullscreenchange` / `webkitfullscreenchange` DOM events |
| Tab switch | `visibilitychange` → `document.hidden === true` |
| Window blur | `blur` event on `window` |
| Alt+Tab / OS switch | Caught by blur + visibility change combination |
| Suspicious paste | Large clipboard pastes flagged |
| DevTools open | Window size anomaly detection |
| Right-click | `contextmenu` event blocked |
| Copy shortcuts | `Ctrl+C` / `Cmd+C` monitored |

Each violation is assigned a **severity** (`warning` / `violation`) and emitted to the server via `anti-cheat-violation`. A grace period prevents false positives on reconnect.

### Layer 2 — Server-Side Enforcement (`roomSocket.js`)

The server **never trusts the client**:

- All violations are **persisted to MongoDB** (`room.antiCheatLogs[]`)
- `cheatViolationsCount` is atomically incremented via `$inc`
- Violation payload is **broadcast to the interviewer** in real time via Redis pub/sub
- Interviewer actions available:
  - **Warn candidate** → `interviewer-warn-candidate` (emits `candidate-warning`)
  - **Disqualify** → `interviewer-disqualify-candidate` (closes room for all)
- All logs are viewable in the **Manage page** audit trail

**Honest limits:** Patching frontend JS does not defeat server-side logging — violations are persisted to MongoDB regardless of what the client does, and the interviewer always has the full audit trail. However, this system cannot detect cheating that happens entirely off-device (e.g., consulting a second laptop or phone). The proctoring layer raises the cost of cheating and provides a real audit log; it is not a tamper-proof guarantee.

---

## 📈 Horizontal Scaling

Socket.io scales across multiple backend instances using the `@socket.io/redis-adapter`.

```
Instance A (port 5051)     Redis Pub/Sub      Instance B (port 5052)
       |                   <==========>              |
       | <-- Interviewer                  Candidate --> |
       |                                              |
       | -- code-change --------- fan-out ----------> |
       | <-- anti-cheat-violation -- fan-out --------- |
```

**How it works:**
- Two dedicated Redis clients per instance: `pubClient` + `subClient` (duplicate)
- All `io.to(roomID).emit(...)` calls fan out transparently via Redis
- `io.in(roomID).fetchSockets()` works cross-instance — used to detect when both users are present
- Idle Upstash socket EPIPE/ECONNRESET errors are silently suppressed

### Load Test Results

| Metric | Result |
|---|---|
| Cross-instance routing | ✅ Verified (Code sync A→B, Violation sync B→A) |
| Concurrent rooms | 25 rooms (50 active sockets) |
| All sockets joined | < 2 seconds |
| Message propagation (avg) | ~8ms (n=25, single machine, loopback) |
| Message propagation (P95) | ~15ms (n=25 — small sample, indicative only) |
| Concurrent code executions | 12 simultaneous (Python + JS + C++) |
| Execution success rate | 100% |
| Average execution time | ~2,800ms (C++ compile + run) |
| Throughput | ~0.4 executions/sec (Docker I/O bound on single worker) |

Run the load test:
```bash
cd server
npm run test:load
```

---

## 🧪 Testing

### Security Sandbox Test
```bash
cd server
npm run test:security
```
Runs 6 attack scenarios against the live sandbox (Docker required). Tests: TLE enforcement, OOM enforcement, fork bomb containment, network isolation, read-only filesystem.

### Load & Scaling Test
```bash
cd server
npm run test:load
```
Spins up 2 independent Socket.io server instances, verifies cross-instance event propagation (code sync + anti-cheat), then stress-tests 25 concurrent rooms and 12 concurrent code executions with full metrics report.

---

## 🌍 Environment Variables

### API Service (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string (Atlas or local `mongodb://127.0.0.1:27017/codebridge`) |
| `ACCESS_SECRET` | ✅ | JWT access token signing secret |
| `REFRESH_SECRET` | ✅ | JWT refresh token signing secret |
| `REDIS_URL` | ✅ | Redis URL (`redis://` local or `rediss://` for Upstash TLS) |
| `FRONTEND_URL` | ✅ | Allowed CORS origins (comma-separated) |
| `BACKEND_URL` | ✅ | This server's public URL (used in GitHub OAuth callback) |
| `GITHUB_CLIENT_ID` | ⬜ | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ⬜ | GitHub OAuth App client secret |
| `ENABLE_QUEUE_BOARD` | ⬜ | `true` to enable BullMQ dashboard at `/admin/queues` |

### Execution Service (`execution-service/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | Same MongoDB URI as API service (used to update submission results) |
| `REDIS_URL` | ✅ | Same Redis URL as API service (used to pull jobs from BullMQ) |
| `EXECUTION_RUNNER` | ⬜ | `docker` (strict Docker isolation), `native` (ulimit sandbox), or `auto` (default) |
| `WORKER_CONCURRENCY`| ⬜ | Max simultaneous jobs (default: `1` to prevent memory exhaustion) |

### Frontend (`Frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Backend base URL (e.g. `http://localhost:5000`) |
| `VITE_FRONTEND_URL` | Frontend URL (used for OAuth redirects) |

---

## ⚡ Quick Start (Development)

### Prerequisites
- Node.js 20+
- Docker Desktop (for containerized execution) or local compilers (`g++`, `python3`)
- MongoDB (Atlas free tier or local)
- Redis (Upstash free tier or local)

### 1. Clone & Install

```bash
git clone https://github.com/avadhesh11/CodeBridge.git
cd CodeBridge

cd server && npm install
cd ../execution-service && npm install
cd ../Frontend && npm install
```

### 2. Configure Environment

Copy `.env.example` templates to `.env` in `server` and `execution-service`:
```bash
cp server/.env.example server/.env
cp execution-service/.env.example execution-service/.env
```
*(Populate with your MongoDB and Redis connection strings).*

### 3. Start All 3 Services

```bash
# Terminal 1 — API Server (Express + Socket.io)
cd server && npm run dev

# Terminal 2 — Execution Worker (BullMQ + Docker sandbox)
cd execution-service && npm run dev

# Terminal 3 — Frontend (React + Vite)
cd Frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🐳 Docker Deployment

Run the complete distributed stack with a single command:

```bash
docker compose up --build
```

| Service | Port | Description |
|---|---|---|
| `frontend` | `3000` | React app served via Nginx |
| `api` | `5000` | Express REST API + Socket.io |
| `worker` | — | Background execution worker connected to host Docker socket |
| `mongo` | `27017` | MongoDB with persistent volume |
| `redis` | `6379` | Redis for BullMQ queues and pub/sub |

All instances share the same Redis adapter and MongoDB, so state is consistent across all replicas.

---

## 📝 Notes

- **Python on Windows:** Native Python execution (without Docker) requires `python` or `python3` in PATH. Docker mode is strongly recommended on Windows.
- **Room timers in multi-instance:** `roomTimers` is an in-memory map per process. In a scaled deployment, only the instance that served the `join-room` will hold the timer. For strict cross-instance timer sync, a Redis-based scheduler (e.g. BullMQ delayed job) is the right upgrade path.
- **BullMQ concurrency = 1:** This is intentional. Each execution job spawns Docker containers; running multiple containers in parallel on a 512MB host (e.g. Render free tier) risks OOM-killing the server. One job at a time = stable.
- **Upstash compatibility:** `queueService.js` auto-detects Upstash URLs and upgrades `redis://` → `rediss://` for TLS. Idle connection EPIPE/ECONNRESET noise is silently suppressed.

---

<div align="center">
  <p>Built by <strong>Avadhesh Nagar</strong></p>
</div>
