import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, lstatSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { gunzipSync } from 'node:zlib'

const repository = 'Coreyboy1820/job-application-tracker'
const project = 'appgprj_6aca682dbe0c819190f4d76b28122aec'
const site = 'https://rolecall-private.tealcrow6.chatgpt.site'
const workflow = '.github/workflows/build.yml'
const fail = (message) => { throw new Error(message) }
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (path) => JSON.parse(readFileSync(path, 'utf8'))

function hostingValid(hosting) {
  if (hosting.project_id !== project || hosting.static?.directory !== 'dist' || Object.keys(hosting).some(key => !['project_id', 'static'].includes(key)) || Object.keys(hosting.static).some(key => key !== 'directory')) fail('Unexpected hosting configuration')
}

function contextValid(context, completed) {
  if (context.repository !== repository || context.event !== 'push' || context.ref !== 'refs/heads/main' || context.workflow !== workflow || !/^[a-f0-9]{40}$/.test(context.source_sha) || !/^[1-9]\d*$/.test(String(context.run_id)) || !/^[1-9]\d*$/.test(String(context.run_attempt))) fail('Invalid trusted run context')
  if (completed && (context.conclusion !== 'success' || context.current_main_sha !== context.source_sha)) fail('Run failed or is no longer current main')
}

// Inspect bytes directly: never extract an untrusted archive or follow its links.
export function inspectArchive(bytes) {
  const tar = gunzipSync(bytes, { maxOutputLength: 100 * 1024 * 1024 })
  const files = new Map()
  let offset = 0
  const field = (header, start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '')
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) {
      if (tar.length - offset < 1024 || tar.subarray(offset).some(byte => byte !== 0)) fail('Invalid tar ending')
      return files
    }
    if (header.subarray(257, 263).toString('ascii') !== 'ustar\0' || header.subarray(263, 265).toString('ascii') !== '00') fail('Unsupported tar format: expected POSIX USTAR')
    const numeric = (start, length) => {
      const value = field(header, start, length).trim()
      if (!/^[0-7]+$/.test(value)) fail('Invalid tar numeric field')
      return Number.parseInt(value, 8)
    }
    const checksum = numeric(148, 8)
    const sum = header.reduce((total, byte, index) => total + (index >= 148 && index < 156 ? 32 : byte), 0)
    if (sum !== checksum) fail('Invalid tar checksum')
    const prefix = field(header, 345, 155)
    const name = (prefix ? `${prefix}/` : '') + field(header, 0, 100)
    const type = field(header, 156, 1)
    const size = numeric(124, 12)
    const canonical = name.replace(/\/$/, '')
    if (!canonical || canonical.startsWith('/') || canonical.includes('\\') || canonical.split('/').some(part => !part || part === '.' || part === '..') || files.has(canonical)) fail('Unsafe or duplicate archive path')
    if (!['', '0', '5'].includes(type) || (type === '5' && size !== 0) || field(header, 157, 100)) fail('Unsupported archive member or link')
    const directory = type === '5'
    if (!(canonical === 'dist' && directory) && !(canonical.startsWith('dist/')) && !(canonical === '.openai' && directory) && !(canonical === '.openai/hosting.json' && !directory)) fail('Unexpected archive member')
    if (offset + 512 + size > tar.length) fail('Truncated archive')
    files.set(canonical, { directory, bytes: tar.subarray(offset + 512, offset + 512 + size) })
    offset += 512 + Math.ceil(size / 512) * 512
  }
  fail('Missing tar ending')
}

export function packageCandidate(root, output, context) {
  contextValid(context, false)
  hostingValid(json(join(root, '.openai/hosting.json')))
  const checkTree = (path) => {
    const stat = lstatSync(path)
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) fail('Build contains unsupported file')
    if (stat.isDirectory()) for (const name of readdirSync(path)) checkTree(join(path, name))
  }
  checkTree(join(root, 'dist'))
  checkTree(join(root, '.openai/hosting.json'))
  if (!lstatSync(join(root, 'dist/index.html')).isFile()) fail('Missing dist/index.html')
  mkdirSync(output, { recursive: true })
  execFileSync('tar', ['--format=ustar', '--sort=name', '--mtime=@0', '--owner=0', '--group=0', '--numeric-owner', '-czf', resolve(output, 'sites-build.tar.gz'), '-C', root, '.openai/hosting.json', 'dist'])
  inspectArchive(readFileSync(join(output, 'sites-build.tar.gz')))
  const metadata = { schema_version: 1, repository, source_sha: context.source_sha, run_id: String(context.run_id), run_attempt: String(context.run_attempt), workflow, event: context.event, ref: context.ref, project_id: project, site_url: site, audience: 'PUBLIC', publication_status: 'awaiting_authenticated_sites_publication' }
  writeFileSync(join(output, 'release.json'), JSON.stringify(metadata, null, 2) + '\n')
  writeFileSync(join(output, 'SHA256SUMS'), ['sites-build.tar.gz', 'release.json'].map(name => `${hash(readFileSync(join(output, name)))}  ${name}\n`).join(''))
}

export function verifyCandidate(directory, context) {
  contextValid(context, true)
  if (readdirSync(directory).sort().join(',') !== 'SHA256SUMS,release.json,sites-build.tar.gz') fail('Unexpected candidate files')
  for (const name of ['SHA256SUMS', 'release.json', 'sites-build.tar.gz']) if (!lstatSync(join(directory, name)).isFile() || lstatSync(join(directory, name)).isSymbolicLink()) fail('Candidate must contain regular files')
  const expected = ['sites-build.tar.gz', 'release.json'].map(name => `${hash(readFileSync(join(directory, name)))}  ${name}\n`).join('')
  if (readFileSync(join(directory, 'SHA256SUMS'), 'utf8') !== expected) fail('Candidate checksum mismatch')
  const metadata = json(join(directory, 'release.json'))
  for (const [key, value] of Object.entries({ schema_version: 1, repository, source_sha: context.source_sha, run_id: String(context.run_id), run_attempt: String(context.run_attempt), workflow, event: 'push', ref: 'refs/heads/main', project_id: project, site_url: site, audience: 'PUBLIC', publication_status: 'awaiting_authenticated_sites_publication' })) if (metadata[key] !== value) fail(`Candidate metadata mismatch: ${key}`)
  const files = inspectArchive(readFileSync(join(directory, 'sites-build.tar.gz')))
  if (!files.has('dist/index.html') || files.get('dist/index.html').directory || !files.has('.openai/hosting.json')) fail('Missing required build files')
  hostingValid(JSON.parse(files.get('.openai/hosting.json').bytes.toString('utf8')))
  return metadata
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, directory, contextPath] = process.argv.slice(2)
    if (command === 'package' && directory && !contextPath) {
      packageCandidate(process.cwd(), resolve(directory), { repository: process.env.GITHUB_REPOSITORY, source_sha: process.env.GITHUB_SHA, run_id: process.env.GITHUB_RUN_ID, run_attempt: process.env.GITHUB_RUN_ATTEMPT, workflow, event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF })
    } else if (command === 'verify' && directory && contextPath) {
      verifyCandidate(resolve(directory), json(contextPath))
    } else fail('Usage: node scripts/sites-candidate.mjs package OUTPUT | verify CANDIDATE TRUSTED_CONTEXT.json')
    console.log('Sites candidate validation passed')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
