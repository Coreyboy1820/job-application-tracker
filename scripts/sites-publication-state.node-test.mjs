import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { initialState, validateState, transition, applyCommand, initialize, githubAdapter } from './sites-publication-state.mjs'

const owner = randomUUID()
const other = randomUUID()
const releaseId = randomUUID()
const provenance = { sourceSha: 'a'.repeat(40), runId: '1', runAttempt: '1', artifactId: '2', archiveSha256: 'b'.repeat(64), sitesSourceSha: 'c'.repeat(40) }
const command = (action, extra = {}) => ({ action, owner, operationId: randomUUID(), ...extra })
const acquired = () => transition(initialState(), command('acquire'))
const begun = () => transition(acquired(), command('begin', { releaseId, provenance }))
const evidence = { observedAt: '2026-10-19T12:00:00.000Z', observation: 'Observed terminal result from Sites', terminalConfirmed: true }
const success = () => transition(transition(begun(), command('record', { releaseId, versionId: 'v1', deploymentId: 'd1' })), command('finish', { releaseId, status: 'succeeded', evidence: { ...evidence, publication: 'succeeded', versionId: 'v1', deploymentId: 'd1' } }))

function store(initial = initialState()) {
  let state = initial
  let writes = 0
  const digest = () => createHash('sha1').update(JSON.stringify(state)).digest('hex')
  return {
    get writes() { return writes },
    async read() { return state ? { state: structuredClone(state), sha: digest() } : null },
    async write(next, expected) {
      writes++
      if (state ? expected !== digest() : expected !== undefined) throw new Error('409 stale SHA')
      state = structuredClone(next)
    },
  }
}

test('competing snapshots allow only one lock owner via CAS', async () => {
  const adapter = store()
  const snapshot = await adapter.read()
  const stale = { read: async () => snapshot, write: adapter.write }
  await applyCommand(stale, command('acquire'))
  await assert.rejects(applyCommand(stale, command('acquire', { owner: other })), /re-read.*409/)
  assert.equal((await adapter.read()).state.owner, owner)
})

test('lock contention and foreign-owner mutations fail closed', () => {
  assert.throws(() => transition(acquired(), command('acquire', { owner: other })), /busy/)
  for (const action of ['unlock', 'begin', 'record', 'finish']) assert.throws(() => transition(acquired(), command(action, { owner: other })), /does not own/)
})

test('revision and operation history prevent acquire/unlock/reacquire ABA', async () => {
  const adapter = store()
  const initial = await adapter.read()
  await applyCommand(adapter, command('acquire'))
  await applyCommand(adapter, command('unlock'))
  const unlocked = await adapter.read()
  assert.notEqual(initial.sha, unlocked.sha)
  assert.equal(unlocked.state.revision, 2)
  await applyCommand(adapter, command('acquire'))
  assert.equal((await adapter.read()).state.revision, 3)
  assert.throws(() => transition(unlocked.state, command('acquire', { operationId: unlocked.state.operationIds[0] })), /Unique/)
})

test('pending publication retains lock across unknown and ambiguous outcomes', () => {
  const state = begun()
  assert.throws(() => transition(state, command('unlock')), /retains/)
  for (const publication of ['unknown', 'timeout', 'failed']) {
    assert.throws(() => transition(state, command('finish', { releaseId, status: 'failed', evidence: { ...evidence, terminalConfirmed: false, publication } })), /observation/)
  }
  assert.throws(() => transition(state, command('finish', { releaseId, status: 'failed', evidence: { ...evidence, publication: 'not-started' } })), /not-started/)
  const done = transition(state, command('finish', { releaseId, status: 'failed', evidence: { ...evidence, publication: 'not-started', noSideEffects: true } }))
  assert.equal(transition(done, command('unlock')).owner, null)
})

test('saved IDs and provenance cannot be replaced; terminal records remain unchanged', () => {
  const recorded = transition(begun(), command('record', { releaseId, versionId: 'v1', deploymentId: 'd1' }))
  assert.throws(() => transition(recorded, command('record', { releaseId, versionId: 'v2' })), /immutable/)
  assert.throws(() => transition(recorded, command('finish', { releaseId, status: 'failed', evidence: { ...evidence, publication: 'failed' } })), /identify/)
  const done = success()
  assert.throws(() => transition(done, command('record', { releaseId, versionId: 'v2' })), /pending/)
  assert.throws(() => transition(done, command('finish', { releaseId, status: 'failed', evidence })), /pending/)
  assert.throws(() => transition(done, command('begin', { releaseId: randomUUID(), provenance })), /already published/)
  const next = transition(done, command('begin', { releaseId: randomUUID(), provenance: { ...provenance, sourceSha: 'd'.repeat(40), artifactId: '3' } }))
  assert.deepEqual(next.releases[0], done.releases[0])
})

test('success requires observed matching saved version and deployment', () => {
  assert.throws(() => transition(begun(), command('finish', { releaseId, status: 'succeeded', evidence: { ...evidence, publication: 'succeeded' } })), /matching/)
  assert.equal(success().releases[0].status, 'succeeded')
})

