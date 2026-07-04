# HavenOS on your Mac — setup (one time), then 10 minutes a week

You'll never have to type commands. Setup is a few clicks; the weekly
routine is "drop in files, double-click one thing."

---

## Part A — One-time setup (about 15 minutes)

### 1. Install GitHub Desktop
- Go to **desktop.github.com** → **Download for macOS** → open it.
- Sign in with the same GitHub account that owns the `punky` project.

### 2. Get the project onto your Mac
- In GitHub Desktop: **File → Clone repository**.
- Pick **Punkybrewster34/punky** → **Clone**.
- It saves to a folder like **Documents/GitHub/punky**. Remember that.

### 3. Install Python
- Go to **python.org/downloads** → click the big yellow **Download Python**
  button → open the file → click through the installer (all defaults).

### 4. Run the setup file
- In Finder, open **Documents/GitHub/punky/havenos/mac**.
- Double-click **1-First-Time-Setup.command**.
  - If macOS says *"cannot be opened because it is from an unidentified
    developer"* → **right-click** the file → **Open** → **Open**. (Only
    the first time.)
- It checks Python, installs the one add-on, and asks how many Google
  reviews you have right now. Type the number, press Enter.

Setup done. ✅

---

## Part B — Your weekly routine (about 10 minutes)

### 1. Export your data
**BookingKoala (the important one — this alone lights up most of your
dashboard):**
- BookingKoala → **Reports → Bookings** → date range **last 90 days** →
  **Export CSV**.

**Leads & reviews (optional at first):**
- Open your Leads Google Sheet → **File → Download → CSV**.
- Open your Reviews Google Sheet → **File → Download → CSV**.
  *(Don't have these Sheets set up yet? Skip them — do just the
  BookingKoala export this week. Ask me to set up the automatic
  lead/review feeds when you're ready.)*

### 2. Drop the files in the inbox
- Move the downloaded CSV file(s) into
  **Documents/GitHub/punky/havenos/data/inbox**.
- The file names must contain the words **bookings**, **leads**, or
  **reviews** (the BookingKoala export usually does already — if not,
  rename it to include "bookings").

### 3. Double-click the update file
- In **havenos/mac**, double-click **2-Update-My-Dashboards.command**.
- It reads your data, rebuilds the dashboards, and publishes them to your
  website. When it says **DONE**, you're finished.

### 4. Look at it
- Wait about a minute, then open your site and add **/havenos** to the
  address. Log in and your real numbers are there.

---

## Handy to know

- **It's safe to run the update as often as you like.** Same data twice
  never double-counts.
- **Logging a review by hand** (instead of the Sheet): not required —
  just include reviews in the weekly CSV, or ask me to wire up the
  automatic feed.
- **Monthly:** the only thing worth updating monthly is your ad spend, so
  the cost-per-lead numbers stay right. Ask me and I'll show you the one
  line to change.
- **If the update can't publish** (rare), it'll tell you to open GitHub
  Desktop and click **Push origin** — that finishes it.
