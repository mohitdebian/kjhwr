import urllib.request
import json
import os
import sys
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
CACHE_FILE = os.path.join(DATA_DIR, "jan_2026.json")

def fetch_json(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "Gridbricks-EnergyDesk/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def fetch_actuals():
    print("[1/2] Fetching January 2026 FUELHH actuals from Elexon...")
    all_actuals = []
    start = datetime(2026, 1, 1, 0, 0, 0)
    end = datetime(2026, 2, 1, 1, 0, 0)
    curr = start
    while curr < end:
        next_dt = min(curr + timedelta(days=5), end)
        from_str = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        to_str = next_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        url = f"https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom={from_str}&publishDateTimeTo={to_str}"
        print(f"  Fetching FUELHH {from_str} -> {to_str}...")
        try:
            records = fetch_json(url)
            wind = [
                {
                    "startTime": r["startTime"],
                    "settlementDate": r.get("settlementDate"),
                    "settlementPeriod": r.get("settlementPeriod"),
                    "generation": r.get("generation", 0)
                }
                for r in records if r.get("fuelType") == "WIND" and r.get("startTime", "").startswith("2026-01")
            ]
            all_actuals.extend(wind)
            print(f"    Fetched {len(wind)} wind actual records.")
        except Exception as e:
            print(f"    Error fetching FUELHH {from_str}: {e}")
        curr = next_dt
    
    dedup = {r["startTime"]: r for r in all_actuals}
    sorted_actuals = sorted(dedup.values(), key=lambda x: x["startTime"])
    print(f"  Total unique January 2026 wind actuals: {len(sorted_actuals)}")
    return sorted_actuals

def fetch_forecasts():
    print("[2/2] Fetching WINDFOR forecasts from Elexon...")
    all_forecasts = []
    start = datetime(2025, 12, 30, 0, 0, 0)
    end = datetime(2026, 1, 31, 23, 59, 59)
    curr = start
    while curr < end:
        next_dt = min(curr + timedelta(days=5), end)
        from_str = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        to_str = next_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        url = f"https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom={from_str}&publishDateTimeTo={to_str}"
        print(f"  Fetching WINDFOR {from_str} -> {to_str}...")
        try:
            records = fetch_json(url)
            filtered = [
                {
                    "publishTime": r["publishTime"],
                    "startTime": r["startTime"],
                    "generation": r.get("generation", 0)
                }
                for r in records if r.get("startTime", "").startswith("2026-01")
            ]
            all_forecasts.extend(filtered)
            print(f"    Fetched {len(filtered)} Jan 2026 target forecasts.")
        except Exception as e:
            print(f"    Error fetching WINDFOR {from_str}: {e}")
        curr = next_dt

    print(f"  Total raw forecast records targeting Jan 2026: {len(all_forecasts)}")
    return all_forecasts

def main():
    actuals = fetch_actuals()
    forecasts = fetch_forecasts()
    payload = {
        "metadata": {
            "period": "January 2026",
            "source": "Elexon BMRS API",
            "fuelType": "WIND",
            "actualsCount": len(actuals),
            "forecastsCount": len(forecasts),
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        },
        "actuals": actuals,
        "forecasts": forecasts
    }
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    size_mb = os.path.getsize(CACHE_FILE) / (1024 * 1024)
    print(f"Done! Cached dataset saved to {CACHE_FILE} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
