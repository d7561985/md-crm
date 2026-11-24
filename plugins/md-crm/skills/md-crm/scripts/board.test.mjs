#!/usr/bin/env node
// Guard tests for board.mjs. The origin system had 3 of its 8 guards mutation-checked
// by hand; here every guard is pinned by an automated test. The cycle-log regression at
// the bottom is a direct port of the origin's only test: the one bug that silently
// corrupted data lived in the one place without a test.
//
// Run: node --test board.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'board.mjs')
// The vocabulary is read from the script's own CONFIG block, so the suite survives an
// init that renamed stages/balls or translated them into another language.
const SRC = readFileSync(SCRIPT, 'utf8')
const arr = (name) =>
  SRC.match(new RegExp(`const ${name} = \\[(.*?)\\]`, 's'))[1]
    .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
const STAGES = arr('STAGES')
const BALLS = arr('BALLS')
const TODAY = new Date().toISOString().slice(0, 10)
const CARD_OK = `---
name: Test Person
stage: ${STAGES[0]}
ball: ${BALLS[0]}
last_touch: ${TODAY}
next_action: research their profile
---

## Touch log
_(empty)_
`
const TOUCHLOG_FILLED = `## Touch log

### T1 · ${TODAY} · email · ✅ SENT
**Text:**
> hello there, saw your post about scaling pains — curious what broke first
**Reply:** _(not yet)_
`

/** Mutate the frontmatter of the valid card. */
const mut = (patch) => CARD_OK.replace(/^---\n[\s\S]*?\n---/, (fm) => patch(fm))

/** Run the script (or a patched copy) against a throwaway fixture dir. */
function run(cards, { args = [], log = '', script = SCRIPT } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'mdcrm-'))
  const dir = join(root, 'contacts')
  mkdirSync(dir)
  writeFileSync(join(dir, 'README.md'), '<!-- BOARD:START -->\n<!-- BOARD:END -->\n')
  for (const [f, body] of Object.entries(cards)) writeFileSync(join(dir, f), body)
  const logPath = join(root, 'cycle-log.md')
  if (log) writeFileSync(logPath, log)
  let out = ''
  let code = 0
  try {
    // Paths go in as flags, before the test's own args, so `--run` with no text stays
    // last and is still caught. No env is passed on: the script must not need one.
    out = execFileSync(process.execPath, [script, '--contacts', dir, '--log', logPath, ...args], {
      encoding: 'utf8',
    })
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '')
    code = e.status
  }
  return { out, code, root, logPath, index: join(dir, 'README.md') }
}

// ── required fields and vocabularies ────────────────────────────────────────────────────

test('valid card → exit 0, board embedded into README', () => {
  const r = run({ 'test.md': CARD_OK })
  assert.equal(r.code, 0)
  assert.match(readFileSync(r.index, 'utf8'), /Test Person/)
})

test('missing required field → exit 1 with the field name', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/^ball:.*\n/m, '')) })
  assert.equal(r.code, 1)
  assert.match(r.out, /missing field ball/)
})

test('stage not in list → exit 1', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/^stage:.*$/m, 'stage: bogus')) })
  assert.equal(r.code, 1)
  assert.match(r.out, /stage "bogus" not in list/)
})

test('ball not in list → exit 1', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/^ball:.*$/m, 'ball: bogus')) })
  assert.equal(r.code, 1)
  assert.match(r.out, /ball "bogus" not in list/)
})

test('card without frontmatter → non-zero exit', () => {
  const r = run({ 'bad.md': '# just a heading\n' })
  assert.notEqual(r.code, 0)
  assert.match(r.out, /no frontmatter/)
})

// ── the send ↔ address guard ────────────────────────────────────────────────────────────

test('send verb without next_url → exit 1, NO ADDRESS on the board', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/^next_action:.*$/m, 'next_action: send them the intro message')) })
  assert.equal(r.code, 1)
  assert.match(r.out, /is a send, but next_url is empty/)
  assert.match(r.out, /NO ADDRESS/)
})

test('send verb with next_url → exit 0, address clickable on the board', () => {
  const r = run({
    'ok.md': mut((fm) =>
      fm.replace(/^next_action:.*$/m, 'next_action: send them the intro message\nnext_url: https://example.com/post/1')),
  })
  assert.equal(r.code, 0)
  assert.match(readFileSync(r.index, 'utf8'), /\[open\]\(https:\/\/example\.com\/post\/1\)/)
})

test('"waiting for their reply" is NOT a send — no false alarm', () => {
  const r = run({ 'ok.md': mut((fm) => fm.replace(/^next_action:.*$/m, 'next_action: waiting for their reply on two questions')) })
  assert.equal(r.code, 0)
})

test('send verb after a channel prefix ("DM: ask …") still demands next_url', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/^next_action:.*$/m, 'next_action: DM: ask about their pipeline')) })
  assert.equal(r.code, 1)
  assert.match(r.out, /is a send, but next_url is empty/)
})

test('russian send verb works too («ЛС: спросить …»)', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/^next_action:.*$/m, 'next_action: ЛС: спросить про сроки')) })
  assert.equal(r.code, 1)
  assert.match(r.out, /is a send, but next_url is empty/)
})

test('garbage next_url → exit 1', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/^next_action:.*$/m, 'next_action: research\nnext_url: not-a-url')) })
  assert.equal(r.code, 1)
  assert.match(r.out, /does not look like a URL/)
})

// ── the touch-log guard ─────────────────────────────────────────────────────────────────

