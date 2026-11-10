# Haven House website: homepage + pricing page

Two paste-in pages for GoHighLevel. Both are self-contained (styles scoped under `.hp` / `.hh`).

| File | Page | URL slug |
|---|---|---|
| `homepage/haven-home.html` | New, simplified homepage with a quick price calculator | `/` (home) |
| `pricing-page/haven-pricing.html` | Full calculator, price-by-size table, what's included, booking, FAQ | `/pricing` |

Setup steps for the pricing page connections (calendar + webhook) are in `pricing-page/README.md`.

## 1. Build order in GoHighLevel

1. **Create `/pricing` first.** New page > full-width section > Custom JS/HTML element > paste `haven-pricing.html`.
2. **Duplicate your current homepage as a backup** (rename it `home-old`, don't publish).
3. **Rebuild the homepage:** delete the old sections, keep your GHL header and footer, add one full-width
   section with a Custom JS/HTML element, paste `haven-home.html`.
4. **Simplify the top menu** to: Pricing · Services · Reviews · Book now (button) · phone number.
   Move Janitorial, Commercial and Office into a single "Commercial" menu item.

## 2. SEO settings (GHL: page > Settings > SEO meta data)

**Homepage**
- Title: `House Cleaning Phoenix & Tucson | Upfront Prices | Haven House Cleaning`
- Description: `See your house cleaning price in 30 seconds. Vetted, insured cleaners across Phoenix, Scottsdale, Gilbert, Mesa and Tucson. 4.9 stars on Google. Re-clean guarantee.`

**Pricing page**
- Title: `House Cleaning Prices Phoenix | Instant Quote | Haven House Cleaning`
- Description: `How much does house cleaning cost in Phoenix? See prices by home size for standard, deep and move-out cleaning, with up to 20% off recurring plans. Book online.`

**Each city page** (`/house-cleaning-gilbert-az`, etc.)
- Title: `House Cleaning Gilbert AZ | Prices from $129 | Haven House Cleaning`
- Add a short "Gilbert house cleaning prices" section with the 3-row price table from the homepage
  and a button to `/pricing`. Mention the city by name in the heading and first sentence.

**Each service page** (`/deep-cleaning`, `/move-in-move-out-cleaning`, `/maid-services`)
- Add a "How much does a deep clean cost in Phoenix?" heading with that service's prices and a
  button to `/pricing?type=deep` (or `move`, `standard`). The pricing page opens with that service
  already selected.

## 3. Keep prices in one place

Prices live in `CONFIG` on the pricing page and in `P` at the bottom of the homepage. The price
tables are written into the page as plain text so Google can read them, and the script rewrites them
from `CONFIG` when the page loads. If you change prices, update `CONFIG`, `P`, the homepage price
table, the "From $" amounts on the homepage service cards, and the `makesOffer` prices in the
pricing page's schema block.

## 4. After launch

- Google Search Console: submit the sitemap and request indexing for `/` and `/pricing`.
- Google Business Profile: add the services with "starting at" prices, and set the website button to `/pricing`.
- Watch in GHL: visits to `/pricing`, calendar bookings and quote texts per week.
