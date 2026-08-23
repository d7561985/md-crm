#!/usr/bin/env node
// Contacts board: collects <crm-dir>/contacts/*.md into a readable table and embeds it
// into contacts/README.md between markers. Never edit the table by hand — it is overwritten.
//
// Why a script and not a hand-kept table: an index maintained by hand always drifts from
// the cards, and the drift is caught not by eyes but by a failure ("I thought I had
// written to them"). Source of truth is the card frontmatter; the board is derived.
//
// Usage: node board.mjs [--check] [--run "decision text"]
//   no flags — prints the board and rewrites the section in contacts/README.md
//   --check  — print only; exit 1 when anything burns (for a future gate)
//   --run    — append a cycle-log entry: date and counters come from the script,
//              the decision text comes from you
//
// This file descends from a live system built in Aug 2026 (see the md-crm skill).
// Logic is a 1:1 port; only the vocabulary below is configuration.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Everything lives next to this script: <crm-dir>/board.mjs, <crm-dir>/contacts/*.md,
// <crm-dir>/contacts/README.md (the board is embedded there), <crm-dir>/cycle-log.md.
// Env overrides exist so tests can point at fixtures instead of live data.
const HERE = dirname(fileURLToPath(import.meta.url))
const DIR = process.env.CRM_CONTACTS || join(HERE, 'contacts')
const INDEX = join(DIR, 'README.md')
const LOG = process.env.CRM_LOG || join(HERE, 'cycle-log.md')
const START = '<!-- BOARD:START -->'
const END = '<!-- BOARD:END -->'

// ── CONFIG ── everything a user (or the md-crm skill at init) may edit lives here. ──────
// Stage vocabulary. CRM and ATS share the skeleton; only this list differs.
//   CRM: found → contacted → replied → talking → testing → deciding → closed
//   ATS: applied → screening → interview → offer → hired | rejected
// Order matters: STAGES[0] is "just found" — a card may sit there without a touch log,
// any later stage demands one.
const STAGES = ['found', 'contacted', 'replied', 'talking', 'testing', 'deciding', 'closed']
// Whose move it is — the main field of the board. Order matters:
// BALLS[0] = our move, BALLS[1] = their move, BALLS[2] = waiting/paused (no overdue).
const BALLS = ['ours', 'theirs', 'waiting']
// Stages that count as a real conversation — hypotheses can only be asked here or later.
const TALKED = ['talking', 'testing', 'deciding']
// Overdue thresholds, days. Two on purpose, not one: our debt burns faster than theirs —
// people owe us nothing, we owe them an answer. A single "days silent" column would
// merge the two metrics and hide our own inaction.
const OVERDUE_OURS = 2
const OVERDUE_THEIRS = 5
// Product hypotheses tested across ALL leads. A card records an OBSERVATION
// (asked / said / denied); the conclusion exists only in the aggregate below —
// product decisions are made FROM leads, not from one person. Hypotheses about a PERSON
// ("they are on vacation", "not the decision maker") do NOT belong here on purpose:
// they live and die inside the card (person_hypothesis) and drive the next touch.
// Mixing the two breeds has already misled once: a person-hypothesis was smuggled into
// a product conclusion, and the real explanation turned out to be mundane.
// Filled at init; while empty, the tally section stays silent.
const HYP = {}
// Action verbs meaning "the next step is a SEND". If matched, next_url is mandatory —
// otherwise the text goes to the wrong place (a ready comment once went under a stranger's
// post: the card held a PROFILE link, but a comment goes under a POST — different
// addresses). The verb is checked at the START of next_action (optionally after a short
// channel prefix like "DM:", "ЛС:") because in English "reply"/"message" are also nouns:
// "waiting for their reply" is waiting, no address needed. A false alarm is worse than
// a miss: a warning that lies teaches people to ignore warnings.
const SEND_VERBS = /^\s*(?:[^:\n]{1,24}:\s*)?((?:send|write|reply|answer|comment|ask|post|ping|message|email|dm|follow[ -]?up)\b|отправить|отправь|написать|напиши|ответить|ответь|комментарий|коммент|прокомментировать|спросить|спроси|послать|запостить|пингануть|дослать)/i
// Body sections the script reads (EN and RU headings both recognized).
const RE_UNEXPECTED = /##\s*unexpected\s*\n([\s\S]*?)(?=\n##\s|$)/i
const RE_TOUCHLOG = /##\s*(?:touch log|журнал касаний)\s*\n([\s\S]*?)(?=\n##\s|$)/i
// ── END CONFIG ─────────────────────────────────────────────────────────────────────────

