import math
from typing import List, Dict, Any

def compute_metrics(actuals: List[float], forecasts: List[float]) -> Dict[str, Any]:
    if not actuals or not forecasts or len(actuals) != len(forecasts):
        return {
            "mae": 0.0, "rmse": 0.0, "bias": 0.0, "wape": 0.0,
            "maxError": 0.0, "p10": 0.0, "p50": 0.0, "p90": 0.0, "count": 0
        }
    
    n = len(actuals)
    abs_errors = [abs(a - f) for a, f in zip(actuals, forecasts)]
    sq_errors = [(a - f) ** 2 for a, f in zip(actuals, forecasts)]
    biases = [f - a for a, f in zip(actuals, forecasts)]
    deltas = sorted([a - f for a, f in zip(actuals, forecasts)])

    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(sq_errors) / n)
    bias = sum(biases) / n
    
    total_act = sum(actuals)
    wape = (sum(abs_errors) / total_act * 100.0) if total_act > 0 else 0.0
    max_error = max(abs_errors) if abs_errors else 0.0

    def percentile(arr, p):
        if not arr: return 0.0
        k = (len(arr) - 1) * p
        f = math.floor(k)
        c = math.ceil(k)
        if f == c: return arr[int(k)]
        return arr[int(f)] * (c - k) + arr[int(c)] * (k - f)

    return {
        "mae": round(mae, 1),
        "rmse": round(rmse, 1),
        "bias": round(bias, 1),
        "wape": round(wape, 2),
        "maxError": round(max_error, 1),
        "p10": round(percentile(deltas, 0.10), 1),
        "p50": round(percentile(deltas, 0.50), 1),
        "p90": round(percentile(deltas, 0.90), 1),
        "count": n
    }

def calculate_residual_procurement(wind_mw: float, demand_mw: float) -> float:
    return max(0.0, demand_mw - wind_mw)
