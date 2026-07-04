"""Shared bonus math — RULE 2. Used by Module 2 (review bonuses) and
Module 5 (perfect-clean bonuses). This is money math: covered by tests
in tests/test_bonus_math.py and must never be wrong.

Per cleaner:
  * $10 per 5-star review generated (attributed to the cleaner)
  * $100 milestone per 10 reviews generated (any rating, attributed)
  * $100 per 10 qualifying cleans ("perfect-clean bonus")
  * $25 per clean that generates a Google review (review linked to a booking)

Qualifying clean = on-time within 10 min + "On My Way" pressed +
clocked in AND out + 10+ BK photos + zero complaints.
"""
import re
from datetime import datetime, timedelta

from . import constants as C


def _parse_clock(value):
    """'9:07 AM', '09:07', '2026-06-02 09:07' -> datetime.time or None."""
    if not value:
        return None
    v = str(value).strip()
    for fmt in ("%I:%M %p", "%H:%M", "%H:%M:%S", "%I:%M:%S %p"):
        try:
            return datetime.strptime(v.upper(), fmt).time()
        except ValueError:
            continue
    m = re.search(r"(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?", v)
    if m:
        h, mi = int(m.group(1)), int(m.group(2))
        ap = (m.group(3) or "").upper()
        if ap == "PM" and h != 12:
            h += 12
        if ap == "AM" and h == 12:
            h = 0
        if 0 <= h <= 23 and 0 <= mi <= 59:
            return datetime.strptime(f"{h:02d}:{mi:02d}", "%H:%M").time()
    return None


def minutes_late(start_time, clock_in):
    """Minutes clock-in trails scheduled start (early = 0). None if unparseable."""
    st, ci = _parse_clock(start_time), _parse_clock(clock_in)
    if st is None or ci is None:
        return None
    delta = (datetime.combine(datetime(2000, 1, 1), ci)
             - datetime.combine(datetime(2000, 1, 1), st))
    return max(0.0, delta.total_seconds() / 60)


def is_qualifying_clean(b):
    """RULE 2 qualifying-clean test on a bookings row (dict or sqlite Row)."""
    if (b["status"] or "") != "completed":
        return False
    if not b["on_my_way"]:
        return False
    late = minutes_late(b["start_time"], b["clock_in"])
    if late is None or late > C.QUALIFYING_ON_TIME_MINUTES:
        return False
    if not (b["clock_in"] and b["clock_out"]):
        return False
    if (b["photo_count"] or 0) < C.QUALIFYING_MIN_PHOTOS:
        return False
    if b["complaint"]:
        return False
    return True


def review_bonus(five_star_count, total_review_count):
    """$ for reviews: $10/five-star + $100 per 10 total reviews."""
    return round(five_star_count * C.BONUS_PER_5_STAR_REVIEW
                 + (total_review_count // C.REVIEW_MILESTONE_EVERY)
                 * C.REVIEW_MILESTONE_AMOUNT, 2)


def perfect_clean_bonus(qualifying_cleans):
    """$100 per 10 qualifying cleans."""
    return round((qualifying_cleans // C.PERFECT_CLEAN_EVERY)
                 * C.PERFECT_CLEAN_AMOUNT, 2)


def review_generating_clean_bonus(review_linked_cleans):
    """$25 per clean that generated a Google review."""
    return round(review_linked_cleans * C.BONUS_PER_REVIEW_GENERATING_CLEAN, 2)


def payout_report(con):
    """Full payout per cleaner combining all Rule 2 components.

    Returns list of dicts sorted by total desc. Milestones and
    per-10 bonuses are computed on lifetime counts in the ledger, so
    the report always shows cumulative earned-to-date; pay the delta
    vs. last month's report.
    """
    cleaners = {}

    def bucket(name):
        return cleaners.setdefault(name or "(unattributed)", {
            "cleaner": name or "(unattributed)",
            "five_star_reviews": 0, "total_reviews": 0,
            "qualifying_cleans": 0, "review_generating_cleans": 0,
        })

    for r in con.execute("SELECT cleaner, rating, booking_id FROM reviews"):
        b = bucket(r["cleaner"])
        b["total_reviews"] += 1
        if (r["rating"] or 0) == 5:
            b["five_star_reviews"] += 1
        if (r["booking_id"] or "").strip():
            b["review_generating_cleans"] += 1

    for r in con.execute("SELECT * FROM bookings WHERE cleaner != ''"):
        if is_qualifying_clean(r):
            bucket(r["cleaner"])["qualifying_cleans"] += 1

    out = []
    for b in cleaners.values():
        b["review_dollars"] = round(
            b["five_star_reviews"] * C.BONUS_PER_5_STAR_REVIEW, 2)
        b["milestone_dollars"] = round(
            (b["total_reviews"] // C.REVIEW_MILESTONE_EVERY) * C.REVIEW_MILESTONE_AMOUNT, 2)
        b["perfect_clean_dollars"] = perfect_clean_bonus(b["qualifying_cleans"])
        b["review_clean_dollars"] = review_generating_clean_bonus(
            b["review_generating_cleans"])
        b["total_dollars"] = round(
            b["review_dollars"] + b["milestone_dollars"]
            + b["perfect_clean_dollars"] + b["review_clean_dollars"], 2)
        out.append(b)
    return sorted(out, key=lambda x: -x["total_dollars"])
