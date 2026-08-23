# Finding leads on LinkedIn — the browser side

The origin system filled its funnel from LinkedIn search. Everything transferable from
that experience is below. One rule frames all of it:

**The human opens and reads the page; the agent works with what the human already sees.**
No scraping, no automation of clicks, no aggregator plugins — LinkedIn's User Agreement
(§8.2) forbids automated collection, and regulators have priced it (CNIL fined a
contact-scraping vendor €240,000). The practical division of labor: the human scrolls
the search results, the agent (in the Chrome side panel or with a shared screenshot)
triages what is visible, captures addresses and files the cards. This is also simply
the better workflow — the guards below assume a human judgment call at every send.

## 1. Search POSTS, not people

A post search with a keyword + "Author Keywords: Title" + recency gives you a person
who is active *by definition* — they just wrote something. A people search cannot tell
a live profile from a dead one: the origin's first-ever found contact had 452 followers
and zero posts.

There is no geography filter in post search — geography is set by the language of the
query.

## 2. Two classes of query — pick by goal

Measured on the origin's first live run (one run, one niche — a reference point, not a
law):

| Class | Finds | First-run yield |
|---|---|---|
| "looking for / hiring" | buyers with a budget | 1 of 3 — noisy, needs geo-filtering |
| **pain lexicon** (the words people use to complain) | practitioners and builders | 3 of 3 |

Known false positive: `looking` catches both demand and supply — "Looking for a video
editor? DM me" is self-promotion, not a need.

## 3. Triage from the results page — do not open profiles yet

The results page already shows name, title, connection degree, recency, text and
reactions — enough to reject most. Open a profile only for candidates that survive this
first pass, or an hour burns down.

Then a 30-second activity check per profile, with a real timer: recent activity →
last-updated → date of the current position. Three baskets, not two: fresh within 30
days → write now · 1–6 months → warm up first · no trace but a substantive profile →
that is a business card, not a corpse — find the person in another channel. If it did
not resolve in 30 seconds, put it in "unclear" and move on.

## 4. Capture TWO addresses, in the same session

The profile URL **and** the post permalink (`/feed/update/urn:li:activity:<id>/`).
A DM goes to the profile; a comment goes under the post — the origin lost its most
valuable touch to exactly this difference. And capture them immediately: a feed does
not reproduce ten minutes later; "I'll fill the card in later" means losing the person.

File each card with `found_by: <query-id>` — without it the per-query yield cannot be
counted, and that yield is the whole reason queries are versioned.

## 5. Queries are versioned like code

- Record every run: how many it gave, what false positives, what defect is visible,
  what single change follows. Without the record the next run repeats the mistake.
- A query is **exhausted** when two consecutive runs give zero candidates that survive
  the activity check — zero live ones, not "few results".
- A query **works** if at least one conversation came out of it — then extend the same
  skeleton with neighboring words.
- **Retire, don't delete** — mark with a date and reason, or it gets rewritten in a
  month.
- **One change per run**, or you won't know what worked.
- A new query starts from a hypothesis, then the string. A string without a hypothesis
  is word-shuffling — there is nothing to evaluate it against.

## 6. LinkedIn search syntax that is easy to get wrong

Verified against the official help at the origin: exactly five constructs — `" "`,
`AND`, `OR`, `NOT`, `( )`, operators in CAPS only. No wildcards (`*`) or brackets.
`NOT` binds tighter than `AND`/`OR` — exclusions always in parentheses:
`VP NOT (assistant OR SVP)`. Stop words are dropped even inside quotes:
`"head of growth"` equals `"head growth"`.

## 7. Pace

Reference points from the origin (transferred mechanisms, not laws): ~25 new candidates
a week is a sustainable pace for one person; 40–60 found per one conversation early on.
Keep the active list under 200 — vendor data (Saleshandy) shows reply rates halving as
lists double. Write only to people with a **dated signal of activity**; a beautiful
site without a fresh signal goes to a watchlist, not to outreach.
