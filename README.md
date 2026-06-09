# 🔥 Fire Detection System

AI-powered image classification: **Fire · Smoke · Non-Fire**

---

## Project Structure

```
Fire Detection System UI/
├── backend/                  ← Flask API
│   ├── app.py
│   ├── requirements.txt
│   └── fire_detection_v1.keras   ← ⚠️ Copy your model here!
└── src/                      ← React + Vite frontend
    └── app/
        ├── pages/
        │   ├── DetectionPage.tsx
        │   └── HistoryPage.tsx
        └── lib/
            ├── detectionService.ts   ← API integration
            └── historyStorage.ts     ← localStorage
```

---

## ⚙️ Setup

### 1 — Copy your model

```
backend/fire_detection_v1.keras
```

### 2 — Backend (Flask)

```bash
cd backend

# Create virtual environment (once)
python -m venv venv
venv\Scripts\activate      # Windows

# Install dependencies (once)
pip install -r requirements.txt

# Run
python app.py
# → http://localhost:5000
```

### 3 — Frontend (React + Vite)

```bash
# From the project root (Fire Detection System UI/)

# Install dependencies (once)
npm install   # or pnpm install

# Run dev server
npm run dev
# → http://localhost:5173
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Backend health check + model status |
| POST | `/api/predict` | Upload image → prediction |
| GET | `/api/history` | Retrieve all history |
| DELETE | `/api/history` | Clear all history |
| DELETE | `/api/history/:id` | Delete single record |

---

## 🧠 Model Details

| Property | Value |
|----------|-------|
| File | `fire_detection_v1.keras` |
| Input | 128 × 128 × 3 |
| Classes | fire, non_fire, smoke |
| Accuracy | 94% |

---

## 💡 Demo Mode

If the Flask backend is not running, the app automatically falls back to **demo mode** — predictions are simulated locally and a banner is shown to the user.