# EmoSense - Full-Stack AI-Powered Facial Emotion Recognition System

**EmoSense** is a full-stack, real-time emotion recognition application capable of classifying 7 core facial emotions (*angry, disgust, fear, happy, neutral, sad, surprise*) from live webcam video streams and uploaded images.

It provides domain-specific analytical views tailored for **Education**, **Healthcare**, and **Customer Experience**, powered by a Python FastAPI deep learning microservice, Node.js + Express backend, MongoDB, Socket.io, and a React (Vite) frontend.

---

## System Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │                React (Vite + TS + Tailwind)                 │
 │            Webcam (MediaDevices), Canvas HUD, Recharts      │
 └───────────────┬─────────────────────────────┬───────────────┘
                 │ HTTP REST                   │ WebSockets (Socket.io)
                 ▼                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │             Node.js + Express + TypeScript Backend          │
 │            Auth, Session Manager, Emotion Routes            │
 └───────────────┬─────────────────────────────┬───────────────┘
                 │ Mongoose                    │ Axios HTTP
                 ▼                             ▼
 ┌─────────────────────────────┐  ┌────────────────────────────┐
 │      MongoDB Database       │  │  Python FastAPI Microservice│
 │ (Users, Sessions, Logs)     │  │  OpenCV + PyTorch CNN      │
 └─────────────────────────────┘  └────────────────────────────┘
```

---

## Directory Structure

```
.
├── frontend/             # React + Vite + TypeScript + Tailwind CSS
├── backend/              # Node.js + Express + TypeScript + Socket.io + Mongoose
├── ai-service/           # Python FastAPI microservice (OpenCV + PyTorch)
├── docker-compose.yml    # Multi-container orchestrator
└── README.md
```

---

## Quick Start & Local Execution

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- MongoDB (Running locally on `mongodb://localhost:27017` or via Docker)

---

### 1. Running the AI Microservice (Python FastAPI)

```bash
cd ai-service

# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --reload --port 8000
```
- Health Check: Access `http://localhost:8000/health`
- Pytest Suite: Run `pytest` inside `ai-service/`

---

### 2. Running the Express Backend (Node.js + TypeScript)

```bash
cd backend

# Install dependencies
npm install

# Build & Run in development mode (port 5000)
npm run dev

# Run unit/integration tests
npm test
```

---

### 3. Running the Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server (port 5173)
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## Docker Deployment (Docker Compose)

To launch the entire stack (MongoDB, AI Microservice, Backend) simultaneously with Docker:

```bash
docker-compose up --build
```

Services will be accessible at:
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **FastAPI AI Microservice**: `http://localhost:8000`
- **MongoDB**: `localhost:27017`

---

## Plugging In Trained Model Weights

The AI microservice is architected to dynamically detect fine-tuned PyTorch model weights:

1. Place your trained PyTorch `.pth` weights file (fine-tuned on FER-2013 or AffectNet) into:
   ```
   ai-service/app/models/fer2013_model.pth
   ```
2. When the FastAPI microservice starts up, `app/emotion_model.py` automatically checks for `app/models/fer2013_model.pth`.
3. If present, it executes deep PyTorch GPU/CPU neural inference. If absent, it automatically uses the built-in rule-assisted face detection fallback engine.

---

## Features & Domain Views

1. **Live Webcam Streaming (`/live`)**:
   - Captures frame buffers via canvas and streams base64 data over Socket.io every 300ms.
   - Overlays face bounding box + live emotion badge + confidence score bar.
   - Real-time 30-second emotion telemetry line chart powered by Recharts.

2. **Upload Image Analysis (`/upload`)**:
   - Drag and drop static portrait photographs.
   - Instant 7-class softmax probability breakdown and optional session log save.

3. **Global Dashboard (`/dashboard`)**:
   - View past session logs with dominant emotion badges, context tags, and duration.
   - Drill down into specific session time-series charts and variability scores.

4. **Domain Views**:
   - **Education (`/domain/education`)**: Student engagement index & classroom confusion tracking.
   - **Healthcare (`/domain/healthcare`)**: Patient longitudinal mood trend analyzer across multiple therapy sessions.
   - **Customer (`/domain/customer`)**: Call sentiment timeline review with high-frustration segment highlighting.

5. **User Profile & Privacy (`/profile`)**:
   - Role switcher (`student`, `teacher`, `therapist`, `agent`, `admin`).
   - Auto-delete session logs setting (e.g., purge logs older than N days).

---

## License & Credits

Built with ❤️ by Antigravity AI using React, Vite, Tailwind CSS, Node.js, Express, Socket.io, Mongoose, and Python FastAPI.
