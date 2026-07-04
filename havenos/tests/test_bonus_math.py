"""RULE 2 money math — bonus payouts must be penny-accurate."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import bonuses, db  # noqa: E402


def mem():
    return db.connect(":memory:")


def add_booking(con, **kw):
    row = {"booking_id": "BK-1", "date": "2026-06-01", "start_time": "9:00 AM",
           "customer_name": "Test Client", "status": "completed", "cleaner": "Maria G.",
           "on_my_way": 1, "clock_in": "9:05 AM", "clock_out": "12:00 PM",
           "photo_count": 12, "complaint": 0, "frequency": "biweekly", "amount": 150}
    row.update(kw)
    con.execute(
        """INSERT INTO bookings (booking_id, date, start_time, customer_name,
           status, cleaner, on_my_way, clock_in, clock_out, photo_count,
           complaint, frequency, amount) VALUES
           (:booking_id,:date,:start_time,:customer_name,:status,:cleaner,
            :on_my_way,:clock_in,:clock_out,:photo_count,:complaint,
            :frequency,:amount)""", row)


def add_review(con, rating=5, cleaner="Maria G.", booking_id="", n=1, day=1):
    for i in range(n):
        con.execute(
            "INSERT INTO reviews (review_date, reviewer_name, rating, cleaner, "
            "booking_id) VALUES (?,?,?,?,?)",
            (f"2026-06-{day + i:02d}", f"Reviewer {day + i}-{cleaner}-{rating}",
             rating, cleaner, booking_id))


class TestQualifyingClean(unittest.TestCase):
    def check(self, expect, **kw):
        con = mem()
        add_booking(con, **kw)
        row = con.execute("SELECT * FROM bookings").fetchone()
        self.assertIs(bonuses.is_qualifying_clean(row), expect)

    def test_perfect_clean_qualifies(self):
        self.check(True)

    def test_exactly_10_minutes_late_still_qualifies(self):
        self.check(True, start_time="9:00 AM", clock_in="9:10 AM")

    def test_11_minutes_late_disqualifies(self):
        self.check(False, start_time="9:00 AM", clock_in="9:11 AM")

    def test_early_arrival_qualifies(self):
        self.check(True, start_time="9:00 AM", clock_in="8:45 AM")

    def test_no_omw_disqualifies(self):
        self.check(False, on_my_way=0)

    def test_no_clock_out_disqualifies(self):
        self.check(False, clock_out="")

    def test_no_clock_in_disqualifies(self):
        self.check(False, clock_in="")

    def test_nine_photos_disqualifies(self):
        self.check(False, photo_count=9)

    def test_exactly_10_photos_qualifies(self):
        self.check(True, photo_count=10)

    def test_complaint_disqualifies(self):
        self.check(False, complaint=1)

    def test_cancelled_booking_never_qualifies(self):
        self.check(False, status="cancelled")

    def test_pm_times_parse(self):
        self.check(True, start_time="1:00 PM", clock_in="1:08 PM")
        self.check(False, start_time="1:00 PM", clock_in="1:30 PM")


class TestBonusFormulas(unittest.TestCase):
    def test_review_bonus_flat(self):
        # 7 five-star, 7 total: 7*$10, no milestone yet
        self.assertEqual(bonuses.review_bonus(7, 7), 70.00)

    def test_review_bonus_milestone(self):
        # 10 five-star, 10 total: $100 + $100 milestone
        self.assertEqual(bonuses.review_bonus(10, 10), 200.00)

    def test_review_bonus_two_milestones(self):
        # 23 total (20 five-star): 20*$10 + 2*$100
        self.assertEqual(bonuses.review_bonus(20, 23), 400.00)

    def test_perfect_clean_bonus(self):
        self.assertEqual(bonuses.perfect_clean_bonus(9), 0.00)
        self.assertEqual(bonuses.perfect_clean_bonus(10), 100.00)
        self.assertEqual(bonuses.perfect_clean_bonus(19), 100.00)
        self.assertEqual(bonuses.perfect_clean_bonus(20), 200.00)

    def test_review_generating_clean_bonus(self):
        self.assertEqual(bonuses.review_generating_clean_bonus(3), 75.00)


class TestPayoutReport(unittest.TestCase):
    def test_full_payout_penny_accurate(self):
        con = mem()
        # Maria: 11 five-star reviews (4 tied to bookings), 1 four-star,
        # 10 qualifying cleans + 1 non-qualifying
        add_review(con, rating=5, cleaner="Maria G.", n=4, day=1, booking_id="BK-9")
        add_review(con, rating=5, cleaner="Maria G.", n=7, day=10)
        add_review(con, rating=4, cleaner="Maria G.", n=1, day=20)
        for i in range(10):
            add_booking(con, booking_id=f"Q{i}", date=f"2026-06-{i+1:02d}",
                        customer_name=f"C{i}")
        add_booking(con, booking_id="BAD", photo_count=3, customer_name="C-bad")
        report = {r["cleaner"]: r for r in bonuses.payout_report(con)}
        m = report["Maria G."]
        self.assertEqual(m["five_star_reviews"], 11)
        self.assertEqual(m["total_reviews"], 12)
        self.assertEqual(m["qualifying_cleans"], 10)
        self.assertEqual(m["review_generating_cleans"], 4)
        self.assertEqual(m["review_dollars"], 110.00)      # 11 x $10
        self.assertEqual(m["milestone_dollars"], 100.00)   # 12 // 10 = 1
        self.assertEqual(m["perfect_clean_dollars"], 100.00)  # 10 // 10 = 1
        self.assertEqual(m["review_clean_dollars"], 100.00)   # 4 x $25
        self.assertEqual(m["total_dollars"], 410.00)

    def test_zero_activity_cleaner_absent(self):
        con = mem()
        self.assertEqual(bonuses.payout_report(con), [])


if __name__ == "__main__":
    unittest.main()
