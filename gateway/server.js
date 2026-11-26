'use strict';
/* MirSeer Stream Gateway - zero npm dependencies (Node >= 20 + ffmpeg/ffprobe).
   MirSeer userscript -> GET /player?magnet=..&name=..&index=..&k=token
   Gateway -> TorrServer (add magnet) -> ffprobe -> ffmpeg (copy or transcode) -> HLS -> hls.js in the browser. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const VERSION = '1.0.3';
const PORT = +process.env.PORT || 8765;
const TS = (process.env.TORRSERVER_URL || 'http://torrserver:8090').replace(/\/+$/, '');
const TS_USER = process.env.TS_USER || '';
const TS_PASS = process.env.TS_PASS || '';
const TOKEN = process.env.GATEWAY_TOKEN || '';
const CACHE = process.env.CACHE_DIR || '/cache';
const SEG = +process.env.SEG_SECONDS || 6;
const MAX_H = +process.env.TRANSCODE_MAX_HEIGHT || 1080;
const X264_PRESET = process.env.X264_PRESET || 'veryfast';
const AHEAD_STOP = +process.env.AHEAD_SEGMENTS || 10;      /* ffmpeg is paused when this many segments are ready beyond the playhead */
const RUN_IDLE_MS = (+process.env.RUN_IDLE_MIN || 5) * 60000;
const SESSION_TTL_MS = (+process.env.SESSION_TTL_HOURS || 6) * 3600000;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const PUBLIC = path.join(__dirname, 'public');

const tsAuth = TS_USER ? 'Basic ' + Buffer.from(TS_USER + ':' + TS_PASS).toString('base64') : '';
const sessions = new Map();   /* sid -> session */
const byKey = new Map();      /* magnet+index -> sid */
let HAS_ZSCALE = false;

const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rid = n => crypto.randomBytes(n).toString('hex');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const tokenOk = t => !TOKEN || safeEq(t || '', TOKEN);

