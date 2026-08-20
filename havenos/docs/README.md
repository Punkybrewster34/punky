# HavenOS — Haven House Cleaning Operating System

Local-first, zero-hosting-cost. One laptop, one SQLite file, static HTML
dashboards. BookingKoala stays the system of record; HavenOS is the weekly
operating rhythm around it.

```
cd havenos
pip install -r requirements.txt      # just PyYAML
python haven.py demo                 # load sample data (safe: demo db only)
python haven.py monday               # your first Monday dashboard
```

Everything below is testable immediately with the sample data in
`data/samples/` — no real exports needed.

---

## The 10-minute Monday (short version — full SOP in `monday-sop.md`)

1. Export 3 CSVs (bookings from BookingKoala, leads + reviews Sheets as CSV).
2. Drop them into `data/inbox/` — filenames must contain `bookings`,
   `leads`, or `reviews`.
3. `python haven.py monday`
4. Act on the three lists in `dashboards/monday.html`: send review requests,
   text uncontacted leads, do this week's moves.

---

## Hard rules encoded in the software

| Rule | Where enforced |
|---|---|
| Max **6 review requests/week, 2/day, Tue/Thu/Sat only** (Google spam-filter protection) | `modules/constants.py` + `reviews.mark_sent()` refuses to exceed; not configurable |
| **Cleaner bonus math**: $10/5-star review, $100 per 10 reviews, $100 per 10 qualifying cleans, $25 per review-generating clean | `modules/bonuses.py`, covered by `tests/test_bonus_math.py` |
| **LSA**: no bid changes before 75 reviews | Hard-coded warning in every review-progress output |
| **Recurring is the condition of the offer, not an upsell** | Baked into every first-touch template in `modules/leads.py` |

Cleaner-facing language everywhere is contractor-safe: *qualification,
audit, standards, SOPs, non-renewal* — never employment terms.

---

## Module 1 — Speed-to-Lead Engine

**What it does.** Every new lead lands in one Google Sheet (via Zapier),
you download it as CSV, and `haven.py leads` shows the uncontacted queue —
oldest first, age in minutes, with 2 SMS + 2 email first-touch variants per
lead, pre-personalized per source. `haven.py leads report` shows median
minutes-to-first-contact by source by week (red-flagged if over 5 minutes
during business hours, 8am–6pm), the pipeline funnel, and CAC per channel.

**Commands**

```
python haven.py import data/inbox/leads_2026-07-04.csv
python haven.py leads                    # queue + copy-paste messages
python haven.py leads contacted 27       # after you text lead #27
python haven.py leads quoted 27
python haven.py leads booked 27
python haven.py leads recurring 27       # when they join a schedule
python haven.py leads lost 27
python haven.py leads report             # response times, funnel, CAC
```

**The Leads Sheet.** Create one Google Sheet named `Haven Leads` with
header row exactly (or edit `column_maps.leads_sheet` in config.yaml):

`Timestamp | Name | Phone | Email | Source | Service Interest | Notes`

**Zap 1 — Facebook Lead Ads → Leads Sheet**
1. Trigger: *Facebook Lead Ads* → **New Lead** → connect the Haven page →
   pick the running Lead Ad form.
2. Action: *Google Sheets* → **Create Spreadsheet Row** → spreadsheet
   `Haven Leads`, worksheet `Sheet1`.
3. Field mapping: Timestamp → `Created Time`; Name → `Full Name`;
   Phone → `Phone Number`; Email → `Email`; Source → type the literal text
   `Facebook Lead Ads`; Service Interest → the form's service question (or
   type `Recurring Standard`); Notes → any custom question answer.
4. Turn the Zap on, submit a test lead from Meta's Lead Ads Testing Tool.

**Zap 2 — Thumbtack email → Leads Sheet**
1. Trigger: *Email by Zapier* → **New Inbound Email**. Copy the
   `...@robot.zapier.com` address and add a Gmail forwarding filter:
   `from:(thumbtack.com) subject:(lead)` → forward to that address.
2. Action: *Formatter by Zapier* → **Text → Extract Pattern** on the body
   to grab the customer name (or skip and paste from the email manually).
3. Action: *Google Sheets* → **Create Spreadsheet Row**: Timestamp →
   zap meta `Timestamp`; Name → extracted name (or the email subject);
   Source → literal `Thumbtack`; Notes → email body snippet.

**Zap 3 — Website/BK form → Leads Sheet**
1. Trigger: BookingKoala's Zapier app → **New Lead** (or *Webhooks by
   Zapier* → **Catch Hook** wired to the site form).
2. Action: *Google Sheets* → **Create Spreadsheet Row**, Source → literal
   `Website`.

**LSA leads** have no Zapier trigger — when your Retell AI phone or the LSA
app takes one, add a row to the Sheet by hand (Source = `Google LSA`).
Takes 20 seconds; the response-time report only works if the row exists.

**CAC.** Edit `channel_spend` in `config.yaml` at the start of each month
with what you're actually spending. Cost-per-booked-job = spend ÷ leads
from that month that reached booked-or-beyond; cost-per-recurring-client
= spend ÷ leads that reached recurring.

