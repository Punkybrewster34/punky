"""Module 3 — KPI Command Center.

Weekly scorecard from BK CSV imports + Module 1 CAC + Module 2 review
velocity, rendered to dashboards/scorecard.html (branded, one screen,
week-over-week deltas, $60K/month progress bar, methodology footnote).
"""
from datetime import date, timedelta

from . import bench, config, leads, reviews
from . import html as H

RECURRING = "frequency != 'one-time' AND frequency != ''"


def _week_of(d):
    start = d - timedelta(days=d.weekday())
    return start, start + timedelta(days=6)


def anchor_date(con):
    """Most recent completed booking date — 'this week' for the scorecard."""
    row = con.execute(
        "SELECT MAX(date) d FROM bookings WHERE status='completed'").fetchone()
    return date.fromisoformat(row["d"]) if row["d"] else date.today()


def week_metrics(con, anchor):
    ws, we = _week_of(anchor)
    q = lambda sql, *args: con.execute(sql, args).fetchone()
    base = ("FROM bookings WHERE status='completed' AND date BETWEEN ? AND ?",
            ws.isoformat(), we.isoformat())
    rev = q(f"SELECT COALESCE(SUM(amount),0) v {base[0]}", *base[1:])["v"]
    rec = q(f"SELECT COALESCE(SUM(amount),0) v {base[0]} AND {RECURRING}", *base[1:])["v"]
    jobs = q(f"SELECT COUNT(*) v {base[0]}", *base[1:])["v"]
    cleaners = q(f"SELECT COUNT(DISTINCT cleaner) v {base[0]} AND cleaner!=''", *base[1:])["v"]
    churn = q("SELECT COUNT(DISTINCT customer_name) v FROM bookings "
              f"WHERE status IN ('cancelled','paused') AND {RECURRING} "
              "AND date BETWEEN ? AND ?", ws.isoformat(), we.isoformat())["v"]
    # active recurring = recurring customers seen in the 45 days ending this week
    active = q("SELECT COUNT(DISTINCT customer_name) v FROM bookings "
               f"WHERE status='completed' AND {RECURRING} AND date BETWEEN ? AND ?",
               (we - timedelta(days=45)).isoformat(), we.isoformat())["v"]
    new_reviews = q("SELECT COUNT(*) v FROM reviews WHERE review_date BETWEEN ? AND ?",
                    ws.isoformat(), we.isoformat())["v"]
    return {
        "week_start": ws.isoformat(), "week_end": we.isoformat(),
        "revenue": round(rev, 2), "recurring_revenue": round(rec, 2),
        "onetime_revenue": round(rev - rec, 2),
        "recurring_pct": round(rec / rev * 100, 1) if rev else 0.0,
        "jobs": jobs, "avg_job_value": round(rev / jobs, 2) if jobs else 0.0,
        "jobs_per_cleaner": round(jobs / cleaners, 1) if cleaners else 0.0,
        "active_recurring_clients": active, "churn_count": churn,
        "new_reviews": new_reviews,
    }


def trailing_revenue(con, anchor, days=30):
    row = con.execute(
        "SELECT COALESCE(SUM(amount),0) v FROM bookings WHERE status='completed' "
        "AND date BETWEEN ? AND ?",
        ((anchor - timedelta(days=days - 1)).isoformat(), anchor.isoformat())).fetchone()
    return round(row["v"], 2)


def ltv_estimate(con, anchor):
    """LTV = avg monthly recurring revenue per active client x gross margin
    x average retention months (assumptions in config, shown in footnote)."""
    cfg = config.load()["ltv_model"]
    m = week_metrics(con, anchor)
    monthly_rec = trailing_revenue_recurring(con, anchor, 28)
    clients = m["active_recurring_clients"]
    if not clients or not monthly_rec:
        return None
    per_client = monthly_rec / clients
    return round(per_client * (cfg["gross_margin_pct"] / 100.0)
                 * cfg["avg_retention_months"], 2)


def trailing_revenue_recurring(con, anchor, days):
    row = con.execute(
        "SELECT COALESCE(SUM(amount),0) v FROM bookings WHERE status='completed' "
        f"AND {RECURRING} AND date BETWEEN ? AND ?",
        ((anchor - timedelta(days=days - 1)).isoformat(), anchor.isoformat())).fetchone()
    return round(row["v"], 2)


