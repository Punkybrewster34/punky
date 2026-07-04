"""Module 1 — Speed-to-Lead Engine.

Leads arrive in a Zapier-fed Google Sheet (Facebook Lead Ads, Thumbtack
email parse, LSA manual entry, website/BK form). This module turns the
downloaded CSV into a prioritized queue with ready-to-send first-touch
messages, response-time reporting, and CAC by channel.

Pipeline: new -> contacted -> quoted -> booked -> recurring -> lost
"""
from datetime import datetime, time as dtime
from statistics import median

from . import config

STATUSES = ("new", "contacted", "quoted", "booked", "recurring", "lost")

# ---------------------------------------------------------------
# First-touch templates. RULE 4: recurring service is the CONDITION
# of the offer, not an upsell — strongest on Facebook where the offer
# framing set that expectation.
# Placeholders: {first_name}, {service}
# ---------------------------------------------------------------
TEMPLATES = {
    "facebook": {
        "sms": [
            "Hi {first_name}! This is Ryan with Haven House Cleaning — just saw "
            "your request come through. Quick heads up: the rate you saw is our "
            "recurring-service rate (weekly, biweekly, or monthly — most folks "
            "pick biweekly). What day works for a first clean so I can lock in "
            "your spot?",
            "Hey {first_name}, Ryan from Haven House Cleaning here! Got your "
            "info from our ad. That offer is for clients joining a recurring "
            "schedule — weekly, biweekly, or monthly, your pick. I have openings "
            "this week. Want me to text you a quote for your home?",
        ],
        "email": [
            "Subject: Your Haven House Cleaning request\n\n"
            "Hi {first_name},\n\nThanks for reaching out through our ad! Quick "
            "note on how the offer works: the special rate applies to recurring "
            "service — weekly, biweekly, or monthly, whichever fits your life. "
            "Your first clean gets our full deep-clean attention, then we keep "
            "it that way on your schedule.\n\nReply with your square footage and "
            "preferred frequency and I'll send an exact quote within the hour.\n\n"
            "Ryan\nHaven House Cleaning · havenhouseclean.com",
            "Subject: Locking in your cleaning offer\n\n"
            "Hi {first_name},\n\nRyan here from Haven House Cleaning. The offer "
            "you claimed is our recurring-client rate (weekly, biweekly, or "
            "monthly). Most families choose biweekly — same cleaner, same day, "
            "every visit.\n\nWhat's the best day this week for your first clean? "
            "I'll hold a spot while you decide.\n\nRyan\nHaven House Cleaning · "
            "havenhouseclean.com",
        ],
    },
    "thumbtack": {
        "sms": [
            "Hi {first_name}, this is Ryan with Haven House Cleaning (Thumbtack). "
            "I'd love to earn your business — we're licensed, background-checked, "
            "and photo-document every clean. Can I ask a couple quick questions "
            "to give you an exact price instead of a range?",
            "Hey {first_name}! Ryan from Haven House Cleaning on Thumbtack. "
            "We specialize in {service} and can usually get you scheduled within "
            "2–3 days. What's your square footage and ideal day? I'll send a firm "
            "quote right back.",
        ],
        "email": [
            "Subject: Your exact quote from Haven House Cleaning\n\n"
            "Hi {first_name},\n\nThanks for reaching out on Thumbtack! To get "
            "you a firm price (not a range): how many square feet, how many "
            "beds/baths, and when would you like us there?\n\nEvery Haven clean "
            "is photo-documented and backed by our re-clean guarantee.\n\n"
            "Ryan\nHaven House Cleaning · havenhouseclean.com",
            "Subject: Re: your cleaning request\n\n"
            "Hi {first_name},\n\nRyan with Haven House Cleaning here — saw your "
            "{service} request on Thumbtack. We have availability this week. "
            "Reply with your address or square footage and I'll confirm an exact "
            "price and time today.\n\nRyan\nHaven House Cleaning · "
            "havenhouseclean.com",
        ],
    },
    "lsa": {
        "sms": [
            "Hi {first_name}, this is Ryan with Haven House Cleaning — thanks "
            "for calling through Google! Following up so we can get you on the "
            "schedule. What day works best for your {service}?",
            "Hey {first_name}, Ryan from Haven House Cleaning (you found us on "
            "Google). I can get you a firm quote in 2 minutes — how many "
            "beds/baths and roughly how many square feet?",
        ],
        "email": [
            "Subject: Following up on your call — Haven House Cleaning\n\n"
            "Hi {first_name},\n\nThanks for finding us on Google! I want to make "
            "sure you get on the schedule this week. Reply with your square "
            "footage and preferred day and I'll confirm your quote right away."
            "\n\nRyan\nHaven House Cleaning · havenhouseclean.com",
            "Subject: Your Haven House Cleaning quote\n\n"
            "Hi {first_name},\n\nRyan here from Haven House Cleaning — great "
            "speaking with you. Most of our Google clients start with a deep "
            "clean and continue on a biweekly schedule, which gets the best "
            "rate. Want me to price both options for you?\n\nRyan\n"
            "Haven House Cleaning · havenhouseclean.com",
        ],
    },
    "website": {
        "sms": [
            "Hi {first_name}! Ryan with Haven House Cleaning — got your request "
            "from our website. I can have a firm quote to you in minutes: how "
            "many beds/baths, and is this for recurring service or a one-time "
            "{service}?",
            "Hey {first_name}, thanks for reaching out to Haven House Cleaning! "
            "This is Ryan. Our schedule fills fast — want me to check "
            "availability for this week? Just need your zip and square footage.",
        ],
        "email": [
            "Subject: Your Haven House Cleaning quote\n\n"
            "Hi {first_name},\n\nThanks for your request on havenhouseclean.com! "
            "To send an exact quote I just need square footage and beds/baths. "
            "Recurring clients (weekly/biweekly/monthly) get our best rate and "
            "a consistent cleaner every visit.\n\nRyan\nHaven House Cleaning",
            "Subject: We got your request!\n\n"
            "Hi {first_name},\n\nRyan from Haven House Cleaning here. I'd love "
            "to get you scheduled — what day works best? If you book a recurring "
            "schedule, your first clean is prioritized on the calendar.\n\n"
            "Ryan\nHaven House Cleaning · havenhouseclean.com",
        ],
    },
}
TEMPLATES["bk_form"] = TEMPLATES["website"]
TEMPLATES["referral"] = TEMPLATES["website"]


