"""Phase 2 logic: churn detection tiers, retained-revenue math,
prospect scoring/dedupe/cadence, compliance flags."""
import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import churn, compliance, db, prospects  # noqa: E402

TODAY = date(2026, 7, 4)


def mem():
    return db.connect(":memory:")


def add_booking(con, name, d, status="completed", freq="biweekly", amount=150,
                cleaner="Maria G.", **kw):
    row = {"date": d, "customer_name": name, "status": status, "frequency": freq,
           "amount": amount, "cleaner": cleaner, "start_time": "9:00 AM",
           "on_my_way": 1, "clock_in": "9:05 AM", "clock_out": "12:00 PM",
           "photo_count": 12, "complaint": 0, "customer_phone": "(602) 555-0000",
           "customer_email": ""}
    row.update(kw)
    con.execute(
        """INSERT INTO bookings (date, customer_name, status, frequency, amount,
           cleaner, start_time, on_my_way, clock_in, clock_out, photo_count,
           complaint, customer_phone, customer_email)
           VALUES (:date,:customer_name,:status,:frequency,:amount,:cleaner,
                   :start_time,:on_my_way,:clock_in,:clock_out,:photo_count,
                   :complaint,:customer_phone,:customer_email)""", row)


class TestChurnTiers(unittest.TestCase):
    def flags_for(self, con):
        return {f["customer_name"]: f for f in churn.scan(con, TODAY)}

    def test_cancelled_is_high_with_cancelled_script(self):
        con = mem()
        add_booking(con, "Ann", "2026-06-01")
        add_booking(con, "Ann", "2026-06-15", status="cancelled")
        f = self.flags_for(con)["Ann"]
        self.assertEqual(f["tier"], "HIGH")
        self.assertEqual(f["scenario"], "cancelled")
        self.assertIn("Ann", f["sms"].split(",")[0])  # personalized

    def test_long_gap_is_high(self):
        con = mem()
        add_booking(con, "Bob", "2026-05-20")  # biweekly, 45 days ago > 2x14
        f = self.flags_for(con)["Bob"]
        self.assertEqual(f["tier"], "HIGH")

    def test_paused_is_medium(self):
        con = mem()
        add_booking(con, "Cara", "2026-06-25")
        add_booking(con, "Cara", "2026-07-02", status="paused")
        f = self.flags_for(con)["Cara"]
        self.assertEqual(f["tier"], "MEDIUM")
        self.assertEqual(f["scenario"], "paused")

    def test_downgrade_is_medium(self):
        con = mem()
        add_booking(con, "Dev", "2026-06-05", freq="weekly")
        add_booking(con, "Dev", "2026-06-29", freq="every 4 weeks")
        f = self.flags_for(con)["Dev"]
        self.assertEqual(f["tier"], "MEDIUM")
        self.assertIn("downgraded", f["reasons"][0])

    def test_skipped_once_is_low(self):
        con = mem()
        add_booking(con, "Eve", "2026-06-24")
        add_booking(con, "Eve", "2026-07-01", status="skipped")
        f = self.flags_for(con)["Eve"]
        self.assertEqual(f["tier"], "LOW")
        self.assertEqual(f["scenario"], "skipped-once")

    def test_healthy_client_not_flagged(self):
        con = mem()
        add_booking(con, "Flo", "2026-06-28")  # 6 days ago, biweekly
        self.assertNotIn("Flo", self.flags_for(con))

    def test_one_time_customers_ignored(self):
        con = mem()
        add_booking(con, "Gus", "2026-04-01", freq="one-time")
        self.assertEqual(churn.scan(con, TODAY), [])

    def test_monthly_value_math(self):
        self.assertEqual(churn.monthly_value(150, 14), round(150 * 2.17, 2))
        self.assertEqual(churn.monthly_value(200, 7), round(200 * 4.33, 2))