/* ---------- TorrServer ---------- */
async function tsFetch(p, opts = {}, timeout = 20000) {
  const h = Object.assign({}, opts.headers || {});
  if (tsAuth) h.Authorization = tsAuth;
  return fetch(TS + p, Object.assign({}, opts, { headers: h, signal: AbortSignal.timeout(timeout) }));
}
async function tsPost(body, timeout) {
  const r = await tsFetch('/torrents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, timeout);
  if (r.status === 401 || r.status === 403) throw new Error('TorrServer asks for a login: set TS_USER / TS_PASS on the gateway');
  if (!r.ok) throw new Error('TorrServer HTTP ' + r.status);
  return r.json();
}
async function tsAlive() {
  try { const r = await tsFetch('/echo', {}, 4000); return r.ok; } catch (e) { return false; }
}
/* Release the torrent when nobody is watching: TorrServer refuses (or silently undoes) a delete while a reader is attached.
   RELEASE_ACTION = drop (default, frees peers/cache, keeps the entry) | rem (removes the entry) | none */
const RELEASE = (process.env.RELEASE_ACTION || 'drop').toLowerCase();
function tsRelease(s) {
  if (!s.hash || RELEASE === 'none') return;
  const hash = s.hash;
  setTimeout(() => {
    for (const o of sessions.values()) if (o !== s && o.hash === hash && o.run && !o.run.dead) return;   /* still in use by another session */
    tsFetch('/torrents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: RELEASE === 'rem' ? 'rem' : 'drop', hash }) }, 8000)
      .then(r => log('torrent released', hash.slice(0, 8), RELEASE, 'HTTP ' + r.status), e => log('release failed', hash.slice(0, 8), e.message));
  }, 1500);
}
function killSubs(s) { killSubWin(s); for (const j of s.subs.values()) { try { if (j.state === 'extracting' && j.proc) j.proc.kill('SIGKILL'); } catch (e) {} } }
const VIDEO_EXT = /\.(mkv|mp4|m4v|avi|mov|wmv|ts|m2ts|webm|mpg|mpeg|flv|ogv)$/i;
async function tsPrepare(s) {
  s.msg = 'Adding the torrent to TorrServer…';
  let t = await tsPost({ action: 'add', link: s.magnet, title: s.name, poster: '', save_to_db: false }, 60000);
  const hash = t.hash || t.Hash;
  if (!hash) throw new Error('TorrServer did not return a hash');
  s.hash = hash;
  const t0 = Date.now();
  while (!(t.file_stats && t.file_stats.length)) {
    if (Date.now() - t0 > 150000) throw new Error('No metadata from peers within 150 s (no seeds?)');
    s.msg = 'Waiting for the file list from peers… ' + Math.round((Date.now() - t0) / 1000) + ' s';
    await sleep(1500);
    t = await tsPost({ action: 'get', hash }, 20000);
  }
  let idx = +s.index;
  if (!idx) {
    const vids = t.file_stats.filter(f => VIDEO_EXT.test(f.path || '')).sort((a, b) => b.length - a.length);
    if (!vids.length) throw new Error('No video file in this torrent');
    idx = vids[0].id;
  }
  if (!t.file_stats.some(f => f.id === idx)) throw new Error('File #' + idx + ' not found in the torrent');
  s.index = idx;
  s.url = TS + '/stream/' + encodeURIComponent(s.name || 'video') + '?link=' + encodeURIComponent(s.magnet) + '&index=' + idx + '&play';
}
const inHeaders = () => tsAuth ? ['-headers', 'Authorization: ' + tsAuth + '\r\n'] : [];
const inNet = () => [...inHeaders(), '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5'];

/* ---------- ffprobe ---------- */
function runCapture(cmd, args, timeout) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    const to = setTimeout(() => { p.kill('SIGKILL'); reject(new Error(cmd + ' timeout')); }, timeout);
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-10000); });
    p.on('error', e => { clearTimeout(to); reject(e); });
    p.on('close', code => { clearTimeout(to); code === 0 ? resolve(out) : reject(new Error(err.trim().split('\n').slice(-3).join(' ') || cmd + ' exit ' + code)); });
  });
}
const durTag = v => { const m = /^(\d+):(\d+):([\d.]+)/.exec(v || ''); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0; };
async function probe(s) {
  s.msg = 'Analysing the streams…';
  const out = await runCapture(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams',
    '-analyzeduration', '15000000', '-probesize', '30000000', ...inNet(), s.url], 150000);
  const j = JSON.parse(out);
  const st = j.streams || [];
  const v = st.find(x => x.codec_type === 'video' && !(x.disposition && x.disposition.attached_pic));
  if (!v) throw new Error('No video stream found');
  const pix = v.pix_fmt || '';
  const dovi = (v.side_data_list || []).find(d => /dovi/i.test(d.side_data_type || ''));
  const info = {
    title: s.name,
    duration: +(j.format && j.format.duration) || Math.max(0, ...st.map(x => +x.duration || durTag(x.tags && (x.tags.DURATION || x.tags['DURATION-eng'])))),
    video: {
      codec: v.codec_name, profile: v.profile || '', w: v.width, h: v.height, pix,
      bits: +v.bits_per_raw_sample || (/10/.test(pix) ? 10 : /12/.test(pix) ? 12 : 8),
      yuv420: /^yuvj?420/.test(pix),
      hdr: v.color_transfer === 'smpte2084' || v.color_transfer === 'arib-std-b67',
      dvProfile: dovi ? dovi.dv_profile : 0
    },
    audio: st.filter(x => x.codec_type === 'audio').map((a, i) => ({ idx: i, codec: a.codec_name, ch: a.channels || 2,
      lang: (a.tags && a.tags.language) || '', title: (a.tags && a.tags.title) || '', def: !!(a.disposition && a.disposition.default) })),
    subs: st.filter(x => x.codec_type === 'subtitle').map((x, i) => ({ idx: i, codec: x.codec_name,
      text: /^(subrip|srt|ass|ssa|webvtt|mov_text|text)$/i.test(x.codec_name || ''),
      lang: (x.tags && x.tags.language) || '', title: (x.tags && x.tags.title) || '', def: !!(x.disposition && x.disposition.default), forced: !!(x.disposition && x.disposition.forced) }))
  };
  if (!(info.duration > 0)) throw new Error('Unknown duration (the file has no duration in its header)');
  s.info = info;
}