test('stage beyond first without a touch log → exit 1', () => {
  const r = run({ 'bad.md': CARD_OK.replace(`stage: ${STAGES[0]}`, `stage: ${STAGES[1]}`).replace(/## Touch log[\s\S]*$/, '') })
  assert.equal(r.code, 1)
  assert.match(r.out, /Touch log/)
})

test('stage beyond first with a filled touch log → exit 0', () => {
  const r = run({
    'ok.md': CARD_OK.replace(`stage: ${STAGES[0]}`, `stage: ${STAGES[1]}`)
      .replace(`ball: ${BALLS[0]}`, `ball: ${BALLS[1]}`)
      .replace(/## Touch log[\s\S]*$/, TOUCHLOG_FILLED),
  })
  assert.equal(r.code, 0)
})

// ── the board never lies silently ───────────────────────────────────────────────────────

test('empty optional field renders as a dash, never "undefined"', () => {
  const r = run({ 'ok.md': CARD_OK })
  assert.doesNotMatch(readFileSync(r.index, 'utf8'), /undefined/)
})

test('overdue our move gets 🔴 (our debt burns faster: 2 days, not 5)', () => {
  const r = run({ 'ok.md': CARD_OK.replace(`last_touch: ${TODAY}`, 'last_touch: 2026-01-01') }, { args: ['--check'] })
  assert.equal(r.code, 1) // --check: exit 1 when something burns
  assert.match(r.out, /🔴/)
})

// ── hypotheses: three states, subsets (needs a non-empty HYP → patched copy) ────────────

function patchedScript() {
  const dir = mkdtempSync(join(tmpdir(), 'mdcrm-hyp-'))
  // Replace whatever HYP the user configured — the suite brings its own hypothesis.
  const patched = SRC.replace(/const HYP = \{[\s\S]*?\}/, "const HYP = { h1: 'test hypothesis' }")
  const p = join(dir, 'board.mjs')
  writeFileSync(p, patched)
  return p
}

test('said without asked → exit 1: the tally will not add up', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/\n---$/, '\nsaid: h1\n---')) }, { script: patchedScript() })
  assert.equal(r.code, 1)
  assert.match(r.out, /is in said but not in asked/)
})

test('unknown hypothesis code → exit 1', () => {
  const r = run({ 'bad.md': mut((fm) => fm.replace(/\n---$/, '\nasked: zz\n---')) }, { script: patchedScript() })
  assert.equal(r.code, 1)
  assert.match(r.out, /code "zz" not in list/)
})

test('never asked prints NOT ASKED — a different diagnosis than denied', () => {
  const r = run({ 'ok.md': CARD_OK }, { script: patchedScript() })
  assert.equal(r.code, 0)
  assert.match(r.out, /h1.*NOT ASKED/)
})

test('asked and said → 1/1 confirmed', () => {
  const r = run({ 'ok.md': mut((fm) => fm.replace(/\n---$/, '\nasked: h1\nsaid: h1\n---')) }, { script: patchedScript() })
  assert.equal(r.code, 0)
  assert.match(r.out, /h1.*1\/1 confirmed/)
})

test('empty HYP keeps the hypothesis section silent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mdcrm-nohyp-'))
  const p = join(dir, 'board.mjs')
  writeFileSync(p, SRC.replace(/const HYP = \{[\s\S]*?\}/, 'const HYP = {}'))
  const r = run({ 'ok.md': CARD_OK }, { script: p })
  assert.doesNotMatch(r.out, /Product hypotheses/)
})

// ── cycle log: the ported origin regression ─────────────────────────────────────────────
// The origin bug: a magic `+ 24` insertion offset against a real separator length of 22.
// The first run took the "no header yet" branch and looked fine; every next run cut two
// characters into the previous row — it lost its leading `| `, the new row gained an
// extra empty column. Silent data corruption in the exact place that had no test.

test('three runs → three intact rows, freshest on top', () => {
  const root = mkdtempSync(join(tmpdir(), 'mdcrm-log-'))
  const dir = join(root, 'contacts')
  mkdirSync(dir)
  writeFileSync(join(dir, 'README.md'), '<!-- BOARD:START -->\n<!-- BOARD:END -->\n')
  writeFileSync(join(dir, 'ok.md'), CARD_OK)
  const logPath = join(root, 'cycle-log.md')
  writeFileSync(logPath, '# log\n\n<!-- RUNS:START -->\n')
  for (const decision of ['first', 'second', 'third']) {
    execFileSync(process.execPath, [SCRIPT, '--contacts', dir, '--log', logPath, '--run', decision], { encoding: 'utf8' })
  }
  const rows = readFileSync(logPath, 'utf8').split('\n').filter((l) => /^\|?\s*\d{4}-\d{2}-\d{2}/.test(l) || /^\| \d{4}/.test(l))
  assert.equal(rows.length, 3, `three runs must yield three rows, got ${rows.length}`)
  for (const r of rows) {
    assert.ok(r.startsWith('| '), `row must start with "| ": ${r}`)
    assert.equal((r.match(/\|/g) || []).length, 6, `row must have exactly 6 pipes: ${r}`)
  }
  assert.match(rows[0], /third/)
  assert.match(rows[2], /first/)
})

test('--run without text → exit 1 (silently recorded emptiness is worse than no record)', () => {
  const r = run({ 'ok.md': CARD_OK }, { args: ['--run'], log: '<!-- RUNS:START -->\n' })
  assert.equal(r.code, 1)
  assert.match(r.out, /--run needs the decision as text/)
})

test('--run with whitespace only → exit 1', () => {
  const r = run({ 'ok.md': CARD_OK }, { args: ['--run', '   '], log: '<!-- RUNS:START -->\n' })
  assert.equal(r.code, 1)
})

test('--run without the RUNS marker → exit 1', () => {
  const r = run({ 'ok.md': CARD_OK }, { args: ['--run', 'decision'], log: '# no marker here\n' })
  assert.equal(r.code, 1)
  assert.match(r.out, /no marker/)
})
