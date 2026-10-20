import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const repository = 'Coreyboy1820/job-application-tracker'
export const project = 'appgprj_6aca682dbe0c819190f4d76b28122aec'
export const branch = 'sites-publication-state'
const path = 'publication-state.json'
const fail = message => { throw new Error(message) }
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const string = value => typeof value === 'string' && value.length > 0 && value.length <= 2048
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
const positive = value => typeof value === 'string' && /^[1-9]\d*$/.test(value)
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
function keys(value, allowed, required = allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) fail('Invalid object fields')
}
function provenanceValid(value) {
  keys(value, ['sourceSha', 'runId', 'runAttempt', 'artifactId', 'archiveSha256', 'sitesSourceSha'])
  if (!sha(value.sourceSha) || !sha(value.sitesSourceSha) || !positive(value.runId) || !positive(value.runAttempt) || !positive(value.artifactId) || !/^[a-f0-9]{64}$/.test(value.archiveSha256)) fail('Invalid release provenance')
}
function evidenceValid(value, release) {
  keys(value, ['observedAt', 'observation', 'publication', 'versionId', 'deploymentId', 'terminalConfirmed', 'noSideEffects'], ['observedAt', 'observation', 'publication', 'terminalConfirmed'])
  if (!iso(value.observedAt) || !string(value.observation) || value.terminalConfirmed !== true) fail('Terminal observation required')
  if (release.status === 'succeeded') {
    if (value.publication !== 'succeeded' || !string(release.versionId) || !string(release.deploymentId) || value.versionId !== release.versionId || value.deploymentId !== release.deploymentId) fail('Success requires matching observed version and deployment')
  } else if (!['failed', 'not-started'].includes(value.publication)) fail('Failure requires terminal failure or verified no publication')
  if (value.versionId !== undefined && value.versionId !== release.versionId) fail('Observed version mismatch')
  if (value.deploymentId !== undefined && value.deploymentId !== release.deploymentId) fail('Observed deployment mismatch')
  if (value.publication === 'not-started' && (value.noSideEffects !== true || release.versionId || release.deploymentId)) fail('Recorded publication cannot be not-started')
  if (value.publication === 'failed' && !release.versionId) fail('Failure requires a recorded publication identifier; reconcile unknown outcomes first')
  if (value.publication === 'failed' && release.versionId && value.versionId !== release.versionId) fail('Failure must identify recorded version')
  if (value.publication === 'failed' && release.deploymentId && value.deploymentId !== release.deploymentId) fail('Failure must identify recorded deployment')
}

export function initialState(operationId = randomUUID()) {
  const state = { schema: 1, repository, project, audience: 'public', revision: 0, operationIds: [operationId], owner: null, releases: [] }
  return validateState(state)
}

export function validateState(state) {
  keys(state, ['schema', 'repository', 'project', 'audience', 'revision', 'operationIds', 'owner', 'releases'])
  if (state.schema !== 1 || state.repository !== repository || state.project !== project || state.audience !== 'public' || !Number.isSafeInteger(state.revision) || state.revision < 0 || !Array.isArray(state.operationIds) || state.operationIds.length !== state.revision + 1 || state.operationIds.some(id => !uuid(id)) || new Set(state.operationIds).size !== state.operationIds.length || (state.owner !== null && !uuid(state.owner)) || !Array.isArray(state.releases)) fail('Invalid publication state')
  const ids = new Set()
  const successes = []
  const deployments = new Set()
  let pending = 0
  for (const release of state.releases) {
    keys(release, ['id', 'owner', 'provenance', 'status', 'versionId', 'deploymentId', 'evidence', 'rollbackOf'], ['id', 'owner', 'provenance', 'status'])
    if (!uuid(release.id) || ids.has(release.id) || !uuid(release.owner) || !['pending', 'succeeded', 'failed'].includes(release.status)) fail('Invalid release record')
    if (release.rollbackOf !== undefined) {
      const target = state.releases.find(previous => previous.id === release.rollbackOf && ids.has(previous.id))
      if (!target || target.status !== 'succeeded' || target.rollbackOf !== undefined || !object(release.provenance) || Object.keys(target.provenance).some(key => target.provenance[key] !== release.provenance[key]) || release.versionId !== target.versionId) fail('Rollback must reference an earlier successful release and its saved version')
    }
    ids.add(release.id)
    provenanceValid(release.provenance)
    for (const key of ['versionId', 'deploymentId']) if (release[key] !== undefined && !string(release[key])) fail('Invalid publication ID')
    if (release.deploymentId) {
      if (deployments.has(release.deploymentId)) fail('Deployment identifier already recorded for another release')
      deployments.add(release.deploymentId)
    }
    if (release.deploymentId && !release.versionId) fail('Deployment requires a saved version')
    if (release.status === 'pending') {
      pending++
      if (release.owner !== state.owner || release.evidence !== undefined) fail('Pending release must retain its owner lock')
    } else evidenceValid(release.evidence, release)
    if (release.status === 'succeeded' && release.rollbackOf === undefined) {
      if (successes.some(previous => previous.sourceSha === release.provenance.sourceSha || previous.artifactId === release.provenance.artifactId)) fail('Duplicate successful source or artifact')
      successes.push(release.provenance)
    }
  }
  if (pending > 1) fail('Multiple pending releases')
  if (Buffer.byteLength(`${JSON.stringify(state, null, 2)}\n`) > 750_000) fail('State ledger capacity reached; retain history and reconcile storage before publishing')
  return state
}

