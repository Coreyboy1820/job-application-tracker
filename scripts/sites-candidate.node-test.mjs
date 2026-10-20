import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { gunzipSync, gzipSync } from 'node:zlib'
import { packageCandidate, verifyCandidate } from './sites-candidate.mjs'

const context = { repository: 'Coreyboy1820/job-application-tracker', source_sha: 'a'.repeat(40), current_main_sha: 'a'.repeat(40), run_id: '123', run_attempt: '1', workflow: '.github/workflows/build.yml', event: 'push', ref: 'refs/heads/main', conclusion: 'success' }
const hosting = { project_id: 'appgprj_6aca682dbe0c819190f4d76b28122aec', static: { directory: 'dist' } }
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'sites-candidate-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, '.openai'))
  mkdirSync(join(root, 'dist'))
  writeFileSync(join(root, '.openai/hosting.json'), JSON.stringify(hosting))
  writeFileSync(join(root, 'dist/index.html'), '<html>Tested build</html>')
  const output = join(root, 'release')
  packageCandidate(root, output, context)
  return { root, output }
}
function rehash(output) {
  writeFileSync(join(output, 'SHA256SUMS'), ['sites-build.tar.gz', 'release.json'].map(name => `${createHash('sha256').update(readFileSync(join(output, name))).digest('hex')}  ${name}\n`).join(''))
}
test('packages repeatable tested build and verifies trusted successful run', t => {
  const { root, output } = fixture(t)
  const before = readFileSync(join(output, 'sites-build.tar.gz'))
  packageCandidate(root, output, context)
  assert.deepEqual(readFileSync(join(output, 'sites-build.tar.gz')), before)
  assert.equal(verifyCandidate(output, context).audience, 'PUBLIC')
})
test('rejects failed, stale, wrong repository and wrong attempt runs', t => {
  const { output } = fixture(t)
  for (const changes of [{ conclusion: 'failure' }, { current_main_sha: 'b'.repeat(40) }, { repository: 'attacker/repo' }, { run_attempt: '2' }, { event: 'pull_request' }, { workflow: '.github/workflows/other.yml' }]) assert.throws(() => verifyCandidate(output, { ...context, ...changes }))
})
test('rejects changed bytes and missing candidate files', t => {
  const { output } = fixture(t)
  writeFileSync(join(output, 'release.json'), '{}')
  assert.throws(() => verifyCandidate(output, context), /checksum/)
  rmSync(join(output, 'release.json'))
  assert.throws(() => verifyCandidate(output, context), /files/)
})
test('rejects wrong project even with recomputed checksums', t => {
  const { output } = fixture(t)
  const metadata = JSON.parse(readFileSync(join(output, 'release.json')))
  metadata.project_id = 'other'
  writeFileSync(join(output, 'release.json'), JSON.stringify(metadata))
  rehash(output)
  assert.throws(() => verifyCandidate(output, context), /project_id/)
})
test('rejects unsafe archive paths, links and unexpected members before extraction', t => {
  const { root, output } = fixture(t)
  const archive = join(output, 'sites-build.tar.gz')
  for (const transform of ['s|dist/index.html|../escape|', 's|dist/index.html|/absolute|', 's|dist/index.html|unexpected|']) {
    execFileSync('tar', ['--format=ustar', `--transform=${transform}`, '-czf', archive, '-C', root, 'dist/index.html'])
    rehash(output)
    assert.throws(() => verifyCandidate(output, context), /path|member/)
  }
  symlinkSync('/etc/passwd', join(root, 'dist/link'))
  execFileSync('tar', ['--format=ustar', '-czf', archive, '-C', root, 'dist'])
  rehash(output)
  assert.throws(() => verifyCandidate(output, context), /link/)
  assert.throws(() => packageCandidate(root, output, context), /unsupported/)
})
test('rejects archive with changed hosting target despite valid metadata and hashes', t => {
  const { root, output } = fixture(t)
  writeFileSync(join(root, '.openai/hosting.json'), JSON.stringify({ ...hosting, project_id: 'other' }))
  execFileSync('tar', ['--format=ustar', '-czf', join(output, 'sites-build.tar.gz'), '-C', root, '.openai/hosting.json', 'dist'])
  rehash(output)
  assert.throws(() => verifyCandidate(output, context), /hosting/)
})
test('rejects duplicate archive members and malformed compressed data', t => {
  const { root, output } = fixture(t)
  const archive = join(output, 'sites-build.tar.gz')
  execFileSync('tar', ['--format=ustar', '-czf', archive, '-C', root, 'dist/index.html', 'dist/index.html'])
  rehash(output)
  assert.throws(() => verifyCandidate(output, context), /duplicate|link/)
  writeFileSync(archive, 'not a gzip archive')
  rehash(output)
  assert.throws(() => verifyCandidate(output, context))
})
test('packaging refuses non-main events and unexpected hosting settings', t => {
  const { root, output } = fixture(t)
  assert.throws(() => packageCandidate(root, output, { ...context, event: 'pull_request' }), /context/)
  writeFileSync(join(root, '.openai/hosting.json'), JSON.stringify({ ...hosting, static: { directory: 'elsewhere' } }))
  assert.throws(() => packageCandidate(root, output, context), /hosting/)
})
test('rejects V7 header prefix confusion even with valid header and candidate checksums', t => {
  const { root, output } = fixture(t)
  const archive = join(output, 'sites-build.tar.gz')
  execFileSync('tar', ['--format=ustar', '-czf', archive, '-C', root, 'dist/index.html'])
  const tar = gunzipSync(readFileSync(archive))
  const header = tar.subarray(0, 512)
  header.fill(0, 0, 100)
  header.write('.git/config', 0, 'ascii')
  header.fill(0, 257, 265)
  header.fill(0, 345, 500)
  header.write('dist', 345, 'ascii')
  header.fill(32, 148, 156)
  const checksum = header.reduce((total, byte) => total + byte, 0)
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii')
  writeFileSync(archive, gzipSync(tar))
  rehash(output)
  assert.throws(() => verifyCandidate(output, context), /USTAR/)
})
