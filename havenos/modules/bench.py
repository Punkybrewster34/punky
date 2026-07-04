"""Module 7 — Recruiting Bench Tracker.

Applicant pipeline (Indeed CSV export or manual entry):
  applied -> screened -> checkr -> qualification_audit -> active / bench / out

Bench depth (active / bench-ready / in pipeline) surfaces on the KPI
scorecard and next to every compliance flag — enforcement without a
bench is an empty threat. Also the route-density view: jobs by zip
cluster per cleaner, because scattered routes are the #1 turnover lever.
"""
from datetime import date, timedelta

from . import importers

STAGES = ("applied", "screened", "checkr", "qualification_audit",
          "active", "bench", "out")
NEXT_STAGE = {"applied": "screened", "screened": "checkr",
              "checkr": "qualification_audit", "qualification_audit": "bench"}

# route-density thresholds (trailing 30 days)
SCATTER_MIN_JOBS = 6
SCATTER_MIN_ZIPS = 4
SCATTER_TOP_SHARE = 50  # % of jobs in the busiest zip


def add(con, name, phone="", email="", source="manual", stage="applied",
        applied_date=None, notes=""):
    if stage not in STAGES:
        raise ValueError(f"stage must be one of {STAGES}")
    con.execute(
        "INSERT INTO applicants (name, phone, email, source, stage, "
        "applied_date, notes, updated_at) VALUES (?,?,?,?,?,?,?,datetime('now'))",
        (name, phone, email, source, stage,
         applied_date or date.today().isoformat(), notes))
    con.commit()


def move(con, applicant_id, stage):
    if stage not in STAGES:
        raise ValueError(f"stage must be one of {STAGES}")
    cur = con.execute(
        "UPDATE applicants SET stage=?, updated_at=datetime('now') WHERE id=?",
        (stage, applicant_id))
    con.commit()
    if cur.rowcount == 0:
        raise ValueError(f"no applicant #{applicant_id}")


def import_csv(con, path):
    """Indeed export / any applicant CSV via column_maps.applicants."""
    n = 0
    for r in importers.read_mapped(path, "applicants", required=("name",)):
        stage = (r.get("stage") or "applied").lower().replace(" ", "_")
        if stage not in STAGES:
            stage = "applied"
        d = importers.parse_date(r.get("applied_date"))
        exists = con.execute(
            "SELECT 1 FROM applicants WHERE lower(name)=lower(?)",
            (r.get("name"),)).fetchone()
        if exists:
            continue
        con.execute(
            "INSERT INTO applicants (name, phone, email, source, stage, "
            "applied_date, notes, updated_at) VALUES (?,?,?,?,?,?,?,datetime('now'))",
            (r.get("name"), r.get("phone", ""), r.get("email", ""),
             r.get("source", "indeed"), stage,
             d.isoformat() if d else date.today().isoformat(),
             r.get("notes", "")))
        n += 1
    con.commit()
    return n


def pipeline(con):
    rows = con.execute(
        "SELECT * FROM applicants WHERE stage != 'out' "
        "ORDER BY CASE stage "
        " WHEN 'bench' THEN 0 WHEN 'active' THEN 1 WHEN 'qualification_audit' THEN 2 "
        " WHEN 'checkr' THEN 3 WHEN 'screened' THEN 4 ELSE 5 END, applied_date").fetchall()
    return [dict(r) for r in rows]


def depth(con, today=None):
    """Bench-depth metric: cleaners actually working (from bookings),
    bench-ready contractors, applicants mid-pipeline. Red when bench < 2."""
    today = today or date.today()
    since = (today - timedelta(days=30)).isoformat()
    active_working = con.execute(
        "SELECT COUNT(DISTINCT cleaner) n FROM bookings "
        "WHERE cleaner != '' AND status='completed' AND date >= ?",
        (since,)).fetchone()["n"]
    q = lambda w: con.execute(
        f"SELECT COUNT(*) n FROM applicants WHERE {w}").fetchone()["n"]
    return {
        "active_cleaners": active_working,
        "bench_ready": q("stage='bench'"),
        "in_pipeline": q("stage IN ('applied','screened','checkr','qualification_audit')"),
        "red_flag": q("stage='bench'") < 2,
    }


def route_density(con, today=None):
    """Jobs by zip cluster per cleaner, trailing 30 days. A cleaner is
    'scattered' when they work many zips with no dominant cluster —
    the top turnover driver, so fix routes before anything else."""
    today = today or date.today()
    since = (today - timedelta(days=30)).isoformat()
    rows = con.execute(
        "SELECT cleaner, zip, COUNT(*) n FROM bookings "
        "WHERE cleaner != '' AND status='completed' AND date >= ? "
        "GROUP BY cleaner, zip ORDER BY cleaner, n DESC", (since,)).fetchall()
    per = {}
    for r in rows:
        c = per.setdefault(r["cleaner"], {"cleaner": r["cleaner"], "jobs": 0,
                                          "zips": [], "top_zip": None,
                                          "top_zip_jobs": 0})
        c["jobs"] += r["n"]
        c["zips"].append((r["zip"] or "?", r["n"]))
        if c["top_zip"] is None:
            c["top_zip"], c["top_zip_jobs"] = (r["zip"] or "?"), r["n"]
    out = []
    for c in per.values():
        c["zip_count"] = len(c["zips"])
        c["top_share"] = round(c["top_zip_jobs"] / c["jobs"] * 100) if c["jobs"] else 0
        c["scattered"] = (c["jobs"] >= SCATTER_MIN_JOBS
                          and c["zip_count"] >= SCATTER_MIN_ZIPS
                          and c["top_share"] < SCATTER_TOP_SHARE)
        out.append(c)
    return sorted(out, key=lambda c: (not c["scattered"], -c["jobs"]))
