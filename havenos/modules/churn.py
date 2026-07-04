"""Module 6 — Churn Watchdog.

From BK exports: finds recurring clients with skipped / cancelled /
paused visits, gaps longer than their frequency, or a downgraded
frequency. Assigns risk tiers with a recommended action and the actual
win-back message to send, and produces the monthly retained-revenue
report (recurring revenue saved vs lost).
"""
from datetime import date, timedelta

from . import html as H

FREQ_DAYS = {"weekly": 7, "biweekly": 14, "every 4 weeks": 28,
             "every four weeks": 28, "monthly": 28, "every 2 weeks": 14}
VISITS_PER_MONTH = {7: 4.33, 14: 2.17, 28: 1.08}

# ---------------------------------------------------------------
# Win-back scripts — recurring is the condition of the offer, so the
# message defends the schedule, never discounts the one-off.
# ---------------------------------------------------------------
SCRIPTS = {
    "skipped-once": {
        "sms": "Hi {first_name}, Ryan from Haven House Cleaning — we missed "
               "you on the last visit! Your {frequency} spot with {cleaner} is "
               "still yours. Want me to book the next one for your usual day, "
               "or slide it to a day that works better?",
        "email": "Subject: We held your spot\n\nHi {first_name},\n\nWe missed "
                 "your last {frequency} clean — no problem at all, life "
                 "happens. {cleaner} still has your slot reserved. Reply with "
                 "a day that works and we'll pick right back up. If the "
                 "current day or time has stopped working, tell me and I'll "
                 "rebuild the schedule around you.\n\nRyan\n"
                 "Haven House Cleaning · havenhouseclean.com",
    },
    "paused": {
        "sms": "Hi {first_name}, Ryan with Haven House Cleaning. Totally "
               "understand pausing the schedule — when you're ready, "
               "{cleaner} and your {frequency} rate are locked in for 30 days. "
               "Want me to pencil in a restart date so you don't lose the slot?",
        "email": "Subject: Your rate is locked for 30 days\n\nHi {first_name},"
                 "\n\nSaw the pause on your {frequency} service — no rush and "
                 "no pressure. Two things I can hold for 30 days: your rate, "
                 "and {cleaner} as your cleaner. After that the calendar "
                 "usually fills. Reply with a tentative restart week and I'll "
                 "protect both.\n\nRyan\nHaven House Cleaning",
    },
    "cancelled": {
        "sms": "Hi {first_name}, Ryan from Haven House Cleaning. Sorry to see "
               "the schedule end — if anything on our side fell short, I'd "
               "genuinely like to know. If it was timing or budget, I can "
               "offer a lighter {lighter} plan at a lower visit price. Worth "
               "a quick text?",
        "email": "Subject: Before you go — one question\n\nHi {first_name},"
                 "\n\nI saw your recurring service ended and wanted to reach "
                 "out personally. If we fell short somewhere, please tell me "
                 "— I read every reply and fix what's fixable.\n\nIf it was "
                 "budget or timing, a {lighter} schedule keeps your home in "
                 "shape at a lower monthly cost, and you'd keep your recurring "
                 "rate. Either way, thank you for having us in your home.\n\n"
                 "Ryan\nHaven House Cleaning · havenhouseclean.com",
    },
}

LIGHTER = {"weekly": "biweekly", "biweekly": "every-4-weeks",
           "every 4 weeks": "every-4-weeks", "monthly": "monthly"}


def freq_days(freq):
    return FREQ_DAYS.get((freq or "").lower().strip())


def monthly_value(amount, fdays):
    return round((amount or 0) * VISITS_PER_MONTH.get(fdays, 1.0), 2)