---

## Module 2 — Review Velocity Governor

**What it does.** Builds the eligible-client queue from completed BK cleans
(no prior request, no existing review), ranked recurring-first /
zero-complaint / perfect-clean-first, and hands you **today's sends**: the
exact clients and SMS text to trigger inside BookingKoala. The caps —
6/week, 2/day, Tue/Thu/Sat — are enforced in code; `reviews sent` will
refuse to log a send that would break them.

**Commands**

```
python haven.py reviews                          # today's send list
python haven.py reviews sent "Dana Alvarez"      # log each send (keeps caps true)
python haven.py reviews log 2026-07-04 "Dana Alvarez" 5 "Priya S." BK-4321
python haven.py reviews baseline 38              # one-time: current Google review count
python haven.py reviews bonuses                  # payout per cleaner, penny-accurate
python haven.py reviews progress                 # tracker to 75 + projected date
```

**Feed it.** The weekly BK bookings export (see Module 3 — same file).
Sends happen manually inside BK's SMS composer — BK sends the text, HavenOS
just tells you who and what. Optional Zap for automatic review capture:

**Zap 4 — New Google review → Reviews Sheet** *(optional; manual `reviews
log` works fine)*
1. Trigger: *Google My Business* → **New Review** → connect the Haven GBP.
2. Action: *Google Sheets* → **Create Spreadsheet Row** in a `Haven
   Reviews` sheet with headers `Date | Reviewer Name | Rating | Cleaner |
   Booking ID | Review Text`. Map Date → `Create Time`, Reviewer Name →
   `Reviewer Display Name`, Rating → `Star Rating`; leave Cleaner blank and
   fill it in the Sheet when you attribute the review (that's what drives
   the bonus).
3. Download as CSV into `data/inbox/` weekly (filename containing
   `reviews`).

**Bonus report** (`reviews bonuses`) shows cumulative earned-to-date per
cleaner: 5-star dollars + 10-review milestones + perfect-clean bonuses
(qualifying = on-time ≤10 min, On-My-Way pressed, clocked in *and* out,
10+ photos, zero complaints) + $25 review-generating-clean bonuses. Pay
the delta vs. last month's report.

---

## Module 3 — KPI Command Center

**What it does.** `python haven.py scorecard` regenerates
`dashboards/scorecard.html`: weekly revenue (recurring vs one-time),
recurring % of revenue, active recurring clients, churn count, average job
value, jobs per cleaner, review count + velocity, CAC by channel, LTV:CAC,
the $60K/month progress bar, and the agency-readiness panel (CAC payback
≤2 cleans · recurring ≥60% · LTV:CAC ≥3:1, trailing 3 months). Every
formula is spelled out in the methodology footnote on the page.

**The weekly BK export (feeds Modules 2, 3, and later 5/6).**
In BookingKoala: **Reports → Bookings** (or Bookings list → Export) →
date range: last 90 days → include columns: Booking ID, Service Date,
Start Time, Customer Name/Email/Phone, Service Type, Frequency, Total
Amount, Status, Provider Name, On My Way, Clock In, Clock Out, No of
Photos, Complaint, Zip Code → **Export CSV**. Save into `data/inbox/` with
`bookings` in the filename. If BK's headers differ from those names, add
the actual header under `column_maps.bk_bookings` in `config.yaml` — that
is the fix for every future BK format change, no code edits.

Re-imports are idempotent: the same booking row twice never double-counts.

---

## Module 4 — Commercial Prospector

**What it does.** Pulls daycares, med spas, salons, boutique gyms and
chiropractors in Phoenix / Tucson / Scottsdale from the **official Google
Places API** (Text Search New — never scraping, which risks the GBP
account), scores them (website +2, 20+ reviews +2, 50+ reviews +1,
independent/non-chain +3), dedupes against anything already imported
(including the existing 48-prospect tracker), and runs the outreach
cadence: **call → walk-in (+3d) → email (+4d) → email every 2 weeks**.

**Commands**

```
python haven.py prospects fetch              # Places API (15 requests/run, free tier)
python haven.py prospects import tracker.csv # existing tracker or any pasted CSV
python haven.py prospects                    # this week's call list w/ phone numbers
python haven.py prospects done 12 "left vm"  # log touch, auto-schedule next step
python haven.py prospects won 12             # or lost
python haven.py prospects sheet              # dashboards/prospects.html call sheet
```

**Setup.** API key steps in `docs/places-api-setup.md` → key goes in
`havenos/.env` as `GOOGLE_PLACES_API_KEY`. No key? `prospects import`
accepts any CSV with a business-name column (header aliases under
`column_maps.prospects_tracker`).

**Commercial real estate (property managers, brokers, apartment
complexes).** Two of the Places categories (`property management
company`, `apartment complex`) are tagged `segment=commercial_re` and
work the same call → walk-in → email cadence. For named decision-makers
with verified emails — leasing managers, brokers, agents — export a
People Search from Apollo.io and import it directly:

```
python haven.py prospects import-apollo apollo_export.csv
```

