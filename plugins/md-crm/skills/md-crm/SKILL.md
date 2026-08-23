---
description: File-based CRM or ATS on plain Markdown — one file per person, state in
  frontmatter, a generated board, guard checks that fail the run when data lies. Use
  when the user wants to set up or run contact/lead/candidate tracking in a repo or
  folder: "set up a CRM", "track my leads/candidates", "who should I write this week",
  "run the board", "log this reply". Also fires in Russian: «заведи CRM», «веди
  контакты/кандидатов», «прогони доску», «кому писать на этой неделе», «запиши ответ».
---

# md-crm — a CRM on Markdown files

One card = one person = one file. State lives in the card's frontmatter; the board is
**generated** from the cards by `board.mjs` and embedded into `contacts/README.md` —
never edited by hand. Guard checks fail the run (`exit 1`) when the data lies: a send
without an address, a stage without a touch log, a hypothesis tally that does not add up.

Works as a **CRM** (outreach, customer discovery, partnerships) or an **ATS** (hiring) —
the difference is a stage vocabulary, not architecture.

**Division of labor, non-negotiable:** the machine collects, prepares and remembers; the
human decides and sends. Never send anything on the user's behalf. Prepare the text,
put it into the card with the exact address, and hand it over.

All file references below are relative to this skill's directory.

## Init — setting up a new CRM

Ask the user three things (one message):

1. **CRM or ATS?** For ATS, read `references/ats-preset.md` and use its vocabulary.
2. **Vocabulary language?** English works as-is. For any other language, translate the
   values of `STAGES`, `BALLS` and `TALKED` in the CONFIG block — the guards are
   vocabulary-agnostic, a stage list is configuration, not code. Keep the ORDER: the
   first stage is "just found/applied" (no touch log required yet), the first ball is
   "our move", the last ball is "waiting" (no overdue).
3. **Where?** Default `./crm` inside the current project.

Then:

1. Copy `scripts/board.mjs` and `scripts/board.test.mjs` → `<dir>/`
2. Copy `templates/board-README.md` → `<dir>/contacts/README.md`
3. Copy `templates/cycle-log.md` → `<dir>/cycle-log.md`
4. Edit the CONFIG block in `<dir>/board.mjs` if the vocabulary or language differs
   from the default.
5. Ask for 2–5 **product hypotheses** the user wants to test across all contacts
   (for ATS: rejection reasons to track) and fill `HYP`, e.g.
   `const HYP = { h1: 'pricing feels unpredictable', h2: 'iterations are too slow' }`.
   Fine to skip — while `HYP` is empty the tally section stays silent.
6. Run `node <dir>/board.mjs` — expect an empty board and exit 0.
7. Run `node --test <dir>/board.test.mjs` — expect all tests green. If the user changed
   the vocabulary, tests still pass: they bring their own fixtures and env.

The origin system was started when there were **three** contacts, on the argument
"without this it will be chaos" — three live threads in three different places and no
single spot showing whose move it is and what was promised. Do not wait for scale.

## Adding a contact

Copy `templates/contact.md` → `<dir>/contacts/<slug>.md` and fill it in the same
session — "I'll add the link later" has already cost the origin system a person: the
feed that surfaced them would not reproduce, and they were never found again.

Field rules the guards enforce:

- `name`, `stage`, `ball`, `last_touch`, `next_action` — mandatory, always.
- `next_action` is a verb plus specifics, one line. If there is nothing to write, the
  contact is closed: set the terminal stage and record the reason in the body.
- If the next action is a **send** (send/write/reply/comment/ask/DM …), `next_url` is
  mandatory and must be the EXACT address: a DM goes to the profile, a comment goes
  under the POST permalink. These are different addresses and mixing them up cost the
  origin system its most valuable lead.
- `asked` / `said` / `denied` — product-hypothesis codes from `HYP`, observations for
  this lead only. `said` and `denied` must be subsets of `asked`.
- `person_hypothesis` — free text about THIS person ("probably not the decision maker").
  Never aggregate it, never let it leak into product conclusions. The origin's most
  expensive failure was exactly this leak — see `references/failures.md`.

## Logging a touch

Every touch, both directions, goes into the card's `## Touch log` — **verbatim, not
paraphrase**. A reconstructed dialogue looks verbatim and lies with confidence. If the
verbatim text was not kept, write "text not preserved" — never restore from memory.

Entry format:

```markdown
### T1 · 2026-08-23 · dm · ⏳ READY TO SEND
**Where:** <exact URL> → exact UI element (e.g. the "Add a comment" field, not the profile)
**Text:**
> the message, word for word, written BEFORE sending
**Goal:** any reply
**Reply:** _(not sent yet)_
```

Statuses: **⏳ READY TO SEND** → **✅ SENT** → **💬 REPLIED**.

The workflow: you prepare the text and the address, put the entry in with ⏳; the user
sends it and says "sent" — you flip to ✅ and update `ball` and `last_touch`; a reply
arrives — the user pastes it, you record it **verbatim** with 💬, update `ball` and
`last_touch`, and rebuild the board.

Every touch = update `last_touch` and `ball`. Wrote to them → ball is theirs. They
answered → ball is ours. A negative result ("they don't have this pain") is a result —
it goes into the card, not into the void.

## The weekly run

The first action is always:

```bash
node board.mjs
```

It prints five things, each leading to its own action: the **cycle state** (when the
last run was, is it time), the **board** (whose move, days of silence, what burns), the
**hypothesis tally**, the **talk counter with checkpoints**, and **card defects**. Never
compute any of this by hand — a hand-kept summary drifts, and the drift shows up as a
wrong decision, not as a visible error.

Reading the board:

| Flag | Meaning | Action |
|---|---|---|
| 🔴 our move, 2+ days | our debt | do it today or close the contact honestly |
| 🔔 their move, 5+ days | silence | next touch per plan — with a NEW fact, not "just bumping this" |
| · | fine | leave it alone |

The thresholds differ on purpose (2 vs 5): our debt burns faster — people owe us
nothing, we owe them an answer.

Checkpoints fire by the number of real TALKS, not touches (reference points from
qualitative research — Guest 2006 saturation, NN/g five-user practice — not laws):
at 5 talks, list repeated objections and make ONE wording change; at 12, check for new
themes; at 10+ talks with zero "unexpected" entries the script itself will tell you the
questions are wrong.

Close the run by recording what was decided:

```bash
node board.mjs --run "change: dropped X from the search query — it caught self-promo"
```

The script writes the date and counters; the human writes the meaning. **One change per
run.** If nothing changed, record "no changes" — it is honest and visible in history.
Without this line the next session starts from zero and repeats an already-made
conclusion.

## The rules that keep the board honest

These are enforced by the script, not by discipline — the origin project's main lesson
is that **a rule without a guard does not survive**: every prose rule got broken, at
least once by the very person who wrote it, in the same file, two paragraphs below.

1. A send without an address fails the run; the board shows **NO ADDRESS**.
2. A stage past the first without a touch log fails the run.
3. `said`/`denied` outside `asked` fails the run — otherwise the tally lies both ways.
4. NOT ASKED prints as words, never as a zero — "not confirmed" and "not asked" are
   different diagnoses.
5. An empty field renders as a dash, never as `undefined` — a hole must look like a hole.
6. Two overdue thresholds, not one — a single "days silent" column would hide our own
   inaction behind their silence.

When something still goes wrong — and it will — read `references/failures.md`: every
way this system has actually broken, with the mechanism and the guard that closed it.
