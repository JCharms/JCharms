/**
 * One-off: shrink the product photos already sitting in Storage.
 *
 * WHY THIS EXISTS
 * ---------------
 * Photos were uploaded straight off a phone — 24 megapixels, 3-5MB each. Every
 * shopper who scrolled the shop downloaded ~45 of them at full resolution to
 * render thumbnails a few hundred pixels wide. That is what made the grid
 * stutter, and on Supabase's smaller plans it eats the monthly egress
 * allowance in a handful of visits.
 *
 * `compressImageForUpload` (src/lib/imageFile.ts) fixes this for every *future*
 * upload. This script applies the same treatment — 1600px longest edge, quality
 * 82 — to what is already stored.
 *
 * HOW IT WORKS
 * ------------
 * Supabase's own image transformer does the resizing, so there is no image
 * library to install: we ask it for a smaller copy of each file and write that
 * copy back over the original. The storage path never changes, so **no database
 * row is touched** and nothing needs to be re-linked.
 *
 * Deliberately conservative:
 *   • dry run unless you pass --apply
 *   • every original is written to disk first (--backup-dir), so any file can
 *     be put back byte-for-byte
 *   • a file is skipped unless the replacement is genuinely smaller and really
 *     is an image — a failed transform can never overwrite a good photo
 *   • re-running is harmless: already-small files are skipped
 *
 * USAGE
 * -----
 *   # from the repo root, with the service-role key exported
 *   node supabase/maintenance/shrink-stored-images.mjs               # dry run
 *   node supabase/maintenance/shrink-stored-images.mjs --apply       # do it
 *
 * The service-role key is the one from Supabase → Project Settings → API. It
 * bypasses RLS, so keep it out of the shell history (`set +o history`) and
 * never put it in a VITE_ var.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

// ── Settings ────────────────────────────────────────────────────────────────

/** Matches MAX_IMAGE_EDGE / ENCODE_QUALITY in src/lib/imageFile.ts. */
const MAX_EDGE = 1600
const QUALITY = 82

/** Below this a file is already reasonable; leave it alone. */
const SKIP_UNDER_BYTES = 600 * 1024

/** Buckets to sweep, and the table/column that lists what's in them. */
const TARGETS = [
  { bucket: 'product-images', table: 'product_images', column: 'storage_path' },
  { bucket: 'review-screenshots', table: 'reviews', column: 'screenshot_path' },
]

// ── Arguments + credentials ─────────────────────────────────────────────────

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const backupDir = resolve(
  argValue('--backup-dir') ?? join('supabase', 'maintenance', 'image-backup'),
)

function argValue(flag) {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

const url = (process.env.VITE_SUPABASE_URL ?? (await fromDotEnv('VITE_SUPABASE_URL')))?.replace(
  /\/+$/,
  '',
)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) fail('Could not find VITE_SUPABASE_URL (env or .env).')
if (!serviceKey) {
  fail(
    'Set SUPABASE_SERVICE_ROLE_KEY first.\n' +
      '  PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."\n' +
      '  bash:        export SUPABASE_SERVICE_ROLE_KEY="eyJ..."',
  )
}

/** Read a key out of the repo .env so the common case needs no extra setup. */
async function fromDotEnv(key) {
  try {
    const text = await readFile('.env', 'utf8')
    return text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
  } catch {
    return undefined
  }
}

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }

// ── Storage helpers ─────────────────────────────────────────────────────────

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/')

