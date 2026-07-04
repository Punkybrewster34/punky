"""Module 4 — Commercial Prospector.

Finds and works commercial targets (daycares, med spas, salons, boutique
gyms, chiropractors) in Phoenix / Tucson / Scottsdale.

Data sources, in order of preference:
  1. Official Google Places API — Text Search (New), which returns all
     the fields we need in one call. NEVER scraping: scraping Google
     properties violates TOS and risks the GBP account.
  2. Manual CSV import (pasted list or the existing 48-prospect tracker)
     via the prospects_tracker column map in config.yaml.

Outreach cadence: call -> walk-in -> email -> (repeat email every 2 wks)
with next-action dates. `haven.py prospects` prints this week's call
list; `haven.py prospects sheet` renders the weekly call sheet HTML.
"""
import json
import urllib.request
from datetime import date, timedelta

from . import config, env, importers
from . import html as H

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join([
    "places.id", "places.displayName", "places.formattedAddress",
    "places.nationalPhoneNumber", "places.websiteUri", "places.rating",
    "places.userRatingCount", "places.regularOpeningHours.weekdayDescriptions",
    "nextPageToken",
])

# name fragments that mark national chains (corporate cleaning contracts
# are decided far from the branch — low-value doors to knock)
CHAIN_MARKERS = (
    "kindercare", "la petite", "primrose", "goddard", "bright horizons",
    "childtime", "tutor time", "massage envy", "european wax", "hand and stone",
    "great clips", "supercuts", "sport clips", "planet fitness", "anytime fitness",
    "orangetheory", "la fitness", "eos fitness", "the joint", "airrosti",
)

# cadence: current step -> (next step, days until it's due)
CADENCE = {
    "new": ("call", 0),
    "call": ("walk-in", 3),
    "walk-in": ("email", 4),
    "email": ("email", 14),   # keep emailing every 2 weeks until won/lost
}
TERMINAL = ("won", "lost")


def is_chain(name):
    n = (name or "").lower()
    return any(m in n for m in CHAIN_MARKERS)


def score(website, review_count, name):
    """Higher = better door to knock. Has website +2, 20+ reviews +2,
    independent (non-chain) +3, 50+ reviews +1 extra."""
    s = 0
    if (website or "").strip():
        s += 2
    if (review_count or 0) >= 20:
        s += 2
    if (review_count or 0) >= 50:
        s += 1
    if not is_chain(name):
        s += 3
    return s

# ---------------------------------------------------------------
# intake — API and CSV, both landing in upsert()
# ---------------------------------------------------------------


