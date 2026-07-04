"""Phase 3: bench depth / route density / applicant stages, LSA log."""
import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import bench, db, lsa  # noqa: E402

TODAY = date(2026, 7, 4)


def mem():
    return db.connect(":memory:")


def add_job(con, cleaner, zip_code, d="2026-06-25"):
    con.execute(
        "INSERT INTO bookings (date, customer_name, status, cleaner, zip, "
        "frequency) VALUES (?,?,?,?,?,'biweekly')",
        (d, f"c-{cleaner}-{zip_code}-{d}", "completed", cleaner, zip_code))


class TestBench(unittest.TestCase):
    def test_depth_red_flag_under_two(self):
        con = mem()
        bench.add(con, "A", stage="bench")
        self.assertTrue(bench.depth(con, TODAY)["red_flag"])
        bench.add(con, "B", stage="bench")
        d = bench.depth(con, TODAY)
        self.assertFalse(d["red_flag"])
        self.assertEqual(d["bench_ready"], 2)

    def test_pipeline_counts_mid_stages_only(self):
        con = mem()
        for stage in ("applied", "screened", "checkr", "qualification_audit",
                      "active", "bench", "out"):
            bench.add(con, f"p-{stage}", stage=stage)
        d = bench.depth(con, TODAY)
        self.assertEqual(d["in_pipeline"], 4)
        self.assertEqual(d["bench_ready"], 1)

    def test_invalid_stage_rejected(self):
        con = mem()
        with self.assertRaises(ValueError):
            bench.add(con, "X", stage="hired")  # employment word, wrong stage
        bench.add(con, "Y")
        with self.assertRaises(ValueError):
            bench.move(con, 1, "fired")

    def test_route_density_scattered_vs_tight(self):
        con = mem()
        # tight: 8 jobs, 2 zips, 75% in one zip
        for i in range(6):
            add_job(con, "Tight T.", "85018", f"2026-06-{10+i:02d}")
        for i in range(2):
            add_job(con, "Tight T.", "85016", f"2026-06-{20+i:02d}")
        # scattered: 8 jobs across 5 zips, max share 25%
        zips = ["85018", "85251", "85704", "85032", "85008", "85018", "85251", "85704"]
        for i, z in enumerate(zips):
            add_job(con, "Scat S.", z, f"2026-06-{10+i:02d}")
        rd = {c["cleaner"]: c for c in bench.route_density(con, TODAY)}
        self.assertFalse(rd["Tight T."]["scattered"])
        self.assertTrue(rd["Scat S."]["scattered"])
        self.assertEqual(rd["Tight T."]["top_share"], 75)


class TestLSA(unittest.TestCase):
    def test_log_and_mark(self):
        con = mem()
        lsa.add(con, "Lead One", "(602) 555-0001", "2026-07-01")
        lsa.add(con, "Lead Two", "(602) 555-0002", "2026-07-02")
        self.assertEqual(len(lsa.unmarked(con)), 2)
        lsa.mark_booked(con, 1)
        s = lsa.summary(con, TODAY)
        self.assertEqual(s["marked_booked"], 1)
        self.assertEqual(s["unmarked"], 1)
        self.assertIn("75", s["bid_warning"] + str(s["review_progress"]["target"]))

    def test_bid_warning_always_present(self):
        con = mem()
        self.assertEqual(lsa.summary(con, TODAY)["bid_warning"],
                         "Do not touch bids before 75 reviews.")


if __name__ == "__main__":
    unittest.main()
