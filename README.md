# ManageFIRE

A full-stack platform for managing your journey to Financial Independence, Retire Early (FIRE).

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Python + FastAPI + uvicorn |
| Auth & DB | Supabase (PostgreSQL + Auth) |
| Charts | Recharts |

---

## Features

### Tools

| Tool | Description |
|------|-------------|
| **FIRE Calculator** | Project your FIRE date from savings, contributions, expenses, and expected return. Supports multiple account types (taxable, traditional, Roth), contribution frequencies (monthly/biweekly/semi-monthly), annual caps, and one-time life events (windfalls, contribution changes). Includes Monte Carlo simulation with configurable volatility. |
| **Rent vs. Buy Calculator** | 30-year side-by-side comparison of renting vs. buying. Factors in mortgage P&I, PMI, property tax (state-specific), HOA, maintenance, home appreciation, and opportunity cost on the down payment. Calculates break-even year and net-worth difference. |
| **House Affordability Calculator** | Income-based max home price estimate using front-end (28%) and back-end (36%) DTI ratios. Accounts for credit score, mortgage term, state property taxes, down payment, closing costs, roommate income, and 4 affordability tiers (2.5×–5× income). |
| **Career Offer Simulator** | Compare up to 3 job offers with a full after-tax breakdown — base, bonus, signing, RSU vesting (5 schedules including Amazon's 5/15/40/40% backload), 401(k) pre-tax, federal/state/FICA taxes — across all 4 vesting years. |
| **FIRE Flowchart** | Step-by-step decision-tree covering all 8 phases of optimal FIRE planning (budgeting, emergency fund, debt elimination, HSA, IRA, tax-advantaged accounts, after-tax investing, final optimizations). Includes interactive task checklists and both a steps view and a visual chart view. |

### Platform

- **Dashboard** — Overview of your FI number, FIRE progress, FIRE age, and CoastFIRE number from your most recent calculation. Shows saved snapshots from all calculators.
- **Save to Dashboard** — Any calculator result can be saved as a named snapshot and recalled on the dashboard.
- **Profile** — Display name, FIRE type preference (LeanFIRE / FIRE / FatFIRE / CoastFIRE), and account info.
- **Auth** — Email/password via Supabase; JWT validated on every protected backend route.

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

## Testing

Tests run without a `.env` file or a live Supabase instance — all external dependencies are mocked or bypassed via FastAPI's `dependency_overrides`.

### Backend (pytest)

```bash
cd backend
pip install -r requirements-dev.txt   # pytest + httpx (one-time)
python -m pytest tests/ -v
```

**73 tests across 3 files:**

| File | Covers |
|------|--------|
| `tests/test_fire_calculations.py` | Pure service-layer math — FI number, projections, CoastFIRE, PMT formula, monthly needed, performance |
| `tests/test_api.py` | API integration — `/fire/calculate` happy path & validation (422), `/health`, auth rejection (403/401) for all protected routes |
| `tests/test_snapshots_profile.py` | Snapshots & profile routes — GET/POST/DELETE happy path (Supabase mocked), Pydantic validation, auth rejection |

### Frontend (Vitest + Testing Library)

```bash
cd frontend
npm test            # single run
npm run test:watch  # watch mode
npm run test:coverage
```

**134 tests across 7 files:**

| File | Covers |
|------|--------|
| `utils/fireCalculations.test.ts` | `accountEffectiveMonthly`, `calculateFire`, `formatCurrency`, Monte Carlo shape, performance |
| `utils/rentBuyCalculations.test.ts` | `getState`, `getMonthlyCostBreakdown` (P&I formula, PMI, cost sums), `calculateRentVsBuy` |
| `utils/houseAffordabilityCalculations.test.ts` | `getEstimatedRate`, `getDefaultPropertyTaxRate`, `calculateHouseAffordability` (income, DTI, tiers, verdicts, upfront costs) |
| `utils/offerSimulatorCalculations.test.ts` | `applyBrackets`, `calcFederalTax`, `calcStateTax`, `calcFica` (SS cap, Medicare surtax), `rsuVest` (all 5 schedules), `calcYear` |
| `components/StatCard.test.tsx` | Label/value/subtext rendering, trend color classes |
| `components/HintTooltip.test.tsx` | Portal rendering, show on hover, hide on unhover |
| `pages/FireFlowchart.test.tsx` | All 8 section labels, Steps/Chart view toggle, node card expansion, task completion |

---

## Project Structure

```
manage-fire/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS + route registration
│   │   ├── config.py            # Settings from .env (empty-string defaults enable test runs)
│   │   ├── dependencies.py      # JWT auth via Supabase (HTTPBearer)
│   │   ├── routes/
│   │   │   ├── fire.py          # POST /api/fire/calculate
│   │   │   ├── profile.py       # GET/PATCH /api/profile/me, scenarios CRUD
│   │   │   └── snapshots.py     # GET/POST/DELETE /api/snapshots
│   │   ├── schemas/
│   │   │   ├── fire.py          # FireCalculationInput (Pydantic, with field constraints)
│   │   │   ├── profile.py       # ProfileUpdate, ScenarioCreate
│   │   │   └── snapshots.py     # SnapshotCreate (CalculatorType enum)
│   │   └── services/
│   │       └── fire_calculations.py  # Pure FIRE math (FI number, projections, CoastFIRE)
│   ├── tests/
│   │   ├── conftest.py          # client / unauthed_client pytest fixtures
│   │   ├── test_fire_calculations.py
│   │   ├── test_api.py
│   │   └── test_snapshots_profile.py
│   ├── requirements.txt
│   ├── requirements-dev.txt     # pytest + httpx (test-only deps)
│   └── run.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── AuthPage.tsx
│       │   ├── Dashboard.tsx
│       │   ├── FireCalculator.tsx
│       │   ├── RentBuyCalculator.tsx
│       │   ├── HouseAffordabilityCalculator.tsx
│       │   ├── OfferSimulator.tsx
│       │   ├── FireFlowchart.tsx
│       │   └── Profile.tsx
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── Sidebar.tsx
│       │   ├── ProtectedRoute.tsx
│       │   ├── StatCard.tsx
│       │   └── HintTooltip.tsx
│       ├── utils/
│       │   ├── fireCalculations.ts             # FIRE projections, Monte Carlo, formatters
│       │   ├── rentBuyCalculations.ts          # Rent vs. Buy 30-year model
│       │   ├── houseAffordabilityCalculations.ts  # DTI-based max price
│       │   └── offerSimulatorCalculations.ts   # Tax brackets, FICA, RSU vesting
│       ├── __tests__/
│       │   ├── utils/         # Pure unit tests (no DOM)
│       │   ├── components/    # React Testing Library component tests
│       │   └── pages/         # Page-level component tests
│       ├── hooks/useAuth.ts
│       ├── lib/               # Supabase client, API helpers (saveSnapshot, etc.)
│       ├── test/setup.ts      # @testing-library/jest-dom matchers
│       ├── types/             # Shared TypeScript types
│       └── vitest.config.ts
├── supabase/
│   └── schema.sql             # Tables, RLS policies, triggers
└── README.md
```

---

## Architecture Notes

- **Calculations run on the frontend** — all math lives in `src/utils/` for instant, server-free results. Functions are pure (no side effects), which makes them directly unit-testable. The backend `/fire/calculate` endpoint mirrors the FIRE math for future server-side use.
- **Auth is Supabase-first** — the frontend uses the Supabase JS client directly for login/signup. The backend validates the issued JWT (`HS256`, audience `"authenticated"`) on all protected routes via `HTTPBearer`.
- **Snapshots persist to Supabase** — any calculator result can be saved via `POST /api/snapshots`. The dashboard fetches snapshots via `GET /api/snapshots` and renders them as cards.
- **Test isolation** — backend tests bypass auth via `app.dependency_overrides[get_current_user]`; Supabase calls in snapshot/profile routes are mocked with `unittest.mock.patch`. Frontend tests use `jsdom` and `@testing-library/user-event` for DOM interactions including portal-based tooltips.

---

## FIRE Math Reference

| Concept | Formula |
|---------|---------|
| FI Number | `Annual Expenses × (100 / Withdrawal Rate)` |
| 4% Rule FI Number | `Annual Expenses × 25` |
| CoastFIRE Number | `FI Number / (1 + r)^years_to_retirement` |
| Monthly contribution needed | Time-value of money annuity PMT formula |
| Max home price (front-end) | `(Gross Monthly Income × 0.28 − Insurance − Tax − HOA) / P&I factor` |
| After-tax income | `Gross − 401(k) − Federal Tax − State Tax − FICA` |

> Not financial advice. Consult a qualified financial advisor before making investment decisions.
