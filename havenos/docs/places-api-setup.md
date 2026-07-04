# Google Places API setup (Module 4 — Commercial Prospector)

HavenOS uses the **official Places API (New) — Text Search** only. Never
scrape Google Maps or Search: it violates Google's TOS and puts the Haven
GBP account (and its reviews) at risk. The official API at our volume is
free.

## Cost math (why this stays $0)

One full fetch = 5 categories × 3 cities × 1 page = **15 requests**.
Google's free monthly credit covers thousands of Text Search (Pro) calls.
Run `prospects fetch` even weekly and you will not see a bill, but set a
budget alert anyway (step 6).

## Steps

1. Go to https://console.cloud.google.com/ and sign in with the
   havencleanings Google account.
2. Create a project: top bar → project picker → **New Project** → name it
   `havenos-prospector` → Create.
3. Enable the API: **APIs & Services → Library** → search **"Places API
   (New)"** → Enable. (It must be the *New* one, not legacy "Places API".)
4. Create the key: **APIs & Services → Credentials → + Create Credentials
   → API key**. Copy it.
5. Restrict the key (important): click the key → under **API
   restrictions** choose *Restrict key* → tick only **Places API (New)** →
   Save. Leave "Application restrictions" on None (the calls come from
   your laptop, whose IP changes).
6. Budget alert: **Billing → Budgets & alerts → Create budget** → $5 →
   alert at 50/90/100%. You should never hear from it.
7. Put the key in `havenos/.env`:

   ```
   GOOGLE_PLACES_API_KEY=AIza...your-key...
   ```

8. Test:

   ```
   python haven.py prospects fetch
   python haven.py prospects
   ```

## If the API is unavailable

`python haven.py prospects import <file.csv>` accepts any pasted CSV with
at least a business-name column (header aliases live under
`column_maps.prospects_tracker` in `config.yaml`). The existing 48-prospect
tracker imports the same way, and every import dedupes by business name.
