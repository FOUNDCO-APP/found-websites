import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

// Real Chromium media APIs with synthetic devices only. No app/account/profile,
// physical camera, storage service or external request is used. iPhone unqualified.
// node tests/camera-recording-browser.mjs
// Optional: FOUND_PLAYWRIGHT_MODULE and FOUND_BROWSER_EXECUTABLE.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
const helper = ts.transpileModule(fs.readFileSync(new URL('../src/lib/cameraRecordingProfile.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
let browser
let stage = 'launch'
const deadline = setTimeout(() => { console.error('FAIL camera recording browser: deadline exceeded'); process.exit(1) }, 45000)
try {
  browser = await chromium.launch({ headless: true, timeout: 15000,
    ...(process.env.FOUND_BROWSER_EXECUTABLE ? { executablePath: process.env.FOUND_BROWSER_EXECUTABLE } : {}),
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--disable-background-networking', '--disable-component-update', '--no-first-run'],
  })
  const context = await browser.newContext({ serviceWorkers: 'block' })
  stage = 'fixture'
  // Serve an inert secure-origin fixture entirely through interception: no HTTP
  // server, DNS lookup or external page is needed. Reject every other request.
  const origin = 'https://camera-fixture.invalid/'
  let blockedRequests = 0
  await context.route('**/*', route => route.request().url() === origin
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Synthetic recording fixture</title>' })
    : (blockedRequests++, route.abort()))
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  await page.goto(origin)
  await page.addScriptTag({ content: `{const module={exports:{}};const exports=module.exports;${helper}\nwindow.cameraProfile=module.exports;}` })
  stage = 'media'
  const metrics = await page.evaluate(async () => {
    const { createCameraProfileGuard, cameraProfileConstraints, createProfiledRecorder, recordingMime, recordingMeasurement } = window.cameraProfile
    const check = (condition, message) => { if (!condition) throw Error(message) }
    const bounded = (promise, message, ms = 8000) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error(message)), ms)
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
    })
    const event = (target, name) => bounded(new Promise((resolve, reject) => {
      target.addEventListener(name, resolve, { once: true })
      target.addEventListener('error', () => reject(Error(`${name} media error`)), { once: true })
    }), `${name} timeout`)
    let stream, recorder, objectUrl
    const playback = document.createElement('video')
    playback.muted = true; playback.playsInline = true
    document.body.append(playback)
    try {
      stream = await bounded(navigator.mediaDevices.getUserMedia({ video: cameraProfileConstraints('photo'), audio: true }), 'synthetic acquisition timeout')
      const track = stream.getVideoTracks()[0]
      check(stream.getAudioTracks().length === 1, 'synthetic audio missing')
      const guard = createCameraProfileGuard()
      const applied = await bounded(guard.request(track, 'video', true, () => true), 'video constraints timeout')
      check(applied.status === 'applied' && applied.isCurrent(), 'video profile not applied')
      recorder = createProfiledRecorder(stream)
      const initial = recordingMeasurement(recorder, track)
      const chunks = []
      recorder.addEventListener('dataavailable', e => { if (e.data.size) chunks.push(e.data) })
      const stopped = event(recorder, 'stop')
      recorder.start(250)
      await new Promise(resolve => setTimeout(resolve, 2100))
      recorder.stop()
      await stopped // final dataavailable precedes stop; include every chunk.
      const mime = recordingMime(recorder, chunks)
      check(!!mime && chunks.length > 0, 'missing actual MIME or chunks')
      const blob = new Blob(chunks, { type: mime })
      check(blob.size > 0, 'empty recording')
      const measurement = recordingMeasurement(recorder, track, blob)
      check(initial.track.width > 0 && initial.track.height > 0, 'missing real track dimensions')
      objectUrl = URL.createObjectURL(blob)
      const loaded = event(playback, 'loadeddata')
      playback.src = objectUrl; playback.load()
      await loaded
      // Seek near the end of this ~2s clip and decode a late frame. WebM may
      // report Infinity duration, so do not require finite duration metadata.
      const seeked = event(playback, 'seeked')
      playback.currentTime = 1.7
      await seeked
      check(playback.currentTime >= 1.5 && playback.readyState >= 2, 'late frame unavailable')
      check(playback.videoWidth > 0 && playback.videoHeight > 0, 'undecodable recording')
      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32
      const drawing = canvas.getContext('2d')
      drawing.drawImage(playback, 0, 0, 32, 32)
      const pixels = drawing.getImageData(0, 0, 32, 32).data
      let nonBlack = false
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 30) { nonBlack = true; break }
      check(nonBlack, 'late frame unreadable/black')
      const restored = await bounded(guard.request(track, 'photo', false, () => true), 'photo restoration timeout')
      check(restored.status === 'applied' && restored.isCurrent(), 'photo profile restoration failed')
      const requested = track.getConstraints()
      // Chromium normalizes lone ideal values to numbers in getConstraints().
      const ideal = value => typeof value === 'number' ? value : value?.ideal
      check(ideal(requested.width) === 4096 && ideal(requested.height) === 3072, 'photo detail ideals not restored')
      check(requested.frameRate === undefined && requested.aspectRatio === undefined, 'video constraints leaked into photo mode')
      const still = recordingMeasurement(recorder, track).track
      check(still.width > 0 && still.height > 0, 'restored track unavailable')
      // Explicit whitelist only. Never return settings wholesale, IDs or pixels.
      return { recorderMime: measurement.recorderMime, blobMime: measurement.blobMime,
        width: measurement.track.width, height: measurement.track.height, frameRate: measurement.track.frameRate,
        videoBitsPerSecond: measurement.videoBitsPerSecond, audioBitsPerSecond: measurement.audioBitsPerSecond,
        blobBytes: measurement.blobBytes, playbackWidth: playback.videoWidth, playbackHeight: playback.videoHeight,
        finalFrameReadable: true, restoredWidth: still.width, restoredHeight: still.height }
    } finally {
      if (recorder?.state === 'recording') recorder.stop()
      stream?.getTracks().forEach(track => track.stop())
      playback.removeAttribute('src'); playback.load(); playback.remove()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  })
  assert.equal(blockedRequests, 0, 'fixture unexpectedly attempted another request')
  assert.ok(metrics.blobBytes > 0 && metrics.finalFrameReadable)
  console.log('PASS real Chromium synthetic recording/profile/playback/photo restoration (not iPhone qualification)')
  console.log(JSON.stringify(metrics))
} catch (error) {
  // Do not dump browser errors, settings, executable paths or device metadata.
  const safeReasons = ['synthetic acquisition timeout', 'video constraints timeout', 'photo restoration timeout', 'loadeddata timeout', 'seeked timeout', 'stop timeout', 'synthetic audio missing', 'video profile not applied', 'missing actual MIME or chunks', 'empty recording', 'missing real track dimensions', 'late frame unavailable', 'undecodable recording', 'late frame unreadable/black', 'photo profile restoration failed', 'photo detail ideals not restored', 'video constraints leaked into photo mode', 'restored track unavailable']
  const reason = safeReasons.find(value => error?.message?.includes(value)) ?? 'browser or media API failure'
  console.error(`FAIL camera recording browser: ${stage}: ${reason}`)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  clearTimeout(deadline)
}
