import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .elexon import data_manager

app = FastAPI(
    title="UK Day-Ahead Wind Forecast & Procurement Analytics",
    description="Elexon BMRS January 2026 Wind Actuals & Day-Ahead Gate-Closure Forecast Accuracy Platform",
    version="1.0.0"
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "dataset": "January 2026 Elexon BMRS FUELHH + WINDFOR",
        "datesAvailable": len(data_manager.available_dates),
        "actualsLoaded": len(data_manager.actuals),
        "forecastsLoaded": len(data_manager.forecasts)
    }

@app.get("/api/overview")
def get_overview(gate_closure: int = Query(11, ge=0, le=23, description="Gate closure hour on D-1 (GMT)")):
    try:
        return data_manager.get_month_overview(gate_closure_hour=gate_closure)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/day")
def get_day(
    date: str = Query("2026-01-15", description="Delivery date (YYYY-MM-DD)"),
    gate_closure: int = Query(11, ge=0, le=23, description="Gate closure hour on D-1 (GMT)"),
    demand: float = Query(32000.0, description="Assumed consumer demand (MW)")
):
    try:
        if date not in data_manager.available_dates:
            date = data_manager.available_dates[0] if data_manager.available_dates else date
        return data_manager.get_day_data(delivery_date=date, gate_closure_hour=gate_closure, assumed_demand_mw=demand)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profile")
def get_profile(gate_closure: int = Query(11, ge=0, le=23)):
    try:
        return data_manager.get_settlement_period_profile(gate_closure_hour=gate_closure)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/distribution")
def get_distribution(gate_closure: int = Query(11, ge=0, le=23)):
    try:
        return data_manager.get_error_distribution(gate_closure_hour=gate_closure)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static build files for production single-container deployment
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