/** "h2, h4" → ['h2','h4']. Empty and junk silently dropped, unknown codes returned —
 *  the validator catches them, otherwise a typo would silently vanish from the tally. */
const codes = (raw) => String(raw || '').split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)

/** Minimal frontmatter parser: `key: value` until the closing `---`. YAML is not needed here. */
function frontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) throw new Error(`${file}: no frontmatter between --- and ---`)
  const out = {}
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const i = line.indexOf(':')
    if (i < 0) continue
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const daysBetween = (a, b) => Math.round((b - a) / 86400000)

function load() {
  const today = new Date(new Date().toISOString().slice(0, 10))
  const rows = []
  const problems = []
  for (const f of readdirSync(DIR).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()) {
    const body = readFileSync(join(DIR, f), 'utf8')
    const fm = frontmatter(body, f)
    // `unexpected` lives in the card BODY, not the frontmatter: it is prose and must not
    // be squeezed into a table. But the cycle has to know whether it is filled — "empty
    // after ten talks" means we ask wrong, not that there are no surprises. Hence the
    // only body parsing in this script.
    const un = body.match(RE_UNEXPECTED)
    const unexpectedFilled = !!(un && un[1].replace(/[_*\s()]/g, '') && !/пусто|empty/i.test(un[1]))
    // Touch log — the verbatim text of what was sent and what came back. Without it the
    // card remembers the STATE ("ball is theirs") but not the CONVERSATION: a week later
    // there is no way to reconstruct which phrase the person reacted to. Required from
    // the second the contact moves past the first stage.
    const log = body.match(RE_TOUCHLOG)
    const logFilled = !!(log && log[1].replace(/[_*\s()—-]/g, '').length > 20)
    if (fm.stage && fm.stage !== STAGES[0] && !logFilled) {
      problems.push(`${f}: stage "${fm.stage}" but section "## Touch log" is missing or empty — there will be nothing to reconstruct what was sent and answered`)
    }
    for (const req of ['name', 'stage', 'ball', 'last_touch', 'next_action']) {
      if (!fm[req]) problems.push(`${f}: missing field ${req}`)
    }
    if (fm.stage && !STAGES.includes(fm.stage)) problems.push(`${f}: stage "${fm.stage}" not in list ${STAGES.join(' | ')}`)
    if (fm.ball && !BALLS.includes(fm.ball)) problems.push(`${f}: ball "${fm.ball}" not in list ${BALLS.join(' | ')}`)
    for (const field of ['asked', 'said', 'denied']) {
      for (const c of codes(fm[field])) {
        if (!HYP[c]) problems.push(`${f}: field ${field} has code "${c}" not in list ${Object.keys(HYP).join(' | ') || '(HYP is empty)'}`)
      }
    }
    // "said" and "denied" must be subsets of "asked": otherwise the tally lies both
    // ways — a confirmation without a question looks like our invention, and a denial
    // without a question gets lost.
    for (const field of ['said', 'denied']) {
      const asked = new Set(codes(fm.asked))
      for (const c of codes(fm[field])) {
        if (HYP[c] && !asked.has(c)) problems.push(`${f}: "${c}" is in ${field} but not in asked — the tally will not add up`)
      }
    }
    // The address is mandatory exactly when the step is a send. For "research",
    // "decide with the owner", "do not touch" no address is needed, and demanding one
    // is noise that teaches people to ignore warnings.
    const needsUrl = SEND_VERBS.test(fm.next_action || '')
    const hasUrl = /^https?:\/\/\S+$/.test((fm.next_url || '').trim())
    if (needsUrl && !hasUrl) {
      problems.push(`${f}: next step "${fm.next_action}" is a send, but next_url is empty. Where exactly does it go? A comment goes under a POST, not to a profile`)
    }
    if (fm.next_url && !hasUrl) problems.push(`${f}: next_url "${fm.next_url}" does not look like a URL`)
    const silence = fm.last_touch ? daysBetween(new Date(fm.last_touch), today) : null
    const limit = fm.ball === BALLS[0] ? OVERDUE_OURS : OVERDUE_THEIRS
    const overdue = silence != null && fm.ball !== BALLS[2] && silence >= limit
    rows.push({ file: f, ...fm, silence, overdue, unexpectedFilled })
  }
  // our move first, then the longest silence — whatever burns is always on top
  rows.sort((a, b) => (a.ball === BALLS[0] ? 0 : 1) - (b.ball === BALLS[0] ? 0 : 1) || (b.silence ?? -1) - (a.silence ?? -1))
  return { rows, problems }
}

