You're updating my Haven House Cleaning website in GoHighLevel (GHL) using Chrome. I'm already logged into GHL. The live site is https://havenshousecleaning.com.

## Goal
Add upfront pricing so visitors can see a price and book without a phone call. Replace my cluttered homepage with a simpler one. Set up SEO on every page. Everything must look good and work on both desktop and mobile. Keep my GHL header (logo + menu) and footer.

## Files I attached (if they're missing, open these GitHub links, click "Raw", select all, copy)
1. `pricing-page-PASTE.html`: https://github.com/punkybrewster34/punky/blob/claude/beautiful-goodall-7873xq/marketing/ghl/pricing-page-PASTE.html
2. `homepage-PASTE.html`: https://github.com/punkybrewster34/punky/blob/claude/beautiful-goodall-7873xq/marketing/ghl/homepage-PASTE.html
3. `price-block.html`: https://github.com/punkybrewster34/punky/blob/claude/beautiful-goodall-7873xq/marketing/ghl/price-block.html

Paste each file's full contents exactly as-is, except for the edits I list below. Don't rewrite the code.

## Rules
- Back up before changing anything (step 1). Don't delete pages, forms, workflows or contacts.
- Ask me before publishing the homepage (step 4) and before turning on the SMS workflow (step 3).
- If GHL looks different from these steps, find the closest option, then tell me what you did.

---

## Step 1: Back up
1. Sites → Websites → open the Haven House site.
2. Duplicate the current homepage. Name the copy "Home – backup (old)". Don't publish it, and make sure it's not set as the homepage.