// Commands are explicit mutations. Every change preserves all prior records and advances revision.
export function transition(state, command) {
  validateState(state)
  keys(command, ['action', 'owner', 'operationId', 'releaseId', 'provenance', 'versionId', 'deploymentId', 'status', 'evidence', 'rollbackOf'], ['action', 'owner', 'operationId'])
  const actionFields = { acquire: [], unlock: [], begin: ['releaseId', 'provenance'], 'begin-rollback': ['releaseId', 'rollbackOf'], record: ['releaseId', 'versionId', 'deploymentId'], finish: ['releaseId', 'status', 'evidence'] }
  if (!Object.hasOwn(actionFields, command.action)) fail('Unknown publication action')
  keys(command, ['action', 'owner', 'operationId', ...actionFields[command.action]], ['action', 'owner', 'operationId'])
  if (!uuid(command.owner) || !uuid(command.operationId) || state.operationIds.includes(command.operationId)) fail('Unique owner and operation UUIDs required')
  const next = structuredClone(state)
  const pending = next.releases.find(release => release.status === 'pending')
  if (command.action === 'acquire') {
    if (next.owner !== null) fail('Publication lock is busy; no expiry or stealing is supported')
    next.owner = command.owner
  } else {
    if (next.owner !== command.owner) fail('Publisher does not own the lock')
    if (command.action === 'unlock') {
      if (pending) fail('Pending release retains its lock until observed terminal evidence is recorded')
      next.owner = null
    } else if (command.action === 'begin-rollback') {
      if (pending || !uuid(command.releaseId) || next.releases.some(release => release.id === command.releaseId)) fail('Invalid or already pending release')
      const target = next.releases.find(release => release.id === command.rollbackOf && release.status === 'succeeded' && release.rollbackOf === undefined)
      if (!target) fail('Rollback requires a successful release target')
      next.releases.push({ id: command.releaseId, owner: command.owner, provenance: structuredClone(target.provenance), rollbackOf: target.id, versionId: target.versionId, status: 'pending' })
    } else if (command.action === 'begin') {
      if (pending || !uuid(command.releaseId) || next.releases.some(release => release.id === command.releaseId)) fail('Invalid or already pending release')
      provenanceValid(command.provenance)
      if (next.releases.some(release => release.status === 'succeeded' && (release.provenance.sourceSha === command.provenance.sourceSha || release.provenance.artifactId === command.provenance.artifactId))) fail('Source or artifact already published successfully')
      next.releases.push({ id: command.releaseId, owner: command.owner, provenance: structuredClone(command.provenance), status: 'pending' })
    } else if (command.action === 'record' || command.action === 'finish') {
      if (!pending || pending.id !== command.releaseId) fail('Only the pending release can change')
      if (command.action === 'record') {
        if (command.versionId === undefined && command.deploymentId === undefined) fail('Publication ID required')
        for (const key of ['versionId', 'deploymentId']) if (command[key] !== undefined) {
          if (!string(command[key]) || (pending[key] !== undefined && pending[key] !== command[key])) fail('Publication IDs are immutable')
          pending[key] = command[key]
        }
      } else {
        if (!['succeeded', 'failed'].includes(command.status)) fail('Terminal status required')
        pending.status = command.status
        pending.evidence = structuredClone(command.evidence)
      }
    } else fail('Unknown publication action')
  }
  next.revision++
  next.operationIds.push(command.operationId)
  return validateState(next)
}