test('malformed persisted state fails closed', () => {
  for (const override of [{ audience: 'private' }, { project: 'foreign' }, { revision: -1 }, { schema: 2 }, { owner: 123 }, { releases: [null] }]) assert.throws(() => validateState({ ...initialState(), ...override }))
  const pending = begun()
  assert.throws(() => validateState({ ...pending, owner: other }), /owner/)
})

test('missing state only explicit init creates; ambiguous writes never retry', async () => {
  const adapter = store(null)
  await assert.rejects(applyCommand(adapter, command('acquire')), /initialization/)
  await initialize(adapter)
  await assert.rejects(initialize(adapter), /already exists/)
  let calls = 0
  const ambiguous = { read: adapter.read, write: async () => { calls++; throw new Error('timeout after send') } }
  await assert.rejects(applyCommand(ambiguous, command('acquire')), /re-read.*timeout/)
  assert.equal(calls, 1)
})

test('GitHub adapter uses dedicated branch and expected SHA, never token arguments', async () => {
  const state = acquired()
  const calls = []
  const adapter = githubAdapter((args, input) => {
    calls.push({ args, input })
    if (args.includes('--method')) return JSON.stringify({ content: { sha: 'f'.repeat(40) } })
    if (args.includes('--include')) return `HTTP/2.0 200 OK\n\n${JSON.stringify({ type: 'file', path: 'publication-state.json', sha: 'a'.repeat(40), encoding: 'base64', content: Buffer.from(JSON.stringify(state)).toString('base64') })}`
    return '{}'
  })
  assert.deepEqual((await adapter.read()).state, state)
  await adapter.write(state, 'e'.repeat(40))
  const body = JSON.parse(calls.at(-1).input)
  assert.equal(body.branch, 'sites-publication-state')
  assert.equal(body.sha, 'e'.repeat(40))
  assert.ok(calls[0].args[1].endsWith('/git/ref/heads/sites-publication-state'))
})

test('GitHub missing file is distinguished from missing branch and authorization errors', async () => {
  const missing = githubAdapter(args => {
    if (!args.includes('--include')) return '{}'
    throw Object.assign(new Error('gh 404'), { stdout: 'HTTP/2.0 404 Not Found\n\n{}' })
  })
  assert.equal(await missing.read(), null)
  const denied = githubAdapter(() => { throw new Error('unauthorized') })
  await assert.rejects(denied.read(), /unauthorized/)
})

test('oversized state is rejected before offline planning or network mutation', () => {
  const state = { ...initialState(), revision: 19999, operationIds: Array.from({ length: 20000 }, () => randomUUID()) }
  assert.throws(() => validateState(state), /capacity/)
  assert.throws(() => transition(state, command('acquire')), /capacity/)
})

test('failed publication evidence must identify a saved version even before deployment', () => {
  const state = transition(begun(), command('record', { releaseId, versionId: 'saved-v1' }))
  assert.throws(() => transition(state, command('finish', { releaseId, status: 'failed', evidence: { ...evidence, publication: 'failed' } })), /identify recorded version/)
  const finished = transition(state, command('finish', { releaseId, status: 'failed', evidence: { ...evidence, publication: 'failed', versionId: 'saved-v1' } }))
  assert.equal(finished.releases[0].status, 'failed')
})


test('failure without publication IDs cannot release an ambiguous lock', () => {
  const state = begun()
  assert.throws(() => transition(state, command('finish', { releaseId, status: 'failed', evidence: { ...evidence, publication: 'failed' } })), /recorded publication identifier/)
  assert.throws(() => transition(state, command('unlock')), /retains/)
})

test('rollback retains provenance and ownership through a new terminal deployment', () => {
  const original = success()
  const rollbackId = randomUUID()
  const pending = transition(original, command('begin-rollback', { releaseId: rollbackId, rollbackOf: releaseId }))
  assert.equal(pending.releases[1].versionId, 'v1')
  assert.deepEqual(pending.releases[1].provenance, provenance)
  assert.throws(() => transition(pending, command('unlock')), /retains/)
  assert.throws(() => transition(pending, command('record', { releaseId: rollbackId, versionId: 'v2' })), /immutable/)
  assert.throws(() => transition(pending, command('record', { releaseId: rollbackId, deploymentId: 'd1' })), /already recorded/)
  const recorded = transition(pending, command('record', { releaseId: rollbackId, deploymentId: 'rollback-d1' }))
  const done = transition(recorded, command('finish', { releaseId: rollbackId, status: 'succeeded', evidence: { ...evidence, publication: 'succeeded', versionId: 'v1', deploymentId: 'rollback-d1' } }))
  assert.equal(transition(done, command('unlock')).owner, null)
  assert.deepEqual(done.releases[0], original.releases[0])
  assert.throws(() => transition(done, command('begin', { releaseId: randomUUID(), provenance })), /already published/)
  assert.throws(() => transition(original, command('begin-rollback', { releaseId: randomUUID(), rollbackOf: randomUUID() })), /successful release target/)
  assert.throws(() => validateState({ ...done, releases: [done.releases[1], done.releases[0]] }), /earlier successful/)
})
