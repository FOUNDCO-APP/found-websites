/** Opt-in live storage-only proof. Never creates database rows or changes settings.
 * Run: FOUND_MEDIA_STORAGE_CHECK=1 node tests/resumable-media-storage-browser.mjs
 * Optional: FOUND_MEDIA_STORAGE_RESUME_CHECK=1 adds abort-after-6MiB/fresh-sign/HEAD resume proof.
 * Optional: FOUND_MEDIA_ENV_FILE, FOUND_MEDIA_STORAGE_BUCKET (default company-assets),
 * FOUND_PLAYWRIGHT_MODULE, FOUND_BROWSER_EXECUTABLE, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_URL. Never enable Playwright tracing/HAR for this check.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);

if (process.env.FOUND_MEDIA_STORAGE_CHECK !== '1') {
  console.log('SKIP live storage check: set FOUND_MEDIA_STORAGE_CHECK=1 explicitly.');
  process.exit(0);
}

// Read ignored credentials into local memory only; do not populate process.env.
function credentials() {
  const values = {};
  const envFile = process.env.FOUND_MEDIA_ENV_FILE;
  if (envFile && fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      else value = value.replace(/\s+#.*$/, '');
      values[match[1]] = value;
    }
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || values.NEXT_PUBLIC_SUPABASE_URL || values.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || values.SUPABASE_SERVICE_ROLE_KEY,
    apiKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || values.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
let browser, server, admin, objectPath, bucket, signedToken;
let stage = 'setup', failed = false, cleanupFailed = false;
let failureCode = 'unknown', failureStatus = null;
let locationShape = null, providerShape = null;
const responseInspections = [];
function captureSafeFailure(error) {
  const allowed = ['invalid_resume','invalid_destination','auth','conflict','expired','too_large','network','timeout','aborted','transport'];
  failureCode = allowed.includes(error?.code) ? error.code : 'unknown';
  const status = Number(error?.statusCode ?? error?.status);
  failureStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}
try {
  const config = credentials();
  if (!config.url || !config.key || !config.apiKey) throw Error('missing configuration');
  let publicKey = config.apiKey.startsWith('sb_publishable_');
  if (!publicKey) {
    try { publicKey = JSON.parse(Buffer.from(config.apiKey.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { publicKey = false; }
  }
  if (!publicKey || config.apiKey === config.key) throw Error('browser key must be public');
  const project = new URL(config.url);
  if (project.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(project.hostname) || project.username || project.password || project.port || project.search || project.hash || project.pathname !== '/') throw Error('invalid project');
  const endpoint = `https://${project.hostname.replace('.supabase.co', '.storage.supabase.co')}/storage/v1/upload/resumable/sign`;
  admin = createClient(project.origin, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  config.key = undefined;
  bucket = process.env.FOUND_MEDIA_STORAGE_BUCKET || 'company-assets';
  const companyId = randomUUID(), uploadId = randomUUID(), accountId = randomUUID();
  // A random, noncustomer company directory; delete exactly this object only.
  objectPath = `${companyId}/found-transport-proof-${uploadId}.mp4`;
  const bytes = Buffer.alloc(8 * 1024 * 1024);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31 + 17) & 255;
  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  const helper = ts.transpileModule(fs.readFileSync('src/lib/resumableMediaUpload.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const tusRoot = path.resolve(path.dirname(require.resolve('tus-js-client')), '../..');
  const tusBundle = fs.readFileSync(path.join(tusRoot, 'dist/tus.js'));
  const browserCode = `(()=>{const module={exports:{}},exports=module.exports;const process={env:{NODE_ENV:'production'}};function require(name){if(name==='tus-js-client')return window.tus;throw Error('Unexpected import');}\n${helper}\nwindow.transport=module.exports;})();`;
  server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/tus.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(tusBundle); return; }
    if (req.url === '/helper.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(browserCode); return; }
    if (req.url !== '/') { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><title>Isolated storage proof</title><script src="/tus.js"></script><script src="/helper.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright');
  browser = await chromium.launch({ headless: true, ...(process.env.FOUND_BROWSER_EXECUTABLE ? { executablePath: process.env.FOUND_BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext(); // No persistent profile, tracing, HAR, or console listeners.
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  page.on('response', response => {
    const inspection = (async () => {
    try {
      if (response.request().method() !== 'POST' || response.url() !== endpoint) return;
      if (response.status() >= 400) {
        const body = (await response.text()).slice(0, 65536);
        let parsed;
        try { parsed = JSON.parse(body); } catch { parsed = null; }
        const allowedCodes = ['InvalidJWT','AccessDenied','InvalidSignature','SignatureDoesNotMatch','InvalidRequest','InvalidUploadId','InvalidUploadSignature','InvalidMimeType','EntityTooLarge','NoSuchBucket','NoSuchKey','KeyAlreadyExists','ResourceAlreadyExists','InvalidMetadata','MissingParameter','InvalidParameter','TusError'];
        const code = parsed?.code ?? parsed?.error;
        const text = String(parsed?.message ?? parsed?.error_description ?? body).toLowerCase();
        providerShape = {
          status: response.status(), json: !!parsed,
          code: allowedCodes.includes(code) ? code : 'unrecognized',
          signature: /signature|signed|jwt|token/.test(text),
          auth: /authoriz|authentic|permission|access denied/.test(text),
          tusVersion: /tus-resumable|tus version|unsupported version/.test(text),
          missingHeader: /missing.*header|header.*required|header.*missing/.test(text),
          contentType: /content.type|mime/.test(text),
          metadata: /metadata/.test(text), bucket: /bucket/.test(text),
          objectPath: /object.name|object.path|file.path|invalid.key/.test(text),
          size: /upload.length|too.large|size|maximum/.test(text),
          upsert: /upsert|already.exists|duplicate/.test(text),
          emptyBody: /empty|body.*required|content.length/.test(text),
          unsupported: /not.supported|unsupported/.test(text),
        };
      }
      const headers = await response.allHeaders();
      const location = headers.location;
      if (!location) { locationShape = { present: false }; return; }
      const value = new URL(location, endpoint);
      const prefix = new URL(endpoint).pathname + '/';
      const suffix = value.pathname.startsWith(prefix) ? value.pathname.slice(prefix.length) : '';
      locationShape = {
        present: true, sameOrigin: value.origin === new URL(endpoint).origin,
        validPrefix: value.pathname.startsWith(prefix), hasQuery: !!value.search,
        hasHash: !!value.hash, hasCredentials: !!(value.username || value.password),
        hasPadding: suffix.includes('='), hasSlash: suffix.includes('/'),
        hasPercent: suffix.includes('%'), hasDot: suffix.includes('.'),
        currentIdPattern: /^[A-Za-z0-9_-]+$/.test(suffix),
      };
    } catch { locationShape = { inspectionFailed: true }; }
    })();
    responseInspections.push(inspection);
  });
  stage = 'signing';
  const signed = await admin.storage.from(bucket).createSignedUploadUrl(objectPath, { upsert: false });
  if (signed.error || !signed.data?.token) { captureSafeFailure(signed.error); throw Error('signing failed'); }
  signedToken = signed.data.token;
  stage = 'browser upload';
  const partial = process.env.FOUND_MEDIA_STORAGE_RESUME_CHECK === '1';
  let interrupted = false, acknowledgedOffset = null, resumeHead = false, resumedPatch = false, creationPosts = 0;
  const routeHandler = async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(endpoint).origin || !url.pathname.startsWith(new URL(endpoint).pathname)) { await route.continue(); return; }
    if (request.method() === 'POST') creationPosts++;
    if (partial && request.method() === 'PATCH') {
      const offset = Number(request.headers()['upload-offset']);
      if (!interrupted && offset === 6 * 1024 * 1024) {
        // This second PATCH cannot be issued until tus received the first PATCH acknowledgement.
        acknowledgedOffset = offset; interrupted = true;
        await page.evaluate(() => window.proofAbort?.abort());
        try { await route.abort(); } catch { /* Signal already canceled the intercepted request. */ }
        return;
      }
      if (interrupted && offset === 6 * 1024 * 1024) resumedPatch = true;
    }
    if (interrupted && request.method() === 'HEAD') resumeHead = true;
    await route.continue();
  };
  await page.route('**/*', routeHandler);
  const runUpload = async options => {
    let blob, resume;
    const progress = [];
    const controller = new AbortController(); window.proofAbort = controller;
    try {
      const bytes = new Uint8Array(8 * 1024 * 1024);
      for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31 + 17) & 255;
      blob = new Blob([bytes], { type: 'video/mp4' });
      await window.transport.uploadResumableMedia(blob, {
        ...options, signal: controller.signal,
        onProgress: (sent, total) => progress.push([sent, total]),
        onResumeInfo: info => { resume = info; },
      });
      return { ok: true, progressEvents: progress.length, advanced: progress.some(([sent]) => sent > 0), totalCorrect: progress.every(([, total]) => total === bytes.length), completed: progress.some(([sent]) => sent === bytes.length), resumeSeen: !!(resume || options.previousResumeInfo), credentialsStored: localStorage.length > 0 || sessionStorage.length > 0 };
    } catch (error) {
      const allowed = ['invalid_resume','invalid_destination','auth','conflict','expired','too_large','network','timeout','aborted','transport'];
      const status = Number(error?.status);
      return { ok: false, resumeInfo: resume, code: allowed.includes(error?.code) ? error.code : 'unknown', status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null };
    } finally {
      options.token = ''; options.apiKey = ''; blob = null; resume = null; window.proofAbort = null;
      localStorage.clear(); sessionStorage.clear();
    }
  };
  const uploadOptions = { endpoint, objectPath, bucket, token: signedToken, apiKey: config.apiKey, companyId, accountId, uploadId };
  let result = await page.evaluate(runUpload, uploadOptions);
  uploadOptions.token = '';
  if (partial) {
    stage = 'partial interruption';
    assert.equal(result.ok, false); assert.equal(result.code, 'aborted');
    assert.equal(acknowledgedOffset, 6 * 1024 * 1024);
    assert(result.resumeInfo);
    // Round trip the credential-free record exactly as a persistent queue would.
    const previousResumeInfo = JSON.parse(JSON.stringify(result.resumeInfo));
    assert(!JSON.stringify(previousResumeInfo).includes(signedToken));
    stage = 'fresh resume signing';
    const fresh = await admin.storage.from(bucket).createSignedUploadUrl(objectPath, { upsert: false });
    if (fresh.error || !fresh.data?.token) { captureSafeFailure(fresh.error); throw Error('resume signing failed'); }
    signedToken = fresh.data.token;
    stage = 'browser partial resume';
    result = await page.evaluate(runUpload, { ...uploadOptions, token: signedToken, previousResumeInfo });
    assert(resumeHead && resumedPatch); assert.equal(creationPosts, 1);
  }
  await page.unroute('**/*', routeHandler);
  signedToken = undefined;
  await Promise.all(responseInspections);
  if (!result.ok) captureSafeFailure(result);
  assert.equal(result.ok, true, `safe transport code: ${result.code || 'none'}`);
  assert(result.progressEvents > 0 && result.advanced && result.totalCorrect && result.completed && result.resumeSeen);
  assert.equal(result.credentialsStored, false);
  await context.close(); // Discard browser execution contexts and network credential memory.
  stage = 'download verification';
  const download = await admin.storage.from(bucket).download(objectPath);
  if (download.error || !download.data) { captureSafeFailure(download.error); throw Error('download failed'); }
  const actual = Buffer.from(await download.data.arrayBuffer());
  assert.equal(actual.length, bytes.length);
  assert.equal(createHash('sha256').update(actual).digest('hex'), expectedHash);
} catch {
  // Never print SDK/browser errors, request URLs, headers, tokens, or credentials.
  failed = true;
  console.error(`FAIL isolated storage proof at ${stage}; code=${failureCode} status=${failureStatus ?? 'none'}; provider details suppressed.`);
} finally {
  signedToken = undefined;
  try { await browser?.close(); } catch { failed = true; }
  if (admin && objectPath && bucket) {
    try {
      const removed = await admin.storage.from(bucket).remove([objectPath]);
      if (removed.error) throw Error('cleanup failed');
      // Storage metadata avoids CDN/browser caches of the downloaded object.
      // Read only this check's random company directory, never a customer folder.
      const separator = objectPath.lastIndexOf('/');
      const folder = objectPath.slice(0, separator), filename = objectPath.slice(separator + 1);
      const check = await admin.storage.from(bucket).list(folder, { search: filename, limit: 100, offset: 0 });
      if (check.error || !Array.isArray(check.data) || check.data.length >= 100 || check.data.some(entry => entry.name === filename)) throw Error('cleanup unconfirmed');
    } catch {
      cleanupFailed = true;
      console.error('FAIL exact synthetic object cleanup could not be confirmed.');
      // Random IDs only; sufficient to clean manually without revealing credentials.
      console.error(`Cleanup target bucket=${bucket} path=${objectPath}`);
    }
  }
  await Promise.all(responseInspections);
  if (failed && providerShape) console.error('Safe provider shape: ' + JSON.stringify(providerShape));
  if (failed && locationShape) console.error('Safe Location shape: ' + JSON.stringify(locationShape));
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  admin = undefined;
}
if (failed || cleanupFailed) process.exitCode = 1;
else console.log('PASS isolated browser-to-storage upload (partial resume when opted in): 8 MiB, real CORS/progress, size/SHA-256 verified, exact object cleanup confirmed.');