/* ---------- video plan: copy when the browser can decode it, otherwise x264 ---------- */
function decide(info, caps, mode) {
  const v = info.video, c = new Set(caps || []);
  let copy = false, reason = '';
  if (mode === 'transcode') reason = 'forced (compatibility mode)';
  else if (v.codec === 'h264') { if (v.bits <= 8 && v.yuv420) copy = true; else reason = 'H.264 10-bit / non-4:2:0'; }
  else if (v.codec === 'hevc') {
    if (v.dvProfile === 5) reason = 'Dolby Vision profile 5';
    else if (c.has(v.bits > 8 ? 'hevc10' : 'hevc')) copy = true; else reason = 'HEVC is not decoded by this browser';
  }
  else if (v.codec === 'av1') { if (c.has('av1')) copy = true; else reason = 'AV1 is not decoded by this browser'; }
  else if (v.codec === 'vp9') { if (c.has('vp9')) copy = true; else reason = 'VP9 is not decoded by this browser'; }
  else reason = 'codec ' + v.codec;
  return { copy, reason };
}
function buildArgs(s, plan, t, a, dir) {
  const au = s.info.audio[a] || s.info.audio[0];
  const args = ['-hide_banner', '-loglevel', 'warning', '-nostdin'];
  if (t > 0) args.push('-ss', String(t), '-noaccurate_seek');
  args.push(...inNet(), '-i', s.url, '-map', '0:v:0');
  if (au) args.push('-map', '0:a:' + au.idx);
  args.push('-sn', '-dn', '-map_chapters', '-1');
  const v = s.info.video;
  if (plan.copy) {
    args.push('-c:v', 'copy');
    if (v.codec === 'hevc') args.push('-tag:v', 'hvc1');
  } else {
    const f = [];
    if (v.hdr && HAS_ZSCALE) f.push('zscale=t=linear:npl=100', 'format=gbrpf32le', 'zscale=p=bt709', 'tonemap=tonemap=hable:desat=0', 'zscale=t=bt709:m=bt709:r=tv');
    f.push('scale=-2:min(ih\\,' + MAX_H + ')', 'format=yuv420p');
    args.push('-c:v', 'libx264', '-preset', X264_PRESET, '-crf', '21', '-profile:v', 'high', '-level', '4.1', '-vf', f.join(','),
      '-force_key_frames', 'expr:if(isnan(prev_forced_t),1,gte(t,prev_forced_t+' + SEG + '))', '-sc_threshold', '0');
  }
  if (au) {
    if (au.codec === 'aac' && au.ch <= 2) args.push('-c:a', 'copy');
    else args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');
  }
  args.push('-copyts', '-avoid_negative_ts', 'disabled', '-max_muxing_queue_size', '4096',
    '-f', 'hls', '-hls_time', String(SEG - 0.5), '-hls_list_size', '0', '-hls_playlist_type', 'event',
    '-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init.mp4',
    '-hls_flags', 'temp_file+independent_segments',
    '-hls_segment_filename', path.join(dir, 'seg%05d.m4s'), path.join(dir, 'index.m3u8'));
  return args;
}

/* ---------- runs: one ffmpeg per (start time, audio, mode); a new run replaces the old one ---------- */
function killRun(run) {
  if (!run || run.dead) return;
  run.dead = true;
  try { run.proc.kill('SIGCONT'); run.proc.kill('SIGKILL'); } catch (e) {}
  setTimeout(() => fs.rm(run.dir, { recursive: true, force: true }, () => {}), 1500);
}
const segCount = dir => { try { return fs.readdirSync(dir).filter(f => /^seg\d+\.m4s$/.test(f)).length; } catch (e) { return 0; } };
function throttle(run) {
  if (run.dead || run.exited) return;
  const ahead = segCount(run.dir) - run.reqMax - 1;
  if (!run.paused && ahead >= AHEAD_STOP) { try { run.proc.kill('SIGSTOP'); run.paused = true; } catch (e) {} }
  else if (run.paused && ahead <= Math.floor(AHEAD_STOP / 2)) { try { run.proc.kill('SIGCONT'); run.paused = false; } catch (e) {} }
}
/* ffmpeg starts at a keyframe, not at the exact requested time: read the real start of the first segment so the player can seek the remaining part itself */
async function segmentBase(dir) {
  try {
    const out = await runCapture(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-read_intervals', '%+#1', '-show_entries', 'packet=pts_time,dts_time', '-of', 'csv=p=0',
      'concat:' + path.join(dir, 'init.mp4') + '|' + path.join(dir, 'seg00000.m4s')], 15000);
    const f = out.split('\n')[0].split(',').map(parseFloat);   /* ffprobe csv order: pts, dts */
    /* the browser's media time 0 is the first DTS (tfdt = 0); the first PTS is later by the B-frame delay */
    const v = isFinite(f[1]) ? f[1] : f[0];
    return isFinite(v) ? v : 0;
  } catch (e) { return 0; }
}

