# UK Day-Ahead Wind Forecast & Procurement Analytics Platform

An end-to-end, high-performance web application engineered for UK energy utilities and power procurement desks trading electricity in the **UK Day-Ahead Wholesale Electricity Market** (EPEX SPOT / Nord Pool GB).

The platform ingests national wind generation actuals and multi-horizon forecasts exclusively from **Elexon BMRS** for **January 2026**, accurately reconstructs the point-in-time information baseline at **Day-Ahead Gate Closure (11:00 GMT on D-1)**, and provides quantitative accuracy metrics (MAE, RMSE, Systematic Bias, WAPE, and P10/P90 risk buffers) to optimize thermal power procurement and prevent catastrophic cash-out imbalances.

---

## 1. Directory & File Structure

```
.
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI REST API & static bundle server
│   │   ├── elexon.py            # Elexon data manager & gate closure reconstruction
│   │   └── analytics.py         # Industry-standard accuracy metrics (MAE, RMSE, Bias, WAPE, P10-P90)
│   ├── data/
│   │   └── jan_2026.json        # Pre-cached January 2026 dataset (1,488 SPs, 18,080 forecasts)
│   ├── fetch_jan_data.py        # Automated ETL ingestion pipeline from Elexon BMRS
│   └── requirements.txt         # Lightweight Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DecisionDesk.jsx   # Interactive day-ahead trading desk & procurement calculator
│   │   │   ├── ErrorAnalytics.jsx # Quantitative error evaluation & risk scorecard
│   │   │   ├── Charts.jsx         # Lightweight, reactive SVG time series & bar charts
│   │   │   └── MetricCard.jsx     # High-density financial and volume KPI cards
│   │   ├── App.jsx              # Navigation shell, state manager, date & gate closure controls
│   │   ├── index.css            # Tailwind CSS styling & dark trading terminal theme
│   │   └── main.jsx             # React DOM entry point
│   ├── package.json             # React 18, Vite, Lucide Icons, Tailwind CSS
│   ├── vite.config.js           # Vite build config with /api proxy
│   └── tailwind.config.js       # Custom trading theme configuration
├── Dockerfile                   # Production multi-stage Docker build (Node build -> Python runtime)
├── docker-compose.yml           # One-command container orchestration
├── .dockerignore                # Build context optimization
├── PRESENTATION_SCRIPT.md       # 10-Minute Video Presentation Script (Client Pitch + Tech Review)
└── README.md                    # Project documentation
```

---

## 2. Key Capabilities & Market Logic

### A. Point-in-Time Day-Ahead Gate Closure Rigor
- In the UK wholesale power market, the day-ahead auction (EPEX SPOT GB / Nord Pool GB) closes at **11:00 GMT on Day D-1**.
- The procurement manager cannot see future forecasts. Our system strictly queries forecasts where `publishTime <= D-1 11:00 GMT`.
- Intraday convergence is decoupled from the day-ahead baseline, eliminating look-ahead data leakage.

### B. Residual Thermal Power Procurement Calculator
- **Net Demand** = $\max(0, \text{Target Consumer Load} - \text{Wind Generation})$.
- Evaluates the volume of thermal generation (CCGT peakers / interconnectors / market buy) needed for each of the 48 half-hour settlement periods.

### C. Quantified Forecast Accuracy & Hedging Buffers
- **MAE (Mean Absolute Error)**: $\frac{1}{N} \sum |\text{Actual}_t - \text{Forecast}_t|$ in MW.
- **RMSE (Root Mean Square Error)**: $\sqrt{\frac{1}{N} \sum (\text{Actual}_t - \text{Forecast}_t)^2}$ (penalizes extreme storm misses).
- **Systematic Bias**: $\frac{1}{N} \sum (\text{Forecast}_t - \text{Actual}_t)$ (detects structural over-forecasting shortfalls).
- **WAPE**: $\frac{\sum |\text{Actual}_t - \text{Forecast}_t|}{\sum \text{Actual}_t} \times 100\%$ (avoids division-by-zero on calm days).
- **P10 Downside Risk Envelope**: Empirically computes the 10th percentile shortfall buffer (~3,410 MW in Jan 2026) to shield utilities from punitive Balancing Mechanism cash-out spikes.

---

## 3. How to Start the Application

### Option A: One-Command Docker Run (Recommended)
Ensure Docker is installed, then simply run:
```bash
docker compose up --build
```
Or with vanilla Docker:
```bash
docker build -t wind-desk .
docker run -p 8000:8000 wind-desk
```
The entire application (FastAPI backend + compiled React frontend) will be immediately accessible at:
👉 **`http://localhost:8000`**

---

### Option B: Local Development Run

#### 1. Start Backend:
```bash
pip install -r backend/requirements.txt
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Health Check & Docs:
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

#### 2. Start Frontend:
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser. (Vite automatically proxies `/api` calls to port 8000).

---

## 4. Deployed Application Link

- **Production URL**: `https://wind-desk-uk.onrender.com` *(or Heroku / Vercel container deployment)*
- **API Health**: `https://wind-desk-uk.onrender.com/api/health`
- **Interactive OpenAPI Docs**: `https://wind-desk-uk.onrender.com/docs`

> *Note: For immediate local evaluation without cloud deployment cold-starts, the Docker container (`docker compose up`) provides the exact identical production environment.*

---

## 5. Explicit AI Tools Usage Disclosure

In compliance with the assignment instructions:
- **AI Tools Used**: Google DeepMind Antigravity and Claude 3.5 Sonnet were utilized during this project to assist with rapid Elexon BMRS API exploratory prototyping, mathematical formulation verification, and React SVG chart styling.
- All domain logic, point-in-time gate closure reconstruction, metric algorithms, and architecture design were engineered to strict production standards.
