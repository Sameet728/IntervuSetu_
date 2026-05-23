# 🎙️ AI Interview Platform — Backend

Production-ready Node.js backend for a voice-based AI interview platform powered by Google Gemini.

---

## 🗂️ Project Structure

```
interview-backend/
├── server.js                        # Entry point — HTTP + WebSocket bootstrap
├── .env.example                     # Environment variables template
├── package.json
└── src/
    ├── app.js                       # Express app (middleware, routes)
    ├── config/
    │   └── db.js                    # MongoDB connection
    ├── models/
    │   ├── User.js                  # User schema
    │   ├── Interview.js             # Interview + questions + transcript + proctoring
    │   └── Report.js                # Final report schema
    ├── services/
    │   ├── geminiService.js         # All Gemini AI calls
    │   ├── interviewService.js      # Interview state machine
    │   ├── evaluationService.js     # Answer scoring + follow-up logic
    │   ├── memoryService.js         # Short-term + long-term context memory
    │   └── reportService.js         # Report builder
    ├── sockets/
    │   └── interviewSocket.js       # WebSocket engine (real-time interview)
    ├── controllers/
    │   ├── authController.js
    │   ├── interviewController.js
    │   └── reportController.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── interviewRoutes.js
    │   └── reportRoutes.js
    ├── middlewares/
    │   ├── authMiddleware.js        # JWT protect
    │   ├── errorMiddleware.js       # Global error handler
    │   └── validationMiddleware.js  # express-validator rules
    └── utils/
        ├── pdfGenerator.js          # PDFKit report generator
        ├── timerUtils.js
        ├── asyncHandler.js
        └── apiResponse.js
```

---

## ⚙️ Setup

### 1. Clone & Install

```bash
git clone <repo>
cd interview-backend
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/ai_interview_platform
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
MAX_VIOLATIONS=3
MAX_FOLLOWUPS_PER_QUESTION=3
```

### 3. Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## 🌐 REST API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Get current user (protected) |

**Register body:**
```json
{ "name": "Arjun", "email": "arjun@email.com", "password": "secure123" }
```

**Login response:**
```json
{ "success": true, "token": "eyJ...", "user": { "id": "...", "name": "...", "email": "..." } }
```

---

### Interviews

All routes require `Authorization: Bearer <token>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interviews/create` | Create interview, generate questions |
| GET | `/api/interviews` | List user's interviews |
| GET | `/api/interviews/:id` | Get interview details |
| GET | `/api/interviews/:id/transcript` | Get full transcript |
| POST | `/api/interviews/:id/submit` | Manually submit interview |
| DELETE | `/api/interviews/:id` | Delete interview |

**Create interview body:**
```json
{
  "role": "Backend Developer",
  "experienceLevel": "mid",
  "techStack": ["Node.js", "MongoDB", "Redis"],
  "questionCount": 8
}
```

**Experience levels:** `fresher | junior | mid | senior | lead`

**Create response:**
```json
{
  "success": true,
  "data": {
    "interviewId": "664abc...",
    "totalQuestions": 8,
    "questions": [
      {
        "questionId": "q1",
        "question": "Explain the Node.js event loop.",
        "questionType": "theory",
        "difficulty": "medium",
        "topic": "Node.js Internals"
      }
    ]
  }
}
```

**Question types:** `code | theory | hr | system_design | behavioral`

