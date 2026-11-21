import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
import vm from 'node:vm';
process.env.NODE_ENV = 'test';
const require = createRequire(import.meta.url);
const filename = path.resolve('src/lib/resumableMediaUpload.ts');
const mod = new Module(filename);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { uploadResumableMedia: upload, ResumableMediaUploadError } = mod.exports;
// Node's official tus adapter consumes Buffers; production browser adapter consumes Blobs.
const file = Buffer.alloc(6 * 1024 * 1024 + 123, 42);
file.size = file.length; file.type = 'video/mp4';
let offset = 0, posts = 0, failPatch = false, status = 0, foreign = false, lost = false;
const calls = [];
const server = http.createServer(async (req, res) => {
  const body = []; for await (const part of req) body.push(part);
  const length = Buffer.concat(body).length;
  calls.push({ method: req.method, offset: req.headers['upload-offset'], length });
  assert.equal(req.headers['x-signature'], 'test-secret');
  assert.equal(req.headers['x-upsert'], undefined);
  assert.equal(req.headers.apikey, 'sb_publishable_test');
  res.setHeader('Tus-Resumable', '1.0.0');
  if (status) { res.writeHead(status); res.end('sensitive provider text'); return; }
  if (req.method === 'POST') {
    posts++; offset = 0;
    res.setHeader('Location', foreign ? 'http://example.com/storage/v1/upload/resumable/sign/evil' : '/storage/v1/upload/resumable/sign/resource');
    res.writeHead(201); res.end(); return;
  }
  if (req.method === 'HEAD') { res.setHeader('Upload-Offset', offset); res.setHeader('Upload-Length', file.length); res.writeHead(200); res.end(); return; }
  if (req.method === 'PATCH') {
    assert.equal(Number(req.headers['upload-offset']), offset);
    if (failPatch && offset > 0) { res.writeHead(503); res.end(); return; }
    offset += length;
    if (lost && offset === file.length) { req.socket.destroy(); return; }
    res.setHeader('Upload-Offset', offset); res.writeHead(204); res.end(); return;
  }
  res.writeHead(405); res.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const endpoint = `http://127.0.0.1:${server.address().port}/storage/v1/upload/resumable/sign`;
const base = { endpoint, bucket: 'media', objectPath: 'company/clip.mp4', token: 'test-secret', apiKey: 'sb_publishable_test', uploadId: 'upload', accountId: 'account', companyId: 'company' };
const expect = async (work, code) => assert.rejects(work, e => e instanceof ResumableMediaUploadError && e.code === code && !e.message.includes('secret') && !e.message.includes('sensitive'));
try {
  let info; const progress = [];
  failPatch = true;
  await expect(upload(file, { ...base, onResumeInfo: value => { info = value; }, onProgress: (...v) => progress.push(v) }), 'transport');
  assert.equal(posts, 1); assert.equal(offset, 6 * 1024 * 1024);
  assert.equal(calls.filter(c => c.method === 'PATCH').length, 2, 'no internal retries');
  assert(!JSON.stringify(info).includes('test-secret'));
  assert(!JSON.stringify(info).includes('sb_publishable_test'));
  failPatch = false;
  await upload(file, { ...base, previousResumeInfo: info });
  assert.equal(posts, 1); assert.equal(offset, file.length);
  assert(calls.some(c => c.method === 'HEAD'));
  assert(calls.some(c => c.method === 'PATCH' && Number(c.offset) === 6 * 1024 * 1024 && c.length === 123));
  const before = calls.length;
  for (const change of [{ accountId: 'other' }, { companyId: 'other' }, { uploadId: 'other' }, { objectPath: 'other' }, { bucket: 'other' }, { fileSize: 1 }, { createdAt: Date.now() - 24 * 3600000 }, { createdAt: Date.now() + 60000 }]) {
    await expect(upload(file, { ...base, previousResumeInfo: { ...info, ...change } }), 'invalid_resume');
  }
  await expect(upload(file, { ...base, previousResumeInfo: { ...info, url: 'https://evil.example/storage/v1/upload/resumable/sign/resource' } }), 'invalid_destination');
  assert.equal(calls.length, before);
  for (const badEndpoint of [endpoint.replace('/sign', ''), endpoint + '/other', endpoint + '?token=secret', endpoint + '#fragment']) {
    await expect(upload(file, { ...base, endpoint: badEndpoint }), 'invalid_destination');
  }
  await expect(upload(file, { ...base, previousResumeInfo: { ...info, url: info.url.replace('/sign/', '/') } }), 'invalid_destination');
  foreign = true; await expect(upload(file, base), 'invalid_destination'); foreign = false;
  for (const [value, code] of [[401, 'auth'], [403, 'auth'], [409, 'conflict'], [410, 'expired'], [413, 'too_large'], [503, 'transport']]) {
    status = value; const start = calls.length;
    await expect(upload(file, base), code); assert.equal(calls.length, start + 1);
  }
  for (const [value, code] of [[401, 'auth'], [403, 'auth'], [404, 'expired'], [410, 'expired'], [503, 'transport']]) {
    status = value;
    const start = calls.length, previousPosts = posts;
    await expect(upload(file, { ...base, previousResumeInfo: info }), code);
    assert.equal(calls.length, start + 1, 'failed HEAD cannot create a hidden replacement session');
    assert.equal(calls.at(-1).method, 'HEAD'); assert.equal(posts, previousPosts);
  }
  status = 0;
  const controller = new AbortController();
  await expect(upload(file, { ...base, signal: controller.signal, onResumeInfo: () => controller.abort() }), 'aborted');
  const patchCount = calls.filter(c => c.method === 'PATCH').length;
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(calls.filter(c => c.method === 'PATCH').length, patchCount);
  lost = true; info = undefined;
  await expect(upload(file, { ...base, onResumeInfo: value => { info = value; } }), 'network');
  lost = false; const previousPosts = posts;
  await upload(file, { ...base, previousResumeInfo: info });
  assert.equal(posts, previousPosts); assert.equal(offset, file.length);
  assert(progress.length > 0);
  process.env.NODE_ENV = 'production';
  await expect(upload(file, base), 'invalid_destination');
  process.env.NODE_ENV = 'test';
  // Deterministic deadline check, separate from the real HTTP protocol cases.
  {
    let fakeUpload, tick = 0;
    const timers = new Map();
    class FakeUpload {
      constructor(_file, options) { this.options = options; fakeUpload = this; }
      start() { void this.options.onBeforeRequest({ getURL: () => base.endpoint, getMethod: () => 'POST' }); }
      async abort() {}
    }
    const sandbox = { exports: {}, require: () => ({ Upload: FakeUpload }), process: { env: { NODE_ENV: 'test' } }, URL, Date, Error, Promise,
      setTimeout: (callback, delay) => { const id = ++tick; timers.set(id, { callback, delay }); return id; }, clearTimeout: id => timers.delete(id) };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, sandbox);
    const pending = sandbox.exports.uploadResumableMedia(file, base);
    await Promise.resolve();
    const deadline = () => [...timers.entries()].find(([, v]) => v.delay === 180000)?.[0];
    const original = deadline(); assert(original);
    fakeUpload.options.onProgress(0, file.size); assert.equal(deadline(), original);
    fakeUpload.options.onProgress(100, file.size); const refreshed = deadline(); assert.notEqual(refreshed, original);
    fakeUpload.options.onProgress(100, file.size); assert.equal(deadline(), refreshed);
    fakeUpload.options.onProgress(200, file.size); assert.notEqual(deadline(), refreshed);
    const overall = [...timers.values()].find(v => v.delay === 600000);
    assert(overall); overall.callback();
    await assert.rejects(pending, error => error.code === 'timeout');
    assert.equal(timers.size, 0);
  }
  console.log('PASS real HTTP TUS: chunks, HEAD offsets, interruption/resume, lost final response, auth/failures, foreign destinations, scope/age, abort, no retries, token redaction');
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }






