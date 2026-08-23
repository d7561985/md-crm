# How this system breaks — a catalog of real failures

Every entry below happened in the origin system during its first 27 hours, against live
contacts. Nothing is invented; names and identifying details are removed. Three breeds of
failure, each with its own moral — do not mix them. Five of the origin's eight guards were
written as a direct response to a failure that had already happened, none "for the future".

## Breed 1: data failures — the system remembered a lie or lost the truth

**Someone else's phrase recorded as the owner's voice — in three files.** A contact's
reply ended up in the owner's voice profile as his own words. What made it possible: no
verbatim log of the conversation existed, the card was assembled from paraphrase.
*Transfers:* replies without an explicit "who said it" field merge into one voice, and
the merge surfaces weeks later. *Closed by:* the Touch log discipline — verbatim, with
speakers, before sending.

**The agent invented an offer and recorded it as what the owner proposes to people.**
The "what we can give" list contained something the owner had never offered anyone — the
agent made it up. *Transfers:* a "what we offer" field must store its source, otherwise
it becomes a showcase of wishes. *Closed by:* an "as said to whom" column next to every
offer line.

**A verbatim record of the only contact that ever worked does not exist.** The one live
example of a phrase that actually landed with a stranger cannot be reconstructed — the
state was recorded, the conversation was not. *Transfers:* the state field and the
conversation are different things; the first does not restore the second. *Closed by:*
text goes into the card BEFORE sending.

**A contact was filed without an address — and effectively lost.** The link was not
captured in the same session, and the feed that had surfaced the person is
non-deterministic: the same query ten minutes later returned different people. Two
targeted attempts to find them again failed. *Transfers to any CRM fed from a
non-deterministic feed:* "I'll add it later" = losing the person. *Closed by:* the
next_url guard and the NO ADDRESS flag on the board.

**A segment recorded wrong because the feed was read instead of the profile.** A person
looked like "an agency with a budget"; their profile badge reclassified them as "a
practitioner looking for work". *Transfers:* a field filled from a list preview is a
silent-lie candidate. *Closed by:* the card template's demand for a source per fact.

**The board printed `undefined` instead of an empty field.** Caught by deliberately
breaking the render on the day it was written. *Transfers literally:* a hole in the data
must look like a hole. *Closed by:* a test — an empty optional field renders as a dash.

## Breed 2: process failures — the rule existed but did not fire

**A ready text went under the post of a person marked "do NOT write".** The named
mechanism, honestly, was not carelessness: the card held a link to a PROFILE, but a
comment goes under a POST — different addresses, and the difference is visible only at
send time. The miss hit the most valuable entry in the funnel. *Transfers in its
strongest form:* a "what to say" artifact without a "where" artifact is unfinished
output. *Closed by:* the send ↔ address guard: a send verb in next_action with an empty
next_url fails the run.

**The first version of that guard cried wolf.** It matched a word root and fired on
"waiting for their reply" — which is waiting, not sending. *Transfers:* a guard has two
error rates, not one; a false alarm is worse than a miss, because a warning that lies
teaches people to ignore warnings. *Closed by:* matching action forms at the start of
the field, plus a test for the non-firing case.

**The owner's corrections were written nowhere, and the same mistakes repeated.**
Decisions had a file, voice had a file, facts had cards — but corrections on "how to
talk" lived only in the chat and did not survive a session change. *Transfers:* if a
category of knowledge has no file, it dies with the session — or with the employee.
*Closed by:* a dedicated corrections journal.

**The state of the cycle itself lived nowhere.** The state of every contact was stored;
the state of the process was not — a new session could not know whether a week had
passed or what the last run decided. *Transfers:* a process has state exactly like a
record does, and it needs its own table. *Closed by:* cycle-log.md and the `--run`
argument.

**A rule revoked an artifact, but the artifact stayed.** A text banned by new rules kept
sitting in a card as a working draft for three days, and next_action kept saying "send
it". *Transfers:* a rule that cancels an artifact must also cancel the artifact —
otherwise the ban and the banned object live peacefully in one file.

## Breed 3: interpretation failures — a wrong conclusion from correct data

**The most expensive one. A user's silence was explained by the product — the person was
moving house.** From a behavioral trail ("paid, holds a balance, six charges in two
minutes, then silence") the system concluded "motivation, money and access are all there —
so the product is what stops them". The conclusion was even called the cleanest case in
the sample. The real explanation was mundane life. The mechanism, dissected: *a
behavioral trail without the person's context lies confidently and convincingly* — and
the file next to it already said behavior explains WHAT, not WHY; its own author broke
the rule two paragraphs below. *Transfers strongest of all:* the split between
"hypothesis about the person" and "hypothesis about the product" must be structural —
different fields — not disciplinary. Discipline failed even for the person who wrote the
rule. *Closed by:* `person_hypothesis` (free text, never aggregated) vs `asked/said/denied`
(codes, aggregated), enforced by the script.

**A conclusion was silently rewritten — twice in one day.** A silently corrected
conclusion looks, a month later, as if it had never been revised — the price of the error
is lost together with the lesson. *Transfers:* revising a conclusion is an event to be
stored, not a diff to be lost. *Closed by:* a contradiction rule — what was claimed, what
came against it, what resolved the dispute.

**The wrong defect was fixed — a measured change made things worse.** A search query
tweak took results from 1-in-3 to 0-in-3; the real breakage was elsewhere. It surfaced
only because the miss was recorded. *Transfers:* recording the negative result IS the
improvement mechanism; a change without a measured "before" is indistinguishable from
ritual.

**A filter made of everyday words is not a filter.** A query of common terms returned a
roadmap about electric vertical-takeoff aircraft instead of video production.
*Transfers:* to any alerts and auto-tagging.

**A first survey draft collected confirmation of ourselves.** Scales of 1–5 over our own
list of pains: "people will pick from our list, we will get a confirmation of ourselves
and call it research." Caught before sending — and it was going out through someone
else's network, so the price of the error was someone else's reputation. *Transfers:*
answer options are your hypotheses; an aggregate over them measures you, not the market.

**A 9-of-9 confirmed pain almost became an offer without a caveat.** A third of the
sample had already solved that problem for free with a local tool — they were reporting
success, not pain. *Transfers:* a confirmation counter without a "who already solved it"
flag sells you someone else's success as your demand.

## The main conclusion

**A rule without a guard does not survive.** Every rule written as prose got broken —
including by the same person who wrote it, in the same file, two paragraphs below. The
only rules that survived were the ones with a script that fails the run.

It held for the tool itself: the one bug that silently corrupted data lived in the one
place the script had no test for. Eight iterations added checks for the cards — and not
one check for itself. (In this published version, every guard is covered by
`board.test.mjs`.)
