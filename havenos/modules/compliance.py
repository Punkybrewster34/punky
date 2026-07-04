"""Module 5 — Cleaner Compliance Auditor.

Parses the BK booking export per cleaner per job: On-My-Way used,
clock-in within 10 minutes of start, clocked out, photo count >= 10,
complaint flag. Tracks perfect-clean streaks and qualifying-clean counts
toward the $100/10 bonus, renders the monthly Standards Audit HTML
(contractor-safe language throughout: qualification, audit, standards,
non-renewal — never employment terms), and flags anyone trending toward
non-renewal criteria WITH bench depth alongside — enforcement without a
bench is an empty threat.
"""
from datetime import date, timedelta

from . import bonuses
from . import constants as C
from . import html as H

# Non-renewal watch thresholds (trailing 30 days)
WATCH_MIN_JOBS = 4          # need a real sample before flagging
WATCH_QUALIFYING_RATE = 50  # % of jobs meeting the full standard
WATCH_ONTIME_RATE = 80      # % on time
WATCH_COMPLAINTS = 2        # complaints in the window


def job_checks(b):
    """The five audit checks for one completed booking row."""
    late = bonuses.minutes_late(b["start_time"], b["clock_in"])
    return {
        "on_my_way": bool(b["on_my_way"]),
        "on_time": late is not None and late <= C.QUALIFYING_ON_TIME_MINUTES,
        "clocked_out": bool(b["clock_in"] and b["clock_out"]),
        "photos_ok": (b["photo_count"] or 0) >= C.QUALIFYING_MIN_PHOTOS,
        "no_complaint": not b["complaint"],
    }


def audit(con, since=None, until=None):
    """Per-cleaner audit table over completed jobs in [since, until]."""
    where = "WHERE status='completed' AND cleaner != ''"
    args = []
    if since:
        where += " AND date >= ?"
        args.append(since)
    if until:
        where += " AND date <= ?"
        args.append(until)
    rows = con.execute(
        f"SELECT * FROM bookings {where} ORDER BY cleaner, date", args).fetchall()

    out = {}
    for b in rows:
        a = out.setdefault(b["cleaner"], {
            "cleaner": b["cleaner"], "jobs": 0, "on_my_way": 0, "on_time": 0,
            "clocked_out": 0, "photos_ok": 0, "complaints": 0,
            "qualifying": 0, "current_streak": 0, "best_streak": 0,
        })
        ck = job_checks(b)
        a["jobs"] += 1
        for k in ("on_my_way", "on_time", "clocked_out", "photos_ok"):
            a[k] += 1 if ck[k] else 0
        a["complaints"] += 0 if ck["no_complaint"] else 1
        if bonuses.is_qualifying_clean(b):
            a["qualifying"] += 1
            a["current_streak"] += 1
            a["best_streak"] = max(a["best_streak"], a["current_streak"])
        else:
            a["current_streak"] = 0

    for a in out.values():
        j = a["jobs"] or 1
        for k in ("on_my_way", "on_time", "clocked_out", "photos_ok"):
            a[f"{k}_pct"] = round(a[k] / j * 100)
        a["qualifying_pct"] = round(a["qualifying"] / j * 100)
        a["to_next_bonus"] = (C.PERFECT_CLEAN_EVERY
                              - a["qualifying"] % C.PERFECT_CLEAN_EVERY) \
            % C.PERFECT_CLEAN_EVERY or C.PERFECT_CLEAN_EVERY
    return sorted(out.values(), key=lambda a: -a["qualifying_pct"])


def bench_depth(con):
    """From Module 7's tables (Phase 3 fills them; schema exists now)."""
    q = lambda stage: con.execute(
        "SELECT COUNT(*) n FROM applicants WHERE stage=?", (stage,)).fetchone()["n"]
    pipeline = con.execute(
        "SELECT COUNT(*) n FROM applicants WHERE stage IN "
        "('applied','screened','checkr','qualification_audit')").fetchone()["n"]
    return {"active": q("active"), "bench": q("bench"), "pipeline": pipeline}