class TestRetainedRevenue(unittest.TestCase):
    def test_saved_vs_lost(self):
        con = mem()
        # saved: skipped then completed 10 days later
        add_booking(con, "Saved Sue", "2026-05-10", status="skipped", amount=100)
        add_booking(con, "Saved Sue", "2026-05-20", amount=100)
        # lost: cancelled, never came back, window closed
        add_booking(con, "Lost Lou", "2026-05-12", status="cancelled", amount=100)
        rep = {m["month"]: m for m in
               churn.retained_revenue_report(con, today=TODAY)}
        m = rep["2026-05"]
        self.assertEqual(m["clients_saved"], 1)
        self.assertEqual(m["clients_lost"], 1)
        self.assertEqual(m["saved"], round(100 * 2.17, 2))
        self.assertEqual(m["lost"], round(100 * 2.17, 2))

    def test_open_window_is_pending(self):
        con = mem()
        add_booking(con, "Pat", "2026-06-28", status="paused", amount=100)
        m = churn.retained_revenue_report(con, today=TODAY)[0]
        self.assertEqual(m["clients_pending"], 1)
        self.assertEqual(m["clients_lost"], 0)


class TestProspects(unittest.TestCase):
    def test_scoring(self):
        # independent + website + 60 reviews = 2+2+1+3
        self.assertEqual(prospects.score("https://x.com", 60, "Salon Verde"), 8)
        # chain with everything still loses the independence points
        self.assertEqual(prospects.score("https://x.com", 60, "Massage Envy Phoenix"), 5)
        # bare listing, independent
        self.assertEqual(prospects.score("", 3, "Tiny Toes Childcare"), 3)

    def test_dedupe_by_name(self):
        con = mem()
        self.assertEqual(prospects.upsert(con, {"name": "Salon Verde"}), 1)
        self.assertEqual(prospects.upsert(con, {"name": "salon verde",
                                                "address": "elsewhere"}), 0)

    def test_cadence_call_walkin_email(self):
        con = mem()
        prospects.upsert(con, {"name": "Glow Aesthetics"})
        pid = con.execute("SELECT id FROM prospects").fetchone()["id"]
        step, nxt = prospects.advance(con, pid)
        self.assertEqual((step, nxt), ("call", "walk-in"))
        step, nxt = prospects.advance(con, pid)
        self.assertEqual((step, nxt), ("walk-in", "email"))
        step, nxt = prospects.advance(con, pid)
        self.assertEqual((step, nxt), ("email", "email"))  # repeats biweekly
        prospects.set_outcome(con, pid, "won")
        self.assertEqual(prospects.week_list(con, TODAY), [])  # closed = off list


class TestComplianceFlags(unittest.TestCase):
    def test_low_qualifying_rate_flagged_with_bench(self):
        con = mem()
        for i in range(5):  # 5 sloppy jobs in the window: no photos
            add_booking(con, f"C{i}", f"2026-06-{20+i:02d}", cleaner="Rob T.",
                        photo_count=2)
        fl = compliance.flags(con, TODAY)
        self.assertEqual(len(fl), 1)
        self.assertEqual(fl[0]["cleaner"], "Rob T.")
        self.assertIn("bench", fl[0])
        self.assertEqual(fl[0]["bench"]["bench"], 0)

    def test_small_sample_not_flagged(self):
        con = mem()
        add_booking(con, "X", "2026-06-25", cleaner="New N.", photo_count=0,
                    on_my_way=0)
        self.assertEqual(compliance.flags(con, TODAY), [])

    def test_streak_resets_on_bad_job(self):
        con = mem()
        add_booking(con, "A", "2026-06-01", cleaner="S.")
        add_booking(con, "B", "2026-06-02", cleaner="S.")
        add_booking(con, "C", "2026-06-03", cleaner="S.", complaint=1)
        add_booking(con, "D", "2026-06-04", cleaner="S.")
        a = compliance.audit(con)[0]
        self.assertEqual(a["qualifying"], 3)
        self.assertEqual(a["current_streak"], 1)
        self.assertEqual(a["best_streak"], 2)


if __name__ == "__main__":
    unittest.main()
