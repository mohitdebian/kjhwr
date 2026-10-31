import unittest
import math
from backend.app.analytics import compute_metrics, calculate_residual_procurement
from backend.app.elexon import data_manager

class TestWindPlatform(unittest.TestCase):
    def test_compute_metrics_basic(self):
        actuals = [100.0, 200.0, 300.0]
        forecasts = [110.0, 190.0, 330.0]
        m = compute_metrics(actuals, forecasts)
        self.assertEqual(m["mae"], 16.7)
        self.assertEqual(m["rmse"], 19.1)
        self.assertEqual(m["bias"], 10.0)
        self.assertEqual(m["wape"], 8.33)
        self.assertEqual(m["count"], 3)

    def test_compute_metrics_empty(self):
        m = compute_metrics([], [])
        self.assertEqual(m["count"], 0)
        self.assertEqual(m["mae"], 0.0)

    def test_calculate_residual_procurement(self):
        self.assertEqual(calculate_residual_procurement(wind_mw=12000, demand_mw=30000), 18000)
        self.assertEqual(calculate_residual_procurement(wind_mw=35000, demand_mw=30000), 0.0)

    def test_elexon_data_loaded(self):
        self.assertEqual(len(data_manager.available_dates), 31)
        self.assertEqual(len(data_manager.actuals), 1488)
        self.assertGreater(len(data_manager.forecasts), 10000)

    def test_gate_closure_rigor(self):
        cutoff = "2026-01-14T11:00:00Z"
        target_sp_time = "2026-01-15T12:00:00Z"
        fc = data_manager.get_day_ahead_forecast(target_sp_time, cutoff)
        self.assertIsNotNone(fc)
        self.assertGreater(fc, 0)

        raw_fcs = data_manager.forecasts_by_target.get(target_sp_time, [])
        valid_fcs = [f for f in raw_fcs if f["publishTime"] <= cutoff]
        if valid_fcs:
            self.assertEqual(fc, float(valid_fcs[-1]["generation"]))

    def test_day_analysis_integrity(self):
        res = data_manager.get_day_data("2026-01-15", gate_closure_hour=11, assumed_demand_mw=32000.0)
        self.assertEqual(res["deliveryDate"], "2026-01-15")
        self.assertEqual(len(res["periods"]), 48)
        self.assertEqual(res["metrics"]["count"], 48)
        self.assertGreater(res["metrics"]["mae"], 0)
        
        first_p = res["periods"][0]
        self.assertIn("settlementPeriod", first_p)
        self.assertIn("actualMW", first_p)
        self.assertIn("forecastMW", first_p)
        self.assertIn("errorMW", first_p)
        self.assertIn("imbalanceRisk", first_p)
        self.assertIn(first_p["imbalanceRisk"], ["DEFICIT", "SURPLUS", "BALANCED"])

    def test_month_overview(self):
        overview = data_manager.get_month_overview(gate_closure_hour=11)
        self.assertEqual(overview["period"], "January 2026")
        self.assertEqual(len(overview["dailySummaries"]), 31)
        self.assertEqual(overview["overallMetrics"]["count"], 1488)
        self.assertGreater(overview["overallMetrics"]["wape"], 0)

    def test_settlement_period_profile(self):
        profile = data_manager.get_settlement_period_profile(gate_closure_hour=11)
        self.assertEqual(len(profile), 48)
        for sp in profile:
            self.assertTrue(1 <= sp["settlementPeriod"] <= 48)
            self.assertIn("meanActualMW", sp)
            self.assertIn("maeMW", sp)

    def test_error_distribution(self):
        dist = data_manager.get_error_distribution(gate_closure_hour=11)
        self.assertEqual(dist["totalSamples"], 1488)
        total_in_buckets = sum(b["count"] for b in dist["buckets"])
        self.assertEqual(total_in_buckets, 1488)

if __name__ == "__main__":
    unittest.main(verbosity=2)