function render(rows) {
  const head = '| | Who | Segment | Stage | Ball | Silence | Next step | Where |\n|---|---|---|---|---|---|---|---|'
  const body = rows.map((r) => {
    const flag = r.overdue ? (r.ball === BALLS[0] ? '🔴' : '🔔') : '·'
    const link = `[${r.name}](./${r.file})`
    const sil = r.silence == null ? '—' : r.silence === 0 ? 'today' : `${r.silence} d`
    // "Where" is its own column, not a suffix of the step: the address must be visible
    // BEFORE the person starts copying the text. A suffix at the end of a long cell is
    // read last or not at all.
    const where = r.next_url ? `[open](${r.next_url})` : SEND_VERBS.test(r.next_action || '') ? '**NO ADDRESS**' : '—'
    // `|| '—'` is not cosmetic: with a missing field the table would print "undefined",
    // and the board starts lying exactly where it must scream. Caught by mutation check.
    return `| ${flag} | ${link} | ${r.segment || '—'} | ${r.stage || '—'} | ${r.ball || '—'} | ${sil} | ${r.next_action || '—'} | ${where} |`
  })
  return [head, ...body].join('\n')
}

const { rows, problems } = load()
const table = render(rows)
const burning = rows.filter((r) => r.overdue)

console.log(table)
console.log(`\ncontacts: ${rows.length} · our move: ${rows.filter((r) => r.ball === BALLS[0]).length} · burning: ${burning.length}`)
if (burning.length) console.log('🔴/🔔 ' + burning.map((r) => `${r.name} (${r.silence} d)`).join(' · '))

// Product-hypothesis tally. While HYP has keys it prints ALWAYS, even when all zeros:
// "denied" and "not asked" are different diagnoses, and the "asked" column exists
// exactly so the two never merge. A zero tally with zero "asked" means we did not ask
// the question — not that the hypothesis is wrong.
const hypKeys = Object.keys(HYP)
const tally = hypKeys.map((c) => ({
  c,
  asked: rows.filter((r) => codes(r.asked).includes(c)).length,
  said: rows.filter((r) => codes(r.said).includes(c)).length,
  denied: rows.filter((r) => codes(r.denied).includes(c)).length,
}))
if (hypKeys.length) {
  console.log('\nProduct hypotheses (observations per lead, conclusions only in the aggregate):')
  for (const t of tally) {
    const verdict = t.asked === 0 ? 'NOT ASKED' : `${t.said}/${t.asked} confirmed` + (t.denied ? `, ${t.denied} denied` : '')
    console.log(`  ${t.c}  ${HYP[t.c].padEnd(38)} ${verdict}`)
  }
  if (!tally.some((t) => t.asked > 0)) console.log('  ⚠ no hypothesis was asked of anyone — the tally is empty because we did not ask, not because they are wrong')
}

// Weekly-cycle summary. A "talk" is the talking stage and beyond — before that there is
// physically nowhere to test hypotheses. Checkpoints 5 / 12 / 25 come from qualitative
// research (Guest 2006: saturation within twelve interviews, main themes by the sixth)
// and UX practice (NN/g: five people surface ~85% of findings). These are REFERENCE
// POINTS, not constants for cold outreach.
const talks = rows.filter((r) => TALKED.includes(r.stage))
const noSurprise = talks.filter((r) => !r.unexpectedFilled)
// Attribution by query: which search string found the contact and what came of it.
// In two-three months this yields your OWN conversion table by signal type — one that
// exists in no public source. An empty field is not an error: some contacts come from
// outside search (inbound, intros) and must be visible separately, not mixed with
// "forgot to fill in".
const byQuery = {}
for (const r of rows) {
  const q = (r.found_by || '').trim() || '—'
  byQuery[q] = byQuery[q] || { found: 0, talked: 0 }
  byQuery[q].found++
  if (TALKED.includes(r.stage)) byQuery[q].talked++
}
const qs = Object.entries(byQuery).sort((a, b) => b[1].found - a[1].found)
if (qs.length && (qs.length > 1 || qs[0][0] !== '—')) {
  console.log('\nYield by query:')
  for (const [q, v] of qs) console.log(`  ${q === '—' ? '(not from search)' : q}  found ${v.found} · reached a talk ${v.talked}`)
}