async function listPaths({ table, column }) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${column}`, { headers: authHeaders })
  if (!res.ok) {
    // A bucket whose table/column doesn't exist in this schema is simply not
    // something this project stores — say so and move on.
    console.warn(`  ! could not read ${table}.${column} (${res.status}) — skipping`)
    return []
  }
  const rows = await res.json()
  return [...new Set(rows.map((r) => r[column]).filter(Boolean))]
}

const originalUrl = (bucket, path) =>
  `${url}/storage/v1/object/public/${bucket}/${encodePath(path)}`

const resizedUrl = (bucket, path) =>
  `${url}/storage/v1/render/image/public/${bucket}/${encodePath(path)}` +
  `?width=${MAX_EDGE}&height=${MAX_EDGE}&resize=contain&quality=${QUALITY}`

/**
 * Both fetchers take `bodyNeeded`. A dry run only reports sizes, and asking for
 * bodies it will throw away would pull the entire library over the wire —
 * hundreds of megabytes of the egress allowance this script exists to protect.
 * HEAD gives the same content-length for free.
 */
async function fetchImage(target, bodyNeeded, label) {
  const res = await fetch(target, {
    method: bodyNeeded ? 'GET' : 'HEAD',
    // No image/webp in Accept, so the transformer returns JPEG and the stored
    // file keeps the extension and content-type its path already advertises.
    headers: { Accept: 'image/jpeg,image/*' },
  })
  if (!res.ok) {
    const detail =
      res.status === 400 ? ' — image transformations may not be enabled on this plan' : ''
    throw new Error(`${label} failed (${res.status})${detail}`)
  }
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`${label} returned ${type || 'no content-type'}`)

  const body = bodyNeeded ? Buffer.from(await res.arrayBuffer()) : null
  const size = body ? body.length : Number(res.headers.get('content-length') ?? 0)
  if (!size) throw new Error(`${label} reported no size`)
  return { body, size, type }
}

const getOriginal = (bucket, path, bodyNeeded) =>
  fetchImage(originalUrl(bucket, path), bodyNeeded, 'download')

const getResized = (bucket, path, bodyNeeded) =>
  fetchImage(resizedUrl(bucket, path), bodyNeeded, 'resize')

async function upload(bucket, path, body, contentType) {
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${encodePath(path)}`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': contentType,
      // Same path, new bytes. Paths are UUIDs and never reused, so a long TTL
      // is safe — matches IMMUTABLE_CACHE_SECONDS in src/data/storage.ts.
      'cache-control': 'max-age=31536000',
      'x-upsert': 'true',
    },
    body,
  })
  if (!res.ok) throw new Error(`upload failed (${res.status}) ${await res.text()}`)
}

// ── Run ─────────────────────────────────────────────────────────────────────

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)}MB`

console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} — ${url}`)
console.log(`Resizing to ${MAX_EDGE}px longest edge, quality ${QUALITY}.`)
if (apply) console.log(`Originals are backed up to ${backupDir}`)
console.log('')

let before = 0
let after = 0
let changed = 0
let skipped = 0
let failed = 0

/**
 * Anything that goes wrong here tends to be systemic — a rejected key, upserts
 * not permitted, transformations switched off — and would go wrong identically
 * for all 73 files. Stop after a few in a row rather than hammering the API and
 * burying the real error in pages of identical output.
 */
let consecutiveFailures = 0
const MAX_CONSECUTIVE_FAILURES = 3
class Aborted extends Error {}

try {
for (const target of TARGETS) {
  const paths = await listPaths(target)
  if (paths.length === 0) continue
  console.log(`${target.bucket} — ${paths.length} file(s)`)

  for (const path of paths) {
    try {
      // The original's bytes are only needed to write the backup.
      const original = await getOriginal(target.bucket, path, apply)
      before += original.size

      if (original.size < SKIP_UNDER_BYTES) {
        after += original.size
        skipped += 1
        console.log(`  · ${path} — ${mb(original.size)}, already small`)
        continue
      }

      const resized = await getResized(target.bucket, path, apply)
      if (resized.size >= original.size) {
        after += original.size
        skipped += 1
        console.log(`  · ${path} — resize was no smaller, left alone`)
        continue
      }

      after += resized.size
      changed += 1
      const saving = (1 - resized.size / original.size) * 100
      console.log(
        `  ${apply ? '✓' : '→'} ${path} — ${mb(original.size)} → ${mb(resized.size)} (−${saving.toFixed(0)}%)`,
      )

      if (apply) {
        // Backup lands on disk *before* the overwrite, so an upload that fails
        // halfway can never leave a photo with no way back.
        const backupPath = join(backupDir, target.bucket, path)
        await mkdir(dirname(backupPath), { recursive: true })
        await writeFile(backupPath, original.body)
        await upload(target.bucket, path, resized.body, resized.type)
      }
      consecutiveFailures = 0
    } catch (err) {
      failed += 1
      consecutiveFailures += 1
      console.error(`  ✗ ${path} — ${err.message}`)
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        throw new Aborted(
          `stopped after ${consecutiveFailures} failures in a row — this looks like a ` +
            'setup problem (key, permissions, or transformations), not one bad file.',
        )
      }
    }
  }
  console.log('')
}
} catch (err) {
  if (!(err instanceof Aborted)) throw err
  console.error(`\n✗ ${err.message}`)
  console.error('  Nothing further was attempted. Files already done are fine and')
  console.error(`  their originals are in ${backupDir}.`)
  process.exitCode = 1
}

console.log('─'.repeat(60))
console.log(`total before : ${mb(before)}`)
console.log(`total after  : ${mb(after)}`)
console.log(
  `resized ${changed} · skipped ${skipped} · failed ${failed}` +
    (before > 0 ? ` · saving ${(1 - after / before) * 100 > 0 ? ((1 - after / before) * 100).toFixed(0) : 0}%` : ''),
)
if (!apply && changed > 0) {
  console.log('\nNothing was written. Re-run with --apply to make these changes.')
}
if (failed > 0) process.exitCode = 1