def first_touch_messages(lead):
    """Both SMS + email variants for a lead row, placeholders filled."""
    src = (lead["source"] or "other").lower()
    tpl = TEMPLATES.get(src, TEMPLATES["website"])
    first = (lead["name"] or "there").split()[0]
    service = lead["service_interest"] or "clean"
    fill = lambda s: s.format(first_name=first, service=service)
    return {"sms": [fill(s) for s in tpl["sms"]],
            "email": [fill(s) for s in tpl["email"]]}

# ---------------------------------------------------------------
# queue & pipeline
# ---------------------------------------------------------------


def uncontacted(con, now=None):
    """Uncontacted leads (status=new), oldest first, with age in minutes."""
    now = now or datetime.now()
    rows = con.execute(
        "SELECT * FROM leads WHERE status='new' ORDER BY created_at ASC").fetchall()
    out = []
    for r in rows:
        created = datetime.fromisoformat(r["created_at"])
        age_min = max(0, int((now - created).total_seconds() // 60))
        out.append({**dict(r), "age_minutes": age_min})
    return out


def set_status(con, lead_id, status, when=None):
    if status not in STATUSES:
        raise ValueError(f"status must be one of {STATUSES}")
    when = (when or datetime.now()).isoformat(sep=" ")
    stamp_col = {"contacted": "first_contact_at", "booked": "booked_at",
                 "recurring": "recurring_at", "lost": "lost_at"}.get(status)
    if stamp_col:
        con.execute(
            f"UPDATE leads SET status=?, {stamp_col}=COALESCE({stamp_col},?), "
            "updated_at=datetime('now') WHERE id=?", (status, when, lead_id))
    else:
        con.execute("UPDATE leads SET status=?, updated_at=datetime('now') WHERE id=?",
                    (status, lead_id))
    con.commit()

# ---------------------------------------------------------------
# response-time report
# ---------------------------------------------------------------


def _in_business_hours(dt):
    bh = config.load()["business"]["business_hours"]
    start = dtime.fromisoformat(bh["start"])
    end = dtime.fromisoformat(bh["end"])
    return start <= dt.time() <= end


def response_time_report(con):
    """Median minutes-to-first-contact by source by ISO week.

    Only leads that arrived during business hours count toward the
    5-minute target; after-hours leads are reported separately so a
    2 a.m. Facebook lead doesn't wreck the number.
    """
    target = config.load()["targets"]["lead_response_minutes"]
    rows = con.execute(
        "SELECT created_at, first_contact_at, source FROM leads "
        "WHERE first_contact_at IS NOT NULL").fetchall()
    buckets = {}   # (week, source) -> {'bh': [...], 'ah': [...]}
    for r in rows:
        created = datetime.fromisoformat(r["created_at"])
        touched = datetime.fromisoformat(r["first_contact_at"])
        minutes = max(0.0, (touched - created).total_seconds() / 60)
        week = created.strftime("%G-W%V")
        key = (week, r["source"])
        b = buckets.setdefault(key, {"bh": [], "ah": []})
        b["bh" if _in_business_hours(created) else "ah"].append(minutes)
    report = []
    for (week, source), b in sorted(buckets.items(), reverse=True):
        med_bh = round(median(b["bh"]), 1) if b["bh"] else None
        med_ah = round(median(b["ah"]), 1) if b["ah"] else None
        report.append({
            "week": week, "source": source,
            "median_minutes_business_hours": med_bh,
            "median_minutes_after_hours": med_ah,
            "n_business_hours": len(b["bh"]), "n_after_hours": len(b["ah"]),
            "misses_target": bool(med_bh is not None and med_bh > target),
        })
    return report

# ---------------------------------------------------------------
# CAC / funnel
# ---------------------------------------------------------------


def funnel_by_source(con):
    """Lead counts at each pipeline stage, by source."""
    rows = con.execute("SELECT source, status, COUNT(*) n FROM leads "
                       "GROUP BY source, status").fetchall()
    funnel = {}
    for r in rows:
        f = funnel.setdefault(r["source"], {s: 0 for s in STATUSES})
        f[r["status"]] = r["n"]
    for f in funnel.values():
        f["total"] = sum(f[s] for s in STATUSES)
        # booked includes downstream recurring; recurring is its own stage too
        f["booked_or_beyond"] = f["booked"] + f["recurring"]
    return funnel


def cac_report(con, month_key):
    """Cost-per-booked-job and cost-per-recurring-client by source for a month.

    Spend comes from config channel_spend[month]. Bookings/recurrings are
    counted by the month the lead was CREATED (spend month = lead month).
    """
    spend = config.channel_spend(month_key)
    rows = con.execute(
        "SELECT source, "
        " SUM(CASE WHEN status IN ('booked','recurring') THEN 1 ELSE 0 END) booked, "
        " SUM(CASE WHEN status='recurring' THEN 1 ELSE 0 END) recurring, "
        " COUNT(*) total "
        "FROM leads WHERE substr(created_at,1,7)=? GROUP BY source",
        (month_key,)).fetchall()
    out = []
    seen = set()
    for r in rows:
        src = r["source"]
        seen.add(src)
        s = spend.get(src, 0.0)
        out.append({
            "source": src, "month": month_key, "spend": s,
            "leads": r["total"], "booked": r["booked"], "recurring": r["recurring"],
            "cost_per_lead": round(s / r["total"], 2) if r["total"] and s else None,
            "cost_per_booked_job": round(s / r["booked"], 2) if r["booked"] and s else None,
            "cost_per_recurring_client": round(s / r["recurring"], 2) if r["recurring"] and s else None,
        })
    for src, s in spend.items():  # spend with zero leads still shows up
        if src not in seen and s:
            out.append({"source": src, "month": month_key, "spend": s, "leads": 0,
                        "booked": 0, "recurring": 0, "cost_per_lead": None,
                        "cost_per_booked_job": None, "cost_per_recurring_client": None})
    return sorted(out, key=lambda x: -(x["spend"] or 0))