def blended_cac(con, month_key):
    """Total spend / recurring clients won that month (fallback: booked)."""
    rows = leads.cac_report(con, month_key)
    spend = sum(r["spend"] for r in rows)
    recurring = sum(r["recurring"] for r in rows)
    booked = sum(r["booked"] for r in rows)
    return {
        "spend": spend, "booked": booked, "recurring": recurring,
        "per_booked": round(spend / booked, 2) if booked and spend else None,
        "per_recurring": round(spend / recurring, 2) if recurring and spend else None,
    }


def agency_readiness(con, anchor):
    """Trailing-3-month gates: CAC payback within 1-2 cleans, recurring
    >=60% of revenue, LTV:CAC >= 3. All three green = agency-ready."""
    t = config.load()["targets"]
    cfg = config.load()["ltv_model"]
    rev90 = trailing_revenue(con, anchor, 90)
    rec90 = trailing_revenue_recurring(con, anchor, 90)
    rec_pct = round(rec90 / rev90 * 100, 1) if rev90 else 0.0

    month_key = anchor.isoformat()[:7]
    cac = blended_cac(con, month_key)
    m = week_metrics(con, anchor)
    job_profit = m["avg_job_value"] * cfg["gross_margin_pct"] / 100.0
    payback_ok = (cac["per_booked"] is not None and job_profit > 0
                  and cac["per_booked"] <= t["cac_payback_cleans"] * job_profit)
    payback_cleans = (round(cac["per_booked"] / job_profit, 1)
                      if cac["per_booked"] and job_profit else None)

    ltv = ltv_estimate(con, anchor)
    ratio = (round(ltv / cac["per_recurring"], 2)
             if ltv and cac["per_recurring"] else None)
    return {
        "recurring_pct_90d": rec_pct,
        "recurring_ok": rec_pct >= t["recurring_pct_of_revenue"],
        "cac_per_booked": cac["per_booked"],
        "cac_payback_cleans": payback_cleans,
        "payback_ok": payback_ok,
        "ltv": ltv, "cac_per_recurring": cac["per_recurring"],
        "ltv_cac_ratio": ratio,
        "ltv_cac_ok": ratio is not None and ratio >= t["ltv_cac_ratio"],
    }


def _delta(cur, prev, is_money=False, suffix=""):
    if prev in (None, 0) and cur in (None, 0):
        return "±0"
    diff = (cur or 0) - (prev or 0)
    sign = "+" if diff > 0 else ("-" if diff < 0 else "±")
    v = abs(diff)
    body = f"${v:,.0f}" if is_money else (f"{v:,.1f}".rstrip("0").rstrip(".") or "0")
    return f"{sign}{body}{suffix}"


