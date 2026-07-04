#!/usr/bin/env python3
"""HavenOS — the operating system for Haven House Cleaning.

Usage:
  python haven.py monday                       run the full weekly rhythm
  python haven.py init                         create data/haven.db
  python haven.py import <file.csv> [type]     import a CSV (type: leads|bookings|reviews)
  python haven.py leads                        uncontacted queue + first-touch messages
  python haven.py leads report                 response times + funnel + CAC
  python haven.py leads <status> <id>          set pipeline status
                                               (contacted|quoted|booked|recurring|lost)
  python haven.py reviews                      today's review sends (caps enforced)
  python haven.py reviews sent "<client>"      log a request as sent
  python haven.py reviews log <date> "<name>" [rating] [cleaner] [booking_id]
  python haven.py reviews baseline <n>         set pre-HavenOS Google review count
  python haven.py reviews bonuses              payout report per cleaner
  python haven.py reviews progress             tracker toward 75 reviews
  python haven.py scorecard                    regenerate dashboards/scorecard.html
  python haven.py demo                         load sample data into a fresh demo db

Phase 2-3 (not built yet): prospects, compliance, churn, bench, lsa
"""
import os
import sys
import webbrowser
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import config, db, importers, kpi, leads, monday, reviews  # noqa: E402
from modules import constants as C  # noqa: E402

NOT_YET = {"prospects": 2, "compliance": 2, "churn": 2, "bench": 3, "lsa": 3}


def _open(path):
    print(f"  -> {path}")
    try:  # best effort; headless machines just get the path
        webbrowser.open(f"file://{os.path.abspath(path)}")
    except Exception:
        pass


def _hr(char="-"):
    print(char * 72)


def cmd_leads(con, args):
    if args and args[0] == "report":
        print("RESPONSE TIME (median minutes to first contact, by week/source)")
        _hr()
        target = config.load()["targets"]["lead_response_minutes"]
        for r in leads.response_time_report(con):
            flag = "  << OVER TARGET" if r["misses_target"] else ""
            bh = r["median_minutes_business_hours"]
            ah = r["median_minutes_after_hours"]
            print(f"{r['week']}  {r['source']:<10} biz-hrs: "
                  f"{bh if bh is not None else '—':>6} min (n={r['n_business_hours']})"
                  f"   after-hrs: {ah if ah is not None else '—':>6} (n={r['n_after_hours']})"
                  f"{flag}")
        print(f"\nTarget: first touch <= {target} min during business hours.")
        print("\nFUNNEL BY SOURCE")
        _hr()
        print(f"{'source':<11}{'total':>6}{'new':>6}{'cont.':>7}{'quoted':>8}"
              f"{'booked':>8}{'recur':>7}{'lost':>6}")
        for src, f in sorted(leads.funnel_by_source(con).items()):
            print(f"{src:<11}{f['total']:>6}{f['new']:>6}{f['contacted']:>7}"
                  f"{f['quoted']:>8}{f['booked_or_beyond']:>8}{f['recurring']:>7}{f['lost']:>6}")
        month = date.today().isoformat()[:7]
        print(f"\nCAC — {month} (spend from config.yaml channel_spend)")
        _hr()
        for r in leads.cac_report(con, month):
            cpb = f"${r['cost_per_booked_job']:,.2f}" if r["cost_per_booked_job"] else "—"
            cpr = f"${r['cost_per_recurring_client']:,.2f}" if r["cost_per_recurring_client"] else "—"
            print(f"{r['source']:<11} spend ${r['spend']:>8,.0f}  leads {r['leads']:>3}  "
                  f"booked {r['booked']:>3}  recurring {r['recurring']:>3}  "
                  f"cost/booked {cpb:>10}  cost/recurring {cpr:>10}")
        return

    if args and args[0] in leads.STATUSES:
        leads.set_status(con, int(args[1]), args[0])
        print(f"Lead #{args[1]} -> {args[0]}")
        return

    queue = leads.uncontacted(con)
    if not queue:
        print("Inbox zero — no uncontacted leads.")
        return
    target = config.load()["targets"]["lead_response_minutes"]
    print(f"UNCONTACTED LEADS ({len(queue)}) — oldest first. "
          f"Target: reply in {target} min.")
    for l in queue:
        _hr("=")
        hot = "  *** OVERDUE ***" if l["age_minutes"] > target else ""
        print(f"#{l['id']}  {l['name']}  [{l['source']}]  age {l['age_minutes']} min{hot}")
        print(f"    {l['phone'] or '(no phone)'}  {l['email'] or ''}  "
              f"wants: {l['service_interest'] or '?'}")
        if l["notes"]:
            print(f"    notes: {l['notes']}")
        msgs = leads.first_touch_messages(l)
        for i, s in enumerate(msgs["sms"], 1):
            print(f"\n  SMS v{i}:\n    {s}")
        for i, e in enumerate(msgs["email"], 1):
            print(f"\n  EMAIL v{i}:\n    " + e.replace("\n", "\n    "))
        print(f"\n  after sending:  python haven.py leads contacted {l['id']}")