def flags(con, today=None):
    """Cleaners trending toward non-renewal criteria (trailing 30 days),
    each flag paired with current bench depth."""
    today = today or date.today()
    since = (today - timedelta(days=30)).isoformat()
    bench = bench_depth(con)
    result = []
    for a in audit(con, since=since):
        if a["jobs"] < WATCH_MIN_JOBS:
            continue
        reasons = []
        if a["qualifying_pct"] < WATCH_QUALIFYING_RATE:
            reasons.append(f"qualifying-clean rate {a['qualifying_pct']}% "
                           f"(standard: {WATCH_QUALIFYING_RATE}%+)")
        if a["on_time_pct"] < WATCH_ONTIME_RATE:
            reasons.append(f"on-time rate {a['on_time_pct']}% "
                           f"(standard: {WATCH_ONTIME_RATE}%+)")
        if a["complaints"] >= WATCH_COMPLAINTS:
            reasons.append(f"{a['complaints']} complaints in 30 days")
        if reasons:
            result.append({"cleaner": a["cleaner"], "jobs_30d": a["jobs"],
                           "reasons": reasons, "bench": bench})
    return result


def scorecard_html(con, today=None):
    """dashboards/compliance.html — monthly Standards Audit + payout
    summary combining Modules 2 and 5."""
    today = today or date.today()
    since = (today - timedelta(days=30)).isoformat()
    audit_rows = audit(con, since=since)
    payouts = {p["cleaner"]: p for p in bonuses.payout_report(con)}
    bench = bench_depth(con)

    def qual_badge(a):
        if a["qualifying_pct"] >= 80:
            return H.badge("MEETS STANDARD", "green")
        if a["qualifying_pct"] >= WATCH_QUALIFYING_RATE:
            return H.badge("REVIEW SOPs", "amber")
        return H.badge("AUDIT WATCH", "red")

    rows = [[a["cleaner"], a["jobs"],
             f'{a["on_my_way_pct"]}%', f'{a["on_time_pct"]}%',
             f'{a["clocked_out_pct"]}%', f'{a["photos_ok_pct"]}%',
             a["complaints"], f'{a["qualifying"]} ({a["qualifying_pct"]}%)',
             a["current_streak"],
             f'{a["to_next_bonus"]} more', qual_badge(a)]
            for a in audit_rows]
    audit_table = H.table(
        ["Cleaner", "Jobs", "On-My-Way", "On-time", "Clock in+out",
         "10+ photos", "Complaints", "Qualifying cleans", "Streak",
         "To next $100", "Qualification status"], rows) if rows else \
        '<div class="callout">No completed jobs with an assigned cleaner in the last 30 days.</div>'

    pay_rows = [[p["cleaner"], p["five_star_reviews"], H.money(p["review_dollars"]),
                 H.money(p["milestone_dollars"]), p["qualifying_cleans"],
                 H.money(p["perfect_clean_dollars"]),
                 p["review_generating_cleans"], H.money(p["review_clean_dollars"]),
                 f'<b>{H.money(p["total_dollars"])}</b>']
                for p in payouts.values()]
    pay_table = H.table(
        ["Cleaner", "5★ reviews", "Review $", "Milestone $",
         "Qualifying cleans (lifetime)", "Perfect-clean $", "Review-cleans",
         "Review-clean $", "Total earned"], pay_rows) if pay_rows else \
        '<div class="callout">No bonus activity yet.</div>'

    fl = flags(con, today)
    if fl:
        items = "".join(
            f'<div class="callout"><b>{H.esc(f["cleaner"])}</b> — '
            + "; ".join(H.esc(r) for r in f["reasons"])
            + f'<br><span class="note">Bench depth: {f["bench"]["bench"]} '
              f'qualified on bench, {f["bench"]["pipeline"]} in pipeline. '
            + ("Bench is thin — line up replacements before any "
               "non-renewal conversation." if f["bench"]["bench"] < 2
               else "Bench can absorb a non-renewal.")
            + '</span></div>' for f in fl)
    else:
        items = '<div class="callout">No cleaners on the non-renewal watch list. ✔</div>'

    body = f"""
<h2>Standards Audit — trailing 30 days</h2>{audit_table}
<p class="note">Qualifying clean = On-My-Way pressed · clock-in within
{C.QUALIFYING_ON_TIME_MINUTES} min of start · clocked in and out ·
{C.QUALIFYING_MIN_PHOTOS}+ BookingKoala photos · zero complaints.
Standards and SOPs are set out in each contractor's service agreement.</p>
<h2>Bonus Payout Summary (Rules 2 — cumulative)</h2>{pay_table}
<p class="note">Pay the difference vs. last month's report. Review $ and
milestone $ come from the review ledger (Module 2); perfect-clean $ from
the qualifying-clean ledger above.</p>
<h2>Non-Renewal Watch</h2>{items}"""
    return H.write("compliance.html",
                   H.page("Standards Audit", body, "Cleaner Compliance Auditor"))