def scan(con, today=None):
    """Risk-tier every recurring client. Returns list of flag dicts."""
    today = today or date.today()
    rows = con.execute(
        "SELECT * FROM bookings WHERE frequency != 'one-time' AND frequency != '' "
        "ORDER BY customer_name, date").fetchall()
    clients = {}
    for b in rows:
        clients.setdefault(b["customer_name"], []).append(b)

    flags = []
    for name, bs in clients.items():
        fdays = freq_days(bs[-1]["frequency"]) or 14
        completed = [b for b in bs if b["status"] == "completed"]
        last_done = date.fromisoformat(completed[-1]["date"]) if completed else None
        gap = (today - last_done).days if last_done else None
        cancelled = [b for b in bs if b["status"] == "cancelled"]
        paused = [b for b in bs if b["status"] == "paused"]
        skipped = [b for b in bs if b["status"] == "skipped"]

        first_f, last_f = freq_days(bs[0]["frequency"]), fdays
        downgraded = first_f and last_f and last_f > first_f

        reasons, tier, scenario = [], None, None
        if cancelled:
            tier, scenario = "HIGH", "cancelled"
            reasons.append(f"cancelled visit on {cancelled[-1]['date']}")
        if gap is not None and gap > 2 * fdays:
            tier, scenario = "HIGH", scenario or "cancelled"
            reasons.append(f"{gap}-day gap (frequency is every {fdays} days)")
        if tier is None and paused:
            tier, scenario = "MEDIUM", "paused"
            reasons.append(f"paused on {paused[-1]['date']}")
        if tier is None and downgraded:
            tier, scenario = "MEDIUM", "paused"
            reasons.append(f"downgraded {bs[0]['frequency']} → {bs[-1]['frequency']}")
        if tier is None and gap is not None and gap > 1.5 * fdays:
            tier, scenario = "MEDIUM", "skipped-once"
            reasons.append(f"{gap}-day gap vs every {fdays} days")
        if tier is None and skipped:
            tier, scenario = "LOW", "skipped-once"
            reasons.append(f"skipped visit on {skipped[-1]['date']}")
        if tier is None:
            continue

        ref = completed[-1] if completed else bs[-1]
        first = name.split()[0]
        freq_word = ref["frequency"]
        fill = dict(first_name=first, frequency=freq_word,
                    cleaner=ref["cleaner"] or "your cleaner",
                    lighter=LIGHTER.get(freq_word, "biweekly"))
        flags.append({
            "customer_name": name, "phone": ref["customer_phone"],
            "email": ref["customer_email"], "tier": tier,
            "scenario": scenario, "reasons": reasons,
            "frequency": freq_word, "cleaner": ref["cleaner"],
            "monthly_value": monthly_value(ref["amount"], fdays),
            "last_completed": last_done.isoformat() if last_done else None,
            "action": {"HIGH": "Call today, then send the cancelled win-back",
                       "MEDIUM": "Send the paused/downgrade win-back this week",
                       "LOW": "Friendly check-in text before their next visit"}[tier],
            "sms": SCRIPTS[scenario]["sms"].format(**fill),
            "email_msg": SCRIPTS[scenario]["email"].format(**fill),
        })
    order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    return sorted(flags, key=lambda f: (order[f["tier"]], -f["monthly_value"]))


def retained_revenue_report(con, today=None, months=3):
    """Per month: recurring $/mo saved vs lost. A client with a risk event
    (skip/pause/cancel) counts as SAVED if they completed another clean
    within 45 days of the event, LOST otherwise (or if the 45-day window
    is still open, PENDING)."""
    today = today or date.today()
    events = con.execute(
        "SELECT * FROM bookings WHERE status IN ('skipped','paused','cancelled') "
        "AND frequency != 'one-time' ORDER BY date").fetchall()
    seen = set()
    report = {}
    for e in events:
        key = (e["customer_name"], e["date"][:7])
        if key in seen:            # one event per client per month
            continue
        seen.add(key)
        fdays = freq_days(e["frequency"]) or 14
        value = monthly_value(e["amount"], fdays)
        deadline = date.fromisoformat(e["date"]) + timedelta(days=45)
        resumed = con.execute(
            "SELECT 1 FROM bookings WHERE customer_name=? AND status='completed' "
            "AND date > ? AND date <= ? LIMIT 1",
            (e["customer_name"], e["date"], deadline.isoformat())).fetchone()
        month = e["date"][:7]
        m = report.setdefault(month, {"month": month, "saved": 0.0, "lost": 0.0,
                                      "pending": 0.0, "clients_saved": 0,
                                      "clients_lost": 0, "clients_pending": 0})
        if resumed:
            m["saved"] += value
            m["clients_saved"] += 1
        elif deadline >= today:
            m["pending"] += value
            m["clients_pending"] += 1
        else:
            m["lost"] += value
            m["clients_lost"] += 1
    out = sorted(report.values(), key=lambda m: m["month"], reverse=True)[:months]
    for m in out:
        for k in ("saved", "lost", "pending"):
            m[k] = round(m[k], 2)
    return out


def flags_html_fragment(con, today=None, limit=8):
    """Churn section used inside monday.html."""
    fl = scan(con, today)
    if not fl:
        return '<div class="callout">No recurring clients at risk. 🛡</div>'
    color = {"HIGH": "red", "MEDIUM": "amber", "LOW": "green"}
    rows = [[H.badge(f["tier"], color[f["tier"]]), f["customer_name"],
             f["phone"] or f["email"], "; ".join(f["reasons"]),
             H.money(f["monthly_value"]) + "/mo",
             f'<div class="msg">{H.esc(f["sms"])}</div>']
            for f in fl[:limit]]
    frag = H.table(["Risk", "Client", "Contact", "Why", "Value",
                    "Win-back SMS (send as-is)"], rows)
    at_risk = sum(f["monthly_value"] for f in fl)
    frag += (f'<p class="note">{len(fl)} client(s) flagged · '
             f'{H.money(at_risk)}/mo recurring revenue at risk. Full scripts '
             f'(SMS + email per scenario): <b>python haven.py churn</b>.</p>')
    return frag
