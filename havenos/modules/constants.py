"""Hard business rules for Haven House Cleaning.

These constants encode rules that must NEVER be violated. They are
deliberately hard-coded here rather than read from config.yaml so a
config edit cannot loosen them. config.yaml mirrors them for
documentation only.
"""

# ---------------------------------------------------------------
# RULE 1 — Review velocity caps. A velocity spike previously
# tripped Google's spam filter and deleted reviews. These caps
# override everything, including in-person asks by cleaners.
# ---------------------------------------------------------------
REVIEW_MAX_PER_WEEK = 6
REVIEW_MAX_PER_DAY = 2
# Python weekday(): Monday=0 ... Sunday=6
REVIEW_SEND_WEEKDAYS = (1, 3, 5)  # Tuesday, Thursday, Saturday
REVIEW_SEND_DAY_NAMES = ("Tuesday", "Thursday", "Saturday")

# ---------------------------------------------------------------
# RULE 2 — Cleaner bonus math (all dollars).
# ---------------------------------------------------------------
BONUS_PER_5_STAR_REVIEW = 10.00        # per 5-star review generated
REVIEW_MILESTONE_EVERY = 10            # every 10 reviews...
REVIEW_MILESTONE_AMOUNT = 100.00       # ...pays $100
PERFECT_CLEAN_EVERY = 10               # every 10 qualifying cleans...
PERFECT_CLEAN_AMOUNT = 100.00          # ...pays $100
BONUS_PER_REVIEW_GENERATING_CLEAN = 25.00  # per clean that generates a Google review

# Qualifying clean definition
QUALIFYING_ON_TIME_MINUTES = 10        # clock-in within 10 min of start
QUALIFYING_MIN_PHOTOS = 10             # 10+ BookingKoala photos

# ---------------------------------------------------------------
# RULE 3 — LSA: never suggest bid changes before 75 reviews.
# ---------------------------------------------------------------
LSA_REVIEW_THRESHOLD = 75
LSA_BID_WARNING = "Do not touch bids before 75 reviews."

# ---------------------------------------------------------------
# RULE 4 — Recurring service is the condition of the offer,
# not an upsell. (Enforced in message templates, Module 1.)
# ---------------------------------------------------------------

# Brand palette
BRAND = {
    "navy": "#12307d",
    "blue": "#0c5cbb",
    "light_blue": "#7eb9ff",
    "orange": "#ffaf15",
    "gold": "#ffc42c",
    "green": "#689416",
    "gray": "#e5e7eb",
}