console.log(`\nCycle: talks ${talks.length} · of them without an "unexpected" entry ${noSurprise.length}`)
if (talks.length >= 5 && talks.length < 12) console.log('  → checkpoint 5: list repeated objections, make ONE wording change')
if (talks.length >= 12) console.log('  → checkpoint 12: any new themes in the last three talks? none — draft the playbook')
if (talks.length >= 25) console.log('  → checkpoint 25: recount frequencies, freeze what works')
if (talks.length >= 10 && noSurprise.length === talks.length) {
  console.log('  ⚠ ten talks and not a single "unexpected" — a sign we ask wrong, not that there are no surprises')
}

if (problems.length) {
  console.log('\n⚠ card defects:')
  for (const p of problems) console.log('  ' + p)
}

// ── cycle state ──────────────────────────────────────────────────────────────────────────
// The state of CONTACTS lives in the cards; the state of the CYCLE itself lived nowhere —
// a new session could not know when the last run happened and what was decided. The date
// is written by the script (mechanical → machine), the decision by a human as the --run
// argument (meaning → human).
const runArgIdx = process.argv.indexOf('--run')
const today = new Date().toISOString().slice(0, 10)
let logText = ''
try { logText = readFileSync(LOG, 'utf8') } catch { logText = '' }
const lastRun = [...logText.matchAll(/^\| (\d{4}-\d{2}-\d{2}) \|/gm)].map((m) => m[1]).sort().pop() || null
const sinceRun = lastRun ? daysBetween(new Date(lastRun), new Date(today)) : null

console.log(`\nCycle run: ${lastRun ? `last ${lastRun}, ${sinceRun} d ago` : 'NEVER RAN'}`)
if (sinceRun != null && sinceRun < 7) console.log(`  week not over yet (${7 - sinceRun} d left) — skip the full run, but check what burns`)
if (sinceRun != null && sinceRun >= 7) console.log('  → time: a week has passed')

if (runArgIdx >= 0) {
  const decided = (process.argv[runArgIdx + 1] || '').trim()
  if (!decided) { console.error('\n✗ --run needs the decision as text: node board.mjs --run "change: dropped X from query Y"'); process.exit(1) }
  const row = `| ${today} | ${rows.length} | ${rows.filter((r) => r.ball === BALLS[0]).length} | ${talks.length} | ${decided.replace(/\|/g, '/')} |\n`
  const marker = '<!-- RUNS:START -->'
  const src = logText.includes(marker) ? logText : null
  if (!src) { console.error(`\n✗ no marker ${marker} in ${LOG}`); process.exit(1) }
  const at = src.indexOf(marker) + marker.length
  // The header separator is ONE constant: it is printed in the header AND serves as the
  // insertion point for new rows. A magic `+ 24` offset used to live here against a real
  // length of 22, silently corrupting the log: the first run took the "no header yet"
  // branch and was fine, every next one cut two characters into the previous row — it
  // lost its leading `| `, the new row gained an extra empty column. Not caught because
  // the script had no tests at all; found by inventory, reproduced with two consecutive
  // runs. The regression is pinned by board.test.mjs.
  const SEP = '|---|---|---|---|---|\n'
  const head = `\n\n| Date | Contacts | Our move | Talks | Decision |\n${SEP}`
  const cut = src.slice(at).includes('| Date |') ? src.indexOf(SEP) + SEP.length : null
  writeFileSync(LOG, cut == null ? src.slice(0, at) + head + row + src.slice(at) : src.slice(0, cut) + row + src.slice(cut), 'utf8')
  console.log(`  written to ${LOG}`)
}

if (!process.argv.includes('--check')) {
  const src = readFileSync(INDEX, 'utf8')
  const a = src.indexOf(START)
  const b = src.indexOf(END)
  if (a < 0 || b < 0) throw new Error(`no markers ${START} / ${END} in ${INDEX}`)
  writeFileSync(INDEX, src.slice(0, a + START.length) + '\n\n' + table + '\n\n' + src.slice(b), 'utf8')
  console.log(`\nboard embedded into ${INDEX}`)
}

process.exit(problems.length || (process.argv.includes('--check') && burning.length) ? 1 : 0)
