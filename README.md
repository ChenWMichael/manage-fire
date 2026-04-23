# ManageFIRE

A full-stack platform for managing your journey to Financial Independence, Retire Early (FIRE).

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Python + FastAPI + uvicorn |
| Auth & DB | Supabase (PostgreSQL + Auth) |
| Charts | Recharts |

## Features (POC)

- **FIRE Calculator** — Input savings, contributions, expenses, and return rate to project your FIRE date with an interactive chart
- **CoastFIRE Calculator** — Find the savings threshold where you can stop contributing and coast to retirement
- **Multiple FIRE Types** — LeanFIRE, FIRE, FatFIRE, CoastFIRE
- **Dashboard** — Overview of your FI number, progress, and FIRE age from your last calculation
- **Auth** — Email/password via Supabase, JWT-validated on the backend

---

## Quick Start

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Note your **Project URL**, **anon key**, **service role key**, and **JWT secret** (Settings → API)

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your Supabase credentials

python run.py
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

**`backend/.env`**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
CORS_ORIGINS=["http://localhost:5173"]
```

### 3. Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Edit .env with your Supabase credentials

npm run dev
# App running at http://localhost:5173
```

**`frontend/.env`**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000/api
```

---

## Project Structure

```
manage-fire/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + CORS
│   │   ├── config.py         # Settings from .env
│   │   ├── dependencies.py   # JWT auth dependency
│   │   ├── routes/
│   │   │   ├── fire.py       # POST /api/fire/calculate
│   │   │   └── profile.py    # Profile & scenario CRUD
│   │   ├── schemas/          # Pydantic models
│   │   └── services/
│   │       └── fire_calculations.py
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── AuthPage.tsx
│       │   ├── Dashboard.tsx
│       │   ├── FireCalculator.tsx
│       │   ├── CoastFireCalculator.tsx
│       │   └── Profile.tsx
│       ├── components/       # Layout, Sidebar, StatCard, ProtectedRoute
│       ├── utils/
│       │   └── fireCalculations.ts   # Client-side math (mirrors backend)
│       ├── hooks/useAuth.ts
│       ├── lib/              # Supabase client, API helpers
│       └── types/            # Shared TypeScript types
├── supabase/
│   └── schema.sql            # Tables, RLS policies, triggers
└── README.md
```

---

## Architecture Notes

- **Calculations run on the frontend** — all FIRE math is done in `fireCalculations.ts` for instant results. The backend endpoint mirrors this for future server-side use.
- **Auth is Supabase-first** — the frontend uses the Supabase JS client directly. The backend validates the JWT on protected routes.
- **Last calculation persisted to `localStorage`** — Dashboard shows most recent results without a DB call.
- **Expandable** — add new tools as new pages + routes. New data types as new Supabase tables + backend routes.

---

## FIRE Math Reference

| Concept | Formula |
|---------|---------|
| FI Number | `Annual Expenses × (100 / Withdrawal Rate)` |
| CoastFIRE Number | `FI Number / (1 + r)^years_to_retirement` |
| 4% Rule FI Number | `Annual Expenses × 25` |
| Monthly contribution needed | Time-value of money annuity formula |

> Not financial advice. Consult a qualified financial advisor before making investment decisions.
