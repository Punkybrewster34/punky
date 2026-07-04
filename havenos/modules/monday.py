"""Module 9 — The Monday Command (Phase 1 scope).

`python haven.py monday`: imports every CSV in data/inbox/, refreshes
dashboards, and writes dashboards/monday.html — scorecard, today's
review sends, uncontacted leads, and a top-3 "This Week's Moves" list
generated from whichever metric is furthest from target. Sections for
prospects / churn / compliance / bench appear when Phase 2-3 ship.
"""
import glob
import os
from datetime import date

from . import config, importers, kpi, leads, reviews
from . import html as H


def import_inbox(con):
    """Import every CSV in data/inbox/. Filename decides the importer:
    must contain 'lead', 'booking', or 'review'."""
    results = []
    for path in sorted(glob.glob(os.path.join(config.INBOX_DIR, "*.csv"))):
        res = importers.auto_import(con, path)
        if res:
            results.append((os.path.basename(path), res[0], res[1]))
        else:
            results.append((os.path.basename(path), "SKIPPED (rename to include "
                            "'leads', 'bookings' or 'reviews')", 0))
    return results


def weeks_moves(con, anchor):
    """Top-3 actions ranked by relative distance from target."""
    t = config.load()["targets"]
    candidates = []

    rev30 = kpi.trailing_revenue(con, anchor, 30)
    gap = 1 - rev30 / t["monthly_revenue"] if t["monthly_revenue"] else 0
    candidates.append((gap, f"Revenue is {H.money(rev30)}/mo vs the "
                       f"{H.money(t['monthly_revenue'])} goal. Fastest lever: work "
                       "the uncontacted-lead list below to zero today, then book "
                       "quotes for every 'contacted' lead."))

    m = kpi.week_metrics(con, anchor)
    if m["recurring_pct"] < t["recurring_pct_of_revenue"]:
        gap_r = (t["recurring_pct_of_revenue"] - m["recurring_pct"]) / t["recurring_pct_of_revenue"]
        candidates.append((gap_r, f"Recurring is {m['recurring_pct']}% of revenue "
                           f"(target {t['recurring_pct_of_revenue']}%). Recurring is "
                           "the condition of the offer — quote weekly/biweekly/"
                           "monthly first on every new lead this week."))

    prog = reviews.progress_to_75(con, anchor)
    if prog["remaining"] > 0:
        gap_v = prog["remaining"] / prog["target"]
        candidates.append((gap_v, f"{prog['remaining']} reviews to the 75-review "
                           f"LSA threshold (velocity {prog['velocity_per_week']}/wk). "
                           "Send every allowed request on Tue/Thu/Sat — the send "
                           f"list is below. {prog['lsa_note']}"))

    un = leads.uncontacted(con)
    if un:
        oldest = max(l["age_minutes"] for l in un)
        candidates.append((min(1.0, oldest / 60), f"{len(un)} uncontacted lead(s); "
                           f"oldest is {oldest} min old vs the "
                           f"{t['lead_response_minutes']}-min target. First-touch "
                           "messages are pre-written below — send them now."))

    candidates.sort(key=lambda x: -x[0])
    return [c[1] for c in candidates[:3]]


def generate(con, today=None):
    today = today or date.today()
    anchor = kpi.anchor_date(con)

    # --- review sends
    sends = reviews.todays_sends(con, today)
    if sends["is_send_day"] and sends["sends"]:
        rows = [[s["customer_name"], s["customer_phone"] or s["customer_email"],
                 s["cleaner"], s["last_clean"],
                 f'<div class="msg">{H.esc(s["sms"])}</div>'] for s in sends["sends"]]
        send_html = H.table(["Client", "Contact", "Cleaner", "Last clean",
                             "SMS to trigger in BookingKoala"], rows)
        send_html += (f'<p class="note">After sending each one, run: '
                      f'<b>python haven.py reviews sent "&lt;client name&gt;"</b> '
                      f'so the caps stay accurate.</p>')
    elif sends["is_send_day"]:
        send_html = ('<div class="callout">Send day, but no slots or no eligible '
                     f'clients. Next send day: {sends["next_send_day"]}.</div>')
    else:
        send_html = (f'<div class="callout">Not a send day (Tue/Thu/Sat only — '
                     f'this protects the Google profile). Next: '
                     f'{sends["next_send_day"]}.</div>')

    # --- uncontacted leads
    un = leads.uncontacted(con)
    if un:
        rows = []
        for l in un[:15]:
            msgs = leads.first_touch_messages(l)
            rows.append([f'#{l["id"]} {l["name"]}',
                         l["phone"] or l["email"], l["source"],
                         f'{l["age_minutes"]} min',
                         f'<div class="msg">{H.esc(msgs["sms"][0])}</div>'])
        lead_html = H.table(["Lead", "Contact", "Source", "Age", "First-touch SMS"], rows)
        lead_html += ('<p class="note">2 SMS + 2 email variants per lead: '
                      '<b>python haven.py leads</b>. After texting, run '
                      '<b>python haven.py leads contacted &lt;id&gt;</b>.</p>')
    else:
        lead_html = '<div class="callout">Inbox zero — no uncontacted leads. 🎯</div>'

    moves = weeks_moves(con, anchor)
    moves_html = "".join(f'<div class="callout"><b>{i+1}.</b> {H.esc(m)}</div>'
                         for i, m in enumerate(moves))

    later = ('<p class="note">Commercial prospect calls, churn flags, compliance '
             'flags and bench status appear here when Phase 2–3 modules ship.</p>')

    body = f"""
<h2>This Week's Moves</h2>{moves_html}
<h2>Today's Review Sends ({today.isoformat()})</h2>{send_html}
<h2>Uncontacted Leads</h2>{lead_html}
{kpi.scorecard_body(con, anchor)}
<h2>Coming Online</h2>{later}"""
    return H.write("monday.html", H.page("Monday", body, "The Monday Command"))


def run(con, today=None):
    """Full Monday rhythm: import inbox -> refresh dashboards -> monday.html."""
    imported = import_inbox(con)
    scorecard = kpi.generate_scorecard(con)
    monday_path = generate(con, today)
    return {"imported": imported, "scorecard": scorecard, "monday": monday_path}
