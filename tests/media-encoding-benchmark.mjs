/** Synthetic desktop-browser benchmark only. No camera, client data, network, app changes,
 * dependencies, or credentials. Optional FOUND_PLAYWRIGHT_MODULE / FOUND_BROWSER_EXECUTABLE.
 * Writes only ignored .billing-audits/media-encoding-<timestamp> artifacts.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const output = path.join(root, '.billing-audits', 'media-encoding-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output, { recursive: true });
const profileSource = fs.readFileSync('src/lib/cameraRecordingProfile.ts', 'utf8');
const photoSource = fs.readFileSync('src/components/dashboard/CameraSheet.tsx', 'utf8');
assert(photoSource.includes('"image/jpeg", 0.92'), 'Recheck photo baseline: current source changed');
const profileCode = ts.transpileModule(profileSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const server = http.createServer((_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Synthetic encoding benchmark</title><style>body{margin:0;background:#222;color:white;font:16px sans-serif}canvas{max-width:100vw}</style>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.FOUND_BROWSER_EXECUTABLE ? { executablePath: process.env.FOUND_BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.exposeFunction('saveBenchmarkArtifact', (name, base64) => {
    assert(/^[a-z0-9_.-]+$/i.test(name)); fs.writeFileSync(path.join(output, name), Buffer.from(base64, 'base64'));
  });
  await page.exposeFunction('benchmarkProgress', value => console.log(value));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.addScriptTag({ content: `(()=>{const module={exports:{}},exports=module.exports;${profileCode}\nwindow.profile=module.exports;})();` });
  const results = await page.evaluate(async () => {
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const encode = (c, type, quality) => new Promise((resolve, reject) => c.toBlob(value => value ? resolve(value) : reject(Error('Encoding failed')), type, quality));
    async function save(name, blob) { const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob); }); await window.saveBenchmarkArtifact(name, data); }
    function metrics(reference, decoded, roi = { x: 0, y: 0, w: reference.width, h: reference.height }) {
      const a = reference.getContext('2d', { willReadFrequently: true }).getImageData(roi.x, roi.y, roi.w, roi.h).data;
      const b = decoded.getContext('2d', { willReadFrequently: true }).getImageData(roi.x, roi.y, roi.w, roi.h).data;
      let mse = 0, mae = 0, count = 0, edgeA = 0, edgeB = 0;
      const luma = (d, i) => .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
      for (let y = 0; y < roi.h; y += 2) for (let x = 0; x < roi.w - 2; x += 2) {
        const i = (y * roi.w + x) * 4, v = luma(a, i), q = luma(b, i);
        mse += (v - q) ** 2; mae += Math.abs(v - q); count++;
        edgeA += Math.abs(v - luma(a, i + 8)); edgeB += Math.abs(q - luma(b, i + 8));
      }
      mse /= count;
      return { lumaPsnrDb: mse ? +(10 * Math.log10(255 ** 2 / mse)).toFixed(2) : null, lumaMae: +(mae / count).toFixed(3), edgeEnergyRatio: +(edgeB / edgeA).toFixed(3) };
    }
    // Procedural job-site detail chart: deterministic multiscale texture, grain,
    // mortar, shingles, wiring, ruler ticks and small labels. Not a natural photo.
    const master = canvas(4096, 3072), ctx = master.getContext('2d');
    const pixels = ctx.createImageData(master.width, master.height);
    let seed = 20261122;
    for (let y = 0; y < master.height; y++) for (let x = 0; x < master.width; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = ((seed >>> 24) - 128) * .18;
      const grain = 10 * Math.sin(x * .12 + Math.sin(y * .018) * 5) + 4 * Math.sin(x * .72 + y * .31);
      const i = (y * master.width + x) * 4;
      pixels.data[i] = 126 + grain + noise; pixels.data[i + 1] = 109 + grain + noise; pixels.data[i + 2] = 88 + grain + noise; pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0); ctx.scale(4096 / 1920, 3072 / 1440);
    ctx.fillStyle = '#f4f0df'; ctx.fillRect(25, 25, 1870, 555);
    ctx.fillStyle = '#141a20'; ctx.font = 'bold 36px Arial'; ctx.fillText('SYNTHETIC JOB DETAIL • NOT A CAMERA PHOTO', 55, 80);
    const labels = ['Panel A — 12 AWG / 20 A / circuit 07', 'Flashing overlap: 75 mm | seal joint B-14', 'Model FN-2048 • serial 8264-3917', 'Measure twice: 1/8 in • 3/16 in • 7/32 in'];
    [32, 24, 18, 14, 10].forEach((size, i) => { ctx.font = `${size}px Arial`; ctx.fillText(`${size}px: ${labels[i % labels.length]}`, 60, 135 + i * 62); });
    ctx.fillStyle = '#fff'; ctx.fillRect(1100, 105, 730, 400);
    for (let band = 0; band < 5; band++) { const step = [2, 3, 5, 8, 12][band]; ctx.fillStyle = '#111'; for (let x = 1120; x < 1800; x += step * 2) ctx.fillRect(x, 125 + band * 70, step, 42); }
    ctx.font = '18px monospace'; ctx.fillText('fine-to-coarse edge patterns', 1130, 490);
    // Roof/shingle seams, brick mortar and fine colored wiring on textured ground.
    for (let row = 0; row < 12; row++) for (let col = 0; col < 9; col++) { const x = 30 + col * 105 + (row % 2) * 42, y = 610 + row * 52; ctx.strokeStyle = '#302d2a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 100, 47); }
    for (let row = 0; row < 10; row++) for (let col = 0; col < 6; col++) { ctx.fillStyle = `hsl(${12 + (row + col) % 8} 38% ${37 + (row * col) % 13}%)`; ctx.fillRect(1040 + col * 135 + (row % 2) * 28, 610 + row * 61, 128, 54); }
    ['#ce3528','#2456a6','#e2bd27','#222','#e8e7df'].forEach((color, i) => { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.moveTo(80, 1260 + i * 22); ctx.bezierCurveTo(500, 1180, 900, 1430, 1790, 1250 + i * 23); ctx.stroke(); });
    ctx.fillStyle = '#f5df8d'; ctx.fillRect(45, 1360, 1800, 60); ctx.strokeStyle = '#222'; ctx.fillStyle = '#222'; ctx.font = '14px monospace';
    for (let i = 0; i < 180; i++) { const x = 55 + i * 9.8; ctx.beginPath(); ctx.moveTo(x, 1360); ctx.lineTo(x, 1360 + (i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 12)); ctx.stroke(); if (i % 10 === 0) ctx.fillText(String(i), x, 1408); }
    document.body.append(master); await save('source-photo.png', await encode(master, 'image/png'));
    const photoProfiles = [[4096,3072,.92],[4096,3072,.85],[4096,3072,.80],[3072,2304,.85],[3072,2304,.80],[2048,1536,.85],[2048,1536,.80]];
    const photos = [];
    for (const [width, height, quality] of photoProfiles) {
      const target = canvas(width, height); target.getContext('2d').drawImage(master, 0, 0, width, height);
      const encodeTimes = []; let blob;
      for (let repeat = 0; repeat < 3; repeat++) { const start = performance.now(); blob = await encode(target, 'image/jpeg', quality); encodeTimes.push(performance.now() - start); }
      const decodeStart = performance.now(), decoded = await createImageBitmap(blob);
      const decodeMs = performance.now() - decodeStart;
      const common = canvas(master.width, master.height); common.getContext('2d').drawImage(decoded, 0, 0, common.width, common.height);
      const native = canvas(width, height); native.getContext('2d').drawImage(decoded, 0, 0);
      const name = `photo-${width}-q${Math.round(quality * 100)}`;
      await save(name + '.jpg', blob);
      const crop = canvas(1500, 700); crop.getContext('2d').drawImage(common, 100, 210, 1500, 700, 0, 0, 1500, 700); await save(name + '-detail.png', await encode(crop, 'image/png'));
      const row = { name, width, height, quality, bytes: blob.size, encodeTimesMs: encodeTimes.map(v => +v.toFixed(1)), decodeMs: +decodeMs.toFixed(1), decodedWidth: decoded.width, decodedHeight: decoded.height, decodedRgbaBytes: decoded.width * decoded.height * 4, common4096Detail: metrics(master, common, { x: 100, y: 210, w: 1500, h: 700 }), sameResolution: metrics(target, native) };
      photos.push(row); decoded.close(); await window.benchmarkProgress(`JPEG ${name}: ${blob.size} bytes`);
    }
    const reference = canvas(1920,1080); reference.getContext('2d').drawImage(master, 0, 0, 4096, 2304, 0, 0, 1920, 1080);
    const texture = canvas(1024,512); texture.getContext('2d').drawImage(master, 0, 1200, 2200, 1100, 0, 0, 1024, 512);
    const audio = new AudioContext(); await audio.resume(); const destination = audio.createMediaStreamDestination(), tone = audio.createOscillator(), gain = audio.createGain(); tone.frequency.value = 440; gain.gain.value = .015; tone.connect(gain).connect(destination); tone.start();
    const videos = [];
    const controlledMime = ['video/mp4;codecs=avc1,opus','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'].find(mime => MediaRecorder.isTypeSupported(mime));
    if (!controlledMime) throw Error('No explicit shared codec available for a fair comparison');
    const videoProfiles = [[1920,1080,5000000,'current'], ...[[1920,1080],[1280,720]].flatMap(([w,h]) => [5000000,3000000,2000000].map(bits => [w,h,bits,'controlled']))];
    const event = (target, name) => new Promise((resolve, reject) => { const timer = setTimeout(() => { clean(); reject(Error('Media event timeout: ' + name)); }, 15000); const ok = () => { clean(); resolve(); }; const bad = () => { clean(); reject(Error('Decode failed')); }; const clean = () => { clearTimeout(timer); target.removeEventListener(name, ok); target.removeEventListener('error', bad); }; target.addEventListener(name, ok, { once: true }); target.addEventListener('error', bad, { once: true }); });
    for (let repeat = 1; repeat <= 2; repeat++) for (const [width,height,bits,mode] of videoProfiles) {
      const c = canvas(width,height), g = c.getContext('2d');
      const draw = t => { g.save(); g.scale(width / 1920,height / 1080); g.drawImage(reference,0,0); g.save(); g.beginPath(); g.rect(0,590,1920,490); g.clip(); const shift = (t * 105) % 1024; for (let x = -1024; x < 2200; x += 1024) g.drawImage(texture,x+shift,590); g.translate(960+180*Math.sin(t*1.7),825); g.rotate(.13*Math.sin(t*2.1)); g.fillStyle='#e9d8a9';g.fillRect(-400,-95,800,190);g.strokeStyle='#333';g.lineWidth=3;for(let i=0;i<80;i++){g.beginPath();g.moveTo(-390+i*10,-90);g.lineTo(-390+i*10,i%10===0?10:-35);g.stroke();}g.fillStyle='#181818';g.font='24px monospace';g.fillText('MOVING RULER • 75 mm / circuit 07',-350,65);g.restore();g.restore(); };
      draw(0); const stream = c.captureStream(30); destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      const recorder = mode === 'current' ? window.profile.createProfiledRecorder(stream) : new MediaRecorder(stream,{ mimeType: controlledMime, videoBitsPerSecond: bits, audioBitsPerSecond: window.profile.RECORDING_AUDIO_BITS });
      const settings = stream.getVideoTracks()[0].getSettings();
      const trackSettings = { width: settings.width, height: settings.height, frameRate: settings.frameRate, aspectRatio: settings.aspectRatio };
      const chunks = []; recorder.ondataavailable = e => { if(e.data.size)chunks.push(e.data); };
      let animation, draws=0; const start = performance.now();
      const animate = now => { draw((now-start)/1000); draws++; animation=requestAnimationFrame(animate); };
      const stopped = new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(Error('Recording failed'));});
      recorder.start(250); animation=requestAnimationFrame(animate); await sleep(4000);
      const stopStart=performance.now(); recorder.stop(); cancelAnimationFrame(animation); await stopped;
      const finish=performance.now(); const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type}); stream.getVideoTracks().forEach(track=>track.stop());
      const name=`video-${mode}-${height}p-${bits/1000000}mbps-r${repeat}`, extension=blob.type.includes('mp4')?'mp4':'webm'; await save(name+'.'+extension,blob);
      const video=document.createElement('video');video.muted=true;video.preload='auto'; const url=URL.createObjectURL(blob); const loaded=event(video,'loadeddata');const decodeStart=performance.now();video.src=url;await loaded;
      const loadDecodeMs=performance.now()-decodeStart;
      const samples=[];let detailSaved=false;
      for(const time of [.5,1.5,2.5]){const sought=event(video,'seeked');video.currentTime=time;await sought;const decoded=canvas(1920,1080);decoded.getContext('2d').drawImage(video,0,0,1920,1080);samples.push({time:video.currentTime,...metrics(reference,decoded,{x:40,y:95,w:1780,h:430})});if(!detailSaved){const detail=canvas(1000,400);detail.getContext('2d').drawImage(decoded,40,95,1000,400,0,0,1000,400);await save(name+'-detail.png',await encode(detail,'image/png'));detailSaved=true;}}
      const row={name,mode,repeat,width,height,requestedVideoBitsPerSecond:bits,reportedVideoBitsPerSecond:recorder.videoBitsPerSecond,reportedAudioBitsPerSecond:recorder.audioBitsPerSecond,mime:blob.type,bytes:blob.size,recordingWallMs:+(stopStart-start).toFixed(1),finalizeMs:+(finish-stopStart).toFixed(1),elapsedEncodeWallMs:+(finish-start).toFixed(1),loadDecodeMs:+loadDecodeMs.toFixed(1),decodedWidth:video.videoWidth,decodedHeight:video.videoHeight,decodedRgbaBytes:video.videoWidth*video.videoHeight*4,containerDuration:Number.isFinite(video.duration)?video.duration:null,animationDraws:draws,track:trackSettings,staticDetailSamples:samples};
      videos.push(row);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);await window.benchmarkProgress(`VIDEO ${name}: ${blob.size} bytes; detail PSNR ${samples.map(s=>s.lumaPsnrDb).join('/')}`);
    }
    tone.stop(); await audio.close();
    return { label:'SYNTHETIC DESKTOP CHROMIUM — NOT IPHONE OR NATURAL CAMERA FOOTAGE', browser:navigator.userAgent, generatedAt:new Date().toISOString(), method:{photoSource:'4096x3072 deterministic textured chart, shingles/mortar/wiring/fine labels/ruler',photoEncodeRepeats:3,photoMetrics:'Luma PSNR/MAE and edge energy sampled every 2 pixels; same-resolution full frame plus common-4096 detail ROI. Resizing contributes to common-detail error. No perceptual/OCR guarantee.',video:'4 second canvas captureStream(30), moving textured detail plus static chart, synthetic 440 Hz audio, 2 sequential repeats per profile. Current rows invoke actual app helper; controlled rows pin a shared explicit codec to isolate bitrate/resolution. Compare only matching emitted MIME. Video encode wall time includes real-time capture, not CPU encode cost.',videoMetrics:'Three seeked decoded samples; static labeled ROI only, compared at common1920 resolution. No temporal/motion PSNR because capture timing is not frame-aligned. Browser requested bitrates are not measured output bitrate.',memory:'decodedRgbaBytes is width*height*4 single-frame footprint, not measured peak process memory.',limits:'No sensor noise, autofocus, exposure changes, low light, stabilization, Safari/iPhone hardware encoder, thermal/battery pressure or persistence. Synthetic results cannot certify real-camera quality.'},photos,videos };
  });
  assert.equal(results.photos.length, 7); assert.equal(results.videos.length, 14);
  for (const row of [...results.photos, ...results.videos]) {
    assert(row.bytes > 0); assert.equal(row.decodedWidth, row.width); assert.equal(row.decodedHeight, row.height);
  }
  assert.equal(new Set(results.videos.filter(v => v.mode === 'controlled').map(v => v.mime)).size, 1, 'Controlled matrix must emit the same codec');
  for (const row of results.videos) assert.equal(row.staticDetailSamples.length, 3);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
  const rows=[['kind','name','bytes','encode_or_capture_ms','decoded_width','decoded_height','detail_psnr_db','detail_luma_mae']];
  for(const p of results.photos) rows.push(['photo',p.name,p.bytes,p.encodeTimesMs.join('/'),p.decodedWidth,p.decodedHeight,p.common4096Detail.lumaPsnrDb,p.common4096Detail.lumaMae]);
  for(const v of results.videos) rows.push(['video',v.name,v.bytes,v.elapsedEncodeWallMs,v.decodedWidth,v.decodedHeight,(v.staticDetailSamples.reduce((a,s)=>a+s.lumaPsnrDb,0)/v.staticDetailSamples.length).toFixed(2),(v.staticDetailSamples.reduce((a,s)=>a+s.lumaMae,0)/v.staticDetailSamples.length).toFixed(3)]);
  fs.writeFileSync(path.join(output,'results.csv'),rows.map(r=>r.join(',')).join('\n')+'\n');
  const images=fs.readdirSync(output).filter(n=>n.endsWith('-detail.png'));
  fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><meta charset="utf-8"><title>Synthetic compression benchmark</title><style>body{font:16px system-ui;background:#eee;margin:24px}img{max-width:100%;border:1px solid #aaa}figure{margin:20px 0;background:white;padding:15px}pre{white-space:pre-wrap}</style><h1>Synthetic desktop browser encoding benchmark</h1><p>Not iPhone qualification. Charts show labeled static-detail crops at common display scale. See results.json for full method and limits.</p><pre>'+JSON.stringify({photos:results.photos,videos:results.videos},null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre>'+images.map(n=>`<figure><figcaption>${n}</figcaption><img src="${n}"></figure>`).join(''));
  console.log('RESULTS '+path.relative(root,output));
  await context.close();
} finally { await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
