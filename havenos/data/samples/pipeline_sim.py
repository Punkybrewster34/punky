"""Demo-only helper: walks imported sample leads through the pipeline
(contacted/quoted/booked/recurring/lost with realistic first-touch
times) so response-time, funnel and CAC reports show real numbers.
Used exclusively by `python haven.py demo` — never in production."""
import random
from datetime import datetime, timedelta


def apply(con):
    random.seed(7)
    rows = con.execute(
        "SELECT id, created_at FROM leads ORDER BY created_at").fetchall()
    # leave the 3 newest untouched so the uncontacted queue has entries
    for r in rows[:-3]:
        created = datetime.fromisoformat(r["created_at"])
        minutes = random.choice([2, 3, 4, 4, 5, 6, 8, 12, 25, 45])
        touched = created + timedelta(minutes=minutes)
        roll = random.random()
        if roll < 0.12:
            chain = ["contacted", "lost"]
        elif roll < 0.40:
            chain = ["contacted"]
        elif roll < 0.55:
            chain = ["contacted", "quoted"]
        elif roll < 0.80:
            chain = ["contacted", "quoted", "booked"]
        else:
            chain = ["contacted", "quoted", "booked", "recurring"]
        when = touched
        for i, status in enumerate(chain):
            stamp_col = {"contacted": "first_contact_at", "booked": "booked_at",
                         "recurring": "recurring_at", "lost": "lost_at"}.get(status)
            when = when + timedelta(hours=0 if i == 0 else random.randint(4, 72))
            if stamp_col:
                con.execute(
                    f"UPDATE leads SET status=?, {stamp_col}=? WHERE id=?",
                    (status, when.isoformat(sep=" "), r["id"]))
            else:
                con.execute("UPDATE leads SET status=? WHERE id=?",
                            (status, r["id"]))
    con.commit()