async function startRun(s, { t, a, mode, caps }) {
  killRun(s.run);
  t = Math.max(0, Math.min(+t || 0, Math.max(0, s.info.duration - 5)));
  a = Math.max(0, Math.min(+a || 0, Math.max(0, s.info.audio.length - 1)));
  const plan = decide(s.info, caps, mode);
  const id = String(++s.runSeq);
  const dir = path.join(s.dir, 'r' + id);
  fs.mkdirSync(dir, { recursive: true });
  const args = buildArgs(s, plan, t, a, dir);
  log('ffmpeg', s.sid, plan.copy ? 'copy' : 'x264', 't=' + t, 'a=' + a);
  const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const run = { id, dir, proc, t, a, plan, reqMax: 0, paused: false, dead: false, exited: false, err: '', last: Date.now() };
  proc.stderr.on('data', d => { run.err += d; if (run.err.length > 8000) run.err = run.err.slice(-4000); });
  proc.on('close', code => { run.exited = true; run.code = code; });
  s.run = run;
  const t0 = Date.now();
  for (;;) {
    if (run.exited && !fs.existsSync(path.join(dir, 'index.m3u8'))) throw new Error('ffmpeg failed: ' + (run.err.trim().split('\n').slice(-3).join(' ') || 'exit ' + run.code));
    if (segCount(dir) >= 2 || (run.exited && segCount(dir) >= 1)) break;
    if (Date.now() - t0 > 120000) { killRun(run); throw new Error('Timeout while starting the stream (slow torrent?)'); }
    await sleep(300);
  }
  return { run: id, t, a, base: await segmentBase(dir), playlist: '/s/' + s.sid + '/r/' + id + '/index.m3u8', video: plan.copy ? 'copy' : 'transcode', reason: plan.reason };
}

/* ---------- subtitles (text only); extraction reads the whole file, so it is lazy and cached ---------- */
function subJob(s, i) {
  let j = s.subs.get(i);
  if (j) return j;
  const sub = s.info.subs[i];
  j = { state: 'extracting', file: path.join(s.dir, 'sub' + i + '.vtt'), err: '' };
  s.subs.set(i, j);
  if (!sub || !sub.text) { j.state = 'error'; j.err = 'Image-based subtitles (PGS/VobSub) are not supported yet'; return j; }
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-nostdin', ...inNet(), '-i', s.url, '-map', '0:s:' + i, '-c:s', 'webvtt', '-y', j.file], { stdio: ['ignore', 'ignore', 'pipe'] });
  p.stderr.on('data', d => j.err += d);
  p.on('close', code => { j.state = code === 0 && fs.existsSync(j.file) ? 'ready' : 'error'; if (j.state === 'error') j.err = j.err.trim().split('\n').slice(-2).join(' ') || 'extraction failed'; });
  j.proc = p;
  return j;
}

