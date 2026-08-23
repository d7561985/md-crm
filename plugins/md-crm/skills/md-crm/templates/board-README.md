# Contacts — the board

One card = one person = one file in this folder. The table below is **generated** —
never edit it by hand: a hand-kept index always drifts from the cards, and the drift is
caught not by eyes but by a failure ("I thought I had written to them").

```bash
node ../board.mjs            # rebuild the board and embed it here
node ../board.mjs --check    # verify only: exit 1 if anything burns
```

<!-- BOARD:START -->
<!-- BOARD:END -->

## Flags

| Flag | When |
|---|---|
| 🔴 | **our** move and silent 2+ days — our debt, it burns faster |
| 🔔 | **their** move and silent 5+ days — time for a careful ping with a new fact |
| · | fine |

The thresholds differ on purpose: people owe us nothing, we promised and owe.

## Touch log statuses

⏳ READY TO SEND → ✅ SENT → 💬 REPLIED

The text goes into the card **before** sending, verbatim — after sending it lives only
inside the channel, and a month later there is nothing to retrieve it with. Verbatim,
not paraphrase: a reconstructed dialogue looks verbatim and lies with confidence.