---

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/user/history` | All reports for user |
| GET | `/api/reports/:interviewId` | Get report JSON |
| GET | `/api/reports/:interviewId/pdf` | Download PDF report |

**Report JSON structure:**
```json
{
  "overallScore": 7.5,
  "communicationScore": 8,
  "technicalScore": 7,
  "problemSolvingScore": 8,
  "hrScore": 7,
  "recommendation": "hire",
  "overallFeedback": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "questionBreakdown": [...],
  "totalTimeTaken": 1840,
  "averageTimePerQuestion": 230,
  "violationCount": 0,
  "autoSubmitted": false
}
```

---

## 📡 WebSocket Protocol

Connect to:
```
ws://localhost:5000/ws/interview?token=<JWT>&interviewId=<id>
```

All messages are JSON: `{ "type": "EVENT_NAME", "payload": { ... } }`

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `START_INTERVIEW` | `{ candidateName }` | Begin interview session |
| `QUESTION_STARTED` | `{ questionId }` | Mark question as active (start timer) |
| `SUBMIT_ANSWER` | `{ userAnswer, code? }` | Submit answer (voice STT text or code) |
| `PROCTORING_VIOLATION` | `{ violationType, details? }` | Report proctoring event |
| `TIMER_UPDATE` | `{ questionTimeTaken, totalTimeTaken }` | Heartbeat timer sync (every 5s) |
| `GET_STATE` | `{}` | Get current interview state |
| `PING` | `{}` | Keepalive ping |

**Violation types:** `no_face | multiple_faces | fullscreen_exit | tab_switch | focus_lost`

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ interviewId }` | Connection established |
| `INTERVIEW_STARTED` | `{ greeting, firstQuestion, totalQuestions }` | Interview begins |
| `QUESTION_ACKNOWLEDGED` | `{ questionId }` | Question timer started |
| `PROCESSING` | `{ message }` | Answer being evaluated |
| `FOLLOWUP_QUESTION` | `{ question, evaluation }` | Follow-up needed |
| `NEXT_QUESTION` | `{ question, questionIndex, totalQuestions, prevEvaluation }` | Move to next |
| `INTERVIEW_COMPLETE` | `{ message, evaluation }` | All questions done |
| `VIOLATION_RECORDED` | `{ violationCount, remainingChances, warning }` | Violation logged |
| `INTERVIEW_AUTO_SUBMITTED` | `{ message, violationCount }` | Auto-submitted (3 violations) |
| `CURRENT_STATE` | question state | Response to GET_STATE |
| `PONG` | `{ timestamp }` | Response to PING |
| `error` | `{ message }` | Error response |

---

## 🧠 Interview Flow

```
Frontend connects via WebSocket
        ↓
Client sends START_INTERVIEW
        ↓
Server: generates greeting (Gemini) → sends INTERVIEW_STARTED
        ↓
Client sends QUESTION_STARTED (start timer)
        ↓
[User answers via STT → client sends SUBMIT_ANSWER]
        ↓
Server evaluates answer (Gemini)
  Score >= 8?  → NEXT_QUESTION
  Score 5–7?   → 1× FOLLOWUP_QUESTION
  Score 3–4?   → 2× FOLLOWUP_QUESTION
  Score < 3?   → 3× FOLLOWUP_QUESTION
        ↓
Last question completed → INTERVIEW_COMPLETE
        ↓
Report generated asynchronously
```

---

## 🧠 Context Memory System

```
shortTermMemory  = last 3 Q/A verbatim (sent to Gemini every call)
longTermSummary  = compressed summary of older Q/A (Gemini-generated)

Gemini prompt structure:
  [System prompt]
  [Long-term summary]
  [Last 3 Q/A]
  [Current question + answer]
```

When `shortTermMemory` exceeds 3 entries, the oldest is summarized into `longTermSummary`. This keeps token usage minimal while preserving full context.

---

## 🔒 Proctoring System

Frontend sends violations via WebSocket `PROCTORING_VIOLATION` event.

- Each violation is stored with type + timestamp
- Counter increments per violation
- At **3 violations** → interview auto-submits
- Violations included in final report

Recommended frontend triggers:
- **no_face** → face-api.js / MediaPipe detects no face
- **multiple_faces** → more than 1 face in frame
- **fullscreen_exit** → `document.fullscreenElement` becomes null
- **tab_switch** → `document.visibilitychange` / `blur` event
- **focus_lost** → `window.blur`

---

## 📊 Follow-up Logic

| Score | Follow-ups Allowed |
|-------|--------------------|
| 8–10  | 0 (move on) |
| 5–7   | 1 |
| 3–4   | 2 |
| 0–2   | 3 |

---

## 📄 PDF Report

Downloaded via `GET /api/reports/:interviewId/pdf`

Includes:
- Header with role + date
- Overall score (color-coded)
- Recommendation label
- Score breakdown bars (Technical, Communication, Problem Solving, HR)
- Strengths & Weaknesses columns
- Per-question analysis with score, feedback, ideal answer, time taken
- Timing stats + violation summary

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Real-time | WebSockets (ws) |
| Auth | JWT (jsonwebtoken) |
| AI | Google Gemini 1.5 Flash/Pro |
| PDF | PDFKit |
| Security | Helmet, CORS, express-rate-limit |
| Validation | express-validator |
