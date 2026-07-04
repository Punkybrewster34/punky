"""SQLite schema and connection for haven.db — every module's storage.

Single file, no server, lives in data/haven.db. Schema covers all nine
modules so later phases only add code, not migrations.
"""
import os
import sqlite3

from . import config

SCHEMA = """
-- ------------------ Module 1: Speed-to-Lead ------------------
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY,
    created_at TEXT NOT NULL,          -- lead timestamp (ISO)
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    source TEXT DEFAULT 'other',       -- facebook/thumbtack/lsa/website/bk_form/referral/other
    service_interest TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'new',         -- new/contacted/quoted/booked/recurring/lost
    first_contact_at TEXT,             -- ISO when first touched
    booked_at TEXT,
    recurring_at TEXT,
    lost_at TEXT,
    updated_at TEXT,
    UNIQUE(created_at, name, phone)    -- idempotent re-imports
);

-- ------------- Modules 2/3/5/6: BookingKoala bookings -------------
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY,
    booking_id TEXT,                   -- BK's id, if present
    date TEXT NOT NULL,                -- service date (ISO date)
    start_time TEXT DEFAULT '',
    customer_name TEXT NOT NULL,
    customer_email TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    service_type TEXT DEFAULT '',
    frequency TEXT DEFAULT 'one-time', -- weekly/biweekly/every 4 weeks/monthly/one-time
    amount REAL DEFAULT 0,
    status TEXT DEFAULT 'completed',   -- completed/cancelled/skipped/paused/scheduled
    cleaner TEXT DEFAULT '',
    on_my_way INTEGER DEFAULT 0,       -- 1 = pressed
    clock_in TEXT DEFAULT '',          -- HH:MM if clocked in
    clock_out TEXT DEFAULT '',
    photo_count INTEGER DEFAULT 0,
    complaint INTEGER DEFAULT 0,       -- 1 = complaint on this job
    zip TEXT DEFAULT '',
    imported_at TEXT,
    UNIQUE(booking_id, date, customer_name)
);

-- ------------------ Module 2: Review Governor ------------------
CREATE TABLE IF NOT EXISTS review_requests (
    id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    booking_pk INTEGER REFERENCES bookings(id),
    cleaner TEXT DEFAULT '',
    scheduled_date TEXT,               -- planned send date
    sent_date TEXT,                    -- set when actually sent
    status TEXT DEFAULT 'queued'       -- queued/sent/skipped
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY,
    review_date TEXT NOT NULL,
    reviewer_name TEXT DEFAULT '',
    rating INTEGER DEFAULT 5,
    cleaner TEXT DEFAULT '',           -- attributed cleaner
    booking_id TEXT DEFAULT '',        -- BK booking that generated it, if known
    notes TEXT DEFAULT '',
    UNIQUE(review_date, reviewer_name)
);

-- ------------------ Module 4: Commercial Prospector ------------------
CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY,
    place_id TEXT,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    website TEXT DEFAULT '',
    city TEXT DEFAULT '',
    category TEXT DEFAULT '',
    rating REAL,
    review_count INTEGER,
    hours TEXT DEFAULT '',
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',         -- new/call/walk-in/email/meeting/won/lost
    next_action TEXT DEFAULT 'call',
    next_action_date TEXT,
    notes TEXT DEFAULT '',
    UNIQUE(name, address)
);

-- ------------------ Module 7: Recruiting bench ------------------
CREATE TABLE IF NOT EXISTS applicants (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    source TEXT DEFAULT '',
    stage TEXT DEFAULT 'applied',      -- applied/screened/checkr/qualification_audit/active/bench/out
    applied_date TEXT,
    notes TEXT DEFAULT '',
    updated_at TEXT
);

-- ------------------ Module 8: LSA discipline ------------------
CREATE TABLE IF NOT EXISTS lsa_leads (
    id INTEGER PRIMARY KEY,
    received_date TEXT NOT NULL,
    name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    marked_booked INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""


def connect(db_path=None):
    path = db_path or config.DB_PATH
    if path != ":memory:":
        os.makedirs(os.path.dirname(path), exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con
