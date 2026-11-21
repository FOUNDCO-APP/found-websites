import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const module = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/cameraRecordingProfile.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports })
const { cameraProfileConstraints: constraints, createProfiledRecorder, recordingMime, recordingMeasurement, createCameraProfileGuard } = module.exports
const plain = value => JSON.parse(JSON.stringify(value))
assert.deepEqual(plain(constraints('photo', true)), { width: { ideal: 4096 }, height: { ideal: 3072 } })
const caps = { width: { min: 1, max: 4096 }, height: { min: 1, max: 3072 }, aspectRatio: { min: .5, max: 2 } }
assert.equal(constraints('video', true, caps).aspectRatio.ideal, 9 / 16)
assert.equal(constraints('video', false, caps).width.ideal, 1920)
assert.equal(constraints('video', true).height.ideal, 1080)
assert.equal(constraints('video', true, { ...caps, height: { max: 1080 } }).aspectRatio.ideal, 16 / 9)
assert.equal(constraints('video', true, { ...caps, aspectRatio: { min: 1 } }).width.ideal, 1920)
assert.equal(constraints('video').frameRate.ideal, 30)
assert.ok(!JSON.stringify(constraints('video')).match(/exact|min|max/))

const attempts = []
class Recorder {
  static isTypeSupported(mime) { return mime === 'video/mp4' || mime === 'video/webm' }
  constructor(stream, options) {
    attempts.push(options)
    if (options.videoBitsPerSecond) throw Error('bitrate unsupported')
    if (options.mimeType === 'video/mp4') throw Error('codec unavailable')
    this.mimeType = 'video/webm;codecs=vp8,opus'
    this.videoBitsPerSecond = 4100000
    this.audioBitsPerSecond = 96000
  }
}
const recorder = createProfiledRecorder({}, Recorder)
assert.equal(attempts[0].videoBitsPerSecond, 5000000)
assert.equal(attempts[0].audioBitsPerSecond, 128000)
assert.equal(attempts.length, 4)
assert.equal(recordingMime(recorder, []), 'video/webm;codecs=vp8,opus')
assert.equal(recordingMime({ mimeType: '' }, [new Blob(['abc'], { type: 'video/mp4' })]), 'video/mp4')
assert.equal(recordingMime({ mimeType: 'secret/device' }, []), '')
class DefaultRecorder {
  static isTypeSupported() { throw Error('unsupported API') }
  constructor(stream, options) { assert.equal(options.mimeType, undefined); this.mimeType = 'video/mp4' }
}
assert.equal(createProfiledRecorder({}, DefaultRecorder).mimeType, 'video/mp4')
class BrokenRecorder extends DefaultRecorder { constructor() { super({}, {}); throw Error('unavailable') } }
assert.throws(() => createProfiledRecorder({}, BrokenRecorder), /unavailable/)
const blob = new Blob(['abc'], { type: recordingMime(recorder, []) })
const measured = recordingMeasurement(recorder, { getSettings: () => ({ ...{ width: 1080, height: 1920, frameRate: 29.97, aspectRatio: 9 / 16 }, deviceId: 'PRIVATE', groupId: 'PRIVATE' }) }, blob)
assert.equal(measured.blobBytes, 3)
assert.equal(measured.videoBitsPerSecond, 4100000)
assert.equal(measured.track.frameRate, 29.97)
assert.ok(!JSON.stringify(measured).includes('PRIVATE'))
assert.equal(recordingMeasurement({ mimeType: 'secret', videoBitsPerSecond: NaN }, { getSettings() { throw Error('secret') } }).track.width, null)

