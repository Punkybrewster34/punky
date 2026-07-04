"""RULE 1 — review velocity caps. These protect the Google profile and
must hold under every input we can throw at them."""
import os
import sys
import unittest
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import db, reviews  # noqa: E402
from modules import constants as C  # noqa: E402

TUE = date(2026, 6, 30)
THU = date(2026, 7, 2)
SAT = date(2026, 7, 4)
MON = date(2026, 6, 29)
SUN = date(2026, 7, 5)


def mem_with_clients(n=20):
    con = db.connect(":memory:")
    for i in range(n):
        con.execute(
            "INSERT INTO bookings (booking_id, date, customer_name, status, "
            "frequency, cleaner, on_my_way, clock_in, clock_out, photo_count, "
            "start_time) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (f"B{i}", "2026-06-25", f"Client {i:02d}", "completed", "biweekly",
             "Maria G.", 1, "9:00 AM", "12:00 PM", 12, "9:00 AM"))
    return con


class TestSendDays(unittest.TestCase):
    def test_constants_are_tue_thu_sat(self):
        self.assertEqual(C.REVIEW_SEND_WEEKDAYS, (1, 3, 5))
        self.assertEqual(C.REVIEW_MAX_PER_DAY, 2)
        self.assertEqual(C.REVIEW_MAX_PER_WEEK, 6)

    def test_non_send_days_have_zero_slots(self):
        con = mem_with_clients()
        for d in (MON, date(2026, 7, 1), date(2026, 7, 3), SUN):
            self.assertEqual(reviews.slots_available(con, d), 0, d)
            self.assertEqual(reviews.todays_sends(con, d)["sends"], [])

    def test_send_day_offers_at_most_two(self):
        con = mem_with_clients()
        s = reviews.todays_sends(con, TUE)
        self.assertTrue(s["is_send_day"])
        self.assertEqual(len(s["sends"]), 2)


class TestDailyCap(unittest.TestCase):
    def test_third_send_same_day_blocked(self):
        con = mem_with_clients()
        reviews.mark_sent(con, "Client 00", TUE)
        reviews.mark_sent(con, "Client 01", TUE)
        self.assertEqual(reviews.slots_available(con, TUE), 0)
        with self.assertRaises(RuntimeError):
            reviews.mark_sent(con, "Client 02", TUE)


class TestWeeklyCap(unittest.TestCase):
    def test_six_per_week_hard_stop(self):
        con = mem_with_clients()
        for d in (TUE, THU):
            for i in range(2):
                reviews.mark_sent(con, f"Client 0{d.day}{i}", d)
        # Saturday: only 2 left of the 6
        self.assertEqual(reviews.slots_available(con, SAT), 2)
        reviews.mark_sent(con, "Client 10", SAT)
        reviews.mark_sent(con, "Client 11", SAT)
        self.assertEqual(reviews.slots_available(con, SAT), 0)
        with self.assertRaises(RuntimeError):
            reviews.mark_sent(con, "Client 12", SAT)

    def test_new_week_resets(self):
        con = mem_with_clients()
        for d in (TUE, THU, SAT):
            reviews.mark_sent(con, f"A{d.day}", d)
            reviews.mark_sent(con, f"B{d.day}", d)
        next_tue = TUE + timedelta(days=7)
        self.assertEqual(reviews.slots_available(con, next_tue), 2)

    def test_todays_sends_respects_remaining_slots(self):
        con = mem_with_clients()
        reviews.mark_sent(con, "Client 00", TUE)
        reviews.mark_sent(con, "Client 01", TUE)
        reviews.mark_sent(con, "Client 02", THU)
        reviews.mark_sent(con, "Client 03", THU)
        reviews.mark_sent(con, "Client 04", SAT)
        s = reviews.todays_sends(con, SAT)
        self.assertEqual(len(s["sends"]), 1)  # 1 of 6 weekly remains


class TestEligibility(unittest.TestCase):
    def test_no_double_request_and_no_request_after_review(self):
        con = mem_with_clients(5)
        reviews.mark_sent(con, "Client 00", TUE)
        reviews.log_review(con, "2026-06-28", "Client 01", 5, "Maria G.")
        names = {c["customer_name"] for c in reviews.eligible_queue(con)}
        self.assertNotIn("Client 00", names)  # already requested
        self.assertNotIn("Client 01", names)  # already reviewed

    def test_recurring_and_perfect_ranked_first(self):
        con = db.connect(":memory:")
        # one-time sloppy job vs recurring perfect job
        con.execute("INSERT INTO bookings (date, customer_name, status, frequency,"
                    "on_my_way, clock_in, clock_out, photo_count, start_time) "
                    "VALUES ('2026-07-01','OneTimer','completed','one-time',0,'','',2,'9:00 AM')")
        con.execute("INSERT INTO bookings (date, customer_name, status, frequency,"
                    "on_my_way, clock_in, clock_out, photo_count, start_time) "
                    "VALUES ('2026-06-20','Loyal','completed','weekly',1,'9:02 AM','12:00 PM',15,'9:00 AM')")
        q = reviews.eligible_queue(con)
        self.assertEqual(q[0]["customer_name"], "Loyal")


if __name__ == "__main__":
    unittest.main()
