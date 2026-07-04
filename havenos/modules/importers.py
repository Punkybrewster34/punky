"""Robust CSV importers with config-driven column mapping.

BookingKoala has no full public REST API, so everything enters as CSV:
either BK's own exports or Zapier-fed Google Sheets downloaded as CSV.
Headers WILL change; the mapping in config.yaml (column_maps) is the
single place to fix that. Matching is case-insensitive and ignores
extra whitespace/underscores.
"""
import csv
import re
from datetime import datetime, date

from . import config

# ---------------------------------------------------------------
# parsing helpers
# ---------------------------------------------------------------

_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d",
    "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M", "%m/%d/%Y %I:%M %p", "%m/%d/%Y",
    "%m/%d/%y %H:%M", "%m/%d/%y", "%b %d, %Y %I:%M %p", "%b %d, %Y", "%B %d, %Y",
)

_TRUTHY = {"1", "y", "yes", "true", "x", "checked", "pressed", "done", "on"}


def _norm_header(h):
    return re.sub(r"[\s_\-]+", " ", (h or "").strip().lower())


def parse_dt(value):
    """Best-effort parse to datetime; returns None on failure."""
    if not value:
        return None
    v = str(value).strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(v, fmt)
        except ValueError:
            continue
    try:  # ISO with timezone or microseconds
        return datetime.fromisoformat(v.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def parse_date(value):
    dt = parse_dt(value)
    return dt.date() if dt else None


def parse_money(value):
    if value in (None, ""):
        return 0.0
    v = re.sub(r"[^0-9.\-]", "", str(value))
    try:
        return round(float(v), 2)
    except ValueError:
        return 0.0


def parse_bool(value):
    return 1 if str(value or "").strip().lower() in _TRUTHY else 0


def parse_int(value):
    try:
        return int(float(str(value).strip() or 0))
    except (ValueError, TypeError):
        return 0


def normalize_status(raw, service_date, today=None):
    """Map BookingKoala's status wording onto HavenOS's canonical set.

    BK doesn't use the literal word 'completed' — a past job may show as
    'Active', 'Confirmed', etc. So: cancelled/paused/skipped are detected
    by keyword, and anything else is 'completed' if its service date has
    passed, otherwise 'scheduled'. This makes revenue correct regardless
    of BK's exact labels.
    """
    s = (raw or "").strip().lower()
    today = today or date.today()
    if any(w in s for w in ("cancel", "delet", "void", "no show", "no-show")):
        return "cancelled"
    if any(w in s for w in ("paus", "hold", "freeze", "frozen")):
        return "paused"
    if "skip" in s:
        return "skipped"
    if any(w in s for w in ("draft", "pending", "unconfirm", "quote", "request")):
        return "scheduled"
    if service_date and service_date <= today:
        return "completed"
    return "scheduled"


def normalize_frequency(raw):
    """Map BK frequency labels onto the canonical set the KPI/churn math
    understands: one-time, weekly, biweekly, every 4 weeks, monthly."""
    s = (raw or "").strip().lower()
    if not s or "one" in s and ("time" in s or "off" in s) or s == "once":
        return "one-time"
    if "bi" in s and "week" in s:
        return "biweekly"
    if "other week" in s or "2 week" in s or "two week" in s or "14 day" in s:
        return "biweekly"
    if "4 week" in s or "four week" in s or "28 day" in s:
        return "every 4 weeks"
    if "3 week" in s or "three week" in s:
        return "every 3 weeks"
    if "month" in s:
        return "monthly"
    if "week" in s:
        return "weekly"
    if "day" in s or "daily" in s:
        return "weekly"
    return s


def normalize_source(value):
    v = (value or "").strip().lower()
    known = config.load().get("lead_sources", [])
    for src in known:
        if src in v:
            return src
    if "google" in v or "local service" in v:
        return "lsa"
    if "fb" in v or "meta" in v or "instagram" in v:
        return "facebook"
    if "site" in v or "web" in v:
        return "website"
    return v or "other"

# ---------------------------------------------------------------
# column mapping
# ---------------------------------------------------------------


def map_headers(headers, map_name):
    """Return {logical_field: actual_header} using config column_maps."""
    cmap = config.column_map(map_name)
    norm_to_actual = {_norm_header(h): h for h in headers}
    resolved = {}
    for field, candidates in cmap.items():
        for cand in candidates:
            actual = norm_to_actual.get(_norm_header(str(cand)))
            if actual is not None:
                resolved[field] = actual
                break
    return resolved


def read_mapped(path, map_name, required=()):
    """Yield dicts of {logical_field: raw value} for each CSV row.

    Raises ValueError naming any missing required columns so the fix
    (edit config.yaml) is obvious.
    """
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        mapping = map_headers(headers, map_name)
        missing = [r for r in required if r not in mapping]
        if missing:
            raise ValueError(
                f"{path}: could not find columns for {missing} "
                f"(headers seen: {headers}). Add the new header names under "
                f"column_maps.{map_name} in config.yaml."
            )
        for row in reader:
            if not any((v or "").strip() for v in row.values()):
                continue  # skip blank lines
            yield {field: (row.get(actual) or "").strip()
                   for field, actual in mapping.items()}

# ---------------------------------------------------------------
# importers
# ---------------------------------------------------------------


def import_leads(con, path):
    """Zapier lead sheet CSV -> leads table. Returns rows inserted."""
    inserted = 0
    for r in read_mapped(path, "leads_sheet", required=("timestamp", "name")):
        dt = parse_dt(r.get("timestamp"))
        if not dt:
            continue
        cur = con.execute(
            """INSERT OR IGNORE INTO leads
               (created_at, name, phone, email, source, service_interest, notes, updated_at)
               VALUES (?,?,?,?,?,?,?,datetime('now'))""",
            (dt.isoformat(sep=" "), r.get("name", ""), r.get("phone", ""),
             r.get("email", ""), normalize_source(r.get("source")),
             r.get("service_interest", ""), r.get("notes", "")))
        inserted += cur.rowcount
    con.commit()
    return inserted


def import_bookings(con, path):
    """BookingKoala bookings export CSV -> bookings table."""
    inserted = 0
    for r in read_mapped(path, "bk_bookings", required=("date", "customer_name")):
        d = parse_date(r.get("date"))
        if not d:
            continue
        cur = con.execute(
            """INSERT OR IGNORE INTO bookings
               (booking_id, date, start_time, customer_name, customer_email,
                customer_phone, service_type, frequency, amount, status, cleaner,
                on_my_way, clock_in, clock_out, photo_count, complaint, zip, imported_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
            (r.get("booking_id", ""), d.isoformat(), r.get("start_time", ""),
             r.get("customer_name", ""), r.get("customer_email", ""),
             r.get("customer_phone", ""), r.get("service_type", ""),
             normalize_frequency(r.get("frequency")), parse_money(r.get("amount")),
             normalize_status(r.get("status"), d), r.get("cleaner", ""),
             parse_bool(r.get("on_my_way")), r.get("clock_in", ""),
             r.get("clock_out", ""), parse_int(r.get("photo_count")),
             parse_bool(r.get("complaint")), r.get("zip", "")))
        inserted += cur.rowcount
    con.commit()
    return inserted


def import_reviews(con, path):
    """Review log CSV -> reviews table."""
    inserted = 0
    for r in read_mapped(path, "reviews_sheet", required=("review_date",)):
        d = parse_date(r.get("review_date"))
        if not d:
            continue
        cur = con.execute(
            """INSERT OR IGNORE INTO reviews
               (review_date, reviewer_name, rating, cleaner, booking_id, notes)
               VALUES (?,?,?,?,?,?)""",
            (d.isoformat(), r.get("reviewer_name", ""),
             parse_int(r.get("rating")) or 5, r.get("cleaner", ""),
             r.get("booking_id", ""), r.get("notes", "")))
        inserted += cur.rowcount
    con.commit()
    return inserted


# filename fragment -> importer; used by `haven.py import` and `monday`
AUTO_IMPORTERS = (
    ("lead", import_leads),
    ("booking", import_bookings),
    ("review", import_reviews),
)


def auto_import(con, path):
    """Pick an importer from the filename. Returns (kind, inserted) or None."""
    lower = path.lower()
    for frag, fn in AUTO_IMPORTERS:
        if frag in lower:
            return frag, fn(con, path)
    return None
