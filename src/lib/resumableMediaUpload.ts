import { Upload } from 'tus-js-client';

export type ResumableMediaUploadErrorCode = 'invalid_resume' | 'invalid_destination' | 'auth' | 'conflict' | 'expired' | 'too_large' | 'network' | 'timeout' | 'aborted' | 'transport';
export class ResumableMediaUploadError extends Error {
  constructor(public readonly code: ResumableMediaUploadErrorCode, public readonly status: number | null = null) {
    super('Media upload could not finish.');
    this.name = 'ResumableMediaUploadError';
  }
  get retryable(): boolean { return ['expired', 'invalid_resume'].includes(this.code) || ['network', 'timeout', 'transport'].includes(this.code) && (this.status === null || this.status === 408 || this.status === 429 || this.status >= 500); }
}
export interface ResumableMediaResumeInfo {
  version: 1;
  url: string;
  createdAt: number;
  endpoint: string;
  objectPath: string;
  bucket: string;
  uploadId: string;
  accountId: string;
  companyId: string;
  fileSize: number;
  contentType: string;
}
export interface ResumableMediaUploadOptions {
  endpoint: string;
  objectPath: string;
  bucket: string;
  token: string;
  apiKey?: string;
  uploadId: string;
  accountId: string;
  companyId: string;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  onResumeInfo?: (info: ResumableMediaResumeInfo) => void | Promise<void>;
  previousResumeInfo?: ResumableMediaResumeInfo | null;
  signal?: AbortSignal;
}
const MAX_AGE = 23 * 60 * 60 * 1000;
const MAX_LIFETIME = 10 * 60 * 1000;
const REQUEST_DEADLINE = 180 * 1000;
function destination(value: string, endpoint?: URL): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new ResumableMediaUploadError('invalid_destination'); }
  const local = process.env.NODE_ENV === 'test' && url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if ((!local && (url.protocol !== 'https:' || !/^[a-z0-9-]+\.storage\.supabase\.co$/.test(url.hostname))) || url.username || url.password || url.search || url.hash || (!local && url.port)) throw new ResumableMediaUploadError('invalid_destination');
  if (endpoint) {
    const prefix = endpoint.pathname.replace(/\/$/, '') + '/';
    if (url.origin !== endpoint.origin || !url.pathname.startsWith(prefix) || !/^[A-Za-z0-9_-]+$/.test(url.pathname.slice(prefix.length))) throw new ResumableMediaUploadError('invalid_destination');
  } else if (url.pathname !== '/storage/v1/upload/resumable/sign' && url.pathname !== '/storage/v1/upload/resumable/sign/') throw new ResumableMediaUploadError('invalid_destination');
  return url;
}
/** No automatic URL storage, credentials persistence, retries, or database mutation. */
export async function uploadResumableMedia(file: Blob, options: ResumableMediaUploadOptions): Promise<void> {
  const o = options;
  if (o.signal?.aborted) throw new ResumableMediaUploadError('aborted');
  const endpoint = destination(o.endpoint);
  if (![o.objectPath, o.bucket, o.token, o.uploadId, o.accountId, o.companyId].every(v => typeof v === 'string' && v.length > 0)) throw new ResumableMediaUploadError('invalid_destination');
  const scope = { endpoint: endpoint.href, objectPath: o.objectPath, bucket: o.bucket, uploadId: o.uploadId, accountId: o.accountId, companyId: o.companyId, fileSize: file.size, contentType: file.type || 'application/octet-stream' };
  const previous = o.previousResumeInfo;
  if (previous) {
    if (previous.version !== 1 || !Number.isFinite(previous.createdAt) || previous.createdAt > Date.now() || Date.now() - previous.createdAt >= MAX_AGE || Object.entries(scope).some(([key, value]) => previous[key as keyof ResumableMediaResumeInfo] !== value)) throw new ResumableMediaUploadError('invalid_resume');
    destination(previous.url, endpoint);
  }
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    let info = previous || null;
    let upload: Upload;
    let lastSent = 0;
    const refreshRequestDeadline = () => {
      clearTimeout(requestTimer);
      requestTimer = setTimeout(() => fail(new ResumableMediaUploadError('timeout')), REQUEST_DEADLINE);
    };
    const clean = () => { clearTimeout(requestTimer); clearTimeout(lifetime); o.signal?.removeEventListener('abort', abort); };
    const fail = (error: ResumableMediaUploadError) => {
      if (settled) return;
      settled = true; clean();
      // Never terminate the server resource: the queue may resume it later.
      void upload?.abort(false).catch(() => undefined);
      reject(error);
    };
    const abort = () => fail(new ResumableMediaUploadError('aborted'));
    const lifetime = setTimeout(() => fail(new ResumableMediaUploadError('timeout')), MAX_LIFETIME);
    o.signal?.addEventListener('abort', abort, { once: true });
    const saveInfo = async () => {
      if (settled || !upload.url || info) return;
      destination(upload.url, endpoint);
      info = { version: 1, ...scope, url: upload.url, createdAt: Date.now() };
      await o.onResumeInfo?.(info);
    };
    upload = new Upload(file, {
      // A resume HEAD failure must return to the queue, never create implicitly.
      endpoint: previous ? undefined : endpoint.href,
      uploadUrl: previous?.url,
      headers: { 'x-signature': o.token, ...(o.apiKey ? { apikey: o.apiKey } : {}) },
      metadata: { bucketName: o.bucket, objectName: o.objectPath, contentType: scope.contentType, cacheControl: '3600' },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: null,
      storeFingerprintForResuming: false,
      removeFingerprintOnSuccess: false,
      uploadDataDuringCreation: false,
      onBeforeRequest: async request => {
        if (settled || o.signal?.aborted) throw new ResumableMediaUploadError('aborted');
        try {
        const url = request.getURL();
        if (request.getMethod() === 'POST') {
          if (url !== endpoint.href) throw new ResumableMediaUploadError('invalid_destination');
        } else destination(url, endpoint);
        } catch (error) { fail(error instanceof ResumableMediaUploadError ? error : new ResumableMediaUploadError('invalid_destination')); throw error; }
        try { await saveInfo(); } catch (error) { fail(error instanceof ResumableMediaUploadError ? error : new ResumableMediaUploadError('transport')); throw new ResumableMediaUploadError('transport'); }
        if (settled || o.signal?.aborted) throw new ResumableMediaUploadError('aborted');
        refreshRequestDeadline();
      },
      onAfterResponse: async () => { clearTimeout(requestTimer); },
      onProgress: (sent, total) => {
        if (settled || o.signal?.aborted) return;
        if (sent > lastSent) { lastSent = sent; refreshRequestDeadline(); }
        try { o.onProgress?.(sent, total); } catch { fail(new ResumableMediaUploadError('transport')); }
      },
      onError: error => {
        const status = ('originalResponse' in error ? error.originalResponse?.getStatus() : null) || null;
        const code = status === 401 || status === 403 ? 'auth' : status === 409 ? 'conflict' : status === 404 || status === 410 ? 'expired' : status === 413 ? 'too_large' : status === null ? 'network' : 'transport';
        fail(new ResumableMediaUploadError(code, status));
      },
      onSuccess: async () => {
        if (settled) return;
        try { await saveInfo(); } catch { fail(new ResumableMediaUploadError('transport')); return; }
        if (settled) return;
        settled = true; clean(); resolve();
      },
    });
    if (o.signal?.aborted) { abort(); return; }
    try { upload.start(); } catch { fail(new ResumableMediaUploadError('transport')); }
  });
}