const guard = createCameraProfileGuard()
let release
const applied = []
const track = { readyState: 'live', getCapabilities: () => caps, applyConstraints(value) { applied.push(value); return applied.length === 1 ? new Promise(resolve => { release = resolve }) : Promise.resolve() } }
const first = guard.request(track, 'video', true, () => true)
await Promise.resolve()
const latest = guard.request(track, 'photo', false, () => true)
assert.equal(applied.length, 1)
release()
assert.equal((await first).status, 'stale')
assert.equal((await latest).status, 'applied')
assert.equal(applied[1].width.ideal, 4096)
const closed = guard.request(track, 'video', false, () => true)
guard.invalidate()
assert.equal((await closed).status, 'stale')
assert.equal(applied.length, 2)
const accepted = await guard.request(track, 'photo', false, () => true)
guard.invalidate()
assert.equal(accepted.isCurrent(), false)
assert.equal((await guard.request({ ...track, applyConstraints: async () => { throw Error('unsupported') } }, 'video', false, () => true)).status, 'fallback')
assert.equal((await guard.request({ ...track, readyState: 'ended' }, 'video', false, () => true)).status, 'stale')
assert.equal((await guard.request(track, 'video', false, () => false)).status, 'stale')

// Execute the current CameraSheet acquisition block, rather than a copy of it.
// This release preserves audio-at-open, including photo mode, with silent fallback.
const cameraSource = fs.readFileSync('src/components/dashboard/CameraSheet.tsx', 'utf8')
const acquisitionStart = cameraSource.indexOf('      const videoConstraints =')
const acquisitionEnd = cameraSource.indexOf('      streamRef.current = stream', acquisitionStart)
assert.ok(acquisitionStart >= 0 && acquisitionEnd > acquisitionStart, 'CameraSheet acquisition block remains inspectable')
const acquisition = cameraSource.slice(acquisitionStart, acquisitionEnd)
async function openCamera({ failAudio = false, failVideo = false, alive = true } = {}) {
  const calls = [], errors = []
  let stops = 0
  const stream = { getTracks: () => [{ stop() { stops++ } }] }
  const scope = { facing: 'environment', alive, DOMException, setError: value => errors.push(value), blockedCameraMessage: () => 'blocked',
    navigator: { mediaDevices: { async getUserMedia(options) {
      calls.push(options)
      if (options.audio ? failAudio : failVideo) throw new DOMException('denied', 'NotAllowedError')
      return stream
    } } } }
  const run = vm.runInNewContext(ts.transpileModule(`(async () => { ${acquisition}\nreturn stream })()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, scope)
  return { result: await run, stream, calls, errors, stops }
}
const audioOpen = await openCamera()
assert.equal(audioOpen.calls.length, 1)
assert.equal(audioOpen.calls[0].audio, true, 'microphone requested on initial photo open')
assert.equal(audioOpen.result, audioOpen.stream)
const silentOpen = await openCamera({ failAudio: true })
assert.deepEqual(silentOpen.calls.map(call => call.audio), [true, false])
assert.equal(silentOpen.calls[1].video.width.ideal, 4096)
assert.equal(silentOpen.calls[1].video.height.ideal, 3072)
assert.equal(silentOpen.result, silentOpen.stream)
assert.equal(silentOpen.errors.length, 0)
const deniedOpen = await openCamera({ failAudio: true, failVideo: true })
assert.equal(deniedOpen.result, undefined)
assert.deepEqual(deniedOpen.errors, ['blocked'])
const closedOpen = await openCamera({ failAudio: true, alive: false })
assert.equal(closedOpen.result, undefined)
assert.equal(closedOpen.stops, 1, 'late acquisition is stopped after close')

// Recorder gets the already-acquired stream even when it has no audio track.
// It must neither reacquire a microphone nor add/remove/stop stream tracks.
const silentStream = new Proxy({ getAudioTracks: () => [] }, {
  get(target, key) { assert.equal(key, 'getAudioTracks'); return target[key] },
})
class SilentRecorder extends DefaultRecorder {
  constructor(stream, options) { super(stream, options); assert.equal(stream, silentStream); assert.equal(stream.getAudioTracks().length, 0) }
}
createProfiledRecorder(silentStream, SilentRecorder)
const helperSource = fs.readFileSync('src/lib/cameraRecordingProfile.ts', 'utf8')
assert.ok(!/getUserMedia|navigator\.|fetch\(|console\.|localStorage|sessionStorage/.test(helperSource), 'helper performs no acquisition, logging or persistence')

// Advanced controls share the same queue/profile and cannot authorize stale work.
const advancedGuard = createCameraProfileGuard()
const advancedCalls = []
let finishAdvanced
const advancedTrack = { ...track, applyConstraints(value) {
  advancedCalls.push(plain(value))
  return advancedCalls.length === 1 ? new Promise(resolve => { finishAdvanced = resolve }) : Promise.resolve()
} }
const zoomRequest = advancedGuard.request(advancedTrack, 'video', true, () => true, { zoom: 2, torch: false })
await Promise.resolve()
assert.deepEqual(advancedCalls[0].advanced, [{ zoom: 2, torch: false }])
assert.equal(advancedCalls[0].height.ideal, 1920)
const torchRequest = advancedGuard.request(advancedTrack, 'photo', false, () => true, { torch: true })
assert.equal(advancedCalls.length, 1, 'advanced changes are serialized')
finishAdvanced()
assert.equal((await zoomRequest).status, 'stale')
assert.equal((await torchRequest).status, 'applied')
assert.equal(advancedCalls[1].width.ideal, 4096)
assert.deepEqual(advancedCalls[1].advanced, [{ torch: true }])
const cancelledAdvanced = advancedGuard.request(advancedTrack, 'video', false, () => true, { zoom: 3 })
advancedGuard.invalidate()
assert.equal((await cancelledAdvanced).status, 'stale')
assert.equal(advancedCalls.length, 2)
assert.equal((await advancedGuard.request({ ...advancedTrack, applyConstraints: async () => { throw Error('unsupported advanced') } }, 'video', false, () => true, { torch: true })).status, 'fallback')

// Run actual component functions with local browser boundaries. This covers the
// component-to-retainCapture handoff; IndexedDB durability is a separate suite.
const cameraAst = ts.createSourceFile('CameraSheet.tsx', cameraSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function extractFunction(name) {
  const found = []
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found.push(node.getText(cameraAst))
    ts.forEachChild(node, visit)
  }
  visit(cameraAst)
  assert.equal(found.length, 1, `one actual ${name}`)
  return found[0]
}
function recordingHarness({ mime = 'video/webm', retentionThrows = false, startThrows = false } = {}) {
  const retained = [], notices = []
  let running = false, timer = false, settingsReads = 0
  const liveTrack = { getSettings() {
    settingsReads++
    assert.equal(mr.state, 'inactive', 'measurement precedes recorder start')
    return { width: 1080, height: 1920, frameRate: 30, deviceId: 'PRIVATE' }
  } }
  const mr = { mimeType: mime, videoBitsPerSecond: 5000000, audioBitsPerSecond: 128000, state: 'inactive',
    start(timeslice) { assert.equal(timeslice, 250); if (startThrows) throw Error('start failed'); this.state = 'recording' },
    stop() { this.state = 'inactive' },
  }
  const scope = {
    Blob, crypto: { randomUUID: () => 'fixture-uuid' },
    profileAvailable: { current: true }, encoding: { current: 0 }, mounted: { current: true },
    streamRef: { current: { getVideoTracks: () => [liveTrack] } }, recorderRef: { current: null },
    chunksRef: { current: [] }, timerRef: { current: null }, recordingDetails: { current: null },
    createProfiledRecorder: () => mr, recordingMime, recordingMeasurement,
    retainCapture(blob, fileName) { if (retentionThrows) throw Error('retention failed'); retained.push({ blob, fileName }) },
    setRecording(value) { running = value }, setRecSecs() {},
    setCloseNotice(value) { notices.push(value) },
    setInterval() { timer = true; return 1 }, clearInterval() { timer = false },
  }
  vm.createContext(scope)
  vm.runInContext(ts.transpileModule(['startRecording', 'stopRecording', 'uploadVideo'].map(extractFunction).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, scope)
  return { scope, mr, retained, notices, start: () => scope.startRecording(), stop: () => scope.stopRecording(),
    snapshot: () => ({ running, timer, settingsReads }),
    chunk: (value, type = mime) => mr.ondataavailable({ data: new Blob([value], { type }) }),
    finalize() { mr.state = 'inactive'; mr.onstop() },
  }
}
for (const mime of ['video/webm;codecs=vp8,opus', 'video/mp4', '']) {
  const h = recordingHarness({ mime })
  h.start()
  assert.equal(h.snapshot().settingsReads, 1)
  assert.equal(h.scope.recordingDetails.current.track.height, 1920)
  h.chunk('first-')
  h.stop()
  assert.equal(h.scope.encoding.current, 1)
  h.start()
  h.chunk('final') // final dataavailable arrives after stop(), before onstop.
  h.finalize()
  assert.equal(h.retained.length, 1)
  assert.equal(await h.retained[0].blob.text(), 'first-final')
  assert.equal(h.retained[0].blob.type, mime)
  assert.equal(h.retained[0].fileName, `video-fixture-uuid.${mime.includes('mp4') ? 'mp4' : mime ? 'webm' : 'bin'}`)
  assert.equal(h.scope.encoding.current, 0)
  assert.deepEqual(h.snapshot(), { running: false, timer: false, settingsReads: 1 })
  assert.equal(h.scope.recordingDetails.current.blobBytes, 11)
  assert.equal(h.scope.recordingDetails.current.blobMime, mime || null)
  assert.ok(!JSON.stringify(h.scope.recordingDetails.current).includes('PRIVATE'))
  assert.equal(h.scope.chunksRef.current.length, 0)
  if (!mime) assert.deepEqual(h.notices, ['Video format needs attention. Keep Found open while saving.'], 'unknown-format notice must not claim verified device storage')
  else assert.deepEqual(h.notices, [])
  h.start()
  h.chunk('second')
  h.stop()
  h.finalize()
  assert.equal(await h.retained[1].blob.text(), 'second', 'new recording does not inherit old chunks')
}
const spontaneous = recordingHarness()
spontaneous.start(); spontaneous.chunk('recovered'); spontaneous.finalize()
assert.deepEqual(spontaneous.snapshot(), { running: false, timer: false, settingsReads: 1 })
assert.equal(spontaneous.scope.encoding.current, 0)
assert.equal(spontaneous.retained.length, 1)
const emptyRecording = recordingHarness()
emptyRecording.start(); emptyRecording.stop(); emptyRecording.finalize()
assert.equal(emptyRecording.retained.length, 0)
assert.equal(emptyRecording.scope.encoding.current, 0)
assert.ok(emptyRecording.notices.length)
for (const mime of ['video/webm', '']) {
  const failedRetention = recordingHarness({ mime, retentionThrows: true })
  failedRetention.start(); failedRetention.chunk('preserve'); failedRetention.stop()
  assert.throws(() => failedRetention.finalize(), /retention failed/)
  assert.equal(failedRetention.scope.encoding.current, 0, 'finally releases encoding even if retention throws')
  assert.equal(failedRetention.snapshot().timer, false)
}
const failedStart = recordingHarness({ startThrows: true })
failedStart.start()
assert.equal(failedStart.scope.recorderRef.current, null)
assert.equal(failedStart.scope.encoding.current, 0)
assert.equal(failedStart.snapshot().timer, false)
assert.ok(failedStart.notices.length)
console.log('PASS camera recording profile: capabilities, aspect, recorder fallback, actual MIME, sanitized measurement, serialized mode/close races')
console.log('PASS microphone timing: actual photo-open acquisition, audio-denial fallback, total denial, late close, existing silent stream')
console.log('PASS advanced constraints: serialized zoom/torch, preserved profile, stale cancellation and rejection fallback')
console.log('PASS actual CameraSheet recording: final chunk, raw unknown MIME, local details, session separation, spontaneous stop and cleanup failures')
