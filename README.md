# md-crm — a CRM on Markdown files

A file-based CRM/ATS for [Claude Code](https://code.claude.com), Claude Cowork and
claude.ai. One card = one person = one Markdown file. State lives in the frontmatter;
the board is **generated** by a script and embedded into a README — never edited by
hand. Guard checks fail the run when the data lies: a send without an address, a stage
without a touch log, a hypothesis tally that does not add up.

No database, no SaaS, no dependencies — the whole engine is one Node script
(`node:fs` / `node:path` / `node:url` only) plus a test suite. Your data is plain text
in your own repo: greppable, diffable, versioned with your project.

Works as a **CRM** (outreach, customer discovery, partnerships) or an **ATS** (hiring) —
the difference is a stage vocabulary, not architecture.

## Install

**Claude Code** — two commands inside a session:

```
/plugin marketplace add d7561985/md-crm
/plugin install md-crm@md-crm
```

**Claude Cowork / claude.ai** — download
[`dist/md-crm-skill.zip`](dist/md-crm-skill.zip), then **Customize → Skills → “+” →
upload the ZIP**. The personal skill library is shared between Claude chat and Cowork.

## Quickstart

Say to Claude:

> set up a CRM in this project

Claude asks three questions (CRM or ATS? vocabulary language? which folder?), copies the
script and templates, and runs the first board. Then:

> add a contact: NAME, found via …, next step — ask them about …

> run the board

The board answers the only questions that matter daily: **whose move is it, how long has
it been silent, what burns, where exactly does the next message go.**

```
| | Who | Segment | Stage | Ball | Silence | Next step | Where |
|---|---|---|---|---|---|---|---|
| 🔴 | Jane Doe | agency | contacted | ours | 3 d | reply to her question about pricing | [open](…) |
| · | John Roe | freelancer | found | ours | today | DM: ask what broke first at scale | NO ADDRESS ← guard fails the run
```

## What the guards enforce

- A **send without an exact address** fails the run. A DM goes to a profile, a comment
  goes under a post permalink — mixing those up once cost the origin system its most
  valuable lead.
- A **stage past "found" without a verbatim touch log** fails the run. A card that
  remembers the state but not the conversation cannot tell you which phrase worked.
- **`said`/`denied` must be subsets of `asked`** — otherwise the hypothesis tally lies
  in both directions.
- **NOT ASKED prints as words, never as a zero** — "not confirmed" and "not asked" are
  different diagnoses.
- An **empty field renders as a dash, never `undefined`** — a hole must look like a hole.
- **Two overdue thresholds** (2 days for our move, 5 for theirs) — our debt burns
  faster; a single "days silent" column would hide our own inaction.

Every guard is covered by `board.test.mjs` (24 tests, zero dependencies, `node --test`).

## Where this comes from — honest limits

The system this skill generalizes was built in ~27 hours of calendar time (Aug 2026) on
a live project: 16 contacts, 23 commits, 307 lines of code. Five of its eight guards
were written as a direct response to a failure that had already happened — the full
catalog, anonymized, ships with the skill in
[`references/failures.md`](plugins/md-crm/skills/md-crm/references/failures.md).

What it has **not** proven: the origin system had sent exactly one message and received
zero replies when this was written; no contact has reached a deal; "a CRM at three
contacts" is one case, not a law. This is a skeleton and a discipline, not a silver
bullet.

Long reads (RU/EN/UA/BY/PL):

- [How to create a CRM in an evening — on Markdown files](https://harupa.pro/articles/md-crm-1-kak-sozdat-crm.html)
- [27 hours later: the failure catalog](https://harupa.pro/articles/md-crm-2-27-chasov-provaly.html)

## License

MIT