// The adapter must enforce atomic compare-and-swap using the supplied GitHub blob SHA.
export async function applyCommand(adapter, command) {
  const snapshot = await adapter.read()
  if (!snapshot || !sha(snapshot.sha)) fail('Missing publication state; explicit initialization is required')
  const state = transition(snapshot.state, command)
  try { await adapter.write(state, snapshot.sha) } catch (error) {
    throw new Error(`State write did not confirm success; re-read and reconcile before any retry: ${error.message}`)
  }
  return state
}

export async function initialize(adapter, operationId = randomUUID()) {
  if (await adapter.read()) fail('Publication state already exists')
  const state = initialState(operationId)
  try { await adapter.write(state, undefined) } catch (error) {
    throw new Error(`Initialization did not confirm success; re-read before any retry: ${error.message}`)
  }
  return state
}

export function githubAdapter(run = (args, input) => execFileSync('gh', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })) {
  const api = `repos/${repository}/contents/${path}`
  return {
    async read() {
      // Verify the dedicated branch exists before interpreting a missing file as uninitialized.
      run(['api', `repos/${repository}/git/ref/heads/${branch}`])
      let raw
      try { raw = run(['api', '--include', `${api}?ref=${branch}`]) } catch (error) {
        if (/^HTTP\/\S+\s+404\b/m.test(String(error.stdout))) return null
        throw error
      }
      const separator = raw.search(/\r?\n\r?\n/)
      const headers = raw.slice(0, separator)
      const status = /^HTTP\/\S+\s+(\d+)/m.exec(headers)?.[1]
      if (status === '404') return null
      if (status !== '200') fail('Unable to read publication state')
      const data = JSON.parse(raw.slice(separator).trim())
      if (data.type !== 'file' || data.path !== path || !sha(data.sha) || data.encoding !== 'base64' || typeof data.content !== 'string') fail('Invalid GitHub state response')
      return { sha: data.sha, state: validateState(JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'))) }
    },
    async write(state, expectedSha) {
      validateState(state)
      const serialized = `${JSON.stringify(state, null, 2)}\n`
      if (Buffer.byteLength(serialized) > 750_000) fail('State ledger capacity reached; retain history and reconcile storage before publishing')
      const body = { branch, message: `Record Sites publication state revision ${state.revision}`, content: Buffer.from(serialized).toString('base64') }
      if (expectedSha !== undefined) {
        if (!sha(expectedSha)) fail('Invalid compare-and-swap SHA')
        body.sha = expectedSha
      }
      const result = JSON.parse(run(['api', '--method', 'PUT', api, '--input', '-'], JSON.stringify(body)))
      if (!sha(result.content?.sha)) fail('Missing write confirmation')
    },
  }
}

async function main() {
  const action = process.argv[2]
  if (action === 'plan') {
    const { state, command } = JSON.parse(readFileSync(0, 'utf8'))
    console.log(JSON.stringify(transition(state, command), null, 2))
    return
  }
  const adapter = githubAdapter()
  if (action === 'read') {
    const snapshot = await adapter.read()
    if (!snapshot) fail('Missing publication state; explicit initialization is required')
    console.log(JSON.stringify(snapshot, null, 2))
  } else if (action === 'init') console.log(JSON.stringify(await initialize(adapter), null, 2))
  else if (action === 'apply') console.log(JSON.stringify(await applyCommand(adapter, JSON.parse(readFileSync(0, 'utf8'))), null, 2))
  else fail('Usage: node scripts/sites-publication-state.mjs read|init|apply|plan (apply reads command JSON; plan reads {state,command} on stdin)')
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
