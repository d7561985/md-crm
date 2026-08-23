# ATS preset — the same skeleton, a different vocabulary

The origin system was built and battle-tested as a **CRM** for outreach and customer
discovery. An ATS (applicant tracking) was **not** built — but the difference between
the two is a stage vocabulary, not architecture. Honest status: this preset is a
vocabulary swap on a proven skeleton, not itself proven in hiring.

| | CRM (the origin) | ATS (same skeleton) |
|---|---|---|
| Entity | a person we are talking to | a candidate |
| Stages | found → contacted → replied → talking → testing → deciding → closed | applied → screening → interview → offer → hired / rejected |
| "Whose move" | ours / theirs / waiting | ours / theirs / waiting |
| Journal | what we sent, what they answered | the same |
| Aggregate | product hypotheses across all leads | rejection reasons across all candidates |

Everything else — one file per entity, state in frontmatter, a generated board, guards
that keep the board honest — transfers one to one. What changes is one list of strings.

## Config values for board.mjs

Replace in the CONFIG block:

```js
const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']
const BALLS = ['ours', 'theirs', 'waiting']
// A real conversation starts at the interview.
const TALKED = ['interview', 'offer']
```

Notes:

- `STAGES[0]` ('applied') is the only stage allowed without a touch log — any later
  stage demands the verbatim record of what was asked and answered.
- `hired` and `rejected` are both terminal. A rejection without a recorded reason is the
  ATS equivalent of the CRM's "negative result is still a result" rule: it must land in
  the card, not vanish.
- `HYP` becomes rejection/drop-off reasons you are tracking across candidates (e.g.
  `r1: 'compensation below range'`, `r2: 'remote policy mismatch'`). The same
  `asked / said / denied` mechanics apply: a reason you never probed for prints
  NOT ASKED — a different diagnosis than "not confirmed".
- The two overdue thresholds keep their meaning: a candidate waiting on us for 2+ days
  burns red — our debt burns faster than theirs.
