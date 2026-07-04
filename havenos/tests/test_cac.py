"""CAC math (Module 1) — cost-per-booked-job and cost-per-recurring-client."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import config, db, leads  # noqa: E402


def mem():
    return db.connect(":memory:")


def add_lead(con, name, source, status, month="2026-06"):
    con.execute(
        "INSERT INTO leads (created_at, name, source, status) VALUES (?,?,?,?)",
        (f"{month}-15 10:00:00", name, source, status))


class TestCAC(unittest.TestCase):
    def setUp(self):
        # pin spend independent of config.yaml edits
        cfg = config.load()
        self._saved = cfg.get("channel_spend")
        cfg["channel_spend"] = {"2026-06": {"facebook": 800, "lsa": 1200}}

    def tearDown(self):
        config.load()["channel_spend"] = self._saved

    def test_cost_per_booked_and_recurring(self):
        con = mem()
        # facebook: 8 leads -> 4 booked (2 of them recurring)
        for i in range(4):
            add_lead(con, f"F{i}", "facebook", "new")
        for i in range(2):
            add_lead(con, f"FB{i}", "facebook", "booked")
        for i in range(2):
            add_lead(con, f"FR{i}", "facebook", "recurring")
        rows = {r["source"]: r for r in leads.cac_report(con, "2026-06")}
        fb = rows["facebook"]
        self.assertEqual(fb["leads"], 8)
        self.assertEqual(fb["booked"], 4)       # booked includes recurring
        self.assertEqual(fb["recurring"], 2)
        self.assertEqual(fb["cost_per_lead"], 100.00)          # 800 / 8
        self.assertEqual(fb["cost_per_booked_job"], 200.00)    # 800 / 4
        self.assertEqual(fb["cost_per_recurring_client"], 400.00)  # 800 / 2

    def test_zero_booked_gives_none_not_division_error(self):
        con = mem()
        add_lead(con, "L1", "lsa", "contacted")
        rows = {r["source"]: r for r in leads.cac_report(con, "2026-06")}
        self.assertIsNone(rows["lsa"]["cost_per_booked_job"])
        self.assertIsNone(rows["lsa"]["cost_per_recurring_client"])

    def test_spend_with_no_leads_still_reported(self):
        con = mem()
        add_lead(con, "F1", "facebook", "booked")
        rows = {r["source"]: r for r in leads.cac_report(con, "2026-06")}
        self.assertIn("lsa", rows)  # $1200 spend, zero leads -> visible burn
        self.assertEqual(rows["lsa"]["leads"], 0)

    def test_month_isolation(self):
        con = mem()
        add_lead(con, "May lead", "facebook", "booked", month="2026-05")
        add_lead(con, "June lead", "facebook", "booked", month="2026-06")
        rows = {r["source"]: r for r in leads.cac_report(con, "2026-06")}
        self.assertEqual(rows["facebook"]["booked"], 1)
        self.assertEqual(rows["facebook"]["cost_per_booked_job"], 800.00)

    def test_unconfigured_source_has_no_cac(self):
        con = mem()
        add_lead(con, "R1", "referral", "booked")
        rows = {r["source"]: r for r in leads.cac_report(con, "2026-06")}
        self.assertEqual(rows["referral"]["spend"], 0.0)
        self.assertIsNone(rows["referral"]["cost_per_booked_job"])


if __name__ == "__main__":
    unittest.main()
