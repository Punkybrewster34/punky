"""Module 8 — LSA Discipline Module.

The whole LSA playbook until 75 reviews: log every lead, mark every
booked one in the LSA app (marking leads booked is what trains Google's
matching), and DO NOT touch bids. The 75-review tracker is shared with
Module 2. RULE 3's warning is hard-coded into every output.
"""
from datetime import date

from . import reviews
from . import constants as C


def add(con, name, phone="", received_date=None, notes=""):
    con.execute(
        "INSERT INTO lsa_leads (received_date, name, phone, marked_booked, notes) "
        "VALUES (?,?,?,0,?)",
        (received_date or date.today().isoformat(), name, phone, notes))
    con.commit()


def mark_booked(con, lead_id):
    cur = con.execute(
        "UPDATE lsa_leads SET marked_booked=1 WHERE id=?", (lead_id,))
    con.commit()
    if cur.rowcount == 0:
        raise ValueError(f"no LSA lead #{lead_id}")


def unmarked(con):
    """The reminder list — leads not yet marked booked in the LSA app."""
    return [dict(r) for r in con.execute(
        "SELECT * FROM lsa_leads WHERE marked_booked=0 ORDER BY received_date")]


def summary(con, today=None):
    row = con.execute(
        "SELECT COUNT(*) total, SUM(marked_booked) booked FROM lsa_leads").fetchone()
    prog = reviews.progress_to_75(con, today)
    return {
        "leads_received": row["total"] or 0,
        "marked_booked": row["booked"] or 0,
        "unmarked": (row["total"] or 0) - (row["booked"] or 0),
        "review_progress": prog,
        "bid_warning": C.LSA_BID_WARNING,
    }