## Step 2: Create the Pricing page
1. Add a new page named **Pricing** with the URL path **/pricing**.
2. Add the same header and footer the other pages use (copy them from the homepage, or use the site's global header/footer).
3. Between the header and footer, add one **full-width section** with zero padding on all sides (desktop and mobile). Inside it, add one full-width row/column with zero padding, then a **Custom JS/HTML** element (it may be called "Code" or "Custom HTML").
4. **Before pasting, connect my calendar.** Calendars → find my calendar for quote calls or consultations → Share/Embed → copy the booking link (it looks like `https://api.leadconnectorhq.com/widget/booking/...`). In `pricing-page-PASTE.html`, find the line `calendarEmbedUrl: '',` and paste the link between the quotes. If I don't have a suitable calendar, create one: name it "Free 10-minute quote call", 10-minute slots, Mon–Sat 9 AM–5 PM, Phoenix time, collecting first name, phone and email. Then use its link.
5. Paste the full file into the Custom JS/HTML element and save.
6. Page settings → SEO:
   - Title: `House Cleaning Prices Phoenix | Instant Quote | Haven House Cleaning`
   - Description: `How much does house cleaning cost in Phoenix? See prices by home size for standard, deep and move-out cleaning, with up to 20% off recurring plans. Book online.`
   - Social image: my logo or a good photo of a cleaned home from the media library.
7. Save and publish the Pricing page.

## Step 3: Send website quotes into GHL (inbound webhook)
1. Automation → Workflows → Create workflow from scratch. Name: "Website pricing page leads".
2. Trigger: **Inbound Webhook**. Copy the webhook URL.
3. Back on the Pricing page code, find `webhookUrl: '',`, paste the URL between the quotes, save and republish.
4. Open https://havenshousecleaning.com/pricing in a normal tab. Click "Text me this quote", fill in first name "Test", phone 6025550100, check the consent box, submit.
5. In the workflow trigger, click "Fetch sample request" (or similar). It should show `first_name`, `phone`, `email`, `city`, `quote`, `request`, `source`.
6. Add these actions:
   - **Create/Update Contact:** first name = `first_name`, phone = `phone`, email = `email`. Put `quote` and `request` in a note on the contact (or custom fields named "Website quote" and "Website request"). Add the tag `website-pricing-lead`.
   - **Send SMS** to the contact:
     `Hi {{inboundWebhookRequest.first_name}}! Ryan with Haven House Cleaning here. Your quote: {{inboundWebhookRequest.quote}}. Want me to lock in a date? Reply here or book a time: https://havenshousecleaning.com/pricing#hh-book`
   - **Internal notification** (SMS to me): `New website quote: {{inboundWebhookRequest.first_name}} {{inboundWebhookRequest.phone}}, {{inboundWebhookRequest.quote}}, {{inboundWebhookRequest.request}}`
7. Show me the workflow and ask before publishing it. After it's on, delete the "Test" contact.

## Step 4: Rebuild the homepage
1. Open the live homepage (the one at `/`, not the backup).
2. Keep the header and footer. Delete every section between them.
3. Add one full-width section with zero padding (desktop and mobile), a full-width row/column with zero padding, and a Custom JS/HTML element. Paste `homepage-PASTE.html`. Save.
4. Page settings → SEO:
   - Title: `House Cleaning Phoenix & Tucson | Upfront Prices | Haven House Cleaning`
   - Description: `See your house cleaning price in 30 seconds. Vetted, insured cleaners across Phoenix, Scottsdale, Gilbert, Mesa and Tucson. 4.9 stars on Google. Re-clean guarantee.`
5. Preview on desktop and mobile, show me, and publish after I say OK.

## Step 5: Simplify the header menu (all pages)
- Menu items, in this order: **Pricing** (`/pricing`), **Services** (keep the existing dropdown of service pages), **Service Areas** (keep the existing dropdown of city pages), **Reviews** (`/#reviews`).
- The main header button: text **Get my price**, link `/pricing`, my gold/orange button style.
- Show the phone number **(602) 609-4447** in the header on desktop, as a tap-to-call link.
- Group Janitorial, Commercial and Office cleaning under one "Commercial" item in the Services dropdown.
- Any menu link to `/home` should point to `/`.
- **Mobile:** the logo should be no taller than about 48px. The menu should collapse into a hamburger. Nothing should overlap or cause sideways scrolling.

## Step 6: Change "Get Free Quote" buttons to point at pricing
On every page (homepage backup excluded), change buttons that say "Get Free Quote" / "Get a Free Quote" to **Get my price**, linking to `/pricing`. Keep existing quote forms on service pages, but put the price block (step 7) above them.

## Step 7: Add the price block to city and service pages
For each page below, add a full-width section near the top (right after the first hero/intro section) with a Custom JS/HTML element. Paste `price-block.html`, replace every `[CITY]` (2 places) with the city name, and set `data-type` on the button as listed. Then set the page's SEO title and description.

**City pages** (`data-type="standard"`). For each city, swap in the city name:
- Title: `House Cleaning [City] AZ | Prices from $129 | Haven House Cleaning`
- Description: `Trusted house cleaning in [City], AZ. See your price online in 30 seconds for standard, deep and move-out cleaning. Insured, background-checked cleaners. Re-clean guarantee.`

| Page path | City name |
|---|---|
| /house-cleaning-phoenix-az | Phoenix |
| /house-cleaning-scottsdale-az | Scottsdale |
| /house-cleaning-paradise-valley-az | Paradise Valley |
| /house-cleaning-tempe-az | Tempe |
| /house-cleaning-mesa-az | Mesa |
| /house-cleaning-chandler-az | Chandler |
| /house-cleaning-gilbert-az | Gilbert |
| /house-cleaning-glendale-az | Glendale |
| /house-cleaning-peoria-az | Peoria |
| /house-cleaning-surprise-az | Surprise |
| /house-cleaning-avondale-az | Avondale |
| /house-cleaning-goodyear-az | Goodyear |
| /house-cleaning-tucson-az | Tucson |
| /house-cleaning-oro-valley-az | Oro Valley |

For Tucson and Oro Valley, also change "Phoenix" to "Tucson" anywhere it appears in that page's title or description.

**Service pages.** Use `[CITY]` = `Phoenix`:

| Page path | data-type | SEO title | SEO description |
|---|---|---|---|
| /maid-services | standard | `Recurring Maid Service Phoenix | Weekly & Biweekly | Haven House Cleaning` | `Weekly, every-2-weeks or monthly house cleaning in Phoenix and Tucson. Same trusted team, save up to 20%. See your price online in 30 seconds.` |
| /deep-cleaning | deep | `Deep Cleaning Phoenix | Prices from $194 | Haven House Cleaning` | `Top-to-bottom deep cleaning in Phoenix and Tucson: baseboards, cabinets, built-up grime. Flat prices by home size. See yours online.` |
| /move-in-move-out-cleaning | move | `Move Out Cleaning Phoenix | Prices from $226 | Haven House Cleaning` | `Move-in and move-out cleaning built to pass a landlord's checklist. Inside cabinets, oven and fridge included. Flat prices, book online.` |
| /airbnb-cleaning | standard | `Airbnb Cleaning Phoenix | Turnovers from $129 | Haven House Cleaning` | `Fast, consistent Airbnb turnovers in Phoenix and Tucson: linen change, restock check and photo report. See pricing and book online.` |

On the Airbnb page, change the price block heading from "House cleaning prices in Phoenix" to "Airbnb cleaning prices in Phoenix". Skip the price block on post-construction, janitorial, commercial and office pages; just update their buttons per step 6.

## Step 8: Site-wide SEO settings
- Make sure the sitemap is on (Settings → SEO or the site's settings). Note the sitemap URL.
- Check that the homepage canonical is `https://havenshousecleaning.com/` and that `/pricing` is set to be indexed (not "noindex").
- If my Google Search Console account is linked in Chrome, submit the sitemap and request indexing for `/` and `/pricing`. If not, skip and tell me.
- If I'm logged into Google Business Profile: set the website button to `https://havenshousecleaning.com/pricing`, and add services with starting prices: Standard cleaning from $129, Deep cleaning from $194, Move in/out cleaning from $226. Ask me before saving.

## Step 9: Test everything (desktop AND mobile)
Test each published page in a normal Chrome window, then with DevTools device mode (iPhone 12/13/14, 390px wide):
- [ ] Homepage: the quick-price calculator changes price; "Book this price" opens `/pricing` with the same type/beds/baths already selected.
- [ ] Pricing page: calculator works; "Text me this quote" submits and the lead appears in GHL; the calendar shows my real GHL calendar and loads time slots.
- [ ] Mobile: no sideways scrolling, nothing cut off, the bottom "Book this price" bar on the pricing page isn't covered by the chat widget. If it is, move the chat widget to the left side or raise it.
- [ ] Fonts look like the rest of the site (Poppins headings, Inter text), and colors are navy and gold.
- [ ] All menu links, "Get my price" buttons, city links and service links work (no 404s).
- [ ] Page titles show correctly in the browser tab.
- [ ] The phone number is tap-to-call on mobile.

## When you're done, give me a short report
- What you published, with links.
- Anything you couldn't do or changed from these steps, and why.
- Screenshots of the homepage and pricing page on desktop and mobile.