/* ---------- subtitles by time window: ffmpeg reads only [t, t+len] of the file, so cues arrive in seconds ---------- */
function shiftVtt(txt, off) {
  const f = x => { const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), sc = x % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + sc.toFixed(3).padStart(6, '0'); };
  return txt.replace(/\r/g, '').split('\n').map(l => l.indexOf('-->') < 0 ? l :
    l.replace(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/g, (m0, h, mi, se, ms) => f((+(h || 0)) * 3600 + (+mi) * 60 + (+se) + (+ms) / Math.pow(10, ms.length) + off))).join('\n');
}
function subWindow(s, i, t, len) {
  const sub = s.info.subs[i];
  if (!sub || !sub.text) return Promise.reject(new Error('Image-based subtitles (PGS/VobSub) are not supported yet'));
  t = Math.max(0, Math.min(t, s.info.duration)); len = Math.max(10, Math.min(len, 600));
  const key = i + '|' + t.toFixed(1) + '|' + Math.round(len);
  s.subWin = s.subWin || new Map(); s.subProcs = s.subProcs || new Set();
  let pr = s.subWin.get(key);
  if (pr) return pr;
  pr = new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-ss', String(t), ...inNet(), '-i', s.url,
      '-map', '0:s:' + i, '-t', String(len), '-c:s', 'webvtt', '-f', 'webvtt', 'pipe:1'], { stdio: ['ignore', 'pipe', 'pipe'] });
    s.subProcs.add(p);
    let out = '', err = '';
    const to = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} }, 90000);
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => { err += d; if (err.length > 4000) err = err.slice(-2000); });
    p.on('error', e => { clearTimeout(to); reject(e); });
    p.on('close', code => {
      clearTimeout(to); s.subProcs.delete(p);
      code === 0 ? resolve(shiftVtt(out, t)) : reject(new Error(err.trim().split('\n').slice(-2).join(' ') || 'extraction failed'));
    });
  });
  s.subWin.set(key, pr);
  pr.catch(() => s.subWin.delete(key));
  return pr;
}
function killSubWin(s) { if (s.subProcs) for (const p of s.subProcs) { try { p.kill('SIGKILL'); } catch (e) {} } }

