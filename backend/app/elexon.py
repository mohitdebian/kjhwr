import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from .analytics import compute_metrics, calculate_residual_procurement

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "jan_2026.json")

class ElexonDataManager:
    def __init__(self, data_path: str = DATA_PATH):
        self.data_path = data_path
        self.actuals: List[Dict[str, Any]] = []
        self.forecasts: List[Dict[str, Any]] = []
        self.actuals_by_time: Dict[str, Dict[str, Any]] = {}
        self.forecasts_by_target: Dict[str, List[Dict[str, Any]]] = {}
        self.available_dates: List[str] = []
        self.load_data()

    def load_data(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Cached data file not found at {self.data_path}")
        
        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        self.actuals = data.get("actuals", [])
        self.forecasts = data.get("forecasts", [])
        
        # Index actuals by startTime
        self.actuals_by_time = {item["startTime"]: item for item in self.actuals}
        
        # Group forecasts by target startTime, sorted by publishTime ascending
        self.forecasts_by_target = {}
        for f in self.forecasts:
            t = f["startTime"]
            if t not in self.forecasts_by_target:
                self.forecasts_by_target[t] = []
            self.forecasts_by_target[t].append(f)
        
        for t in self.forecasts_by_target:
            self.forecasts_by_target[t].sort(key=lambda x: x["publishTime"])
            
        # Get list of unique dates in January 2026
        dates = sorted(list(set(
            item.get("settlementDate") or item["startTime"][:10]
            for item in self.actuals if item["startTime"].startswith("2026-01")
        )))
        self.available_dates = dates

    def get_day_ahead_forecast(self, target_time: str, cutoff_iso: str) -> Optional[float]:
        """
        Returns the latest forecast generation (MW) published before or at cutoff_iso.
        """
        fcs = self.forecasts_by_target.get(target_time, [])
        valid = [f for f in fcs if f["publishTime"] <= cutoff_iso]
        if valid:
            return float(valid[-1]["generation"])
        # If no forecast published before gate closure, fall back to earliest available
        return float(fcs[0]["generation"]) if fcs else None

    def get_day_data(self, delivery_date: str, gate_closure_hour: int = 11, assumed_demand_mw: float = 32000.0) -> Dict[str, Any]:
        """
        Computes day-ahead forecast vs actuals for a specific delivery date.
        Gate closure is assumed to occur on (delivery_date - 1) at gate_closure_hour:00:00Z.
        """
        try:
            curr_date = datetime.strptime(delivery_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD")
            
        prev_date = curr_date - timedelta(days=1)
        gate_closure_iso = f"{prev_date.strftime('%Y-%m-%d')}T{gate_closure_hour:02d}:00:00Z"
        
        periods = []
        actual_vals = []
        forecast_vals = []
        
        # Filter actuals for this delivery date
        day_actuals = [
            item for item in self.actuals
            if (item.get("settlementDate") == delivery_date) or (item["startTime"][:10] == delivery_date)
        ]
        day_actuals.sort(key=lambda x: x["startTime"])
        
        for act in day_actuals:
            s_time = act["startTime"]
            sp = act.get("settlementPeriod")
            act_gen = float(act.get("generation", 0))
            
            fc_gen = self.get_day_ahead_forecast(s_time, gate_closure_iso)
            if fc_gen is None:
                fc_gen = act_gen # fallback if completely missing
                
            error_mw = round(act_gen - fc_gen, 1) # Positive = surplus actual, Negative = deficit
            residual_needed = round(calculate_residual_procurement(fc_gen, assumed_demand_mw), 1)
            actual_residual = round(calculate_residual_procurement(act_gen, assumed_demand_mw), 1)
            
            actual_vals.append(act_gen)
            forecast_vals.append(fc_gen)
            
            periods.append({
                "startTime": s_time,
                "settlementPeriod": sp,
                "timeLabel": s_time[11:16], # HH:MM
                "actualMW": round(act_gen, 1),
                "forecastMW": round(fc_gen, 1),
                "errorMW": error_mw,
                "absErrorMW": round(abs(error_mw), 1),
                "plannedResidualMW": residual_needed,
                "actualResidualMW": actual_residual,
                "imbalanceRisk": "DEFICIT" if error_mw < -250 else ("SURPLUS" if error_mw > 250 else "BALANCED")
            })
            
        metrics = compute_metrics(actual_vals, forecast_vals)
        
        return {
            "deliveryDate": delivery_date,
            "gateClosureTime": gate_closure_iso,
            "gateClosureHour": gate_closure_hour,
            "assumedDemandMW": assumed_demand_mw,
            "metrics": metrics,
            "periods": periods
        }

    def get_month_overview(self, gate_closure_hour: int = 11) -> Dict[str, Any]:
        """
        Computes aggregate metrics and daily summaries for all of January 2026.
        """
        all_actuals = []
        all_forecasts = []
        daily_summaries = []
        
        for date_str in self.available_dates:
            day_res = self.get_day_data(date_str, gate_closure_hour)
            acts = [p["actualMW"] for p in day_res["periods"]]
            fcs = [p["forecastMW"] for p in day_res["periods"]]
            
            all_actuals.extend(acts)
            all_forecasts.extend(fcs)
            
            m = day_res["metrics"]
            daily_summaries.append({
                "date": date_str,
                "mae": m["mae"],
                "rmse": m["rmse"],
                "bias": m["bias"],
                "wape": m["wape"],
                "maxError": m["maxError"],
                "meanActual": round(sum(acts) / len(acts), 1) if acts else 0,
                "meanForecast": round(sum(fcs) / len(fcs), 1) if fcs else 0,
            })
            
        overall_metrics = compute_metrics(all_actuals, all_forecasts)
        
        return {
            "period": "January 2026",
            "gateClosureHour": gate_closure_hour,
            "overallMetrics": overall_metrics,
            "dailySummaries": daily_summaries,
            "availableDates": self.available_dates
        }

    def get_settlement_period_profile(self, gate_closure_hour: int = 11) -> List[Dict[str, Any]]:
        """
        Averages performance by settlement period (1 to 48) across all 31 days.
        Highlights diurnal forecast error patterns (e.g. morning ramp vs peak evening).
        """
        sp_data: Dict[int, Dict[str, List[float]]] = {
            i: {"actuals": [], "forecasts": [], "errors": []} for i in range(1, 49)
        }
        
        for date_str in self.available_dates:
            day_res = self.get_day_data(date_str, gate_closure_hour)
            for p in day_res["periods"]:
                sp = p["settlementPeriod"]
                if sp and sp in sp_data:
                    act = p["actualMW"]
                    fc = p["forecastMW"]
                    sp_data[sp]["actuals"].append(act)
                    sp_data[sp]["forecasts"].append(fc)
                    sp_data[sp]["errors"].append(abs(act - fc))
                    
        profile = []
        for sp in range(1, 49):
            acts = sp_data[sp]["actuals"]
            fcs = sp_data[sp]["forecasts"]
            errs = sp_data[sp]["errors"]
            n = len(acts)
            # Time calculation: SP 1 is 00:00 - 00:30
            hours = (sp - 1) // 2
            minutes = 30 if (sp % 2 == 0) else 0
            label = f"{hours:02d}:{minutes:02d}"
            
            mae = sum(errs) / n if n > 0 else 0
            bias = (sum(fcs) - sum(acts)) / n if n > 0 else 0
            mean_act = sum(acts) / n if n > 0 else 0
            mean_fc = sum(fcs) / n if n > 0 else 0
            
            profile.append({
                "settlementPeriod": sp,
                "timeLabel": label,
                "meanActualMW": round(mean_act, 1),
                "meanForecastMW": round(mean_fc, 1),
                "maeMW": round(mae, 1),
                "biasMW": round(bias, 1),
                "wape": round((mae / mean_act * 100) if mean_act > 0 else 0, 1)
            })
            
        return profile

    def get_error_distribution(self, gate_closure_hour: int = 11) -> Dict[str, Any]:
        """
        Calculates error distribution buckets for trading risk sizing.
        """
        errors = []
        for date_str in self.available_dates:
            day_res = self.get_day_data(date_str, gate_closure_hour)
            for p in day_res["periods"]:
                errors.append(p["errorMW"]) # actual - forecast
                
        # Bucket errors into histogram intervals (e.g. step of 500 MW)
        # Ranges: < -2000, -2000 to -1500, ..., 1500 to 2000, > 2000
        buckets = [
            {"range": "< -2000 MW", "min": -float("inf"), "max": -2000, "count": 0},
            {"range": "-2000 to -1000", "min": -2000, "max": -1000, "count": 0},
            {"range": "-1000 to -500", "min": -1000, "max": -500, "count": 0},
            {"range": "-500 to 0", "min": -500, "max": 0, "count": 0},
            {"range": "0 to 500", "min": 0, "max": 500, "count": 0},
            {"range": "500 to 1000", "min": 500, "max": 1000, "count": 0},
            {"range": "1000 to 2000", "min": 1000, "max": 2000, "count": 0},
            {"range": "> 2000 MW", "min": 2000, "max": float("inf"), "count": 0},
        ]
        
        for err in errors:
            for b in buckets:
                if b["min"] <= err < b["max"]:
                    b["count"] += 1
                    break
                    
        return {
            "totalSamples": len(errors),
            "buckets": buckets
        }

# Global instance for FastAPI
data_manager = ElexonDataManager()
