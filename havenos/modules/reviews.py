"""Module 2 — Review Velocity Governor.

RULE 1 is enforced here and cannot be configured away: max 6 review
requests per week, max 2 per day, sends only Tuesday / Thursday /
Saturday. A velocity spike previously tripped Google's spam filter and
deleted reviews; the caps override everything.

Flow: BK export -> eligible queue (ranked) -> today's sends (capped)
-> mark sent -> log reviews as they land -> bonuses + 75-review tracker.
"""
from datetime import date, datetime, timedelta

from . import config
from . import constants as C
from .bonuses import is_qualifying_clean, payout_report  # re-export for CLI

REQUEST_SMS = (
    "Hi {first_name}! Ryan from Haven House Cleaning here — so glad "
    "{sparkle}. If you have 60 seconds, a Google "
    "review helps our small local team more than you know: "
    "https://g.page/r/havenhouseclean/review — thank you!"
)


def _week_bounds(d):
    """ISO week Mon..Sun containing date d."""
    start = d - timedelta(days=d.weekday())
    return start, start + timedelta(days=6)


def sent_counts(con, today):
    """(sent_today, sent_this_week) from the request ledger."""
    wk_start, wk_end = _week_bounds(today)
    row = con.execute(
        "SELECT SUM(CASE WHEN sent_date=? THEN 1 ELSE 0 END) d, "
        "COUNT(*) w FROM review_requests WHERE status='sent' "
        "AND sent_date BETWEEN ? AND ?",
        (today.isoformat(), wk_start.isoformat(), wk_end.isoformat())).fetchone()
    return (row["d"] or 0, row["w"] or 0)


def slots_available(con, today):
    """How many requests may be sent today under RULE 1. Never negative."""
    if today.weekday() not in C.REVIEW_SEND_WEEKDAYS:
        return 0
    sent_today, sent_week = sent_counts(con, today)
    return max(0, min(C.REVIEW_MAX_PER_DAY - sent_today,
                      C.REVIEW_MAX_PER_WEEK - sent_week))


def eligible_queue(con, limit=50):
    """Completed cleans with no request yet, one row per customer, ranked
    by likelihood of a 5-star: recurring clients first, zero complaints,
    perfect-clean jobs, then most recent."""
    rows = con.execute(
        """SELECT b.* FROM bookings b
           WHERE b.status='completed'
             AND b.customer_name NOT IN
                 (SELECT customer_name FROM review_requests)
             AND b.customer_name NOT IN
                 (SELECT reviewer_name FROM reviews WHERE reviewer_name != '')
           ORDER BY b.date DESC""").fetchall()
    best = {}
    for b in rows:
        name = b["customer_name"]
        score = 0
        if (b["frequency"] or "one-time") != "one-time":
            score += 3
        if not b["complaint"]:
            score += 2
        else:
            score -= 5
        if is_qualifying_clean(b):
            score += 2
        prev = best.get(name)
        if prev is None or score > prev["score"]:
            best[name] = {**dict(b), "score": score}
    ranked = sorted(best.values(), key=lambda x: (-x["score"], _desc_date(x["date"])))
    return ranked[:limit]


def _desc_date(d):
    # sort helper: newer dates first within equal score
    return tuple(-int(p) for p in d.split("-"))


def todays_sends(con, today=None):
    """The exact clients to trigger in BK today, with SMS text, capped.

    Returns dict: {date, is_send_day, slots, sends: [...], next_send_day}.
    """
    today = today or date.today()
    slots = slots_available(con, today)
    is_send_day = today.weekday() in C.REVIEW_SEND_WEEKDAYS
    sends = []
    if slots > 0:
        for cand in eligible_queue(con, limit=slots):
            first = (cand["customer_name"] or "there").split()[0]
            sparkle = (f"{cand['cleaner']} left your home sparkling"
                       if cand["cleaner"] else "your home is sparkling")
            sends.append({
                "customer_name": cand["customer_name"],
                "customer_phone": cand["customer_phone"],
                "customer_email": cand["customer_email"],
                "cleaner": cand["cleaner"],
                "booking_pk": cand["id"],
                "last_clean": cand["date"],
                "sms": REQUEST_SMS.format(first_name=first, sparkle=sparkle),
            })
    nxt = today + timedelta(days=1)
    while nxt.weekday() not in C.REVIEW_SEND_WEEKDAYS:
        nxt += timedelta(days=1)
    return {"date": today.isoformat(), "is_send_day": is_send_day,
            "slots": slots, "sends": sends, "next_send_day": nxt.isoformat()}


def mark_sent(con, customer_name, today=None, booking_pk=None, cleaner=""):
    """Record a request as sent. Refuses to break RULE 1."""
    today = today or date.today()
    if slots_available(con, today) <= 0:
        raise RuntimeError(
            "RULE 1 violation blocked: no send slots left "
            f"({C.REVIEW_MAX_PER_DAY}/day, {C.REVIEW_MAX_PER_WEEK}/week, "
            "Tue/Thu/Sat only). This cap protects the Google profile.")
    con.execute(
        "INSERT INTO review_requests (customer_name, booking_pk, cleaner, "
        "scheduled_date, sent_date, status) VALUES (?,?,?,?,?,'sent')",
        (customer_name, booking_pk, cleaner, today.isoformat(), today.isoformat()))
    con.commit()


def log_review(con, review_date, reviewer_name, rating=5, cleaner="",
               booking_id="", notes=""):
    con.execute(
        "INSERT OR IGNORE INTO reviews (review_date, reviewer_name, rating, "
        "cleaner, booking_id, notes) VALUES (?,?,?,?,?,?)",
        (review_date, reviewer_name, int(rating), cleaner, booking_id, notes))
    con.commit()


def review_baseline(con):
    row = con.execute("SELECT value FROM meta WHERE key='review_baseline'").fetchone()
    return int(row["value"]) if row else 0


def set_review_baseline(con, n):
    """Google review count BEFORE HavenOS started logging (so progress
    toward 75 reflects the real profile total)."""
    con.execute("INSERT OR REPLACE INTO meta (key, value) VALUES "
                "('review_baseline', ?)", (str(int(n)),))
    con.commit()


def progress_to_75(con, today=None):
    """Total reviews, velocity (last 28 days), projected date to hit 75."""
    today = today or date.today()
    total = review_baseline(con) + con.execute(
        "SELECT COUNT(*) n FROM reviews").fetchone()["n"]
    since = (today - timedelta(days=28)).isoformat()
    recent = con.execute(
        "SELECT COUNT(*) n FROM reviews WHERE review_date >= ?",
        (since,)).fetchone()["n"]
    per_week = recent / 4.0
    remaining = max(0, C.LSA_REVIEW_THRESHOLD - total)
    projected = None
    if remaining == 0:
        projected = today.isoformat()
    elif per_week > 0:
        projected = (today + timedelta(weeks=remaining / per_week)).isoformat()
    return {"total_reviews": total, "target": C.LSA_REVIEW_THRESHOLD,
            "remaining": remaining, "velocity_per_week": round(per_week, 2),
            "projected_date": projected, "lsa_note": C.LSA_BID_WARNING}