Apollo rows dedupe by email (not name — one management company can have
several separate contacts), start the cadence at `email` instead of
`call`, and `prospects` / `prospects sheet` print a ready-to-send subject
+ body for each one — property-management wording or real-estate/broker
wording, picked from the contact's title/category
(`prospects.COMMERCIAL_EMAIL_TEMPLATES`). Column aliases live under
`column_maps.apollo_contacts` in `config.yaml` if Apollo's export headers
change.

---

## Module 5 — Cleaner Compliance Auditor

**What it does.** Audits every completed BK job per cleaner: On-My-Way
pressed, clock-in within 10 minutes, clocked out, 10+ photos, complaint
flag. Tracks perfect-clean streaks and qualifying-clean counts toward the
$100/10 bonus. `haven.py compliance report` renders the monthly
**Standards Audit** HTML (contractor-safe language throughout) with the
combined Module 2 + 5 payout summary, and a **Non-Renewal Watch** list —
each flag shown *with current bench depth*, because enforcement without a
bench is an empty threat.

Watch criteria (trailing 30 days, min 4 jobs): qualifying rate < 50%,
on-time < 80%, or 2+ complaints.

```
python haven.py compliance          # terminal audit + watch list
python haven.py compliance report   # dashboards/compliance.html
```

Feeds from the same weekly BK bookings export as Module 3. **Zap 5
(optional) — BK Complaint → Sheets:** BookingKoala Zapier trigger **New
Feedback/Complaint** → Google Sheets row; or just mark the Complaint
column in the export before dropping it in the inbox.

---

## Module 6 — Churn Watchdog

**What it does.** Scans recurring clients for skipped / cancelled /
paused visits, gaps longer than 1.5× their frequency, and frequency
downgrades. Assigns risk tiers — **HIGH** (cancelled, or gap > 2×
frequency: call today), **MEDIUM** (paused / downgraded: win-back this
week), **LOW** (skipped once: friendly check-in) — each with a
ready-to-send SMS *and* email, three scenarios (skipped-once, paused,
cancelled), all holding the recurring-is-the-offer line (defend the
schedule with a lighter frequency, never a one-off discount).

```
python haven.py churn           # flags + full scripts
python haven.py churn revenue   # monthly retained-revenue: saved vs lost
```

Saved = flagged client completed another clean within 45 days of the risk
event; otherwise lost (or pending while the window is open). Values are
monthly recurring dollars (visit price × visits/month).

---

## Module 7 — Recruiting Bench Tracker

**What it does.** Applicant pipeline (applied → screened → checkr →
qualification_audit → active / bench / out) from Indeed CSV exports or
manual entry. Bench depth (bench-ready, active cleaners, in pipeline)
shows on the KPI scorecard and next to every compliance flag; red flag
when bench < 2. Route-density view surfaces cleaners working scattered
zips (6+ jobs across 4+ zips with no dominant cluster) — the #1 turnover
lever.

```
python haven.py bench                     # pipeline + depth + route density
python haven.py bench add "Name" [phone]
python haven.py bench move 4 checkr
python haven.py bench import indeed.csv   # headers via column_maps.applicants
```

---

## Module 8 — LSA Discipline Module

Log every LSA lead, mark booked ones (in the LSA app *and* here), and get
nagged about unmarked ones on Monday. Shares the 75-review tracker with
Module 2. Every output ends with the hard-coded line: *Do not touch bids
before 75 reviews.*

```
python haven.py lsa                    # log + unmarked reminders + tracker
python haven.py lsa add "Name" [phone]
python haven.py lsa booked 3
```

---

## Web access — dashboards on your phone (`/havenos`)

The laptop stays the engine; the website is the window. The repo's
Next.js app now serves a password-protected **`/havenos`** page with all
four dashboards (Monday, Scorecard, Prospects, Standards).

**Publish flow** (after any `monday` run, or whenever you want fresh
numbers online):

```
python haven.py publish
git add havenos-site && git commit -m "Publish dashboards" && git push
```

`publish` re-runs the Monday rhythm and bundles the dashboards into
`havenos-site/dashboards.json`; the push triggers the site's auto-deploy
and `/havenos` shows the new numbers a minute later.

**Password.** Default is set in `lib/havenos-auth.ts`; override it by
setting `HAVENOS_PASSWORD` (and `SESSION_SECRET`) in Vercel → Project →
Settings → Environment Variables. Sessions last 7 days per device.

Only the published HTML bundle goes online — haven.db, CSVs, and client
lists never leave the laptop.

---

## Tests

```
python -m unittest discover -s tests
```

49 tests cover the money math that must never be wrong — bonus payouts
(Rule 2), review velocity caps (Rule 1), CAC — plus churn tiers,
retained-revenue math, prospect scoring/dedupe/cadence, and compliance
flags.

## Layout

```
haven.py          CLI — python haven.py <command>
config.yaml       column mappings, targets, spend, constants (documented)
modules/          one file per concern; constants.py holds the hard rules
data/samples/     realistic fake data; python haven.py demo loads it
data/inbox/       drop weekly CSVs here (gitignored)
data/haven.db     all storage (gitignored)
dashboards/       generated HTML (gitignored)
docs/             this file + monday-sop.md
```
