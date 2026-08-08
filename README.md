# 🚨 NagarHelp - Unified Emergency Response & Civic Issue Platform

> **Comprehensive platform combining emergency response, community care, and civic issue reporting**

**Hackathon:** AlgOlympia 
**Team:** AlgoForge

![Tech Stack](https://img.shields.io/badge/Stack-MERN%20%2B%20Firebase%20%2B%20Socket.io%20%2B%20Gemini-blue)
![Status](https://img.shields.io/badge/Status-Production%20Ready-green)

🔗 **Live Project**: [https://nagar-help.vercel.app](https://nagar-help.vercel.app)

video link : Demonstration video link : https://drive.google.com/file/d/1jaU6E9BTgL9wB1zL0auArJM1zJZrhN7S/view?usp=sharing

## 🌐 Live Deployment

- **Frontend (Vercel)**: https://nagar-help.vercel.app

> Note: The backend runs on Render's free tier, which spins down after inactivity — the first request after idle time may take 30-50 seconds to respond while the instance wakes up.

## 🎯 Overview

NagarHelp combines two powerful systems into one unified platform:

1. **Emergency Response System** - Connect people in crisis with nearby responders instantly.
2. **Civic Issue Reporting** - Report and verify infrastructure issues (potholes, garbage, etc.) natively via the Web App or automatically through our WhatsApp Bot.

---

## 🌟 Features

### 🚑 Emergency Response
- **Real-Time SOS Alert System**: Send emergency alerts to nearby responders via WebSockets.
- **Multichannel Broadcasting**: Responders receive instant in-app alerts AND fallback WhatsApp notifications.
- **Resource Map**: Locate nearby emergency resources (hospitals, police stations, fire departments).
- **Guardian Mode**: Designate personal guardians to monitor your safety. Guardians are prioritized and notified first during an SOS via WhatsApp and Web.
- **AI Crisis Chat**: AI-powered chatbot for real-time crisis support and guidance.
- **Offline SOS Queue**: Queue SOS alerts when offline; they dispatch automatically when connection is restored.
- **Welfare Checks**: Automated follow-up checks after emergency events.

### 📱 Civic Issue Reporting
- **WhatsApp Bot Integration**: Report issues without downloading the app by simply texting our WhatsApp Bot (powered by Whapi.cloud).
- **AI Multimodal Verification**: Images submitted via WhatsApp are instantly analyzed by Google Gemini 1.5 Flash Vision to verify authenticity and reject fake reports.
- **Custom-Trained Image Classifier**: A MobileNetV2-based TensorFlow.js model, trained on 28,000+ images across pothole, garbage, water-related issues, and negative samples, runs server-side to verify that uploaded photos genuinely match the reported issue category.
- **Live Admin Dashboard**: Real-time incident map with filters and verification controls for authorities.
- **Automated Citizen Updates**: Receive automatic WhatsApp notifications when the Admin verifies or resolves your reported issue.
- **Community Engagement**: Upvote, comment, and track issue resolution on the public feed.
- **Smart Categorization**: Auto-categorize issues into Pothole, Garbage, Safety, Waterlogging, Streetlight,or Drainage.

### 🔐 Shared Features
- **Secure Authentication**: Passwordless Phone/Google login powered by Firebase Auth, with secure JWT token verification on the backend.
- **Geolocation Services**: React Leaflet map integration with Turf.js for complex spatial distance calculations.
- **Media Management**: Robust image uploads managed securely via Firebase Storage.

---

## 🏆 Challenges - Bounties

Additional platform capabilities built to satisfy hackathon round bounty requirements, layered on top of the core Emergency Response and Civic Issue systems above.

### Round 2 Bounties

- **Structured API Validation Layer** — Server-side validation on civic issue submission (title length, category, valid lat/lng), automatic duplicate-report detection (same category within ~75m in the last 7 days), and quality/suspicion flags (e.g. `suspicious_image`, `no_description`, `possible_duplicate`) attached to each report.
- **Status Workflow with Accountability Log** — Every status transition (Draft → Pending → In-Progress → Resolved/Rejected) is recorded with actor, note, and timestamp in a `statusHistory` audit trail, exposed via `GET /api/civic/:issueId/history`.
- **Hotspot Analytics and Trend Dashboard** — Geospatial aggregation clusters nearby reports into grid cells for map-based hotspot visualization (`GET /api/analytics/hotspots`), plus daily/category trend data for charting (`GET /api/analytics/trends`).
- **Real-Time Alerting for Critical Events** — High-priority and safety-critical reports automatically trigger a WhatsApp/email alert to admins, with persistent alert records, read/unread dashboard state, and automatic + manual retry on delivery failure (`GET /api/alerts`, `PATCH /api/alerts/:alertId/read`, `POST /api/alerts/:alertId/retry`).
- **Prediction and Resource Allocation Engine (Elite)** — An explainable prioritization engine that ranks open civic issues using four transparent, weighted factors — severity, report age, community demand (upvotes), and duplicate-report density — returning a numeric score plus a human-readable explanation for each ranked issue (`GET /api/ranking`).

### Round 3 Bounties

- **Attachments on Incidents** — Citizens or reviewers can attach an additional supporting file or link to an existing incident, persisted on the record and shown in the issue detail view (`POST /api/civic/:issueId/attachment`).
- **Role-Aware Incident Filters** — A single endpoint scopes visible incidents to the requesting user's role (citizen, admin, reviewer, investigator, authority, hospital), returning a filtered list with a visible count (`GET /api/civic/my-view`).
- **Project-Specific Report Export** — Generates a downloadable report for a selected incident, reusing its existing captured fields, status history, flags, and attachments — available as a printable HTML report or a CSV file (`GET /api/civic/:issueId/export/html`, `GET /api/civic/:issueId/export/csv`).

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand | Fast, responsive Web UI with centralized state |
| **Backend** | Node.js, Express.js | REST API & Asynchronous Webhook processing |
| **Database** | MongoDB Atlas & Mongoose | Highly scalable NoSQL database with Geospatial `$near` queries |
| **Real-Time** | Socket.io | Low-latency live notifications & dispatcher |
| **Authentication** | Firebase Auth + Admin SDK | Secure user onboarding & token verification |
| **AI Engine** | Google Gemini 1.5 Flash | Multimodal verification and Crisis Chatbot |
| **Image Classification** | TensorFlow.js (MobileNetV2 transfer learning) | Custom-trained model (28,000+ images) for category-matching civic issue photo verification |
| **File Storage** | Firebase Storage | Fast CDN delivery for issue images |
| **Messaging** | Whapi.cloud API | Bidirectional WhatsApp bot & broadcasting |

---

## 📋 Environment Configuration

To run NagarHelp locally, you must provide the following API keys in your `.env` files:

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/nagarhelp
JWT_SECRET=your_jwt_secret

# AI & Processing
GEMINI_API_KEY=your_gemini_api_key

# WhatsApp Integration (Whapi.cloud)
WHAPI_INSTANCE_URL=https://gate.whapi.cloud/instances/YOUR_INSTANCE
WHAPI_TOKEN=your_whapi_token

# Firebase Admin SDK (Service Account JSON)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd NagarHelp

# Install all dependencies
cd frontend && npm install
cd ../backend && npm install
```

### 2. Run Locally

```bash
# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

The application will be available locally at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

(For the live deployed version, see [Live Deployment](#-live-deployment) above.)

---

## 🔗 Core API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user (syncs with Firebase)
- `POST /login` - User login
- `GET /profile` - Get user profile
- `POST /guardians` - Add personal guardian

### Emergency Response (`/api/sos`)
- `POST /` - Trigger SOS alert
- `GET /active` - Get active emergencies
- `PUT /:sosId/resolve` - Resolve emergency

### Civic Issues (`/api/civic`)
- `GET /` - Feed of all civic issues
- `GET /nearby` - Geospatial query for nearby issues
- `POST /` - Report new issue
- `PATCH /:issueId` - Admin verify/resolve issue

### WhatsApp Integration (`/api/whatsapp`)
- `POST /webhook` - Receives incoming WhatsApp messages from citizens
- `POST /notify-status` - Dispatches WhatsApp status updates to reporters

---

**Made with ❤️ by AlgoForge for AlgOlympia**
