# The 10-Minute Monday — HavenOS SOP

Every Monday, before anything else. Coffee first, then this, in order.

## Minute 0–3 · Export three CSVs

1. **BookingKoala bookings** — Reports → Bookings → date range *last 90
   days* → Export CSV. Save to `havenos/data/inbox/bk_bookings.csv`.
2. **Haven Leads sheet** — open the Zapier-fed Google Sheet → File →
   Download → CSV. Save to `havenos/data/inbox/leads.csv`.
3. **Haven Reviews sheet** (or skip if you logged reviews with
   `haven.py reviews log` during the week) — File → Download → CSV →
   `havenos/data/inbox/reviews.csv`.

Filenames just need to contain `bookings`, `leads`, or `reviews`.

## Minute 3–4 · Run the command

```
cd havenos
python haven.py monday
```

Imports everything in the inbox (duplicates are ignored automatically),
refreshes all dashboards, and opens `dashboards/monday.html`.

## Minute 4–10 · Act on the three lists

**List 1 — This Week's Moves (top of the page).** Three actions, already
ranked by whatever is furthest from target. Do them this week; that's the
whole point of the system.

**List 2 — Today's Review Sends.** If Monday isn't a send day, it says so —
sends happen Tuesday / Thursday / Saturday only, max 2/day, 6/week. On send
days: copy each SMS into BookingKoala's message composer for that client,
send, then log it —

```
python haven.py reviews sent "Client Name"
```

Never work around the caps. They exist because a velocity spike got
reviews deleted once already.

**List 3 — Uncontacted Leads.** Copy the pre-written first-touch SMS, send
it, then —

```
python haven.py leads contacted <id>
```

Update statuses as the week unfolds (`quoted`, `booked`, `recurring`,
`lost`) — 5 seconds each, and it's what makes the CAC and funnel numbers
on next Monday's scorecard true.

## Monthly (first Monday)

- Update `channel_spend` in `config.yaml` with this month's ad budgets.
- Run `python haven.py reviews bonuses`, pay cleaners the delta vs. last
  month's report, file the report.
- Glance at the agency-readiness panel: three PASS badges over three
  straight months = start the agency conversation.
