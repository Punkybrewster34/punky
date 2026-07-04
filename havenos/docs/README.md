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

## Phase 2–3 (schema ready, modules not yet built)

Module 4 Commercial Prospector (official Google Places API — never
scraping), Module 5 Cleaner Compliance Auditor, Module 6 Churn Watchdog,
Module 7 Recruiting Bench, Module 8 LSA Discipline. Their tables already
exist in `haven.db`; commands print a "ships in Phase N" notice.

---

## Tests

```
python -m unittest discover -s tests
```

33 tests cover the three pieces of math that must never be wrong: bonus
payouts (Rule 2), the review velocity caps (Rule 1), and CAC.

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