def scorecard_body(con, anchor=None):
    """HTML <main> body for the scorecard — reused inside monday.html."""
    anchor = anchor or anchor_date(con)
    cur = week_metrics(con, anchor)
    prev = week_metrics(con, anchor - timedelta(days=7))
    t = config.load()["targets"]
    rev30 = trailing_revenue(con, anchor, 30)
    prog = reviews.progress_to_75(con, anchor)
    ready = agency_readiness(con, anchor)
    month_key = anchor.isoformat()[:7]
    cac_rows = leads.cac_report(con, month_key)

    tiles = "".join([
        H.tile("Revenue (wk)", H.money(cur["revenue"]),
               _delta(cur["revenue"], prev["revenue"], True)),
        H.tile("Recurring rev (wk)", H.money(cur["recurring_revenue"]),
               _delta(cur["recurring_revenue"], prev["recurring_revenue"], True)),
        H.tile("Recurring % of rev", H.pct(cur["recurring_pct"]),
               _delta(cur["recurring_pct"], prev["recurring_pct"], suffix="pt")),
        H.tile("Active recurring", cur["active_recurring_clients"],
               _delta(cur["active_recurring_clients"], prev["active_recurring_clients"])),
        H.tile("Churn (wk)", cur["churn_count"],
               _delta(cur["churn_count"], prev["churn_count"])),
        H.tile("Avg job value", H.money(cur["avg_job_value"]),
               _delta(cur["avg_job_value"], prev["avg_job_value"], True)),
        H.tile("Jobs / cleaner (wk)", cur["jobs_per_cleaner"],
               _delta(cur["jobs_per_cleaner"], prev["jobs_per_cleaner"])),
        H.tile("Reviews total", prog["total_reviews"],
               f"+{cur['new_reviews']} this wk"),
        H.tile("Review velocity", f"{prog['velocity_per_week']}/wk"),
    ])
    bd = bench.depth(con, anchor)
    tiles += H.tile("Bench depth",
                    f"{bd['bench_ready']}" + (" ⚠" if bd["red_flag"] else ""),
                    f"{bd['active_cleaners']} active · {bd['in_pipeline']} in pipe")

    goal_bar = H.progress_bar(
        rev30, t["monthly_revenue"],
        f"{H.money(rev30)} of {H.money(t['monthly_revenue'])}/mo goal "
        f"({rev30 / t['monthly_revenue'] * 100:.0f}%) — trailing 30 days")

    cac_table = H.table(
        ["Channel", "Spend", "Leads", "Booked", "Recurring",
         "Cost/booked job", "Cost/recurring client"],
        [[r["source"], H.money(r["spend"]), r["leads"], r["booked"], r["recurring"],
          H.money(r["cost_per_booked_job"]), H.money(r["cost_per_recurring_client"])]
         for r in cac_rows] or [["(no spend configured for " + month_key + ")", "", "", "", "", "", ""]])

    def gate(ok, text):
        return H.badge("PASS" if ok else "NOT YET", "green" if ok else "amber") + " " + H.esc(text)

    ready_html = "<br>".join([
        gate(ready["payback_ok"],
             f"CAC recovers in ≤{t['cac_payback_cleans']} cleans "
             f"(now: {ready['cac_payback_cleans'] if ready['cac_payback_cleans'] is not None else '—'} cleans, "
             f"CAC/booked {H.money(ready['cac_per_booked'])})"),
        gate(ready["recurring_ok"],
             f"Recurring ≥ {t['recurring_pct_of_revenue']}% of revenue "
             f"(trailing 90d: {ready['recurring_pct_90d']}%)"),
        gate(ready["ltv_cac_ok"],
             f"LTV:CAC ≥ {t['ltv_cac_ratio']}:1 "
             f"(now: {ready['ltv_cac_ratio'] if ready['ltv_cac_ratio'] is not None else '—'}, "
             f"LTV {H.money(ready['ltv'])})"),
    ])
    all_green = ready["payback_ok"] and ready["recurring_ok"] and ready["ltv_cac_ok"]

    ltv_cfg = config.load()["ltv_model"]
    method = (
        "<b>Methodology.</b> Week = Mon–Sun containing the latest completed "
        f"booking ({cur['week_start']} → {cur['week_end']}); deltas vs prior week. "
        "Revenue counts <i>completed</i> bookings only. Recurring = any BK "
        "frequency other than one-time. Active recurring clients = distinct "
        "recurring customers with a completed clean in the trailing 45 days. "
        "Churn (wk) = recurring clients with a cancelled/paused visit this week. "
        "CAC = config channel_spend ÷ leads created that month reaching "
        "booked/recurring status. "
        f"LTV = monthly recurring revenue per active client × {ltv_cfg['gross_margin_pct']}% "
        f"gross margin × {ltv_cfg['avg_retention_months']}-month average retention "
        "(assumptions in config.yaml). CAC payback in cleans = blended "
        "cost-per-booked-job ÷ (avg job value × gross margin). Review total = "
        "baseline + logged reviews; velocity = last 28 days ÷ 4.")

    return f"""
<h2>Week of {cur['week_start']}</h2>
<div class="tiles">{tiles}</div>
<h2>$60K / Month</h2>{goal_bar}
<h2>CAC by Channel — {month_key}</h2>{cac_table}
<h2>Agency-Readiness {"" if not all_green else H.badge("ALL SYSTEMS GO", "green")}</h2>
<div class="callout">{ready_html}</div>
<h2>Reviews → 75 (LSA)</h2>
{H.progress_bar(prog['total_reviews'], prog['target'],
                f"{prog['total_reviews']} of {prog['target']} reviews")}
<p class="note">Projected to hit 75: <b>{H.esc(prog['projected_date'] or 'n/a — no recent velocity')}</b>
at {prog['velocity_per_week']}/week. <b>{H.esc(prog['lsa_note'])}</b></p>
<p class="note">{method}</p>"""


def generate_scorecard(con, anchor=None):
    body = scorecard_body(con, anchor)
    return H.write("scorecard.html", H.page("Weekly Scorecard", body,
                                            "KPI Command Center"))
