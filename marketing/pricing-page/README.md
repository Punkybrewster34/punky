# Haven House pricing + booking section

`haven-pricing.html` is one self-contained block: an instant price calculator, starting-price cards, a
what's-included table, a booking section and an FAQ. Everything is scoped under `.hh`, so it won't fight
your existing GoHighLevel styles.

## Add it to GoHighLevel

1. **Sites > Websites** (or Funnels) > open the Haven House site > add a new page, e.g. `/pricing`.
2. Drag in a full-width **Section**, then a **Custom JS/HTML** element (under "Custom").
3. Open `haven-pricing.html`, copy everything, paste it into the element, save.
4. Add "Pricing" to the top menu, and point the hero "Get Free Quote" buttons at `/pricing`.

## Connect it (two settings at the top of the script, inside `CONFIG`)

- `calendarEmbedUrl`: **Calendars > Calendar settings > your calendar > Share / Embed**, copy the booking
  link (looks like `https://api.leadconnectorhq.com/widget/booking/...`). Your real calendar then replaces
  the demo time picker, and bookings land in GHL automatically.
- `webhookUrl`: **Automation > Workflows > Create workflow > trigger "Inbound Webhook"**, copy the URL.
  "Text me this quote" (and the demo picker, if no calendar is set) then sends `first_name`, `phone`,
  `email`, `city`, `quote` and `request` into the workflow. In the workflow add **Create/Update Contact**
  (map those fields), **Send SMS** with the quote, and an **internal notification** to your phone.

## Change prices

Edit `CONFIG` at the top of the script: `standard.base`, `perBed`, `perBath`, `deepMultiplier`,
`moveMultiplier`, `airbnb`, `sqftAdd`, `discounts`, `addons`, `cities`. The cards, calculator and
receipt all update from these numbers.

The starting numbers are proposals based on Phoenix market research (Nov 2026), not your current rates.
Set them to your real BookingKoala prices before going live.