def cmd_reviews(con, args):
    if args and args[0] == "sent":
        try:
            reviews.mark_sent(con, args[1])
        except RuntimeError as e:
            print(f"BLOCKED: {e}")
            return
        d, w = reviews.sent_counts(con, date.today())
        print(f"Logged send to {args[1]}. Today {d}/{C.REVIEW_MAX_PER_DAY}, "
              f"week {w}/{C.REVIEW_MAX_PER_WEEK}.")
        return
    if args and args[0] == "log":
        reviews.log_review(con, args[1], args[2],
                           int(args[3]) if len(args) > 3 else 5,
                           args[4] if len(args) > 4 else "",
                           args[5] if len(args) > 5 else "")
        print("Review logged.")
        return
    if args and args[0] == "baseline":
        reviews.set_review_baseline(con, int(args[1]))
        print(f"Baseline set to {args[1]} pre-existing Google reviews.")
        return
    if args and args[0] == "bonuses":
        print("CLEANER BONUS PAYOUTS (cumulative earned to date — Rule 2 math)")
        _hr()
        for b in reviews.payout_report(con):
            print(f"{b['cleaner']:<18} 5-star: {b['five_star_reviews']:>2} (${b['review_dollars']:>7,.2f})"
                  f"  milestones: ${b['milestone_dollars']:>7,.2f}"
                  f"  perfect-clean [{b['qualifying_cleans']:>2} qual.]: ${b['perfect_clean_dollars']:>7,.2f}"
                  f"  review-cleans: {b['review_generating_cleans']} (${b['review_clean_dollars']:>6,.2f})"
                  f"  TOTAL: ${b['total_dollars']:>8,.2f}")
        return
    if args and args[0] == "progress":
        p = reviews.progress_to_75(con)
        print(f"Reviews: {p['total_reviews']} / {p['target']}   "
              f"remaining: {p['remaining']}   velocity: {p['velocity_per_week']}/wk")
        print(f"Projected 75-review date: {p['projected_date'] or 'n/a'}")
        print(p["lsa_note"])
        return

    s = reviews.todays_sends(con)
    print(f"REVIEW SENDS — {s['date']}  "
          f"(caps: {C.REVIEW_MAX_PER_DAY}/day, {C.REVIEW_MAX_PER_WEEK}/wk, Tue/Thu/Sat)")
    _hr()
    if not s["is_send_day"]:
        print(f"Not a send day. Next send day: {s['next_send_day']}.")
        print("The Tue/Thu/Sat rhythm protects the Google profile — no exceptions.")
        return
    if not s["sends"]:
        print(f"No slots left or no eligible clients. Next: {s['next_send_day']}.")
        return
    for i, snd in enumerate(s["sends"], 1):
        print(f"\n{i}. {snd['customer_name']}  ({snd['customer_phone'] or snd['customer_email']})"
              f"  cleaner: {snd['cleaner'] or '—'}  last clean: {snd['last_clean']}")
        print(f"   SMS to trigger in BK:\n   {snd['sms']}")
        print(f"   then:  python haven.py reviews sent \"{snd['customer_name']}\"")


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0
    cmd, args = argv[0], argv[1:]
    con = db.connect()

    if cmd == "init":
        print(f"Database ready at {config.DB_PATH}")
    elif cmd == "import":
        if not args:
            print("usage: haven.py import <file.csv> [leads|bookings|reviews]")
            return 1
        path = args[0]
        kind = args[1] if len(args) > 1 else None
        fns = {"leads": importers.import_leads, "bookings": importers.import_bookings,
               "reviews": importers.import_reviews}
        if kind:
            n = fns[kind](con, path)
            print(f"Imported {n} new {kind} rows from {path}")
        else:
            res = importers.auto_import(con, path)
            if not res:
                print("Could not auto-detect type from filename; pass "
                      "leads|bookings|reviews explicitly.")
                return 1
            print(f"Imported {res[1]} new {res[0]} rows from {path}")
    elif cmd == "leads":
        cmd_leads(con, args)
    elif cmd == "reviews":
        cmd_reviews(con, args)
    elif cmd == "scorecard":
        _open(kpi.generate_scorecard(con))
    elif cmd == "monday":
        res = monday.run(con)
        print("MONDAY RHYTHM")
        _hr()
        if res["imported"]:
            for name, kind, n in res["imported"]:
                print(f"  inbox: {name} -> {kind} ({n} new rows)")
        else:
            print(f"  inbox empty ({config.INBOX_DIR}) — using existing data")
        print("  dashboards refreshed:")
        print(f"  -> {res['scorecard']}")
        _open(res["monday"])
    elif cmd == "demo":
        # wipe + reload the db from data/samples so everything is testable
        con.close()
        if os.path.exists(config.DB_PATH):
            os.remove(config.DB_PATH)
        con = db.connect()
        s = config.SAMPLES_DIR
        n1 = importers.import_leads(con, os.path.join(s, "leads_sheet.csv"))
        n2 = importers.import_bookings(con, os.path.join(s, "bk_bookings.csv"))
        n3 = importers.import_reviews(con, os.path.join(s, "reviews_log.csv"))
        reviews.set_review_baseline(con, 38)
        # simulate the pipeline so reports have contacted/booked/recurring data
        from data.samples.pipeline_sim import apply as sim  # noqa
        sim(con)
        print(f"Demo data loaded: {n1} leads, {n2} bookings, {n3} reviews "
              "(baseline 38 pre-existing Google reviews).")
        print("Try:  python haven.py monday")
    elif cmd in NOT_YET:
        print(f"'{cmd}' ships in Phase {NOT_YET[cmd]} — schema is already in "
              "haven.db, module not built yet.")
    else:
        print(f"Unknown command '{cmd}'.\n{__doc__}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