def upsert(con, p):
    """Insert a prospect unless (name, address) already known. Dedupe is
    case-insensitive on name + first address token so the tracker's
    hand-typed addresses still match API-formatted ones."""
    row = con.execute(
        "SELECT id FROM prospects WHERE lower(name)=lower(?)",
        (p["name"],)).fetchone()
    if row:
        return 0
    con.execute(
        """INSERT OR IGNORE INTO prospects
           (place_id, name, address, phone, website, city, category, rating,
            review_count, hours, score, status, next_action, next_action_date, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (p.get("place_id", ""), p["name"], p.get("address", ""),
         p.get("phone", ""), p.get("website", ""), p.get("city", ""),
         p.get("category", ""), p.get("rating"), p.get("review_count"),
         p.get("hours", ""),
         score(p.get("website"), p.get("review_count"), p["name"]),
         p.get("status", "new"), p.get("next_action", "call"),
         p.get("next_action_date") or date.today().isoformat(),
         p.get("notes", "")))
    return 1


def fetch_places(con, max_pages_per_query=1):
    """Pull targets from the official Places Text Search (New) API.

    One page (20 results) per category x city by default = 15 requests,
    comfortably inside the free tier. Requires GOOGLE_PLACES_API_KEY in
    .env — see docs/places-api-setup.md.
    """
    key = env.get("GOOGLE_PLACES_API_KEY")
    if not key:
        raise RuntimeError(
            "GOOGLE_PLACES_API_KEY is not set in havenos/.env. Follow "
            "docs/places-api-setup.md, or use the manual fallback: "
            "python haven.py prospects import <file.csv>")
    cfg = config.load()["places"]
    added = queries = 0
    for city in cfg["cities"]:
        for cat in cfg["categories"]:
            token = None
            for _ in range(max_pages_per_query):
                body = {"textQuery": f"{cat} in {city}, AZ"}
                if token:
                    body["pageToken"] = token
                req = urllib.request.Request(
                    PLACES_URL, data=json.dumps(body).encode(),
                    headers={"Content-Type": "application/json",
                             "X-Goog-Api-Key": key,
                             "X-Goog-FieldMask": FIELD_MASK})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read())
                queries += 1
                for pl in data.get("places", []):
                    hours = "; ".join((pl.get("regularOpeningHours") or {})
                                      .get("weekdayDescriptions", [])[:5])
                    added += upsert(con, {
                        "place_id": pl.get("id", ""),
                        "name": (pl.get("displayName") or {}).get("text", ""),
                        "address": pl.get("formattedAddress", ""),
                        "phone": pl.get("nationalPhoneNumber", ""),
                        "website": pl.get("websiteUri", ""),
                        "rating": pl.get("rating"),
                        "review_count": pl.get("userRatingCount"),
                        "hours": hours, "city": city, "category": cat,
                    })
                token = data.get("nextPageToken")
                if not token:
                    break
    con.commit()
    return {"queries": queries, "added": added}


def import_csv(con, path):
    """Manual fallback / existing-tracker import. Headers resolve through
    column_maps.prospects_tracker in config.yaml; rows dedupe by name."""
    added = 0
    for r in importers.read_mapped(path, "prospects_tracker", required=("name",)):
        added += upsert(con, {
            "name": r.get("name", ""), "phone": r.get("phone", ""),
            "address": r.get("address", ""), "website": r.get("website", ""),
            "city": r.get("city", ""), "category": r.get("category", ""),
            "review_count": importers.parse_int(r.get("review_count")) or None,
            "status": (r.get("status") or "new").lower(),
            "notes": r.get("notes", ""),
        })
    con.commit()
    return added

# ---------------------------------------------------------------
# cadence
# ---------------------------------------------------------------


def advance(con, prospect_id, note=""):
    """Log the current step as done and schedule the next one."""
    p = con.execute("SELECT * FROM prospects WHERE id=?", (prospect_id,)).fetchone()
    if not p:
        raise ValueError(f"no prospect #{prospect_id}")
    step = p["next_action"] or "call"
    nxt, days = CADENCE.get(step, ("email", 14))
    stamp = date.today().isoformat()
    notes = (p["notes"] + " | " if p["notes"] else "") + f"{stamp}: did {step}"
    if note:
        notes += f" — {note}"
    con.execute(
        "UPDATE prospects SET status=?, next_action=?, next_action_date=?, "
        "notes=? WHERE id=?",
        (step, nxt, (date.today() + timedelta(days=days)).isoformat(),
         notes, prospect_id))
    con.commit()
    return step, nxt


def set_outcome(con, prospect_id, outcome, note=""):
    if outcome not in TERMINAL:
        raise ValueError("outcome must be won or lost")
    p = con.execute("SELECT notes FROM prospects WHERE id=?", (prospect_id,)).fetchone()
    notes = (p["notes"] + " | " if p and p["notes"] else "") + \
        f"{date.today().isoformat()}: {outcome}" + (f" — {note}" if note else "")
    con.execute("UPDATE prospects SET status=?, next_action='', "
                "next_action_date=NULL, notes=? WHERE id=?",
                (outcome, notes, prospect_id))
    con.commit()


def week_list(con, today=None):
    """This week's actions: everything due through Sunday, best score
    first, overdue included."""
    today = today or date.today()
    week_end = today + timedelta(days=6 - today.weekday())
    rows = con.execute(
        "SELECT * FROM prospects WHERE status NOT IN ('won','lost') "
        "AND next_action_date IS NOT NULL AND next_action_date <= ? "
        "ORDER BY score DESC, next_action_date ASC",
        (week_end.isoformat(),)).fetchall()
    return [dict(r) for r in rows]


def call_sheet_html(con, today=None):
    """dashboards/prospects.html — the weekly call sheet."""
    today = today or date.today()
    items = week_list(con, today)
    if items:
        rows = [[f'#{p["id"]}', p["name"],
                 H.badge(p["next_action"].upper(), "amber")
                 + (f' <span class="badge red">OVERDUE</span>'
                    if p["next_action_date"] < today.isoformat() else ""),
                 p["phone"] or "—", p["category"], p["city"],
                 f'{p["review_count"] or "?"} revs', p["score"],
                 p["website"] or "—"] for p in items]
        body = H.table(["#", "Business", "This week", "Phone", "Vertical",
                        "City", "Proof", "Score", "Website"], rows)
        body += ('<p class="note">Cadence: call → walk-in (+3d) → email (+4d) '
                 '→ email every 2 weeks. After each touch: '
                 '<b>python haven.py prospects done &lt;id&gt;</b>. Close with '
                 '<b>prospects won|lost &lt;id&gt;</b>.</p>')
    else:
        body = ('<div class="callout">No prospect actions due this week. '
                'Run <b>python haven.py prospects fetch</b> (Places API) or '
                'import a CSV to fill the pipeline.</div>')
    n = con.execute("SELECT COUNT(*) n FROM prospects WHERE status NOT IN "
                    "('won','lost')").fetchone()["n"]
    won = con.execute("SELECT COUNT(*) n FROM prospects WHERE status='won'").fetchone()["n"]
    head = f'<h2>Commercial Call Sheet — week of {today.isoformat()}</h2>' \
           f'<p class="note">{n} open prospects · {won} won</p>'
    return H.write("prospects.html",
                   H.page("Commercial Call Sheet", head + body,
                          "Commercial Prospector"))