/* ---------- sessions ---------- */
async function openSession(magnet, name, index) {
  const key = magnet + '|' + (index || '');
  const old = byKey.get(key) && sessions.get(byKey.get(key));
  if (old && old.state !== 'error') { old.last = Date.now(); return old; }
  const s = { sid: rid(12), magnet, name: name || 'video', index: index || 0, state: 'preparing', msg: 'Starting…', info: null, url: '', dir: '', run: null, runSeq: 0, subs: new Map(), last: Date.now(), created: Date.now() };
  s.dir = path.join(CACHE, s.sid);
  fs.mkdirSync(s.dir, { recursive: true });
  sessions.set(s.sid, s);
  byKey.set(key, s.sid);
  s.key = key;
  (async () => {
    try { await tsPrepare(s); await probe(s); s.state = 'ready'; s.msg = ''; }
    catch (e) { s.state = 'error'; s.msg = String((e && e.message) || e); log('session error', s.sid, s.msg); }
  })();
  return s;
}
function dropSession(s) {
  killRun(s.run);
  killSubWin(s);
  for (const j of s.subs.values()) { try { j.proc && j.proc.kill('SIGKILL'); } catch (e) {} }
  sessions.delete(s.sid);
  tsRelease(s);
  if (byKey.get(s.key) === s.sid) byKey.delete(s.key);
  fs.rm(s.dir, { recursive: true, force: true }, () => {});
}
setInterval(() => {
  const now = Date.now();
  for (const s of sessions.values()) {
    if (s.run && !s.run.dead) { throttle(s.run); if (now - s.run.last > RUN_IDLE_MS) { killRun(s.run); s.run = null; killSubs(s); tsRelease(s); } }
    if (now - s.last > SESSION_TTL_MS) dropSession(s);
  }
}, 2000).unref();

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.m3u8': 'application/vnd.apple.mpegurl', '.m4s': 'video/iso.segment', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.json': 'application/json' };
function send(res, code, body, type) {
  const b = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': type || (typeof body === 'object' && !Buffer.isBuffer(body) ? 'application/json' : 'text/plain; charset=utf-8'), 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(b);
}
function sendFile(req, res, file, cache) {
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) return send(res, 404, 'not found');
    const h = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': cache || 'no-store', 'Access-Control-Allow-Origin': '*' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m) {
      let a = m[1] === '' ? Math.max(0, st.size - +m[2]) : +m[1], b = m[1] !== '' && m[2] !== '' ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (a > b || a >= st.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end(); }
      res.writeHead(206, Object.assign(h, { 'Content-Range': 'bytes ' + a + '-' + b + '/' + st.size, 'Content-Length': b - a + 1 }));
      return fs.createReadStream(file, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, Object.assign(h, { 'Content-Length': st.size }));
    fs.createReadStream(file).pipe(res);
  });
}
const readBody = req => new Promise((resolve, reject) => {
  let d = '';
  req.on('data', c => { d += c; if (d.length > 1e5) { reject(new Error('body too large')); req.destroy(); } });
  req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
});
const SAFE = /^[A-Za-z0-9_.-]+$/;

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname;
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); return res.end(); }

    if (p === '/health') return send(res, 200, { ok: true, version: VERSION, auth: !!TOKEN, torrserver: await tsAlive(), zscale: HAS_ZSCALE });
    if (p === '/player' || p === '/') {
      if (!tokenOk(u.searchParams.get('k'))) return send(res, 401, 'Gateway token missing or wrong (Settings > Browser player in MirSeer)');
      return sendFile(req, res, path.join(PUBLIC, 'player.html'));
    }
    if (p === '/hls.min.js') return sendFile(req, res, path.join(PUBLIC, 'hls.min.js'), 'public, max-age=86400');

    if (p === '/api/open' && req.method === 'POST') {
      const b = await readBody(req);
      if (!tokenOk(b.k)) return send(res, 401, { error: 'bad token' });
      if (!/^magnet:/i.test(b.magnet || '')) return send(res, 400, { error: 'magnet missing' });
      const s = await openSession(String(b.magnet), String(b.name || '').slice(0, 200), +b.index || 0);
      return send(res, 200, { sid: s.sid });
    }

    const m = /^\/s\/([a-f0-9]{24})\/(.+)$/.exec(p);
    if (m) {
      const s = sessions.get(m[1]);
      if (!s) return send(res, 404, { error: 'session expired' });
      s.last = Date.now();
      const rest = m[2];
      if (rest === 'status') return send(res, 200, { state: s.state, msg: s.msg, info: s.state === 'ready' ? s.info : null, seg: SEG });
      if (rest === 'close' && req.method === 'POST') {   /* sent by the player on pagehide; delayed so a page reload (same sid) keeps the session */
        const at = Date.now();
        setTimeout(() => { if (sessions.get(s.sid) === s && s.last <= at) dropSession(s); }, 10000);
        return send(res, 200, { ok: true });
      }
      if (s.state !== 'ready') return send(res, 409, { error: 'not ready' });
      if (rest === 'run' && req.method === 'POST') {
        const b = await readBody(req);
        try { return send(res, 200, await startRun(s, b)); } catch (e) { return send(res, 500, { error: String(e.message || e) }); }
      }
      let r;
      if ((r = /^r\/(\d+)\/([A-Za-z0-9_.-]+)$/.exec(rest))) {
        const run = s.run;
        if (!run || run.id !== r[1] || run.dead) return send(res, 410, { error: 'run replaced' });
        run.last = Date.now();
        const sm = /^seg(\d+)\.m4s$/.exec(r[2]);
        if (sm) { run.reqMax = Math.max(run.reqMax, +sm[1]); throttle(run); }
        return sendFile(req, res, path.join(run.dir, r[2]));
      }
      if ((r = /^sub\/(\d+)\.vtt$/.exec(rest))) {
        if (u.searchParams.has('t')) {   /* live window: /sub/N.vtt?t=START&len=SECONDS (absolute cue times) */
          try { return send(res, 200, await subWindow(s, +r[1], +u.searchParams.get('t') || 0, +u.searchParams.get('len') || 120), MIME['.vtt']); }
          catch (e) { return send(res, 422, { error: String((e && e.message) || e) }); }
        }
        const j = subJob(s, +r[1]);
        if (j.state === 'ready') return sendFile(req, res, j.file);
        return send(res, j.state === 'error' ? 422 : 202, { state: j.state, error: j.err });
      }
    }
    send(res, 404, 'not found');
  } catch (e) {
    log('http error', e && e.message);
    if (!res.headersSent) send(res, 500, { error: String((e && e.message) || e) });
  }
});

(async () => {
  try { fs.rmSync(CACHE, { recursive: true, force: true }); } catch (e) {}
  fs.mkdirSync(CACHE, { recursive: true });
  try { HAS_ZSCALE = /zscale/.test(await runCapture(FFMPEG, ['-hide_banner', '-filters'], 10000)); } catch (e) { log('ffmpeg not usable:', e.message); }
  server.listen(PORT, '0.0.0.0', () => log('MirSeer Stream Gateway', VERSION, 'on :' + PORT, '| TorrServer', TS, '| zscale', HAS_ZSCALE, '| auth', !!TOKEN));
})();
const bye = () => { for (const s of sessions.values()) killRun(s.run); process.exit(0); };
process.on('SIGTERM', bye); process.on('SIGINT', bye);
