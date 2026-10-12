// ==UserScript==
// @name         MirSeer
// @namespace    https://github.com/amedeeee/MirSeer
// @version      1.4.2
// @description  Catalogo Multimediale di Nuova Generazione per MirCrew
// @author       amedeeee
// @match        *://*.mircrew-releases.org/*
// @match        *://mircrew-releases.org/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      mircrew-releases.org
// @connect      api.themoviedb.org
// @connect      image.tmdb.org
// @connect      *
// @run-at       document-end
// ==/UserScript==
(function () {
'use strict';

const IS_COARSE = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
const HERO_COUNT = 7;
const HERO_POOL = 14;
const HERO_MAX_TOTAL = 100;

const PAGE_SIZE = 25;
const INITIAL_PAGES = IS_COARSE ? 2 : 3;
const NET_GAP = 350;
const AUTO_MIN = 12;
const AUTO_PAGES_MAX = 6;
const IMG_HI_COUNT = 8;

const EXCLUDE_SELECTOR = '#recent-topics, .recent-topics, .recenttopics, [class*="recent_topics"], [class*="active-topics"], [id*="active-topics"]';
const RECENT_HEAD_RE = /topic\s+attiv|attivi\s+di\s+recente|argomenti\s+attiv|ultimi\s+\d*\s*(?:topic|argomenti|messaggi)|\b20\s+topic|recent\s+(?:topics|posts)|active\s+topics/i;

const SECTIONS = [
    { name: 'Film',           fid: 26, nav: 'films',  ico: '🎬' },
    { name: 'Serie TV',       fid: 28, nav: 'series', ico: '📺' },
    { name: 'Progetti e Collezioni', fid: 13, sub: true, ico: '🗂️' },
    { name: 'Documentari',    fid: 29,                ico: '🌍' },
    { name: 'TV Show',        fid: 30,                ico: '📡' },
    { name: 'Teatro',         fid: 31,                ico: '🎭' },
    { name: 'Videocorsi',     fid: 63,                ico: '🎓' },
    { name: 'Anime Movies',   fid: 34,                ico: '🍥' },
    { name: 'Anime Series',   fid: 35,                ico: '🍙' },
    { name: 'Cartoon Movies', fid: 36,                ico: '🧸' },
    { name: 'Cartoon Series', fid: 37,                ico: '🐭' },
    { name: 'EBooks',         fid: 40,                ico: '📚' },
    { name: 'ABooks',         fid: 41,                ico: '🎧' },
    { name: 'Comics',         fid: 42,                ico: '💬' },
    { name: 'Edicola',        fid: 43,                ico: '📰' },
    { name: 'Musica Audio',   fid: 46,                ico: '🎵' },
    { name: 'Musica Video',   fid: 47,                ico: '🎤' },
    { name: 'Games PC',       fid: 66,                ico: '🎮' }
];
const FILE_TYPES = new Set(['EBooks', 'Comics', 'Edicola', 'Games PC']);
const AUDIO_TYPES = new Set(['ABooks', 'Musica Audio']);
const VIDEO_TYPES = new Set(['Film', 'Serie TV', 'Documentari', 'TV Show', 'Teatro', 'Videocorsi', 'Anime Movies', 'Anime Series', 'Cartoon Movies', 'Cartoon Series', 'Musica Video']);
const PROJECT_SECTION = 'Progetti e Collezioni';
const SEASON_SECTIONS = new Set(['Serie TV', 'TV Show', 'Anime Series', 'Cartoon Series', 'Film e Serie TV']);
const NO_RATING_SECTIONS = new Set(['Videocorsi', 'Musica Video']);

GM_addStyle(`
:root {
    --seer-bg: #07090e;
    --seer-card: #0e1424;
    --seer-card-hover: #151f36;
    --seer-accent: #6366f1;
    --seer-accent-glow: rgba(99, 102, 241, 0.4);
    --seer-text: #f8fafc;
    --seer-text-muted: #94a3b8;
    --seer-border: rgba(255, 255, 255, 0.07);
    --seer-border-hover: rgba(99, 102, 241, 0.45);
    --seer-radius: 10px;
    --seer-nav-h: 64px;
}

#mirseer-fab {
    position: fixed !important; bottom: 24px !important; right: 24px !important;
    z-index: 2147483647 !important;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%) !important;
    color: #fff !important; border: none !important; padding: 13px 22px !important;
    border-radius: 50px !important; font-size: 14px !important; font-weight: 800 !important;
    cursor: pointer !important; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.5) !important;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    display: flex; align-items: center; gap: 10px; letter-spacing: 0.3px;
}
#mirseer-fab:hover { transform: scale(1.05) translateY(-2px); box-shadow: 0 15px 35px rgba(99, 102, 241, 0.7) !important; }
#mirseer-fab .seer-logo { height: 22px; filter: none; }
#mirseer-fab .seer-logo path,
#mirseer-fab .seer-logo ellipse,
#mirseer-fab .seer-logo circle[r="12"] { stroke: #fff; }
#mirseer-app {
    display: none; position: fixed; inset: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at 50% 0%, #151c33 0%, var(--seer-bg) 80%);
    color: var(--seer-text); z-index: 2147483646; overflow-x: hidden; overflow-y: auto; box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
    scroll-behavior: auto;
}
#mirseer-app * { box-sizing: border-box; }

.seer-nav {
    position: sticky; top: 0; height: var(--seer-nav-h);
    background: rgba(7, 9, 14, 0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--seer-border); padding: 0 32px;
    display: flex; align-items: center; justify-content: space-between; gap: 20px; z-index: 100;
}
.seer-brand {
    font-size: 21px; font-weight: 900; letter-spacing: -0.5px;
    display: flex; align-items: center; gap: 10px; cursor: pointer;
}
.seer-brand > span {
    background: linear-gradient(135deg, #818cf8, #c084fc, #f472b6);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.seer-logo { height: 30px; width: auto; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(139,92,246,0.5)); }
.seer-menu-btn {
    display: none; background: rgba(255,255,255,0.06); border: 1px solid var(--seer-border);
    color: #fff; width: 38px; height: 38px; border-radius: 9px; font-size: 18px; cursor: pointer;
}
.seer-search-wrap { display: flex; align-items: center; position: relative; flex: 1; max-width: 680px; gap: 8px; }
.seer-search {
    flex: 1; min-width: 0; padding: 10px 42px 10px 16px; border-radius: 10px;
    background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border);
    color: #fff; font-size: 13px; outline: none; transition: all 0.2s;
}
.seer-search:focus { background: rgba(255,255,255,0.08); border-color: var(--seer-accent); box-shadow: 0 0 0 3px var(--seer-accent-glow); }
.seer-search-btn { position: absolute; right: 10px; background: none; border: none; color: var(--seer-text-muted); cursor: pointer; font-size: 15px; padding: 4px; }
.seer-search-filter, .seer-sort-select {
    flex-shrink: 0; padding: 10px 10px; border-radius: 10px; background: rgba(255,255,255,0.05);
    border: 1px solid var(--seer-border); color: #fff; font-size: 12.5px; font-weight: 600;
    outline: none; cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.seer-search-filter { max-width: 190px; }
.seer-sort-select { padding: 7px 10px; }
.seer-search-filter:focus, .seer-sort-select:focus, .seer-search-filter:hover, .seer-sort-select:hover { border-color: var(--seer-accent); background: rgba(255,255,255,0.08); }
.seer-search-filter option, .seer-sort-select option { background: #0e1424; color: #f8fafc; }
.seer-search-filter option:disabled { color: #64748b; }
.seer-exit-btn {
    background: rgba(255,255,255,0.06); border: 1px solid var(--seer-border); color: #fff;
    font-weight: 700; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 13px;
}
.seer-exit-btn:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); color: #f87171; }

.seer-shell { display: flex; align-items: flex-start; max-width: 1760px; margin: 0 auto; }
.seer-sidebar {
    position: sticky; top: var(--seer-nav-h); align-self: flex-start; width: 252px; flex-shrink: 0;
    max-height: calc(100vh - var(--seer-nav-h)); overflow-y: auto;
    padding: 18px 14px 40px 20px; border-right: 1px solid var(--seer-border);
}
.seer-modal-left img { object-fit: contain !important; }
.seer-sidebar { scrollbar-width: none; }
.seer-sidebar::-webkit-scrollbar { display: none; }
.seer-side-title {
    font-size: 11px; font-weight: 800; letter-spacing: 0.6px; color: var(--seer-text-muted);
    margin: 20px 10px 8px; display: flex; align-items: center; gap: 6px;
}
.seer-side-title:first-child { margin-top: 4px; }
.seer-side-item {
    display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
    background: transparent; border: 1px solid transparent; color: #cbd5e1;
    padding: 9px 12px; border-radius: 9px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
}
.seer-side-item .ico { width: 22px; text-align: center; font-size: 16px; flex-shrink: 0; }
.seer-side-item .lbl { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seer-side-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
.seer-side-item.active { background: var(--seer-accent); color: #fff; box-shadow: 0 4px 12px var(--seer-accent-glow); }
.seer-side-item.disabled { opacity: 0.4; cursor: not-allowed; }
.seer-side-item.disabled:hover { background: transparent; color: #cbd5e1; }
.seer-side-msg { color: var(--seer-text-muted); font-size: 12.5px; padding: 8px 12px; }

.seer-content { flex: 1; min-width: 0; padding: 24px 28px 10px; }
.seer-header-row {
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
    margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--seer-border);
}
.seer-header-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.seer-count-badge { font-size: 12.5px; color: var(--seer-text-muted); font-weight: 700; background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border); padding: 5px 11px; border-radius: 20px; }
.seer-section-title { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; display: flex; align-items: center; gap: 10px; margin: 0; }
#seer-search-hint:not(:empty) {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: -6px 0 16px;
    font-size: 13px; color: var(--seer-text-muted);
}
.seer-group-title {
    display: flex; align-items: center; justify-content: space-between; margin: 22px 2px 4px;
    padding-bottom: 6px; border-bottom: 1px solid var(--seer-border);
    font-size: 15px; font-weight: 800; color: #e2e8f0;
}
.seer-group-title:first-child { margin-top: 0; }
.seer-group-title em { font-style: normal; font-size: 11.5px; font-weight: 700; color: var(--seer-text-muted); background: rgba(255,255,255,0.06); padding: 2px 9px; border-radius: 20px; }

#seer-hero {
    display: none; position: relative; height: 420px; border-radius: 18px; overflow: hidden;
    margin-bottom: 30px; border: 1px solid var(--seer-border); background: #090e18;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}
.seer-hero-loading { height: 100%; display: flex; align-items: center; justify-content: center; color: var(--seer-text-muted); font-size: 14px; font-weight: 600; }
.seer-hero-slide { position: absolute; inset: 0; opacity: 0; visibility: hidden; transition: opacity 0.7s ease, visibility 0.7s; }
.seer-hero-slide.active { opacity: 1; visibility: visible; }
.seer-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 25%; }
.seer-hero-bg.blur { filter: blur(26px) brightness(0.55) saturate(1.25); transform: scale(1.25); }
.seer-hero-shade {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(7,9,14,0.94) 0%, rgba(7,9,14,0.68) 45%, rgba(7,9,14,0.12) 100%),
                linear-gradient(0deg, rgba(7,9,14,0.88) 0%, transparent 42%);
}
.seer-hero-body { position: relative; height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 30px; padding: 36px 72px; }
.seer-hero-text { max-width: 680px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.seer-hero-kicker {
    align-self: flex-start; font-size: 12px; font-weight: 800; color: #fcd34d;
    background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.35);
    padding: 4px 10px; border-radius: 20px;
}
.seer-hero-title {
    font-size: 38px; font-weight: 900; letter-spacing: -1px; line-height: 1.1; margin: 0;
    color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,0.6);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.seer-hero-chips { display: flex; gap: 7px; flex-wrap: wrap; }
.seer-hero-label { font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: #a5b4fc; margin-bottom: -8px; }
.seer-hero-desc {
    margin: 0; color: #e2e8f0; font-size: 15px; line-height: 1.65;
    display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden;
    text-shadow: 0 2px 12px rgba(0,0,0,0.7);
}
.seer-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
.seer-hero-btn {
    border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color: #fff;
    padding: 12px 22px; border-radius: 10px; font-size: 14px; font-weight: 800; cursor: pointer;
    text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;
}
.seer-hero-btn:hover { background: rgba(255,255,255,0.16); }
.seer-hero-btn.primary { background: linear-gradient(135deg, #6366f1, #a855f7); border-color: transparent; box-shadow: 0 6px 20px rgba(99,102,241,0.45); }
.seer-hero-btn.primary:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(99,102,241,0.65); }

.seer-hero-poster {
    height: 330px; max-width: 480px; flex-shrink: 1; border-radius: 12px; overflow: hidden; display: flex;
    box-shadow: 0 24px 60px rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.14); background: #0a0e17;
}
.seer-hero-poster img { height: 100%; width: auto; max-width: 100%; object-fit: cover; display: block; }
.seer-hero-arrow {
    position: absolute; top: 50%; transform: translateY(-50%); z-index: 5;
    width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--seer-border);
    background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); color: #fff; font-size: 22px; line-height: 1;
    cursor: pointer; transition: all 0.2s;
}
.seer-hero-arrow:hover { background: var(--seer-accent); }
.seer-hero-arrow.prev { left: 14px; }
.seer-hero-arrow.next { right: 14px; }
.seer-hero-dots { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 7px; z-index: 5; }
.seer-hero-dot { width: 8px; height: 8px; border-radius: 8px; background: rgba(255,255,255,0.3); border: none; padding: 0; cursor: pointer; transition: all 0.25s; }
.seer-hero-dot.active { width: 26px; background: #fff; }

.seer-list { display: flex; flex-direction: column; gap: 8px; }
.seer-row {
    background: var(--seer-card); border-radius: var(--seer-radius); border: 1px solid var(--seer-border);
    display: flex; align-items: center; padding: 8px 14px; gap: 16px; cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s; position: relative;
}
.seer-row:hover { background: var(--seer-card-hover); border-color: var(--seer-border-hover); transform: translateX(4px); box-shadow: 0 6px 22px rgba(0,0,0,0.45); }
.seer-poster-wrap {
    height: 74px; min-width: 54px; max-width: 130px; background: #090e18; border-radius: 6px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.06);
}
.seer-poster { height: 100%; width: auto; max-width: 130px; object-fit: cover; border-radius: 5px; display: block; }
.seer-poster-fallback { width: 54px; height: 74px; display: flex; align-items: center; justify-content: center; font-size: 26px; background: linear-gradient(180deg, #182235, #0a0e17); }
.seer-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.seer-title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.seer-title { font-size: 14.5px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: min(750px, 100%); }
.seer-row:hover .seer-title { color: #a5b4fc; }
.seer-tag { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.4px; flex-shrink: 0; }
.tag-4k { background: linear-gradient(135deg, #7c3aed, #9333ea); color: #fff; }
.tag-1080 { background: #2563eb; color: #fff; }
.tag-720 { background: #0284c7; color: #fff; }
.tag-sd { background: #475569; color: #fff; }
.tag-hdr { background: #d946ef; color: #fff; }
.tag-dv { background: #f59e0b; color: #000; }
.tag-season { background: rgba(99,102,241,0.2); color: #c7d2fe; border: 1px solid rgba(99,102,241,0.4); }
.tag-text { background: rgba(148,163,184,0.18); color: #e2e8f0; border: 1px solid rgba(148,163,184,0.35); }
.tag-audio { background: rgba(16,185,129,0.18); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.4); }
.tag-file { background: rgba(14,165,233,0.18); color: #7dd3fc; border: 1px solid rgba(14,165,233,0.4); }
.tag-vers { background: rgba(236,72,153,0.18); color: #f9a8d4; border: 1px solid rgba(236,72,153,0.4); }
.seer-specs-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11.5px; }
.seer-pill { border-radius: 5px; padding: 2px 7px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.seer-pill.audio { color: #34d399; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); }
.seer-pill.subs { color: #fbbf24; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); }
.seer-pill.codec { color: #94a3b8; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); }
.seer-preview { color: var(--seer-text-muted); font-size: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.seer-right-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 90px; flex-shrink: 0; }
.seer-type-label { font-size: 11px; font-weight: 800; color: #cbd5e1; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 6px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seer-year-label { font-size: 11.5px; font-weight: 600; color: var(--seer-text-muted); }
.seer-views-label { font-size: 11.5px; font-weight: 700; color: #a5b4fc; white-space: nowrap; }

#seer-modal-overlay {
    display: none; position: fixed; inset: 0; background: rgba(3,5,9,0.88);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    z-index: 2147483648; align-items: center; justify-content: center; padding: 24px;
}
.seer-detail-window {
    background: #0f1626; border: 1px solid rgba(255,255,255,0.12); border-radius: 18px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(99,102,241,0.2);
    overflow: hidden; position: relative; display: flex; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.seer-detail-window.is-portrait, .seer-detail-window:not(.is-landscape) { flex-direction: row; width: 100%; max-width: 960px; height: 600px; max-height: 92vh; }
.seer-detail-window.is-portrait .seer-modal-left, .seer-detail-window:not(.is-landscape) .seer-modal-left {
    width: 300px; min-width: 260px; height: 100%; background: #070b14; position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center; border-right: 1px solid var(--seer-border); flex-shrink: 0;
}
.seer-detail-window.is-portrait .seer-modal-left img, .seer-detail-window:not(.is-landscape) .seer-modal-left img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.seer-detail-window.is-landscape { flex-direction: column; width: 100%; max-width: 820px; height: auto; max-height: 92vh; }
.seer-detail-window.is-landscape .seer-modal-left {
    width: 100%; height: 220px; min-width: unset; background: #060913; position: relative; overflow: hidden;
    border-right: none; border-bottom: 1px solid var(--seer-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.seer-detail-window.is-landscape .seer-modal-left img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.seer-detail-window.is-landscape .seer-modal-left::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,22,38,0) 55%, #0f1626 100%); pointer-events: none; }
.seer-modal-right { flex: 1; padding: 0; display: flex; flex-direction: column; overflow: hidden; position: relative; min-height: 0; min-width: 0; }
.seer-modal-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 24px 28px 10px; }
.seer-modal-foot {
    flex-shrink: 0; padding: 12px 28px 20px; display: flex; flex-direction: column; gap: 9px;
    border-top: 1px solid var(--seer-border); background: #0f1626;
}
.seer-modal-foot .seer-action-btn, .seer-modal-foot .seer-magnet-box { margin-top: 0 !important; }
.seer-modal-close {
    position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    border: 1px solid var(--seer-border); color: #fff; width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; z-index: 30; transition: all 0.2s;
}
.seer-modal-close:hover { background: #ef4444; transform: scale(1.1); }
.seer-modal-title { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; margin: 0 0 10px 0; padding-right: 40px; color: #fff; line-height: 1.3; }
.seer-modal-metarow { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.seer-meta-pill {
    display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border);
    color: #e2e8f0 !important; font-size: 12px; font-weight: 700; padding: 4px 11px; border-radius: 20px; cursor: pointer;
    text-decoration: none !important; transition: all 0.2s; font-family: inherit;
}
.seer-meta-pill:hover { background: var(--seer-accent); border-color: var(--seer-accent); color: #fff !important; }
.seer-meta-pill small { font-weight: 600; opacity: 0.7; font-size: 11px; }
.seer-chips-row { display: flex; align-items: center; gap: 7px; margin-bottom: 12px; flex-wrap: wrap; }
.seer-chip { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 7px; font-size: 12px; font-weight: 700; color: #e2e8f0; }
.seer-chip.chip-audio { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.35); color: #34d399; }
.seer-chip.chip-subs { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.35); color: #fbbf24; }
.seer-chip.chip-season { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.45); color: #a5b4fc; }
.seer-chip.chip-file { background: rgba(14,165,233,0.15); border-color: rgba(14,165,233,0.4); color: #7dd3fc; }

.seer-specs-ribbon {
    display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 14px; padding: 9px 10px;
    background: rgba(0,0,0,0.25); border: 1px solid var(--seer-border); border-radius: 10px;
}
.seer-specs-ribbon .seer-tag { font-size: 11.5px; padding: 4px 9px; border-radius: 7px; }
.seer-specs-ribbon .seer-chip { padding: 3px 9px; font-size: 11.5px; }
.seer-detail-window.no-specs .seer-specs-ribbon { display: none; }

.seer-version-bar { margin-bottom: 14px; }
.seer-ver-label { display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: var(--seer-accent); margin-bottom: 6px; }
.seer-ver-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.seer-ver-tab {
    background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border); color: #cbd5e1; font-size: 12px; font-weight: 700;
    padding: 5px 12px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.2s;
}
.seer-ver-tab:hover { border-color: var(--seer-accent); color: #fff; }
.seer-ver-tab.active { background: var(--seer-accent); border-color: var(--seer-accent); color: #fff; box-shadow: 0 4px 12px var(--seer-accent-glow); }

.seer-synopsis-box { margin-bottom: 14px; }
.seer-synopsis-head { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: var(--seer-accent); margin-bottom: 5px; }
.seer-synopsis-body { color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0; }
.seer-synopsis-body.clamped { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.seer-syn-toggle { display: none; background: none; border: none; color: #a5b4fc; font-size: 12px; font-weight: 800; cursor: pointer; padding: 5px 0 0; font-family: inherit; }
.seer-syn-toggle:hover { text-decoration: underline; }
.seer-text-box {
    display: none; flex: 1; min-height: 120px; max-height: 340px; overflow-y: auto; margin-bottom: 14px;
    background: rgba(0,0,0,0.25); border: 1px solid var(--seer-border); border-radius: 10px; padding: 14px 16px;
    color: #cbd5e1; font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word;
}
.seer-detail-window.text-mode .seer-text-box { display: block; }
.seer-detail-window.text-mode .seer-synopsis-box { display: none; }
.seer-raw-box { margin: 0 14px 10px; background: rgba(0,0,0,0.35); border-radius: 8px; padding: 8px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #94a3b8; word-break: break-all; border: 1px dashed rgba(255,255,255,0.08); }
.seer-action-btn {
    background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; border: none; padding: 14px 22px;
    border-radius: 10px; font-size: 14.5px; font-weight: 800; cursor: pointer; display: flex;
    align-items: center; justify-content: center; gap: 10px; box-shadow: 0 6px 20px rgba(99,102,241,0.4);
    transition: all 0.2s; width: 100%; margin-top: auto; flex-shrink: 0;
}
.seer-action-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(99,102,241,0.6); }
.seer-action-btn:disabled { opacity: 0.7; cursor: wait; transform: none; }
.seer-action-btn.copied { background: #10b981 !important; box-shadow: 0 6px 20px rgba(16,185,129,0.5) !important; }

.seer-magnet-box { display: none; flex-direction: column; gap: 9px; margin-top: auto; flex-shrink: 0; }
.seer-magnet-box.show { display: flex; }
.seer-magnet-box .seer-action-btn { margin-top: 0; padding: 12px 20px; }
.seer-magnet-list { max-height: 210px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; }
.seer-magnet-item {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    background: rgba(0,0,0,0.28); border: 1px solid var(--seer-border); padding: 7px 10px 7px 12px; border-radius: 9px;
}
.seer-magnet-label { font-size: 12.5px; font-weight: 700; color: #e2e8f0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seer-magnet-copy {
    flex-shrink: 0; background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.45); color: #c7d2fe;
    font-size: 12px; font-weight: 800; padding: 6px 12px; border-radius: 7px; cursor: pointer; transition: all 0.2s;
}
.seer-magnet-copy:hover { background: var(--seer-accent); color: #fff; }
.seer-magnet-copy.copied { background: #10b981; border-color: #10b981; color: #fff; }

.seer-load-btn { background: #151d2e; border: 1px solid rgba(255,255,255,0.12); color: #fff; font-weight: 700; padding: 12px 30px; border-radius: 50px; cursor: pointer; transition: 0.2s; font-size: 13.5px; }
.seer-load-btn:hover { background: var(--seer-accent); border-color: var(--seer-accent); box-shadow: 0 8px 25px var(--seer-accent-glow); }
.seer-status-msg { text-align: center; color: var(--seer-text-muted); padding: 60px 20px; font-size: 15px; }
.seer-status-msg.warn { color: #f59e0b; }
.seer-status-msg.err { color: #ef4444; }

@media (max-width: 980px) {
    .seer-menu-btn { display: block; }
    .seer-nav { padding: 0 16px; }
    .seer-sidebar {
        position: fixed; top: var(--seer-nav-h); left: 0; bottom: 0; width: 276px; max-height: none;
        background: #0a0f1b; z-index: 200; transform: translateX(-100%); transition: transform 0.25s ease;
        box-shadow: 10px 0 40px rgba(0,0,0,0.6);
    }
    .seer-sidebar.open { transform: none; }
    .seer-content { padding: 18px 14px 10px; }
    #seer-hero { height: 480px; }
    .seer-hero-body { padding: 28px 24px 44px; align-items: flex-end; }
    .seer-hero-poster { display: none; }
    .seer-hero-title { font-size: 28px; }
    .seer-hero-arrow { display: none; }
}
@media (max-width: 820px) {
    .seer-detail-window { flex-direction: column !important; height: 92vh !important; }
    .seer-modal-left { width: 100% !important; height: 180px !important; min-width: unset !important; border-right: none !important; border-bottom: 1px solid var(--seer-border) !important; }
    .seer-modal-scroll { padding: 18px 16px 8px; }
    .seer-modal-foot { padding: 10px 16px 16px; }
    .seer-title { max-width: 100%; }
    .seer-search-wrap { max-width: none; }
    .seer-search-filter { max-width: 118px; }
    .seer-exit-btn { padding: 8px 10px; }
}
@media (prefers-reduced-motion: reduce) {
    .seer-hero-slide { transition: none; }
}
`);

GM_addStyle(`
.seer-rl-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 6px; }
.seer-rl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; margin: 10px 0 6px; }
.seer-rl-card {
    display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer; transition: all .2s;
    background: var(--seer-card); border: 1px solid var(--seer-border); border-radius: 12px;
}
.seer-rl-card:hover { background: var(--seer-card-hover); border-color: var(--seer-border-hover); transform: translateY(-2px); }
.seer-rl-av {
    width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex-shrink: 0; font-size: 22px;
    display: flex; align-items: center; justify-content: center; border: 2px solid var(--seer-accent);
    background: linear-gradient(135deg, #312e81, #581c87);
}
.seer-rl-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.seer-rl-meta { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.seer-rl-name { font-weight: 800; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seer-rl-count { font-size: 11.5px; color: var(--seer-text-muted); font-weight: 700; }
.seer-rl-delta { color: #34d399; font-weight: 800; }
.seer-rl-card .seer-facet { padding: 4px 10px; font-size: 11.5px; flex-shrink: 0; }
`);

GM_addStyle(`
.seer-theme-btn {
    background: rgba(255,255,255,0.06); border: 1px solid var(--seer-border); color: #fff;
    width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 16px; flex-shrink: 0; transition: 0.2s;
    display: inline-flex; align-items: center; justify-content: center;
}
.seer-theme-btn:hover { background: rgba(99,102,241,0.25); border-color: var(--seer-accent); }

#mirseer-app.seer-light {
    color-scheme: light;
    --seer-bg: #f4f6fb; --seer-card: #ffffff; --seer-card-hover: #f1f5ff;
    --seer-accent-glow: rgba(99,102,241,0.25);
    --seer-text: #0f172a; --seer-text-muted: #64748b;
    --seer-border: rgba(15,23,42,0.10); --seer-border-hover: rgba(99,102,241,0.5);
    background: radial-gradient(circle at 50% 0%, #e6ebfa 0%, var(--seer-bg) 80%);
}
@media (max-width: 980px) {
    #mirseer-app.seer-light .seer-sidebar { background: #fff; box-shadow: 10px 0 40px rgba(15,23,42,0.15); }
}
`);

GM_addStyle(`
.seer-view-toggle { display: inline-flex; border: 1px solid var(--seer-border); border-radius: 9px; overflow: hidden; flex-shrink: 0; }
.seer-view-toggle button {
    background: rgba(255,255,255,0.05); border: none; color: var(--seer-text-muted);
    padding: 6px 12px; font-size: 15px; line-height: 1.2; cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.seer-view-toggle button:hover { color: #fff; background: rgba(255,255,255,0.1); }
.seer-view-toggle button.active { background: var(--seer-accent); color: #fff; }

.seer-facets { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: -6px 0 16px; }
.seer-facet {
    background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border); color: #cbd5e1;
    font-size: 12.5px; font-weight: 700; padding: 6px 13px; border-radius: 20px; cursor: pointer;
    transition: all 0.2s; font-family: inherit;
}
.seer-facet:hover { border-color: var(--seer-accent); color: #fff; }
.seer-facet.active { background: var(--seer-accent); border-color: var(--seer-accent); color: #fff; box-shadow: 0 4px 12px var(--seer-accent-glow); }
.seer-facet.reset { border-style: dashed; color: #f87171; }
.seer-facet.reset:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.5); color: #f87171; }
.seer-facet-sep { width: 1px; height: 20px; background: var(--seer-border); margin: 0 2px; }

.seer-adv {
    display: none; flex-wrap: wrap; gap: 12px 24px; align-items: center; margin: -6px 0 16px; padding: 12px 16px;
    border: 1px solid var(--seer-border); border-radius: 12px; background: rgba(255,255,255,0.025);
}
.seer-adv.open { display: flex; }
.seer-adv-item { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12.5px; font-weight: 700; color: #cbd5e1; }
.seer-adv-item b { color: #fff; min-width: 32px; display: inline-block; }
.seer-adv input[type=range] { width: 150px; accent-color: var(--seer-accent); cursor: pointer; }
.seer-adv-input {
    width: 84px; padding: 6px 9px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border);
    color: #fff; font-size: 12.5px; outline: none; font-family: inherit;
}
.seer-adv-input.wide { width: 170px; }
.seer-adv-input:focus { border-color: var(--seer-accent); box-shadow: 0 0 0 3px var(--seer-accent-glow); }
.seer-adv-note { font-size: 11.5px; color: var(--seer-text-muted); font-weight: 600; }

.seer-side-count { margin-left: auto; background: rgba(255,255,255,0.1); border-radius: 20px; font-size: 11px; font-weight: 800; padding: 1px 8px; }
.seer-side-count:empty { display: none; }
.seer-side-item.active .seer-side-count { background: rgba(255,255,255,0.25); }

.seer-list.seer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(172px, 1fr)); gap: 16px; }
.seer-grid .seer-group-title, .seer-grid .seer-status-msg { grid-column: 1 / -1; }
.seer-row.is-card { flex-direction: column; align-items: stretch; padding: 0; gap: 0; overflow: hidden; border-radius: 12px; }
.seer-row.is-card:hover { transform: translateY(-4px); }
.is-card .seer-poster-wrap { position: relative; width: 100%; height: auto; max-width: none; min-width: 0; aspect-ratio: 2 / 3; border-radius: 0; border: none; border-bottom: 1px solid var(--seer-border); }
.is-card .seer-poster { width: 100%; height: 100%; max-width: none; object-fit: cover; border-radius: 0; }
.is-card .seer-poster-fallback { width: 100%; height: 100%; font-size: 46px; }
.seer-card-badges { position: absolute; top: 8px; left: 8px; z-index: 2; display: flex; gap: 4px; flex-wrap: wrap; max-width: calc(100% - 54px); }
.seer-card-badges .seer-tag { box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
.is-card .seer-info { padding: 10px 12px 4px; gap: 4px; flex: 0 0 auto; }
.is-card .seer-title { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 13.5px; line-height: 1.3; max-width: 100%; }
.seer-card-meta { display: flex; justify-content: space-between; gap: 8px; padding: 0 12px 11px; font-size: 11.5px; color: var(--seer-text-muted); font-weight: 600; }
.seer-card-meta span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seer-card-meta span:last-child { color: #a5b4fc; white-space: nowrap; font-weight: 700; }

.seer-fav-btn {
    background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border); color: #fcd34d;
    width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 15px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; padding: 0;
}
.seer-fav-btn:hover { background: rgba(245,158,11,0.3); transform: scale(1.12); }
.seer-fav-btn.on { background: rgba(245,158,11,0.25); border-color: rgba(245,158,11,0.6); }
.is-card .seer-fav-btn { position: absolute; top: 8px; right: 8px; z-index: 3; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); }
.is-card .seer-fav-btn.on { background: rgba(245,158,11,0.45); }

.seer-row.is-seen { opacity: 0.58; }
.seer-row.is-seen:hover { opacity: 1; }
.tag-seen { background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.45); }

.seer-chip.chip-vote { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); color: #fbbf24; }

.seer-modal-tools { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
.seer-tool-btn {
    background: rgba(255,255,255,0.06); border: 1px solid var(--seer-border); color: #e2e8f0 !important;
    font-size: 12px; font-weight: 700; padding: 6px 13px; border-radius: 20px; cursor: pointer;
    text-decoration: none !important; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit;
}
.seer-tool-btn.on { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.55); color: #fcd34d !important; }
.seer-tool-btn:hover { background: rgba(99,102,241,0.3); border-color: var(--seer-accent); color: #fff !important; }
.seer-tool-btn.trailer { background: linear-gradient(135deg, #ef4444, #f97316); border-color: transparent; color: #fff !important; }
.seer-tool-btn.trailer:hover { filter: brightness(1.1); }
.seer-ext-wrap { position: relative; margin-left: auto; }
.seer-ext-menu {
    display: none; position: absolute; bottom: calc(100% + 8px); right: 0; min-width: 150px; flex-direction: column; gap: 2px;
    background: #151f36; border: 1px solid var(--seer-border); border-radius: 12px; padding: 6px; z-index: 40;
    box-shadow: 0 14px 34px rgba(0,0,0,0.6);
}
.seer-ext-menu.open { display: flex; }
.seer-ext-menu a {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; font-size: 12.5px; font-weight: 700;
    color: #e2e8f0 !important; text-decoration: none !important; white-space: nowrap;
}
.seer-ext-menu a:hover { background: var(--seer-accent); color: #fff !important; }

.seer-mediainfo { margin-bottom: 8px; border: 1px solid var(--seer-border); border-radius: 10px; background: rgba(0,0,0,0.25); }
.seer-mediainfo summary { cursor: pointer; padding: 10px 14px; font-size: 12.5px; font-weight: 800; color: #e2e8f0; list-style: none; user-select: none; }
.seer-mediainfo summary::-webkit-details-marker { display: none; }
.seer-mediainfo summary::before { content: '▸ '; }
.seer-mediainfo[open] summary::before { content: '▾ '; }
.seer-mediainfo pre {
    margin: 0; padding: 0 14px 14px; max-height: 260px; overflow: auto; font-size: 11px; line-height: 1.5;
    color: #94a3b8; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre; background: transparent; border: none;
}

.seer-rel-panel {
    display: none; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 22px; padding: 18px 22px;
    background: var(--seer-card); border: 1px solid var(--seer-border); border-radius: 16px;
}
.seer-rel-panel.show { display: flex; }
.seer-rel-back {
    align-self: flex-start; background: rgba(255,255,255,0.06); border: 1px solid var(--seer-border); color: #e2e8f0;
    font-size: 12.5px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: 0.2s;
}
.seer-rel-back:hover { background: var(--seer-accent); border-color: var(--seer-accent); color: #fff; }
.seer-rel-avatar {
    width: 84px; height: 84px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    font-size: 38px; background: linear-gradient(135deg, #312e81, #581c87); border: 2px solid rgba(139,92,246,0.6);
}
.seer-rel-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.seer-rel-info { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1 1 260px; }
.seer-rel-name { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.4px; }
.seer-rel-total { font-size: 13px; color: var(--seer-text-muted); font-weight: 700; }
.seer-rel-pills { display: flex; gap: 8px; flex-wrap: wrap; }

#seer-trailer-overlay {
    display: none; position: fixed; inset: 0; background: rgba(3,5,9,0.93); z-index: 2147483650;
    align-items: center; justify-content: center; flex-direction: column; gap: 12px; padding: 24px;
}
.seer-trailer-bar { width: 100%; max-width: 960px; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #fff; font-weight: 800; font-size: 15px; }
.seer-trailer-bar a { color: #a5b4fc !important; font-size: 12.5px; font-weight: 700; text-decoration: none !important; white-space: nowrap; }
.seer-trailer-bar .seer-modal-close { position: static; flex-shrink: 0; }
.seer-trailer-frame { width: 100%; max-width: 960px; aspect-ratio: 16 / 9; border: 0; border-radius: 14px; background: #000; box-shadow: 0 30px 80px rgba(0,0,0,0.9); }

#seer-toasts {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 2147483651;
    display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; width: max-content; max-width: 92vw;
}
.seer-toast {
    background: #1e293b; color: #f8fafc; border: 1px solid rgba(255,255,255,0.16); padding: 10px 18px; border-radius: 12px;
    font-size: 13px; font-weight: 700; box-shadow: 0 10px 30px rgba(0,0,0,0.5); animation: seerToastIn 0.25s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; max-width: 92vw;
}
.seer-toast.ok { border-color: rgba(16,185,129,0.6); }
.seer-toast.warn { border-color: rgba(245,158,11,0.7); }
.seer-toast.err { border-color: rgba(239,68,68,0.7); }
@keyframes seerToastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.seer-kbd-help { margin: 0; font-size: 12.5px; line-height: 1.7; color: var(--seer-text-muted); }
.seer-kbd-help kbd { background: rgba(255,255,255,0.08); border: 1px solid var(--seer-border); border-bottom-width: 2px; border-radius: 5px; padding: 1px 6px; font-size: 11.5px; font-family: ui-monospace, Menlo, monospace; color: #e2e8f0; }

@media (max-width: 560px) {
    .seer-list.seer-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .seer-modal-tools .seer-tool-btn { flex: 1 1 auto; justify-content: center; }
    .seer-ext-wrap { margin-left: 0; }
}
`);

const LIGHT_RULES = `
.seer-nav{background:rgba(255,255,255,.88);}
.seer-menu-btn,.seer-exit-btn,.seer-theme-btn{background:rgba(15,23,42,.05);color:#0f172a;}
.seer-exit-btn:hover{background:rgba(239,68,68,.12);color:#dc2626;}
.seer-theme-btn:hover{background:rgba(99,102,241,.15);}
.seer-search,.seer-search-filter,.seer-sort-select{background:rgba(15,23,42,.04);color:#0f172a;}
.seer-search:focus,.seer-search-filter:hover,.seer-sort-select:hover,.seer-search-filter:focus,.seer-sort-select:focus{background:#fff;}
.seer-search-filter option,.seer-sort-select option{background:#fff;color:#0f172a;}
.seer-search-filter option:disabled{color:#94a3b8;}
.seer-side-item{color:#334155;}
.seer-side-item:hover{background:rgba(15,23,42,.06);color:#0f172a;}
.seer-side-item.active{background:var(--seer-accent);color:#fff;}
.seer-side-item.disabled:hover{background:transparent;color:#334155;}
.seer-count-badge,.seer-group-title em{background:rgba(15,23,42,.05);}
.seer-group-title{color:#1e293b;}
.seer-row{box-shadow:0 1px 3px rgba(15,23,42,.06);}
.seer-row:hover{box-shadow:0 6px 22px rgba(15,23,42,.12);}
.seer-poster-wrap{background:#e2e8f0;border-color:rgba(15,23,42,.08);}
.seer-poster-fallback{background:linear-gradient(180deg,#e2e8f0,#cbd5e1);}
.seer-title{color:#0f172a;}
.seer-row:hover .seer-title{color:#4f46e5;}
.seer-type-label{color:#334155;background:rgba(15,23,42,.06);}
.seer-views-label{color:#4f46e5;}
.seer-pill.audio{color:#047857;background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.35);}
.seer-pill.subs{color:#b45309;background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.4);}
.seer-pill.codec{color:#475569;background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.1);}
.tag-season{color:#4338ca;}
.tag-text{color:#334155;}
.tag-audio{color:#047857;}
.tag-file{color:#0369a1;}
.tag-seen{color:#047857;}
.tag-vers{color:#be185d;}
.seer-load-btn{background:#fff;border-color:rgba(15,23,42,.15);color:#0f172a;}
.seer-load-btn:hover{background:var(--seer-accent);border-color:var(--seer-accent);color:#fff;}

#seer-hero{background:#e8edfb;box-shadow:0 20px 50px rgba(15,23,42,.18);}
.seer-hero-bg.blur{filter:blur(26px) brightness(1.08) saturate(1.1);}
.seer-hero-shade{background:linear-gradient(90deg,rgba(244,246,251,.96) 0%,rgba(244,246,251,.78) 45%,rgba(244,246,251,.10) 100%),linear-gradient(0deg,rgba(244,246,251,.9) 0%,transparent 42%);}
.seer-hero-title{color:#0f172a;text-shadow:none;}
.seer-hero-kicker{color:#92400e;background:rgba(245,158,11,.18);border-color:rgba(217,119,6,.4);}
.seer-hero-label{color:#4f46e5;}
.seer-hero-desc{color:#334155;text-shadow:none;}
.seer-hero-btn{background:rgba(15,23,42,.06);border-color:rgba(15,23,42,.15);color:#0f172a;}
.seer-hero-btn:hover{background:rgba(15,23,42,.12);}
.seer-hero-btn.primary,.seer-hero-btn.primary:hover{background:linear-gradient(135deg,#6366f1,#a855f7);border-color:transparent;color:#fff;}
.seer-hero-poster{box-shadow:0 24px 60px rgba(15,23,42,.35);border-color:rgba(15,23,42,.15);}
.seer-hero-arrow{background:rgba(255,255,255,.75);color:#0f172a;border-color:rgba(15,23,42,.12);}
.seer-hero-arrow:hover{background:var(--seer-accent);color:#fff;}
.seer-hero-dot{background:rgba(15,23,42,.25);}
.seer-hero-dot.active{background:#0f172a;}

.seer-chip{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.1);color:#1e293b;}
.seer-chip.chip-audio{color:#047857;}
.seer-chip.chip-subs{color:#b45309;}
.seer-chip.chip-season{color:#4338ca;}
.seer-chip.chip-file{color:#0369a1;}
.seer-chip.chip-vote{color:#b45309;}

#seer-modal-overlay{background:rgba(15,23,42,.45);}
.seer-detail-window{background:#fff;border-color:rgba(15,23,42,.12);box-shadow:0 30px 80px rgba(15,23,42,.35),0 0 40px rgba(99,102,241,.12);}
.seer-modal-left{background:#e2e8f0;}
.seer-detail-window.is-landscape .seer-modal-left::after{background:linear-gradient(180deg,rgba(255,255,255,0) 55%,#fff 100%);}
.seer-modal-foot{background:#fff;}
.seer-modal-close{background:rgba(255,255,255,.85);color:#0f172a !important;border-color:rgba(15,23,42,.15);}
.seer-modal-close:hover{background:#ef4444;color:#fff !important;}
.seer-meta-pill{background:rgba(15,23,42,.05);color:#1e293b !important;}
.seer-meta-pill:hover{background:var(--seer-accent);color:#fff !important;}
.seer-modal-title{color:#0f172a;}
.seer-specs-ribbon,.seer-text-box,.seer-magnet-item{background:rgba(15,23,42,.04);}
.seer-magnet-label{color:#0f172a;}
.seer-ver-tab{background:rgba(15,23,42,.05);color:#334155;}
.seer-ver-tab:hover{color:#0f172a;}
.seer-ver-tab.active{background:var(--seer-accent);color:#fff;}
.seer-synopsis-body,.seer-text-box{color:#334155;}
.seer-syn-toggle{color:#4f46e5;}
.seer-raw-box{background:rgba(15,23,42,.04);border-color:rgba(15,23,42,.12);color:#64748b;}
.seer-magnet-copy{color:#4338ca;}
.seer-magnet-copy:hover,.seer-magnet-copy.copied{color:#fff;}

.seer-view-toggle button{background:rgba(15,23,42,.05);}
.seer-view-toggle button:hover{background:rgba(15,23,42,.1);color:#0f172a;}
.seer-view-toggle button.active{background:var(--seer-accent);color:#fff;}
.seer-facet{background:rgba(15,23,42,.05);color:#334155;}
.seer-facet:hover{color:#0f172a;}
.seer-facet.active,.seer-facet.active:hover{color:#fff;}
.seer-facet.reset,.seer-facet.reset:hover{color:#dc2626;}
.seer-adv{background:rgba(15,23,42,.03);}
.seer-adv-item{color:#334155;}
.seer-adv-item b{color:#0f172a;}
.seer-adv-input{background:rgba(15,23,42,.04);color:#0f172a;}
.seer-side-count{background:rgba(15,23,42,.08);}
.seer-side-item.active .seer-side-count{background:rgba(255,255,255,.25);}
.seer-fav-btn{background:rgba(15,23,42,.05);color:#d97706;}
.seer-fav-btn.on{background:rgba(245,158,11,.2);}
.is-card .seer-fav-btn{background:rgba(255,255,255,.85);}
.is-card .seer-fav-btn.on{background:rgba(253,230,138,.95);}
.seer-tool-btn{background:rgba(15,23,42,.05);color:#1e293b !important;}
.seer-tool-btn.on{background:rgba(245,158,11,.2);color:#b45309 !important;}
.seer-tool-btn:hover{background:var(--seer-accent);color:#fff !important;}
.seer-tool-btn.trailer,.seer-tool-btn.trailer:hover{background:linear-gradient(135deg,#ef4444,#f97316);color:#fff !important;}
.seer-ext-menu{background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.25);}
.seer-ext-menu a{color:#1e293b !important;}
.seer-ext-menu a:hover{background:var(--seer-accent);color:#fff !important;}
.seer-mediainfo{background:rgba(15,23,42,.04);}
.seer-mediainfo summary{color:#1e293b;}
.seer-mediainfo pre{color:#475569;}
.seer-rel-back{background:rgba(15,23,42,.05);color:#1e293b;}
.seer-rel-back:hover{background:var(--seer-accent);color:#fff;}
.seer-kbd-help kbd{background:rgba(15,23,42,.06);color:#0f172a;}
`;
GM_addStyle(LIGHT_RULES.replace(/(^|\})\s*([^{}]+)\{/g, (m, a, sel) =>
    a + sel.split(',').map(s => '#mirseer-app.seer-light ' + s.trim()).join(',') + '{'));

GM_addStyle(`
#seer-settings-overlay {
    display: none; position: fixed; inset: 0; background: rgba(3,5,9,0.88);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    z-index: 2147483649; align-items: center; justify-content: center; padding: 24px;
}
.seer-settings-window {
    position: relative; width: 100%; max-width: 540px; max-height: 85vh; overflow-y: auto;
    background: #0f1626; border: 1px solid rgba(255,255,255,0.12); border-radius: 18px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(99,102,241,0.2);
    display: flex; flex-direction: column;
}
.seer-settings-head {
    position: sticky; top: 0; z-index: 5; flex-shrink: 0; padding: 20px 28px 14px;
    background: #0f1626; border-bottom: 1px solid var(--seer-border);
}
.seer-settings-title { margin: 0; font-size: 20px; font-weight: 800; color: #fff; padding-right: 44px; }
.seer-settings-body { padding: 18px 28px 26px; display: flex; flex-direction: column; gap: 14px; }

.seer-set-group {
    display: flex; flex-direction: column; gap: 11px; padding: 14px 16px; border-radius: 12px;
    background: rgba(255,255,255,0.025); border: 1px solid var(--seer-border);
}
.seer-set-group-title { margin: 0; font-size: 13.5px; font-weight: 800; color: #e2e8f0; display: flex; align-items: center; gap: 8px; }
.seer-set-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.seer-set-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 200px; }
.seer-set-label { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.seer-set-sub { font-size: 11.5px; line-height: 1.4; color: var(--seer-text-muted); font-weight: 500; }

.seer-settings-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--seer-text-muted); }
.seer-settings-input {
    width: 100%; padding: 11px 14px; border-radius: 10px; background: rgba(255,255,255,0.05);
    border: 1px solid var(--seer-border); color: #fff; font-size: 13px; outline: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; transition: all 0.2s;
}
.seer-settings-input:focus { background: rgba(255,255,255,0.08); border-color: var(--seer-accent); box-shadow: 0 0 0 3px var(--seer-accent-glow); }
.seer-settings-help { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--seer-text-muted); }
.seer-settings-help a { color: #a5b4fc; }
.seer-settings-status { min-height: 18px; font-size: 12.5px; font-weight: 700; color: var(--seer-text-muted); }
.seer-settings-status:empty { min-height: 0; }
.seer-settings-status.ok { color: #34d399; }
.seer-settings-status.err { color: #f87171; }
.seer-settings-actions { display: flex; gap: 10px; margin-top: 2px; flex-wrap: wrap; }
.seer-settings-actions .seer-action-btn { margin-top: 0; width: auto; flex: 1; padding: 12px 20px; }
.seer-settings-actions .seer-load-btn { border-radius: 10px; padding: 12px 18px; }

.seer-settings-select {
    flex-shrink: 0; min-width: 210px; max-width: 100%; padding: 9px 10px; border-radius: 10px;
    background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border); color: #fff;
    font-size: 12.5px; font-weight: 600; outline: none; cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.seer-settings-select:hover, .seer-settings-select:focus { border-color: var(--seer-accent); background: rgba(255,255,255,0.08); }
.seer-settings-select:disabled { opacity: 0.45; cursor: not-allowed; }
.seer-settings-select option { background: #0e1424; color: #f8fafc; }

.seer-switch { position: relative; display: inline-block; width: 46px; height: 25px; flex-shrink: 0; }
.seer-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.seer-switch-slider { position: absolute; inset: 0; border-radius: 25px; background: rgba(148,163,184,0.35); cursor: pointer; transition: background 0.2s; }
.seer-switch-slider::before {
    content: ''; position: absolute; width: 19px; height: 19px; left: 3px; top: 3px; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); transition: transform 0.2s;
}
.seer-switch input:checked + .seer-switch-slider { background: var(--seer-accent); }
.seer-switch input:checked + .seer-switch-slider::before { transform: translateX(21px); }
.seer-switch input:focus-visible + .seer-switch-slider { box-shadow: 0 0 0 3px var(--seer-accent-glow); }

.seer-cache-info {
    background: rgba(0,0,0,0.25); border: 1px solid var(--seer-border); border-radius: 10px;
    padding: 10px 14px; font-size: 12.5px; line-height: 1.75; color: #cbd5e1;
}
.seer-cache-info b { color: #fff; }
.seer-danger-btn {
    width: 100%; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); color: #f87171;
    font-weight: 800; font-size: 13px; padding: 11px 16px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
}
.seer-danger-btn:hover, .seer-danger-btn.armed { background: #ef4444; border-color: #ef4444; color: #fff; }

@media (max-width: 560px) {
    .seer-settings-body { padding: 16px 16px 22px; }
    .seer-settings-head { padding: 18px 16px 12px; }
    .seer-settings-select { width: 100%; min-width: 0; }
}

#mirseer-app.seer-light #seer-settings-overlay { background: rgba(15,23,42,.45); }
#mirseer-app.seer-light .seer-settings-window { background: #fff; border-color: rgba(15,23,42,.12); box-shadow: 0 30px 80px rgba(15,23,42,.35); }
#mirseer-app.seer-light .seer-settings-head { background: #fff; }
#mirseer-app.seer-light .seer-settings-title { color: #0f172a; }
#mirseer-app.seer-light .seer-set-group { background: rgba(15,23,42,.03); }
#mirseer-app.seer-light .seer-set-group-title, #mirseer-app.seer-light .seer-set-label { color: #1e293b; }
#mirseer-app.seer-light .seer-settings-input { background: rgba(15,23,42,.04); color: #0f172a; }
#mirseer-app.seer-light .seer-settings-input:focus { background: #fff; }
#mirseer-app.seer-light .seer-settings-help a { color: #4f46e5; }
#mirseer-app.seer-light .seer-settings-select { background: rgba(15,23,42,.04); color: #0f172a; }
#mirseer-app.seer-light .seer-settings-select:hover, #mirseer-app.seer-light .seer-settings-select:focus { background: #fff; }
#mirseer-app.seer-light .seer-settings-select option { background: #fff; color: #0f172a; }
#mirseer-app.seer-light .seer-switch-slider { background: rgba(15,23,42,.25); }
#mirseer-app.seer-light .seer-switch input:checked + .seer-switch-slider { background: var(--seer-accent); }
#mirseer-app.seer-light .seer-cache-info { background: rgba(15,23,42,.04); color: #334155; }
#mirseer-app.seer-light .seer-cache-info b { color: #0f172a; }
#mirseer-app.seer-light .seer-danger-btn { color: #dc2626; background: rgba(239,68,68,.08); }
#mirseer-app.seer-light .seer-danger-btn:hover, #mirseer-app.seer-light .seer-danger-btn.armed { background: #ef4444; border-color: #ef4444; color: #fff; }
`);
GM_addStyle(`
.seer-magnet-box.show {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px;
    padding-top: 2px;
}
.seer-magnet-box .seer-action-btn {
    padding: 11px 12px; font-size: 13px; gap: 8px; line-height: 1.2; text-align: center;
}
.seer-magnet-box #seer-send-all-btn {
    background: rgba(99,102,241,0.14); border: 1px solid rgba(99,102,241,0.45);
    color: #c7d2fe; box-shadow: none;
}
.seer-magnet-box #seer-send-all-btn:hover { background: rgba(99,102,241,0.3); box-shadow: none; }
.seer-magnet-box #seer-send-all-btn.copied { border-color: transparent; color: #fff; }
.seer-magnet-box .seer-magnet-list { grid-column: 1 / -1; max-height: 130px; }

#mirseer-app.seer-light .seer-magnet-box #seer-send-all-btn { color: #4338ca; }
#mirseer-app.seer-light .seer-magnet-box #seer-send-all-btn.copied { color: #fff; }
`);
GM_addStyle(`
:root { --seer-accent-2: #a855f7; }
#mirseer-fab { background: linear-gradient(135deg, var(--seer-accent), var(--seer-accent-2)) !important; }
.seer-action-btn, .seer-hero-btn.primary { background: linear-gradient(135deg, var(--seer-accent), var(--seer-accent-2)); }
#mirseer-app.seer-light .seer-hero-btn.primary, #mirseer-app.seer-light .seer-hero-btn.primary:hover { background: linear-gradient(135deg, var(--seer-accent), var(--seer-accent-2)); }
.seer-tool-btn.primary { background: linear-gradient(135deg, var(--seer-accent), var(--seer-accent-2)); border-color: transparent; color: #fff !important; }
.seer-tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }

#mirseer-app.seer-compact .seer-list { gap: 4px; }
#mirseer-app.seer-compact .seer-row { padding: 4px 10px; gap: 12px; }
#mirseer-app.seer-compact .seer-poster-wrap { height: 52px; min-width: 38px; }
#mirseer-app.seer-compact .seer-poster-fallback { width: 38px; height: 52px; font-size: 20px; }
#mirseer-app.seer-compact .seer-preview { display: none; }
#mirseer-app.seer-compact .seer-list.seer-grid { grid-template-columns: repeat(auto-fill, minmax(138px, 1fr)); gap: 10px; }
#mirseer-app.seer-compact .seer-row.is-card { padding: 0; }
#mirseer-app.seer-compact .is-card .seer-poster-wrap { height: auto; }

@keyframes seerShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.seer-skel-box, .seer-skel-line {
    background: linear-gradient(90deg, rgba(128,128,128,.10) 25%, rgba(128,128,128,.24) 50%, rgba(128,128,128,.10) 75%);
    background-size: 200% 100%; animation: seerShimmer 1.4s linear infinite; border-radius: 6px;
}
.seer-skel-box { width: 100%; height: 100%; min-width: 54px; }
.is-card .seer-skel-box { position: absolute; inset: 0; border-radius: 0; }
.seer-skel-line { height: 12px; margin: 3px 0; }
.seer-skel-line.w80 { width: 80%; } .seer-skel-line.w60 { width: 60%; } .seer-skel-line.w40 { width: 40%; }
.seer-skel-line.tall { height: 36px; }
.seer-row.seer-skel { pointer-events: none; }
.seer-hero-skel { height: 100%; padding: 36px 72px; display: flex; flex-direction: column; justify-content: center; gap: 14px; }

.seer-row { scroll-margin-top: 84px; scroll-margin-bottom: 24px; }
.seer-row.kb-focus { outline: 2px solid var(--seer-accent); outline-offset: 2px; }

.seer-row.sel-mode { padding-left: 50px; }
.seer-row.is-card.sel-mode { padding-left: 0; }
.seer-sel-box {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; border-radius: 6px;
    border: 2px solid var(--seer-text-muted); background: rgba(0,0,0,.35); color: #fff; font-size: 14px; font-weight: 900;
    display: flex; align-items: center; justify-content: center; z-index: 4;
}
.seer-row.is-card .seer-sel-box { top: 10px; left: 10px; transform: none; }
.seer-sel-box.on { background: var(--seer-accent); border-color: var(--seer-accent); }
.seer-row.is-selected { border-color: var(--seer-accent); box-shadow: 0 0 0 2px var(--seer-accent-glow); }
.sel-mode .seer-card-badges { top: 40px; }
#seer-batch-bar {
    display: none; position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 150;
    align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; max-width: 94vw;
    background: #151f36; border: 1px solid var(--seer-border); border-radius: 16px; padding: 10px 14px;
    box-shadow: 0 18px 44px rgba(0,0,0,.6);
}
#seer-batch-bar.show { display: flex; }
.seer-batch-count { font-weight: 800; font-size: 13px; color: #fff; }
.seer-batch-status { font-size: 12px; color: var(--seer-text-muted); font-weight: 700; }

.seer-modal-nav {
    position: absolute; top: 50%; transform: translateY(-50%); width: 46px; height: 46px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,.22); background: rgba(0,0,0,.55); backdrop-filter: blur(8px);
    color: #fff; font-size: 26px; line-height: 1; cursor: pointer; z-index: 5; transition: all .2s;
    display: flex; align-items: center; justify-content: center; padding: 0 0 3px;
}
.seer-modal-nav:hover:not(:disabled) { background: var(--seer-accent); }
.seer-modal-nav:disabled { opacity: .25; cursor: default; }
.seer-modal-nav.prev { left: 18px; } .seer-modal-nav.next { right: 18px; }
@media (max-width: 1100px) { .seer-modal-nav { display: none; } }

.seer-user { position: relative; flex-shrink: 0; }
.seer-user-btn {
    width: 38px; height: 38px; border-radius: 50%; overflow: hidden; padding: 0; cursor: pointer; font-size: 18px; color: #fff;
    border: 2px solid var(--seer-accent); background: linear-gradient(135deg, #312e81, #581c87);
    display: flex; align-items: center; justify-content: center;
}
.seer-user-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
.seer-user-menu {
    display: none; position: absolute; top: calc(100% + 10px); right: 0; min-width: 230px; z-index: 300;
    background: #151f36; border: 1px solid var(--seer-border); border-radius: 14px; padding: 8px; box-shadow: 0 18px 40px rgba(0,0,0,.6);
}
.seer-user-menu.open { display: block; }
.seer-user-head { display: flex; align-items: center; gap: 10px; padding: 8px 10px 10px; margin-bottom: 6px; border-bottom: 1px solid var(--seer-border); }
.seer-user-head img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.seer-user-name { font-weight: 800; font-size: 14px; color: #fff; }
.seer-user-sub { font-size: 11.5px; color: var(--seer-text-muted); }
.seer-user-menu a {
    display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 9px; font-size: 13px; font-weight: 700;
    color: #e2e8f0 !important; text-decoration: none !important;
}
.seer-user-menu a:hover { background: var(--seer-accent); color: #fff !important; }

.seer-wl-panel {
    display: none; margin-bottom: 18px; padding: 14px 18px; gap: 8px; flex-wrap: wrap; align-items: center;
    background: var(--seer-card); border: 1px solid var(--seer-border); border-radius: 14px;
}
.seer-wl-panel.show { display: flex; }
.seer-wl-chip {
    display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,.06); border: 1px solid var(--seer-border);
    border-radius: 20px; padding: 4px 6px 4px 12px; font-size: 12.5px; font-weight: 700;
}
.seer-wl-chip button { background: none; border: none; color: var(--seer-text-muted); cursor: pointer; font-size: 14px; padding: 0 6px; }
.seer-wl-chip button:hover { color: #f87171; }
.seer-wl-empty { font-size: 12.5px; color: var(--seer-text-muted); }
.tag-new { background: linear-gradient(135deg, #ef4444, #f97316); color: #fff; }

.seer-swatches { display: flex; gap: 8px; flex-wrap: wrap; }
.seer-swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
.seer-swatch.on { border-color: #fff; box-shadow: 0 0 0 2px var(--seer-accent); }
#seer-accent-custom { width: 44px; height: 30px; border: none; background: none; cursor: pointer; padding: 0; }

#mirseer-app.seer-light #seer-batch-bar, #mirseer-app.seer-light .seer-user-menu { background: #fff; box-shadow: 0 18px 40px rgba(15,23,42,.25); }
#mirseer-app.seer-light .seer-batch-count, #mirseer-app.seer-light .seer-user-name { color: #0f172a; }
#mirseer-app.seer-light .seer-user-menu a { color: #1e293b !important; }
#mirseer-app.seer-light .seer-user-menu a:hover { color: #fff !important; }
#mirseer-app.seer-light .seer-wl-chip { background: rgba(15,23,42,.05); }
#mirseer-app.seer-light .seer-modal-nav { background: rgba(255,255,255,.85); color: #0f172a; border-color: rgba(15,23,42,.15); }
`);

GM_addStyle(`
.seer-adv-genres { flex: 1 1 100%; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.seer-adv-genres:empty { display: none; }
`);

const CACHE_PREFIX = 'mirseer_v25_';
const FREQ_KEY = CACHE_PREFIX + 'imgfreq';
const FILM_FORUM_ID = 26;
const SERIES_FORUM_ID = 28;

const MAX_CONCURRENT = IS_COARSE ? 3 : 6;
const CANCELLED = Symbol('cancelled');
const THANKS_SELECTOR = 'a[href*="thanks="], a[href*="action=thanks"], a[title*="Grazie"], a[title*="Thanks"], .thanks-icon a';
const SIDE_HIDE_RE = /\b(richiest|regolament|segnalaz|comunicat|annunc|off[\s._-]*topic|presentaz|cestin|archiv|faq|guid|tutorial|staff|reseed)/i;
const MAIN_SUB_EXCLUDE_RE = /\b(richiest|regolament|music|audio|concert|ebook|software|gioch|edic|archivi|cestin|segnalaz|guid|tutorial|faq|comunicat|off[\s._-]*topic|presentaz|discussi)\b/i;

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const SITE_ROOT = location.origin + '/';
const fixUrl = u => String(u || '').replace(/^(https?:\/\/[^\/]+)\/releasers\/(?=(?:viewtopic|viewforum|search|memberlist|ucp|download)\b)/i, '$1/');
const absHref = a => { try { return fixUrl(new URL(a.getAttribute('href'), SITE_ROOT).href); } catch (e) { return fixUrl(a.href || ''); } };
const absUrl = u => { try { return fixUrl(new URL(u, SITE_ROOT).href); } catch (e) { return u || ''; } };
const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let nextNetSlot = 0;
function netGate() {
    const now = Date.now();
    const at = Math.max(now, nextNetSlot);
    nextNetSlot = at + NET_GAP;
    return at > now ? sleep(at - now) : Promise.resolve();
}

const logoSvg = gid => `<svg class="seer-logo" viewBox="0 0 100 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
        <radialGradient id="${gid}" cx="35%" cy="30%" r="80%">
            <stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#4c1d95"/>
        </radialGradient>
    </defs>
    <path d="M4 32 Q50 -8 96 32 Q50 72 4 32 Z" fill="none" stroke="#8b5cf6" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="32" rx="24" ry="19" fill="none" stroke="#8b5cf6" stroke-width="5"/>
    <circle cx="50" cy="32" r="12" fill="url(#${gid})" stroke="#8b5cf6" stroke-width="3"/>
    <circle cx="46" cy="27" r="3.2" fill="#e9d5ff"/>
</svg>`;

const fmtSize = b => {
    b = Number(b) || 0;
    if (!b) return '';
    const u = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let i = 0;
    while (b >= 1024 && i < 4) { b /= 1024; i++; }
    return (b >= 100 ? Math.round(b) : Math.round(b * 10) / 10) + ' ' + u[i];
};
const magnetsSize = mags => {
    let t = 0;
    for (const m of mags || []) { const x = m.uri.match(/[?&]xl=(\d+)/i); if (!x) return 0; t += +x[1]; }
    return t;
};

const fmtViews = n => {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + 'k';
};

function pureCore() {
    const RANGE_SEP = '(?:[-–—+&,~]|\\s+(?:a|e|to)\\s+)';
    const SEASON_RES = {
        ep:       /\bS(\d{1,2})[\s._-]?E(\d{1,3})(?:[\s._-]*(?:-|–|E|~)[\s._-]*E?(\d{1,3}))?\b/i,
        x:        /\b(\d{1,2})x(\d{2,3})\b/i,
        rangeS:   /\bS(\d{1,2})\s*[-–—~+&]\s*S(\d{1,2})\b/i,
        rangeW:   new RegExp('\\b(?:Stagion[ei]|Seasons?)[\\s._]*(\\d{1,2})[\\s._]*' + RANGE_SEP + '[\\s._]*(?:Stagione[\\s._]*|Season[\\s._]*)?(\\d{1,2})\\b', 'i'),
        oneS:     /\bS(\d{1,2})\b/i,
        oneW:     /\b(?:Stagione|Season)[\s._]*(\d{1,2})\b/i,
        ordNum:   /\b(\d{1,2})\s*[ªa°]\s*Stagione\b/i,
        ordWord:  /\b(prima|seconda|terza|quarta|quinta|sesta|settima|ottava|nona|decima)[\s._]+Stagione\b/i,
        episode:  /\b(?:Episodi[oe]?|Ep)\.?[\s._]*(\d{1,3})(?:[\s._]*(?:-|–|a)[\s._]*(\d{1,3}))?\b/i,
        complete: /\b(?:serie[\s._]+completa|complete[\s._]+series|tutte[\s._]+le[\s._]+stagioni|integrale)\b/i
    };
    const ORD_WORDS = { prima: 1, seconda: 2, terza: 3, quarta: 4, quinta: 5, sesta: 6, settima: 7, ottava: 8, nona: 9, decima: 10 };
    const SEASON_STRIP_ORDER = ['ep', 'x', 'rangeS', 'rangeW', 'ordNum', 'ordWord', 'oneW', 'oneS', 'episode', 'complete'];

    function stripSeasonText(s) {
        return SEASON_STRIP_ORDER.reduce((acc, key) => acc.replace(new RegExp(SEASON_RES[key].source, 'gi'), ' '), s);
    }

    function parseSeasonInfo(raw) {
        const n = v => parseInt(v, 10);
        const pad = v => String(n(v)).padStart(2, '0');
        const epLabel = (a, b) => (b && n(b) !== n(a)) ? `Ep. ${n(a)}-${n(b)}` : `Ep. ${n(a)}`;
        let m;

        if ((m = raw.match(SEASON_RES.ep)) || (m = raw.match(SEASON_RES.x))) {
            const s = n(m[1]);
            return {
                kind: 'ep', season: s,
                label: `Stagione ${s} · ${epLabel(m[2], m[3])}`,
                short: `S${pad(s)}E${pad(m[2])}${m[3] && n(m[3]) !== n(m[2]) ? '-' + pad(m[3]) : ''}`
            };
        }
        if ((m = raw.match(SEASON_RES.rangeS)) || (m = raw.match(SEASON_RES.rangeW))) {
            const a = n(m[1]), b = n(m[2]);
            if (b > a) return { kind: 'range', season: a, label: `Stagioni ${a}-${b}`, short: `S${pad(a)}-${pad(b)}` };
        }

        let season = null;
        if ((m = raw.match(SEASON_RES.oneS))) season = n(m[1]);
        else if ((m = raw.match(SEASON_RES.oneW))) season = n(m[1]);
        else if ((m = raw.match(SEASON_RES.ordNum))) season = n(m[1]);
        else if ((m = raw.match(SEASON_RES.ordWord))) season = ORD_WORDS[m[1].toLowerCase()];

        if (season !== null && !isNaN(season)) {
            let label = `Stagione ${season}`;
            const e = raw.match(SEASON_RES.episode);
            if (e) label += ` · ${epLabel(e[1], e[2])}`;
            else if (/\bcomplet[ae]\b/i.test(raw)) label += ' · Completa';
            else if (/\bin[\s._]*corso\b/i.test(raw)) label += ' · In corso';
            return { kind: 'season', season, label, short: `S${pad(season)}${e ? 'E' + pad(e[1]) : ''}` };
        }
        if (SEASON_RES.complete.test(raw)) return { kind: 'complete', season: null, label: 'Serie completa', short: 'COMPLETA' };

        const e = raw.match(SEASON_RES.episode);
        if (e) return { kind: 'episode', season: null, label: epLabel(e[1], e[2]), short: `EP${pad(e[1])}` };
        return null;
    }

    function parseReleaseInfo(rawTitle) {
        const raw = rawTitle.trim();

        const is4k = /\b(4k|2160p|uhd)\b/i.test(raw);
        const is1080p = /\b(1080p|1080i|fhd)\b/i.test(raw);
        const is720p = /\b720p\b/i.test(raw) || (!is4k && !is1080p && /\bhd\b/i.test(raw));
        const isH265 = /\b(x265|hevc|h\.?265)\b/i.test(raw);
        const isH264 = /\b(x264|avc|h\.?264)\b/i.test(raw);
        const isAv1 = /\b(av1)\b/i.test(raw);
        const is10bit = /\b(10bit|10-bit)\b/i.test(raw);

        const isDV = /\b(dv|dolby\s*vision)\b/i.test(raw);
        const isHDR10Plus = /\b(hdr10\+|hdr10plus)\b/i.test(raw);
        const isHDR = /\b(hdr|hdr10)\b/i.test(raw) || isHDR10Plus;

        let source = 'Rip';
        if (/\bremux\b/i.test(raw)) source = 'Remux';
        else if (/\b(uhd[\s.-]*bluray|ultra[\s.-]*hd[\s.-]*bluray)\b/i.test(raw)) source = 'UHD BluRay';
        else if (/\b(bluray|bdrip|brrip)\b/i.test(raw)) source = 'BluRay';
        else if (/\b(web-dl|webdl|webrip|hmax|nf|amzn|dsnp|atvp)\b/i.test(raw)) source = 'WEB-DL';
        else if (/\b(hdtv|tvrip|satrip|dvb)\b/i.test(raw)) source = 'HDTV';
        else if (/\b(dvdrip|dvd)\b/i.test(raw)) source = 'DVDRip';

        const audioLangs = [];
        const rawAudio = raw.replace(/\b(?:sub[\s._-]*(?:ita|eng|fra|spa|ger|multi|forced)|multi[\s._-]*sub)\b/gi, ' ');
        if (/\b(ita|italian|italiano)\b/i.test(rawAudio)) audioLangs.push('ITA');
        if (/\b(eng|english|inglese)\b/i.test(rawAudio)) audioLangs.push('ENG');
        if (/\b(jap|japanese|giapponese)\b/i.test(rawAudio)) audioLangs.push('JAP');
        if (/\b(fra|fre|french|francese)\b/i.test(rawAudio)) audioLangs.push('FRA');
        if (/\b(spa|spanish|spagnolo)\b/i.test(rawAudio)) audioLangs.push('SPA');
        if (/\b(ger|german|tedesco)\b/i.test(rawAudio)) audioLangs.push('GER');
        if (/\b(multi|multiaudio|dual|dual[\s.-]*audio)\b/i.test(rawAudio) && audioLangs.length === 0) audioLangs.push('MULTI');

        let audioCodec = '';
        if (/\b(atmos|dolby[\s.-]*atmos)\b/i.test(raw)) audioCodec = 'Atmos';
        else if (/\b(truehd|true-hd)\b/i.test(raw)) audioCodec = 'TrueHD';
        else if (/\b(dts-hd[\s.-]*ma|dts-ma)\b/i.test(raw)) audioCodec = 'DTS-HD MA';
        else if (/\b(dts-hd)\b/i.test(raw)) audioCodec = 'DTS-HD';
        else if (/\b(dts)\b/i.test(raw)) audioCodec = 'DTS';
        else if (/\b(?:ddp|e-?ac3|eac3)(?![a-z])|\bdd\+/i.test(raw)) audioCodec = 'E-AC3';
        else if (/\b(ac3|dd5\.1|dd2\.0|dolby[\s.-]*digital)\b/i.test(raw)) audioCodec = 'AC3';
        else if (/\b(aac|aac2\.0)\b/i.test(raw)) audioCodec = 'AAC';
        else if (/\b(flac)\b/i.test(raw)) audioCodec = 'FLAC';

        let channels = '';
        if (/(?:^|[^\d.])7\.1(?!\d)/.test(raw)) channels = '7.1';
        else if (/(?:^|[^\d.])5\.1(?!\d)/.test(raw)) channels = '5.1';
        else if (/(?:^|[^\d.])2\.0(?!\d)/.test(raw)) channels = '2.0';

        const audioFormatted = audioLangs.length > 0
            ? `${audioLangs.join('/')}${audioCodec ? ' (' + audioCodec + (channels ? ' ' + channels : '') + ')' : ''}`
            : (audioCodec ? `${audioCodec} ${channels}`.trim() : 'ITA');

        const subLangs = [];
        const hasSubIta = /\b(sub[\s._-]*ita|subita|ita[\s._-]*sub)\b/i.test(raw);
        const hasSubEng = /\b(sub[\s._-]*eng|subeng|eng[\s._-]*sub)\b/i.test(raw);
        const hasMultiSub = /\b(multisub|multi[\s._-]*sub|sub[\s._-]*multi)\b/i.test(raw);
        const hasForced = /\b(forced|forzati|sub[\s._-]*forced)\b/i.test(raw);
        if (hasSubIta) subLangs.push('ITA');
        if (hasSubEng) subLangs.push('ENG');
        if (hasMultiSub) subLangs.push('Multi');
        if (hasForced) subLangs.push('Forzati');

        const subsFormatted = subLangs.length > 0
            ? subLangs.join(' + ')
            : (/\b(softsub|hardsub|subbed)\b/i.test(raw) ? 'Inclusi' : 'Non specificati');

        const season = parseSeasonInfo(raw);
        const isTvSeries = (!!season && season.kind !== 'episode') || /\bserie[\s._]*tv\b|\bepisod/i.test(raw);
        const yearMatch = raw.match(/[(\[]\s*(19\d\d|20\d\d)\s*[)\]]/) || raw.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '';

        let headRaw = raw;
        if (yearMatch && yearMatch.index > 0) {
            const head = raw.slice(0, yearMatch.index);
            if (/[A-Za-z\u00C0-\u00FF0-9]{2}/.test(head)) headRaw = head;
        }
        let clean = headRaw.replace(/^\[[^\]]+\]/g, '').replace(/\[.*?\]|\(.*?\)/g, '');
        clean = stripSeasonText(clean)
            .replace(/-MirCrew|-SpyRo|-NovaRip|-TNTVillage|\bMirCrew\b/gi, '')
            .replace(/\b(stagion[ei]|seasons?|completa|complete|pack|in\s*corso|integrale|episodi[oe]?)\b/gi, ' ')
            .replace(/\b(?:dts-hd[\s.-]*ma|dts-hd|dts-ma|dts)(?:[\s.-]?\d\.\d)?(?!\w)/gi, '')
            .replace(/\b(?:ddp|dd\+|dd(?=[\s.-]?\d\.\d)|e-?ac3|eac3|ac3|truehd|true-hd|atmos|aac|flac|mp3)(?:[\s.-]?\d\.\d)?(?!\w)/gi, '')
            .replace(/\b(2160p|4k|1080p|1080i|720p|576p|480p|uhd|fhd|hd)\b/gi, '')
            .replace(/\b(remux|uhd[\s.-]*bluray|bluray|bdrip|brrip|web-dl|webdl|webrip|hdtv|dvdrip|dvd)\b/gi, '')
            .replace(/\b(x265|x264|hevc|avc|av1|h\.?264|h\.?265|10bit|10-bit)\b/gi, '')
            .replace(/\b(xvid|divx|sd|pdtv|dsr|hdrip|tvrip|satrip|dvbrip|pir8)\b/gi, '')
            .replace(/\b(?:hdr10\+|hdr10plus|hdr10|hdr|dolby[\s.-]*vision|dv|sdr)(?!\w)/gi, '')
            .replace(/\b(dts-hd[\s.-]*ma|dts-hd|dts|truehd|atmos|ddp|eac3|ac3|aac|flac|mp3|5\.1|7\.1|2\.0)\b/gi, '')
            .replace(/\b(?:amzn|dsnp|atvp|hmax|pcok|hulu|nf)\b/gi, '')
            .replace(/\b(sub[\s._-]*(?:ita|eng|multi|forced)|subita|subeng|multisub|softsub|hardsub)\b/gi, '')
            .replace(/\b(ita|eng|italian|english|japanese|jap|fra|spa|ger|multi|dual)\b/gi, '')
            .replace(/[.\-_]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();

        const baseTitle = clean || raw;
        const yearTag = (year && !new RegExp('(?:^|\\D)' + year + '(?!\\d)').test(baseTitle)) ? ' (' + year + ')' : '';
        const displayTitle = (isTvSeries && season) ? `${baseTitle}${yearTag} – ${season.label}` : baseTitle + yearTag;

        return {
            cleanTitle: baseTitle, displayTitle, season, isTvSeries,
            is4k, is1080p, is720p, isH265, isH264, isAv1, is10bit, isHDR, isDV,
            source, audioFormatted, subsFormatted, audioLangs, subLangs,
            audioCodec: audioCodec || 'Standard', year
        };
    }

    const letterCount = s => (String(s).match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;
    function isRealProse(s) {
        if (!s) return false;
        const t = String(s).trim();
        const letters = letterCount(t);
        return letters >= 38 && letters / t.length >= 0.6;
    }

    function stripDividers(text) {
        return text
            .split('\n')
            .filter(l => !(l.trim().length >= 3 && !/[A-Za-z0-9À-ÿ]/.test(l)))
            .join('\n')
            .replace(/[-=~_*#]{4,}/g, ' ')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n');
    }

    const SYN_HEAD = '(?:Trama|Sinossi|Plot|Storyline|Overview|Descrizione)';
    const SYN_STOP = '(?:Scheda\\s*Tecnica|Dati\\s*Tecnici|Info\\s*Release|Cast|Screenshots?|Audio\\s*:|Video\\s*:|Regia|Genere|Durata|Formato|Lingua|Sottotitoli|Download|Magnet|Dimensione|Qualit[aà]|Release|Specifiche|Tracklist|Mediainfo|General|Titolo)';
    const SYN_RE = new RegExp('(?:^|\\n)\\s*[^\\w\\n]{0,4}' + SYN_HEAD + '\\b\\s*(?:del\\s+film|della\\s+serie)?\\s*[:\\-–]?\\s*([\\s\\S]+?)(?=\\n\\s*' + SYN_STOP + '\\b|$)', 'i');
    const SPEC_START_RE = /^(scheda|dati|risoluzione|formato|lingua|grazie|dimensione|anno|audio|video|general|titolo|qualit|sottotit|durata|genere|regia|cast|release|source|magnet|screenshot|nazione|paese|codec)/i;

    function extractSynopsis(fullText) {
        const text = stripDividers(fullText || '');
        const m = text.match(SYN_RE);
        if (m) {
            const paras = m[1].split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
            let acc = '';
            for (const p of paras) {
                acc += (acc ? ' ' : '') + p;
                if (letterCount(acc) >= 40) break;
            }
            if (isRealProse(acc)) return acc.slice(0, 900);
        }
        const paragraphs = text.split(/\n\s*\n/).map(t => t.replace(/\s+/g, ' ').trim()).filter(t =>
            isRealProse(t) && !SPEC_START_RE.test(t) && (t.match(/:/g) || []).length < 4 && !/(?:Format|Bitrate|Bit rate|Codec)\s*:/i.test(t));
        return paragraphs.length ? paragraphs[0].slice(0, 900) : null;
    }

    const FIELD_RES = {
        orig:    /TITOLO\s*ORIGINALE\s*:\s*([^\n]+)/i,
        year:    /\bANNO\s*:\s*((?:19|20)\d{2})/i,
        genre:   /\bGENERE\s*:\s*([^\n]+)/i,
        country: /\b(?:PAESE|NAZIONE)\s*:\s*([^\n]+)/i
    };
    function parsePostFields(text) {
        const t = text || '';
        const g = re => { const m = t.match(re); return m ? m[1].trim() : null; };
        const orig = g(FIELD_RES.orig);
        return {
            origTitle: orig ? orig.replace(/[\[(].*?[\])]/g, '').trim().slice(0, 120) || null : null,
            fieldYear: g(FIELD_RES.year),
            genre: (g(FIELD_RES.genre) || '').slice(0, 80) || null,
            country: (g(FIELD_RES.country) || '').slice(0, 80) || null
        };
    }

    const MEDIAINFO_MARKERS = [/Complete name/i, /Format\s*(?:profile|\/Info|settings)?\s*:/i, /Bit ?rate/i, /Duration/i, /Frame rate/i, /Codec ID/i, /Channel\(s\)/i, /\bWidth\s*:/i, /\bLanguage\s*:/i, /Unique ID/i, /File size/i];
    const looksLikeMediaInfo = t => !!t && MEDIAINFO_MARKERS.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0) >= 3;

    function extractMediaInfoText(t) {
        t = t || '';
        if (/Complete name\s*:/i.test(t)) {
            const gi = t.search(/(?:^|\n)\s*(?:General|Generale)\s*\n/i);
            const start = gi >= 0 ? gi : Math.max(0, t.search(/Complete name\s*:/i) - 40);
            return t.slice(start, start + 10000).trim() || null;
        }
        return null;
    }

    const SIZE_UNITS = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1048576, gib: 1073741824, tib: 1099511627776 };
    const sizeToBytes = (num, unit) => {
        const n = parseFloat(String(num).replace(/\s/g, '').replace(',', '.'));
        const u = SIZE_UNITS[String(unit).toLowerCase()];
        return n > 0 && u ? Math.round(n * u) : 0;
    };
    function extractSize(text) {
        const t = text || '';
        let m, field = 0, mi = 0;
        if ((m = t.match(/\b(?:DIMENSION[EI]|PESO|SIZE|GRANDEZZA)(?:\s+TOTALE)?\s*:\s*(\d[\d.,]*)\s*(KiB|MiB|GiB|TiB|KB|MB|GB|TB)\b/i))) field = sizeToBytes(m[1], m[2]);
        const re = /File\s*size\s*:\s*(\d[\d\s.,]*?)\s*(KiB|MiB|GiB|TiB|KB|MB|GB|TB)\b/gi;
        while ((m = re.exec(t))) mi += sizeToBytes(m[1], m[2]);
        return { field, mi };
    }

    function processPost(text) {
        const t = text || '';
        const sz = extractSize(t);
        return {
            fields: parsePostFields(t),
            synopsis: extractSynopsis(t),
            body: stripDividers(t).slice(0, 4000) || null,
            miText: extractMediaInfoText(t),
            sizeField: sz.field, sizeMi: sz.mi
        };
    }

    return {
        SEASON_RES, parseSeasonInfo, stripSeasonText, parseReleaseInfo,
        letterCount, isRealProse, stripDividers, extractSynopsis, parsePostFields,
        looksLikeMediaInfo, extractMediaInfoText, processPost
    };
}

const pure = pureCore();
const { SEASON_RES, parseSeasonInfo, isRealProse, stripDividers, looksLikeMediaInfo } = pure;

const WORKER_BODY = 'self.onmessage=function(e){var d=e.data,r;try{if(d.op==="titles")r=d.payload.map(function(t){return core.parseReleaseInfo(t);});else if(d.op==="post")r=core.processPost(d.payload);}catch(err){self.postMessage({id:d.id,error:String(err)});return;}self.postMessage({id:d.id,result:r});};';
let worker = null, workerOff = false, wSeq = 0;
const wPending = new Map();

function pureSync(op, payload) {
    return op === 'titles' ? payload.map(t => pure.parseReleaseInfo(t)) : pure.processPost(payload);
}

function getWorker() {
    if (worker || workerOff) return worker;
    try {
        const src = '(function(){var core=(' + pureCore.toString() + ')();' + WORKER_BODY + '})();';
        const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
        worker = new Worker(url);
        worker.onmessage = e => {
            const p = wPending.get(e.data.id);
            if (!p) return;
            wPending.delete(e.data.id);
            clearTimeout(p.t);
            if (e.data.error) p.fallback(); else p.resolve(e.data.result);
        };
        worker.onerror = () => {
            workerOff = true;
            try { worker.terminate(); } catch (e) {}
            worker = null;
            wPending.forEach(p => { clearTimeout(p.t); p.fallback(); });
            wPending.clear();
        };
    } catch (e) { workerOff = true; worker = null; }
    return worker;
}

function workerCall(op, payload) {
    const w = getWorker();
    if (!w) return Promise.resolve(pureSync(op, payload));
    return new Promise(resolve => {
        const id = ++wSeq;
        const fallback = () => resolve(pureSync(op, payload));
        const t = setTimeout(() => { wPending.delete(id); fallback(); }, 5000);
        wPending.set(id, { resolve, fallback, t });
        try { w.postMessage({ id, op, payload }); }
        catch (e) { wPending.delete(id); clearTimeout(t); fallback(); }
    });
}

const sectionList = SECTIONS.map(s => ({ ...s }));
const forumToSection = new Map(SECTIONS.filter(s => s.fid).map(s => [String(s.fid), s.name]));
const registry = new Map();
const main = { items: [], group: null, loaded: false, exhausted: false };
const sections = new Map();
let view = { key: 'home', section: null };
let search = { active: false, scope: 'scoped', query: '', label: '', items: [], nextUrl: null, sc: null, fuzzy: false };
let rel = null;
let sortMode = 'recent';
let viewToken = 0, searchToken = 0, modalToken = 0;
let currentTopicUrl = null;
let currentModalItem = null;
let modalVersions = [];
let posterObserver = null;
let sidebarLoaded = false, sidebarReady = false;
let lastBaseCount = 0;
let lastBase = [];
let advOpen = false;
const newGx = () => ({ key: '', name: '', items: [], nextUrl: null, exhausted: true, loading: false, mode: 'author' });
let gx = newGx();
let autoBusy = false;
let selMode = false;
const selected = new Set();
let lastSelId = null;
let lastDisplayed = [];
let kbIdx = -1, kbId = null;
let batchBusy = false;
const scrollMemory = new Map();
let wlNew = new Map(), wlChecking = false, wlLastCheck = 0;
let currentUser = null;
let follows = (() => { const f = getPref('follows', {}); return { rel: (f && f.rel) || {}, title: (f && f.title) || {} }; })();

const iconFor = name => { const s = sectionList.find(x => x.name === name); return s ? s.ico : '📁'; };
const typeIcon = item => iconFor(item.type);
const sectionByName = name => { const s = name && sectionList.find(x => x.re && x.re.test(name)); return s ? s.name : null; };

const CACHE_DB = 'mirseer_cache', CACHE_STORE = 'kv', CACHE_MAX = 6000;
const cacheMem = new Map();
const wQueue = new Map();
const dQueue = new Set();
let idbDb = null, idbTimer = null, idbSettled = false;

function idbOpen() {
    return new Promise(resolve => {
        try {
            const rq = indexedDB.open(CACHE_DB, 1);
            rq.onupgradeneeded = () => { try { rq.result.createObjectStore(CACHE_STORE); } catch (e) {} };
            rq.onsuccess = () => resolve(rq.result);
            rq.onerror = () => resolve(null);
            rq.onblocked = () => resolve(null);
        } catch (e) { resolve(null); }
    });
}

const cacheReady = (async () => {
    try {
        idbDb = await idbOpen();
        if (idbDb) {
            idbDb.onversionchange = () => { try { idbDb.close(); } catch (e) {} idbDb = null; };
            await new Promise(res => {
                try {
                    const st = idbDb.transaction(CACHE_STORE, 'readonly').objectStore(CACHE_STORE);
                    const kq = st.getAllKeys(), vq = st.getAll();
                    vq.onsuccess = () => {
                        const ks = kq.result || [], vs = vq.result || [];
                        for (let i = 0; i < ks.length; i++) if (!cacheMem.has(ks[i]) && !dQueue.has(ks[i])) cacheMem.set(ks[i], vs[i]);
                        res();
                    };
                    vq.onerror = () => res();
                } catch (e) { res(); }
            });
        }
    } catch (e) { idbDb = null; }
    idbSettled = true;
})();

const cacheGet = k => (cacheMem.has(k) ? cacheMem.get(k) : null);

function scheduleIdbFlush() { if (!idbTimer) idbTimer = setTimeout(flushIdb, 500); }

function flushIdb() {
    idbTimer = null;
    if (!idbSettled) { scheduleIdbFlush(); return; }
    if (!idbDb) { wQueue.clear(); dQueue.clear(); return; }
    if (!wQueue.size && !dQueue.size) return;
    try {
        const st = idbDb.transaction(CACHE_STORE, 'readwrite').objectStore(CACHE_STORE);
        wQueue.forEach((v, k) => st.put(v, k));
        dQueue.forEach(k => st.delete(k));
    } catch (e) { console.warn('IndexedDB write failed', e); }
    wQueue.clear();
    dQueue.clear();
}

function cacheSet(k, v) {
    cacheMem.set(k, v);
    dQueue.delete(k);
    wQueue.set(k, v);
    scheduleIdbFlush();
    if (cacheMem.size > CACHE_MAX) pruneCache();
    return true;
}

function cacheDel(k) {
    cacheMem.delete(k);
    wQueue.delete(k);
    dQueue.add(k);
    scheduleIdbFlush();
}

function pruneCache() {
    const entries = [];
    cacheMem.forEach((v, k) => {
        if (k === FREQ_KEY || !k.startsWith('mirseer_')) return;
        const m = k.startsWith(CACHE_PREFIX) ? String(v).match(/"t":(\d+)/) : null;
        entries.push([k, m ? +m[1] : 0]);
    });
    entries.sort((a, b) => a[1] - b[1]);
    entries.slice(0, Math.max(50, Math.ceil(entries.length * 0.3))).forEach(([k]) => cacheDel(k));
}

function cacheClearAll() {
    cacheMem.clear();
    wQueue.clear();
    dQueue.clear();
    clearTimeout(idbTimer); idbTimer = null;
    try { if (idbDb) idbDb.transaction(CACHE_STORE, 'readwrite').objectStore(CACHE_STORE).clear(); } catch (e) {}
    try {
        const del = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('mirseer_')) del.push(k);
        }
        del.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
}

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

function getPref(key, def) {
    try {
        if (typeof GM_getValue === 'function') {
            const v = GM_getValue(key, undefined);
            return v === undefined ? def : v;
        }
    } catch (e) {}
    const raw = lsGet('seer_' + key);
    if (raw === null) return def;
    try { return JSON.parse(raw); } catch (e) { return raw; }
}
function setPref(key, val) {
    try { if (typeof GM_setValue === 'function') { GM_setValue(key, val); return; } } catch (e) {}
    lsSet('seer_' + key, JSON.stringify(val));
}

const loadTheme = () => (getPref('theme', 'dark') === 'light' ? 'light' : 'dark');
const saveTheme = t => setPref('theme', t);

const getTmdbKey = () => String(getPref('tmdb_api_key', '') || '').trim();
const setTmdbKey = k => setPref('tmdb_api_key', String(k || '').trim());

const HERO_SPEEDS = [5000, 10000, 0];
const SORT_MODES = ['recent', 'activity', 'views', 'title', 'replies', 'size'];
const settings = {
    heroEnabled: !!getPref('heroEnabled', true),
    heroSpeed: (v => (HERO_SPEEDS.includes(v) ? v : 5000))(Number(getPref('heroSpeed', IS_COARSE ? 0 : 5000))),
    startView: String(getPref('startView', 'home')),
    density: getPref('density', 'comfortable') === 'compact' ? 'compact' : 'comfortable',
    accent: String(getPref('accent', '#6366f1')),
    accent2: String(getPref('accent2', '#a855f7')),
    magnetAction: getPref('magnetAction', 'copy') === 'open' ? 'open' : 'copy'
};
sortMode = (v => (SORT_MODES.includes(v) ? v : 'recent'))(getPref('sortMode', 'recent'));

let viewMode = getPref('viewMode', IS_COARSE ? 'grid' : 'list') === 'grid' ? 'grid' : 'list';
let hideSeen = !!getPref('hideSeen', false);
const newFilters = () => ({ res: 'all', ita: false, complete: false, type: 'all', fmt: 'all', minVote: 0, yFrom: null, yTo: null, releaser: '', codec: 'all', sizeMin: null, sizeMax: null, genre: 'all' });
const filters = newFilters();

let seenSet = new Set((() => { const a = getPref('seen', []); return Array.isArray(a) ? a : []; })().map(String));
let favs = (() => { const f = getPref('favs', {}); return (f && typeof f === 'object' && !Array.isArray(f)) ? f : {}; })();

const isFav = id => !!favs[String(id)];
const isSeen = id => seenSet.has(String(id));

function persistSeen() {
    let arr = [...seenSet];
    if (arr.length > 5000) { arr = arr.slice(-4000); seenSet = new Set(arr); }
    setPref('seen', arr);
}

function toast(msg, type = '', ms = 2600) {
    const box = $('seer-toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'seer-toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => {
        t.style.transition = 'opacity 0.3s';
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 330);
    }, ms);
}

function resetMetadataCache() {
    [...cacheMem.keys()].forEach(k => { if (k.startsWith(CACHE_PREFIX) && k !== FREQ_KEY) cacheDel(k); });
    savePending.clear();
    resolvedMem.clear();
    registry.forEach(it => { it.posterTried = false; it.tmdbTried = false; it._projTries = 0; it._imgRetry = 0; });
    ratingTried.clear();
    heroNext = null;
}

function clearAllCache() {
    clearTimeout(saveTimer); saveTimer = null;
    clearTimeout(freqTimer); freqTimer = null; freqDirty = false;
    cacheClearAll();
    imgFreq = {};
    savePending.clear();
    resolvedMem.clear();
    warmed.clear();
    ratingTried.clear();
    registry.forEach(it => { it.posterTried = false; it.tmdbTried = false; it._projTries = 0; it._imgRetry = 0; });
    heroNext = null;
}

function cacheStats() {
    flushSaves();
    let topics = 0, tmdb = 0, bytes = 0;
    cacheMem.forEach((v, k) => {
        if (!k.startsWith('mirseer_')) return;
        bytes += k.length + String(v).length;
        if (k === FREQ_KEY) return;
        if (k.startsWith(CACHE_PREFIX + 'tmdb_')) tmdb++;
        else if (k.startsWith(CACHE_PREFIX)) topics++;
    });
    return { topics, tmdb, images: Object.keys(imgFreq).length, kb: Math.round(bytes / 1024) };
}

function applyHeroPrefs() {
    if (!settings.heroEnabled) {
        heroToken++;
        heroBuilding = false; heroPrefetching = false;
        heroSlides = []; heroNext = null; heroIdx = 0;
        stopHero();
        renderHero();
        updateHeroVisibility();
        return;
    }
    stopHero();
    if (main.loaded) buildHero();
    else updateHeroVisibility();
}

function startTarget() {
    const v = settings.startView;
    if (v === 'films' || v === 'series' || v === 'favs') return { key: v, section: null };
    if (v.startsWith('sec:')) {
        const sec = sectionList.find(x => x.name === v.slice(4));
        if (sec && sec.fid) return { key: 'section', section: { id: String(sec.fid), name: sec.name } };
    }
    return { key: 'home', section: null };
}

function applyTmdbKey(key) {
    key = String(key || '').trim();
    if (key === getTmdbKey()) return false;
    setTmdbKey(key);
    resetMetadataCache();
    return true;
}

async function checkTmdbKey(key) {
    try {
        const j = await httpGetJson(`https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(key)}`);
        if (j && j.images) return true;
        if (j && j.status_code === 7) return false;
        return null;
    } catch (e) { return null; }
}

cacheReady.then(() => {
    setTimeout(() => {
        try {
            const old = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('mirseer_')) old.push(k);
            }
            old.forEach(k => localStorage.removeItem(k));
        } catch (e) {}
        [...cacheMem.keys()].forEach(k => { if (!k.startsWith(CACHE_PREFIX)) cacheDel(k); });
    }, 4000);
});

let imgFreq = {};
cacheReady.then(() => {
    try {
        const j = JSON.parse(cacheGet(FREQ_KEY) || 'null');
        if (j && typeof j === 'object') imgFreq = Object.assign(j, imgFreq);
    } catch (e) {}
});
const REPEAT_THRESHOLD = 3;
let freqTimer = null, freqDirty = false;

function persistFreq() {
    freqTimer = null;
    if (!freqDirty) return;
    freqDirty = false;
    const keys = Object.keys(imgFreq);
    if (keys.length > 3000) keys.slice(0, keys.length - 2400).forEach(k => delete imgFreq[k]);
    cacheSet(FREQ_KEY, JSON.stringify(imgFreq));
}

function schedulePersistFreq() {
    freqDirty = true;
    if (!freqTimer) freqTimer = setTimeout(persistFreq, 2000);
}

function noteImages(srcs, titleK) {
    let dirty = false;
    for (const s of srcs) {
        const arr = imgFreq[s] || (imgFreq[s] = []);
        if (!arr.includes(titleK) && arr.length < 4) { arr.push(titleK); dirty = true; }
    }
    if (dirty) schedulePersistFreq();
}
const isRepeatedImage = src => (imgFreq[src] || []).length >= REPEAT_THRESHOLD;

const PROJ_DEBUG = false;
const pjLog = (...a) => { if (PROJ_DEBUG) console.log('[mirseer-proj]', ...a); };
const isProjLike = it => !!it && (it.type === PROJECT_SECTION || it.forumName === PROJECT_SECTION);

const resolvedMem = new Map();
const savePending = new Map();
const ratingTried = new Set();
let saveTimer = null;

const snapshot = it => ({
    poster: it.poster || null, posterSrc: it.posterSrc || null, posterAlts: it.posterAlts || [],
    backdrop: it.backdrop || null, synopsis: it.synopsis,
    magnet: it.magnet || null,
    magnets: (it.magnets || []).map(m => ({ uri: m.uri, dn: m.dn || '', label: m.label, season: m.season == null ? null : m.season, ep: m.ep == null ? null : m.ep })),
    thanksUrl: it.thanksUrl || null, extId: it.extId || null, kind: it.kind || 'video',
    origTitle: it.origTitle || null, fieldYear: it.fieldYear || null, genre: it.genre || null, country: it.country || null,
    tmdbTitle: it.tmdbTitle || null, tmdbYear: it.tmdbYear || null,
    tmdbId: it.tmdbId || null, tmdbKind: it.tmdbKind || null, vote: it.vote || null,
    genres: it.genres || [], trailer: it.trailer || null, imdbId: it.imdbId || null,
    mediaInfo: it.mediaInfo || null,
    sizeBytes: it.sizeBytes || 0,
    author: it.author || '', authorId: it.authorId || null, authorAvatar: it.authorAvatar || null,
    body: it.kind === 'text' ? (it.body || '').slice(0, 4000) : null
});

function flushSaves() {
    saveTimer = null;
    savePending.forEach(it => {
        const snap = snapshot(it);
        resolvedMem.set(String(it.id), snap);
        cacheSet(CACHE_PREFIX + it.id, JSON.stringify({ t: Date.now(), ...snap }));
    });
    savePending.clear();
}

function saveCache(item) {
    savePending.set(String(item.id), item);
    if (!saveTimer) saveTimer = setTimeout(flushSaves, 800);
}
window.addEventListener('pagehide', () => {
    flushSaves();
    if (freqTimer) { clearTimeout(freqTimer); persistFreq(); }
    flushIdb();
    try { if (worker) worker.terminate(); } catch (e) {}
});

function readCache(id, item = null) {
    const hit = resolvedMem.get(String(id));
    if (hit) {
        if (item && isProjLike(item) && !hit.poster) {
            resolvedMem.delete(String(id));
            cacheDel(CACHE_PREFIX + id);
            pjLog(id, 'cache senza banner scartata (memoria)');
            return null;
        }
        return hit;
    }
    const raw = cacheGet(CACHE_PREFIX + id);
    if (!raw) return null;
    let p;
    try { p = JSON.parse(raw); } catch (e) { return null; }
    if (item && isProjLike(item) && !p.poster) {
        cacheDel(CACHE_PREFIX + id);
        pjLog(id, 'cache senza banner scartata (disco)');
        return null;
    }
    if (!p.magnets) p.magnets = p.magnet ? [{ uri: p.magnet, dn: '', label: 'Magnet 1', season: null, ep: null }] : [];
    if (p.poster && p.posterSrc === 'forum' && isRepeatedImage(p.poster)) {
        const alt = (p.posterAlts || []).find(u => !isRepeatedImage(u));
        p.posterAlts = (p.posterAlts || []).filter(u => u !== alt && u !== p.poster);
        p.poster = alt || null;
    }
    resolvedMem.set(String(id), p);
    return p;
}

const warmed = new Set();
function warmImage(url) {
    if (!url || warmed.has(url)) return;
    if (warmed.size > 600) warmed.clear();
    warmed.add(url);
    const i = new Image();
    i.decoding = 'async';
    try { i.fetchPriority = 'high'; } catch (e) {}
    i.src = url;
}

function hydrateSync(item) {
    if (item.posterTried) return;
    const c = readCache(item.id, item);
    if (c) { applyParsed(item, c); upgradeTmdbTitle(item, c); }
}

function parseEpisodeRef(text) {
    if (!text) return null;
    const n = v => parseInt(v, 10);
    let m = text.match(SEASON_RES.ep) || text.match(SEASON_RES.x);
    if (m) return { season: n(m[1]), ep: n(m[2]), ep2: m[3] ? n(m[3]) : null };
    const e = text.match(SEASON_RES.episode);
    const s = parseSeasonInfo(text);
    const season = s && (s.kind === 'season' || s.kind === 'range') ? s.season : null;
    if (e) return { season, ep: n(e[1]), ep2: e[2] ? n(e[2]) : null };
    if (season !== null) return { season, ep: null, ep2: null };
    return null;
}

function magnetLabel(ref, idx) {
    const pad = v => String(v).padStart(2, '0');
    if (ref && ref.ep != null) {
        const ep = `Episodio ${pad(ref.ep)}${ref.ep2 && ref.ep2 !== ref.ep ? '-' + pad(ref.ep2) : ''}`;
        return ref.season != null ? `Stagione ${ref.season} · ${ep}` : ep;
    }
    if (ref && ref.season != null) return `Stagione ${ref.season}`;
    return `Magnet ${idx + 1}`;
}
const NON_MOVIE_SERIES_RE = /\b(concerto|concerti|live\s+(?:at|in|from|on|tour|show)|world\s*tour|unplugged|videoclip|videomusic|festival\s*di\s*sanremo|sanremo\s*\d{4}|eurovision|festivalbar|arena\s*di\s*verona|wwe|smackdown|wrestling|aew|nxt|motogp|moto[\s._-]?gp|moto[23]|formula[\s._-]*1|f1[\s._-]*20\d\d|serie\s*a|champions\s*league|europa\s*league|conference\s*league|partita|calcio|mondiali|olimpiadi|superbowl|nba|ufc|mma|pugilato|gran[\s._-]*premio|gp[\s._-]*di|talk[\s._-]*show|reality[\s._-]*show|reality|telegiornale|tg[1-5]|tgcom|striscia\s*la\s*notizia|le\s*iene|masterchef|pechino\s*express|grande\s*fratello|isola\s*dei\s*famosi|amici\s*di\s*maria|uomini\s*e\s*donne|c['’]e\s*posta\s*per\s*te|ballando\s*con\s*le\s*stelle|affari\s*tuoi|reazione\s*a\s*catena|avanti\s*un\s*altro|soliti\s*ignoti|propaganda\s*live|report|presa\s*diretta|presadiretta|dimartedi|di\s*martedi|piazzapulita|quarta\s*repubblica|dritto\s*e\s*rovescio|fuori\s*dal\s*coro|cartabianca|otto\s*e\s*mezzo|domenica\s*in|verissimo|pomeriggio\s*5|la\s*vita\s*in\s*diretta|disco[\s._-]*grafia|discografia|audiobook|audiolibro|audiolibri|greatest\s*hits|the\s*best\s*of|compilation|album\s*\d{4})\b/i;
const NON_MOVIE_TAGS = /\[\s*(musica|music|concert[oi]|sport|show|programmi|software|giochi|ebook|audio|flac|mp3|edicola|fumetti|giornali|riviste)\s*\]/i;
const VIDEO_EVIDENCE_RE = /\b(2160p|1080p|1080i|720p|576p|480p|4k|uhd|bdrip|brrip|bdmux|dvdrip|dvdmux|hdrip|web-?dl|webrip|webmux|web-?mux|blu-?ray|hdtv|tvrip|satrip|dvbrip|remux|x26[45]|hevc|h\.?26[45]|avc|xvid|divx|mkv|mp4|avi)\b/i;
const NON_VIDEO_RE = /\b(epub|mobi|azw3?|pdf|cbr|cbz|ebooks?|audiolibr[oi]|audiobooks?|discograf(?:ia|y)|soundtrack|ost|keygen|apk|ps[2-5]|xbox|nsw|wii|3ds|nds|psp|crack|patch|setup|windows|macos|linux|software|gioch[io]|programmi?|app|portable|flac\+cue|mp3\s*320|cbr\s*320|vbr)\b/i;
const AUDIO_TITLE_RE = /\b(flac|mp3|aac|m4a|m4b|ogg|opus|wav|320\s*kbps|discograf(?:ia|y)|audiolibr[oi]|audiobooks?)\b/i;
const NON_RELEASE_RE = /^\W*(richiest[ae]|request|requests|annunci[o]?|regolamento|guida|guide|tutorial|template|elenco|indice|faq|comunicat[oi]|info\s*forum|come\s*chiedere|come\s*scaricare|problemi|segnalazion[ei]|reseed)\b/i;

function isMovieOrSeries(raw) {
    if (NON_RELEASE_RE.test(raw)) return false;
    if (NON_VIDEO_RE.test(raw)) return false;
    if (NON_MOVIE_SERIES_RE.test(raw)) return false;
    if (NON_MOVIE_TAGS.test(raw)) return false;
    if (VIDEO_EVIDENCE_RE.test(raw)) return true;
    const s = parseSeasonInfo(raw);
    return !!s && s.kind !== 'episode';
}

function isReleaseInSection(raw) {
    return !NON_RELEASE_RE.test(raw);
}

const VIDEO_EXT_RE = /\.(mkv|mp4|avi|m4v|m2ts|iso|mov|vob|wmv|mpe?g|webm)\b/i;
const AUDIO_EXT_RE = /\.(mp3|flac|m4a|m4b|aac|ogg|opus|wav|ape|wma|alac|aiff?)\b/i;
const VIDEO_INFO_RE = /(?:Format\s*:\s*(?:Matroska|MPEG-4|BDAV|AVI|HEVC|AVC)|Video\s*#\d|Complete name\s*:.*?\.(?:mkv|mp4|avi|m4v|m2ts|iso)|Risoluzione\s*:|Codec ID\s*:|Video\s*:|Frame rate\s*:|Width\s*:\s*\d|Height\s*:\s*\d|Display aspect ratio|Matroska)/i;
const VIDEO_FORUM_NAME_RE = /film|movi|serie|\btv\b|anim[ei]|carto|document|teatr|video|show|corsi/i;

function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

function extractText(root) {
    const c = root.cloneNode(true);
    c.querySelectorAll('script, style, .signature, .sig').forEach(e => e.remove());
    c.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
    c.querySelectorAll('p, div, li, tr, blockquote, h1, h2, h3, h4, h5, h6, dt, dd').forEach(e => e.append('\n'));
    return c.textContent.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function extractMediaInfoDom(root) {
    if (!root) return null;
    const cands = [...root.querySelectorAll('dl.codebox code, dl.codebox, pre, code, .codebox, .spoiler, .spoilertext, .spoiler-content, .spoiler_content, [class*="spoiler"], [class*="codecontent"]')];
    const passing = cands.map(el => ({ el, text: extractText(el) })).filter(x => x.text.length > 80 && looksLikeMediaInfo(x.text));
    const inner = passing.filter(x => !passing.some(o => o !== x && x.el.contains(o.el)));
    if (!inner.length) return null;
    const seen = new Set();
    const parts = [];
    inner.forEach(x => { if (!seen.has(x.text)) { seen.add(x.text); parts.push(x.text); } });
    const txt = parts.join('\n\n────────────────────\n\n');
    return txt ? txt.slice(0, 14000) : null;
}

const sectionKindOf = type => VIDEO_TYPES.has(type) ? 'video' : AUDIO_TYPES.has(type) ? 'audio' : FILE_TYPES.has(type) ? 'file' : null;

function effKind(item) {
    const sk = sectionKindOf(item.type);
    if (sk === 'video' && item.kind === 'audio') return 'video';
    return item.kind;
}

function detectKind(root, text, magnets, item, hasThanks) {
    const type = item.type, rawTitle = item.rawTitle;
    const sk = sectionKindOf(type);
    const hasMagnet = !!(magnets && magnets.length);
    const hrefs = root ? [...root.querySelectorAll('a[href]')].map(a => (a.getAttribute('href') || '') + ' ' + a.textContent).join('\n') : '';
    const pool = text + '\n' + hrefs + '\n' + (hasMagnet ? magnets.map(m => safeDecode(m.uri)).join('\n') : '');
    const videoSignal = VIDEO_EVIDENCE_RE.test(rawTitle) || VIDEO_EXT_RE.test(pool) || VIDEO_INFO_RE.test(text);
    const hasImg = !!(root && root.querySelector('img'));

    if (sk === 'file') return 'file';
    if (sk === 'audio') return VIDEO_EVIDENCE_RE.test(rawTitle) ? 'video' : 'audio';

    if (sk === 'video') {
        if (hasMagnet || hasThanks || videoSignal || hasImg) return 'video';
        return text.trim() ? 'text' : 'video';
    }

    const fname = item.forumName || '';
    if (fname && VIDEO_FORUM_NAME_RE.test(fname) && !/music|audio/i.test(fname)) {
        if (hasMagnet || hasThanks || videoSignal || hasImg) return 'video';
        return text.trim() ? 'text' : 'video';
    }
    if (videoSignal) return 'video';
    if (AUDIO_EXT_RE.test(pool) || AUDIO_TITLE_RE.test(rawTitle)) return 'audio';
    if (hasMagnet || hasThanks) return NON_VIDEO_RE.test(rawTitle) ? 'file' : 'video';
    return 'text';
}

function inRecentBlock(link) {
    if (EXCLUDE_SELECTOR) { try { if (link.closest(EXCLUDE_SELECTOR)) return true; } catch (e) {} }
    const body = link.ownerDocument.body;
    let el = link.parentElement;
    for (let d = 0; el && el !== body && d < 14; d++, el = el.parentElement) {
        const heads = [el.previousElementSibling];
        try { heads.push(...el.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > .header, :scope > ul.topiclist > li.header, :scope > .block-header')); } catch (e) {}
        for (const h of heads) {
            if (!h) continue;
            if (RECENT_HEAD_RE.test((h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140))) return true;
        }
    }
    return false;
}

function isAnnouncementRow(link, row) {
    if (link.closest('.announcement, .global-announcement, .announce')) return true;
    if (link.closest('.lastpost, .lastsubject')) return true;
    if (!row) return false;
    if (/\b(announce|global-announce|sticky)\b/i.test(row.className)) return true;
    return !!row.querySelector('dl[class*="announce"], dl[class*="global_"], dl[class*="sticky"]');
}

const IT_MONTHS = { gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5, lug: 6, ago: 7, set: 8, ott: 9, nov: 10, dic: 11, jan: 0, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, dec: 11 };

function parseLooseDate(str) {
    if (!str) return 0;
    const s = String(str).toLowerCase();
    const m = s.match(/(\d{1,2})\s+([a-zà-ù]{3,})\.?\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
    if (m) {
        const mo = IT_MONTHS[m[2].slice(0, 3)];
        if (mo !== undefined) return new Date(+m[3], mo, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime();
    }
    const t = s.match(/(oggi|today|ieri|yesterday)[,\s]+(\d{1,2}):(\d{2})/);
    if (t) {
        const d = new Date();
        if (/ieri|yesterday/.test(t[1])) d.setDate(d.getDate() - 1);
        d.setHours(+t[2], +t[3], 0, 0);
        return d.getTime();
    }
    return 0;
}

function timeValue(t) {
    if (!t) return 0;
    return Date.parse(t.getAttribute('datetime') || '') || parseLooseDate(t.textContent) || 0;
}

function creationTime(row) {
    const dt = row && row.querySelector('dt');
    if (!dt) return 0;
    const ok = el => !el.closest('.responsive-show, dd, .lastpost, .lastsubject');
    const prefer = [...dt.querySelectorAll('.topic-poster time, .responsive-hide time, .topictitle ~ time')].filter(ok);
    const any = [...dt.querySelectorAll('time')].filter(ok);
    const v = timeValue(prefer[0] || any[0]);
    if (v) return v;
    const clone = dt.cloneNode(true);
    clone.querySelectorAll('.responsive-show, .lastpost, .lastsubject, a.topictitle').forEach(e => e.remove());
    const txt = (clone.textContent || '').replace(/\s+/g, ' ');
    const i = txt.lastIndexOf('»');
    return parseLooseDate(i >= 0 ? txt.slice(i + 1) : txt);
}

function lastReplyTime(row) {
    return row ? timeValue(row.querySelector('dd.lastpost time')) : 0;
}

function topicAuthorEl(row) {
    if (!row) return null;
    const pool = [...row.querySelectorAll('dt .username, dt .username-coloured')].filter(e => !e.closest('.responsive-show, .lastpost'));
    return pool[0] || null;
}
const userIdOf = el => {
    const a = el && (el.tagName === 'A' ? el : el.closest('a') || el.querySelector('a'));
    const m = a && (a.getAttribute('href') || '').match(/[?&]u=(\d+)/);
    return m ? m[1] : null;
};

function buildItem({ topicId, href, raw, type, views, replies, ts, lastReplyTs, author, authorId, meta }) {
    meta = meta || pure.parseReleaseInfo(raw);
    const n = parseInt(topicId, 10);
    return {
        id: String(topicId), type,
        numericId: isNaN(n) ? 0 : n,
        url: href, rawTitle: raw,
        cleanTitle: meta.cleanTitle, displayTitle: meta.displayTitle,
        year: meta.year, meta,
        views: views || 0, replies: replies || 0, ts: ts || 0, lastReplyTs: lastReplyTs || 0,
        author: author || '', authorId: authorId || null, authorAvatar: null,
        kind: null,
        body: null,
        poster: null, posterSrc: null, posterAlts: [], backdrop: null,
        posterTried: false, synopsis: null, magnet: null, magnets: [], thanksUrl: null, extId: null,
        origTitle: null, fieldYear: null, genre: null, country: null,
        tmdbId: null, tmdbKind: null, vote: null, genres: [], trailer: null, imdbId: null, mediaInfo: null, sizeBytes: 0,
        _vers: null
    };
}

async function parseTopicsFromDoc(doc, defaultType, relaxed = false, fallbackType = null) {
    let links = doc.querySelectorAll('a.topictitle');
    if (!links.length) links = [...doc.querySelectorAll('a[href*="viewtopic.php"]')].filter(a => /[?&]t=\d+/.test(a.getAttribute('href') || ''));

    const auto = defaultType === 'auto';
    const generic = defaultType === 'Film' || defaultType === 'Serie TV';
    const order = [];
    const pending = [];
    const seen = new Set();
    let rawCount = 0;

    links.forEach(link => {
        const raw = link.textContent.replace(/\s+/g, ' ').trim();
        const href = absHref(link);
        if (!raw || raw.length < 5) return;

        const row = link.closest('li.row, tr');
        if (isAnnouncementRow(link, row)) return;
        if (inRecentBlock(link)) return;

        const topicId = (href.match(/[?&]t=(\d+)/) || [])[1] || ('h' + hashStr(href));
        if (seen.has(topicId)) return;
        seen.add(topicId);
        rawCount++;

        if (!isReleaseInSection(raw)) return;

        const num = sel => {
            const el = row && row.querySelector(sel);
            if (!el) return 0;
            const t = el.firstChild ? el.firstChild.textContent : el.textContent;
            return parseInt(String(t).replace(/[^\d]/g, ''), 10) || 0;
        };
        const ts = creationTime(row);
        const lastReplyTs = lastReplyTime(row);
        const views = num('.views');
        const replies = num('.posts');
        const authorEl = topicAuthorEl(row);
        const author = authorEl ? authorEl.textContent.trim() : '';
        const authorId = userIdOf(authorEl);

        let forumId = null, forumName = '';
        if (auto && row) {
            const fl = row.querySelector('a[href*="viewforum.php"]');
            if (fl) {
                forumId = (fl.getAttribute('href').match(/[?&]f=(\d+)/) || [])[1] || null;
                forumName = fl.textContent.trim();
            }
        }

        const item = registry.get(topicId);
        if (item) {
            item.views = views || item.views;
            item.replies = replies || item.replies;
            item.ts = ts || item.ts;
            item.lastReplyTs = lastReplyTs || item.lastReplyTs;
            item.author = item.author || author;
            item.authorId = item.authorId || authorId;
            if (auto && forumId) { item.forumId = forumId; item.forumName = forumName; }
            order.push({ item });
        } else {
            const rec = { topicId, href, raw, views, replies, ts, lastReplyTs, author, authorId, forumId, forumName };
            pending.push(rec);
            order.push({ rec });
        }
    });

    if (pending.length) {
        const metas = await workerCall('titles', pending.map(p => p.raw));
        pending.forEach((rec, i) => {
            let item = registry.get(rec.topicId);
            if (!item) {
                const meta = metas[i];
                let type;
                if (auto) type = (rec.forumId && forumToSection.get(rec.forumId)) || sectionByName(rec.forumName) || fallbackType || rec.forumName || (meta.isTvSeries ? 'Serie TV' : 'Film');
                else type = defaultType;
                item = buildItem({ ...rec, type, meta });
                registry.set(rec.topicId, item);
                hydrateSync(item);
            }
            if (auto && rec.forumId) { item.forumId = rec.forumId; item.forumName = rec.forumName; }
            rec.item = item;
        });
    }

    const items = order.map(o => o.item || o.rec.item);
    items.raw = rawCount;
    items.ids = [...seen];
    return items;
}

function favSnapshot(item) {
    return {
        id: String(item.id), url: item.url, rawTitle: item.rawTitle, type: item.type,
        views: item.views || 0, replies: item.replies || 0, ts: item.ts || 0, lastReplyTs: item.lastReplyTs || 0,
        author: item.author || '', authorId: item.authorId || null,
        forumId: item.forumId || null, forumName: item.forumName || '', added: Date.now()
    };
}

function favItems() {
    return Object.values(favs).map(f => {
        let it = registry.get(String(f.id));
        if (!it) {
            it = buildItem({ topicId: f.id, href: fixUrl(f.url), raw: f.rawTitle, type: f.type || 'Film', views: f.views, replies: f.replies, ts: f.ts, lastReplyTs: f.lastReplyTs, author: f.author, authorId: f.authorId });
            if (f.forumId) { it.forumId = f.forumId; it.forumName = f.forumName || ''; }
            registry.set(String(f.id), it);
            hydrateSync(it);
        }
        return it;
    });
}

function updateFavCount() {
    const el = $('seer-fav-count');
    if (el) el.textContent = wlNew.size ? '🆕 ' + wlNew.size : (Object.keys(favs).length || '');
}

function toggleFav(item) {
    const id = String(item.id);
    if (favs[id]) { delete favs[id]; toast('Rimosso dalla watchlist'); }
    else { favs[id] = favSnapshot(item); toast('⭐ Aggiunto alla watchlist', 'ok'); }
    setPref('favs', favs);
    updateFavCount();
    if (view.key === 'favs' && !search.active) renderDeck(localFilterValue());
    else refreshItem(item);
}

function markSeen(item, on = true) {
    const id = String(item.id);
    if (on) seenSet.add(id); else seenSet.delete(id);
    persistSeen();
    refreshItem(item);
}

const relKey = n => String(n || '').trim().toLowerCase();
const titleFollowKey = it => normT(it.cleanTitle) + '|' + it.type;
const isFollowingRel = n => !!n && !!follows.rel[relKey(n)];
const isFollowingTitle = it => !!follows.title[titleFollowKey(it)];
const saveFollows = () => setPref('follows', follows);
const knownMaxId = pred => { const ids = [...registry.values()].filter(pred).map(i => i.numericId).filter(Boolean); return ids.length ? Math.max(...ids) : null; };

function toggleFollowRel(name, id, avatar) {
    if (!name) return;
    const k = relKey(name);
    if (follows.rel[k]) { delete follows.rel[k]; toast('Releaser rimosso dalla watchlist'); }
    else {
        follows.rel[k] = { name, id: id || null, avatar: avatar || null, lastId: knownMaxId(i => relKey(i.author) === k), added: Date.now() };
        toast('👁️ Segui ' + name, 'ok');
    }
    saveFollows(); afterFollowChange(true);
}
function toggleFollowTitle(item) {
    const k = titleFollowKey(item);
    if (follows.title[k]) { delete follows.title[k]; toast('Titolo rimosso dalla watchlist'); }
    else {
        follows.title[k] = { key: k, title: item.cleanTitle, type: item.type, lastId: knownMaxId(i => titleFollowKey(i) === k), added: Date.now() };
        toast('👁️ Seguo «' + item.cleanTitle + '»', 'ok');
    }
    saveFollows(); afterFollowChange(true);
}
function afterFollowChange(check) {
    updateFavCount(); renderWlPanel(); renderRelPanel();
    if (currentModalItem && $('seer-modal-overlay').style.display === 'flex') paintModal(currentModalItem);
    if (check) checkFollows(true);
}
function collectNew(f, items, found) {
    const ids = items.map(i => i.numericId).filter(Boolean);
    if (!ids.length) return;
    const top = Math.max(...ids);
    f.top = Math.max(f.top || 0, top);
    if (f.lastId == null) { f.lastId = top; return; }
    items.forEach(i => { if (i.numericId > f.lastId) found.set(i.id, i); });
}
async function checkFollows(force = false) {
    if (wlChecking || (!force && Date.now() - wlLastCheck < 600000)) return;
    const rels = Object.values(follows.rel).slice(0, 15), titles = Object.values(follows.title).slice(0, 15);
    if (!rels.length && !titles.length) return;
    wlChecking = true; wlLastCheck = Date.now();
    renderWlPanel();
    const found = new Map();
    try {
        for (const f of rels) {
            const page = await fetchSearchPage(relSearchUrl(f), { relaxed: true, fallbackType: null });
            if (page.flood) break;
            collectNew(f, page.items.filter(it => !it.author || relKey(it.author) === relKey(f.name)), found);
        }
        for (const f of titles) {
            const sec = sectionList.find(s => s.name === f.type);
            const fids = sec && sec.fid ? [String(sec.fid)] : [FILM_FORUM_ID, SERIES_FORUM_ID];
            const page = await fetchSearchPage(buildSearchUrl(f.title, fids), { relaxed: !(f.type === 'Film' || f.type === 'Serie TV'), fallbackType: f.type });
            if (page.flood) break;
            collectNew(f, page.items.filter(it => titleFollowKey(it) === f.key), found);
        }
        wlNew = found;
        saveFollows();
    } catch (e) { console.warn('checkFollows', e); }
    finally {
        wlChecking = false;
        updateFavCount(); renderWlPanel();
        if (view.key === 'favs' && !search.active) renderDeck(localFilterValue(), true);
    }
}
function markAllFollowsSeen() {
    [...Object.values(follows.rel), ...Object.values(follows.title)].forEach(f => { if (f.top) f.lastId = Math.max(f.lastId || 0, f.top); });
    wlNew = new Map(); saveFollows(); updateFavCount(); renderWlPanel();
    if (view.key === 'favs') renderDeck(localFilterValue());
}
function renderWlPanel() {
    const p = $('seer-wl-panel');
    if (!p) return;
    const on = view.key === 'favs' && !search.active;
    p.classList.toggle('show', on);
    if (!on) { p.innerHTML = ''; return; }
    const rels = Object.values(follows.rel), titles = Object.values(follows.title);
    if (!rels.length && !titles.length) { p.innerHTML = '<span class="seer-wl-empty">Segui un releaser o un titolo dalla scheda dettagli (➕ Segui) per vedere qui le nuove uscite.</span>'; return; }
    p.innerHTML =
        rels.map(f => `<span class="seer-wl-chip">👤 ${esc(f.name)}<button data-wl-del="rel" data-k="${esc(relKey(f.name))}" title="Smetti di seguire">✕</button></span>`).join('') +
        titles.map(f => `<span class="seer-wl-chip">📺 ${esc(f.title)}<button data-wl-del="title" data-k="${esc(f.key)}" title="Smetti di seguire">✕</button></span>`).join('') +
        `<span style="flex:1"></span><button class="seer-facet" data-wl="check">🔄 ${wlChecking ? 'Controllo…' : 'Controlla ora'}</button>` +
        (wlNew.size ? `<button class="seer-facet active" data-wl="seen">✓ Segna tutto come visto (${wlNew.size})</button>` : '');
}

function detectUser(doc) {
    const out = doc.querySelector('a[href*="mode=logout"]');
    if (!out) return null;
    const box = doc.querySelector('#username_logged_in, .header-profile');
    const img = box && box.querySelector('img.avatar, .avatar img');
    const nameEl = box && box.querySelector('.username, .username-coloured');
    const m = ((out.getAttribute('title') || out.textContent || '')).match(/\[\s*(.+?)\s*\]/);
    const name = (nameEl && nameEl.textContent.trim()) || (m && m[1]) || 'Account';
    const prof = [...doc.querySelectorAll('a[href*="mode=viewprofile"]')].find(a => /[?&]u=\d+/.test(a.getAttribute('href')) && ((box && box.contains(a)) || a.textContent.trim() === name));
    const src = img && img.getAttribute('src');
    return {
        name,
        uid: prof ? (prof.getAttribute('href').match(/[?&]u=(\d+)/) || [])[1] : null,
        avatar: src && !src.startsWith('data:') ? absUrl(src) : null
    };
}
function paintUser() {
    const btn = $('seer-user-btn'), menu = $('seer-user-menu');
    if (!btn) return;
    const u = currentUser;
    if (u && u.avatar) {
        btn.innerHTML = `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">`;
        btn.querySelector('img').addEventListener('error', () => { btn.textContent = '🙂'; });
    } else btn.textContent = u ? '🙂' : '👤';
    btn.title = u ? u.name : 'Accedi al forum';
    menu.innerHTML = u
        ? `<div class="seer-user-head">${u.avatar ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">` : '<span style="font-size:30px">🙂</span>'}<div><div class="seer-user-name">${esc(u.name)}</div><div class="seer-user-sub">MirCrew</div></div></div>` +
          `<a href="#" data-acc="profile">👤 Il mio profilo</a>` +
          `<a href="#" data-acc="settings">⚙️ Impostazioni utente</a>` +
          `<a href="#" data-acc="stats">📊 La mia attività</a>`
        : `<a href="/ucp.php?mode=login" target="_blank" rel="noopener">🔑 Accedi al forum</a>`;
}

async function sendRaw(item, uris) {
    const client = tcClient(), base = tcBase(), dir = tcPathFor(item);
    if (client === 'qbittorrent') await qbAdd(base, tcUser(), tcPass(), uris, dir);
    else for (const u of uris) await trRpc(base, tcUser(), tcPass(), { method: 'torrent-add', arguments: dir ? { filename: u, 'download-dir': dir } : { filename: u } });
    return dir;
}
function paintSelection() {
    document.querySelectorAll('.seer-row').forEach(r => {
        const on = selected.has(String(r.dataset.topicId));
        r.classList.toggle('is-selected', on);
        const bx = r.querySelector('.seer-sel-box');
        if (bx) { bx.classList.toggle('on', on); bx.textContent = on ? '✓' : ''; }
    });
    updateBatchBar();
}
function setSelMode(on) {
    selMode = !!on;
    if (!selMode) selected.clear();
    lastSelId = null;
    $('seer-sel-btn').classList.toggle('active', selMode);
    renderDeck(localFilterValue(), true);
    updateBatchBar();
}
function toggleSel(item, shift = false) {
    const id = String(item.id);
    if (shift && lastSelId && lastSelId !== id) {
        const ids = lastDisplayed.map(x => String(x.id));
        const a = ids.indexOf(lastSelId), b = ids.indexOf(id);
        if (a >= 0 && b >= 0) ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => selected.add(x));
    } else if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    lastSelId = id;
    paintSelection();
}
function updateBatchBar() {
    const bar = $('seer-batch-bar');
    if (!bar) return;
    bar.classList.toggle('show', selMode);
    const n = selected.size, tc = tcClient() !== 'off';
    $('seer-batch-count').textContent = n + (n === 1 ? ' selezionato' : ' selezionati');
    const send = $('seer-batch-send');
    send.style.display = tc ? '' : 'none';
    send.textContent = `⬇️ Invia ${n} a ${tcName()}`;
    ['seer-batch-send', 'seer-batch-copy', 'seer-batch-seen'].forEach(id => { $(id).disabled = !n || batchBusy; });
}
async function ensureMagnets(it) {
    await scrapeTopicData(it);
    if (!(it.magnets && it.magnets.length)) {
        const found = await unlockMagnet(it);
        if (found && found.length) {
            it.magnets = found; it.magnet = found[0].uri;
            if (it.kind === 'text') it.kind = 'file';
            if (!it.sizeBytes) it.sizeBytes = magnetsSize(found);
            saveCache(it);
        }
    }
    return it.magnets || [];
}
async function batchRun(mode) {
    if (batchBusy || !selected.size) return;
    const items = [...selected].map(id => registry.get(id)).filter(Boolean);
    if (mode === 'seen') {
        items.forEach(it => seenSet.add(String(it.id)));
        persistSeen(); toast(`✓ ${items.length} segnati come scaricati`, 'ok'); setSelMode(false); return;
    }
    if (mode === 'send' && (tcClient() === 'off' || !tcBase())) { toast('Configura prima il client torrent nelle impostazioni ⚙️', 'warn'); return; }
    batchBusy = true; updateBatchBar();
    const st = $('seer-batch-status');
    const all = [];
    let ok = 0, empty = 0, fail = 0, lastErr = '';
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        st.textContent = `${mode === 'send' ? 'Invio' : 'Lettura'} ${i + 1}/${items.length}…`;
        try {
            const mags = await ensureMagnets(it);
            if (!mags.length) { empty++; continue; }
            const uris = mags.map(m => m.uri);
            if (mode === 'send') await sendRaw(it, uris); else all.push(...uris);
            seenSet.add(String(it.id)); ok++; trackDl(it, uris, mode);
        } catch (e) {
            fail++; lastErr = (e && e.message) || String(e);
            if (mode === 'send' && fail >= 3) break;
        }
    }
    batchBusy = false; st.textContent = '';
    persistSeen();
    if (mode === 'copy' && all.length) copyToClipboard(all.join('\n'));
    const parts = [mode === 'send' ? `⬇️ ${ok} inviati a ${tcName()}` : `📋 ${all.length} magnet copiati`];
    if (empty) parts.push(`${empty} senza magnet`);
    if (fail) parts.push(`${fail} errori (${lastErr})`);
    toast(parts.join(' · '), fail ? 'warn' : 'ok', 5000);
    if (ok) setSelMode(false); else updateBatchBar();
}

function modalIndex() {
    if (!currentModalItem) return -1;
    let i = lastDisplayed.indexOf(currentModalItem);
    if (i < 0) i = lastDisplayed.findIndex(x => x._vers && x._vers.includes(currentModalItem));
    return i;
}
function updateModalNav() {
    const i = modalIndex(), more = $('seer-load-more-btn').style.display !== 'none';
    $('seer-modal-prev').disabled = i < 0 || (i === 0 && !(isPagedView() && PG.page > 1));
    $('seer-modal-next').disabled = i < 0 || (i >= lastDisplayed.length - 1 && !more && !(isPagedView() && PG.page < PG.total));
}
function navModal(dir) {
    const i = modalIndex();
    if (i < 0) return;
    const next = lastDisplayed[i + dir];
    if (!next) {
        if (isPagedView()) { const np = PG.page + dir; if (np >= 1 && np <= PG.total) { pgOpenAfterLoad = dir > 0 ? 'first' : 'last'; goPage(np); } }
        return;
    }
    kbId = String(next.id); kbApply(true);
    openDetailModal(next);
}

const kbRows = () => [...$('seer-main-list').querySelectorAll('.seer-row')];
const gridCols = rows => {
    if (viewMode !== 'grid' || !rows.length) return 1;
    const top = rows[0].offsetTop;
    let n = 0;
    while (n < rows.length && rows[n].offsetTop === top) n++;
    return Math.max(1, n);
};
function kbApply(scroll = true) {
    const rows = kbRows();
    kbIdx = kbId ? rows.findIndex(r => r.dataset.topicId === kbId) : -1;
    rows.forEach((r, i) => r.classList.toggle('kb-focus', i === kbIdx));
    if (scroll && kbIdx >= 0) rows[kbIdx].scrollIntoView({ block: 'nearest' });
}
function kbMove(step) {
    const rows = kbRows();
    if (!rows.length) return;
    const i = kbIdx < 0 ? 0 : Math.max(0, Math.min(rows.length - 1, kbIdx + step));
    kbId = rows[i].dataset.topicId;
    kbApply(true);
}
const kbItem = () => (kbId ? registry.get(kbId) : null);

function showSkeleton(n = 8) {
    const grid = viewMode === 'grid';
    const list = $('seer-main-list');
    list.classList.toggle('seer-grid', grid);
    const one = grid
        ? '<div class="seer-row is-card seer-skel"><div class="seer-poster-wrap"><div class="seer-skel-box"></div></div><div class="seer-info"><div class="seer-skel-line w80"></div></div><div class="seer-card-meta"><div class="seer-skel-line w40"></div></div></div>'
        : '<div class="seer-row seer-skel"><div class="seer-poster-wrap"><div class="seer-skel-box"></div></div><div class="seer-info"><div class="seer-skel-line w60"></div><div class="seer-skel-line w40"></div></div></div>';
    list.innerHTML = one.repeat(grid ? n * 2 : n);
}

const HASH_PREFIX = '#seer?';
let lastHash = '';
const viewKeyOf = (key, section) => key + ':' + (section ? section.id : '');

let hashT = null;
function syncHash() { clearTimeout(hashT); hashT = setTimeout(syncHashNow, 250); }
function syncHashNow() {
    const app = $('mirseer-app');
    if (!app || app.style.display !== 'block') return;
    const p = new URLSearchParams();
    if (view.key !== 'home') p.set('v', view.key);
    if (view.key === 'section' && view.section) { p.set('id', view.section.id); p.set('name', view.section.name); }
    if (view.key === 'releaser' && rel) { p.set('rel', rel.name); if (rel.id) p.set('rid', rel.id); }
    if (search.active) { p.set('q', search.query); p.set('scope', $('seer-search-section-filter').value); }
    if (sortMode !== 'recent') p.set('sort', sortMode);
    if (viewMode === 'grid') p.set('mode', 'grid');
    if (isPagedView() && PG.page > 1) p.set('p', PG.page);
    const fl = ['ita', 'complete'].filter(k => filters[k]);
    if (filters.res !== 'all') p.set('res', filters.res);
    if (fl.length) p.set('f', fl.join(','));
    if (filters.genre !== 'all') p.set('g', filters.genre);
    if (filters.releaser) p.set('rl', filters.releaser);
    if (filters.yFrom) p.set('yf', filters.yFrom);
    if (filters.yTo) p.set('yt', filters.yTo);
    if (filters.minVote) p.set('mv', filters.minVote);
    const s = p.toString();
    lastHash = s ? HASH_PREFIX + s : '';
    try { history.replaceState(null, '', location.pathname + location.search + lastHash); } catch (e) {}
}
async function restoreFromHash() {
    if (!location.hash.startsWith(HASH_PREFIX)) return false;
    const p = new URLSearchParams(location.hash.slice(HASH_PREFIX.length));
    Object.assign(filters, newFilters());
    const sm = p.get('sort'); if (SORT_MODES.includes(sm)) { sortMode = sm; $('seer-sort-select').value = sm; }
    if (p.get('mode') === 'grid' || p.get('mode') === 'list') viewMode = p.get('mode');
    const fl = (p.get('f') || '').split(',');
    ['ita', 'complete'].forEach(k => { if (fl.includes(k)) filters[k] = true; });
    if (['4k', '1080', '720', 'sd'].includes(p.get('res'))) filters.res = p.get('res');
    else if (fl.includes('q4k')) filters.res = '4k';
    if (p.get('g')) filters.genre = p.get('g');
    if (p.get('rl')) filters.releaser = p.get('rl');
    filters.yFrom = parseInt(p.get('yf'), 10) || null;
    filters.yTo = parseInt(p.get('yt'), 10) || null;
    filters.minVote = parseFloat(p.get('mv')) || 0;
    advOpen = !!(filters.yFrom || filters.yTo || filters.releaser || filters.minVote || filters.genre !== 'all');

    { const q0 = p.get('q'), pn = parseInt(p.get('p'), 10) || 0, isS = !!(q0 && q0.length >= 3);
      PG.want = isS ? 0 : pn; PG.wantSearch = isS ? pn : 0; }
    const v = p.get('v') || 'home';
    if (v === 'releaser' && p.get('rel')) await openReleaser(p.get('rel'), p.get('rid'));
    else if (v === 'section' && p.get('id')) await setView('section', { id: p.get('id'), name: p.get('name') || (sectionList.find(s => String(s.fid) === p.get('id')) || {}).name || 'Sezione' });
    else await setView(['films', 'series', 'favs', 'releasers'].includes(v) ? v : 'home');

    const q = p.get('q');
    if (q && q.length >= 3) {
        const sel = $('seer-search-section-filter'), sc = p.get('scope');
        if (sc) { sel.value = sc; if (sel.value !== sc) sel.value = 'current'; }
        $('seer-search-input').value = q;
        await runSearch(q);
    }
    return true;
}

const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return '99,102,241'; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); };
const ACCENTS = [['#6366f1', '#a855f7'], ['#10b981', '#06b6d4'], ['#f43f5e', '#f97316'], ['#f59e0b', '#ef4444'], ['#0ea5e9', '#6366f1'], ['#ec4899', '#8b5cf6']];
function applyAppearance() {
    const r = document.documentElement.style;
    r.setProperty('--seer-accent', settings.accent);
    r.setProperty('--seer-accent-2', settings.accent2);
    r.setProperty('--seer-accent-glow', `rgba(${hexRgb(settings.accent)}, 0.4)`);
    r.setProperty('--seer-border-hover', `rgba(${hexRgb(settings.accent)}, 0.45)`);
    const app = $('mirseer-app');
    if (app) app.classList.toggle('seer-compact', settings.density === 'compact');
}
const itemGenres = it => (it.genres && it.genres.length) ? it.genres
    : (it.genre ? it.genre.split(/[,/|]/).map(s => s.trim()).filter(Boolean) : []);
function renderGenres() {
    const box = $('seer-genres');
    if (!box) return;
    if (!facetsFor().rated) { box.innerHTML = ''; return; }
    const cnt = new Map();
    lastBase.forEach(it => itemGenres(it).forEach(g => {
        const k = normT(g);
        if (!k) return;
        const c = cnt.get(k) || { label: g, n: 0 };
        c.n++; cnt.set(k, c);
    }));
    const top = [...cnt.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 14);
    if (filters.genre !== 'all' && !cnt.has(filters.genre)) top.push([filters.genre, { label: filters.genre, n: 0 }]);
    box.innerHTML = top.length
        ? '<span class="seer-adv-note">🎭 Generi:</span>' + top.map(([k, c]) => `<button class="seer-facet ${filters.genre === k ? 'active' : ''}" data-genre="${esc(k)}">${esc(c.label)} <small>${c.n}</small></button>`).join('')
        : '';
}
let genreTimer = null;
const genresSoon = () => { clearTimeout(genreTimer); genreTimer = setTimeout(renderGenres, 400); };
const REL_TIERS = [[1500, 'Legend', '👑'], [500, 'Senior', '🥇'], [200, 'Lv. 3', '🥈'], [100, 'Lv. 2', '🥉'], [50, 'Lv. 1', '⭐'], [10, 'Junior', '🔹'], [1, 'New', '🌱']];
const relTier = n => REL_TIERS.find(t => n >= t[0]) || REL_TIERS[REL_TIERS.length - 1];
const relPage = { list: [], t: 0, loading: false, err: '', q: '', tier: 'all', timer: null, obs: null };
const relEntry = name => relPage.list.find(x => x.name === name) || { name, id: null, avatar: null };

async function findReleasersUrl() {
    const saved = String(getPref('relUrl', '') || '').trim();
    if (saved) return saved;
    const pick = doc => {
        const links = [...doc.querySelectorAll('a[href]')].filter(a => !a.closest('#mirseer-app'));
        return links.find(a => /^\s*releasers?\s*$/i.test(a.textContent))
            || links.find(a => /releasers/i.test(a.getAttribute('href') || ''));
    };
    let a = pick(document);
    if (!a) {
        try {
            const r = await fetch('/index.php', { credentials: 'same-origin' });
            a = pick(new DOMParser().parseFromString(await r.text(), 'text/html'));
        } catch (e) {}
    }
    return a ? absHref(a) : '';
}

function parseReleasersDoc(doc) {
    const out = [], seen = new Set();
    doc.querySelectorAll('table tr').forEach(tr => {
        const td = tr.querySelectorAll('td');
        if (td.length < 2) return;
        const count = parseInt(td[td.length - 1].textContent.replace(/\D/g, ''), 10);
        const name = td[0].textContent.replace(/\s+/g, ' ').trim();
        if (!name || isNaN(count) || seen.has(name.toLowerCase())) return;
        seen.add(name.toLowerCase());
        const a = [...tr.querySelectorAll('a[href]')].find(x => /[?&]u=\d+/.test(x.getAttribute('href')));
        const id = a ? ((a.getAttribute('href').match(/[?&]u=(\d+)/) || [])[1] || null) : null;
        const img = [...tr.querySelectorAll('img')].find(i => {
            const u = i.getAttribute('data-src') || i.getAttribute('src') || '';
            return /avatar/i.test((i.className || '') + ' ' + u) && !/rank|smil|icon|spacer/i.test(u);
        });
        const s = img && (img.getAttribute('data-src') || img.getAttribute('src'));
        out.push({ name, id, count, avatar: s && !s.startsWith('data:') ? absUrl(s) : null, tier: relTier(count)[1] });
    });
    out.sort((a, b) => b.count - a.count);
    out.forEach((r, i) => { r.rank = i + 1; });
    return out;
}

function applyRelBase(list) {
    let b = getPref('relBase', null);
    const now = Date.now();
    if (!b || !b.m || now - b.t > 864e5) {
        b = { t: now, m: Object.fromEntries(list.map(r => [r.name.toLowerCase(), r.count])) };
        setPref('relBase', b);
    }
    list.forEach(r => { const o = b.m[r.name.toLowerCase()]; r.delta = o == null ? 0 : Math.max(0, r.count - o); });
}

async function loadReleasersData(force = false) {
    if (relPage.loading) return;
    const ck = CACHE_PREFIX + 'releasers';
    if (!relPage.list.length) {
        try { const c = JSON.parse(cacheGet(ck) || 'null'); if (c && c.list) { relPage.list = c.list; relPage.t = c.t; } } catch (e) {}
    }
    if (!force && relPage.list.length && Date.now() - relPage.t < 600000) { paintRlGroups(); paintRlStatus(); return; }
    relPage.loading = true; relPage.err = '';
    paintRlStatus(); paintRlGroups();
    try {
        const url = await findReleasersUrl();
        if (!url) throw new Error('nolink');
        await netGate();
        const resp = await fetch(url, { credentials: 'same-origin' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const list = parseReleasersDoc(new DOMParser().parseFromString(await resp.text(), 'text/html'));
        if (!list.length) throw new Error('empty');
        applyRelBase(list);
        relPage.list = list; relPage.t = Date.now();
        cacheSet(ck, JSON.stringify({ t: relPage.t, list }));
    } catch (e) { relPage.err = String((e && e.message) || e); }
    finally {
        relPage.loading = false;
        if (view.key === 'releasers' && !search.active) {
            if ($('seer-rl-groups')) { paintRlGroups(); paintRlStatus(); } else renderReleasersPage();
        }
    }
}

function startRelRefresh() {
    clearInterval(relPage.timer);
    relPage.timer = setInterval(() => {
        if (view.key !== 'releasers') { clearInterval(relPage.timer); return; }
        if (!document.hidden && $('mirseer-app').style.display === 'block') loadReleasersData(true);
    }, 600000);
    loadReleasersData();
}

function relCardHtml(r) {
    const f = isFollowingRel(r.name);
    const av = r.avatar ? `<img src="${esc(r.avatar)}" alt="" referrerpolicy="no-referrer">` : '👤';
    const d = r.delta > 0 ? ` <span class="seer-rl-delta" title="Nuove release dal controllo giornaliero">▲ +${r.delta}</span>` : '';
    return `<div class="seer-rl-card" data-name="${esc(r.name)}"${r.id ? ` data-id="${esc(r.id)}"` : ''}>` +
        `<div class="seer-rl-av">${av}</div>` +
        `<div class="seer-rl-meta"><span class="seer-rl-name" title="${esc(r.name)}">${esc(r.name)}</span><span class="seer-rl-count">#${r.rank} · ${r.count} release${d}</span></div>` +
        `<button class="seer-facet ${f ? 'active' : ''}" data-rlf="1">${f ? '✓ Seguito' : '➕ Segui'}</button></div>`;
}

function paintRlStatus() {
    const s = $('seer-rl-status');
    if (!s) return;
    s.textContent = relPage.loading ? 'Aggiornamento…'
        : relPage.err ? '⚠️ Aggiornamento non riuscito'
        : relPage.t ? 'Aggiornato alle ' + new Date(relPage.t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
    $('seer-count').innerText = relPage.list.length + ' releaser';
}

function paintRlFollow() {
    document.querySelectorAll('.seer-rl-card').forEach(c => {
        const b = c.querySelector('[data-rlf]'), f = isFollowingRel(c.dataset.name);
        b.classList.toggle('active', f);
        b.textContent = f ? '✓ Seguito' : '➕ Segui';
    });
}

function paintRlGroups() {
    const g = $('seer-rl-groups');
    if (!g) return;
    const q = relPage.q;
    const list = relPage.list.filter(r => !q || r.name.toLowerCase().includes(q));
    if (!list.length) {
        g.innerHTML = relPage.err
            ? `<div class="seer-status-msg err">Non riesco a leggere la pagina Releasers del forum.<br><br>Incolla qui l'indirizzo della pagina:<br><input class="seer-adv-input wide" id="seer-rl-url" style="width:min(420px,90%);margin:8px 0" placeholder="https://mircrew-releases.org/..."><br><button class="seer-facet" data-rlsave="1">Salva e riprova</button></div>`
            : `<p class="seer-status-msg">${relPage.loading ? 'Caricamento dei releaser…' : 'Nessun releaser trovato.'}</p>`;
        return;
    }
    g.innerHTML = REL_TIERS.map(t => {
        if (relPage.tier !== 'all' && relPage.tier !== t[1]) return '';
        const arr = list.filter(r => r.tier === t[1]);
        if (!arr.length) return '';
        return `<div class="seer-group-title"><span>${t[2]} Releaser ${t[1]} <small style="opacity:.6">(${t[0]}+ release)</small></span><em>${arr.length}</em></div>` +
            `<div class="seer-rl-grid">${arr.map(relCardHtml).join('')}</div>`;
    }).join('');

    if (relPage.obs) relPage.obs.disconnect();
    relPage.obs = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (!en.isIntersecting) return;
            const c = en.target;
            relPage.obs.unobserve(c);
            const r = relEntry(c.dataset.name);
            if (r.avatar) return;
            getRelAvatar(r).then(src => {
                if (!src) return;
                r.avatar = src;
                if (c.isConnected) setRlAvatar(c, src);
            });
        });
    }, { root: $('mirseer-app'), rootMargin: '300px 0px' });
    g.querySelectorAll('.seer-rl-card').forEach(c => relPage.obs.observe(c));
}

function renderReleasersPage() {
    const box = $('seer-main-list');
    box.classList.remove('seer-grid');
    lastDisplayed = [];
    const chips = [['all', 'Tutti']].concat(REL_TIERS.map(t => [t[1], t[2] + ' ' + t[1]]))
        .map(([k, l]) => `<button class="seer-facet ${relPage.tier === k ? 'active' : ''}" data-rltier="${esc(k)}">${esc(l)}</button>`).join('');
    box.innerHTML =
        `<div class="seer-rl-head"><input class="seer-adv-input wide" id="seer-rl-q" placeholder="Cerca releaser…" value="${esc(relPage.q)}" autocomplete="off" spellcheck="false">${chips}` +
        `<span style="flex:1"></span><span class="seer-adv-note" id="seer-rl-status"></span><button class="seer-facet" data-rlrefresh="1">🔄 Aggiorna</button></div>` +
        `<div id="seer-rl-groups"></div>`;
    paintRlStatus(); paintRlGroups();
}

function relPageClick(e) {
    if (view.key !== 'releasers' || search.active) return;
    const f = e.target.closest('[data-rlf]');
    if (f) {
        const r = relEntry(f.closest('.seer-rl-card').dataset.name);
        toggleFollowRel(r.name, r.id, r.avatar); paintRlFollow();
        return;
    }
    const t = e.target.closest('[data-rltier]');
    if (t) {
        relPage.tier = t.dataset.rltier;
        document.querySelectorAll('[data-rltier]').forEach(b => b.classList.toggle('active', b === t));
        paintRlGroups();
        return;
    }
    if (e.target.closest('[data-rlrefresh]')) { loadReleasersData(true); return; }
    if (e.target.closest('[data-rlsave]')) {
        const v = ($('seer-rl-url') || {}).value;
        if (v && v.trim()) { setPref('relUrl', v.trim()); relPage.err = ''; loadReleasersData(true); }
        return;
    }
    const c = e.target.closest('.seer-rl-card');
    if (c) { const r = relEntry(c.dataset.name); openReleaser(r.name, r.id, r.avatar); }
}

const inflight = new Map();
const jobQueue = [];
let activeJobs = 0;

function enqueue(key, task, el = null, low = false) {
    return new Promise((resolve, reject) => {
        jobQueue.push({ key, task, el, low, resolve, reject });
        pump();
    });
}

function jobScore(job) {
    if (job.low) return 1e9;
    if (!job.el) return -1;
    const r = job.el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom >= 0 && r.top <= vh) return r.top + r.left / 1000;
    return 100000 + Math.abs(r.top - vh / 2);
}

function pump() {
    if (activeJobs >= MAX_CONCURRENT || !jobQueue.length) return;
    for (let i = jobQueue.length - 1; i >= 0; i--) {
        const j = jobQueue[i];
        if (j.el && !j.el.isConnected) { jobQueue.splice(i, 1); inflight.delete(j.key); j.resolve(CANCELLED); }
    }
    jobQueue.forEach(j => { j._s = jobScore(j); });
    jobQueue.sort((a, b) => a._s - b._s);
    while (activeJobs < MAX_CONCURRENT && jobQueue.length) {
        const job = jobQueue.shift();
        activeJobs++;
        job.task().then(job.resolve, job.reject).finally(() => { activeJobs--; pump(); });
    }
}

function cancelQueued() {
    for (let i = jobQueue.length - 1; i >= 0; i--) {
        if (jobQueue[i].el) {
            const [job] = jobQueue.splice(i, 1);
            inflight.delete(job.key);
            job.resolve(CANCELLED);
        }
    }
}

const POST_OPEN_SRC = '<div\\b[^>]*\\bclass="(?:[^"]*\\s)?post(?:\\s[^"]*)?"';
function collectPostStarts(html, from, found) {
    const re = new RegExp(POST_OPEN_SRC, 'g');
    re.lastIndex = Math.max(0, from);
    let m;
    while (found.length < 2 && (m = re.exec(html))) {
        if (!found.includes(m.index)) found.push(m.index);
    }
}

async function fetchTopicPage(url, fresh = false) {
    const resp = await fetch(url, { credentials: 'same-origin', cache: fresh ? 'no-store' : 'default' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    let html = '';
    if (resp.body && resp.body.getReader) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        const starts = [];
        let scanFrom = 0, cut = false;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
            collectPostStarts(html, scanFrom, starts);
            scanFrom = Math.max(0, html.length - 300);
            if (starts.length >= 2) {
                starts.sort((a, b) => a - b);
                html = html.slice(0, starts[1]);
                cut = true;
                reader.cancel().catch(() => {});
                break;
            }
        }
        if (!cut) html += decoder.decode();
        if (cut) html += '</body></html>';
    } else {
        html = await resp.text();
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return { doc, html };
}

async function fetchTopicPageRetry(url) {
    try { return await fetchTopicPage(url); }
    catch (e) {
        if (/HTTP 4(?!29)\d\d/.test(String((e && e.message) || ''))) throw e;
        await sleep(900);
        return fetchTopicPage(url);
    }
}

const SHOT_MARKER_RE = /screenshots?|\bscreens?\b|anteprim[ae]|immagini\s+del\s+file|media\s*info/i;
const POSTER_WORD_RE = /locandina|poster|cover|copertina/i;
const SPEC_MARKER_RE = /scheda\s*tecnica|dati\s*tecnici|info\s*release|specifiche|mediainfo|\baudio\s*:|\bvideo\s*:|formato\s*:|risoluzione\s*:/i;
const HARD_JUNK_RE = /smilies|smiley|emoji|\/ranks?\/|rank_|icon_|avatar|userbar|divider|separat|spacer|btn_|button|paypal|donat|ko-?fi|patreon|buymeacoffee|telegram|discord|mediainfo/i;
const SOFT_JUNK_RE = /banner|header|footer|logo|mircrew|badge|rating|firma|signature|\bsig\b|seeding|upload|releaser|torrent|tracker|promo|sponsor|watermark|welcome|\brls\b/i;
const BAD_LINK_RE = /t\.me|telegram|discord|paypal|patreon|ko-fi|buymeacoffee|donat|(?:viewtopic|viewforum|index|memberlist|ucp|search)\.php/i;
const POSTER_HINT_RE = /poster|locandina|cover|folder|front|fanart|backdrop/i;
const SCREEN_NAME_RE = /screenshot|screen[_-]?\d|snapshot|\bscr\d/i;

const CREW_WORDS = ['mircrew', 'novarip', 'phantomx', 'ph4nt0mx', 'phantom', 'spyro', 'presenta', 'release', 'banner', 'header', 'logo'];
function crewWordsFor(item, author) {
    const words = new Set(CREW_WORDS);
    const add = s => { const n = String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); if (n.length >= 4 && !/^(?:\d{3,4}p|x26[45]|hevc|h26[45])$/.test(n)) words.add(n); };
    add((item.rawTitle.match(/-\s*([A-Za-z0-9_.]{3,20})\s*(?:[\])]|$)/) || [])[1]);
    add(author || item.author);
    return [...words];
}

const titleKey = item => item.cleanTitle.toLowerCase();
const isWideBanner = (w, h) => !!(w && h && w / h > 2.2 && h < 220);

function junkDims(w, h) {
    if (!w || !h) return false;
    const r = w / h;
    return w < 60 || h < 60 || r > 5.5 || r < 0.18 || isWideBanner(w, h);
}

function collectPosterCandidates(root, crewWords) {
    const out = [];
    const seen = new Set();
    let afterShots = false, seenSpecs = false, nearLeft = 0;
    let order = 0;

    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
        if (n.nodeType === 3) {
            const t = n.nodeValue;
            if (!afterShots && SHOT_MARKER_RE.test(t)) afterShots = true;
            if (!seenSpecs && SPEC_MARKER_RE.test(t)) seenSpecs = true;
            if (POSTER_WORD_RE.test(t)) nearLeft = 2;
            continue;
        }
        if (n.tagName !== 'IMG') continue;

        const near = nearLeft > 0;
        if (nearLeft > 0) nearLeft--;

        const rawSrc = n.getAttribute('data-src') || n.getAttribute('data-lazy-src') || n.getAttribute('data-original') || n.getAttribute('src');
        if (!rawSrc || rawSrc.startsWith('data:')) continue;
        let url;
        try { url = new URL(rawSrc, SITE_ROOT); } catch (e) { continue; }

        const src = url.href;
        if (seen.has(src)) continue;
        seen.add(src);

        if (n.closest('.signature, .sig')) continue;
        if (n.classList.contains('smilies')) continue;
        if (/\.gif$/i.test(url.pathname)) continue;

        let pathname = url.pathname;
        try { pathname = decodeURIComponent(pathname); } catch (e) {}
        const label = pathname.toLowerCase() + ' ' + (n.getAttribute('alt') || '').toLowerCase() + ' ' + (n.getAttribute('title') || '').toLowerCase();
        if (HARD_JUNK_RE.test(label)) continue;
        if (url.hostname === location.hostname && /\/(?:images|styles|ext|assets)\//i.test(url.pathname)) continue;

        const wrap = n.closest('a[href]');
        if (wrap && BAD_LINK_RE.test(wrap.getAttribute('href') || '')) continue;

        const wAttr = parseInt(n.getAttribute('width'), 10);
        const hAttr = parseInt(n.getAttribute('height'), 10);
        if ((wAttr && wAttr < 100) || (hAttr && hAttr < 100)) continue;

        let wide = isWideBanner(wAttr, hAttr);
        if (!wide) {
            const dm = label.match(/(\d{3,4})\s*[x×]\s*(\d{2,3})\b/);
            if (dm && isWideBanner(+dm[1], +dm[2])) wide = true;
        }

        const norm = (label + ' ' + url.hostname.toLowerCase()).replace(/[^a-z0-9]/g, '');
        const crew = crewWords.some(w => norm.includes(w));

        out.push({
            src, order: order++, afterShots,
            beforeSpecs: !seenSpecs,
            near, wide, crew,
            hint: POSTER_HINT_RE.test(label),
            soft: SOFT_JUNK_RE.test(label),
            shot: SCREEN_NAME_RE.test(label),
            tmdb: /tmdb\.org$/i.test(url.hostname)
        });
        if (out.length >= 14) break;
    }
    return out;
}

function scoreCandidate(c) {
    let s = 100 - c.order * 4;
    if (c.hint) s += 60;
    if (c.near) s += 70;
    if (c.tmdb) s += 50;
    if (c.beforeSpecs) s += 20;
    if (c.afterShots) s -= 80;
    if (c.shot) s -= 80;
    if (c.soft) s -= 90;
    if (c.crew) s -= 160;
    if (c.wide) s -= 300;
    if (isRepeatedImage(c.src)) s -= 200;
    return s;
}

function pickPosters(root, item, author) {
    const cands = collectPosterCandidates(root, crewWordsFor(item, author));
    if (!cands.length) return null;
    noteImages(cands.map(c => c.src), titleKey(item));
    const ranked = cands.map(c => ({ c, s: scoreCandidate(c) })).sort((a, b) => b.s - a.s).map(x => x.c.src);
    return { best: ranked[0], alts: ranked.slice(1, 8) };
}

function advancePoster(item) {
    item.posterBad = item.posterBad || new Set();
    if (item.poster) item.posterBad.add(item.poster);
    const next = (item.posterAlts || []).find(u => !item.posterBad.has(u));
    if (next) {
        item.posterAlts = item.posterAlts.filter(u => u !== next);
        item.poster = next;
        item.posterSrc = 'forum';
        warmImage(next);
    } else {
        item.poster = null;
        if (getTmdbKey() && !item.tmdbTried && (effKind(item) === 'video' || !item.kind)) {
            item.tmdbTried = true;
            tmdbLookup(item).then(t => {
                if (t && t.poster && !item.poster) {
                    item.poster = t.poster; item.posterSrc = 'tmdb';
                    saveCache(item); refreshItem(item);
                }
            }).catch(() => {});
        }
    }
    saveCache(item);
    refreshItem(item);
}

function refreshItem(item) {
    const row = document.querySelector(`.seer-row[data-topic-id="${CSS.escape(String(item.id))}"]`);
    if (row) fillRow(row, item);
    if (heroSlides.includes(item)) renderHero();
    const ov = $('seer-modal-overlay');
    if (currentModalItem === item && ov && ov.style.display === 'flex') { paintModalArt(item); paintModalTools(item); }
}

function onImageProblem(img) {
    const item = registry.get(String(img.dataset.seerId));
    if (!item) return;
    const src = img.getAttribute('src');
    if (isProjLike(item) && img.dataset.seerRole !== 'bg' && item.poster === src) {
        const n = item._imgRetry = (item._imgRetry || 0) + 1;
        pjLog(item.id, 'errore caricamento banner, giro', n, src);
        if (n <= 3) {
            setTimeout(() => { if (img.isConnected && img.getAttribute('src') === src) { img.removeAttribute('src'); img.src = src; } }, 1500 * n);
        } else {
            const f = document.createElement('div');
            f.className = 'seer-poster-fallback';
            f.innerHTML = item.kind ? kindIcon(item) : typeIcon(item);
            img.replaceWith(f);
        }
        return;
    }
    if (img.dataset.seerRole === 'bg') {
        if (item.backdrop && item.backdrop === src) { item.backdrop = null; saveCache(item); refreshItem(item); }
        else if (item.poster === src) advancePoster(item);
        return;
    }
    if (item.poster === src) advancePoster(item);
}

function httpGetJson(url) {
    return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest === 'function') {
            GM_xmlhttpRequest({
                method: 'GET', url, timeout: 8000,
                onload: r => { try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(e); } },
                onerror: reject, ontimeout: reject
            });
        } else {
            fetch(url).then(r => r.json()).then(resolve, reject);
        }
    });
}
const IMDB_URL_RE = /imdb\.com\/(?:[a-z]{2}\/)?title\/(tt\d{6,10})/i;
const TMDB_URL_RE = /themoviedb\.org\/(movie|tv)\/(\d+)/i;
function findExtId(root, text) {
    const hrefs = root ? [...root.querySelectorAll('a[href]')].map(a => a.getAttribute('href') || '') : [];
    const t = text || '';
    let m;
    for (const h of hrefs) if ((m = h.match(IMDB_URL_RE))) return m[1].toLowerCase();
    if ((m = t.match(IMDB_URL_RE)) || (m = t.match(/\b(tt\d{7,10})\b/i))) return m[1].toLowerCase();
    for (const h of hrefs) if ((m = h.match(TMDB_URL_RE))) return `tmdb:${m[1].toLowerCase()}:${m[2]}`;
    if ((m = t.match(TMDB_URL_RE))) return `tmdb:${m[1].toLowerCase()}:${m[2]}`;
    return null;
}

const tmdbOut = (r, kind) => ({
    id: r.id || null,
    kind: kind || null,
    title: (kind === 'tv' ? r.name : r.title) || null,
    origName: (kind === 'tv' ? r.original_name : r.original_title) || null,
    year: (((kind === 'tv' ? r.first_air_date : r.release_date) || '').slice(0, 4)) || null,
    byId: false,
    poster: r.poster_path ? 'https://image.tmdb.org/t/p/w500' + r.poster_path : null,
    backdrop: r.backdrop_path ? 'https://image.tmdb.org/t/p/w1280' + r.backdrop_path : null,
    overview: r.overview || '',
    vote: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
    genres: Array.isArray(r.genres) ? r.genres.map(g => g.name).slice(0, 4) : [],
    trailer: null, imdbId: r.imdb_id || null
});

async function tmdbEnrich(out, apiKey) {
    if (!out || !out.id || !out.kind) return null;
    try {
        const j = await httpGetJson(`https://api.themoviedb.org/3/${out.kind}/${out.id}?api_key=${encodeURIComponent(apiKey)}&language=it-IT&append_to_response=videos,external_ids&include_video_language=it,en,null`);
        if (!j || !j.id) return null;
        const vids = (j.videos && Array.isArray(j.videos.results)) ? j.videos.results : [];
        const yt = vids.filter(v => v.site === 'YouTube' && v.key && (v.type === 'Trailer' || v.type === 'Teaser'));
        const rank = v => (v.type === 'Trailer' ? 100 : 40) + (v.iso_639_1 === 'it' ? 30 : v.iso_639_1 === 'en' ? 10 : 0) + (v.official ? 5 : 0);
        const best = yt.sort((a, b) => rank(b) - rank(a))[0];
        const ext = j.external_ids || {};
        return {
            vote: j.vote_average ? Math.round(j.vote_average * 10) / 10 : out.vote,
            genres: Array.isArray(j.genres) ? j.genres.map(g => g.name).slice(0, 4) : out.genres,
            trailer: best ? { key: best.key, name: best.name || '' } : null,
            imdbId: j.imdb_id || ext.imdb_id || null
        };
    } catch (e) { return null; }
}

const titleColl = new Intl.Collator('it', { numeric: true, sensitivity: 'base' });
const nameColl = new Intl.Collator('it');
const normCache = new Map();
const normT = s => {
    s = String(s || '');
    let r = normCache.get(s);
    if (r === undefined) {
        r = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
        if (normCache.size > 20000) normCache.clear();
        normCache.set(s, r);
    }
    return r;
};

const COUNTRY_MAP = [
    [/\b(usa\b|stati\s*uniti|america)/i, 'US'], [/\b(italia|italy)/i, 'IT'],
    [/\b(regno\s*unito|uk\b|inghilterra|gran\s*bretagna)/i, 'GB'], [/\b(francia|france)/i, 'FR'],
    [/\b(giappone|japan)/i, 'JP'], [/\b(corea|korea)/i, 'KR'], [/\b(spagna|spain)/i, 'ES'],
    [/\b(germania|germany)/i, 'DE'], [/\b(canada)/i, 'CA'], [/\b(australia)/i, 'AU']
];
const countryCode = s => { if (!s) return null; const m = COUNTRY_MAP.find(([re]) => re.test(s)); return m ? m[1] : null; };

function pickTmdbResult(results, kind, item) {
    const wanted = [item.origTitle, item.cleanTitle].filter(Boolean).map(normT);
    const y = parseInt(item.fieldYear || item.year, 10) || null;
    const cc = countryCode(item.country);
    const sn = item.meta && item.meta.season;
    const firstSeason = !sn || sn.season == null || sn.season <= 1;
    let best = null, bestScore = 0;

    for (const r of results.slice(0, 10)) {
        const name = normT(kind === 'tv' ? r.name : r.title);
        const orig = normT(kind === 'tv' ? r.original_name : r.original_title);
        const date = (kind === 'tv' ? r.first_air_date : r.release_date) || '';
        const ry = parseInt(date.slice(0, 4), 10) || null;
        let s = 0;

        if (wanted.includes(name) || wanted.includes(orig)) s += 40;
        else if (wanted.some(w => w && (name.startsWith(w + ' ') || orig.startsWith(w + ' ')))) s += 8;

        if (y && ry) {
            const d = Math.abs(ry - y);
            if (d === 0) s += 40;
            else if (d === 1) s += 25;
            else if (kind === 'movie' || firstSeason) continue;
        }
        if (cc && Array.isArray(r.origin_country) && r.origin_country.includes(cc)) s += 15;
        s += Math.min(r.popularity || 0, 50) / 10;

        if (s > bestScore) { bestScore = s; best = r; }
    }
    return bestScore >= 40 ? best : null;
}

async function tmdbSearchSmart(item, apiKey, kind) {
    const y = item.fieldYear || item.year || '';
    const queries = [item.origTitle || item.cleanTitle];
    if (item.origTitle && normT(item.origTitle) !== normT(item.cleanTitle)) queries.push(item.cleanTitle);

    for (const q of queries) {
        for (const withYear of (y ? [true, false] : [false])) {
            let url = `https://api.themoviedb.org/3/search/${kind}?api_key=${encodeURIComponent(apiKey)}&language=it-IT&query=${encodeURIComponent(q)}`;
            if (withYear) url += kind === 'tv' ? `&first_air_date_year=${y}` : `&year=${y}`;
            const j = await httpGetJson(url);
            if (!j || !Array.isArray(j.results)) return undefined;
            const r = pickTmdbResult(j.results, kind, item);
            if (r) return r;
        }
    }
    return null;
}

const tmdbPending = new Map();
function tmdbLookup(item) {
    const k = [item.type, item.extId || '', normT(item.origTitle || item.cleanTitle), item.fieldYear || item.year || '', (item.meta && item.meta.isTvSeries) ? 1 : 0].join('|');
    let p = tmdbPending.get(k);
    if (!p) {
        p = tmdbLookupRaw(item).finally(() => { if (tmdbPending.get(k) === p) tmdbPending.delete(k); });
        tmdbPending.set(k, p);
    }
    return p;
}
async function tmdbLookupRaw(item) {
    const apiKey = getTmdbKey();
    if (!apiKey) return null;
    const ext = item.extId || '';
    const isVideoSection = sectionKindOf(item.type) === 'video';
    if (item.type !== 'Film' && item.type !== 'Serie TV' && !(ext && isVideoSection)) return null;

    if (ext) {
        const idKey = `${CACHE_PREFIX}tmdb_id_${ext.replace(/[^a-z0-9]/gi, '_')}`;
        try { const c = cacheGet(idKey); if (c) { const hit = JSON.parse(c); if (hit && (hit.title !== undefined || !hit.id)) return hit; } } catch (e) {}
        try {
            let r = null, rk = null;
            if (/^tt\d+$/.test(ext)) {
                const j = await httpGetJson(`https://api.themoviedb.org/3/find/${ext}?api_key=${encodeURIComponent(apiKey)}&language=it-IT&external_source=imdb_id`);
                if (!j || !Array.isArray(j.movie_results) || !Array.isArray(j.tv_results)) return null;
                const preferTv = item.type === 'Serie TV' || !!(item.meta && item.meta.isTvSeries);
                const tvR = j.tv_results[0], mvR = j.movie_results[0];
                if (preferTv) { r = tvR || mvR; rk = tvR ? 'tv' : 'movie'; }
                else { r = mvR || tvR; rk = mvR ? 'movie' : 'tv'; }
            } else {
                const [, kindRef, idRef] = ext.split(':');
                const j = await httpGetJson(`https://api.themoviedb.org/3/${kindRef}/${idRef}?api_key=${encodeURIComponent(apiKey)}&language=it-IT`);
                if (j && j.id) { r = j; rk = kindRef; }
            }
            if (r) {
                const out = tmdbOut(r, rk);
                out.byId = true;
                const en = await tmdbEnrich(out, apiKey);
                if (en) {
                    Object.assign(out, en);
                    cacheSet(idKey, JSON.stringify({ t: Date.now(), ...out }));
                }
                return out;
            }
        } catch (e) { console.warn('TMDB id lookup failed, uso la ricerca per titolo', e); }
        if (item.type !== 'Film' && item.type !== 'Serie TV') return null;
    }

    const kind = item.type === 'Serie TV' ? 'tv' : 'movie';
    const yKey = item.fieldYear || item.year || '';
    const ck = `${CACHE_PREFIX}tmdb_${kind}_${normT(item.origTitle || item.cleanTitle).replace(/ /g, '_')}_${yKey}`;
    try {
        const c = cacheGet(ck);
        if (c) {
            const hit = JSON.parse(c);
            if (hit && (hit.id ? hit.title !== undefined : Date.now() - (hit.t || 0) < 3 * 864e5)) return hit;
        }
    } catch (e) {}

    const r = await tmdbSearchSmart(item, apiKey, kind);
    if (r === undefined) throw new Error('TMDb: risposta non valida');
    if (!r) {
        cacheSet(ck, JSON.stringify({ t: Date.now() }));
        return {};
    }
    const out = tmdbOut(r, kind);
    const en = await tmdbEnrich(out, apiKey);
    if (en) {
        Object.assign(out, en);
        cacheSet(ck, JSON.stringify({ t: Date.now(), ...out }));
    }
    return out;
}

const magnetKey = uri => { const m = uri.match(/btih:([a-z0-9]+)/i); return m ? m[1].toLowerCase() : uri; };
const magnetDn = uri => { const m = uri.match(/[?&]dn=([^&]+)/i); return m ? safeDecode(m[1].replace(/\+/g, ' ')) : ''; };

function anchorContext(a) {
    let acc = '', hops = 0;
    let prev = a.previousSibling;
    while (prev && acc.length < 110 && hops++ < 6) {
        if (prev.nodeType === 3) acc = prev.nodeValue + acc;
        else if (prev.nodeName === 'BR') { if (acc.trim()) break; }
        else if (prev.nodeName === 'A' && /^magnet:/i.test(prev.getAttribute('href') || '')) break;
        else acc = (prev.textContent || '') + acc;
        prev = prev.previousSibling;
    }
    let ctx = acc.trim();
    if (!parseEpisodeRef(ctx)) {
        const p = a.parentElement;
        if (p && /^(LI|P|TD|DIV|SPAN|DD|DT)$/.test(p.tagName)) {
            const pt = (p.textContent || '').replace(/\s+/g, ' ').trim();
            if (pt.length < 220) ctx = pt;
        }
    }
    return ctx;
}

function findMagnets(doc, rawText) {
    const out = [];
    const seen = new Set();
    const post = doc.querySelector('div.post, .post');
    const scope = post || doc.body || doc;
    const text = post ? post.innerHTML : (rawText || '');

    const push = (uriRaw, a) => {
        const uri = uriRaw.replace(/&amp;/g, '&');
        const k = magnetKey(uri);
        if (seen.has(k)) return;
        seen.add(k);
        const dn = magnetDn(uri);
        let ref = parseEpisodeRef(dn);
        if (!ref && a) ref = parseEpisodeRef(a.textContent || '') || parseEpisodeRef(anchorContext(a));
        out.push({ uri, dn, ref });
    };

    scope.querySelectorAll('a[href^="magnet:?"]').forEach(a => push(a.getAttribute('href'), a));
    const re = /magnet:\?xt=urn:[^\s"'<>\[\]]+/gi;
    let m;
    while ((m = re.exec(text))) push(m[0], null);

    if (out.length > 1 && out.every(x => x.ref && x.ref.ep != null)) {
        out.sort((a, b) => ((a.ref.season || 0) - (b.ref.season || 0)) || (a.ref.ep - b.ref.ep));
    }
    return out.map((x, i) => ({
        uri: x.uri, dn: x.dn,
        label: magnetLabel(x.ref, i),
        season: x.ref ? x.ref.season : null,
        ep: x.ref ? x.ref.ep : null
    }));
}

function applyParsed(item, p) {
    item.poster = p.poster || null;
    item.posterSrc = p.posterSrc || null;
    item.posterAlts = (p.posterAlts || []).slice();
    item.posterBad = new Set();
    item.backdrop = p.backdrop || null;
    item.synopsis = p.synopsis;
    item.magnets = (p.magnets || []).slice();
    item.magnet = p.magnet || (item.magnets[0] && item.magnets[0].uri) || null;
    item.thanksUrl = p.thanksUrl || null;
    item.extId = p.extId || null;
    item.origTitle = p.origTitle || null;
    item.fieldYear = p.fieldYear || null;
    item.genre = p.genre || null;
    item.country = p.country || null;
    item.tmdbId = p.tmdbId || null;
    item.tmdbKind = p.tmdbKind || null;
    item.vote = p.vote || null;
    item.genres = (p.genres || []).slice();
    item.trailer = p.trailer || null;
    item.imdbId = p.imdbId || null;
    item.mediaInfo = p.mediaInfo || null;
    item.sizeBytes = p.sizeBytes || 0;
    if (p.author && !item.author) item.author = p.author;
    item.authorId = p.authorId || item.authorId || null;
    item.authorAvatar = p.authorAvatar || item.authorAvatar || null;
    item.kind = p.kind || 'video';
    if (sectionKindOf(item.type) === 'video' && item.kind === 'audio') item.kind = 'video';
    item.body = p.body || null;
    item.tmdbTitle = p.tmdbTitle || null;
    item.tmdbYear = p.tmdbYear || null;
    item.displayTitle = composeDisplayTitle(item);
    if (isProjLike(item) && !item.poster) return;
    item.posterTried = true;
    resolvedMem.set(String(item.id), snapshot(item));
}

function composeDisplayTitle(item) {
    const m = item.meta || {};
    const base = item.tmdbTitle || item.cleanTitle || item.rawTitle || '';
    const y = String(item.year || item.tmdbYear || '');
    const has = y && new RegExp('(?:^|\\D)' + y + '(?!\\d)').test(base);
    const tag = (y && !has) ? ' (' + y + ')' : '';
    return (m.isTvSeries && m.season) ? `${base}${tag} \u2013 ${m.season.label}` : base + tag;
}

function tmdbTitleReliable(item, tm) {
    if (!tm || !tm.title) return false;
    if (tm.byId) return true;
    const wanted = [item.origTitle, item.cleanTitle].filter(Boolean).map(normT).filter(Boolean);
    const names = [tm.title, tm.origName].filter(Boolean).map(normT).filter(Boolean);
    return wanted.some(w => names.includes(w));
}

let tmdbTitleChain = Promise.resolve();
function upgradeTmdbTitle(item, cached) {
    if (!cached || cached.tmdbTitle !== undefined || !item.tmdbId || !item.tmdbKind || item._ttTried) return;
    const key = getTmdbKey();
    if (!key) return;
    item._ttTried = true;
    tmdbTitleChain = tmdbTitleChain.then(async () => {
        try {
            const j = await httpGetJson(`https://api.themoviedb.org/3/${item.tmdbKind}/${item.tmdbId}?api_key=${encodeURIComponent(key)}&language=it-IT`);
            if (!j || !j.id) return;
            const tm = tmdbOut(j, item.tmdbKind);
            tm.byId = !!item.extId;
            item.tmdbTitle = tmdbTitleReliable(item, tm) ? tm.title : null;
            item.tmdbYear = tm.year || null;
            item.displayTitle = composeDisplayTitle(item);
            saveCache(item);
            refreshItem(item);
        } catch (e) {  }
    });
}

const PROJ_TRIES_MAX = 3;
const PROJ_TRIES_LIFE = 6;
const PROJ_BACKOFF = [0, 1200, 3500];

function projFirstImgUrl(root, why = null) {
    if (!root) return null;
    for (const im of root.querySelectorAll('img')) {
        const src = im.getAttribute('data-src') || im.getAttribute('data-lazy-src') || im.getAttribute('data-original') || im.getAttribute('src') || '';
        let skip = '';
        if (im.closest('.signature, .sig')) skip = 'firma';
        else if (!src) skip = 'src vuoto';
        else if (/^data:/i.test(src)) skip = 'data-uri';
        else if (/(?:^|\s)smilies?(?:\s|$)|emoji/i.test(im.getAttribute('class') || '')
            || /\/smilies\/|smiley|emoji|\/ranks?\/|rank_|\/avatars?\/|\bicon_\w+\.(?:gif|png)/i.test(src)) skip = 'smilies/rank/avatar/icona';
        if (skip) { if (why) why.push(skip + ': ' + src.slice(0, 90)); continue; }
        const a = im.closest('a[href]'), ah = a ? (a.getAttribute('href') || '') : '';
        return absUrl(/\.(?:jpe?g|png|webp|gif)(?:\?|$)/i.test(ah) ? ah : src);
    }
    return null;
}


function scrapeProjectBanner(item, el = null) {
    const cached = readCache(item.id, item);
    if (cached) {
        applyParsed(item, cached);
        warmImage(item.poster);
        return Promise.resolve(cached);
    }

    if (inflight.has(item.id)) {
        const queued = jobQueue.find(j => j.key === item.id);
        if (queued && (!el || !queued.el || !queued.el.isConnected)) queued.el = el;
        return inflight.get(item.id);
    }
    if ((item._projTries || 0) >= PROJ_TRIES_LIFE) {
        pjLog(item.id, 'budget tentativi esaurito: non riprovo fino al reload');
        return Promise.resolve(snapshot(item));
    }

    const p = (async () => {
        let lastErr = '';
        for (let k = 0; k < PROJ_TRIES_MAX && (item._projTries || 0) < PROJ_TRIES_LIFE; k++) {
            if (k) {
                await sleep(PROJ_BACKOFF[k] || 3500);
                if (el && !el.isConnected) { pjLog(item.id, 'riga rimossa durante il backoff: stop'); return null; }
                if (item.posterTried) return snapshot(item);
            }
            item._projTries = (item._projTries || 0) + 1;
            try {
                const page = await enqueue(item.id, () => projFetchDoc(item.url), el);
                if (page === CANCELLED) {
                    item._projTries--;
                    pjLog(item.id, 'job CANCELLED (cancelQueued o riga staccata dal DOM)');
                    return null;
                }
                const { doc } = page;
                try { projTypeFromCrumbs(item, doc); } catch (e) {}
                const posts = pjPostsOf(doc);
                const root = posts.length ? posts[0].el : doc.querySelector('.post .content, .postbody .content, div.content');
                if (!root) {
                    const msg = ((doc.querySelector('#message') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
                    throw new Error('post principale non trovato' + (msg ? ' (' + msg + ')' : ''));
                }
                const why = [];
                const url = projFirstImgUrl(root, why);
                pjLog(item.id, 'tentativo', k + 1, '| img nel post:', root.querySelectorAll('img').length, '| scartate:', why, '| banner:', url);
                if (!url) throw new Error('nessuna immagine utile nel primo post');
                applyParsed(item, { poster: url, posterSrc: 'forum', posterAlts: [], kind: 'text', synopsis: '', author: posts.length ? posts[0].author : '' });
                warmImage(item.poster);
                saveCache(item);
                refreshItem(item);
                pjLog(item.id, 'OK', item.poster);
                return snapshot(item);
            } catch (e) {
                lastErr = (e && e.message) || String(e);
                pjLog(item.id, 'tentativo', k + 1, 'fallito:', lastErr);
            }
        }
        pjLog(item.id, 'rinuncia: la riga resta senza banner, NON marcata ne\' salvata in cache, riprovabile. Ultimo errore:', lastErr);
        return snapshot(item);
    })().finally(() => {
        if (inflight.get(item.id) === p) inflight.delete(item.id);
    });

    inflight.set(item.id, p);
    return p;
}

function scrapeTopicData(item, el = null, low = false) {
    if (item.posterTried) return Promise.resolve(snapshot(item));
    if (isProjLike(item)) return scrapeProjectBanner(item, el);

    const cached = readCache(item.id);
    if (cached) {
        applyParsed(item, cached);
        if (!el) warmImage(item.poster);
        upgradeTmdbTitle(item, cached);
        return Promise.resolve(cached);
    }

    if (inflight.has(item.id)) {
        if (!low) {
            const queued = jobQueue.find(j => j.key === item.id);
            if (queued) { queued.low = false; if (!el) queued.el = null; }
        }
        return inflight.get(item.id);
    }

    const p = (async () => {
        try {
            const page = await enqueue(item.id, () => fetchTopicPageRetry(item.url), el, low);
            if (page === CANCELLED) return null;

            const { doc, html } = page;
            try { projTypeFromCrumbs(item, doc); } catch (e) {}
            const postContent = doc.querySelector('.post .content, .postbody .content, div.content');
            const fullText = postContent ? extractText(postContent) : '';
            const magnets = findMagnets(doc, html);
            const thanksEl = doc.querySelector(THANKS_SELECTOR);
            const thanksUrl = thanksEl && thanksEl.getAttribute('href') ? absHref(thanksEl) : null;
            const authorEl = doc.querySelector('.post .username, .post .username-coloured, .postprofile .username');
            const author = authorEl ? authorEl.textContent.trim() : (item.author || '');
            if (author && !item.author) item.author = author;
            const authorId = userIdOf(authorEl) || item.authorId || null;
            const avEl = doc.querySelector('.postprofile img.avatar, .post .avatar img, .postprofile .avatar img');
            const avSrc = avEl && (avEl.getAttribute('src') || '');
            const authorAvatar = avSrc && !avSrc.startsWith('data:') ? absUrl(avSrc) : null;
            const kind = detectKind(postContent, fullText, magnets, item, !!thanksUrl && !magnets.length);
            item.extId = findExtId(postContent, fullText);

            const pp = await workerCall('post', fullText);
            const fields = pp.fields;
            Object.assign(item, fields);

            let posterUrl = null, posterAlts = [], posterSrc = null, backdrop = null;
            let synopsisText = null;
            let tm = null, tmdbFailed = false;

            if (postContent) {
                const found = pickPosters(postContent, item, author);
                if (found) { posterUrl = found.best; posterAlts = found.alts; posterSrc = 'forum'; }
                synopsisText = pp.synopsis;
            }

            if (kind === 'video') {
                try {
                    const t = await tmdbLookup(item);
                    if (t && (t.poster || t.backdrop || t.id)) {
                        tm = t;
                        if (t.poster) {
                            if (posterUrl) posterAlts = [posterUrl, ...posterAlts];
                            posterUrl = t.poster; posterSrc = 'tmdb';
                        }
                        backdrop = t.backdrop || null;
                    }
                    if (!synopsisText && t && isRealProse(t.overview)) synopsisText = t.overview;
                } catch (e) { console.warn('TMDB error', e); tmdbFailed = true; }
            }

            const result = {
                ...fields,
                poster: posterUrl, posterSrc, posterAlts, backdrop,
                synopsis: synopsisText || (kind === 'text' ? '' : "Sinossi disponibile all'interno del post sul forum."),
                magnets, magnet: magnets[0] ? magnets[0].uri : null, thanksUrl, extId: item.extId || null, kind,
                tmdbId: tm ? tm.id || null : null, tmdbKind: tm ? tm.kind || null : null,
                tmdbTitle: (tm && tmdbTitleReliable(item, tm)) ? tm.title : null, tmdbYear: tm ? tm.year || null : null,
                vote: tm ? tm.vote || null : null, genres: tm ? tm.genres || [] : [],
                trailer: tm ? tm.trailer || null : null, imdbId: tm ? tm.imdbId || null : null,
                mediaInfo: extractMediaInfoDom(postContent) || pp.miText || null,
                sizeBytes: pp.sizeField
                    || ((item.meta.season && ['season', 'range', 'complete'].includes(item.meta.season.kind)) ? 0 : pp.sizeMi)
                    || magnetsSize(magnets) || 0,
                author, authorId, authorAvatar,
                body: kind === 'text' ? (pp.body || null) : null
            };

            applyParsed(item, result);
            if (!el) warmImage(item.poster);
            if (!tmdbFailed) saveCache(item);
            return result;
        } catch (e) {
            console.error('Topic scrape failed', e);
            return { poster: null, synopsis: 'Impossibile caricare la sinossi.', magnets: [], magnet: null, thanksUrl: null, kind: null };
        }
    })().finally(() => {
        if (inflight.get(item.id) === p) inflight.delete(item.id);
    });

    inflight.set(item.id, p);
    return p;
}

function onRowsVisible(entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const row = entry.target;
        observer.unobserve(row);

        const item = registry.get(String(row.dataset.topicId));
        if (!item) return;

        if (item.posterTried) { fillRow(row, item); return; }

        scrapeTopicData(item, row).then(data => {
            if (!data) {
                if (isProjLike(item) && !item.posterTried && row.isConnected && (row._pjReobs = (row._pjReobs || 0) + 1) <= 3) {
                    pjLog(item.id, 'riosservo la riga dopo CANCELLED, giro', row._pjReobs);
                    setTimeout(() => { if (row.isConnected && !item.posterTried) posterObserver.observe(row); }, 500 * row._pjReobs);
                }
                return;
            }
            if (!row.isConnected) return;
            genresSoon();
            fillRow(row, item);
        });
    });
}

const TC_NAMES = { qbittorrent: 'qBittorrent', transmission: 'Transmission' };
const tcClient = () => { const c = getPref('tcClient', 'off'); return TC_NAMES[c] ? c : 'off'; };
const tcName = () => TC_NAMES[tcClient()] || '';
const tcBase = () => {
    let u = String(getPref('tcUrl', '') || '').trim().replace(/\/+$/, '');
    if (u && !/^https?:\/\//i.test(u)) u = 'http://' + u;
    return u;
};
const tcUser = () => String(getPref('tcUser', '') || '');
const tcPass = () => String(getPref('tcPass', '') || '');
const tcPaths = () => { const p = getPref('tcPaths', {}); return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {}; };
const tcPathFor = item => (item ? String(tcPaths()[item.type] || '').trim() : '');

function gmRequest(opts) {
    return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest !== 'function') { reject(new Error('GM_xmlhttpRequest non disponibile')); return; }
        GM_xmlhttpRequest({
            timeout: 10000, ...opts,
            onload: resolve,
            onerror: () => reject(new Error('Impossibile raggiungere la WebUI (indirizzo errato o @connect mancante)')),
            ontimeout: () => reject(new Error('Timeout della connessione'))
        });
    });
}

const qbHeaders = base => ({ 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': base, 'Origin': base });

async function qbLogin(base, user, pass) {
    const r = await gmRequest({
        method: 'POST', url: base + '/api/v2/auth/login', headers: qbHeaders(base),
        data: new URLSearchParams({ username: user, password: pass }).toString()
    });
    if (r.status === 403) throw new Error('IP bloccato da qBittorrent per troppi tentativi falliti: attendi o riavvia il client');
    if (r.status === 404) throw new Error('WebUI non trovata: controlla indirizzo e porta');
    return /^ok/i.test(String(r.responseText || '').trim());
}

async function qbAdd(base, user, pass, uris, savepath) {
    const add = () => {
        const params = new URLSearchParams({ urls: uris.join('\n') });
        if (savepath) { params.set('savepath', savepath); params.set('autoTMM', 'false'); }
        return gmRequest({ method: 'POST', url: base + '/api/v2/torrents/add', headers: qbHeaders(base), data: params.toString() });
    };
    let r = await add();
    if (r.status === 401 || r.status === 403) {
        const logged = await qbLogin(base, user, pass);
        if (!logged) throw new Error('Utente o password errati');
        r = await add();
    }
    if (r.status === 401 || r.status === 403) throw new Error('Accesso negato: controlla utente/password e le impostazioni di sicurezza della WebUI (Host header, CSRF)');
    if (r.status === 404) throw new Error('WebUI non trovata: controlla indirizzo e porta');
    if (r.status !== 200) throw new Error('Il client ha risposto con errore HTTP ' + r.status);
    if (/fails/i.test(String(r.responseText || ''))) throw new Error('Il client ha rifiutato il magnet');
}

let trSid = null;
async function trRpc(base, user, pass, body) {
    const url = base.replace(/\/transmission(\/web)?$/i, '') + '/transmission/rpc';
    for (let i = 0; i < 3; i++) {
        const headers = { 'Content-Type': 'application/json' };
        if (trSid) headers['X-Transmission-Session-Id'] = trSid;
        if (user) headers['Authorization'] = 'Basic ' + btoa(unescape(encodeURIComponent(user + ':' + pass)));
        const r = await gmRequest({ method: 'POST', url, headers, data: JSON.stringify(body) });
        if (r.status === 409) {
            const m = String(r.responseHeaders || '').match(/x-transmission-session-id:\s*([^\r\n]+)/i);
            if (!m) throw new Error('Sessione Transmission non ottenuta');
            trSid = m[1].trim();
            continue;
        }
        if (r.status === 401) throw new Error('Credenziali non valide');
        if (r.status < 200 || r.status >= 300) throw new Error('Errore HTTP ' + r.status);
        let j;
        try { j = JSON.parse(r.responseText); } catch (e) { throw new Error('Risposta non valida dal client'); }
        if (j.result && j.result !== 'success') throw new Error(String(j.result));
        return j;
    }
    throw new Error('Sessione Transmission non valida');
}

async function sendToClient(item, uris) {
    const client = tcClient(), base = tcBase();
    if (client === 'off' || !base) { toast('Configura prima il client torrent nelle impostazioni ⚙️', 'warn'); return false; }
    const dir = tcPathFor(item);
    try {
        if (client === 'qbittorrent') await qbAdd(base, tcUser(), tcPass(), uris, dir);
        else for (const u of uris) await trRpc(base, tcUser(), tcPass(), { method: 'torrent-add', arguments: dir ? { filename: u, 'download-dir': dir } : { filename: u } });
        toast(`⬇️ ${uris.length > 1 ? uris.length + ' magnet inviati' : 'Magnet inviato'} a ${tcName()}${dir ? ' → ' + dir : ''}`, 'ok', dir ? 3800 : 2600);
        if (item) markSeen(item, true);
        trackDl(item, uris, 'send');
        return true;
    } catch (e) {
        toast('❌ Invio fallito: ' + ((e && e.message) || e), 'err', 4500);
        return false;
    }
}

async function testClient() {
    const client = tcClient(), base = tcBase();
    if (client === 'off') throw new Error('Seleziona un client');
    if (!base) throw new Error('Inserisci l\'indirizzo della WebUI');
    if (client === 'qbittorrent') {
        await qbLogin(base, tcUser(), tcPass());
        const r = await gmRequest({ method: 'GET', url: base + '/api/v2/app/version', headers: { 'Referer': base } });
        if (r.status !== 200) throw new Error('Autenticazione fallita (HTTP ' + r.status + ')');
        return 'qBittorrent ' + String(r.responseText || '').trim();
    }
    const j = await trRpc(base, tcUser(), tcPass(), { method: 'session-get' });
    return 'Transmission ' + ((j.arguments && j.arguments.version) || '');
}
let heroSlides = [], heroIdx = 0, heroTimer = null, heroToken = 0, heroBuilding = false;
let heroNext = null, heroPrefetching = false, heroHover = false;
const heroSeen = new Set();
let heroShown = 0;

const heroKey = it => titleKey(it) + '|' + it.type;
const hasRealSynopsis = it => !!(it.synopsis && isRealProse(it.synopsis) && !/^(Sinossi disponibile|Impossibile caricare)/.test(it.synopsis));

function trendScore(i) {
    const ageH = i.ts ? Math.max(1, (Date.now() - i.ts) / 36e5) : 72;
    return ((i.views || 0) + (i.replies || 0) * 8 + 1) / Math.pow(ageH / 24 + 1.5, 1.15);
}

function trendingCandidates(items) {
    const best = new Map();
    for (const it of items) {
        if (it.kind && effKind(it) !== 'video') continue;
        const k = heroKey(it);
        const cur = best.get(k);
        if (!cur || trendScore(it) > trendScore(cur)) best.set(k, it);
    }
    return [...best.values()].sort((a, b) => trendScore(b) - trendScore(a));
}

function heroWanted() {
    return settings.heroEnabled && view.key === 'home' && !search.active && $('seer-search-input').value.trim().length < 3;
}

function updateHeroVisibility() {
    const box = $('seer-hero');
    const ok = heroWanted() && (heroSlides.length > 0 || heroBuilding);
    box.style.display = ok ? 'block' : 'none';
    const appOpen = $('mirseer-app').style.display === 'block';
    if (ok && heroSlides.length > 1 && appOpen && !document.hidden) { if (!heroTimer && !heroHover) startHero(); } else stopHero();
}

function startHero() {
    stopHero();
    if (heroHover || document.hidden || !settings.heroSpeed) return;
    if (heroSlides.length > 1) heroTimer = setInterval(() => goHero(heroIdx + 1), settings.heroSpeed);
}
function stopHero() { clearInterval(heroTimer); heroTimer = null; }

function goHero(i) {
    if (!heroSlides.length) return;

    if (i >= heroSlides.length && heroNext && heroNext.length) {
        heroSlides = heroNext;
        heroNext = null;
        heroIdx = 0;
        renderHero();
        prefetchHero();
        return;
    }
    if (!heroNext && !heroPrefetching) prefetchHero();

    heroIdx = (i + heroSlides.length) % heroSlides.length;
    const box = $('seer-hero');
    box.querySelectorAll('.seer-hero-slide').forEach((s, k) => s.classList.toggle('active', k === heroIdx));
    box.querySelectorAll('.seer-hero-dot').forEach((d, k) => d.classList.toggle('active', k === heroIdx));
    hydrateHero();
}

function renderHero() {
    const box = $('seer-hero');
    if (!heroSlides.length) {
        box.innerHTML = heroBuilding ? '<div class="seer-hero-skel"><div class="seer-skel-line w40"></div><div class="seer-skel-line tall w80"></div><div class="seer-skel-line w60"></div><div class="seer-skel-line w80"></div></div>' : '';
        return;
    }
    heroIdx = Math.min(heroIdx, heroSlides.length - 1);

    const slides = heroSlides.map((it, i) => {
        const bg = it.backdrop || it.poster;
        const blur = !it.backdrop;
        const bgRole = 'data-seer-id="' + esc(it.id) + '" data-seer-role="bg"';
        const active = i === heroIdx;

        let chips = `<span class="seer-chip">${it.type === 'Film' ? '🎬' : '📺'} ${esc(it.type)}</span>`;
        if (it.year) chips += `<span class="seer-chip">${esc(it.year)}</span>`;
        if (it.vote) chips += `<span class="seer-chip chip-vote">⭐ ${esc(it.vote)}/10</span>`;
        (it.genres || []).slice(0, 3).forEach(g => { chips += `<span class="seer-chip">${esc(g)}</span>`; });

        const desc = hasRealSynopsis(it) ? it.synopsis.slice(0, 520) : '';

        return `
        <div class="seer-hero-slide ${active ? 'active' : ''}">
            ${bg ? `<img class="seer-hero-bg ${blur ? 'blur' : ''}" ${active ? 'src' : 'data-hsrc'}="${esc(bg)}" alt="" decoding="async" ${active ? 'fetchpriority="high"' : ''} ${bgRole}>` : ''}
            <div class="seer-hero-shade"></div>
            <div class="seer-hero-body">
                <div class="seer-hero-text">
                    <span class="seer-hero-kicker">🔥 In tendenza${it.views ? ' · ' + fmtViews(it.views) + ' visite' : ''}</span>
                    <h1 class="seer-hero-title">${esc(it.cleanTitle)}</h1>
                    <div class="seer-hero-chips">${chips}</div>
                    ${desc ? `<div class="seer-hero-label">Trama</div><p class="seer-hero-desc">${esc(desc)}</p>` : ''}
                    <div class="seer-hero-actions">
                        <button class="seer-hero-btn primary" data-act="detail" data-id="${esc(it.id)}">📋 Dettagli e Magnet</button>
                        ${it.trailer ? `<button class="seer-hero-btn" data-act="trailer" data-id="${esc(it.id)}">▶ Trailer</button>` : ''}
                        <a class="seer-hero-btn" href="${esc(it.url)}" target="_blank" rel="noopener">🔗 Apri sul forum</a>
                    </div>
                </div>
                ${it.poster ? `<div class="seer-hero-poster"><img ${active ? 'src' : 'data-hsrc'}="${esc(it.poster)}" alt="" decoding="async" ${active ? 'fetchpriority="high"' : ''} data-seer-id="${esc(it.id)}" data-seer-role="poster"></div>` : ''}
            </div>
        </div>`;
    }).join('');

    const dots = heroSlides.map((_, i) => `<button class="seer-hero-dot ${i === heroIdx ? 'active' : ''}" data-hero="${i}" aria-label="Slide ${i + 1}"></button>`).join('');
    box.innerHTML = slides +
        (heroSlides.length > 1 ? `<button class="seer-hero-arrow prev" data-hero="prev" aria-label="Precedente">‹</button><button class="seer-hero-arrow next" data-hero="next" aria-label="Successivo">›</button>` : '') +
        `<div class="seer-hero-dots">${dots}</div>`;
    hydrateHero();
}

let heroHydTimer = null;
function hydrateHero() {
    const box = $('seer-hero');
    const n = heroSlides.length;
    if (!box || !n) return;
    const load = (s, low) => {
        if (!s) return;
        s.querySelectorAll('img[data-hsrc]').forEach(im => {
            if (low) { try { im.fetchPriority = 'low'; } catch (e) {} }
            im.src = im.dataset.hsrc;
            im.removeAttribute('data-hsrc');
        });
    };
    const slides = box.querySelectorAll('.seer-hero-slide');
    load(slides[heroIdx], false);
    load(slides[(heroIdx + 1) % n], false);
    clearTimeout(heroHydTimer);
    heroHydTimer = setTimeout(() => {
        const cur = $('seer-hero');
        if (!cur || cur.style.display === 'none') return;
        cur.querySelectorAll('.seer-hero-slide').forEach(s => load(s, true));
    }, 4000);
}

let mainMorePromise = null;
function loadMoreMain() {
    if (mainMorePromise) return mainMorePromise;
    mainMorePromise = (async () => {
        if (main.bg) await main.bg;
        for (let tries = 0; tries < 3 && !main.exhausted; tries++) {
            const before = main.items.length;
            const got = await pullGroup(main.group);
            main.items = uniqById([...main.items, ...got]);
            main.exhausted = groupDone(main.group);
            if (main.items.length > before) break;
        }
    })().finally(() => { mainMorePromise = null; });
    return mainMorePromise;
}

async function collectHeroBatch(token, onEach, low = false) {
    const batch = [];
    let guard = 0;
    while (batch.length < HERO_COUNT && guard++ < 6) {
        const pool = trendingCandidates(main.items).filter(it => !heroSeen.has(heroKey(it))).slice(0, HERO_POOL);

        if (!pool.length) {
            if (!main.exhausted) { try { await loadMoreMain(); } catch (e) { main.exhausted = true; } if (token !== heroToken) return null; continue; }
            if (heroSeen.size === 0) break;
            heroSeen.clear(); heroShown = 0;
            continue;
        }

        const jobs = pool.map(it => scrapeTopicData(it, null, low).catch(() => null));
        for (let i = 0; i < pool.length && batch.length < HERO_COUNT; i++) {
            const data = await jobs[i];
            if (token !== heroToken) return null;
            const it = pool[i];
            heroSeen.add(heroKey(it));
            if (!data || effKind(it) !== 'video') continue;
            if (!hasRealSynopsis(it)) continue;
            if (!it.poster && !it.backdrop) continue;
            batch.push(it);
            if (onEach) onEach(batch);
        }
    }
    heroShown += batch.length;
    if (heroShown >= HERO_MAX_TOTAL) { heroSeen.clear(); heroShown = 0; }
    return batch;
}

async function prefetchHero() {
    if (heroPrefetching || heroNext) return;
    heroPrefetching = true;
    const token = heroToken;
    try {
        const b = await collectHeroBatch(token, null, true);
        if (token === heroToken && b && b.length) { heroNext = b; warmImage(b[0].backdrop || b[0].poster); }
    } catch (e) { console.warn('Hero prefetch error', e); }
    finally { heroPrefetching = false; }
}

async function buildHero() {
    const token = ++heroToken;
    heroSlides = [];
    heroIdx = 0;
    heroNext = null;
    heroPrefetching = false;
    heroSeen.clear();
    heroShown = 0;
    heroBuilding = true;
    stopHero();
    renderHero();
    updateHeroVisibility();

    const batch = await collectHeroBatch(token, b => {
        heroSlides = b.slice();
        renderHero();
        updateHeroVisibility();
    });
    if (token !== heroToken || !batch) return;
    heroSlides = batch;
    heroBuilding = false;
    renderHero();
    updateHeroVisibility();
    prefetchHero();
    }

function setModalImage(item, modalWindow, modalLeft) {
    modalLeft.innerHTML = '';
    const img = document.createElement('img');
    img.alt = 'Poster';
    img.decoding = 'async';
    try { img.fetchPriority = 'high'; } catch (e) {}
    img.dataset.seerId = item.id;
    img.dataset.seerRole = 'poster';
    img.onload = () => {
        if (img.naturalWidth > img.naturalHeight * 1.15) {
            modalWindow.classList.add('is-landscape');
            modalWindow.classList.remove('is-portrait');
        } else {
            modalWindow.classList.add('is-portrait');
            modalWindow.classList.remove('is-landscape');
        }
    };
    img.src = item.poster;
    modalLeft.appendChild(img);
}

const kindIcon = item => { const k = effKind(item); return k === 'text' ? '📝' : k === 'audio' ? '🎵' : k === 'file' ? '📦' : typeIcon(item); };

function paintModalArt(item) {
    const modalWindow = $('seer-modal-overlay').querySelector('.seer-detail-window');
    const modalLeft = $('seer-modal-left-art');
    if (item.poster) setModalImage(item, modalWindow, modalLeft);
    else {
        modalWindow.classList.remove('is-landscape');
        modalLeft.innerHTML = `<div style="font-size:68px;">${kindIcon(item)}</div>`;
    }
}

function externalLinks(item) {
    if (effKind(item) !== 'video' || item.type === 'Musica Video') return [];
    const title = item.origTitle || item.cleanTitle;
    const q = encodeURIComponent(title + (item.fieldYear || item.year ? ' ' + (item.fieldYear || item.year) : ''));
    const ext = item.extId || '';
    const links = [];

    const imdb = item.imdbId || (/^tt\d+$/.test(ext) ? ext : null);
    links.push({ ico: '🟨', name: 'IMDb', href: imdb ? `https://www.imdb.com/title/${imdb}/` : `https://www.imdb.com/find/?q=${q}&s=tt` });

    let tmdb = null;
    if (item.tmdbId && item.tmdbKind) tmdb = `https://www.themoviedb.org/${item.tmdbKind}/${item.tmdbId}`;
    else if (/^tmdb:/.test(ext)) { const [, k, id] = ext.split(':'); tmdb = `https://www.themoviedb.org/${k}/${id}`; }
    links.push({ ico: '🟦', name: 'TMDb', href: tmdb || `https://www.themoviedb.org/search?query=${encodeURIComponent(title)}` });

    links.push({ ico: '🟧', name: 'JustWatch', href: `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(title)}` });
    return links;
}

function releaserCrew(item) {
    const m = (item.rawTitle || '').match(/-\s*([A-Za-z0-9_.]{3,20})\s*(?:[\])]|$)/);
    const c = m ? m[1] : '';
    return /^(?:\d{3,4}p|x26[45]|hevc|h26[45]|ita|eng|multi)$/i.test(c) ? '' : c;
}

function paintModalTools(item) {
    const box = $('seer-modal-tools');
    if (!box) return;
    const fav = isFav(item.id), seen = isSeen(item.id);
    let h = `<button class="seer-tool-btn ${fav ? 'on' : ''}" data-act="fav" title="${fav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">${fav ? '★' : '☆'} Watchlist</button>`;
    h += `<button class="seer-tool-btn ${seen ? 'on' : ''}" data-act="seen" title="${seen ? 'Clic per annullare' : 'Segna come scaricato'}">✓ ${seen ? 'Scaricato' : 'Segna come scaricato'}</button>`;
    if (sectionKindOf(item.type) === 'video') { const ft = isFollowingTitle(item); h += `<button class="seer-tool-btn ${ft ? 'on' : ''}" data-act="followtitle">${ft ? '✓ Segui titolo' : '➕ Segui titolo'}</button>`; }
    if (item.trailer) h += `<button class="seer-tool-btn trailer" data-act="trailer">▶ Guarda Trailer</button>`;
    const links = externalLinks(item);
    if (links.length) {
        h += `<div class="seer-ext-wrap"><button class="seer-tool-btn" data-act="ext" aria-haspopup="true" title="Cerca altrove">🔗 Link ▾</button>` +
            `<div class="seer-ext-menu" id="seer-ext-menu">` +
            links.map(l => `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${l.ico} ${esc(l.name)}</a>`).join('') +
            `</div></div>`;
    }
    box.innerHTML = h;
}

const verSeason = it => (it.meta && it.meta.season ? it.meta.season.short : '');
const verTitleKey = it => {
    if (sectionKindOf(it.type) !== 'video') return 'id:' + it.id;
    const t = normT(it.cleanTitle);
    if (!t) return 'id:' + it.id;
    return t + '|' + (it.meta && it.meta.season ? '' : (it.fieldYear || it.year || '')) + '|' + verSeason(it) + '|' + it.type;
};
const verTmdbKey = it => (it.tmdbId && sectionKindOf(it.type) === 'video')
    ? 'tmdb:' + (it.tmdbKind || '') + ':' + it.tmdbId + '|' + verSeason(it) + '|' + it.type : null;

function versionKeyMap(items) {
    const alias = new Map();
    items.forEach(it => { const k = verTmdbKey(it); if (k) alias.set(verTitleKey(it), k); });
    const m = new Map();
    items.forEach(it => m.set(it, verTmdbKey(it) || alias.get(verTitleKey(it)) || verTitleKey(it)));
    return m;
}

const SRC_RANK = { 'Remux': 50, 'UHD BluRay': 45, 'BluRay': 40, 'WEB-DL': 30, 'HDTV': 20, 'DVDRip': 10, 'Rip': 0 };
const versionQuality = it => {
    const m = it.meta || {};
    return (m.is4k ? 400 : m.is1080p ? 300 : m.is720p ? 200 : 100) + (SRC_RANK[m.source] || 0);
};

function versionsFor(item) {
    const pool = [...registry.values()].filter(x => x.type === item.type);
    if (!pool.includes(item)) pool.push(item);
    const keys = versionKeyMap(pool);
    const key = keys.get(item);
    const out = pool.filter(x => keys.get(x) === key);
    out.sort((a, b) => (versionQuality(b) - versionQuality(a)) || ((b.numericId || 0) - (a.numericId || 0)));
    return out;
}

function versionLabels(list) {
    const base = list.map(it => {
        const m = it.meta;
        const res = m.is4k ? '4K' : m.is1080p ? '1080p' : m.is720p ? '720p' : 'SD';
        return res + (m.source && m.source !== 'Rip' ? ' ' + m.source : '') + (m.isDV ? ' DV' : m.isHDR ? ' HDR' : '');
    });
    const count = {};
    base.forEach(l => { count[l] = (count[l] || 0) + 1; });
    return base.map((l, i) => {
        if (count[l] < 2) return l;
        const m = list[i].meta;
        const codec = m.isAv1 ? 'AV1' : m.isH265 ? 'HEVC' : m.isH264 ? 'AVC' : '';
        return l + ' · ' + [codec, list[i].author].filter(Boolean).join(' ');
    });
}

function paintVersions(item) {
    const bar = $('seer-version-bar');
    if (!bar) return;
    if (modalVersions.length < 2) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
    const labels = versionLabels(modalVersions);
    bar.style.display = '';
    bar.innerHTML = `<span class="seer-ver-label">Versioni disponibili</span><div class="seer-ver-tabs">` +
        modalVersions.map((v, i) => `<button class="seer-ver-tab ${String(v.id) === String(item.id) ? 'active' : ''}" data-vid="${esc(v.id)}" title="${esc(v.rawTitle)}">[${esc(labels[i])}]</button>`).join('') +
        `</div>`;
}

function paintModal(item) {
    const kind = effKind(item) || 'video';
    const win = $('seer-modal-overlay').querySelector('.seer-detail-window');
    const idStr = String(item.id);
    win.classList.toggle('no-specs', kind !== 'video');
    win.classList.toggle('text-mode', kind === 'text');

    $('seer-modal-title').innerText = item.displayTitle;

    let mr = '';
    if (item.author) {
        const crew = releaserCrew(item);
        const showCrew = crew && crew.toLowerCase() !== item.author.toLowerCase();
        mr += `<button class="seer-meta-pill" data-act="releaser" title="Mostra tutte le release di ${esc(item.author)}">👤 Releaser: ${esc(item.author)}${showCrew ? ` <small>[${esc(crew)}]</small>` : ''}</button>`;
    }
    if (item.author) mr += `<button class="seer-meta-pill" data-act="followrel">${isFollowingRel(item.author) ? '✓ Seguito' : '➕ Segui'}</button>`;
    mr += `<a class="seer-meta-pill" href="${esc(item.url)}" target="_blank" rel="noopener" title="Apri il post sul forum">🔗 Forum</a>`;
    $('seer-modal-metarow').innerHTML = mr;

    let chipsHtml = '';
    if (item.year) chipsHtml += `<span class="seer-chip">${esc(item.year)}</span>`;
    chipsHtml += `<span class="seer-chip">${esc(item.type)}</span>`;
    if (item.sizeBytes) chipsHtml += `<span class="seer-chip">💾 ${esc(fmtSize(item.sizeBytes))}</span>`;
    chipsHtml += `<span class="seer-chip">👁️ ${esc(fmtViews(item.views || 0))}</span>`;
    if (kind === 'text') {
        chipsHtml += `<span class="seer-chip">📝 Solo testo (nessun file nel post)</span>`;
    } else if (kind === 'audio') {
        chipsHtml += `<span class="seer-chip chip-audio">🎵 File audio</span>`;
        if (item.meta.audioCodec && item.meta.audioCodec !== 'Standard') chipsHtml += `<span class="seer-chip">${esc(item.meta.audioCodec)}</span>`;
    } else if (kind === 'file') {
        chipsHtml += `<span class="seer-chip chip-file">📦 File / Archivio</span>`;
    } else {
        if (item.vote) chipsHtml += `<span class="seer-chip chip-vote">⭐ ${esc(item.vote)}/10</span>`;
        const gl = (item.genres && item.genres.length) ? item.genres
            : (item.genre ? item.genre.split(/[,/|]/).map(s => s.trim()).filter(Boolean).slice(0, 3) : []);
        gl.forEach(g => { chipsHtml += `<span class="seer-chip">${esc(g)}</span>`; });
        if (item.meta.season) chipsHtml += `<span class="seer-chip chip-season">📺 ${esc(item.meta.season.label)}</span>`;
    }
    $('seer-modal-chips').innerHTML = chipsHtml;

    if (kind === 'video') {
        const m = item.meta;
        let rb = '';
        if (m.is4k) rb += `<span class="seer-tag tag-4k">4K UHD · 2160p</span>`;
        else if (m.is1080p) rb += `<span class="seer-tag tag-1080">Full HD · 1080p</span>`;
        else if (m.is720p) rb += `<span class="seer-tag tag-720">HD · 720p</span>`;
        else rb += `<span class="seer-tag tag-sd">SD</span>`;
        if (m.isDV) rb += `<span class="seer-tag tag-dv">Dolby Vision</span>`;
        if (m.isHDR) rb += `<span class="seer-tag tag-hdr">HDR</span>`;
        rb += `<span class="seer-chip">${esc(m.source)}</span>`;
        const codec = (m.isH265 ? 'HEVC (H.265)' : (m.isH264 ? 'AVC (H.264)' : (m.isAv1 ? 'AV1' : 'H.264'))) + (m.is10bit ? ' 10-bit' : '');
        rb += `<span class="seer-chip">${esc(codec)}</span>`;
        rb += `<span class="seer-chip chip-audio">🔊 ${esc(m.audioFormatted)}</span>`;
        rb += `<span class="seer-chip chip-subs">💬 Sub: ${esc(m.subsFormatted)}</span>`;
        $('seer-modal-specs').innerHTML = rb;
    } else {
        $('seer-modal-specs').innerHTML = '';
    }

    $('seer-modal-text').innerText = kind === 'text' ? (item.body || 'Caricamento del testo dal post...') : '';

    const ov = $('seer-modal-overview'), tg = $('seer-syn-toggle');
    if (ov.dataset.itemId !== idStr) { ov.dataset.itemId = idStr; ov.dataset.open = '0'; }
    const open = ov.dataset.open === '1';
    ov.innerText = item.synopsis || 'Caricamento sinossi originale dal post...';
    ov.classList.toggle('clamped', !open);
    tg.textContent = open ? 'Mostra meno' : 'Mostra altro';
    tg.style.display = open ? 'block' : 'none';
    if (!open) requestAnimationFrame(() => { if (ov.scrollHeight > ov.clientHeight + 2) tg.style.display = 'block'; });

    const mi = $('seer-mediainfo-wrap');
    if (mi.dataset.itemId !== idStr) { mi.open = false; mi.dataset.itemId = idStr; }
    $('seer-modal-raw').textContent = item.rawTitle;
    const pre = $('seer-mediainfo-pre');
    pre.textContent = item.mediaInfo || '';
    pre.style.display = item.mediaInfo ? '' : 'none';

    paintModalTools(item);
    paintVersions(item);
    updateModalNav();
}

function copyToClipboard(t) {
    if (typeof GM_setClipboard !== 'undefined') GM_setClipboard(t);
    else navigator.clipboard.writeText(t);
}

function openMagnet(uri) {
    const a = document.createElement('a');
    a.href = uri;
    a.dataset.seerTracked = '1';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
}
const magnetBtnLabel = () => settings.magnetAction === 'open'
    ? '<span>🧲</span> Apri Magnet nel Client Torrent'
    : '<span>📋</span> Copia Magnet Link negli Appunti';
const magnetItemLabel = () => settings.magnetAction === 'open' ? '🧲 Apri Magnet' : '📋 Copia Magnet';
const sendBtnLabel = () => `<span>⬇️</span> Invia a ${esc(tcName())}`;

function refreshMagnetButtons() {
    const ov = $('seer-modal-overlay');
    if (!currentModalItem || !ov || ov.style.display !== 'flex') return;
    renderMagnetUI(currentModalItem);
    if (currentModalItem.magnets && currentModalItem.magnets.length) $('seer-copy-btn').innerHTML = magnetBtnLabel();
}

function renderMagnetUI(item) {
    const box = $('seer-magnet-box'), list = $('seer-magnet-list'), single = $('seer-copy-btn');
    const sendOne = $('seer-send-btn'), sendAll = $('seer-send-all-btn');
    const mags = item.magnets || [];
    const tc = tcClient() !== 'off';

    sendOne.style.display = (tc && mags.length === 1) ? '' : 'none';
    if (tc && mags.length === 1) { sendOne.className = 'seer-action-btn'; sendOne.disabled = false; sendOne.innerHTML = sendBtnLabel(); }

    if (mags.length > 1) {
        box.classList.add('show');
        single.style.display = 'none';
        sendAll.style.display = tc ? '' : 'none';
        if (tc) { sendAll.className = 'seer-action-btn'; sendAll.disabled = false; sendAll.innerHTML = `<span>⬇️</span> Invia Tutti a ${esc(tcName())} (${mags.length})`; }
        list.innerHTML = mags.map((m, i) =>
            `<div class="seer-magnet-item"><span class="seer-magnet-label" title="${esc(m.dn || '')}">${esc(m.label)}</span>` +
            `<span style="display:flex; gap:6px; flex-shrink:0;">` +
            (tc ? `<button class="seer-magnet-copy" data-ms="${i}" title="Invia a ${esc(tcName())}">⬇️</button>` : '') +
            `<button class="seer-magnet-copy" data-mi="${i}">${magnetItemLabel()}</button></span></div>`
        ).join('');
    } else {
        box.classList.remove('show');
        single.style.display = '';
        list.innerHTML = '';
    }
}

function findConfirmForm(doc) {
    return [...doc.querySelectorAll('form')].find(f =>
        f.id === 'confirm' ||
        f.querySelector('input[name="confirm_key"], input[name="confirm_uid"]') ||
        f.querySelector('input[type="submit"][name="confirm"], button[name="confirm"], input[name="confirm"]')
    ) || null;
}

async function unlockMagnet(item) {
    let thanksUrl = item.thanksUrl || null;

    if (!thanksUrl) {
        const page = await fetchTopicPage(item.url, true);
        const found = findMagnets(page.doc, page.html);
        if (found.length) return found;
        const t = page.doc.querySelector(THANKS_SELECTOR);
        thanksUrl = t && t.getAttribute('href') ? absHref(t) : null;
    }
    if (!thanksUrl) return [];

    const resp = await fetch(thanksUrl, { credentials: 'same-origin', cache: 'no-store' });
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const form = findConfirmForm(doc);

    if (form) {
        const baseUrl = resp.url || thanksUrl;
        const action = new URL(form.getAttribute('action') || thanksUrl, baseUrl).href;
        const params = new URLSearchParams();
        form.querySelectorAll('input[name], select[name], textarea[name]').forEach(inp => {
            const type = (inp.getAttribute('type') || '').toLowerCase();
            if (type === 'submit' || type === 'button' || type === 'image' || type === 'reset') return;
            if ((type === 'checkbox' || type === 'radio') && !inp.checked) return;
            params.append(inp.name, inp.value);
        });
        const yesBtn = [...form.querySelectorAll('input[type="submit"], button')].find(b => /^(confirm|yes|si)$/i.test(b.getAttribute('name') || ''));
        if (yesBtn) params.set(yesBtn.getAttribute('name'), yesBtn.value || yesBtn.textContent.trim() || 'Sì');
        else params.set('confirm', 'Sì');

        const method = (form.getAttribute('method') || 'post').toLowerCase();
        if (method === 'get') await fetch(action + (action.includes('?') ? '&' : '?') + params.toString(), { credentials: 'same-origin', cache: 'no-store' });
        else await fetch(action, {
            method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'follow',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
    } else {
        const direct = findMagnets(doc, html);
        if (direct.length) return direct;
    }

    const unlocked = await fetchTopicPage(item.url, true);
    return findMagnets(unlocked.doc, unlocked.html);
}

function hideModal() {
    modalToken++;
    const o = $('seer-modal-overlay');
    if (o) o.style.display = 'none';
}

async function openDetailModal(item, keepVersions = false) {
    if (isProjectItem(item) && !(view.key === 'project' && proj && proj.item === item)) { openProject(item); return; }
    const myToken = ++modalToken;

    const overlay = $('seer-modal-overlay');
    const modalWindow = overlay.querySelector('.seer-detail-window');
    const copyBtn = $('seer-copy-btn');

    currentModalItem = item;
    if (!keepVersions) modalVersions = versionsFor(item);
    modalWindow.classList.remove('is-landscape', 'is-portrait');

    currentTopicUrl = null;
    copyBtn.className = 'seer-action-btn';
    copyBtn.disabled = true;
    copyBtn.innerHTML = `<span>⏳</span> Lettura del post...`;

    paintModal(item);
    paintModalArt(item);
    renderMagnetUI(item);
    overlay.style.display = 'flex';
    const sc = overlay.querySelector('.seer-modal-scroll');
    if (sc) sc.scrollTop = 0;

    await scrapeTopicData(item);
    if (myToken !== modalToken) return;

    if (!keepVersions) modalVersions = versionsFor(item);
    paintModal(item);
    paintModalArt(item);

    if (!(item.magnets && item.magnets.length)) {
        try {
            const found = await unlockMagnet(item);
            if (found && found.length) {
                item.magnets = found;
                item.magnet = found[0].uri;
                if (!item.sizeBytes) item.sizeBytes = magnetsSize(found);
                if (item.kind === 'text') item.kind = 'file';
                saveCache(item);
            }
        } catch (err) { console.error(err); }
        if (myToken !== modalToken) return;
        paintModal(item);
        paintModalArt(item);
    }

    const row = document.querySelector(`.seer-row[data-topic-id="${CSS.escape(String(item.id))}"]`);
    if (row) fillRow(row, item);

    renderMagnetUI(item);
    if (item.magnets && item.magnets.length) {
        currentTopicUrl = null;
        copyBtn.disabled = false;
        copyBtn.innerHTML = magnetBtnLabel();
    } else {
        currentTopicUrl = item.url;
        copyBtn.disabled = false;
        copyBtn.innerHTML = `<span>🔗</span> Apri Topic sul Forum`;
    }
}

function openTrailer(item) {
    if (!item || !item.trailer) return;
    const k = encodeURIComponent(item.trailer.key);
    $('seer-trailer-title').textContent = '▶ ' + item.cleanTitle + ' — Trailer';
    $('seer-trailer-frame').src = `https://www.youtube-nocookie.com/embed/${k}?autoplay=1&rel=0`;
    $('seer-trailer-yt').href = `https://www.youtube.com/watch?v=${k}`;
    $('seer-trailer-overlay').style.display = 'flex';
}
function closeTrailer() {
    const ov = $('seer-trailer-overlay');
    if (!ov || ov.style.display !== 'flex') return;
    $('seer-trailer-frame').src = 'about:blank';
    ov.style.display = 'none';
}

const currentSectionStore = () => sections.get(String(view.section.id));

const DAY_MS = 864e5;
const byRelease = (x, y) => {
    const dx = x.ts || 0, dy = y.ts || 0;
    if (dx && dy && Math.abs(dy - dx) >= DAY_MS) return dy - dx;
    return ((y.numericId || 0) - (x.numericId || 0)) || (dy - dx);
};

function applySort(items) {
    const a = items.slice();
    switch (sortMode) {
        case 'activity': a.sort((x, y) => ((y.lastReplyTs || y.ts || 0) - (x.lastReplyTs || x.ts || 0)) || ((y.numericId || 0) - (x.numericId || 0))); break;
        case 'size':     a.sort((x, y) => (y.sizeBytes || 0) - (x.sizeBytes || 0)); break;
        case 'views':    a.sort((x, y) => (y.views || 0) - (x.views || 0)); break;
        case 'replies':  a.sort((x, y) => (y.replies || 0) - (x.replies || 0)); break;
        case 'title':    a.sort((x, y) => titleColl.compare(x.cleanTitle, y.cleanTitle)); break;
        default:         a.sort(byRelease);
    }
    return a;
}

function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
            const c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
            const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
            cur[j] = v;
            if (v < rowMin) rowMin = v;
        }
        if (rowMin > max) return max + 1;
        prev = cur;
    }
    return prev[b.length];
}

const fuzzyHay = it => it._hay || (it._hay = normT(it.cleanTitle + ' ' + (it.origTitle || '') + ' ' + it.rawTitle));
const fuzzyWords = it => it._words || (it._words = [...new Set(fuzzyHay(it).split(' '))].filter(w => w.length > 2));

function fuzzyScore(it, q) {
    const tokens = normT(q).split(' ').filter(Boolean);
    if (!tokens.length) return 1;
    const hay = fuzzyHay(it);
    let total = 0;
    for (const t of tokens) {
        let s = 0;
        if (hay.includes(t)) s = 3;
        else {
            const maxD = t.length <= 3 ? 0 : t.length <= 6 ? 1 : 2;
            if (maxD) {
                for (const w of fuzzyWords(it)) {
                    if (Math.abs(w.length - t.length) <= maxD && lev(t, w, maxD) <= maxD) { s = 2; break; }
                    if (w.length > t.length && lev(t, w.slice(0, t.length), maxD) <= maxD) s = Math.max(s, 1);
                }
            }
        }
        if (!s) return 0;
        total += s;
    }
    return total / tokens.length;
}

const inScope = (it, sc) => {
    if (sc.mode === 'all') return true;
    if (sc.label === 'Film e Serie TV') return it.type === 'Film' || it.type === 'Serie TV';
    return it.type === sc.label;
};
function fuzzyPool(query, sc) {
    return [...registry.values()]
        .map(it => [it, inScope(it, sc) ? fuzzyScore(it, query) : 0])
        .filter(x => x[1] > 0)
        .sort((a, b) => b[1] - a[1])
        .map(x => x[0]);
}

const FACETS = [['complete', '📦 Stagione Completa']];
const RES_FACETS = [['4k', '💎 4K UHD'], ['1080', '1080p'], ['720', '720p'], ['sd', 'SD']];
const FMT = {
    mp3:  ['MP3',        /\bmp3\b/i],
    flac: ['FLAC',       /\bflac\b/i],
    m4b:  ['M4B',        /\b(m4b|m4a)\b/i],
    epub: ['EPUB',       /\bepub\b/i],
    pdf:  ['PDF',        /\bpdf\b/i],
    mobi: ['MOBI / AZW', /\b(mobi|azw3?)\b/i],
    cbz:  ['CBR / CBZ',  /\b(cbr|cbz)\b/i]
};
const FMT_BY_SECTION = { 'ABooks': ['mp3', 'm4b'], 'Musica Audio': ['flac', 'mp3'], 'EBooks': ['epub', 'pdf', 'mobi'], 'Comics': ['cbz', 'pdf'], 'Edicola': ['pdf'] };
const FILM_ONLY = new Set(['Film', 'Anime Movies', 'Cartoon Movies', 'Teatro']);

function curSectionName() {
    if (search.active) return search.scope === 'all' ? null : search.label;
    if (view.key === 'section') return view.section.name;
    if (view.key === 'films') return 'Film';
    if (view.key === 'series') return 'Serie TV';
    return null;
}

function facetScope() {
    if (search.active && search.scope === 'all') return 'mixed';
    if (!search.active && (view.key === 'favs' || view.key === 'releaser' || view.key === 'project' || view.key === 'account')) return 'mixed';
    const n = curSectionName();
    if (n === PROJECT_SECTION) return 'mixed';
    return (n && (sectionKindOf(n) || 'video')) || 'home';
}

function facetsFor() {
    const sc = facetScope(), n = curSectionName();
    const vid = sc === 'home' || sc === 'video';
    return { vid, rated: vid && (sc === 'home' || !NO_RATING_SECTIONS.has(n)), complete: vid && (sc === 'home' || SEASON_SECTIONS.has(n)), type: sc === 'home', fmts: FMT_BY_SECTION[n] || [] };
}

const advActive = f => !!((f.rated && (filters.minVote > 0 || filters.genre !== 'all')) || (f.vid && filters.codec !== 'all') || filters.yFrom || filters.yTo || filters.releaser || filters.sizeMin || filters.sizeMax);

function anyFilter() {
    const f = facetsFor();
    return hideSeen
        || (f.vid && (filters.res !== 'all' || filters.ita))
        || (f.complete && filters.complete)
        || (f.type && filters.type !== 'all')
        || f.fmts.includes(filters.fmt)
        || (f.rated && filters.genre !== 'all')
        || advActive(f);
}

const isCompleteRelease = it =>
    !!(it.meta.season && (it.meta.season.kind === 'complete' || /Complet/i.test(it.meta.season.label))) ||
    /\b(complet[ae]|integrale|full[\s._-]*series)\b/i.test(it.rawTitle);

const fmtHaystack = it => [it.rawTitle, it.mediaInfo || '', ...(it.magnets || []).map(m => m.dn || '')].join(' ');

function makeFilter() {
    if (!anyFilter()) return null;
    const f = facetsFor();
    const fmtRe = f.fmts.includes(filters.fmt) ? FMT[filters.fmt][1] : null;
    const rl = String(filters.releaser || '').toLowerCase();
    return it => {
        const m = it.meta;
        if (f.vid) {
            if (filters.res !== 'all') {
                const rk = m.is4k ? '4k' : m.is1080p ? '1080' : m.is720p ? '720' : 'sd';
                if (rk !== filters.res) return false;
            }

            if (filters.ita && !m.audioLangs.includes('ITA')) return false;
            if (f.rated && filters.minVote > 0 && !(it.vote >= filters.minVote)) return false;
            if (filters.codec === 'av1' && !m.isAv1) return false;
            if (filters.codec === 'hevc' && !m.isH265) return false;
            if (filters.codec === 'avc' && !m.isH264) return false;
            if (f.rated && filters.genre !== 'all' && !itemGenres(it).some(g => normT(g) === filters.genre)) return false;
        }
        if (f.complete && filters.complete && !isCompleteRelease(it)) return false;
        if (f.type) {
            if (filters.type === 'film' && it.type !== 'Film') return false;
            if (filters.type === 'series' && it.type !== 'Serie TV') return false;
        }
        if (fmtRe && !fmtRe.test(fmtHaystack(it))) return false;
        if (filters.yFrom || filters.yTo) {
            const y = parseInt(it.fieldYear || it.year, 10) || 0;
            if (filters.yFrom && (!y || y < filters.yFrom)) return false;
            if (filters.yTo && (!y || y > filters.yTo)) return false;
        }
        if (rl && !((it.author || '') + ' ' + releaserCrew(it)).toLowerCase().includes(rl)) return false;
        if (filters.sizeMin || filters.sizeMax) {
            const g = (it.sizeBytes || 0) / 1073741824;
            if (!g) return false;
            if (filters.sizeMin && g < filters.sizeMin) return false;
            if (filters.sizeMax && g > filters.sizeMax) return false;
        }
        if (hideSeen && isSeen(it.id)) return false;
        return true;
    };
}

function renderFacets() {
    const box = $('seer-facets');
    if (!box) return;
    const f = facetsFor();
    const chip = (attr, label, on, cls = '') => `<button class="seer-facet ${on ? 'active' : ''} ${cls}" ${attr}>${label}</button>`;
    const groups = [];
    if (f.vid) {
        groups.push('<span class="seer-adv-note">🎞️ Qualità</span>' + RES_FACETS.map(([k, l]) => chip(`data-res="${k}"`, l, filters.res === k)).join(''));
        if (f.complete) groups.push(FACETS.map(([k, l]) => chip(`data-facet="${k}"`, l, filters[k])).join(''));
    }
    if (f.type) groups.push(chip('data-ftype="film"', '🗂️ Solo Film', filters.type === 'film') + chip('data-ftype="series"', '📺 Solo Serie', filters.type === 'series'));
    if (f.fmts.length) groups.push(f.fmts.map(k => chip(`data-fmt="${k}"`, FMT[k][0], filters.fmt === k)).join(''));
    const act = advActive(f);
    groups.push(
        chip('data-facet="adv"', '🎚️ Filtri avanzati' + (act ? ' •' : ''), advOpen || act) +
        chip('data-facet="hideSeen"', '🙈 Nascondi già scaricati', hideSeen) +
        (anyFilter() ? chip('data-facet="reset"', '✖ Azzera filtri', false, 'reset') : '')
    );
    box.innerHTML = groups.join('<span class="seer-facet-sep"></span>');
}

function updateAdv() {
    const box = $('seer-adv');
    if (!box) return;
    box.classList.toggle('open', advOpen);
    const f = facetsFor();
    $('seer-adv-vote-wrap').style.display = f.rated ? '' : 'none';
    $('seer-adv-codec-wrap').style.display = f.vid ? '' : 'none';
    const setVal = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v; };
    setVal('seer-adv-vote', filters.minVote || 0);
    $('seer-adv-vote-val').textContent = filters.minVote > 0 ? filters.minVote.toFixed(1) + '+' : 'Tutte';
    setVal('seer-adv-yfrom', filters.yFrom || '');
    setVal('seer-adv-yto', filters.yTo || '');
    setVal('seer-adv-rel', filters.releaser || '');
    setVal('seer-adv-codec', filters.codec);
    setVal('seer-adv-smin', filters.sizeMin || ''); setVal('seer-adv-smax', filters.sizeMax || '');

    const names = [...new Set(lastBase.map(i => i.author).filter(Boolean))].sort(nameColl.compare).slice(0, 300);
    const sig = names.join('|');
    const dl = $('seer-adv-rel-list');
    if (dl && dl.dataset.sig !== sig) { dl.dataset.sig = sig; dl.innerHTML = names.map(n => `<option value="${esc(n)}"></option>`).join(''); }

    $('seer-adv-note').textContent = (f.rated && filters.minVote > 0)
        ? (getTmdbKey() ? 'Carico i voti TMDb dei titoli in background…' : 'Il filtro voto richiede la chiave TMDb (⚙️ Impostazioni).')
        : '';
}

let warmTimer = null;
const needsPostData = () => (filters.minVote > 0 && !!getTmdbKey()) || !!filters.sizeMin || !!filters.sizeMax || filters.genre !== 'all';
function warmRatings(items) {
    if (!needsPostData()) return;
    const anyKind = !!(filters.sizeMin || filters.sizeMax);
    const todo = items.filter(it => !it.posterTried && !ratingTried.has(it.id) && (anyKind || sectionKindOf(it.type) === 'video')).slice(0, 24);
    if (!todo.length) return;
    todo.forEach(it => ratingTried.add(it.id));
    Promise.all(todo.map(it => scrapeTopicData(it).catch(() => null))).then(() => {
        clearTimeout(warmTimer);
        warmTimer = setTimeout(() => {
            if (needsPostData() && $('mirseer-app').style.display === 'block') renderDeck(localFilterValue());
        }, 500);
    });
}

function stackVersions(sorted, pred) {
    const keys = versionKeyMap(sorted);
    const groups = new Map();
    sorted.forEach(it => {
        const k = keys.get(it);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(it);
    });
    const out = [];
    const emitted = new Set();
    sorted.forEach(it => {
        const k = keys.get(it);
        const arr = groups.get(k);
        arr.forEach(x => { x._vers = arr.length > 1 ? arr : null; });
        if (emitted.has(k)) return;
        if (pred && !pred(it)) return;
        emitted.add(k);
        out.push(it);
    });
    return out;
}

const relCatOf = it => {
    const t = it.type;
    if (t === 'Film' || t === 'Anime Movies' || t === 'Cartoon Movies') return 'film';
    if (t === 'Serie TV' || t === 'Anime Series' || t === 'Cartoon Series') return 'series';
    return 'other';
};

const relSearchUrl = r => r.id
    ? `/search.php?author_id=${encodeURIComponent(r.id)}&sr=topics&sf=firstpost&sk=t&sd=d&st=0&ch=300&t=0&submit=Cerca`
    : `/search.php?keywords=&author=${encodeURIComponent(r.name)}&terms=all&sc=1&sf=firstpost&sr=topics&sk=t&sd=d&st=0&ch=300&t=0&submit=Cerca`;

const avPool = { active: 0, q: [] };
function avRun(task) {
    return new Promise(resolve => {
        const go = () => {
            avPool.active++;
            task().then(resolve, () => resolve(null)).finally(() => {
                avPool.active--;
                const n = avPool.q.shift();
                if (n) n();
            });
        };
        if (avPool.active < 3) go(); else avPool.q.push(go);
    });
}

const AV_SKIP = '#username_logged_in, .header-profile, #page-header, .navbar, .headerbar, .site-description';

function avatarFromRegistry(id, name) {
    const n = relKey(name);
    for (const it of registry.values()) {
        if (!it.authorAvatar) continue;
        if ((id && String(it.authorId) === String(id)) || (!id && n && relKey(it.author) === n)) return it.authorAvatar;
    }
    return null;
}
function idFromRegistry(name) {
    const n = relKey(name);
    if (!n) return null;
    for (const it of registry.values()) if (it.authorId && relKey(it.author) === n) return it.authorId;
    return null;
}

async function resolveUserId(name) {
    const hit = idFromRegistry(name);
    if (hit) return hit;
    const ck = CACHE_PREFIX + 'uid_' + relKey(name).replace(/[^a-z0-9]/g, '_');
    const c = cacheGet(ck);
    if (c) { try { const j = JSON.parse(c); if (j.id || Date.now() - j.t < 864e5) return j.id || null; } catch (e) {} }
    return avRun(async () => {
        try {
            const r = await fetch(`/memberlist.php?mode=searchuser&username=${encodeURIComponent(name)}&sk=c&sd=a`, { credentials: 'same-origin' });
            if (!r.ok) return null;
            const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
            const a = [...doc.querySelectorAll('a[href*="mode=viewprofile"]')]
                .find(x => /[?&]u=\d+/.test(x.getAttribute('href')) && relKey(x.textContent) === relKey(name));
            const id = a ? a.getAttribute('href').match(/[?&]u=(\d+)/)[1] : null;
            cacheSet(ck, JSON.stringify({ t: Date.now(), id }));
            return id;
        } catch (e) { return null; }
    });
}

async function fetchAvatar(id, name) {
    const hit = avatarFromRegistry(id, name);
    if (hit) return hit;
    if (!id) return null;
    const ck = CACHE_PREFIX + 'av2_' + id;
    const c = cacheGet(ck);
    if (c) { try { const j = JSON.parse(c); if (j.src || Date.now() - j.t < 864e5) return j.src || null; } catch (e) {} }
    return avRun(async () => {
        try {
            const r = await fetch(`/memberlist.php?mode=viewprofile&u=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
            if (!r.ok) return null;
            const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
            const sels = ['.profile-avatar img', 'dt.profile-avatar img', '.avatar-container img', 'dl.left-box img.avatar', '.postprofile img.avatar', 'img.avatar'];
            let img = null;
            for (const sel of sels) {
                img = [...doc.querySelectorAll(sel)].find(i => !i.closest(AV_SKIP));
                if (img) break;
            }
            const s = img && (img.getAttribute('data-src') || img.getAttribute('src'));
            let src = null;
            if (s && !s.startsWith('data:')) { try { src = new URL(s, r.url || location.href).href; } catch (e) { src = null; } }
            cacheSet(ck, JSON.stringify({ t: Date.now(), src }));
            return src;
        } catch (e) { return null; }
    });
}

async function getRelAvatar(r) {
    let id = r.id || null;
    if (!id) { id = await resolveUserId(r.name); if (id) r.id = id; }
    return fetchAvatar(id, r.name);
}

function setRlAvatar(card, src) {
    const av = card.querySelector('.seer-rl-av');
    if (av) av.innerHTML = `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">`;
}

function renderRelPanel() {
    const p = $('seer-rel-panel');
    if (!p) return;
    const on = view.key === 'releaser' && rel && !search.active;
    p.classList.toggle('show', !!on);
    const rs = $('seer-rel-search');
    if (rs) rs.classList.toggle('show', !!on);
    updateRelHint();
    if (!on) { p.innerHTML = ''; return; }

    const relPool = rel.sq ? rel.sq.items : rel.items;
    const cnt = { all: relPool.length, film: 0, series: 0, other: 0 };
    relPool.forEach(it => { cnt[relCatOf(it)]++; });
    const totalTxt = rel.total > 0
        ? `${rel.total} release totali${rel.items.length < rel.total ? ` · ${rel.items.length} caricate` : ''}`
        : `${rel.items.length}${rel.exhausted ? '' : '+'} release`;
    const pill = (c, label) => `<button class="seer-facet ${rel.cat === c ? 'active' : ''}" data-rcat="${c}">${label} <small>${cnt[c]}</small></button>`;

    p.innerHTML =
        `<button class="seer-rel-back" data-rel="back">← Indietro</button>` +
        `<div class="seer-rel-avatar">${rel.avatar ? `<img src="${esc(rel.avatar)}" alt="" referrerpolicy="no-referrer">` : '👤'}</div>` +
        `<div class="seer-rel-info">` +
            `<h3 class="seer-rel-name">${esc(rel.name)}</h3>` +
            `<span class="seer-rel-total">${esc(totalTxt)}${rel.loading ? ' · caricamento…' : ''}</span>` +
            `<div class="seer-rel-pills">${pill('all', '🗂️ Tutte')}${pill('film', '🎬 Film')}${pill('series', '📺 Serie TV')}${pill('other', '📚 Altro')}<button class="seer-facet ${isFollowingRel(rel.name) ? 'active' : ''}" data-rel="follow">${isFollowingRel(rel.name) ? '✓ Seguito' : '➕ Segui'}</button></div>` +
        `</div>`;
    const im = p.querySelector('.seer-rel-avatar img');
    if (im) im.addEventListener('error', () => { im.parentElement.textContent = '👤'; });
}

async function loadReleaserPage() {}
async function loadRelSearchPage() {}
async function loadMoreReleaser() {}

const relKeywordUrl = (r, q) =>
    `/search.php?keywords=${encodeURIComponent(q)}&terms=all&sc=1&sf=titleonly&sr=topics&sk=t&sd=d&st=0&ch=300&t=0` +
    (r.id ? `&author_id=${encodeURIComponent(r.id)}` : `&author=${encodeURIComponent(r.name)}`) + `&submit=Cerca`;

function updateRelHint() {
    const h = $('seer-rel-hint');
    if (!h) return;
    if (!rel || view.key !== 'releaser' || search.active) { h.textContent = ''; return; }
    const q = (rel.q || '').trim();
    if (rel.sq) {
        h.textContent = PG.loading
            ? '🌐 Ricerca sul forum…'
            : `🌐 ${rel.sq.items.length ? 'Risultati' : 'Nessun risultato'} sul forum per "${rel.sq.query}"${PG.total > 1 ? ' · ' + PG.total + ' pagine' : ''}`;
    } else if (q.length >= 3) {
        h.textContent = `🔎 Filtro sulle ${rel.items.length} release di questa pagina — premi Invio per cercare tra tutte le sue release.`;
    } else {
        h.textContent = '';
    }
}

function relEmptyMsg() {
    if (!rel) return null;
    const q = (rel.q || '').trim();
    if (rel.sq) {
        if (PG.loading) return `🔍 Ricerca di "${esc(rel.sq.query)}" tra le release di ${esc(rel.name)}…`;
        if (!rel.sq.items.length) return `Nessun risultato per "${esc(rel.sq.query)}" tra le release di ${esc(rel.name)}.`;
        return null;
    }
    if (q.length >= 3 && rel.items.length) return `Nessuna release di questa pagina corrisponde a "${esc(q)}".<br>Premi <b>Invio</b> per cercare tra tutte le release di ${esc(rel.name)}.`;
    return null;
}

function relRunSearch() {
    if (view.key !== 'releaser' || !rel || search.active) return;
    const q = ($('seer-rel-q').value || '').trim();
    rel.q = q;
    if (q.length < 3) {
        const had = !!rel.sq;
        rel.sq = null;
        if (q) toast('Scrivi almeno 3 caratteri per cercare', 'warn');
        if (had) loadPage(1); else renderDeck(localFilterValue(), true);
        return;
    }
    rel.sq = { query: q, items: [], nextUrl: null, exhausted: true, loading: false };
    loadPage(1);
}

async function openReleaser(name, id, avatar) {
    if (!name) return;
    hideModal();
    viewToken++;
    searchToken++;
    search = { active: false, scope: 'scoped', query: '', label: '', items: [], nextUrl: null, sc: null, fuzzy: false };
    $('seer-search-input').value = '';
    const prev = view.key === 'releaser' ? (rel && rel.prev) : { key: view.key, section: view.section, page: PG.lastViewPage || 1 };
    const mine = rel = { name, id: id || null, avatar: avatar || null, items: [], total: 0, cat: 'all', q: '', sq: null, nextUrl: null, exhausted: true, loading: false, error: false, prev: prev || { key: 'home', section: null } };
    view = { key: 'releaser', section: null };
    { const ri = $('seer-rel-q'); if (ri) ri.value = ''; }
    $('seer-sidebar').classList.remove('open');
    $('mirseer-app').scrollTop = 0;
    const wantPage = PG.want || 1;
    PG.want = 0;
    PG.items = [];
    PG.total = 0;
    updateChrome();
    if (!mine.avatar) getRelAvatar({ name, id }).then(src => { if (rel === mine && src) { mine.avatar = src; renderRelPanel(); } });
    await loadPage(wantPage);
}

const GX_VIEWS = ['home', 'films', 'series', 'section'];
const gxKey = () => (filters.releaser || '').trim().toLowerCase() + '|' + currentScope().fids.join(',');
const gxApplies = () => !search.active && GX_VIEWS.includes(view.key)
    && false;

const relAuthorUrl = (name, fids) =>
    `/search.php?keywords=&author=${encodeURIComponent(name)}&terms=all&sc=1&sf=firstpost&sr=topics&sk=t&sd=d&st=0&ch=300&t=0` +
    fids.map(id => `&f[]=${id}&fid[]=${id}`).join('') + `&submit=Cerca`;

async function loadGxPage() {
    const g = gx;
    if (g.loading || g.exhausted) return;
    g.loading = true;
    try {
        const sc = currentScope();
        const url = g.nextUrl || (g.mode === 'author' ? relAuthorUrl(g.name, sc.fids) : buildSearchUrl(g.name, sc.fids));
        const page = await fetchSearchPage(url, sc);
        if (gx !== g) return;
        if (page.flood) { toast('⏳ Limite frequenza ricerche del forum: riprova tra qualche secondo', 'warn', 4000); g.exhausted = true; return; }
        g.items = uniqById([...g.items, ...page.items]);
        g.nextUrl = page.nextUrl;
        if (!page.nextUrl) {
            if (g.mode === 'author' && !g.items.length) { g.mode = 'title'; g.nextUrl = null; }
            else g.exhausted = true;
        }
    } catch (e) {
        console.error('Global releaser search failed', e);
        g.exhausted = true;
    } finally {
        g.loading = false;
        if (gx === g && $('mirseer-app').style.display === 'block') renderDeck(localFilterValue());
    }
}

let gxTimer = null;
function gxStart() {
    return;
    clearTimeout(gxTimer);
    gxTimer = setTimeout(() => {
        const name = (filters.releaser || '').trim();
        if (name.length < 3 || search.active || !GX_VIEWS.includes(view.key)) { gx = newGx(); return; }
        const key = gxKey();
        if (gx.key === key) return;
        const g = gx = { ...newGx(), key, name, exhausted: false };
        (async () => { for (let i = 0; i < 2 && gx === g && !g.exhausted; i++) await loadGxPage(); })();
    }, 600);
}

const wantMore = () => anyFilter() || ((view.key === 'films' || view.key === 'series') && !search.active);
const minNeeded = () => anyFilter() ? AUTO_MIN : ((view.key === 'films' || view.key === 'series') ? 40 : 0);

async function autoPage() {
    return;
    if (autoBusy || search.active || !wantMore() || !GX_VIEWS.includes(view.key)) return;
    if (gxApplies() && gx.loading) return;
    autoBusy = true;
    try {
        for (let i = 0; i < AUTO_PAGES_MAX; i++) {
            if (search.active || !wantMore() || !GX_VIEWS.includes(view.key)) break;
            const done = view.key === 'section' ? currentSectionStore().exhausted : main.exhausted;
            if (done || lastDisplayed.length >= minNeeded()) break;
            if (view.key === 'section') await loadSection(view.section, currentSectionStore());
            else await loadMoreMain();
            renderDeck(localFilterValue(), true);
        }
    } catch (e) { console.warn('autoPage', e); }
    finally { autoBusy = false; updateLoadMore(); }
}

function getVisibleItems() {
    let base;
    if (isPagedView()) base = PG.items;
    else if (search.active) base = search.items;
    else if (view.key === 'favs') base = uniqById([...wlNew.values(), ...favItems()]);
    else if (view.key === 'project') base = proj ? projVisible() : [];
    else if (view.key === 'releaser') base = rel ? (rel.sq ? rel.sq.items : rel.items) : [];
    else if (view.key === 'section') base = currentSectionStore().items;
    else {
        base = main.items;
        if (view.key === 'films') base = base.filter(i => i.type === 'Film');
        if (view.key === 'series') base = base.filter(i => i.type === 'Serie TV');
    }
    if (gxApplies()) {
        const sc = currentScope();
        base = uniqById([...base, ...gx.items.filter(it => inScope(it, sc))]);
    }
    lastBase = base;
    lastBaseCount = base.length;

    let sorted = view.key === 'project' ? base.slice() : applySort(base);
    if (!search.active && view.key === 'releaser' && rel && rel.cat !== 'all') sorted = sorted.filter(it => relCatOf(it) === rel.cat);
    const pred = makeFilter();
    if (!search.active && (view.key === 'favs' || view.key === 'releaser' || view.key === 'project')) {
        sorted.forEach(x => { x._vers = null; });
        return pred ? sorted.filter(pred) : sorted;
    }
    return stackVersions(sorted, pred);
}

function showListMessage(text, cls = '') {
    $('seer-main-list').innerHTML = `<p class="seer-status-msg ${cls}">${text}</p>`;
}

function syncSidebarActive() {
    document.querySelectorAll('#seer-sidebar .seer-side-item').forEach(b => {
        const on = !search.active && (
            (b.dataset.nav && view.key === b.dataset.nav) ||
            (b.dataset.fid && view.key === 'section' && String(view.section.id) === b.dataset.fid)
        );
        b.classList.toggle('active', !!on);
    });
}

function updateLoadMore() {
    { const _b = $('seer-load-more-btn'); if (_b) _b.style.display = 'none'; renderPager(); return; }
    const btn = $('seer-load-more-btn');
    let show = true, label = '📥 Carica Altre Uscite';
    if (search.active) { show = !!search.nextUrl; label = '📥 Carica altri risultati'; }
    else if (view.key === 'favs') { show = false; }
    else if (view.key === 'releaser') {
        if (rel && rel.sq) { show = !rel.sq.exhausted; label = '📥 Carica altri risultati'; }
        else { show = !!rel && !rel.exhausted; label = '📥 Carica altre release'; }
    }
    else if (view.key === 'section') { show = !currentSectionStore().exhausted; label = '📥 Carica altri topic'; }
    else { show = !main.exhausted || (gxApplies() && !gx.exhausted); }
    btn.style.display = show ? '' : 'none';
    btn.innerText = label;
}

function currentScope() {
    if (view.key === 'section') return { label: view.section.name, fids: [view.section.id], relaxed: true, fallbackType: view.section.name, mode: 'scoped' };
    if (view.key === 'films') return { label: 'Film', fids: [FILM_FORUM_ID], relaxed: false, fallbackType: 'Film', mode: 'scoped' };
    if (view.key === 'series') return { label: 'Serie TV', fids: [SERIES_FORUM_ID], relaxed: false, fallbackType: 'Serie TV', mode: 'scoped' };
    return { label: 'Film e Serie TV', fids: [FILM_FORUM_ID, SERIES_FORUM_ID], relaxed: false, fallbackType: null, mode: 'scoped' };
}

function allScope() {
    const fids = [...new Set(sectionList.filter(s => s.fid).map(s => String(s.fid)))];
    return { label: 'tutte le sezioni', fids, relaxed: true, fallbackType: null, mode: 'all' };
}

function resolveSearchScope() {
    const sel = $('seer-search-section-filter');
    const v = (sel && sel.value) || 'current';
    if (v === 'all') return allScope();
    if (v.startsWith('sec:')) {
        const s = sectionList.find(x => x.name === v.slice(4));
        if (s && s.fid) {
            const allFids = [String(s.fid)];
            forumToSection.forEach((secName, fId) => {
                if (secName === s.name && !allFids.includes(fId)) allFids.push(fId);
            });
            return { label: s.name, fids: allFids, relaxed: !s.nav, fallbackType: s.name, mode: 'scoped' };
        }
    }
    return currentScope();
}

function buildSearchFilter() {
    const sel = $('seer-search-section-filter');
    if (!sel) return;
    const prev = sel.value || 'current';
    sel.innerHTML = `<option value="all">🌐 Tutte le sezioni</option><option value="current">📍 Sezione attuale</option>` +
        sectionList.map(s => `<option value="sec:${esc(s.name)}" ${s.fid ? '' : 'disabled'}>${s.ico} ${esc(s.name)}</option>`).join('');
    sel.value = prev;
    if (sel.value !== prev) sel.value = 'current';
}

function updateChrome() {
    const t = $('seer-section-title');
    if (search.active) t.textContent = search.scope === 'all' ? `🌐 "${search.query}" in tutte le sezioni` : `🔍 "${search.query}" in ${search.label}`;
    else if (view.key === 'releaser' && rel) t.textContent = '👤 ' + rel.name;
    else if (view.key === 'films') t.textContent = '🎬 Film Disponibili';
    else if (view.key === 'series') t.textContent = '📺 Serie TV';
    else if (view.key === 'favs') t.textContent = '⭐ Watchlist';
    else if (view.key === 'releasers') t.textContent = '🏆 Releasers';
    else if (view.key === 'account') t.textContent = '👤 Il mio account';
    else if (view.key === 'project' && proj) t.textContent = '🗂️ ' + proj.item.displayTitle;
    else if (view.key === 'section') t.textContent = iconFor(view.section.name) + ' ' + view.section.name;
    else t.textContent = '🆕 Ultime Release';

    const hint = $('seer-search-hint');
    let hh = '';
    if (search.active) {
        if (search.fuzzy) hh = `<span>Nessun risultato esatto sul forum: mostro i titoli già caricati più simili a "<b>${esc(search.query)}</b>".</span>`;
        else if (search.scope === 'scoped') hh = `<span>Risultati solo in <b>${esc(search.label)}</b>.</span>`;
        if (search.scope === 'scoped') hh += `<button class="seer-load-btn" id="seer-search-all-btn" style="padding:6px 14px; font-size:12.5px;">🌐 Cerca in tutte le sezioni</button>`;
    }
    hint.innerHTML = hh;

    $('seer-search-input').placeholder = `Cerca in ${resolveSearchScope().label}…  ( / )`;

    document.querySelectorAll('#seer-view-toggle button').forEach(b => b.classList.toggle('active', b.dataset.view === viewMode));
    renderGenres(); renderWlPanel(); syncHash();
    ['seer-facets', 'seer-genres', 'seer-adv', 'seer-sel-btn', 'seer-view-toggle', 'seer-sort-select'].forEach(id => { const e = $(id); if (e) e.style.display = ((view.key === 'releasers' || view.key === 'account' || view.key === 'project') && !search.active) ? 'none' : ''; });
    renderFacets();
    renderRelPanel();
    updateAdv();
    syncSidebarActive();
    updateHeroVisibility();
    renderProjHead();
    const appEl = $('mirseer-app');
    if (appEl) appEl.dataset.seerView = search.active ? 'search' : view.key;
    pjFabUpdate();
    updateLoadMore();
}

function fillRow(row, item) {
    const isProj = item.type === PROJECT_SECTION || item.forumName === PROJECT_SECTION;
    const m = item.meta;
    const kind = effKind(item);
    const looksVideo = kind === 'video' || (!kind && VIDEO_TYPES.has(item.type));
    const grid = viewMode === 'grid';
    const seen = isSeen(item.id);
    const fav = isFav(item.id);
    const isSel = selected.has(String(item.id));
    row.classList.toggle('sel-mode', selMode);
    row.classList.toggle('is-selected', selMode && isSel);
    const selBox = selMode ? `<span class="seer-sel-box ${isSel ? 'on' : ''}">${isSel ? '✓' : ''}</span>` : '';

    row.classList.toggle('is-card', grid);
    row.classList.toggle('is-seen', seen);
    row.classList.toggle('is-proj', isProj);
    if (isProj) row.dataset.topicType = 'Progetti e Collezioni';

    let badgesHtml = '';
    let specsHtml = '';
    if (isProj) {
        badgesHtml = '<span class="seer-tag tag-season" style="background:rgba(99,102,241,0.25);color:#c7d2fe;border:1px solid rgba(99,102,241,0.45)">🗂️ COLLEZIONE</span>';
        specsHtml = '<span class="seer-preview">Apri per esplorare tutti i titoli della collezione.</span>';
    } else if (kind === 'text') {
        badgesHtml = `<span class="seer-tag tag-text">📝 Testo</span>`;
        const preview = (item.synopsis || item.body || '').replace(/\s+/g, ' ').trim().slice(0, 190);
        specsHtml = `<span class="seer-preview">${esc(preview || 'Post testuale: apri per leggere il contenuto.')}</span>`;
    } else if (kind === 'audio') {
        badgesHtml = `<span class="seer-tag tag-audio">🎵 Audio</span>`;
        const preview = (item.synopsis || '').replace(/\s+/g, ' ').trim().slice(0, 190);
        specsHtml = `<span class="seer-pill audio">🎵 File audio</span>` + (preview ? `<span class="seer-preview">${esc(preview)}</span>` : '');
    } else if (kind === 'file') {
        badgesHtml = `<span class="seer-tag tag-file">📦 File</span>`;
        const preview = (item.synopsis || '').replace(/\s+/g, ' ').trim().slice(0, 190);
        specsHtml = preview ? `<span class="seer-preview">${esc(preview)}</span>` : `<span class="seer-preview">Apri per i dettagli e il magnet.</span>`;
    } else if (looksVideo) {
        if (m.is4k) badgesHtml += `<span class="seer-tag tag-4k">4K UHD</span>`;
        else if (m.is1080p) badgesHtml += `<span class="seer-tag tag-1080">1080p</span>`;
        else if (m.is720p) badgesHtml += `<span class="seer-tag tag-720">720p</span>`;
        else badgesHtml += `<span class="seer-tag tag-sd">SD</span>`;
        if (m.isDV) badgesHtml += `<span class="seer-tag tag-dv">DV</span>`;
        else if (m.isHDR) badgesHtml += `<span class="seer-tag tag-hdr">HDR</span>`;
        if (m.season) badgesHtml += `<span class="seer-tag tag-season">📺 ${esc(m.season.short)}</span>`;
        specsHtml = `
            <span class="seer-pill audio">🔊 ${esc(m.audioFormatted)}</span>
            ${m.subLangs.length ? `<span class="seer-pill subs">💬 Sub: ${esc(m.subsFormatted)}</span>` : ''}
            <span class="seer-pill codec">${esc(m.isAv1 ? 'AV1' : (m.isH265 ? 'H.265' : (m.isH264 ? 'H.264' : 'Video')))}</span>
            <span class="seer-pill codec">${esc(m.source)}</span>`;
    } else {
        specsHtml = `<span class="seer-preview">Lettura del post…</span>`;
    }
    if (item.sizeBytes && kind !== 'text') specsHtml += `<span class="seer-pill codec">💾 ${esc(fmtSize(item.sizeBytes))}</span>`;
    if (wlNew.has(String(item.id))) badgesHtml += '<span class="seer-tag tag-new">🆕 Nuovo</span>';
    if (item._vers && item._vers.length > 1) badgesHtml += `<span class="seer-tag tag-vers" title="Più versioni disponibili">📚 ${item._vers.length} versioni</span>`;
    if (seen) badgesHtml += `<span class="seer-tag tag-seen">✓ Scaricato</span>`;

    const icon = kind ? kindIcon(item) : typeIcon(item);
    const hi = row.dataset.hi === '1';
    const posterHtml = item.poster
        ? `<img class="seer-poster" src="${esc(item.poster)}" alt="" decoding="async" ${hi ? 'fetchpriority="high"' : 'loading="lazy"'} data-seer-id="${esc(item.id)}" data-seer-role="poster" />`
        : `<div class="seer-poster-fallback">${icon}</div>`;

    const favBtn = `<button class="seer-fav-btn ${fav ? 'on' : ''}" data-fav="1" title="${fav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">${fav ? '★' : '☆'}</button>`;

    if (grid) {
        row.innerHTML = `
            <div class="seer-poster-wrap">${posterHtml}<div class="seer-card-badges">${badgesHtml}</div>${favBtn}${selBox}</div>
            <div class="seer-info"><span class="seer-title" title="${esc(item.rawTitle)}">${esc(isProj ? item.cleanTitle.replace(/\s+(?:SD|TESTO|RIP|VIDEO)\b/gi, '').trim() : item.displayTitle)}</span></div>
            <div class="seer-card-meta"><span>${esc(item.type)}${item.year ? ' · ' + esc(item.year) : ''}${item.sizeBytes ? ' · ' + esc(fmtSize(item.sizeBytes)) : ''}</span><span>👁️ ${esc(fmtViews(item.views || 0))}</span></div>
        `;
        return;
    }

    row.innerHTML = `
        ${selBox}<div class="seer-poster-wrap">${posterHtml}</div>
        <div class="seer-info">
            <div class="seer-title-line">
                <span class="seer-title" title="${esc(item.rawTitle)}">${esc(isProj ? item.cleanTitle.replace(/\s+(?:SD|TESTO|RIP|VIDEO)\b/gi, '').trim() : item.displayTitle)}</span>
                ${badgesHtml}
            </div>
            <div class="seer-specs-line">${specsHtml}</div>
        </div>
        <div class="seer-right-meta">
            <span class="seer-type-label" title="${esc(item.type)}">${esc(item.type)}</span>
            ${item.year ? `<span class="seer-year-label">${esc(item.year)}</span>` : ''}
            <span class="seer-views-label" title="Visite sul forum">👁️ ${esc(fmtViews(item.views || 0))}</span>
        </div>
        ${favBtn}
    `;
}

const groupLabel = it => (it.forumId && forumToSection.get(it.forumId)) || sectionByName(it.forumName) || it.forumName || it.type || 'Altro';

function renderDeck(filterQuery = '', noAuto = false) {
    cancelQueued();
    if (view.key === 'account' && !search.active) { updateChrome(); renderAccountPage(); return; }
    if (view.key === 'project' && !search.active) { updateChrome(); renderProjDoc(); return; }
    const listContainer = $('seer-main-list');
    if (posterObserver) posterObserver.disconnect();
    listContainer.innerHTML = '';
    listContainer.classList.toggle('seer-grid', viewMode === 'grid');

    let displayed = getVisibleItems();
    updateChrome();
    if (filterQuery && !search.active) displayed = displayed.filter(item => fuzzyScore(item, filterQuery) > 0);

    $('seer-count').innerText = search.active
        ? `${displayed.length} risultati per "${search.query}"${pgSuffix()}`
        : (view.key === 'releaser' ? `${displayed.length} release mostrate${pgSuffix()}` : `${displayed.length} uscite mostrate${pgSuffix()}`);

    if (displayed.length === 0) {
        lastDisplayed = [];
        if (view.key === 'project' && !search.active) showListMessage(projEmptyMsg());
        else if (view.key === 'favs' && !search.active && lastBaseCount === 0) showListMessage('Watchlist vuota: premi ☆ su una release, oppure ➕ Segui da una scheda per seguire un releaser o una serie.');
        else if (view.key === 'releaser' && !search.active && rel && relEmptyMsg()) showListMessage(relEmptyMsg());
        else if (view.key === 'releaser' && !search.active && rel && lastBaseCount === 0) showListMessage(rel.loading ? 'Caricamento delle release…' : `Nessuna release trovata per ${esc(rel.name)}.`);
        else if (anyFilter() && lastBaseCount > 0) showListMessage('Nessuna uscita in questa pagina corrisponde ai filtri attivi. Prova ad azzerarli o a cambiare pagina.');
        else showListMessage('Nessuna uscita da mostrare qui.');
        if (!noAuto) setTimeout(autoPage, 0);
        warmRatings(lastBase);
        return;
    }

    const frag = document.createDocumentFragment();
    let idx = 0;
    const addRow = item => {
        const row = document.createElement('div');
        row.className = 'seer-row' + (viewMode === 'grid' ? ' is-card' : '');
        row.dataset.topicId = item.id;
        if (idx++ < IMG_HI_COUNT) row.dataset.hi = '1';
        fillRow(row, item);
        row.onclick = e => {
            if (!e.target.closest('.seer-fav-btn')) {
                kbId = String(item.id); kbApply(false);
                if (selMode) { toggleSel(item, e.shiftKey); return; }
            }
            if (e.target.closest('.seer-fav-btn')) { e.stopPropagation(); toggleFav(item); return; }
            openDetailModal(item);
        };
        frag.appendChild(row);
        if (!item.posterTried) posterObserver.observe(row);
    };

    if (search.active && search.scope === 'all') {
        const groups = new Map();
        displayed.forEach(it => {
            const g = groupLabel(it);
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(it);
        });
        const order = n => { const i = sectionList.findIndex(s => s.name === n); return i === -1 ? 999 : i; };
        [...groups.entries()].sort((a, b) => order(a[0]) - order(b[0])).forEach(([g, arr]) => {
            const h = document.createElement('div');
            h.className = 'seer-group-title';
            h.innerHTML = `<span>${iconFor(g)} ${esc(g)}</span><em>${arr.length}</em>`;
            frag.appendChild(h);
            arr.forEach(addRow);
        });
    } else if (view.key === 'favs' && !search.active && wlNew.size) {
        const isNew = it => wlNew.has(String(it.id));
        const head = (t, n) => { const h = document.createElement('div'); h.className = 'seer-group-title'; h.innerHTML = `<span>${t}</span><em>${n}</em>`; frag.appendChild(h); };
        const fresh = displayed.filter(isNew), saved = displayed.filter(it => !isNew(it));
        if (fresh.length) { head('🆕 Nuove uscite dai tuoi seguiti', fresh.length); fresh.forEach(addRow); }
        if (saved.length) { head('⭐ Salvati', saved.length); saved.forEach(addRow); }
    } else {
        displayed.forEach(addRow);
    }
    listContainer.appendChild(frag);
    lastDisplayed = [...listContainer.querySelectorAll('.seer-row')].map(r => registry.get(String(r.dataset.topicId))).filter(Boolean);
    kbApply(false);
    if ($('seer-modal-overlay').style.display === 'flex') updateModalNav();
    if (!noAuto) setTimeout(autoPage, 0);
    warmRatings(lastBase);
}

const localFilterValue = () => {
    if (view.key === 'releaser' && rel && !search.active) {
        const rq = (rel.q || '').trim();
        return (!rel.sq && rq.length >= 3) ? rq : '';
    }
    const q = $('seer-search-input').value.trim();
    return (!search.active && q.length >= 3) ? q : '';
};

async function setView(key, section = null) {
    const savedScroll = (key === 'home' || key === 'films' || key === 'series' || key === 'section' || key === 'releaser' || key === 'project' || key === 'account') ? 0 : (scrollMemory.get(viewKeyOf(key, section)) || 0);
    await setViewCore(key, section);
    if (view.key !== key) return;
    if (savedScroll) requestAnimationFrame(() => $('mirseer-app').scrollTo({ top: savedScroll, behavior: 'instant' }));
    if (key === 'favs') checkFollows();
}
async function setViewCore(key, section = null) {
    const token = ++viewToken;
    pgToken++;
    rel = null;
    gx = newGx();
    if (search.active) {
        searchToken++;
        search = { active: false, scope: 'scoped', query: '', label: '', items: [], nextUrl: null, sc: null, fuzzy: false };
    }
    $('seer-search-input').value = '';
    view = { key, section };
    selected.clear();
    $('seer-sidebar').classList.remove('open');
    $('mirseer-app').scrollTop = 0;
    const wantPage = PG.want || 1;
    PG.want = 0;
    PG.loading = false;

    if (key === 'account') { cancelQueued(); updateChrome(); renderAccountPage(); return; }
    if (key === 'project') { cancelQueued(); updateChrome(); renderDeck(localFilterValue(), true); return; }

    if (key === 'films' || key === 'series' || key === 'section' || key === 'home') {
        PG.items = [];
        PG.total = 0;
        updateChrome();
        const pagePromise = loadPage(wantPage);
        if (key === 'home' && !main.loaded && !main.starting) {
            main.starting = loadMain().catch(e => console.error('loadMain', e)).finally(() => { main.starting = null; });
        }
        await pagePromise;
        return;
    }
    renderDeck();
    if (view.key === 'releasers' && !search.active) { cancelQueued(); updateChrome(); renderReleasersPage(); startRelRefresh(); return; }
    if (key === 'releasers') startRelRefresh();
}

async function fetchForumTopics(forumId, typeName, start = 0, relaxed = false) {
    try {
        await netGate();
        const resp = await fetch(`/viewforum.php?f=${forumId}&start=${start}`, { credentials: 'same-origin' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const text = await resp.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        return { doc, items: await parseTopicsFromDoc(doc, typeName, relaxed) };
    } catch (e) {
        console.error('Forum fetch error ' + forumId, e);
        const items = [];
        items.raw = 0;
        items.ids = [];
        items.failed = true;
        return { doc: null, items };
    }
}

const makeCursor = (id, type, relaxed, isParent = false) => ({ id: String(id), type, relaxed, isParent, offset: 0, exhausted: false, seen: new Set(), subsDone: false });
const makeGroup = (cursors, relaxed, excludeRe) => ({ cursors, relaxed, excludeRe });
const groupDone = g => g.cursors.every(c => c.exhausted);

async function pullCursor(cur) {
    if (cur.exhausted) return { items: [], doc: null };
    const res = await fetchForumTopics(cur.id, cur.type, cur.offset, cur.relaxed);
    if (res.items.failed) return { items: [], doc: null };
    cur.offset += PAGE_SIZE;
    const fresh = (res.items.ids || []).filter(id => !cur.seen.has(id));
    fresh.forEach(id => cur.seen.add(id));
    if (!fresh.length) cur.exhausted = true;
    return { items: [...res.items], doc: res.doc };
}

function findSubforumIds(doc, parentId, excludeRe) {
    const ids = new Set();
    doc.querySelectorAll('a.forumtitle, a.subforum').forEach(a => {
        if (excludeRe.test(a.textContent.trim())) return;
        const id = ((a.getAttribute('href') || '').match(/[?&]f=(\d+)/) || [])[1];
        if (id && id !== String(parentId)) ids.add(id);
    });
    return [...ids];
}

async function pullGroup(group) {
    const active = group.cursors.filter(c => !c.exhausted);
    const parts = await Promise.all(active.map(async cur => {
        const r = await pullCursor(cur);
        let subItems = [];
        if (cur.isParent && !cur.subsDone && r.doc) {
            cur.subsDone = true;
            const fresh = [];
            findSubforumIds(r.doc, cur.id, group.excludeRe).forEach(id => {
                if (!group.cursors.some(c => c.id === id)) {
                    const sc = makeCursor(id, cur.type, group.relaxed);
                    group.cursors.push(sc);
                    fresh.push(sc);
                }
            });
            subItems = (await Promise.all(fresh.map(async s => (await pullCursor(s)).items))).flat();
        }
        return [...r.items, ...subItems];
    }));
    return parts.flat();
}

const uniqById = arr => {
    const seen = new Set();
    return arr.filter(i => (seen.has(String(i.id)) ? false : (seen.add(String(i.id)), true)));
};

async function loadMain() {
    main.group = makeGroup([
        makeCursor(FILM_FORUM_ID, 'Film', false, true),
        makeCursor(SERIES_FORUM_ID, 'Serie TV', false, true)
    ], false, MAIN_SUB_EXCLUDE_RE);
    main.items = uniqById(await pullGroup(main.group));
    main.exhausted = groupDone(main.group);
    main.loaded = true;

    main.bg = (async () => {
        for (let p = 1; settings.heroEnabled && p < INITIAL_PAGES && !groupDone(main.group); p++) {
            main.items = uniqById([...main.items, ...await pullGroup(main.group)]);
            main.exhausted = groupDone(main.group);
            if (['home', 'films', 'series'].includes(view.key) && !search.active && !isPagedView()) renderDeck(localFilterValue(), true);
        }
    })();
    if (settings.heroEnabled) buildHero();
}

async function loadMorePages() {
    $('seer-load-more-btn').innerText = 'Caricamento in corso...';
    await loadMoreMain();
    renderDeck(localFilterValue());
}

async function loadSection(section, store, pages = 1, fromBg = false) {
    if (!fromBg && store.bg) await store.bg;
    if (!store.group) store.group = makeGroup([makeCursor(section.id, section.name, true, true)], true, SIDE_HIDE_RE);
    let got = [];
    for (let p = 0; p < pages && !groupDone(store.group); p++) got = got.concat(await pullGroup(store.group));
    const known = new Set(store.items.map(i => String(i.id)));
    got.forEach(i => { if (!known.has(String(i.id))) { known.add(String(i.id)); store.items.push(i); } });
    store.loaded = true;
    store.exhausted = groupDone(store.group);
}

async function loadMoreSection() {
    const store = currentSectionStore();
    $('seer-load-more-btn').innerText = 'Caricamento in corso...';
    for (let tries = 0; tries < 3 && !store.exhausted; tries++) {
        const before = store.items.length;
        await loadSection(view.section, store);
        if (store.items.length > before) break;
    }
    renderDeck(localFilterValue());
}

function renderSidebarSections() {
    const box = $('seer-side-sections');
    box.innerHTML = sectionList.map(s => {
        const inner = `<span class="ico">${s.ico}</span><span class="lbl">${esc(s.name)}</span>`;
        if (s.nav) return `<button class="seer-side-item" data-nav="${s.nav}">${inner}</button>`;
        if (!s.fid) {
            const tip = sidebarReady ? "Sezione non trovata nell'indice: imposta il suo fid in SECTIONS" : 'Caricamento...';
            return `<button class="seer-side-item disabled" disabled title="${esc(tip)}">${inner}</button>`;
        }
        return `<button class="seer-side-item" data-fid="${esc(s.fid)}" data-name="${esc(s.name)}">${inner}</button>`;
    }).join('');
    syncSidebarActive();
    buildSearchFilter();
}

async function loadSidebar() {
    renderSidebarSections();
    try {
        const resp = await fetch('/index.php', { credentials: 'same-origin' });
        const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
        if (!currentUser) { currentUser = detectUser(doc); paintUser(); }

        const idOf = a => ((a.getAttribute('href') || '').match(/[?&]f=(\d+)/) || [])[1];
        const byId = new Map();
        doc.querySelectorAll('a.forumtitle, a.subforum, a[href*="viewforum.php?f="]').forEach(a => {
            const id = idOf(a);
            const name = a.textContent.replace(/\s+/g, ' ').trim();
            if (!id || !name) return;
            const isTitle = a.matches('a.forumtitle');
            const row = a.closest('li.row, tr');
            const pa = row && row.querySelector('a.forumtitle');
            const parentId = (!isTitle && pa) ? idOf(pa) : null;
            const parentName = (!isTitle && pa) ? pa.textContent.replace(/\s+/g, ' ').trim() : '';
            const prev = byId.get(id);
            if (prev && (prev.parent || !isTitle)) return;
            byId.set(id, { id, name, a, parent: isTitle, parentId, full: parentName ? parentName + ' ' + name : name });
        });
        const entries = [...byId.values()];

        const taken = new Set(sectionList.filter(s => s.fid).map(s => String(s.fid)));
        sectionList.forEach(s => {
            if (s.fid || !s.re) return;
            const pool = entries.filter(x => !taken.has(x.id));
            const e = pool.find(x => x.parent && s.re.test(x.name))
                   || pool.find(x => !x.parent && s.re.test(x.name))
                   || pool.find(x => s.re.test(x.full));
            if (e) { s.fid = e.id; taken.add(e.id); }
        });

        const missing = sectionList.filter(s => !s.fid).map(s => s.name);
        if (missing.length) console.info('[MirSeer] Sezioni non trovate:', missing, '— forum visibili:', [...new Set(entries.map(e => e.id + ':' + e.full))]);

        sectionList.forEach(s => { if (s.fid) forumToSection.set(String(s.fid), s.name); });
        sectionList.forEach(s => {
            if (!s.fid) return;
            entries.forEach(x => {
                if (x.parentId === String(s.fid) && !forumToSection.has(x.id)) forumToSection.set(x.id, s.name);
            });
        });
    } catch (e) {
        console.error('Sidebar load failed', e);
        sidebarLoaded = false;
    }
    sidebarReady = true;
    renderSidebarSections();
}

function buildSearchUrl(query, fids) {
    const q = query.trim();
    const forumParams = fids.map(id => `&f[]=${id}&fid[]=${id}`).join('');
    return `/search.php?keywords=${encodeURIComponent(q)}&terms=all&author=&sc=1&sf=titleonly&sr=topics&sk=t&sd=d&st=0&ch=300&t=0${forumParams}&submit=Cerca`;
}

async function fetchSearchPage(url, sc) {
    await netGate();
    const resp = await fetch(url, { credentials: 'same-origin' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const items = await parseTopicsFromDoc(doc, 'auto', sc.relaxed, sc.fallbackType);
    const msg = (doc.querySelector('#message') || {}).textContent || '';
    const flood = items.length === 0 && /presto|soon|flood/i.test(msg);
    const next = doc.querySelector('a[rel="next"]');
    const nextUrl = next ? fixUrl(new URL(next.getAttribute('href'), SITE_ROOT).href) : null;

    const info = [...doc.querySelectorAll('.searchresults-title, .action-bar .pagination, .pagination')].map(e => e.textContent).join(' ');
    const tm = info.match(/(\d[\d.,]*)\s*(?:risultat|corrispondenz|match|result)/i);
    const total = tm ? parseInt(tm[1].replace(/[.,]/g, ''), 10) || 0 : 0;
    return { items, flood, nextUrl, total };
}

async function runSearch(query) {
    const token = ++searchToken;
    cancelQueued();
    const sc = resolveSearchScope();
    const pageWant = PG.wantSearch || 1;
    PG.wantSearch = 0;
    search = { active: true, scope: sc.mode === 'all' ? 'all' : 'scoped', query, label: sc.label, items: [], nextUrl: null, sc, fuzzy: false };
    await loadPage(pageWant);
    if (token !== searchToken || !search.active) return;
    if (!PG.items.length && !PG.err && !PG.loading) {
        const fz = fuzzyPool(query, sc);
        if (fz.length) {
            search = { ...search, items: fz, fuzzy: true };
            renderDeck();
        } else {
            showListMessage(`Nessun risultato per "${esc(query)}" in ${esc(sc.label)}.`);
        }
    }
}

async function loadMoreSearch() {}

function resetSearchState() {
    searchToken++;
    search = { active: false, scope: 'scoped', query: '', label: '', items: [], nextUrl: null, sc: null, fuzzy: false };
}

function exitSearchMode(filterQuery = '') {
    const was = search.active;
    if (was) pgToken++;
    resetSearchState();
    if (was && isPagedView()) { loadPage(PG.lastViewPage || 1); return; }
    renderDeck(filterQuery);
}

const PG = { page: 1, total: 0, per: PAGE_SIZE, items: [], loading: false, err: '', key: '', want: 0, wantSearch: 0, lastViewPage: 1 };
const pageCache = new Map();
const perByKey = new Map();
const PG_TTL = 180000;
let pgToken = 0;
let pgOpenAfterLoad = '';

const SERVER_SORT = { recent: ['t', 'd'], activity: ['t', 'd'], size: ['t', 'd'], views: ['v', 'd'], replies: ['r', 'd'], title: ['s', 'a'] };

const isPagedView = () => {
    if (search.active) return !search.fuzzy;
    return view.key === 'home' || view.key === 'films' || view.key === 'series' || view.key === 'section' || (view.key === 'releaser' && !!rel);
};
const pgSuffix = () => (isPagedView() && PG.total > 1 ? ` · pagina ${PG.page}/${PG.total}` : '');

function pgSource() {
    const f = SERVER_SORT[sortMode] || ['t', 'd'];
    if (search.active && !search.fuzzy) {
        const sc = search.sc;
        const base = buildSearchUrl(search.query, sc.fids);
        return { kind: 'search', key: 's|' + search.query + '|' + sc.fids.join(','), url: s0 => base + (s0 ? '&start=' + s0 : ''), type: 'auto', relaxed: sc.relaxed, fallbackType: sc.fallbackType };
    }
    if (view.key === 'releaser' && rel) {
        const base = rel.sq ? relKeywordUrl(rel, rel.sq.query) : relSearchUrl(rel);
        return { kind: 'search', key: 'r|' + (rel.id || rel.name) + '|' + (rel.sq ? rel.sq.query : ''), url: s0 => base + (s0 ? '&start=' + s0 : ''), type: 'auto', relaxed: true, fallbackType: null };
    }
    if (view.key === 'home') {
        const hUrl = (fid, s0) => `/viewforum.php?f=${fid}&start=${s0}&sk=${f[0]}&sd=${f[1]}&st=0`;
        const hPart = (fid, type) => ({ kind: 'forum', id: fid, key: 'f|' + fid + '|' + f.join(''), url: s0 => hUrl(fid, s0), urlFor: hUrl, sub: false, type, relaxed: false, fallbackType: type });
        const parts = [hPart(FILM_FORUM_ID, 'Film'), hPart(SERIES_FORUM_ID, 'Serie TV')];
        return { kind: 'home', key: 'h|' + f.join(''), parts, url: parts[0].url, type: 'auto', relaxed: false, fallbackType: null };
    }
    let id, type, relaxed;
    if (view.key === 'films') { id = FILM_FORUM_ID; type = 'Film'; relaxed = false; }
    else if (view.key === 'series') { id = SERIES_FORUM_ID; type = 'Serie TV'; relaxed = false; }
    else if (view.key === 'section' && view.section) { id = view.section.id; type = view.section.name; relaxed = true; }
    else return null;
    const urlFor = (fid, s0) => `/viewforum.php?f=${fid}&start=${s0}&sk=${f[0]}&sd=${f[1]}&st=0`;
    const secDef = sectionList.find(s => String(s.fid) === String(id));
    return { kind: 'forum', id, key: 'f|' + id + '|' + f.join(''), url: s0 => urlFor(id, s0), urlFor, sub: !!(secDef && secDef.sub), type, relaxed, fallbackType: type };
}

function docPaging(doc, start, fallbackPer) {
    const own = el => !el.closest('li.row, tr');
    const bars = [...doc.querySelectorAll('.pagination')].filter(own);
    const starts = [];
    bars.forEach(bar => bar.querySelectorAll('a[href*="start="]').forEach(a => {
        const m = (a.getAttribute('href') || '').match(/[?&]start=(\d+)/);
        if (m) starts.push(+m[1]);
    }));
    const txt = bars.map(b => b.textContent).join(' ');
    const tm = txt.match(/(?:pagina|page)\s*(\d+)\s*(?:di|of)\s*(\d+)/i);
    const act = [...doc.querySelectorAll('.pagination li.active, .pagination .active')].find(own);
    const current = (act ? (parseInt(act.textContent, 10) || 0) : 0) || (tm ? parseInt(tm[1], 10) : 0);
    const pos = starts.filter(s => s > 0);
    let per = 0;
    if (current > 1 && start > 0) per = Math.round(start / (current - 1));
    else if (start === 0 && pos.length) per = Math.min(...pos);
    if (per < 5 || per > 200) per = fallbackPer || PAGE_SIZE;
    let total = tm ? parseInt(tm[2], 10) : 0;
    if (!total) total = Math.round(Math.max(0, start, ...starts) / per) + 1;
    return { total: Math.max(1, total), per, current };
}

async function pgFetchOne(src, page, urlFn) {
    const per = PG.per || PAGE_SIZE;
    const start = (page - 1) * per;
    await netGate();
    const resp = await fetch((urlFn || src.url)(start), { credentials: 'same-origin' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const items = await parseTopicsFromDoc(doc, src.type, src.relaxed, src.fallbackType);
    const msg = (doc.querySelector('#message') || {}).textContent || '';
    const flood = items.length === 0 && /presto|soon|flood/i.test(msg);
    if (src.kind === 'forum' && !flood && !doc.querySelector('ul.topiclist, .topiclist, .forumbg, a.topictitle')) throw new Error('risposta non valida dal forum');
    const pg = docPaging(doc, start, per);
    const info = [...doc.querySelectorAll('.searchresults-title, .action-bar .pagination, .pagination')].map(e => e.textContent).join(' ');
    const tm = info.match(/(\d[\d.,]*)\s*(?:risultat|corrispondenz|match|result)/i);
    const results = tm ? parseInt(tm[1].replace(/[.,]/g, ''), 10) || 0 : 0;
    return { items, flood, total: pg.total, per: pg.per, current: pg.current, results, t: Date.now(), doc };
}

const subCache = new Map();
const subTotals = new Map();
const SUB_EXCLUDE_RE = /\b(richiest|regolament|segnalaz|comunicat|annunc|cestin)/i;

async function pgFetchHome(src, page) {
    const rs = await Promise.all(src.parts.map(async part => {
        try { return await pgFetch(part, page); }
        catch (e) { return { error: (e && e.message) || 'errore di rete' }; }
    }));
    const ok = rs.filter(r => !r.error);
    if (!ok.length) throw new Error(rs[0].error);
    const live = ok.filter(r => !r.flood);
    if (!live.length) return ok[0];
    const clamped = r => r.total < page || (r.current > 0 && r.current < page);
    const use = live.filter(r => !clamped(r));
    const total = Math.max(...live.map(r => r.total));
    return { items: uniqById(use.flatMap(r => r.items)), flood: false, total, per: live[0].per, current: Math.min(page, total), results: 0, t: Date.now() };
}

async function pgFetch(src, page) {
    if (src.kind === 'home') return pgFetchHome(src, page);
    const first = await pgFetchOne(src, page);
    const firstDoc = first.doc;
    delete first.doc;
    if (src.kind !== 'forum' || first.flood || !src.urlFor) return first;

    const sid = String(src.id);
    let subs = subCache.get(sid);
    if (!subs) {
        subs = firstDoc ? findSubforumIds(firstDoc, sid, SUB_EXCLUDE_RE) : [];
        if (!subs.length && page > 1) {
            try { const p1 = await pgFetchOne(src, 1); subs = findSubforumIds(p1.doc, sid, SUB_EXCLUDE_RE); } catch (e) {}
        }
        subCache.set(sid, subs);
        const secName = forumToSection.get(sid);
        if (secName) subs.forEach(id => { if (!forumToSection.has(id)) forumToSection.set(id, secName); });
    }
    if (!subs.length || !(src.sub || first.items.length === 0)) return first;

    const jobs = subs.filter(id => (subTotals.get(id) || Infinity) >= page).map(async id => {
        try {
            const r = await pgFetchOne(src, page, s0 => src.urlFor(id, s0));
            delete r.doc;
            subTotals.set(id, r.total);
            return r;
        } catch (e) { return null; }
    });
    const rs = (await Promise.all(jobs)).filter(Boolean);
    if (rs.some(r => r.flood)) return { ...first, flood: true };

    const clamped = r => r.total < page || (r.current > 0 && r.current < page);
    const parts = [first, ...rs].filter(r => !clamped(r));
    const total = Math.max(first.total, ...rs.map(r => r.total));
    return {
        items: uniqById(parts.flatMap(r => r.items)), flood: false,
        total, per: first.per, current: Math.min(page, total), results: 0, t: Date.now()
    };
}

async function loadPage(page, opts = {}) {
    const src = pgSource();
    if (!src) { renderDeck(localFilterValue(), true); return; }
    const my = ++pgToken;
    page = Math.max(1, parseInt(page, 10) || 1);
    if (PG.key !== src.key) { PG.total = 0; PG.items = []; }
    PG.key = src.key;
    PG.per = perByKey.get(src.key) || PAGE_SIZE;
    PG.page = page;
    PG.err = '';

    const ck = src.key + '#' + page;
    let res = opts.force ? null : pageCache.get(ck);
    if (res && Date.now() - res.t > PG_TTL) res = null;

    if (!res) {
        PG.loading = true;
        if (rel) rel.loading = true;
        cancelQueued();
        updateChrome();
        showSkeleton();
        try { res = await pgFetch(src, page); }
        catch (e) { res = { error: (e && e.message) || 'errore di rete' }; }
        if (my !== pgToken) return;
        PG.loading = false;
        if (rel) rel.loading = false;
        if (res.error || res.flood) {
            PG.err = res.error || 'flood';
            renderPager();
            const txt = res.flood
                ? '⏳ Il forum limita la frequenza delle richieste: attendi qualche secondo e riprova.'
                : `⚠️ Impossibile caricare la pagina (${esc(res.error)}).`;
            showListMessage(`${txt}<br><br><button class="seer-load-btn" data-pg-retry="1">🔄 Riprova</button>`, res.flood ? 'warn' : 'err');
            return;
        }
        pageCache.set(ck, res);
        if (pageCache.size > 80) pageCache.delete(pageCache.keys().next().value);
    }
    if (my !== pgToken) return;

    PG.loading = false;
    PG.total = res.total || 1;
    PG.per = res.per || PG.per;
    perByKey.set(src.key, PG.per);
    PG.page = Math.min(res.current > 0 ? res.current : page, PG.total);
    PG.items = res.items;
    if (rel && view.key === 'releaser' && !search.active) {
        if (rel.sq) { rel.sq.items = res.items; rel.sq.loading = false; rel.sq.exhausted = true; }
        else rel.items = res.items;
        rel.total = res.results || 0;
        rel.exhausted = true;
        rel.loading = false;
    }
    if (!search.active) PG.lastViewPage = PG.page;

    renderDeck(localFilterValue(), true);
    $('mirseer-app').scrollTop = 0;

    if (pgOpenAfterLoad) {
        const pick = pgOpenAfterLoad === 'first' ? lastDisplayed[0] : lastDisplayed[lastDisplayed.length - 1];
        pgOpenAfterLoad = '';
        if (pick) { kbId = String(pick.id); kbApply(true); openDetailModal(pick); }
    }
}

function goPage(n) {
    if (!isPagedView() || PG.loading) return;
    n = Math.max(1, Math.min(PG.total || 1, parseInt(n, 10) || 1));
    if (n === PG.page && !PG.err) return;
    loadPage(n);
}

function pgOnSortChange() {
    if (!isPagedView()) return;
    const src = pgSource();
    if (src && (src.kind === 'forum' || src.kind === 'home') && src.key !== PG.key) loadPage(1);
}

function pgWindow(cur, total) {
    const span = IS_COARSE ? 1 : 2;
    const set = new Set();
    const add = n => { if (n >= 1 && n <= total) set.add(n); };
    add(1); if (!IS_COARSE) add(2);
    for (let i = cur - span; i <= cur + span; i++) add(i);
    if (!IS_COARSE) add(total - 1);
    add(total);
    const nums = [...set].sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, i) => {
        if (i) {
            const gap = n - nums[i - 1];
            if (gap === 2) out.push(nums[i - 1] + 1);
            else if (gap > 2) out.push('…');
        }
        out.push(n);
    });
    return out;
}

function renderPager() {
    const boxes = [$('seer-pager-top'), $('seer-pager')];
    let html = '';
    if (isPagedView() && PG.total > 1) {
        const c = PG.page, t = PG.total, busy = PG.loading;
        const nums = pgWindow(c, t).map(n => n === '…'
            ? '<span class="seer-pg-dots">…</span>'
            : `<button class="seer-pg-btn ${n === c ? 'active' : ''}" data-pg="${n}"${busy ? ' disabled' : ''}>${n}</button>`).join('');
        const nav = (v, label, off, title) => `<button class="seer-pg-btn" data-pg="${v}" title="${title}"${(off || busy) ? ' disabled' : ''}>${label}</button>`;
        html = nav('first', '«', c <= 1, 'Prima pagina') + nav('prev', '‹', c <= 1, 'Pagina precedente  ( , )') +
            nums +
            nav('next', '›', c >= t, 'Pagina successiva  ( . )') + nav('last', '»', c >= t, 'Ultima pagina') +
            `<span class="seer-pg-info">Pagina ${c} di ${t}</span>` +
            `<input type="number" class="seer-adv-input seer-pg-jump" min="1" max="${t}" placeholder="Vai a…">` +
            `<button class="seer-pg-btn" data-pg="go"${busy ? ' disabled' : ''}>Vai</button>`;
    }
    boxes.forEach(b => { if (b) b.innerHTML = html; });
}

function setupPaging() {
    const onClick = e => {
        const b = e.target.closest('[data-pg]');
        if (!b || b.disabled) return;
        const v = b.dataset.pg;
        if (v === 'first') goPage(1);
        else if (v === 'prev') goPage(PG.page - 1);
        else if (v === 'next') goPage(PG.page + 1);
        else if (v === 'last') goPage(PG.total);
        else if (v === 'go') {
            const inp = b.parentElement.querySelector('.seer-pg-jump');
            if (inp && inp.value) goPage(inp.value);
        } else goPage(v);
    };
    ['seer-pager-top', 'seer-pager'].forEach(id => {
        const box = $(id);
        if (!box) return;
        box.addEventListener('click', onClick);
        box.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('seer-pg-jump') && e.target.value) goPage(e.target.value);
        });
    });
    const list = $('seer-main-list');
    if (list) list.addEventListener('click', e => { if (e.target.closest('[data-pg-retry]')) loadPage(PG.page, { force: true }); });

    document.addEventListener('keydown', e => {
        const app = $('mirseer-app');
        if (!app || app.style.display !== 'block' || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test((t && t.tagName) || '') || (t && t.isContentEditable)) return;
        if (['seer-modal-overlay', 'seer-settings-overlay', 'seer-trailer-overlay'].some(id => $(id) && $(id).style.display === 'flex')) return;
        if (e.key === ',') goPage(PG.page - 1);
        else if (e.key === '.') goPage(PG.page + 1);
    });
}

GM_addStyle(`
.seer-pager { display: flex; justify-content: center; align-items: center; gap: 6px; flex-wrap: wrap; margin: 6px 0 16px; }
.seer-pager:empty { display: none; }
#seer-pager { margin: 22px 0 30px; }
.seer-pg-btn {
    min-width: 38px; height: 36px; padding: 0 11px; border-radius: 9px; font-family: inherit; font-size: 13px; font-weight: 800;
    background: rgba(255,255,255,0.05); border: 1px solid var(--seer-border); color: #cbd5e1; cursor: pointer; transition: all 0.2s;
}
.seer-pg-btn:hover:not(:disabled) { border-color: var(--seer-accent); color: #fff; }
.seer-pg-btn.active { background: var(--seer-accent); border-color: var(--seer-accent); color: #fff; box-shadow: 0 4px 12px var(--seer-accent-glow); }
.seer-pg-btn:disabled { opacity: 0.4; cursor: default; }
.seer-pg-dots { color: var(--seer-text-muted); padding: 0 3px; font-weight: 800; }
.seer-pg-info { font-size: 12.5px; font-weight: 700; color: var(--seer-text-muted); margin: 0 6px; white-space: nowrap; }
.seer-pg-jump { width: 92px; height: 36px; }
#mirseer-app.seer-light .seer-pg-btn { background: rgba(15,23,42,.05); color: #334155; }
#mirseer-app.seer-light .seer-pg-btn:hover:not(:disabled) { color: #0f172a; }
#mirseer-app.seer-light .seer-pg-btn.active { color: #fff; }
@media (max-width: 560px) { .seer-pg-info { width: 100%; text-align: center; order: -1; } }
`);

GM_addStyle(`
.seer-row { content-visibility: auto; contain-intrinsic-size: auto 90px; }
.seer-row.is-card { contain-intrinsic-size: auto 340px; }
#mirseer-app.seer-compact .seer-row { contain-intrinsic-size: auto 62px; }
#mirseer-app.seer-compact .seer-row.is-card { contain-intrinsic-size: auto 280px; }
`);

GM_addStyle(`
.seer-rel-search { display: none; margin: -8px 0 16px; }
.seer-rel-search.show { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.seer-rel-search .seer-search-wrap { flex: 1 1 320px; max-width: 560px; }
.seer-rel-search-hint { font-size: 12.5px; font-weight: 600; color: var(--seer-text-muted); }
`);

GM_addStyle(`
.seer-adv select.seer-adv-input { width: auto; cursor: pointer; }
.seer-adv select.seer-adv-input option { background: #0e1424; color: #f8fafc; }
#mirseer-app.seer-light .seer-adv select.seer-adv-input option { background: #fff; color: #0f172a; }
.seer-facet small { opacity: 0.7; margin-left: 4px; font-weight: 800; }
.seer-meta-pill { border: 1px solid var(--seer-border); }
`);

GM_addStyle(`
html.seer-lock, body.seer-lock { overflow: hidden !important; }
#mirseer-app, .seer-modal-scroll, .seer-settings-window, .seer-sidebar,
.seer-magnet-list, .seer-text-box, .seer-mediainfo pre { overscroll-behavior: contain; }

#mirseer-fab { bottom: calc(24px + env(safe-area-inset-bottom, 0px)) !important; right: calc(24px + env(safe-area-inset-right, 0px)) !important; }
#seer-toasts { bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
#seer-batch-bar { bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
body:has(#seer-batch-bar.show) #seer-toasts { bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
.seer-modal-foot { padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px)); }

#seer-side-backdrop { display: none; position: fixed; left: 0; right: 0; bottom: 0; top: var(--seer-nav-h); background: rgba(0,0,0,.55); z-index: 190; }

@supports (height: 100dvh) {
    .seer-sidebar { max-height: calc(100dvh - var(--seer-nav-h)); }
    .seer-detail-window.is-portrait, .seer-detail-window:not(.is-landscape) { max-height: 92dvh; }
    .seer-detail-window.is-landscape { max-height: 92dvh; }
    .seer-settings-window { max-height: 85dvh; }
}

@media (max-width: 980px) {
    #seer-side-backdrop.show { display: block; }
    .seer-sidebar { max-height: none; padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)); }
    #seer-hero { height: 360px; }
    .seer-hero-body { padding: 24px 20px 40px; }
    .seer-hero-title { font-size: 24px; }
    .seer-hero-desc { -webkit-line-clamp: 3; font-size: 14px; }
}

@media (max-width: 760px) {
    :root { --seer-nav-h: calc(104px + env(safe-area-inset-top, 0px)); }
    .seer-nav { flex-wrap: wrap; align-content: center; gap: 8px; padding: env(safe-area-inset-top, 0px) 12px 0; }
    .seer-nav > div:first-child { flex: 1 1 auto; order: 0; }
    .seer-nav > div:nth-child(2) { display: contents !important; }
    .seer-brand > span { display: none; }
    .seer-user { order: 1; }
    #seer-settings-btn { order: 2; }
    #seer-theme-btn { order: 3; }
    #seer-exit { order: 4; }
    .seer-nav .seer-search-wrap { order: 10; flex: 1 1 100%; max-width: none; }
}

@media (max-width: 820px) {
    #seer-modal-overlay { padding: 0; }
    .seer-detail-window, .seer-detail-window.is-landscape, .seer-detail-window.is-portrait {
        max-width: none !important; width: 100% !important; height: 100vh !important; max-height: 100vh !important;
        border-radius: 0 !important; border: none !important;
    }
    .seer-detail-window .seer-modal-left { height: 120px !important; }
    .seer-detail-window .seer-modal-close { top: calc(12px + env(safe-area-inset-top, 0px)); }
    .seer-modal-tools { gap: 6px; }
    .seer-magnet-box.show { grid-template-columns: 1fr; }
    .seer-magnet-box .seer-magnet-list { max-height: 96px; }
    .seer-ext-menu { left: 0; right: auto; max-width: calc(100vw - 32px); }

    #seer-settings-overlay { padding: 0; }
    .seer-settings-window { max-width: none; height: 100vh; max-height: 100vh; border-radius: 0; }
    .seer-settings-select { width: 100%; min-width: 0; }

    .seer-facets, .seer-rl-head {
        flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
        margin-left: -14px; margin-right: -14px; padding: 0 14px 4px;
    }
    .seer-facets::-webkit-scrollbar, .seer-rl-head::-webkit-scrollbar { display: none; }
    .seer-facets > *, .seer-rl-head > * { flex-shrink: 0; white-space: nowrap; }

    .seer-adv.open { flex-direction: column; align-items: stretch; gap: 12px; }
    .seer-adv-item { width: 100%; justify-content: space-between; }
    .seer-adv input[type=range] { flex: 1; width: auto; min-width: 0; }
    .seer-adv-input, .seer-adv-input.wide, .seer-adv select.seer-adv-input { flex: 1; width: auto; min-width: 0; }

    #seer-batch-bar {
        left: 8px; right: 8px; transform: none; max-width: none; flex-wrap: nowrap; overflow-x: auto;
        justify-content: flex-start; scrollbar-width: none;
    }
    #seer-batch-bar::-webkit-scrollbar { display: none; }
    #seer-batch-bar > * { flex-shrink: 0; white-space: nowrap; }
}

@media (max-width: 560px) {
    .seer-row:not(.is-card) { padding: 8px 10px; gap: 10px; }
    .seer-row:not(.is-card) .seer-right-meta { display: none; }
    .seer-row:not(.is-card) .seer-title {
        white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .seer-list.seer-grid { grid-template-columns: repeat(auto-fill, minmax(min(150px, 44vw), 1fr)); }
}

@media (pointer: coarse) {
    #mirseer-app * { -webkit-tap-highlight-color: transparent; }
    #mirseer-app button, #mirseer-app a, #mirseer-app .seer-row, #mirseer-app select { touch-action: manipulation; }
    #mirseer-app input, #mirseer-app select, #mirseer-app textarea { font-size: 16px !important; }
    .seer-facet, .seer-tool-btn, .seer-ver-tab, .seer-magnet-copy, .seer-meta-pill, .seer-load-btn, .seer-exit-btn { min-height: 40px; }
    .seer-fav-btn, .seer-modal-close, .seer-menu-btn, .seer-theme-btn, .seer-user-btn { width: 40px; height: 40px; }
    .seer-side-item { min-height: 44px; }
    .seer-row { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }

    .seer-nav, #seer-modal-overlay, #seer-settings-overlay, .seer-hero-arrow, .seer-modal-close,
    .seer-modal-nav, .seer-is-card .seer-fav-btn, .is-card .seer-fav-btn {
        backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
    }
    #mirseer-app:not(.seer-light) .seer-hero-bg.blur { filter: blur(12px) brightness(0.55) saturate(1.2); transform: scale(1.15); }
    #mirseer-app.seer-light .seer-hero-bg.blur { filter: blur(12px) brightness(1.08) saturate(1.1); transform: scale(1.15); }
}

@media (hover: none) {
    #mirseer-app .seer-row:hover, #mirseer-app .seer-row.is-card:hover { transform: none; box-shadow: none; }
    #mirseer-app .seer-rl-card:hover, #mirseer-app .seer-fav-btn:hover, #mirseer-app .seer-modal-close:hover { transform: none; }
    #mirseer-app .seer-action-btn:hover, #mirseer-app .seer-hero-btn.primary:hover { transform: none; }
    #mirseer-fab:hover { transform: none; }
}
`);

function mobileEnhance() {
    const app = $('mirseer-app');
    if (!app) return;

    try {
        const mv = document.querySelector('meta[name="viewport"]');
        if (mv && !/viewport-fit/i.test(mv.content)) mv.content += ', viewport-fit=cover';
    } catch (e) {}

    const lockPage = () => {
        const open = app.style.display === 'block';
        document.documentElement.classList.toggle('seer-lock', open);
        document.body.classList.toggle('seer-lock', open);
    };
    new MutationObserver(lockPage).observe(app, { attributes: true, attributeFilter: ['style'] });
    lockPage();

    const sb = $('seer-sidebar');
    const bd = document.createElement('div');
    bd.id = 'seer-side-backdrop';
    app.appendChild(bd);
    bd.onclick = () => sb.classList.remove('open');
    new MutationObserver(() => bd.classList.toggle('show', sb.classList.contains('open')))
        .observe(sb, { attributes: true, attributeFilter: ['class'] });

    const mobile = IS_COARSE || window.matchMedia('(max-width: 980px)').matches;
    if (!mobile) return;

    const layers = [
        { el: $('seer-trailer-overlay'), isOpen: () => $('seer-trailer-overlay').style.display === 'flex', close: () => closeTrailer(), attr: 'style' },
        { el: $('seer-settings-overlay'), isOpen: () => $('seer-settings-overlay').style.display === 'flex', close: () => $('seer-settings-close').click(), attr: 'style' },
        { el: $('seer-modal-overlay'), isOpen: () => $('seer-modal-overlay').style.display === 'flex', close: () => hideModal(), attr: 'style' },
        { el: sb, isOpen: () => sb.classList.contains('open'), close: () => sb.classList.remove('open'), attr: 'class' }
    ];
    let ignorePop = 0;
    layers.forEach(L => {
        L.was = L.isOpen();
        L.pushed = false;
        new MutationObserver(() => {
            const now = L.isOpen();
            if (now === L.was) return;
            L.was = now;
            if (now) {
                try { history.pushState({ seerLayer: 1 }, '', location.href); L.pushed = true; } catch (e) {}
            } else if (L.pushed) {
                L.pushed = false;
                ignorePop++;
                try { history.back(); } catch (e) { ignorePop--; }
            }
        }).observe(L.el, { attributes: true, attributeFilter: [L.attr] });
    });
    window.addEventListener('popstate', () => {
        if (ignorePop > 0) { ignorePop--; return; }
        const top = layers.find(L => L.isOpen());
        if (top) { top.pushed = false; top.close(); }
    });

    const list = $('seer-main-list');
    let lpT = null, lpX = 0, lpY = 0, lpFired = 0;
    list.addEventListener('touchstart', e => {
        const row = e.target.closest('.seer-row');
        if (!row || e.target.closest('.seer-fav-btn') || e.touches.length !== 1) return;
        const t = e.touches[0];
        lpX = t.clientX; lpY = t.clientY;
        clearTimeout(lpT);
        lpT = setTimeout(() => {
            const it = registry.get(String(row.dataset.topicId));
            if (!it) return;
            lpFired = Date.now();
            try { if (navigator.vibrate) navigator.vibrate(25); } catch (e) {}
            if (!selMode) setSelMode(true);
            toggleSel(it);
        }, 520);
    }, { passive: true });
    const lpCancel = () => clearTimeout(lpT);
    list.addEventListener('touchmove', e => {
        const t = e.touches[0];
        if (Math.abs(t.clientX - lpX) > 10 || Math.abs(t.clientY - lpY) > 10) lpCancel();
    }, { passive: true });
    list.addEventListener('touchend', lpCancel, { passive: true });
    list.addEventListener('touchcancel', lpCancel, { passive: true });
    list.addEventListener('click', e => {
        if (Date.now() - lpFired < 700) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    list.addEventListener('contextmenu', e => { if (e.target.closest('.seer-row')) e.preventDefault(); });

    const hero = $('seer-hero');
    let hx = 0, hy = 0;
    hero.addEventListener('touchstart', e => { const t = e.changedTouches[0]; hx = t.clientX; hy = t.clientY; }, { passive: true });
    hero.addEventListener('touchend', e => {
        const t = e.changedTouches[0], dx = t.clientX - hx, dy = t.clientY - hy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && heroSlides.length > 1) {
            goHero(heroIdx + (dx < 0 ? 1 : -1));
            startHero();
        }
    }, { passive: true });

    new MutationObserver(() => {
        if ($('seer-modal-overlay').style.display !== 'flex') return;
        if (getPref('swipeHint', false)) return;
        setPref('swipeHint', true);
        toast('👆 Scorri a sinistra/destra per cambiare release', '', 3600);
    }).observe($('seer-modal-overlay'), { attributes: true, attributeFilter: ['style'] });
}

GM_addStyle(`
.seer-proj-head { display: none; margin: 0 0 18px; }
.seer-proj-banner { position: relative; border-radius: 16px; overflow: hidden; min-height: 220px; display: flex; align-items: flex-end; border: 1px solid var(--seer-border); background: linear-gradient(135deg, #1e1b4b, #312e81); }
.seer-proj-banner .seer-hero-bg { z-index: 0; }
.seer-proj-banner .seer-hero-shade { z-index: 1; }
.seer-proj-body { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 12px; padding: 22px 28px; width: 100%; }
.seer-proj-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.seer-proj-title { font-size: 30px; line-height: 1.12; letter-spacing: -.5px; margin: 0; font-weight: 900; color: #fff; }
.seer-proj-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.seer-proj-desc { margin: 14px 2px 0; font-size: 14px; line-height: 1.6; color: var(--seer-text-muted); }
.seer-proj-notes, .seer-proj-forums { margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
@media (max-width: 720px) { .seer-proj-title { font-size: 22px; } .seer-proj-body { padding: 16px; } }
`);

let proj = null;
const isProjectItem = it => !!it && it.type === PROJECT_SECTION;
const projTitleOk = s => !!s && s.length >= 5 && !/viewtopic\.php|https?:\/\/|www\./i.test(s)
    && !/^(?:qui|link|clicca qui|click here|download|vai|apri|scarica|leggi|here|topic|thread)$/i.test(s);

function projLinkText(a) {
    let t = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (!projTitleOk(t)) { const im = a.querySelector('img'); t = im ? String(im.getAttribute('alt') || im.getAttribute('title') || '').trim() : ''; }
    if (!projTitleOk(t)) t = String(a.getAttribute('title') || '').trim();
    return projTitleOk(t) ? t : '';
}



function projMakeItem(e, idx) {
    let it = registry.get(e.key);
    if (!it) {
        const ok = !!e.text;
        const raw = ok ? e.text : 'Topic #' + e.key.replace(/^p/, '');
        const meta = pure.parseReleaseInfo(raw);
        it = buildItem({ topicId: e.key, href: e.url, raw, type: meta.isTvSeries ? 'Serie TV' : 'Film', meta });
        it._needsTitle = !ok;
        it._fromProject = true;
        registry.set(e.key, it);
        hydrateSync(it);
    }
    it._pOrder = idx;
    it._pGroup = e.group || '';
    return it;
}

function projTypeFromCrumbs(item, doc) {
    if (!item._fromProject || item._typeFixed) return;
    const ids = [...doc.querySelectorAll('.breadcrumbs a[href*="viewforum.php"], #nav-breadcrumbs a[href*="viewforum.php"], ul.linklist a[href*="viewforum.php"]')]
        .map(a => ((a.getAttribute('href') || '').match(/[?&]f=(\d+)/) || [])[1]).filter(Boolean).reverse();
    for (const id of ids) {
        const name = forumToSection.get(id);
        if (name) { item.type = name; item.forumId = id; item._typeFixed = true; return; }
    }
}

function projProbe(src, ms = 6000) {
    return new Promise(res => {
        const im = new Image();
        let done = false;
        const fin = v => { if (!done) { done = true; res(v); } };
        im.onload = () => fin({ src, w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => fin(null);
        setTimeout(() => fin(null), ms);
        im.src = src;
    });
}


function projRefresh(P) {
    if (view.key !== 'project' || proj !== P) return;
    renderProjHead();
    renderDeck(localFilterValue(), true);
}

async function projResolveOne(P, it, run) {
    try {
        await netGate();
        const { doc } = await fetchTopicPage(it.url);
        if (P.run !== run) return;
        const a = doc.querySelector('h2.topic-title a, .topic-title a, h2 a[href*="viewtopic.php"]');
        const post = doc.querySelector('.post .content, .postbody .content, div.content');
        let title = a ? a.textContent.replace(/\s+/g, ' ').trim() : '';
        if (!title) title = String(doc.title || '').replace(/\s+[-\u2013|]\s+[^-\u2013|]*$/, '').trim();
        const msg = ((doc.querySelector('#message') || {}).textContent || '');
        if (!post || !title || /non\s+(?:sei|hai|puoi)|autorizzat|permess|accedi|login/i.test(msg)) throw new Error('inaccessibile');
        const tid = a ? ((a.getAttribute('href') || '').match(/[?&]t=(\d+)/) || [])[1] : null;
        if (String(it.id)[0] === 'p') {
            if (!tid) throw new Error('topic non risolvibile');
            const exist = registry.get(tid);
            registry.delete(String(it.id));
            if (exist && exist !== it) {
                const pos = P.items.indexOf(it);
                if (P.items.includes(exist)) P.items.splice(pos, 1); else P.items[pos] = exist;
                exist._pOrder = it._pOrder;
                P.dup++;
                return;
            }
            it.id = tid; it.numericId = parseInt(tid, 10) || 0; it.url = SITE_ROOT + 'viewtopic.php?t=' + tid;
            registry.set(tid, it);
        }
        if (it._needsTitle) {
            const meta = pure.parseReleaseInfo(title);
            it.rawTitle = title; it.cleanTitle = meta.cleanTitle; it.year = meta.year; it.meta = meta; it._hay = null;
            it.displayTitle = (typeof composeDisplayTitle === 'function') ? composeDisplayTitle(it) : meta.displayTitle;
            if (!it._typeFixed) it.type = meta.isTvSeries ? 'Serie TV' : 'Film';
            it._needsTitle = false;
        }
        projTypeFromCrumbs(it, doc);
    } catch (e) {
        if (P.run !== run) return;
        it.unavailable = true;
        it.displayTitle = 'Contenuto non accessibile (topic #' + String(it.id).replace(/^p/, '') + ')';
        it.synopsis = 'Questo contenuto non \u00e8 accessibile o non esiste pi\u00f9 (' + ((e && e.message) || 'errore') + '). Puoi provare ad aprire il link originale dal forum.';
        it.kind = 'text'; it.posterTried = true;
    }
}

async function projResolveMeta(P, run) {
    const need = P.items.filter(it => it._needsTitle || String(it.id)[0] === 'p');
    let i = 0;
    const worker = async () => {
        while (i < need.length) {
            if (P.run !== run) return;
            const it = need[i++];
            await projResolveOne(P, it, run);
            if (P.run === run && i % 4 === 0) projRefresh(P);
        }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (P.run === run) projRefresh(P);
}



function closeProject() {
    const p = proj && proj.prev;
    const restore = () => {
        if (!p || !p.scroll) return;
        const app = $('mirseer-app');
        const go = () => { if (app) app.scrollTo({ top: p.scroll, behavior: 'instant' }); };
        requestAnimationFrame(go);
        setTimeout(go, 400);
    };
    const nav = r => { Promise.resolve(r).then(restore); };
    if (!p) { setView('home'); return; }
    if (p.project) { proj = p.project; nav(setView('project')); return; }
    if (p.key === 'section' && p.section) { PG.want = p.page || 1; nav(setView('section', p.section)); return; }
    if (['home', 'films', 'series'].includes(p.key)) { PG.want = p.page || 1; nav(setView(p.key)); return; }
    nav(setView(['favs', 'releasers'].includes(p.key) ? p.key : 'home'));
}




GM_addStyle(`
.seer-pj-cover { position: relative; border-radius: 18px; overflow: hidden; min-height: 200px; max-height: 420px; display: flex; align-items: flex-end; border: 1px solid var(--seer-border); background: linear-gradient(135deg, #1e1b4b, #312e81); }
.seer-pj-cover .bgblur { position: absolute; inset: -24px; width: calc(100% + 48px); height: calc(100% + 48px); object-fit: cover; filter: blur(26px) saturate(1.2); opacity: .55; }
.seer-pj-cover .banner { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.seer-pj-cover .banner.contain { object-fit: contain; }
.seer-pj-cover .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(7,9,14,.10) 0%, rgba(7,9,14,.30) 45%, rgba(7,9,14,.92) 100%); }
.seer-pj-cover .body { position: relative; z-index: 2; width: 100%; display: flex; flex-direction: column; gap: 10px; padding: 18px 26px; }
.seer-pj-cover h1 { margin: 0; font-size: 30px; line-height: 1.12; letter-spacing: -.5px; font-weight: 900; color: #fff; text-shadow: 0 2px 14px rgba(0,0,0,.6); }
.seer-pj-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 12px 0 0; }
.seer-pj-desc { margin: 12px 2px 0; font-size: 14px; line-height: 1.6; color: var(--seer-text-muted); }
.seer-pj-desc.clamp { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.seer-pj-row { margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
@media (max-width: 720px) { .seer-pj-cover h1 { font-size: 22px; } .seer-pj-cover .body { padding: 14px 16px; } }

.seer-ac-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; align-items: center; }
.seer-ac-card { background: var(--seer-card); border: 1px solid var(--seer-border); border-radius: 14px; padding: 18px 20px; min-width: 0; }
.seer-ac-card h3 { margin: 0 0 10px; font-size: 15px; font-weight: 800; }
.seer-ac-hero { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
.seer-ac-hero img, .seer-ac-av { width: 92px; height: 92px; border-radius: 50%; object-fit: cover; border: 2px solid var(--seer-border-hover); background: rgba(255,255,255,.05); display: flex; align-items: center; justify-content: center; font-size: 40px; }
.seer-ac-name { font-size: 24px; font-weight: 900; letter-spacing: -.3px; }
.seer-ac-sub { color: var(--seer-text-muted); font-size: 13px; margin-top: 3px; }
.seer-ac-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; margin-top: 14px; }
.seer-ac-row { display: flex; justify-content: space-between; gap: 14px; padding: 7px 0; border-bottom: 1px solid var(--seer-border); font-size: 13px; }
.seer-ac-row:last-child { border-bottom: 0; }
.seer-ac-row b { color: var(--seer-text-muted); font-weight: 600; flex-shrink: 0; }
.seer-ac-row span { text-align: right; word-break: break-word; min-width: 0; }
.seer-ac-split { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; align-items: start; }
.seer-ac-nav { display: flex; flex-direction: column; gap: 5px; position: sticky; top: calc(var(--seer-nav-h) + 12px); }
.seer-ac-nav .seer-facet { text-align: left; }
.seer-ac-navh { font-size: 11px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; color: var(--seer-text-muted); margin: 10px 2px 2px; }
.seer-ac-note { font-size: 12.5px; color: var(--seer-text-muted); line-height: 1.5; margin: 0 0 12px; }
.seer-ac-msg { display: inline-block; font-size: 13px; font-weight: 700; padding: 7px 12px; border-radius: 9px; background: rgba(255,255,255,.06); }
.seer-ac-msg.ok { background: rgba(16,185,129,.18); color: #34d399; }
.seer-ac-msg.warn { background: rgba(245,158,11,.18); color: #fbbf24; }
.seer-ac-msg.err { background: rgba(244,63,94,.18); color: #fb7185; }
.seer-ac-list { display: flex; flex-direction: column; gap: 6px; }
.seer-ac-list button { text-align: left; background: rgba(255,255,255,.04); border: 1px solid var(--seer-border); color: var(--seer-text); padding: 9px 12px; border-radius: 9px; cursor: pointer; font-size: 13px; }
.seer-ac-list button:hover { border-color: var(--seer-border-hover); background: rgba(99,102,241,.12); }
.seer-uf dl { display: grid; grid-template-columns: minmax(150px, 34%) minmax(0, 1fr); gap: 6px 16px; margin: 0; padding: 11px 0; border-bottom: 1px solid var(--seer-border); }
.seer-uf dt, .seer-uf dd { margin: 0; font-size: 13px; }
.seer-uf dt label { font-weight: 700; }
.seer-uf dt span { display: block; font-size: 11.5px; color: var(--seer-text-muted); font-weight: 400; margin-top: 2px; }
.seer-uf fieldset { border: 0; padding: 0; margin: 0 0 8px; }
.seer-uf legend { font-weight: 800; font-size: 14px; padding: 0; margin: 8px 0 2px; }
.seer-uf h3 { font-size: 14px; margin: 10px 0 2px; }
.seer-uf input[type=text], .seer-uf input[type=number], .seer-uf input[type=email], .seer-uf input[type=url], .seer-uf input[type=date], .seer-uf input[type=tel], .seer-uf input:not([type]), .seer-uf select, .seer-uf textarea { width: 100%; max-width: 520px; background: rgba(255,255,255,.05); color: var(--seer-text); border: 1px solid var(--seer-border); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13px; }
.seer-uf textarea { min-height: 120px; resize: vertical; }
.seer-uf select option, .seer-uf select optgroup { color: #0f172a; }
.seer-uf label { cursor: pointer; }
.seer-uf input[type=radio], .seer-uf input[type=checkbox] { margin-right: 5px; accent-color: var(--seer-accent); }
.seer-uf input:disabled, .seer-uf select:disabled, .seer-uf textarea:disabled { opacity: .6; cursor: not-allowed; }
.seer-uf .error, .seer-uf p.error { color: #fb7185; }
.seer-uf-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
@media (max-width: 820px) { .seer-ac-split { grid-template-columns: 1fr; } .seer-ac-nav { position: static; flex-direction: row; flex-wrap: wrap; } .seer-uf dl { grid-template-columns: 1fr; } }

.seer-st-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 14px; }
.seer-st-num { font-size: 28px; font-weight: 900; letter-spacing: -.5px; background: linear-gradient(135deg, #818cf8, #c084fc, #f472b6); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.seer-st-lbl { font-size: 12.5px; color: var(--seer-text-muted); margin-top: 2px; }
.seer-st-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 14px; margin-bottom: 14px; }
.seer-pie-wrap { display: flex; gap: 22px; align-items: center; flex-wrap: wrap; }
.seer-pie { position: relative; width: 180px; height: 180px; border-radius: 50%; flex-shrink: 0; }
.seer-pie::after { content: ''; position: absolute; inset: 27%; border-radius: 50%; background: var(--seer-card); }
.seer-pie-c { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-weight: 900; font-size: 22px; line-height: 1.1; }
.seer-pie-c small { font-size: 11px; font-weight: 600; color: var(--seer-text-muted); max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seer-leg { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 190px; }
.seer-leg button, .seer-leg div { display: flex; align-items: center; gap: 8px; font-size: 13px; background: none; border: 0; color: var(--seer-text); padding: 2px 0; text-align: left; }
.seer-leg button { cursor: pointer; }
.seer-leg button:hover b { text-decoration: underline; }
.seer-leg i { width: 11px; height: 11px; border-radius: 3px; flex-shrink: 0; }
.seer-leg b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.seer-leg em { font-style: normal; color: var(--seer-text-muted); font-size: 12px; white-space: nowrap; }
.seer-bar { height: 9px; border-radius: 6px; background: rgba(127,127,127,.2); overflow: hidden; }
.seer-bar > i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #6366f1, #a855f7); }
.seer-qrow { display: grid; grid-template-columns: 62px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 6px 0; font-size: 13px; }
.seer-qrow em { font-style: normal; color: var(--seer-text-muted); font-size: 12px; white-space: nowrap; }
.seer-months { display: flex; gap: 10px; align-items: flex-end; height: 130px; margin-top: 8px; }
.seer-months > div { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 4px; font-size: 11px; color: var(--seer-text-muted); }
.seer-months > div > i { display: block; width: 100%; max-width: 46px; border-radius: 6px 6px 2px 2px; background: linear-gradient(180deg, #a855f7, #6366f1); min-height: 3px; }
`);

const PJ_BLOCK = /^(DIV|P|LI|UL|OL|TR|TABLE|TBODY|THEAD|H[1-6]|DL|DT|DD|BLOCKQUOTE|PRE|HR|CENTER|FIELDSET|SECTION|ARTICLE)$/;
const PJ_GENERIC = /^(?:qui|link|clicca qui|click here|download|vai|apri|scarica|leggi|here|topic|thread|vai al topic|vai alla scheda|scheda|clicca|guarda|url|collegamento|streaming|link topic|topic originale)$/i;

function pjCleanTitle(s) {
    s = String(s || '').replace(/\u00a0/g, ' ').replace(/https?:\/\/\S+/gi, ' ')
        .replace(/\[\s*(?:link|qui|download|topic|url)\s*\]/gi, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/^[\s\u2022\u00b7\u25aa\u25a0\u25ba\u25b6\u00bb>*\u2013\u2014\-|:]+/, '').replace(/^\(?\d{1,3}[.)\]]\s+/, '');
    s = s.replace(/(?:\s*[-\u2013\u2014:|]+\s*)?(?:link|qui|clicca\s+qui|click\s+here|download|scarica|vai\s+al\s+topic|apri|topic|thread)\s*:?\s*$/i, '');
    s = s.replace(/[\s\-\u2013\u2014:|\u2022\u00b7\u00bb>\u25ba\u25b6\u279c\u27a4\u2192]+$/, '').trim();
    return s.slice(0, 220);
}
const pjGood = s => !!s && s.length >= 2 && /[A-Za-z0-9\u00c0-\u024f]/.test(s) && !PJ_GENERIC.test(s);

function pjTokens(root, skipQuotes) {
    const toks = [];
    const walk = (n, bold) => {
        if (n.nodeType === 3) { const t = n.nodeValue.replace(/\s+/g, ' '); if (t) toks.push({ k: 't', s: t, b: bold }); return; }
        if (n.nodeType !== 1) return;
        const tag = n.tagName;
        if (tag === 'BR') { toks.push({ k: 'n' }); return; }
        if (/^(SCRIPT|STYLE|NOSCRIPT|IMG)$/.test(tag)) return;
        if (n.matches && n.matches('.signature, .sig, .smilies')) return;
        if (skipQuotes && tag === 'BLOCKQUOTE') return;
        if (tag === 'A') { toks.push({ k: 'a', el: n, s: (n.textContent || '').replace(/\s+/g, ' ').trim() }); return; }
        const st = (n.getAttribute && n.getAttribute('style')) || '';
        const b = bold || /^(B|STRONG|H[1-6]|TH)$/.test(tag) || /font-weight\s*:\s*(bold|[6-9]00)/i.test(st) || /font-size\s*:\s*(1[3-9]\d|[2-9]\d\d)%/i.test(st);
        const blk = PJ_BLOCK.test(tag);
        if (blk) toks.push({ k: 'n' });
        if (tag === 'TD' || tag === 'TH') toks.push({ k: 't', s: ' | ', b: false });
        for (const c of n.childNodes) walk(c, b);
        if (blk) toks.push({ k: 'n' });
    };
    walk(root, false);
    return toks;
}

function pjLines(toks) {
    const raw = []; let cur = [];
    for (const t of toks) { if (t.k === 'n') { if (cur.length) raw.push(cur); cur = []; } else cur.push(t); }
    if (cur.length) raw.push(cur);
    return raw.map(l => {
        const txt = l.filter(t => t.k === 't');
        const real = txt.filter(t => t.s.trim());
        return { toks: l, text: txt.map(t => t.s).join(' ').replace(/\s+/g, ' ').trim(), bold: real.length > 0 && real.every(t => t.b), links: l.filter(t => t.k === 'a') };
    });
}

function pjTopicRef(a) {
    const href = a.getAttribute('href') || '';
    if (!/viewtopic\.php|viewforum\.php/i.test(href)) return null;
    let u;
    try { u = new URL(fixUrl(new URL(href, SITE_ROOT).href)); } catch (e) { return { bad: true }; }
    if (u.hostname.replace(/^www\./, '') !== location.hostname.replace(/^www\./, '')) return null;
    if (/viewforum\.php/i.test(u.pathname)) { const f = u.searchParams.get('f'); return /^\d+$/.test(f || '') ? { forum: f } : { bad: true }; }
    const t = u.searchParams.get('t'), p = u.searchParams.get('p');
    if (/^\d+$/.test(t || '')) return { key: t, url: SITE_ROOT + 'viewtopic.php?t=' + t };
    if (/^\d+$/.test(p || '')) return { key: 'p' + p, url: u.href };
    return { bad: true };
}


function pjParse(posts, selfId) {
    const out = { entries: [], forums: [], ext: [], dup: 0, bad: 0, info: '', hasMagnet: false };
    const byKey = new Map(), seenF = new Set(), seenE = new Set(), info = [];
    let group = '';
    posts.forEach((post, pi) => {
        const lines = pjLines(pjTokens(post.el, pi > 0));
        let pending = null;
        lines.forEach(ln => {
            const refs = ln.links.map(a => ({ a, ref: pjTopicRef(a.el) }));
            refs.forEach(r => {
                const h = r.a.el.getAttribute('href') || '';
                if (!r.ref) {
                    if (/^magnet:/i.test(h)) { out.hasMagnet = true; return; }
                    if (/^https?:\/\//i.test(h) && !/\.(?:jpe?g|png|gif|webp)(?:\?|$)/i.test(h) && !BAD_LINK_RE.test(h) && out.ext.length < 24 && !seenE.has(h)) {
                        let host = ''; try { host = new URL(h).hostname.replace(/^www\./, ''); } catch (e) {}
                        if (host && host !== location.hostname.replace(/^www\./, '')) { seenE.add(h); out.ext.push({ url: h, text: (pjGood(pjCleanTitle(r.a.s)) ? pjCleanTitle(r.a.s) : '') || host }); }
                    }
                    return;
                }
                if (r.ref.bad) { out.bad++; return; }
                if (r.ref.forum && !seenF.has(r.ref.forum)) { seenF.add(r.ref.forum); out.forums.push({ id: r.ref.forum, name: pjGood(pjCleanTitle(r.a.s)) ? pjCleanTitle(r.a.s) : '' }); }
            });
            const topicLinks = refs.filter(r => r.ref && r.ref.key);
            if (!topicLinks.length) {
                if (!ln.links.length) {
                    const tx = pjCleanTitle(ln.text);
                    if (tx && tx.length <= 90) pending = { text: tx, bold: ln.bold, colon: /:\s*$/.test(ln.text), used: false };
                    if (pi === 0 && tx.length >= 25 && !/^(?:scheda|dati|risoluzione|formato|lingua|audio|video|codec|mediainfo|screenshot)/i.test(tx)) info.push(tx);
                } else pending = null;
                return;
            }
            const toks = ln.toks;
            const titled = topicLinks.map(r => {
                const at = toks.indexOf(r.a);
                let title = pjCleanTitle(r.a.s);
                if (!pjGood(title)) {
                    title = '';
                    const img = r.a.el.querySelector('img');
                    if (img) title = pjCleanTitle(img.getAttribute('alt') || img.getAttribute('title') || '');
                    if (!pjGood(title)) title = pjCleanTitle(r.a.el.getAttribute('title') || '');
                    if (!pjGood(title)) {
                        const pre = []; let j = at - 1;
                        while (j >= 0 && toks[j].k !== 'a') { if (toks[j].k === 't') pre.unshift(toks[j].s); j--; }
                        title = pjCleanTitle(pre.join(' '));
                    }
                    if (!pjGood(title)) {
                        const post2 = []; let k = at + 1;
                        while (k < toks.length && toks[k].k !== 'a') { if (toks[k].k === 't') post2.push(toks[k].s); k++; }
                        title = pjCleanTitle(post2.join(' '));
                    }
                }
                return { r, title: pjGood(title) ? title : '', fromPending: false };
            });
            titled.forEach(x => {
                if (!x.title && pending && !pending.used) { x.title = pending.text; pending.used = true; x.fromPending = true; }
            });
            const own = titled.some(x => x.title && !x.fromPending);
            if (pending && !pending.used && own && (pending.bold || pending.colon || (pending.text === pending.text.toUpperCase() && /[A-Z]/.test(pending.text)))) group = pending.text.replace(/[:\s]+$/, '');
            pending = null;
            titled.forEach(x => {
                const ref = x.r.ref;
                if (String(ref.key) === String(selfId)) return;
                const ex = byKey.get(ref.key);
                if (ex) { out.dup++; if (!ex.text && x.title) ex.text = x.title; return; }
                const e = { key: ref.key, url: ref.url, text: x.title, group };
                byKey.set(ref.key, e); out.entries.push(e);
            });
        });
    });
    out.info = info.slice(0, 6).join('\n').slice(0, 1200);
    return out;
}

async function projFetchDoc(url, ms = 25000) {
    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    const tm = ac ? setTimeout(() => ac.abort(), ms) : 0;
    try {
        const r = await fetch(url, ac ? { credentials: 'same-origin', signal: ac.signal } : { credentials: 'same-origin' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const html = await r.text();
        return { doc: new DOMParser().parseFromString(html, 'text/html'), html };
    } finally { clearTimeout(tm); }
}

function pjPostsOf(doc) {
    let list = [...doc.querySelectorAll('div.post, article.post')];
    list = list.filter(p => !list.some(o => o !== p && o.contains(p)));
    if (!list.length) list = [...doc.querySelectorAll('.postbody')];
    return list.map(p => {
        const el = p.querySelector('.postbody .content, .content') || (p.classList.contains('postbody') ? p.querySelector('.content') : null);
        const au = p.querySelector('.username, .username-coloured');
        return el ? { el, author: au ? au.textContent.trim() : '' } : null;
    }).filter(Boolean);
}

function pjPageStarts(doc) {
    const set = new Set();
    doc.querySelectorAll('.pagination a[href*="start="]').forEach(a => { const m = (a.getAttribute('href') || '').match(/[?&]start=(\d+)/); if (m && +m[1] > 0) set.add(+m[1]); });
    const arr = [...set].sort((a, b) => a - b);
    if (!arr.length) return [];
    const per = arr[0], max = arr[arr.length - 1], out = [];
    for (let s = per; s <= max && out.length < 40; s += per) out.push(s);
    return out;
}

async function projPickBanner(root) {
    const srcs = [];
    [...root.querySelectorAll('img')].slice(0, 24).forEach(im => {
        const cls = (im.getAttribute('class') || '') + ' ' + (im.getAttribute('src') || '');
        if (/smilies|smiley|emoji/i.test(cls) || im.closest('.signature, .sig')) return;
        const raw = im.getAttribute('data-src') || im.getAttribute('data-lazy-src') || im.getAttribute('data-original') || im.getAttribute('src') || '';
        if (!raw || /^data:/i.test(raw) || HARD_JUNK_RE.test(raw)) return;
        const a = im.closest('a[href]'), ah = a ? (a.getAttribute('href') || '') : '';
        const u = absUrl(/\.(?:jpe?g|png|webp|gif)(?:\?|$)/i.test(ah) ? ah : raw);
        if (!srcs.includes(u)) srcs.push(u);
    });
    const probes = await Promise.all(srcs.slice(0, 16).map(s => projProbe(s)));
    const ok = probes.filter(Boolean);
    const panoramic = ok.find(x => x.w >= 400 && x.h >= 35 && (x.w / x.h) >= 2.0);
    const wide = ok.find(x => x.w >= 450 && x.h >= 50 && (x.w / x.h) >= 1.5);
    const best = panoramic || wide || null;
    return best ? { src: best.src, wide: true, ratio: Math.max(2.2, Math.min(4.5, best.w / best.h)) } : null;
}

const projVisible = () => (!proj ? [] : (proj.group ? proj.items.filter(i => i._pGroup === proj.group) : proj.items));

function pjApply(P) {
    const parsed = pjParse(P.posts, P.item.id);
    P.dup = parsed.dup; P.bad = parsed.bad; P.forums = parsed.forums; P.ext = parsed.ext; P.hasMagnet = parsed.hasMagnet; P.info = parsed.info;
    P.items = parsed.entries.map((e, i) => projMakeItem(e, i));
    const cnt = {};
    P.items.forEach(it => { if (it._pGroup) cnt[it._pGroup] = (cnt[it._pGroup] || 0) + 1; });
    P.items.forEach(it => { if (it._pGroup && cnt[it._pGroup] < 2) it._pGroup = ''; });
    P.groups = Object.keys(cnt).filter(g => cnt[g] >= 2).map(g => ({ name: g, n: cnt[g] }));
    if (P.groups.length < 2) { P.groups = []; P.items.forEach(it => { it._pGroup = ''; }); P.group = ''; }
    projRefresh(P);
}

async function loadProject(P, page = 1) {
    const run = ++P.run;
    page = Math.max(1, parseInt(page, 10) || 1);
    P.loading = true; P.err = ''; P.cur = page;
    renderProjHead(); renderProjDoc();
    try {
        let ent = P.cache.get(page);
        if (!ent) {
            const base = new URL(P.item.url, SITE_ROOT);
            if (page > 1) { base.searchParams.set('start', String((page - 1) * (P.per || 0))); await netGate(); }
            const { doc } = await projFetchDoc(base.href);
            if (P.run !== run) return;
            const posts = pjPostsOf(doc);
            if (!posts.length) {
                const msg = ((doc.querySelector('#message') || {}).textContent || '').replace(/\s+/g, ' ').trim();
                throw new Error(msg ? msg.slice(0, 120) : 'post principale non trovato (accesso richiesto?)');
            }
            if (page === 1) {
                const starts = pjPageStarts(doc);
                P.per = starts[0] || 0;
                P.pages = starts.length + 1;
                P.hasMagnet = !!posts[0].el.querySelector('a[href^="magnet:"]');
                if (posts[0].author && !P.item.author) P.item.author = posts[0].author;

                const bannerUrl = projFirstImgUrl(posts[0].el);
                if (bannerUrl) {
                    P.banner = bannerUrl;
                    P.bannerWide = true;
                    P.bannerRatio = 2.6;
                    P.item.poster = P.banner;
                    P.item.posterSrc = 'forum';
                    P.item.posterTried = true;
                    saveCache(P.item);
                }
            }
            ent = { posts: posts.map(p => ({ author: p.author, html: pjSanitize(p.el) })) };
            P.cache.set(page, ent);
        }
        P.loading = false;
        renderProjHead(); renderProjDoc();
    } catch (e) {
        if (P.run !== run) return;
        P.loading = false; P.err = (e && e.message) || 'errore di rete';
        renderProjHead(); renderProjDoc();
    }
}

function openProject(item) {
    hideModal();
    if (view.key === 'project' && proj && proj.item === item) return;
    const app = $('mirseer-app');
    const prev = { key: view.key, section: view.section, page: PG.page, scroll: app ? app.scrollTop : 0, project: (view.key === 'project' && proj) ? proj : null };
    const P = { item, prev, items: [], posts: [], loading: true, err: '', banner: null, bannerWide: false, bannerRatio: 3, info: '', infoOpen: false, forums: [], ext: [], groups: [], group: '', dup: 0, bad: 0, run: 0, pages: 1, per: 0, cur: 1, pageDone: 0, hasMagnet: false, cache: new Map() };
    proj = P;
    setView('project');
    loadProject(P, 1);
}

function projEmptyMsg() {
    const P = proj;
    if (!P) return 'Nessun contenuto.';
    if (P.loading) return '\u23f3 Analisi del progetto in corso\u2026';
    if (P.err) return `\u26a0\ufe0f Impossibile leggere il progetto (${esc(P.err)}).<br><br><button class="seer-load-btn" data-proj="retry">\ud83d\udd04 Riprova</button>`;
    if (anyFilter() && lastBaseCount > 0) return 'Nessun contenuto corrisponde ai filtri attivi.';
    const locked = P.posts && P.posts[0] && /ringrazi|thanks?/i.test(P.posts[0].el.textContent || '');
    return `Nessun link a film, serie o altri contenuti trovato nel progetto.${locked ? '<br>Il topic potrebbe nascondere i contenuti finch\u00e9 non si ringrazia sul forum.' : ''}${P.hasMagnet ? '<br>Il progetto contiene magnet: usa il pulsante \ud83e\uddf2 in alto.' : ''}<br><br><a class="seer-load-btn" href="${esc(P.item.url)}" target="_blank" rel="noopener">\ud83d\udd17 Apri il topic sul forum</a>`;
}

function renderProjHead() {
    const box = $('seer-proj-head');
    if (!box) return;
    if (view.key !== 'project' || !proj || search.active) { box.style.display = 'none'; box.innerHTML = ''; box.classList.remove('pj-sticky'); return; }
    const P = proj, it = P.item;
    const ss = $('seer-sort-select');
    if (ss) ss.style.display = 'none';
    const chips = [];
    if (it.author) chips.push('👤 ' + esc(it.author));
    if (it.ts) { const d = new Date(it.ts); if (!isNaN(d)) chips.push('📅 ' + esc(d.toLocaleDateString('it-IT'))); }
    if (it.views) chips.push('👁️ ' + esc(fmtViews(it.views)));
    if (it.replies) chips.push('💬 ' + esc(it.replies));
    if (P.loading) chips.push('⏳ Caricamento…');
    else if (P.pages > 1) chips.push('📄 Pagina ' + P.cur + '/' + P.pages);
    const chipHtml = chips.map(c => `<span class="seer-chip">${c}</span>`).join('');
    const nav = P.pages > 1
        ? `<button class="seer-facet" data-pjpg="prev" title="Pagina precedente"${(P.loading || P.cur <= 1) ? ' disabled' : ''}>‹</button>` +
          `<button class="seer-facet" data-pjpg="next" title="Pagina successiva"${(P.loading || P.cur >= P.pages) ? ' disabled' : ''}>›</button>`
        : '';
    box.innerHTML =
        `<div class="seer-pj-toolbar">` +
        `<button class="seer-facet" data-proj="back" title="Torna indietro">← Torna indietro</button>` +
        `<h1 class="pj-tb-title">${esc(it.displayTitle)}</h1>` +
        `<span class="pj-tb-chips">${chipHtml}</span>${nav}` +
        (P.hasMagnet ? `<button class="seer-load-btn" data-proj="magnets" style="padding:6px 12px;font-size:12.5px;">🧲 Magnet</button>` : '') +
        `<a class="seer-chip" href="${esc(it.url)}" target="_blank" rel="noopener" title="Apri il topic originale">🔗 Forum</a>` +
        `</div>`;
    box.classList.add('pj-sticky');
    box.style.display = 'block';
}

function projHeadClick(e) {
    if (view.key !== 'project' || !proj) return;
    if (e.target.closest('.seer-pjdoc')) { pjDocClick(e); return; }
    const pg = e.target.closest('[data-pjpg]');
    if (pg) {
        if (pg.disabled) return;
        const v = pg.dataset.pjpg;
        let n = proj.cur;
        if (v === 'first') n = 1;
        else if (v === 'prev') n = proj.cur - 1;
        else if (v === 'next') n = proj.cur + 1;
        else if (v === 'last') n = proj.pages;
        else if (v === 'go') { const inp = pg.parentElement.querySelector('.seer-pg-jump'); if (!inp || !inp.value) return; n = inp.value; }
        else n = v;
        pjGoPage(proj, n);
        return;
    }
    const b = e.target.closest('[data-proj]');
    if (!b) return;
    if (b.dataset.proj === 'back') closeProject();
    else if (b.dataset.proj === 'magnets') openDetailModal(proj.item);
    else if (b.dataset.proj === 'retry') loadProject(proj, proj.cur || 1);
}

GM_addStyle(`
/* Nella pagina di una collezione NON compare nessun banner in alto */
#mirseer-app[data-seer-view="project"] #seer-hero,
#mirseer-app[data-seer-view="project"] .seer-pj-cover,
#mirseer-app[data-seer-view="project"] .seer-proj-banner { display: none !important; }
/* Tasto "Torna indietro" sempre visibile: compare quando la toolbar esce dallo schermo */
#seer-pj-fab-back { display: none; position: fixed; top: calc(var(--seer-nav-h, 64px) + 10px); left: 276px; z-index: 120; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--seer-border); background: color-mix(in srgb, var(--seer-bg) 90%, transparent); color: var(--seer-text); font-size: 13px; font-weight: 800; cursor: pointer; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 6px 20px rgba(0,0,0,.35); }
#seer-pj-fab-back.show { display: inline-flex; }
#seer-pj-fab-back:hover { background: var(--seer-accent); border-color: var(--seer-accent); color: #fff; }
@media (max-width: 980px) { #seer-pj-fab-back { left: 12px; } }
`);
function pjFabUpdate() {
    const app = $('mirseer-app');
    if (!app) return;
    let b = $('seer-pj-fab-back');
    if (!b) {
        b = document.createElement('button');
        b.id = 'seer-pj-fab-back';
        b.type = 'button';
        b.textContent = '← Torna indietro';
        b.addEventListener('click', () => closeProject());
        app.appendChild(b);
    }
    let show = false;
    if (view.key === 'project' && proj && !search.active) {
        const head = $('seer-proj-head');
        const navH = (document.querySelector('.seer-nav') || {}).offsetHeight || 64;
        if (head && head.style.display !== 'none') {
            const r = head.getBoundingClientRect();
            show = app.scrollTop > 60 && r.bottom < navH + 4;
        } else show = app.scrollTop > 60;
    }
    b.classList.toggle('show', show);
}

const PJ_SHOW_COVER = false;
let pjThemeObs = null, pjOpening = false, pjCtx = null;

GM_addStyle(`
.seer-proj-head.pj-sticky { position: sticky; top: var(--seer-nav-h, 0px); z-index: 30; padding: 6px 0; margin-bottom: 12px; background: color-mix(in srgb, var(--seer-bg) 88%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.seer-pj-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 9px 12px; border: 1px solid var(--seer-border); border-radius: 14px; background: var(--seer-card); }
.pj-tb-title { flex: 1 1 220px; min-width: 0; margin: 0; font-size: 18px; font-weight: 800; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pj-tb-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.seer-pj-toolbar .seer-facet:disabled { opacity: .4; cursor: not-allowed; }
.seer-pjdoc { color: var(--seer-text); font-size: 15px; line-height: 1.6; min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
/* Override assoluto di sicurezza per testo forzato dal BBCode */
#mirseer-app:not(.seer-light) .seer-pjdoc [color="black"],
#mirseer-app:not(.seer-light) .seer-pjdoc [color="#000000"],
#mirseer-app:not(.seer-light) .seer-pjdoc [color="#000"],
#mirseer-app:not(.seer-light) .seer-pjdoc [style*="color: rgb(0, 0, 0)"],
#mirseer-app:not(.seer-light) .seer-pjdoc [style*="color: black"],
#mirseer-app:not(.seer-light) .seer-pjdoc [style*="color: #000"] {
    color: var(--seer-text) !important;
}
#mirseer-app.seer-light .seer-pjdoc [color="white"],
#mirseer-app.seer-light .seer-pjdoc [color="#ffffff"],
#mirseer-app.seer-light .seer-pjdoc [color="#fff"],
#mirseer-app.seer-light .seer-pjdoc [style*="color: rgb(255, 255, 255)"],
#mirseer-app.seer-light .seer-pjdoc [style*="color: white"],
#mirseer-app.seer-light .seer-pjdoc [style*="color: #fff"] {
    color: var(--seer-text) !important;
}
.seer-pjdoc .pj-post { background: var(--seer-card); border: 1px solid var(--seer-border); border-radius: 16px; padding: 18px 20px; margin: 0 0 16px; overflow: hidden; }
.seer-pjdoc .pj-author { font-size: 12.5px; font-weight: 800; color: var(--seer-text-muted); margin: 0 0 10px; padding-bottom: 8px; border-bottom: 1px solid var(--seer-border); }
.seer-pjdoc .pj-body { min-width: 0; }
.seer-pjdoc img { max-width: 100% !important; height: auto !important; }
.seer-pjdoc video, .seer-pjdoc canvas, .seer-pjdoc svg { max-width: 100%; height: auto; }
.seer-pjdoc .pj-tablewrap { max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 8px 0; }
.seer-pjdoc table { max-width: none; border-collapse: collapse; }
.seer-pjdoc td, .seer-pjdoc th { vertical-align: top; padding: 4px 8px; }

/* Adattamento banner panoramico per le righe dei progetti */
.seer-row[data-topic-type="Progetti e Collezioni"] .seer-poster-wrap,
.seer-row.is-proj .seer-poster-wrap {
    min-width: 110px !important;
    max-width: 140px !important;
    height: 64px !important;
    aspect-ratio: 16 / 9 !important;
}
.seer-row[data-topic-type="Progetti e Collezioni"] .seer-poster,
.seer-row.is-proj .seer-poster {
    max-width: 100% !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
}

/* Fix contrasto assoluto per spoiler, sfondi e testi in Dark Mode */
#mirseer-app:not(.seer-light) .seer-pjdoc,
#mirseer-app:not(.seer-light) .seer-pjdoc .spoiler,
#mirseer-app:not(.seer-light) .seer-pjdoc .spoilerbox,
#mirseer-app:not(.seer-light) .seer-pjdoc [class*="spoiler"] {
    background-color: var(--seer-card) !important;
    color: var(--seer-text) !important;
}
#mirseer-app:not(.seer-light) .seer-pjdoc div,
#mirseer-app:not(.seer-light) .seer-pjdoc p,
#mirseer-app:not(.seer-light) .seer-pjdoc span,
#mirseer-app:not(.seer-light) .seer-pjdoc font {
    background-color: transparent !important;
}
/* Se il testo dentro allo spoiler è forzato bianco/grigio chiaro, lo rende leggibile */
#mirseer-app:not(.seer-light) .seer-pjdoc [style*="color"],
#mirseer-app:not(.seer-light) .seer-pjdoc font[color] {
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}


/* Toolbar del progetto sempre visibile (sticky) in cima allo schermo */
.seer-proj-head.pj-sticky {
    position: sticky !important;
    top: var(--seer-nav-h, 64px) !important;
    z-index: 100 !important;
    padding: 8px 0 !important;
    margin-bottom: 14px !important;
    background: rgba(7, 9, 14, 0.94) !important;
    backdrop-filter: blur(14px) !important;
    -webkit-backdrop-filter: blur(14px) !important;
}
#mirseer-app.seer-light .seer-proj-head.pj-sticky {
    background: rgba(244, 246, 251, 0.94) !important;
}

.seer-pjdoc pre { max-width: 100%; overflow-x: auto; white-space: pre-wrap; }
.seer-pjdoc a { color: var(--seer-accent, #818cf8); text-decoration: underline; text-underline-offset: 2px; }
#mirseer-app.seer-light .seer-pjdoc a { color: #4338ca; }
.seer-pjdoc blockquote, .seer-pjdoc .quotecontent, .seer-pjdoc .spoiler, .seer-pjdoc .spoilerbox, .seer-pjdoc [class*="spoiler"][class*="content"] { background: rgba(127,127,127,.10); color: inherit; border: 1px solid var(--seer-border); border-radius: 10px; padding: 8px 12px; margin: 8px 0; }
.seer-pjdoc .quotetitle, .seer-pjdoc summary, .seer-pjdoc .pj-spbtn, .seer-pjdoc [class*="spoiler"][class*="title"], .seer-pjdoc [class*="spoiler"][class*="head"] { cursor: pointer; user-select: none; }
.seer-pjdoc .pj-spbtn { display: inline-block; padding: 2px 10px; margin-left: 6px; border-radius: 8px; border: 1px solid var(--seer-border); background: rgba(127,127,127,.15); font-size: 12px; font-weight: 700; }
@media (max-width: 720px) { .seer-pjdoc .pj-post { padding: 12px; } .pj-tb-title { font-size: 15px; } }
`);

function pjRGB(str) {
    if (!str) return null;
    try {
        if (!pjCtx) pjCtx = document.createElement('canvas').getContext('2d');
        pjCtx.fillStyle = '#010203';
        pjCtx.fillStyle = String(str).trim();
        const v = pjCtx.fillStyle;
        if (v === '#010203') return null;
        let m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v);
        if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), 1];
        m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(v);
        return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
    } catch (e) { return null; }
}
function pjLum(rgb) {
    const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
const pjContrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const PJ_KILL = 'script,style,noscript,iframe,frame,frameset,object,embed,applet,form,textarea,select,option,optgroup,link,meta,base,.signature,.sig,.post-buttons,.back2top,.notice,.postprofile';
function pjSanitize(src) {
    const el = src.cloneNode(true);
    const doc = el.ownerDocument;
    el.querySelectorAll('input[type="button"], input[type="submit"], button').forEach(b => {
        const oc = b.getAttribute('onclick') || '';
        const near = b.closest('.spoiler, .spoilerbox, .spoiler-box, .quotetitle, [class*="spoiler"]');
        if (near || /display|toggle|spoiler|collaps/i.test(oc)) {
            const s = doc.createElement('span');
            s.className = 'pj-spbtn'; s.setAttribute('role', 'button'); s.setAttribute('tabindex', '0');
            s.textContent = (b.value || b.textContent || 'Mostra').trim() || 'Mostra';
            b.replaceWith(s);
        } else b.remove();
    });
    el.querySelectorAll(PJ_KILL).forEach(n => n.remove());
    el.querySelectorAll('input').forEach(n => n.remove());
    el.querySelectorAll('[class*="thank"], [id*="thank"]').forEach(n => {
        if ((n.textContent || '').length < 400 && !n.querySelector('a[href*="viewtopic"]')) n.remove();
    });
    el.querySelectorAll('*').forEach(n => {
        const tag = n.tagName;
        [...n.attributes].forEach(at => { if (/^on/i.test(at.name) || at.name === 'srcdoc' || at.name === 'formaction') n.removeAttribute(at.name); });
        const h = n.getAttribute('href');
        if (h !== null && /^\s*(?:javascript|data|vbscript):/i.test(h)) n.removeAttribute('href');
        if (n.style) {
            let c = n.style.color;
            if (!c && tag === 'FONT') c = n.getAttribute('color') || '';
            if (c) {
                const rgb = pjRGB(c);
                if (rgb && rgb[3] > 0) {
                    const isNeutral = (Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]) < 28) && (pjLum(rgb) < 0.22 || pjLum(rgb) > 0.78);
                    if (!isNeutral) {
                        n.setAttribute('data-pjc', c);
                        n.setAttribute('data-pjcl', pjLum(rgb).toFixed(4));
                    }
                }
            }
            n.style.removeProperty('color');
            n.style.removeProperty('background-color');
            if (/^(fixed|sticky)$/.test(n.style.position)) n.style.removeProperty('position');
        }
        if (tag === 'FONT') n.removeAttribute('color');
        n.removeAttribute('bgcolor');
        if (tag === 'IMG') {
            const raw = n.getAttribute('data-src') || n.getAttribute('data-lazy-src') || n.getAttribute('data-original') || n.getAttribute('src') || '';
            if (raw && !/^data:/i.test(raw)) n.setAttribute('src', absUrl(raw));
            n.removeAttribute('srcset'); n.removeAttribute('height');
            n.setAttribute('loading', 'lazy'); n.setAttribute('decoding', 'async');
        }
        if (tag === 'A' && n.getAttribute('href') !== null) {
            const href = n.getAttribute('href') || '';
            const special = /^#/.test(href) || /^(?:magnet|mailto):/i.test(href);
            if (!special) n.setAttribute('href', absUrl(href));
            const ref = special ? null : pjTopicRef(n);
            const mine = !!ref && !ref.bad && (ref.key || (ref.forum && forumToSection.has(ref.forum)));
            if (!mine && !special) { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); }
            else n.removeAttribute('target');
        }
    });
    el.querySelectorAll('table').forEach(t => {
        if (t.parentElement && t.parentElement.closest('.pj-tablewrap')) return;
        const w = doc.createElement('div'); w.className = 'pj-tablewrap';
        t.parentNode.insertBefore(w, t); w.appendChild(t);
    });
    return el.innerHTML;
}

function pjApplyTheme(root) {
    const app = $('mirseer-app');
    if (!root || !app) return;
    const dark = !app.classList.contains('seer-light');
    const pageL = dark ? 0.005 : 0.92;
    root.querySelectorAll('[data-pjbg]').forEach(n => {
        n.style.removeProperty('background-color');
    });
    root.querySelectorAll('[data-pjc]').forEach(n => {
        const L = parseFloat(n.getAttribute('data-pjcl'));
        if (pjContrast(L, pageL) >= 2.8) {
            n.style.color = n.getAttribute('data-pjc');
        } else {
            n.style.removeProperty('color');
        }
    });
}
function pjWatchTheme() {
    const app = $('mirseer-app');
    if (pjThemeObs || !app || !window.MutationObserver) return;
    pjThemeObs = new MutationObserver(() => { if (view.key === 'project') pjApplyTheme($('seer-main-list')); });
    pjThemeObs.observe(app, { attributes: true, attributeFilter: ['class'] });
}

const PJ_SP_HEAD = '.pj-spbtn, .spoiler-title, .spoilertitle, .spoiler_title, .spoiler-head, .spoilerhead, .quotetitle, [class*="spoiler"][class*="title"], [class*="spoiler"][class*="head"], [class*="spoiler"][class*="button"], [class*="spoiler"][class*="toggle"]';
const pjHiddenNow = n => !!n.hidden || getComputedStyle(n).display === 'none';
function pjSpoilerBody(ctl) {
    const head = ctl.closest('.quotetitle, .spoiler-title, .spoilertitle, .spoiler_title, .spoiler-head, .spoilerhead, [class*="spoiler"][class*="title"], [class*="spoiler"][class*="head"]') || ctl;
    const looks = n => /spoiler|quotecontent|collapse|sp-?body|sp-?content/i.test(n.className || '');
    for (let n = head, d = 0; n && d < 4 && !(n.classList && n.classList.contains('seer-pjdoc')); n = n.parentElement, d++) {
        const s = n.nextElementSibling;
        if (!s) continue;
        if (pjHiddenNow(s) || looks(s)) return s;
        const inner = [...s.children].find(pjHiddenNow);
        if (inner) return inner;
    }
    return null;
}
function pjSpoilerClick(e) {
    const ctl = e.target.closest(PJ_SP_HEAD);
    if (!ctl || e.target.closest('a[href]')) return false;
    const body = pjSpoilerBody(ctl);
    if (!body) return false;
    const wasHidden = pjHiddenNow(body);
    body.hidden = false;
    body.style.display = wasHidden ? 'block' : 'none';
    if (ctl.classList.contains('pj-spbtn')) ctl.textContent = wasHidden ? 'Nascondi' : 'Mostra';
    e.preventDefault(); e.stopPropagation();
    return true;
}

function pjLinkTitle(a) {
    const ok = t => pjGood(t) && projTitleOk(t);
    let t = pjCleanTitle((a.textContent || '').replace(/\s+/g, ' '));
    if (!ok(t)) { const im = a.querySelector('img'); t = im ? pjCleanTitle(im.getAttribute('alt') || im.getAttribute('title') || '') : ''; }
    if (!ok(t)) t = pjCleanTitle(a.getAttribute('title') || '');
    return ok(t) ? t : '';
}

async function pjOpenTopic(ref, text) {
    if (pjOpening) return;
    pjOpening = true;
    const app = $('mirseer-app');
    let key = String(ref.key), url = ref.url, title = text || '', doc = null;
    try {
        if (!registry.get(key) && (!title || key[0] === 'p')) {
            if (app) app.style.cursor = 'progress';
            try {
                doc = (await fetchTopicPage(url)).doc;
                const a = doc.querySelector('h2.topic-title a, .topic-title a, h2 a[href*="viewtopic.php"]');
                const tid = a ? ((a.getAttribute('href') || '').match(/[?&]t=(\d+)/) || [])[1] : null;
                if (key[0] === 'p') {
                    if (!tid) throw new Error('topic non risolvibile');
                    key = tid; url = SITE_ROOT + 'viewtopic.php?t=' + tid;
                }
                if (!title) {
                    let t = a ? a.textContent.replace(/\s+/g, ' ').trim() : '';
                    if (!t) t = String(doc.title || '').replace(/\s+[-\u2013|]\s+[^-\u2013|]*$/, '').trim();
                    title = t;
                }
            } catch (err) {
                if (key[0] === 'p') { window.open(url, '_blank', 'noopener'); return; }
            }
        }
        const it = projMakeItem({ key, url, text: title }, 0);
        if (doc) projTypeFromCrumbs(it, doc);
        if (isProjectItem(it)) openProject(it); else openDetailModal(it);
    } finally {
        pjOpening = false;
        if (app) app.style.cursor = '';
    }
}

function pjDocClick(e) {
    if (pjSpoilerClick(e)) return;
    const a = e.target.closest('.seer-pjdoc a[href]');
    if (!a) return;
    if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href') || '';
    if (/^(?:#|magnet:|mailto:)/i.test(href)) return;
    const ref = pjTopicRef(a);
    if (!ref || ref.bad) return;
    e.preventDefault(); e.stopPropagation();
    if (ref.forum) {
        if (forumToSection.has(ref.forum)) setView('section', { id: ref.forum, name: forumToSection.get(ref.forum) });
        else window.open(a.href, '_blank', 'noopener');
        return;
    }
    pjOpenTopic(ref, pjLinkTitle(a));
}

function pjPagerHtml(P) {
    if (P.pages <= 1) return '';
    const c = P.cur, t = P.pages, busy = P.loading;
    const nums = pgWindow(c, t).map(n => n === '…'
        ? '<span class="seer-pg-dots">…</span>'
        : `<button class="seer-pg-btn ${n === c ? 'active' : ''}" data-pjpg="${n}"${busy ? ' disabled' : ''}>${n}</button>`).join('');
    const nav = (v, label, off, title) => `<button class="seer-pg-btn" data-pjpg="${v}" title="${title}"${(off || busy) ? ' disabled' : ''}>${label}</button>`;
    return `<div class="seer-pager seer-pj-pager">` +
        nav('first', '«', c <= 1, 'Prima pagina') + nav('prev', '‹', c <= 1, 'Pagina precedente') + nums +
        nav('next', '›', c >= t, 'Pagina successiva') + nav('last', '»', c >= t, 'Ultima pagina') +
        `<span class="seer-pg-info">Pagina ${c} di ${t}</span>` +
        `<input type="number" class="seer-adv-input seer-pg-jump" min="1" max="${t}" placeholder="Vai a…">` +
        `<button class="seer-pg-btn" data-pjpg="go"${busy ? ' disabled' : ''}>Vai</button></div>`;
}
function pjGoPage(P, n) {
    n = Math.max(1, Math.min(P.pages, parseInt(n, 10) || 1));
    if (P.loading || n === P.cur) return;
    const app = $('mirseer-app');
    if (app) app.scrollTop = 0;
    loadProject(P, n);
}

function renderProjDoc() {
    if (view.key !== 'project' || !proj || search.active) return;
    const P = proj, box = $('seer-main-list');
    if (!box) return;
    box.classList.remove('seer-grid');
    lastDisplayed = [];
    const cnt = $('seer-count'); if (cnt) cnt.innerText = '';
    if (P.err) {
        box.innerHTML = `<p class="seer-status-msg">⚠️ Impossibile leggere il progetto (${esc(P.err)}).<br><br><button class="seer-load-btn" data-proj="retry">🔄 Riprova</button></p>`;
        return;
    }
    const ent = P.cache.get(P.cur);
    if (!ent) { box.innerHTML = '<p class="seer-status-msg">⏳ Caricamento del progetto…</p>'; return; }
    const posts = ent.posts.map((p, i) => {
        const reply = P.cur > 1 || i > 0;
        return `<article class="pj-post${reply ? ' pj-reply' : ''}">` +
            (reply ? `<div class="pj-author">👤 ${esc(p.author || 'Utente')}</div>` : '') +
            `<div class="pj-body">${p.html}</div></article>`;
    }).join('');
    const pager = pjPagerHtml(P);
    box.innerHTML = `<div class="seer-pjdoc">${posts}</div>${pager}`;
    pjApplyTheme(box);
    pjWatchTheme();
}

const DL_KEY = 'dlLog';
let dlLog = (() => { const d = getPref(DL_KEY, {}); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; })();
let dlTimer = null;
function saveDlNow() { clearTimeout(dlTimer); dlTimer = null; try { setPref(DL_KEY, dlLog); } catch (e) {} }
function saveDl() { if (!dlTimer) dlTimer = setTimeout(saveDlNow, 500); }
function dlQuality(it) {
    const m = it && it.meta;
    const vid = it && (VIDEO_TYPES.has(it.type) || effKind(it) === 'video');
    if (!m || !vid) return 'other';
    return m.is4k ? '4k' : m.is1080p ? '1080' : m.is720p ? '720' : 'sd';
}
function trackDl(it, uris, via) {
    try {
        uris = (uris || []).filter(u => /^magnet:/i.test(String(u)));
        if (!uris.length) return;
        const now = Date.now();
        const known = uris.map(u => { const x = String(u).match(/[?&]xl=(\d+)/i); return x ? +x[1] : 0; });
        const fallback = (!known.some(Boolean) && it && it.sizeBytes) ? it.sizeBytes / uris.length : 0;
        uris.forEach((u, i) => {
            const key = magnetKey(u), old = dlLog[key];
            dlLog[key] = {
                id: it ? String(it.id) : '', t: it ? (it.displayTitle || it.rawTitle || '') : magnetDn(u), u: it ? (it.url || '') : '',
                r: it ? (it.author || '') : '', q: dlQuality(it), ty: it ? (it.type || '') : '',
                b: known[i] || fallback || (old && old.b) || 0, ts: old ? old.ts : now, last: now, n: (old ? old.n : 0) + 1, via
            };
        });
        const keys = Object.keys(dlLog);
        if (keys.length > 8000) keys.sort((a, b) => (dlLog[a].last || 0) - (dlLog[b].last || 0)).slice(0, keys.length - 8000).forEach(k => delete dlLog[k]);
        saveDl();
    } catch (e) {}
}
function forumPageItem() {
    try {
        if (!/viewtopic\.php/i.test(location.pathname)) return null;
        const t = new URLSearchParams(location.search).get('t');
        if (t && registry.get(t)) return registry.get(t);
        const a = document.querySelector('h2.topic-title a, .topic-title a');
        const title = a ? a.textContent.replace(/\s+/g, ' ').trim() : String(document.title || '').replace(/\s+[-\u2013|]\s+[^-\u2013|]*$/, '');
        const au = document.querySelector('.post .username, .post .username-coloured');
        let type = 'Film';
        const ids = [...document.querySelectorAll('.breadcrumbs a[href*="viewforum.php"], #nav-breadcrumbs a[href*="viewforum.php"]')].map(x => ((x.getAttribute('href') || '').match(/[?&]f=(\d+)/) || [])[1]).filter(Boolean).reverse();
        for (const id of ids) { const nm = forumToSection.get(id); if (nm) { type = nm; break; } }
        return buildItem({ topicId: t || '0', href: location.href, raw: title || 'Topic', type, author: au ? au.textContent.trim() : '' });
    } catch (e) { return null; }
}
function dlStats() {
    const S = { n: 0, clicks: 0, bytes: 0, noSize: 0, rel: {}, q: { '4k': { n: 0, b: 0 }, '1080': { n: 0, b: 0 }, '720': { n: 0, b: 0 }, sd: { n: 0, b: 0 }, other: { n: 0, b: 0 } }, months: {}, rows: Object.values(dlLog) };
    S.n = S.rows.length;
    S.rows.forEach(r => {
        S.clicks += r.n || 1; S.bytes += r.b || 0; if (!r.b) S.noSize++;
        const rn = r.r || 'Sconosciuto';
        const o = S.rel[rn] || (S.rel[rn] = { n: 0, b: 0 }); o.n++; o.b += r.b || 0;
        const q = S.q[r.q] || S.q.other; q.n++; q.b += r.b || 0;
        const d = new Date(r.ts || Date.now());
        const mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        const m = S.months[mk] || (S.months[mk] = { n: 0, b: 0 }); m.n++; m.b += r.b || 0;
    });
    return S;
}
function dlExport() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dlLog, null, 2)], { type: 'application/json' }));
    a.download = 'mirseer-attivita.json';
    a.dataset.seerTracked = '1';
    document.body.appendChild(a); a.click(); a.remove();
}

const acct = { tab: 'profile', prev: null, uid: null, profile: null, pLoading: false, pErr: '', extra: [], page: 'front', pageData: null, pageLoading: false, pageErr: '', saving: false, saveMsg: null, relMetric: 'count' };
const UCP_MODS = [
    { k: 'front', g: 'Panoramica', l: 'Panoramica', q: 'i=ucp_main&mode=front', t: 'view' },
    { k: 'subscribed', g: 'Panoramica', l: 'Sottoscrizioni', q: 'i=ucp_main&mode=subscribed', t: 'list' },
    { k: 'bookmarks', g: 'Panoramica', l: 'Segnalibri', q: 'i=ucp_main&mode=bookmarks', t: 'list' },
    { k: 'drafts', g: 'Panoramica', l: 'Bozze', q: 'i=ucp_main&mode=drafts', t: 'view' },
    { k: 'profile_info', g: 'Profilo', l: 'Modifica profilo', q: 'i=ucp_profile&mode=profile_info', t: 'edit' },
    { k: 'reg_details', g: 'Profilo', l: 'Dati account', q: 'i=ucp_profile&mode=reg_details', t: 'ro' },
    { k: 'signature', g: 'Profilo', l: 'Firma', q: 'i=ucp_profile&mode=signature', t: 'edit' },
    { k: 'avatar', g: 'Profilo', l: 'Avatar', q: 'i=ucp_profile&mode=avatar', t: 'ro' },
    { k: 'personal', g: 'Preferenze', l: 'Impostazioni personali', q: 'i=ucp_prefs&mode=personal', t: 'edit' },
    { k: 'view', g: 'Preferenze', l: 'Opzioni di visualizzazione', q: 'i=ucp_prefs&mode=view', t: 'edit' },
    { k: 'post', g: 'Preferenze', l: 'Preferenze messaggi', q: 'i=ucp_prefs&mode=post', t: 'edit' },
    { k: 'notif', g: 'Preferenze', l: 'Notifiche', q: 'i=ucp_notifications&mode=notification_options', t: 'edit' },
    { k: 'attach', g: 'Altro', l: 'Allegati', q: 'i=ucp_attachments&mode=attachments', t: 'view' },
    { k: 'friends', g: 'Altro', l: 'Amici', q: 'i=ucp_zebra&mode=friends', t: 'view' },
    { k: 'foes', g: 'Altro', l: 'Nemici', q: 'i=ucp_zebra&mode=foes', t: 'view' }
];
const acctMods = () => UCP_MODS.concat(acct.extra);
const UF_IGNORE = /^(?:form_token|creation_time|sid|submit|cur_password|confirm_code|confirm_id|lastclick)$/;

async function acctFetch(url, opt) {
    const r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opt || {}));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const html = await r.text();
    return { doc: new DOMParser().parseFromString(html, 'text/html'), html, url: r.url };
}
function acctCheckAuth(doc) {
    if (!doc.querySelector('a[href*="mode=logout"]') && doc.querySelector('form[action*="mode=login"], #login_form, input[name="login"], input[name="password"]')) throw new Error('sessione non attiva: accedi al forum');
}
async function acctUid() {
    if (acct.uid) return acct.uid;
    if (currentUser && currentUser.uid) { acct.uid = currentUser.uid; return acct.uid; }
    const { doc } = await acctFetch(SITE_ROOT + 'ucp.php');
    acctCheckAuth(doc);
    const a = [...doc.querySelectorAll('a[href*="mode=viewprofile"]')].find(x => /[?&]u=\d+/.test(x.getAttribute('href') || '') && (!currentUser || x.textContent.trim() === currentUser.name)) || doc.querySelector('a[href*="mode=viewprofile"][href*="u="]');
    const uid = a ? ((a.getAttribute('href').match(/[?&]u=(\d+)/) || [])[1]) : null;
    if (!uid) throw new Error('ID utente non trovato');
    acct.uid = uid; if (currentUser) currentUser.uid = uid;
    return uid;
}
const acctTxt = el => (el ? (el.textContent || '') : '').replace(/\s+/g, ' ').trim();

function acctParseProfile(doc, uid) {
    const scope = doc.querySelector('#page-body') || doc.body;
    const out = { uid, name: '', avatar: '', rank: '', rankImg: '', sections: [], actions: [] };
    const av = scope.querySelector('#viewprofile img.avatar, img.avatar, .profile-avatar img');
    if (av && av.getAttribute('src') && !/^data:/.test(av.getAttribute('src'))) out.avatar = absUrl(av.getAttribute('src'));
    const rk = scope.querySelector('.profile-rank');
    if (rk) { out.rank = acctTxt(rk); const im = rk.querySelector('img'); if (im) out.rankImg = absUrl(im.getAttribute('src') || ''); }
    const map = new Map();
    scope.querySelectorAll('dt').forEach(dt => {
        if (dt.closest('.topiclist, .forumbg, .navbar, #nav-footer, .postprofile, .jumpbox') || dt.classList.contains('profile-avatar')) return;
        const dd = dt.nextElementSibling;
        if (!dd || dd.tagName !== 'DD') return;
        const label = acctTxt(dt).replace(/[:\uff1a]\s*$/, '');
        if (!label) return;
        let val = '';
        const sel = dd.querySelector('select');
        val = sel ? acctTxt(sel.selectedOptions && sel.selectedOptions[0]) : acctTxt(dd);
        if (!val) return;
        const link = dd.querySelector('a[href^="http"], a[href^="/"], a[href^="./"]');
        const panel = dt.closest('.panel, .column1, .column2, fieldset');
        const h = panel && panel.querySelector('h3, h2, legend');
        const title = acctTxt(h) || 'Profilo';
        const sec = map.get(title) || (map.set(title, []), map.get(title));
        if (!sec.some(r => r.l === label && r.v === val)) sec.push({ l: label, v: val, h: link ? absUrl(link.getAttribute('href')) : '' });
        if (/^(?:nome utente|username|utente)$/i.test(label) && !out.name) out.name = val;
    });
    map.forEach((rows, title) => out.sections.push({ title, rows }));
    if (!out.name) out.name = acctTxt(scope.querySelector('#viewprofile .username, #viewprofile .username-coloured, .username-coloured, .username')) || (currentUser && currentUser.name) || 'Account';
    scope.querySelectorAll('a[href*="search.php?author_id"]').forEach(a => { const u = absUrl(a.getAttribute('href')); if (!out.actions.some(x => x.url === u)) out.actions.push({ url: u, text: acctTxt(a) || 'Cerca messaggi' }); });
    return out;
}

function acctCleanForm(form) {
    const f = document.importNode(form, true);
    f.querySelectorAll('script, style, iframe, object, embed, link, noscript, #format-buttons, .bbcode-buttons, #colour_palette, #smiley-box, #attach-panel, #attach-panel-multi, input[type=file], input[type=button], input[type=submit], input[type=reset], button, .submit-buttons, .action-bar').forEach(n => n.remove());
    f.querySelectorAll('*').forEach(n => {
        [...n.attributes].forEach(at => { if (/^on/i.test(at.name) || /^\s*javascript:/i.test(at.value)) n.removeAttribute(at.name); });
        if (n.tagName === 'LABEL' && n.getAttribute('for')) n.setAttribute('for', 'seer-uf-' + n.getAttribute('for'));
        if (n.id) n.id = 'seer-uf-' + n.id;
        if (n.tagName === 'A') { n.setAttribute('href', absUrl(n.getAttribute('href') || '')); n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); }
    });
    return f;
}
function acctParseView(main) {
    const blocks = [];
    main.querySelectorAll('.panel, fieldset').forEach(p => {
        if (p.parentElement && p.parentElement.closest('.panel, fieldset')) return;
        const rows = [];
        p.querySelectorAll('dt').forEach(dt => { const dd = dt.nextElementSibling; if (dd && dd.tagName === 'DD') { const l = acctTxt(dt).replace(/[:\uff1a]\s*$/, ''), v = acctTxt(dd); if (l && v) rows.push({ l, v }); } });
        const paras = [...p.querySelectorAll('p')].map(acctTxt).filter(x => x.length > 2).slice(0, 8);
        const title = acctTxt(p.querySelector('h2, h3, legend'));
        if (rows.length || paras.length) blocks.push({ title, rows, paras });
    });
    return blocks;
}
function acctParseTopics(main) {
    const out = [], seen = new Set();
    main.querySelectorAll('a[href*="viewtopic.php"]').forEach(a => {
        const ref = pjTopicRef(a), t = acctTxt(a);
        if (!ref || !ref.key || seen.has(ref.key) || !pjGood(t)) return;
        seen.add(ref.key); out.push({ key: ref.key, url: ref.url, text: t });
    });
    return out;
}
function acctDiscover(doc) {
    doc.querySelectorAll('#tabs a[href*="ucp.php"], #navigation a[href*="ucp.php"], #cp-menu a[href*="ucp.php"]').forEach(a => {
        const q = ((a.getAttribute('href') || '').match(/ucp\.php\?(.*)$/) || [])[1];
        const i = q && (q.match(/(?:^|&)i=([\w-]+)/) || [])[1];
        if (!q || !i || /mode=(?:logout|login)/.test(q)) return;
        const clean = q.replace(/&amp;/g, '&').replace(/&?sid=[0-9a-f]+/i, '');
        const mode = (clean.match(/(?:^|&)mode=([\w-]+)/) || [])[1] || '';
        if (acctMods().some(m => m.q === 'i=' + i + (mode ? '&mode=' + mode : '') || m.q.startsWith('i=' + i + '&mode=' + mode))) return;
        const l = acctTxt(a);
        if (l) acct.extra.push({ k: 'x_' + i + '_' + mode, g: 'Dal sito', l, q: clean, t: 'view' });
    });
}

async function acctLoad(force) {
    if (acct.tab === 'profile') {
        if (acct.profile && !force) return;
        acct.pLoading = true; acct.pErr = ''; renderAccountPage();
        try {
            const uid = await acctUid();
            const { doc } = await acctFetch(SITE_ROOT + 'memberlist.php?mode=viewprofile&u=' + encodeURIComponent(uid));
            acctCheckAuth(doc);
            acct.profile = acctParseProfile(doc, uid);
        } catch (e) { acct.pErr = (e && e.message) || 'errore di rete'; }
        acct.pLoading = false;
        if (view.key === 'account' && acct.tab === 'profile') renderAccountPage();
    } else if (acct.tab === 'settings') {
        if (!acct.pageData || force) acctLoadPage(acctMods().find(m => m.k === acct.page) || acctMods()[0]);
    } else renderAccountPage();
}

async function acctLoadPage(mod, keepMsg) {
    const myMod = mod;
    acct.page = mod.k; acct.pageData = null; acct.pageErr = ''; acct.pageLoading = true;
    if (!keepMsg) acct.saveMsg = null;
    renderAccountPage();
    try {
        const { doc } = await acctFetch(SITE_ROOT + 'ucp.php?' + mod.q);
        acctCheckAuth(doc);
        if (acct.page !== myMod.k) return;
        acctDiscover(doc);
        const main = doc.querySelector('#cp-main, #page-body') || doc.body;
        const err = acctTxt(doc.querySelector('#message .inner, #message'));
        if (!main.querySelector('form, .panel') && err) throw new Error(err.slice(0, 160));
        const d = { mod, topics: [], blocks: [], formEl: null, ro: mod.t === 'ro', submitName: 'submit', submitValue: 'Invia', action: '', hasPager: !!main.querySelector('.pagination') };
        const form = [...main.querySelectorAll('form')].find(f => /ucp\.php/i.test(f.getAttribute('action') || '') && f.querySelector('dl input, dl select, dl textarea'));
        if (form && (mod.t === 'edit' || mod.t === 'ro')) {
            const sub = form.querySelector('input[type=submit][name=submit], button[name=submit], input[name="submit"]');
            if (sub) { d.submitName = sub.getAttribute('name') || 'submit'; d.submitValue = sub.getAttribute('value') || sub.textContent.trim() || 'Invia'; }
            d.action = form.getAttribute('action') || ('./ucp.php?' + mod.q);
            d.formEl = acctCleanForm(form);
            if (d.formEl.querySelector('input[type=password]')) d.ro = true;
            if (d.ro) d.formEl.querySelectorAll('input, select, textarea').forEach(el => { if (el.type !== 'hidden') el.disabled = true; });
        }
        if (mod.t === 'list') d.topics = acctParseTopics(main);
        if (!d.formEl) d.blocks = acctParseView(main);
        acct.pageData = d;
    } catch (e) { if (acct.page === myMod.k) acct.pageErr = (e && e.message) || 'errore di rete'; }
    acct.pageLoading = false;
    if (view.key === 'account' && acct.tab === 'settings') renderAccountPage();
}

const acctFdMap = fd => { const m = new Map(); for (const [k, v] of fd.entries()) { if (typeof v !== 'string') continue; (m.get(k) || (m.set(k, []), m.get(k))).push(v.replace(/\r\n/g, '\n').trim()); } return m; };
function acctPaintMsg() {
    const el = $('seer-uf-msg');
    if (!el) return;
    const m = acct.saveMsg;
    el.innerHTML = m ? `<span class="seer-ac-msg ${esc(m.k)}">${esc(m.t)}</span>` : '';
}
async function acctSave() {
    const d = acct.pageData;
    if (!d || !d.formEl || d.ro || acct.saving) return;
    acct.saving = true; acct.saveMsg = { k: '', t: '\u23f3 Salvataggio in corso\u2026' }; acctPaintMsg();
    try {
        const fd = new FormData(d.formEl);
        if (!fd.has(d.submitName)) fd.append(d.submitName, d.submitValue);
        const sent = acctFdMap(fd);
        const r = await fetch(new URL(d.action, SITE_ROOT).href, { method: 'POST', body: fd, credentials: 'same-origin' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const rdoc = new DOMParser().parseFromString(await r.text(), 'text/html');
        const errEl = rdoc.querySelector('p.error, .error');
        if (errEl && acctTxt(errEl)) throw new Error(acctTxt(errEl).slice(0, 200));
        const msgTxt = acctTxt(rdoc.querySelector('#message .inner, #message'));
        const { doc } = await acctFetch(SITE_ROOT + 'ucp.php?' + d.mod.q, { cache: 'no-store' });
        const form2 = [...doc.querySelectorAll('form')].find(f => /ucp\.php/i.test(f.getAttribute('action') || '') && f.querySelector('dl input, dl select, dl textarea'));
        if (!form2) throw new Error('impossibile rileggere la pagina per verificare');
        const now = acctFdMap(new FormData(document.importNode(form2, true)));
        const bad = [];
        let checked = 0;
        sent.forEach((vals, name) => {
            if (UF_IGNORE.test(name)) return;
            checked++;
            const a = vals.slice().sort().join('\u0001'), b = (now.get(name) || []).slice().sort().join('\u0001');
            if (a !== b) { const el = d.formEl.querySelector('[name="' + name.replace(/"/g, '\\"') + '"]'); const lb = el && el.closest('dl') && acctTxt(el.closest('dl').querySelector('dt label')); bad.push(lb || name); }
        });
        if (!bad.length) acct.saveMsg = { k: 'ok', t: `\u2705 Salvato e verificato sul sito (${checked} campi riletti${msgTxt ? ' \u00b7 ' + msgTxt.slice(0, 80) : ''})` };
        else acct.saveMsg = { k: 'warn', t: `\u26a0\ufe0f Il sito ha risposto ma questi valori non risultano cambiati: ${bad.slice(0, 6).join(', ')}. Controlla sul sito.` };
        acct.saving = false;
        await acctLoadPage(d.mod, true);
        acctPaintMsg();
        return;
    } catch (e) {
        acct.saveMsg = { k: 'err', t: '\u274c Non salvato: ' + ((e && e.message) || 'errore') };
    }
    acct.saving = false; acctPaintMsg();
}

function acctOpenTopic(key, url, text) {
    const it = projMakeItem({ key: String(key), url: url || (SITE_ROOT + 'viewtopic.php?t=' + key), text: text || '' }, 0);
    openDetailModal(it);
}
function closeAccount() {
    const p = acct.prev;
    if (!p) { setView('home'); return; }
    if (p.key === 'section' && p.section) { PG.want = p.page || 1; setView('section', p.section); return; }
    if (['home', 'films', 'series'].includes(p.key)) { PG.want = p.page || 1; setView(p.key); return; }
    setView(['favs', 'releasers'].includes(p.key) ? p.key : 'home');
}
function openAccount(tab) {
    hideModal();
    if (!currentUser) { toast('Accedi al forum per usare questa sezione', 'warn'); window.open(SITE_ROOT + 'ucp.php?mode=login', '_blank'); return; }
    if (view.key !== 'account') acct.prev = { key: view.key, section: view.section, page: PG.page };
    acct.tab = tab || 'profile';
    setView('account');
    acctLoad();
}

function acctProfileHtml() {
    const u = currentUser || {};
    if (acct.pLoading && !acct.profile) return '<p class="seer-status-msg">\u23f3 Lettura del profilo dal sito\u2026</p>';
    if (acct.pErr && !acct.profile) return `<p class="seer-status-msg">\u26a0\ufe0f Impossibile leggere il profilo (${esc(acct.pErr)}).<br><br><button class="seer-load-btn" data-ac="retry">\ud83d\udd04 Riprova</button></p>`;
    const P = acct.profile;
    if (!P) return '';
    const av = P.avatar || u.avatar;
    const st = dlStats();
    const profUrl = SITE_ROOT + 'memberlist.php?mode=viewprofile&u=' + encodeURIComponent(P.uid);
    return `<div class="seer-ac-card"><div class="seer-ac-hero">` +
        (av ? `<img src="${esc(av)}" alt="" referrerpolicy="no-referrer">` : '<div class="seer-ac-av">\ud83d\ude42</div>') +
        `<div><div class="seer-ac-name">${esc(P.name)}</div><div class="seer-ac-sub">${P.rank ? esc(P.rank) + ' \u00b7 ' : ''}ID utente ${esc(P.uid)}</div>` +
        `<div class="seer-pj-row"><a class="seer-chip" href="${esc(profUrl)}" target="_blank" rel="noopener">\ud83d\udd17 Profilo sul sito</a>` +
        P.actions.slice(0, 3).map(a => `<a class="seer-chip" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.text)}</a>`).join('') + `</div></div></div></div>` +
        `<div class="seer-ac-grid">` +
        (P.sections.length ? P.sections.map(s => `<div class="seer-ac-card"><h3>${esc(s.title)}</h3>${s.rows.map(r => `<div class="seer-ac-row"><b>${esc(r.l)}</b><span>${r.h ? `<a href="${esc(r.h)}" target="_blank" rel="noopener">${esc(r.v)}</a>` : esc(r.v)}</span></div>`).join('')}</div>`).join('')
            : '<div class="seer-ac-card"><p class="seer-ac-note">Il sito non ha esposto altri campi pubblici in questa pagina.</p></div>') +
        `<div class="seer-ac-card"><h3>\ud83d\udd2e In MirSeer</h3>` +
        `<div class="seer-ac-row"><b>Release segnate come scaricate</b><span>${seenSet.size}</span></div>` +
        `<div class="seer-ac-row"><b>In watchlist</b><span>${Object.keys(favs).length}</span></div>` +
        `<div class="seer-ac-row"><b>Releaser/titoli seguiti</b><span>${Object.keys(follows.rel).length + Object.keys(follows.title).length}</span></div>` +
        `<div class="seer-ac-row"><b>Magnet tracciati</b><span>${st.n}</span></div></div></div>`;
}

function acctPaneHtml() {
    const mod = acctMods().find(m => m.k === acct.page) || acctMods()[0];
    const siteUrl = SITE_ROOT + 'ucp.php?' + mod.q;
    const head = `<h3>${esc(mod.l)} <a class="seer-chip" style="margin-left:8px;font-weight:600" href="${esc(siteUrl)}" target="_blank" rel="noopener">\ud83d\udd17 Apri sul sito</a></h3>`;
    if (acct.pageLoading) return head + '<p class="seer-ac-note">\u23f3 Lettura dal sito\u2026</p>';
    if (acct.pageErr) return head + `<p class="seer-ac-note">\u26a0\ufe0f ${esc(acct.pageErr)}</p><button class="seer-load-btn" data-ac="mod" data-v="${esc(mod.k)}">\ud83d\udd04 Riprova</button>`;
    const d = acct.pageData;
    if (!d) return head;
    if (d.formEl) {
        return head + (d.ro ? '<p class="seer-ac-note">Sola lettura: modificare nome utente, email o password richiede la password attuale, quindi va fatto sul sito originale.</p>'
            : '<p class="seer-ac-note">Le modifiche vengono inviate al sito con la tua sessione attiva e poi riverificate rileggendo la pagina.</p>') +
            `<div class="seer-uf" id="seer-uf-slot"></div>` +
            (d.ro ? '' : `<div class="seer-uf-bar"><button class="seer-load-btn" data-ac="save">\ud83d\udcbe Salva sul sito</button><span id="seer-uf-msg"></span></div>`);
    }
    if (mod.t === 'list') {
        return head + (d.topics.length ? `<div class="seer-ac-list">${d.topics.map(t => `<button data-ac="open" data-k="${esc(t.key)}" data-u="${esc(t.url)}" data-t="${esc(t.text)}">${esc(t.text)}</button>`).join('')}</div>` : '<p class="seer-ac-note">Nessun elemento.</p>') +
            (d.hasPager ? '<p class="seer-ac-note">Ci sono altre pagine: aprile dal sito.</p>' : '');
    }
    return head + (d.blocks.length ? d.blocks.map(b => `<div style="margin-bottom:12px">${b.title ? `<div class="seer-ac-navh">${esc(b.title)}</div>` : ''}${b.rows.map(r => `<div class="seer-ac-row"><b>${esc(r.l)}</b><span>${esc(r.v)}</span></div>`).join('')}${b.paras.map(p => `<p class="seer-ac-note">${esc(p)}</p>`).join('')}</div>`).join('')
        : '<p class="seer-ac-note">Questa sezione non espone dati leggibili qui: aprila sul sito.</p>');
}
function acctSettingsHtml() {
    const mods = acctMods();
    const groups = [...new Set(mods.map(m => m.g))];
    const nav = groups.map(g => `<div class="seer-ac-navh">${esc(g)}</div>` + mods.filter(m => m.g === g).map(m => `<button class="seer-facet ${acct.page === m.k ? 'active' : ''}" data-ac="mod" data-v="${esc(m.k)}">${esc(m.l)}</button>`).join('')).join('');
    return `<div class="seer-ac-split"><div class="seer-ac-nav">${nav}<a class="seer-chip" style="margin-top:10px" href="${esc(SITE_ROOT + 'ucp.php?i=pm&folder=inbox')}" target="_blank" rel="noopener">\u2709\ufe0f Messaggi privati (sito)</a></div><div class="seer-ac-card" id="seer-ac-pane">${acctPaneHtml()}</div></div>`;
}

const ST_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#84cc16'];
function acctStatsHtml() {
    const S = dlStats();
    const byBytes = acct.relMetric === 'size';
    const tot = byBytes ? S.bytes : S.n;
    const rels = Object.entries(S.rel).sort((a, b) => (byBytes ? b[1].b - a[1].b : b[1].n - a[1].n));
    const top = rels.slice(0, 6).map(([name, o], i) => ({ name, v: byBytes ? o.b : o.n, o, color: ST_COLORS[i] }));
    const restV = rels.slice(6).reduce((s, [, o]) => s + (byBytes ? o.b : o.n), 0);
    if (restV > 0) top.push({ name: 'Altri', v: restV, o: null, color: '#64748b' });
    let acc = 0;
    const segs = top.map(p => { p.pct = tot ? p.v / tot * 100 : 0; const a = acc; acc += p.pct; return `${p.color} ${a.toFixed(2)}% ${acc.toFixed(2)}%`; });
    const pie = tot ? `background:conic-gradient(${segs.join(',')})` : 'background:rgba(127,127,127,.2)';
    const leader = top[0] && top[0].o ? top[0] : null;
    const qDefs = [['4k', '4K'], ['1080', '1080p'], ['720', '720p'], ['sd', 'SD'], ['other', 'Altro']];
    const qMax = Math.max(1, ...qDefs.map(([k]) => S.q[k].n));
    const now = new Date(), months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); months.push({ k, label: d.toLocaleDateString('it-IT', { month: 'short' }), b: (S.months[k] || {}).b || 0, n: (S.months[k] || {}).n || 0 }); }
    const mMax = Math.max(1, ...months.map(m => m.b || m.n));
    const recent = S.rows.slice().sort((a, b) => (b.last || 0) - (a.last || 0)).slice(0, 12);
    if (!S.n) return `<div class="seer-ac-card"><h3>\ud83d\udcca La mia attivit\u00e0</h3><p class="seer-ac-note">Nessun download tracciato finora. Ogni volta che copi, apri o invii un magnet da MirSeer (o clicchi un magnet nelle pagine del forum) la release viene registrata qui, solo sul tuo browser. I clic precedenti all'aggiornamento non sono recuperabili.</p></div>`;
    return `<div class="seer-st-cards">` +
        `<div class="seer-ac-card"><div class="seer-st-num">${esc(fmtSize(S.bytes) || '0 B')}</div><div class="seer-st-lbl">Spazio totale scaricato</div></div>` +
        `<div class="seer-ac-card"><div class="seer-st-num">${S.n}</div><div class="seer-st-lbl">Release distinte (${S.clicks} clic)</div></div>` +
        `<div class="seer-ac-card"><div class="seer-st-num">${leader ? esc(leader.name) : '\u2014'}</div><div class="seer-st-lbl">Releaser preferito${leader ? ' \u00b7 ' + Math.round(leader.pct) + '%' : ''}</div></div>` +
        `<div class="seer-ac-card"><div class="seer-st-num">${S.n - S.noSize}/${S.n}</div><div class="seer-st-lbl">Release con dimensione nota</div></div></div>` +
        `<div class="seer-st-two"><div class="seer-ac-card"><h3>\ud83c\udfc6 Releaser preferiti</h3>` +
        `<div class="seer-ac-tabs"><button class="seer-facet ${byBytes ? '' : 'active'}" data-ac="metric" data-v="count">Per numero</button><button class="seer-facet ${byBytes ? 'active' : ''}" data-ac="metric" data-v="size">Per spazio</button></div>` +
        `<div class="seer-pie-wrap"><div class="seer-pie" style="${pie}"><div class="seer-pie-c">${leader ? Math.round(leader.pct) + '%' : ''}<small>${leader ? esc(leader.name) : ''}</small></div></div>` +
        `<div class="seer-leg">${top.map(p => `<${p.o ? 'button data-ac="rel" data-v="' + esc(p.name) + '"' : 'div'}><i style="background:${p.color}"></i><b>${esc(p.name)}</b><em>${Math.round(p.pct)}% \u00b7 ${p.o ? p.o.n + ' \u00b7 ' + esc(fmtSize(p.o.b) || '?') : esc(byBytes ? (fmtSize(p.v) || '?') : String(p.v))}</em></${p.o ? 'button' : 'div'}>`).join('')}</div></div></div>` +
        `<div class="seer-ac-card"><h3>\ud83c\udf9e\ufe0f Distribuzione qualit\u00e0</h3>${qDefs.map(([k, l]) => `<div class="seer-qrow"><b>${l}</b><div class="seer-bar"><i style="width:${(S.q[k].n / qMax * 100).toFixed(1)}%"></i></div><em>${S.q[k].n} \u00b7 ${S.n ? Math.round(S.q[k].n / S.n * 100) : 0}% \u00b7 ${esc(fmtSize(S.q[k].b) || '\u2014')}</em></div>`).join('')}` +
        `<h3 style="margin-top:14px">\ud83d\udcc5 Ultimi 6 mesi</h3><div class="seer-months">${months.map(m => `<div><span>${m.b ? esc(fmtSize(m.b)) : m.n}</span><i style="height:${((m.b || m.n) / mMax * 90).toFixed(0)}px"></i><span>${esc(m.label)}</span></div>`).join('')}</div></div></div>` +
        `<div class="seer-ac-card"><h3>\ud83d\udd53 Ultimi download</h3><div class="seer-ac-list">${recent.map(r => `<button data-ac="open" data-k="${esc(r.id)}" data-u="${esc(r.u)}" data-t="${esc(r.t)}">${esc(r.t || '(senza titolo)')} <small style="opacity:.6">\u00b7 ${esc(r.r || '\u2014')} \u00b7 ${esc(fmtSize(r.b) || '?')}</small></button>`).join('')}</div>` +
        `<div class="seer-uf-bar"><button class="seer-facet" data-ac="export">\u2b07\ufe0f Esporta JSON</button><button class="seer-facet" data-ac="clear">\ud83d\uddd1\ufe0f Azzera statistiche</button></div>` +
        `<p class="seer-ac-note">Dati salvati solo nel tuo browser. Una release conta una volta anche se clicchi pi\u00f9 volte lo stesso magnet. Le dimensioni vengono dal magnet (parametro xl) o dalla scheda; se mancano, la release conta nei numeri ma non negli spazi.</p></div>`;
}

function renderAccountPage() {
    if (view.key !== 'account') return;
    const box = $('seer-main-list');
    box.classList.remove('seer-grid');
    lastDisplayed = [];
    const cnt = $('seer-count'); if (cnt) cnt.innerText = '';
    const tabs = [['profile', '\ud83d\udc64 Il mio profilo'], ['settings', '\u2699\ufe0f Impostazioni utente'], ['stats', '\ud83d\udcca La mia attivit\u00e0']];
    const body = acct.tab === 'profile' ? acctProfileHtml() : acct.tab === 'settings' ? acctSettingsHtml() : acctStatsHtml();
    const keep = acct.tab === 'settings' && acct.pageData && acct.pageData.formEl;
    if (keep && keep.parentNode) keep.parentNode.removeChild(keep);
    box.innerHTML = `<div class="seer-ac-tabs"><button class="seer-facet" data-ac="back">\u2190 Indietro</button>${tabs.map(([k, l]) => `<button class="seer-facet ${acct.tab === k ? 'active' : ''}" data-ac="tab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
    if (keep) { const slot = $('seer-uf-slot'); if (slot) slot.appendChild(keep); acctPaintMsg(); }
}

function acctClick(e) {
    const b = e.target.closest('[data-ac]');
    if (!b || view.key !== 'account') return;
    e.preventDefault();
    const a = b.dataset.ac, v = b.dataset.v;
    if (a === 'back') closeAccount();
    else if (a === 'tab') { acct.tab = v; renderAccountPage(); acctLoad(); }
    else if (a === 'mod') { const m = acctMods().find(x => x.k === v); if (m) acctLoadPage(m); }
    else if (a === 'save') acctSave();
    else if (a === 'retry') acctLoad(true);
    else if (a === 'metric') { acct.relMetric = v; renderAccountPage(); }
    else if (a === 'rel') openReleaser(v, null, null);
    else if (a === 'open') acctOpenTopic(b.dataset.k, b.dataset.u, b.dataset.t);
    else if (a === 'export') dlExport();
    else if (a === 'clear') { if (confirm('Azzerare tutte le statistiche di download di MirSeer? L\'operazione non \u00e8 annullabile.')) { dlLog = {}; saveDlNow(); renderAccountPage(); } }
}

function acctInit() {
    $('seer-main-list').addEventListener('click', acctClick);
    $('seer-user-menu').addEventListener('click', e => {
        const a = e.target.closest('[data-acc]');
        if (!a) return;
        e.preventDefault();
        $('seer-user-menu').classList.remove('open');
        openAccount(a.dataset.acc);
    });
    document.addEventListener('click', e => {
        const a = e.target && e.target.closest ? e.target.closest('a[href^="magnet:"]') : null;
        if (!a || a.dataset.seerTracked || a.closest('#mirseer-app')) return;
        trackDl(forumPageItem(), [a.getAttribute('href')], 'forum');
    }, true);
}


function init() {
    if ($('mirseer-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'mirseer-fab';
    fab.innerHTML = `${logoSvg('seer-iris-fab')}<span>MirSeer</span>`;
    document.body.appendChild(fab);

    const toasts = document.createElement('div');
    toasts.id = 'seer-toasts';
    document.body.appendChild(toasts);

    const app = document.createElement('div');
    app.id = 'mirseer-app';
    app.innerHTML = `
        <div class="seer-nav">
            <div style="display:flex; align-items:center; gap:14px;">
                <button class="seer-menu-btn" id="seer-menu-btn" aria-label="Menu">☰</button>
                <div class="seer-brand" id="seer-nav-brand">${logoSvg('seer-iris-nav')}<span>MirSeer</span></div>
            </div>
            <div style="display:flex; align-items:center; gap:12px; flex:1; justify-content:flex-end;">
                <div class="seer-search-wrap">
                    <select class="seer-search-filter" id="seer-search-section-filter" title="Ambito della ricerca"></select>
                    <input type="text" class="seer-search" id="seer-search-input" placeholder="Cerca…" />
                    <button class="seer-search-btn" id="seer-search-submit" title="Cerca">🔍</button>
                </div>
                <div class="seer-user" id="seer-user">
                    <button class="seer-user-btn" id="seer-user-btn" aria-label="Account">👤</button>
                    <div class="seer-user-menu" id="seer-user-menu"></div>
                </div>
                <button class="seer-theme-btn" id="seer-settings-btn" title="Impostazioni">⚙️</button>
                <button class="seer-theme-btn" id="seer-theme-btn" title="Cambia tema">☀️</button>
                <button class="seer-exit-btn" id="seer-exit" title="Esci (Esc)">Esci</button>
            </div>
        </div>

        <div class="seer-shell">
            <aside class="seer-sidebar" id="seer-sidebar">
                <div class="seer-side-title">Navigazione</div>
                <button class="seer-side-item active" data-nav="home"><span class="ico">🏠</span><span class="lbl">Home</span></button>
                <button class="seer-side-item" data-nav="releasers"><span class="ico">🏆</span><span class="lbl">Releasers</span></button>
<button class="seer-side-item" data-nav="favs"><span class="ico">⭐</span><span class="lbl">Watchlist</span><span class="seer-side-count" id="seer-fav-count"></span></button>
                <div class="seer-side-title">🧭 Sezioni</div>
                <div id="seer-side-sections"></div>
            </aside>

            <main class="seer-content">
                <section id="seer-hero"></section>
                <div class="seer-header-row">
                    <h2 class="seer-section-title" id="seer-section-title">🆕 Ultime Release</h2>
                    <div class="seer-header-tools">
                        <span id="seer-count" class="seer-count-badge">Caricamento...</span>
                        <button class="seer-facet" id="seer-sel-btn" title="Selezione multipla">☑ Seleziona</button>
                        <div class="seer-view-toggle" id="seer-view-toggle">
                            <button data-view="list" title="Vista lista">☰</button>
                            <button data-view="grid" title="Vista locandine">▦</button>
                        </div>
                        <select id="seer-sort-select" class="seer-sort-select" title="Ordina per">
                            <option value="recent">🕒 Data di pubblicazione</option>
                            <option value="activity">💬 Ultima attività</option>
                            <option value="views">🔥 Più visti</option>
                            <option value="title">🔤 Titolo (A - Z)</option>
                            <option value="replies">📈 Più risposte</option>
                            <option value="size">💾 Dimensione (maggiore)</option>
                        </select>
                    </div>
                </div>
                <div class="seer-rel-panel" id="seer-rel-panel"></div>
                <div class="seer-rel-search" id="seer-rel-search">
                    <div class="seer-search-wrap">
                        <input type="text" class="seer-search" id="seer-rel-q" placeholder="Cerca tra le release di questo releaser…  (Invio = cerca su tutto il forum)" autocomplete="off" spellcheck="false" />
                        <button class="seer-search-btn" id="seer-rel-submit" title="Cerca tra tutte le sue release (Invio)">🔍</button>
                    </div>
                    <span class="seer-rel-search-hint" id="seer-rel-hint"></span>
                </div>
                <div class="seer-wl-panel" id="seer-wl-panel"></div>
                <div id="seer-search-hint"></div>
                <div class="seer-facets" id="seer-facets"></div>

                <div class="seer-adv" id="seer-adv">
                    <div class="seer-adv-genres" id="seer-genres"></div>
                    <div class="seer-adv-item" id="seer-adv-vote-wrap">
                        <span>⭐ Valutazione TMDb</span>
                        <input type="range" id="seer-adv-vote" min="0" max="9" step="0.5" value="0" />
                        <b id="seer-adv-vote-val">Tutte</b>
                    </div>
                    <div class="seer-adv-item">
                        <span>📅 Anno</span>
                        <input type="number" class="seer-adv-input" id="seer-adv-yfrom" placeholder="2015" min="1900" max="2100" />
                        <span>–</span>
                        <input type="number" class="seer-adv-input" id="seer-adv-yto" placeholder="2026" min="1900" max="2100" />
                    </div>
                    <div class="seer-adv-item">
                        <span>👤 Releaser / Crew</span>
                        <input type="text" class="seer-adv-input wide" id="seer-adv-rel" list="seer-adv-rel-list" placeholder="Tutti i releaser" autocomplete="off" spellcheck="false" />
                        <datalist id="seer-adv-rel-list"></datalist>
                    </div>
                    <div class="seer-adv-item">
                        <span>💾 Dimensione (GiB)</span>
                        <input type="number" class="seer-adv-input" id="seer-adv-smin" placeholder="min" min="0" step="0.5" />
                        <span>–</span>
                        <input type="number" class="seer-adv-input" id="seer-adv-smax" placeholder="max" min="0" step="0.5" />
                    </div>
                    <div class="seer-adv-item" id="seer-adv-codec-wrap">
                        <span>🎞️ Codec</span>
                        <select class="seer-adv-input" id="seer-adv-codec">
                            <option value="all">Tutti</option>
                            <option value="av1">AV1</option>
                            <option value="hevc">HEVC / H.265</option>
                            <option value="avc">AVC / H.264</option>
                        </select>
                    </div>
                    <span class="seer-adv-note" id="seer-adv-note"></span>
                </div>
                <div class="seer-proj-head" id="seer-proj-head"></div>
                <div class="seer-pager" id="seer-pager-top"></div>
                <div class="seer-list seer-main-list" id="seer-main-list"></div>
                <div class="seer-pager" id="seer-pager"></div>
                <div style="margin:0;">
                    <button id="seer-load-more-btn" class="seer-load-btn" style="display:none;">📥 Carica Altre Uscite</button>
                </div>
            </main>
        </div>

        <div id="seer-batch-bar">
            <span class="seer-batch-count" id="seer-batch-count">0 selezionati</span>
            <span class="seer-batch-status" id="seer-batch-status"></span>
            <button class="seer-tool-btn" id="seer-batch-all">☑ Tutti</button>
            <button class="seer-tool-btn" id="seer-batch-none">☐ Nessuno</button>
            <button class="seer-tool-btn" id="seer-batch-seen">✓ Segna scaricati</button>
            <button class="seer-tool-btn" id="seer-batch-copy">📋 Copia magnet</button>
            <button class="seer-tool-btn primary" id="seer-batch-send">⬇️ Invia</button>
            <button class="seer-tool-btn" id="seer-batch-cancel">✕</button>
        </div>

        <div id="seer-modal-overlay">
            <button class="seer-modal-nav prev" id="seer-modal-prev" aria-label="Precedente">‹</button>
            <button class="seer-modal-nav next" id="seer-modal-next" aria-label="Successivo">›</button>
            <div class="seer-detail-window">
                <button class="seer-modal-close" id="seer-modal-close-btn">&times;</button>
                <div class="seer-modal-left" id="seer-modal-left-art"></div>
                <div class="seer-modal-right">
                    <div class="seer-modal-scroll">
                        <h2 class="seer-modal-title" id="seer-modal-title"></h2>
                        <div class="seer-modal-metarow" id="seer-modal-metarow"></div>
                        <div class="seer-chips-row" id="seer-modal-chips"></div>
                        <div class="seer-specs-ribbon" id="seer-modal-specs"></div>
                        <div class="seer-version-bar" id="seer-version-bar" style="display:none;"></div>
                        <div class="seer-synopsis-box">
                            <div class="seer-synopsis-head">Trama / Sinossi</div>
                            <p class="seer-synopsis-body clamped" id="seer-modal-overview"></p>
                            <button class="seer-syn-toggle" id="seer-syn-toggle">Mostra altro</button>
                        </div>
                        <div class="seer-text-box" id="seer-modal-text"></div>
                        <details class="seer-mediainfo" id="seer-mediainfo-wrap">
                            <summary>🔬 Dettagli tecnici e MediaInfo</summary>
                            <div class="seer-raw-box" id="seer-modal-raw"></div>
                            <pre id="seer-mediainfo-pre"></pre>
                        </details>
                    </div>
                    <div class="seer-modal-foot">
                        <div class="seer-modal-tools" id="seer-modal-tools"></div>
                        <div class="seer-magnet-box" id="seer-magnet-box">
                            <button class="seer-action-btn" id="seer-send-all-btn" style="display:none;"><span>⬇️</span> Invia Tutti</button>
                            <div class="seer-magnet-list" id="seer-magnet-list"></div>
                        </div>
                        <button class="seer-action-btn" id="seer-copy-btn"><span>📋</span> Copia Magnet Link negli Appunti</button>
                        <button class="seer-action-btn" id="seer-send-btn" style="display:none;"><span>⬇️</span> Invia al client torrent</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="seer-trailer-overlay">
            <div class="seer-trailer-bar">
                <span id="seer-trailer-title">▶ Trailer</span>
                <span style="display:flex; align-items:center; gap:14px;">
                    <a id="seer-trailer-yt" href="#" target="_blank" rel="noopener noreferrer">Apri su YouTube ↗</a>
                    <button class="seer-modal-close" id="seer-trailer-close" aria-label="Chiudi">&times;</button>
                </span>
            </div>
            <iframe class="seer-trailer-frame" id="seer-trailer-frame" src="about:blank" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>

        <div id="seer-settings-overlay">
            <div class="seer-settings-window">
                <div class="seer-settings-head">
                    <button class="seer-modal-close" id="seer-settings-close" aria-label="Chiudi">&times;</button>
                    <h2 class="seer-settings-title">⚙️ Impostazioni</h2>
                </div>
                <div class="seer-settings-body">

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">🎞️ TMDb</h3>
                        <label class="seer-settings-label" for="seer-settings-key">TMDb API Key</label>
                        <input type="password" class="seer-settings-input" id="seer-settings-key" placeholder="Incolla qui la tua API Key (v3)" autocomplete="off" spellcheck="false" />
                        <p class="seer-settings-help">
                            Opzionale: attiva locandine, sfondi, trame, voti, generi e trailer da TMDb per Film e Serie TV.
                            Puoi ottenerla gratis su <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">themoviedb.org/settings/api</a>.
                            La chiave resta salvata nel tuo browser e sopravvive agli aggiornamenti dello script.
                        </p>
                        <div class="seer-settings-status" id="seer-settings-status"></div>
                        <div class="seer-settings-actions">
                            <button class="seer-action-btn" id="seer-settings-save">💾 Salva</button>
                            <button class="seer-load-btn" id="seer-settings-clear">🗑️ Rimuovi</button>
                        </div>
                    </section>

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">🔥 Carosello "In Tendenza"</h3>
                        <div class="seer-set-row">
                            <div class="seer-set-text">
                                <span class="seer-set-label">Mostra il banner in Home</span>
                                <span class="seer-set-sub">Se disattivato, il banner non viene mostrato né caricato.</span>
                            </div>
                            <label class="seer-switch" title="Mostra / nascondi il carosello">
                                <input type="checkbox" id="seer-pref-hero" />
                                <span class="seer-switch-slider"></span>
                            </label>
                        </div>
                        <div class="seer-set-row">
                            <div class="seer-set-text">
                                <span class="seer-set-label">Velocità autoplay</span>
                                <span class="seer-set-sub">Con "Disattivato" si naviga solo con frecce e pallini.</span>
                            </div>
                            <select class="seer-settings-select" id="seer-pref-hero-speed">
                                <option value="5000">⚡ Automatico rapido (5 secondi)</option>
                                <option value="10000">🐢 Automatico lento (10 secondi)</option>
                                <option value="0">⏸️ Disattivato (solo manuale)</option>
                            </select>
                        </div>
                    </section>

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">🎨 Aspetto</h3>
                        <div class="seer-set-row">
                            <div class="seer-set-text"><span class="seer-set-label">Colore principale</span><span class="seer-set-sub">Pulsanti, evidenziazioni e bagliori.</span></div>
                            <div class="seer-swatches" id="seer-swatches"></div>
                        </div>
                        <div class="seer-set-row">
                            <span class="seer-set-label">Colore personalizzato</span>
                            <input type="color" id="seer-accent-custom" value="#6366f1" />
                        </div>
                        <div class="seer-set-row">
                            <div class="seer-set-text"><span class="seer-set-label">Densità lista</span><span class="seer-set-sub">"Compatta" riduce le righe e nasconde le anteprime.</span></div>
                            <select class="seer-settings-select" id="seer-pref-density">
                                <option value="comfortable">Comoda</option>
                                <option value="compact">Compatta</option>
                            </select>
                        </div>
                    </section>

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">🧭 Navigazione e avvio</h3>
                        <div class="seer-set-row">
                            <div class="seer-set-text">
                                <span class="seer-set-label">Sezione di avvio predefinita</span>
                                <span class="seer-set-sub">Schermata aperta alla prima apertura di MirSeer in ogni pagina.</span>
                            </div>
                            <select class="seer-settings-select" id="seer-pref-start"></select>
                        </div>
                    </section>

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">🧲 Azione Magnet predefinita</h3>
                        <div class="seer-set-row">
                            <div class="seer-set-text">
                                <span class="seer-set-label">Quando premo il pulsante Magnet</span>
                                <span class="seer-set-sub">"Apri nel client" richiede un client Torrent associato ai link magnet.</span>
                            </div>
                            <select class="seer-settings-select" id="seer-pref-magnet">
                                <option value="copy">📋 Copia Magnet negli appunti</option>
                                <option value="open">🧲 Apri direttamente nel client Torrent</option>
                            </select>
                        </div>
                    </section>

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">⬇️ Client torrent (WebUI)</h3>
                        <div class="seer-set-row">
                            <div class="seer-set-text">
                                <span class="seer-set-label">Invia i magnet direttamente al client</span>
                                <span class="seer-set-sub">Aggiunge il pulsante "Invia a…" senza passare dal gestore di protocollo del sistema operativo.</span>
                            </div>
                            <select class="seer-settings-select" id="seer-pref-tc">
                                <option value="off">🚫 Disattivato</option>
                                <option value="qbittorrent">qBittorrent</option>
                                <option value="transmission">Transmission</option>
                            </select>
                        </div>
                        <label class="seer-settings-label" for="seer-tc-url">Indirizzo WebUI</label>
                        <input type="text" class="seer-settings-input" id="seer-tc-url" placeholder="http://localhost:8080" autocomplete="off" spellcheck="false" />
                        <label class="seer-settings-label" for="seer-tc-user">Utente (opzionale)</label>
                        <input type="text" class="seer-settings-input" id="seer-tc-user" autocomplete="off" spellcheck="false" />
                        <label class="seer-settings-label" for="seer-tc-pass">Password (opzionale)</label>
                        <input type="password" class="seer-settings-input" id="seer-tc-pass" autocomplete="new-password" spellcheck="false" />
                        <p class="seer-settings-help">
                            qBittorrent: attiva "Interfaccia Web" in Opzioni › Web UI (porta predefinita 8080). Transmission: porta predefinita 9091.<br>
                            <b>Nota:</b> al primo invio Tampermonkey mostrerà un popup che chiede il permesso di connettersi al tuo indirizzo: clicca <b>"Consenti sempre"</b>.
                            Le credenziali restano salvate solo nel tuo gestore di userscript.
                        </p>
                        <div class="seer-settings-status" id="seer-tc-status"></div>
                        <div class="seer-settings-actions">
                            <button class="seer-action-btn" id="seer-tc-test">🔌 Salva e testa connessione</button>
                        </div>
                    </section>
                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">📁 Cartelle di download</h3>
                        <p class="seer-settings-help">
                            Cartella in cui il client salva i file, per tipo di contenuto (es. <code>/DATA/Film</code>).
                            Vale solo per "Invia a…". Lascia vuoto per usare la cartella predefinita del client.
                            Il percorso è quello visto dal client: se gira in Docker o su un NAS, usa il percorso interno al container.
                        </p>
                        <div id="seer-path-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                    </section>

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">📦 Backup configurazione</h3>
                        <p class="seer-settings-help">
                            Esporta preferiti, cronologia "scaricati", cartelle di download e preferenze in <code>mirseer_backup.json</code> e ripristinali su un altro browser.
                            L'importazione unisce preferiti e "scaricati" a quelli esistenti. La chiave TMDb e la password del client torrent <b>non</b> vengono esportate.
                        </p>
                        <div class="seer-settings-status" id="seer-backup-status"></div>
                        <div class="seer-settings-actions">
                            <button class="seer-action-btn" id="seer-export-btn">📤 Esporta configurazione</button>
                            <button class="seer-load-btn" id="seer-import-btn">📥 Importa configurazione</button>
                            <input type="file" id="seer-import-file" accept=".json,application/json" style="display:none;" />
                        </div>
                    </section>

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">💾 Cache e memoria</h3>
                        <div class="seer-cache-info" id="seer-cache-info"></div>
                        <button class="seer-danger-btn" id="seer-cache-clear">🗑️ Svuota tutta la cache locale</button>
                        <div class="seer-settings-status" id="seer-cache-status"></div>
                        <p class="seer-settings-help">La cache usa IndexedDB (nessun limite pratico di spazio). Preferiti e stato "Scaricato" non vengono cancellati.</p>
                    </section>

                    <section class="seer-set-group">
                        <h3 class="seer-set-group-title">⌨️ Scorciatoie da tastiera</h3>
                        <p class="seer-kbd-help">
                            <kbd>/</kbd> o <kbd>Ctrl</kbd>+<kbd>K</kbd> — cerca<br>
                            <kbd>Esc</kbd> — chiude finestra / trailer / impostazioni, altrimenti esce da MirSeer<br>
                            <kbd>←</kbd> <kbd>→</kbd> — cambia slide del carosello<br>
                            <kbd>j</kbd>/<kbd>k</kbd> — elemento successivo / precedente (griglia: <kbd>h</kbd>/<kbd>l</kbd> di lato)<br>
                            <kbd>Enter</kbd> apri · <kbd>f</kbd> watchlist · <kbd>d</kbd> scaricato · <kbd>x</kbd> seleziona<br>
                            Nella scheda: <kbd>←</kbd> <kbd>→</kbd> precedente / successivo (o swipe sul telefono)
                        </p>
                    </section>

                    <p class="seer-settings-help">Le preferenze vengono salvate automaticamente. Solo la chiave TMDb richiede di premere "Salva".</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(app);
    updateFavCount();
    $('seer-sort-select').value = sortMode;

    const themeBtn = $('seer-theme-btn');
    let theme = loadTheme();
    const applyTheme = t => {
        app.classList.toggle('seer-light', t === 'light');
        themeBtn.textContent = t === 'light' ? '🌙' : '☀️';
        themeBtn.title = t === 'light' ? 'Passa al tema scuro' : 'Passa al tema chiaro';
    };
    applyTheme(theme);
    themeBtn.onclick = () => {
        theme = theme === 'light' ? 'dark' : 'light';
        applyTheme(theme);
        saveTheme(theme);
    };

    const sOverlay = $('seer-settings-overlay');
    const sInput = $('seer-settings-key');
    const sStatus = $('seer-settings-status');
    const sSave = $('seer-settings-save');
    const setStatus = (txt, cls = '') => { sStatus.textContent = txt; sStatus.className = 'seer-settings-status' + (cls ? ' ' + cls : ''); };
    const closeSettings = () => { sOverlay.style.display = 'none'; };

    $('seer-settings-btn').onclick = () => {
        const k = getTmdbKey();
        sInput.value = k;
        setStatus(k ? 'Chiave TMDb attiva.' : 'Nessuna chiave impostata: TMDb disattivato.');
        syncSettingsUI();
        sOverlay.style.display = 'flex';
        sInput.focus();
    };
    $('seer-settings-close').onclick = closeSettings;
    sOverlay.onclick = e => { if (e.target === sOverlay) closeSettings(); };
    sInput.onkeydown = e => { if (e.key === 'Enter') sSave.click(); };

    sSave.onclick = async () => {
        const key = sInput.value.trim();
        if (key === getTmdbKey()) { setStatus(key ? 'Nessuna modifica.' : 'Nessuna chiave impostata.'); return; }

        if (key) {
            sSave.disabled = true;
            setStatus('Verifica della chiave in corso…');
            const ok = await checkTmdbKey(key);
            sSave.disabled = false;
            if (ok === false) { setStatus('Chiave non valida: usa la "API Key" (v3) del tuo account TMDb.', 'err'); return; }
            applyTmdbKey(key);
            setStatus(ok === null ? 'Salvata, ma non è stato possibile verificarla (rete?).' : '✅ Chiave valida e salvata.', ok === null ? '' : 'ok');
            toast(ok === null ? 'Chiave TMDb salvata (non verificata)' : 'Chiave TMDb valida e salvata', ok === null ? 'warn' : 'ok');
        } else {
            applyTmdbKey('');
            setStatus('Chiave rimossa: TMDb disattivato.', 'ok');
            toast('Chiave TMDb rimossa');
        }

        if (main.loaded) {
            renderDeck(localFilterValue());
            if (settings.heroEnabled) buildHero();
        }
        updateCacheInfo();
        setTimeout(closeSettings, 1100);
    };
    $('seer-settings-clear').onclick = () => { sInput.value = ''; sSave.click(); };

    const sHero = $('seer-pref-hero');
    const sHeroSpeed = $('seer-pref-hero-speed');
    const sStart = $('seer-pref-start');
    const sMagnet = $('seer-pref-magnet');
    const sTc = $('seer-pref-tc');
    const sTcUrl = $('seer-tc-url');
    const sTcUser = $('seer-tc-user');
    const sTcPass = $('seer-tc-pass');
    const sTcStatus = $('seer-tc-status');
    const sTcTest = $('seer-tc-test');
    const sCacheInfo = $('seer-cache-info');
    const sCacheStatus = $('seer-cache-status');
    const sCacheClear = $('seer-cache-clear');
    const sBackupStatus = $('seer-backup-status');
    const CACHE_BTN_LABEL = '🗑️ Svuota tutta la cache locale';
    const sPathList = $('seer-path-list');
    const buildPathInputs = () => {
        const paths = tcPaths();
        sPathList.innerHTML = sectionList.map(s =>
            `<div class="seer-set-row"><span class="seer-set-label" style="min-width:130px;">${s.ico} ${esc(s.name)}</span>` +
            `<input type="text" class="seer-settings-input seer-path-input" style="flex:1 1 200px; width:auto;" data-sec="${esc(s.name)}" value="${esc(paths[s.name] || '')}" placeholder="/DATA/${esc(s.name.replace(/\s+/g, ''))}" autocomplete="off" spellcheck="false" /></div>`
        ).join('');
    };
    sPathList.onchange = e => {
        const inp = e.target.closest('.seer-path-input');
        if (!inp) return;
        const paths = { ...tcPaths() };
        const v = inp.value.trim();
        if (v) paths[inp.dataset.sec] = v; else delete paths[inp.dataset.sec];
        setPref('tcPaths', paths);
    };

    const buildStartOptions = () => {
        sStart.innerHTML = '<option value="home">🏠 Home (Ultime uscite)</option><option value="favs">⭐ Watchlist</option>' +
            sectionList.map(sec => {
                const v = sec.nav || ('sec:' + sec.name);
                return `<option value="${esc(v)}" ${(sec.nav || sec.fid) ? '' : 'disabled'}>${sec.ico} ${esc(sec.name)}</option>`;
            }).join('');
    };

    function updateCacheInfo() {
        const st = cacheStats();
        sCacheInfo.innerHTML =
            `Elementi in cache: <b>${st.topics}</b> topic<br>` +
            `Risposte TMDb salvate: <b>${st.tmdb}</b> · Immagini monitorate: <b>${st.images}</b><br>` +
            `Preferiti: <b>${Object.keys(favs).length}</b> · Scaricati: <b>${seenSet.size}</b><br>` +
            `Spazio occupato (stima): <b>~${st.kb} KB</b>`;
    }

    function syncSettingsUI() {
        $('seer-pref-density').value = settings.density;
        $('seer-accent-custom').value = /^#[0-9a-f]{6}$/i.test(settings.accent) ? settings.accent : '#6366f1';
        markSw();
        sHero.checked = settings.heroEnabled;
        buildPathInputs();
        sHeroSpeed.value = String(settings.heroSpeed);
        sHeroSpeed.disabled = !settings.heroEnabled;
        buildStartOptions();
        sStart.value = settings.startView;
        if (sStart.value !== settings.startView) sStart.value = 'home';
        sMagnet.value = settings.magnetAction;
        sTc.value = tcClient();
        sTcUrl.value = String(getPref('tcUrl', '') || '');
        sTcUser.value = tcUser();
        sTcPass.value = tcPass();
        sTcUrl.disabled = sTcUser.disabled = sTcPass.disabled = sTcTest.disabled = tcClient() === 'off';
        sTcStatus.textContent = '';
        sTcStatus.className = 'seer-settings-status';
        sCacheStatus.textContent = '';
        sCacheStatus.className = 'seer-settings-status';
        sBackupStatus.textContent = '';
        sBackupStatus.className = 'seer-settings-status';
        updateCacheInfo();
    }

    sHero.onchange = () => {
        settings.heroEnabled = sHero.checked;
        setPref('heroEnabled', settings.heroEnabled);
        sHeroSpeed.disabled = !settings.heroEnabled;
        applyHeroPrefs();
    };
    sHeroSpeed.onchange = () => {
        const v = parseInt(sHeroSpeed.value, 10);
        settings.heroSpeed = HERO_SPEEDS.includes(v) ? v : 5000;
        setPref('heroSpeed', settings.heroSpeed);
        stopHero();
        updateHeroVisibility();
    };
    sStart.onchange = () => {
        settings.startView = sStart.value || 'home';
        setPref('startView', settings.startView);
    };
    sMagnet.onchange = () => {
        settings.magnetAction = sMagnet.value === 'open' ? 'open' : 'copy';
        setPref('magnetAction', settings.magnetAction);
        refreshMagnetButtons();
    };

    const saveTc = () => {
        setPref('tcClient', sTc.value);
        setPref('tcUrl', sTcUrl.value.trim());
        setPref('tcUser', sTcUser.value);
        setPref('tcPass', sTcPass.value);
        trSid = null;
        sTcUrl.disabled = sTcUser.disabled = sTcPass.disabled = sTcTest.disabled = tcClient() === 'off';
        refreshMagnetButtons();
    };
    [sTc, sTcUrl, sTcUser, sTcPass].forEach(el => { el.onchange = saveTc; });
    sTcTest.onclick = async () => {
        saveTc();
        sTcTest.disabled = true;
        sTcStatus.textContent = 'Connessione in corso…';
        sTcStatus.className = 'seer-settings-status';
        try {
            const v = await testClient();
            sTcStatus.textContent = '✅ Connesso: ' + v;
            sTcStatus.className = 'seer-settings-status ok';
        } catch (e) {
            sTcStatus.textContent = '❌ ' + ((e && e.message) || 'Connessione non riuscita');
            sTcStatus.className = 'seer-settings-status err';
        }
        sTcTest.disabled = tcClient() === 'off';
    };

    const BACKUP_KEYS = ['favs', 'seen', 'tcPaths', 'theme', 'heroEnabled', 'heroSpeed', 'startView', 'magnetAction', 'viewMode', 'hideSeen', 'sortMode', 'tcClient', 'tcUrl', 'tcUser', 'follows', 'accent', 'accent2', 'density'];
    const setBackupStatus = (txt, cls = '') => { sBackupStatus.textContent = txt; sBackupStatus.className = 'seer-settings-status' + (cls ? ' ' + cls : ''); };

    $('seer-export-btn').onclick = () => {
        try {
            const data = {};
            BACKUP_KEYS.forEach(k => { const v = getPref(k, undefined); if (v !== undefined) data[k] = v; });
            const payload = { app: 'MirSeer', schema: 1, version: '1.4', exportedAt: new Date().toISOString(), data };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mirseer_backup.json';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            setBackupStatus('✅ Backup esportato: mirseer_backup.json', 'ok');
            toast('Configurazione esportata', 'ok');
        } catch (e) {
            setBackupStatus('❌ Esportazione non riuscita', 'err');
        }
    };

    function importConfig(obj) {
        if (!obj || typeof obj !== 'object' || (obj.app && obj.app !== 'MirSeer')) throw new Error('File non valido');
        const d = (obj.data && typeof obj.data === 'object') ? obj.data : obj;
        const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
        const isStr = v => typeof v === 'string';
        const sameOrigin = u => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) && x.origin === location.origin; } catch (e) { return false; } };
        let n = 0, favN = 0, seenN = 0;

        if (isObj(d.favs)) {
            Object.keys(d.favs).forEach(id => {
                const f = d.favs[id];
                if (!isObj(f) || !isStr(f.url) || !isStr(f.rawTitle) || !sameOrigin(f.url)) return;
                favs[String(id)] = {
                    id: String(f.id || id), url: absUrl(f.url), rawTitle: f.rawTitle.slice(0, 400), type: isStr(f.type) ? f.type : 'Film',
                    views: +f.views || 0, replies: +f.replies || 0, ts: +f.ts || 0, lastReplyTs: +f.lastReplyTs || 0,
                    author: isStr(f.author) ? f.author : '', authorId: isStr(f.authorId) ? f.authorId : null,
                    forumId: isStr(f.forumId) ? f.forumId : null, forumName: isStr(f.forumName) ? f.forumName : '', added: +f.added || Date.now()
                };
                favN++;
            });
            setPref('favs', favs);
            n++;
        }
        if (Array.isArray(d.seen)) {
            d.seen.forEach(x => { if (typeof x === 'string' || typeof x === 'number') { seenSet.add(String(x)); seenN++; } });
            persistSeen();
            n++;
        }
        if (isObj(d.tcPaths)) {
            const p = {};
            Object.keys(d.tcPaths).forEach(k => { if (isStr(d.tcPaths[k]) && d.tcPaths[k].trim()) p[k] = d.tcPaths[k].trim(); });
            setPref('tcPaths', p);
            n++;
        }
        if (d.theme === 'light' || d.theme === 'dark') { theme = d.theme; saveTheme(theme); applyTheme(theme); n++; }
        if (typeof d.heroEnabled === 'boolean') { settings.heroEnabled = d.heroEnabled; setPref('heroEnabled', d.heroEnabled); n++; }
        if (HERO_SPEEDS.includes(Number(d.heroSpeed))) { settings.heroSpeed = Number(d.heroSpeed); setPref('heroSpeed', settings.heroSpeed); n++; }
        if (isStr(d.startView) && d.startView.length < 80) { settings.startView = d.startView; setPref('startView', d.startView); n++; }
        if (d.magnetAction === 'copy' || d.magnetAction === 'open') { settings.magnetAction = d.magnetAction; setPref('magnetAction', d.magnetAction); n++; }
        if (d.viewMode === 'grid' || d.viewMode === 'list') { viewMode = d.viewMode; setPref('viewMode', viewMode); n++; }
        if (typeof d.hideSeen === 'boolean') { hideSeen = d.hideSeen; setPref('hideSeen', hideSeen); n++; }
        if (SORT_MODES.includes(d.sortMode)) { sortMode = d.sortMode; setPref('sortMode', sortMode); $('seer-sort-select').value = sortMode; n++; }
        if (d.tcClient === 'off' || TC_NAMES[d.tcClient]) { setPref('tcClient', d.tcClient); n++; }
        if (isStr(d.tcUrl)) { setPref('tcUrl', d.tcUrl.trim()); n++; }
        if (isStr(d.tcUser)) { setPref('tcUser', d.tcUser); n++; }
        trSid = null;

        if (isObj(d.follows)) { ['rel', 'title'].forEach(t => { if (isObj(d.follows[t])) Object.assign(follows[t], d.follows[t]); }); saveFollows(); n++; }
        if (/^#[0-9a-f]{6}$/i.test(d.accent || '')) {
            settings.accent = d.accent; setPref('accent', d.accent);
            if (isStr(d.accent2) && /^[#a-z0-9(),% -]{4,80}$/i.test(d.accent2)) { settings.accent2 = d.accent2; setPref('accent2', d.accent2); }
            applyAppearance(); n++;
        }
        if (d.density === 'compact' || d.density === 'comfortable') { settings.density = d.density; setPref('density', d.density); applyAppearance(); n++; }
        if (!n) throw new Error('Nessun dato riconosciuto nel file');
        updateFavCount();
        syncSettingsUI();
        applyHeroPrefs();
        refreshMagnetButtons();
        if (main.loaded || view.key === 'favs') renderDeck(localFilterValue());
        return { favN, seenN };
    }

    $('seer-import-btn').onclick = () => $('seer-import-file').click();
    $('seer-import-file').onchange = async e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            if (file.size > 8 * 1024 * 1024) throw new Error('File troppo grande');
            const obj = JSON.parse(await file.text());
            const r = importConfig(obj);
            setBackupStatus(`✅ Configurazione importata (${r.favN} preferiti, ${r.seenN} scaricati).`, 'ok');
            toast('Configurazione importata', 'ok');
        } catch (err) {
            setBackupStatus('❌ ' + ((err && err.message) || 'Importazione non riuscita'), 'err');
        }
    };

    let cacheArm = null;
    sCacheClear.onclick = () => {
        if (!cacheArm) {
            sCacheClear.classList.add('armed');
            sCacheClear.textContent = '⚠️ Clicca di nuovo per confermare';
            cacheArm = setTimeout(() => {
                cacheArm = null;
                sCacheClear.classList.remove('armed');
                sCacheClear.textContent = CACHE_BTN_LABEL;
            }, 3500);
            return;
        }
        clearTimeout(cacheArm);
        cacheArm = null;
        sCacheClear.classList.remove('armed');
        sCacheClear.textContent = CACHE_BTN_LABEL;

        clearAllCache();
        updateCacheInfo();
        sCacheStatus.textContent = '✅ Cache svuotata: i dati verranno ricaricati alla prossima visualizzazione.';
        sCacheStatus.className = 'seer-settings-status ok';
        toast('Cache svuotata', 'ok');
        if (main.loaded) {
            renderDeck(localFilterValue());
            if (settings.heroEnabled) buildHero();
        }
    };

    buildSearchFilter();
    posterObserver = new IntersectionObserver(onRowsVisible, { root: app, rootMargin: '600px 0px' });

    app.addEventListener('error', e => {
        const img = e.target;
        if (img instanceof HTMLImageElement && img.dataset.seerId) onImageProblem(img);
    }, true);
    app.addEventListener('load', e => {
        const img = e.target;
        if (!(img instanceof HTMLImageElement) || !img.dataset.seerId || img.dataset.seerRole !== 'poster') return;
        const itLoad = registry.get(String(img.dataset.seerId));
        if (itLoad && isProjLike(itLoad)) { itLoad._imgRetry = 0; return; }
        if (junkDims(img.naturalWidth, img.naturalHeight)) onImageProblem(img);
    }, true);

    let startApplied = false;
    fab.onclick = async () => {
        app.style.display = 'block';
        fab.style.display = 'none';
        if (!sidebarLoaded) { sidebarLoaded = true; loadSidebar(); }
        if (!startApplied) {
            startApplied = true;
            try { await cacheReady; } catch (e) {}
            if (!(await restoreFromHash())) { const t = startTarget(); await setView(t.key, t.section); }
        } else if (location.hash.startsWith(HASH_PREFIX) && location.hash !== lastHash) await restoreFromHash();
        else updateHeroVisibility();
        checkFollows();
    };

    const exitApp = () => {
        lastHash = '';
        try { if (location.hash.startsWith(HASH_PREFIX)) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        app.style.display = 'none';
        fab.style.display = 'flex';
        stopHero();
    };
    $('seer-exit').onclick = exitApp;

    $('seer-menu-btn').onclick = () => $('seer-sidebar').classList.toggle('open');

    $('seer-sidebar').onclick = e => {
        const b = e.target.closest('.seer-side-item');
        if (!b || b.disabled) return;
        if (b.dataset.nav) setView(b.dataset.nav);
        else if (b.dataset.fid) setView('section', { id: b.dataset.fid, name: b.dataset.name });
    };
    $('seer-nav-brand').onclick = () => setView('home');

    const hero = $('seer-hero');
    hero.onclick = e => {
        const act = e.target.closest('[data-act]');
        if (act) {
            const item = registry.get(String(act.dataset.id));
            if (item) {
                if (act.dataset.act === 'detail') openDetailModal(item);
                else if (act.dataset.act === 'trailer') openTrailer(item);
            }
            return;
        }
        const nav = e.target.closest('[data-hero]');
        if (!nav) return;
        const v = nav.dataset.hero;
        goHero(v === 'prev' ? heroIdx - 1 : v === 'next' ? heroIdx + 1 : parseInt(v, 10));
        startHero();
    };

    const pauseHero = () => { heroHover = true; stopHero(); };
    const resumeHero = () => { heroHover = false; if (heroWanted() && app.style.display === 'block') startHero(); };
    hero.addEventListener('mouseenter', pauseHero);
    hero.addEventListener('mouseleave', resumeHero);
    hero.addEventListener('focusin', pauseHero);
    hero.addEventListener('focusout', e => { if (!hero.contains(e.relatedTarget)) resumeHero(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopHero(); else updateHeroVisibility(); });

    const overlay = $('seer-modal-overlay');
    const closeModal = hideModal;
    $('seer-modal-close-btn').onclick = closeModal;
    overlay.onclick = e => {
        if (e.target === overlay) { closeModal(); return; }
        if (!e.target.closest('.seer-ext-wrap')) { const m = $('seer-ext-menu'); if (m) m.classList.remove('open'); }
    };

    $('seer-modal-tools').onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b || !currentModalItem) return;
        const it = currentModalItem;
        if (b.dataset.act === 'fav') toggleFav(it);
        else if (b.dataset.act === 'seen') { markSeen(it, !isSeen(it.id)); toast(isSeen(it.id) ? '✓ Segnato come scaricato' : 'Rimosso dagli scaricati'); }
        else if (b.dataset.act === 'trailer') openTrailer(it);
        else if (b.dataset.act === 'followtitle') toggleFollowTitle(it);
        else if (b.dataset.act === 'ext') { const m = $('seer-ext-menu'); if (m) m.classList.toggle('open'); }
    };

    $('seer-modal-metarow').onclick = e => {
        if (currentModalItem && e.target.closest('[data-act="followrel"]')) { toggleFollowRel(currentModalItem.author, currentModalItem.authorId, currentModalItem.authorAvatar); return; }
        const b = e.target.closest('[data-act="releaser"]');
        if (!b || !currentModalItem) return;
        const it = currentModalItem;
        openReleaser(it.author, it.authorId, it.authorAvatar);
    };

    $('seer-version-bar').onclick = e => {
        const b = e.target.closest('[data-vid]');
        if (!b) return;
        const v = modalVersions.find(x => String(x.id) === b.dataset.vid);
        if (v && v !== currentModalItem) openDetailModal(v, true);
    };

    $('seer-syn-toggle').onclick = () => {
        const ov = $('seer-modal-overview'), tg = $('seer-syn-toggle');
        const open = ov.dataset.open !== '1';
        ov.dataset.open = open ? '1' : '0';
        ov.classList.toggle('clamped', !open);
        tg.textContent = open ? 'Mostra meno' : 'Mostra altro';
    };

    $('seer-rel-panel').onclick = e => {
        if (e.target.closest('[data-rel="follow"]') && rel) { toggleFollowRel(rel.name, rel.id, rel.avatar); return; }
        const c = e.target.closest('[data-rcat]');
        if (c && rel) { rel.cat = c.dataset.rcat; renderDeck(localFilterValue()); return; }
        if (e.target.closest('[data-rel="back"]')) {
            const p = (rel && rel.prev) || { key: 'home', section: null };
            PG.want = p.page || 0;
            setView(p.key, p.section);
        }
    };

    $('seer-trailer-close').onclick = closeTrailer;
    $('seer-trailer-overlay').onclick = e => { if (e.target === $('seer-trailer-overlay')) closeTrailer(); };

    const flash = (btn, okHtml, backHtml, cls) => {
        btn.classList.add(cls);
        btn.innerHTML = okHtml;
        setTimeout(() => { btn.classList.remove(cls); btn.innerHTML = backHtml; }, 2200);
    };

    const copyBtn = $('seer-copy-btn');
    copyBtn.onclick = () => {
        const mags = currentModalItem ? (currentModalItem.magnets || []) : [];
        if (mags.length) {
            if (settings.magnetAction === 'open') {
                openMagnet(mags[0].uri); trackDl(currentModalItem, [mags[0].uri], 'open');
                flash(copyBtn, `<span>✅</span> Magnet inviato al client!`, magnetBtnLabel(), 'copied');
                toast('🧲 Magnet inviato al client torrent', 'ok');
            } else {
                copyToClipboard(mags[0].uri); trackDl(currentModalItem, [mags[0].uri], 'copy');
                flash(copyBtn, `<span>✅</span> Magnet Copiato negli Appunti!`, magnetBtnLabel(), 'copied');
                toast('📋 Magnet copiato negli appunti', 'ok');
            }
            markSeen(currentModalItem, true);
        } else if (currentTopicUrl) {
            window.open(currentTopicUrl, '_blank');
        }
    };

    const sendBusy = async (btn, uris) => {
        if (!currentModalItem) return;
        btn.disabled = true;
        const back = btn.innerHTML;
        btn.innerHTML = '<span>⏳</span> Invio in corso…';
        const ok = await sendToClient(currentModalItem, uris);
        btn.disabled = false;
        if (ok) flash(btn, '<span>✅</span> Inviato!', back, 'copied');
        else btn.innerHTML = back;
    };
    $('seer-send-btn').onclick = () => {
        const mags = currentModalItem ? (currentModalItem.magnets || []) : [];
        if (mags.length) sendBusy($('seer-send-btn'), [mags[0].uri]);
    };
    $('seer-send-all-btn').onclick = () => {
        const mags = currentModalItem ? (currentModalItem.magnets || []) : [];
        if (mags.length) sendBusy($('seer-send-all-btn'), mags.map(m => m.uri));
    };

    $('seer-magnet-list').onclick = async e => {
        if (!currentModalItem) return;
        const mags = currentModalItem.magnets || [];
        const s = e.target.closest('[data-ms]');
        if (s) {
            const m = mags[parseInt(s.dataset.ms, 10)];
            if (!m) return;
            s.disabled = true;
            const ok = await sendToClient(currentModalItem, [m.uri]);
            s.disabled = false;
            if (ok) flash(s, '✅', '⬇️', 'copied');
            return;
        }
        const b = e.target.closest('[data-mi]');
        if (!b) return;
        const m = mags[parseInt(b.dataset.mi, 10)];
        if (!m) return;
        if (settings.magnetAction === 'open') {
            openMagnet(m.uri); trackDl(currentModalItem, [m.uri], 'open');
            flash(b, '✅ Inviato', magnetItemLabel(), 'copied');
            toast('🧲 Magnet inviato al client torrent', 'ok');
        } else {
            copyToClipboard(m.uri); trackDl(currentModalItem, [m.uri], 'copy');
            flash(b, '✅ Copiato', magnetItemLabel(), 'copied');
            toast('📋 Magnet copiato negli appunti', 'ok');
        }
        markSeen(currentModalItem, true);
    };

    $('seer-load-more-btn').onclick = async () => {
        if (search.active) loadMoreSearch();
        else if (view.key === 'releasers') { show = false; }
        else if (view.key === 'releaser') {
            if (rel && rel.sq) { $('seer-load-more-btn').innerText = 'Caricamento in corso...'; loadRelSearchPage(); }
            else loadMoreReleaser();
        }
        else if (gxApplies() && !gx.exhausted) { $('seer-load-more-btn').innerText = 'Caricamento in corso...'; await loadGxPage(); updateLoadMore(); }
        else if (view.key === 'section') loadMoreSection();
        else loadMorePages();
    };

    $('seer-sort-select').onchange = e => {
        sortMode = SORT_MODES.includes(e.target.value) ? e.target.value : 'recent';
        pgOnSortChange();
        setPref('sortMode', sortMode);
        renderDeck(localFilterValue());
    };

    $('seer-view-toggle').onclick = e => {
        const b = e.target.closest('button[data-view]');
        if (!b) return;
        const v = b.dataset.view === 'grid' ? 'grid' : 'list';
        if (v === viewMode) return;
        viewMode = v;
        setPref('viewMode', viewMode);
        renderDeck(localFilterValue());
    };

    $('seer-facets').onclick = e => {
        const b = e.target.closest('.seer-facet');
        if (!b) return;
        const f = b.dataset.facet, t = b.dataset.ftype, fm = b.dataset.fmt, rs = b.dataset.res;
        if (f === 'adv') { advOpen = !advOpen; renderFacets(); updateAdv(); return; }
        if (rs) filters.res = filters.res === rs ? 'all' : rs;
        else if (t) filters.type = filters.type === t ? 'all' : t;
        else if (fm) filters.fmt = filters.fmt === fm ? 'all' : fm;
        else if (f === 'reset') {
            gx = newGx();
            Object.assign(filters, newFilters());
            if (hideSeen) { hideSeen = false; setPref('hideSeen', false); }
        } else if (f === 'hideSeen') { hideSeen = !hideSeen; setPref('hideSeen', hideSeen); }
        else if (f in filters) filters[f] = !filters[f];
        renderDeck(localFilterValue());
    };

    const rerenderSoon = (() => {
        let t = null;
        return () => { clearTimeout(t); t = setTimeout(() => renderDeck(localFilterValue()), 160); };
    })();
    $('seer-adv-vote').oninput = e => {
        filters.minVote = parseFloat(e.target.value) || 0;
        $('seer-adv-vote-val').textContent = filters.minVote > 0 ? filters.minVote.toFixed(1) + '+' : 'Tutte';
        rerenderSoon();
    };
    $('seer-adv-yfrom').oninput = e => { filters.yFrom = parseInt(e.target.value, 10) || null; rerenderSoon(); };
    $('seer-adv-yto').oninput = e => { filters.yTo = parseInt(e.target.value, 10) || null; rerenderSoon(); };
    $('seer-adv-rel').oninput = e => { filters.releaser = e.target.value.trim(); rerenderSoon(); gxStart(); };
    $('seer-adv-codec').onchange = e => { filters.codec = e.target.value || 'all'; renderDeck(localFilterValue()); };

    const searchInput = $('seer-search-input');
    let searchTimer = null;

    searchInput.oninput = e => {
        const q = e.target.value.trim();
        clearTimeout(searchTimer);

        if (q.length < 3) {
            exitSearchMode();
            return;
        }
        clearTimeout(searchInput._t);
        if (!search.active) searchInput._t = setTimeout(() => {
            const cur = searchInput.value.trim();
            if (!search.active && cur.length >= 3) renderDeck(cur);
        }, 120);
        searchTimer = setTimeout(() => runSearch(q), 700);
    };

    const searchNow = () => {
        const q = searchInput.value.trim();
        clearTimeout(searchTimer);
        if (q.length >= 3) runSearch(q);
    };
    searchInput.onkeydown = e => { if (e.key === 'Enter') searchNow(); };
    $('seer-search-submit').onclick = searchNow;

    $('seer-search-section-filter').onchange = () => {
        $('seer-search-input').placeholder = `Cerca in ${resolveSearchScope().label}…  ( / )`;
        const q = searchInput.value.trim();
        if (q.length >= 3) { clearTimeout(searchTimer); runSearch(q); }
    };

    $('seer-search-hint').onclick = e => {
        if (!e.target.closest('#seer-search-all-btn')) return;
        $('seer-search-section-filter').value = 'all';
        searchNow();
    };

    const focusSearch = () => { searchInput.focus(); searchInput.select(); };
    document.addEventListener('keydown', e => {
        if (app.style.display !== 'block') return;
        const tag = (e.target && e.target.tagName) || '';
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || !!(e.target && e.target.isContentEditable);
        const trailerOpen = $('seer-trailer-overlay').style.display === 'flex';
        const settingsOpen = sOverlay.style.display === 'flex';
        const modalOpen = overlay.style.display === 'flex';

        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            focusSearch();
            return;
        }
        if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            focusSearch();
            return;
        }
        if (e.key === 'Escape') {
            if (trailerOpen) closeTrailer();
            else if (settingsOpen) closeSettings();
            else if (modalOpen) closeModal();
            else if (typing) {
                if (e.target === searchInput && searchInput.value) {
                    searchInput.value = '';
                    clearTimeout(searchTimer);
                    exitSearchMode();
                } else e.target.blur();
            } else if (selMode) setSelMode(false);
            else exitApp();
            return;
        }
        const free = !typing && !trailerOpen && !settingsOpen && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (free && modalOpen) {
            if (e.key === 'ArrowLeft') { e.preventDefault(); navModal(-1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); navModal(1); }
            else if (e.key === 'f' && currentModalItem) toggleFav(currentModalItem);
            else if (e.key === 'd' && currentModalItem) { markSeen(currentModalItem, !isSeen(currentModalItem.id)); toast(isSeen(currentModalItem.id) ? '✓ Segnato come scaricato' : 'Rimosso dagli scaricati'); }
            return;
        }
        if (free && !modalOpen) {
            const k = e.key;
            if (k === 'j' || k === 'k') { e.preventDefault(); kbMove((k === 'j' ? 1 : -1) * gridCols(kbRows())); return; }
            if (viewMode === 'grid' && (k === 'h' || k === 'l')) { kbMove(k === 'l' ? 1 : -1); return; }
            if (k === 'Enter' || k === 'f' || k === 'd' || k === 'x') {
                if (k === 'Enter' && /^(BUTTON|A)$/.test(tag)) return;
                const it = kbItem();
                if (!it) return;
                e.preventDefault();
                if (k === 'Enter') { if (selMode) toggleSel(it); else openDetailModal(it); }
                else if (k === 'f') toggleFav(it);
                else if (k === 'd') { markSeen(it, !isSeen(it.id)); toast(isSeen(it.id) ? '✓ Segnato come scaricato' : 'Rimosso dagli scaricati'); }
                else { if (!selMode) setSelMode(true); toggleSel(it); }
                return;
            }
        }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing && !trailerOpen && !settingsOpen && !modalOpen && heroWanted() && heroSlides.length > 1) {
            e.preventDefault();
            goHero(e.key === 'ArrowLeft' ? heroIdx - 1 : heroIdx + 1);
            startHero();
        }
    });

    applyAppearance();
    currentUser = detectUser(document); paintUser();

    $('seer-user-btn').onclick = e => { e.stopPropagation(); $('seer-user-menu').classList.toggle('open'); };
    document.addEventListener('click', e => { if (!e.target.closest('.seer-user')) $('seer-user-menu').classList.remove('open'); });
    $('seer-proj-head').addEventListener('click', projHeadClick);
    $('mirseer-app').addEventListener('scroll', pjFabUpdate, { passive: true });
    $('seer-main-list').addEventListener('click', projHeadClick);
    acctInit();

    $('seer-wl-panel').onclick = e => {
        const d = e.target.closest('[data-wl-del]');
        if (d) {
            delete follows[d.dataset.wlDel][d.dataset.k];
            saveFollows();
            wlNew.forEach((it, id) => { if (!isFollowingRel(it.author) && !isFollowingTitle(it)) wlNew.delete(id); });
            afterFollowChange(false);
            renderDeck(localFilterValue());
            return;
        }
        const a = e.target.closest('[data-wl]');
        if (a) { if (a.dataset.wl === 'check') checkFollows(true); else markAllFollowsSeen(); }
    };

    $('seer-genres').onclick = e => {
        const b = e.target.closest('[data-genre]');
        if (!b) return;
        filters.genre = filters.genre === b.dataset.genre ? 'all' : b.dataset.genre;
        renderDeck(localFilterValue());
    };

    $('seer-adv-smin').oninput = e => { filters.sizeMin = parseFloat(e.target.value) || null; rerenderSoon(); };
    $('seer-adv-smax').oninput = e => { filters.sizeMax = parseFloat(e.target.value) || null; rerenderSoon(); };

    $('seer-sel-btn').onclick = () => setSelMode(!selMode);
    $('seer-batch-all').onclick = () => { lastDisplayed.forEach(it => selected.add(String(it.id))); paintSelection(); };
    $('seer-batch-none').onclick = () => { selected.clear(); paintSelection(); };
    $('seer-batch-cancel').onclick = () => setSelMode(false);
    $('seer-batch-send').onclick = () => batchRun('send');
    $('seer-batch-copy').onclick = () => batchRun('copy');
    $('seer-batch-seen').onclick = () => batchRun('seen');

    $('seer-modal-prev').onclick = () => navModal(-1);
    $('seer-modal-next').onclick = () => navModal(1);
    {
        const win = overlay.querySelector('.seer-detail-window');
        let tx = 0, ty = 0;
        win.addEventListener('touchstart', e => { const t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
        win.addEventListener('touchend', e => {
            const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
            if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2 && !e.target.closest('pre, .seer-magnet-list, .seer-text-box')) navModal(dx < 0 ? 1 : -1);
        }, { passive: true });
    }

    app.addEventListener('scroll', () => { if (!search.active) scrollMemory.set(viewKeyOf(view.key, view.section), app.scrollTop); }, { passive: true });
    window.addEventListener('hashchange', () => {
        if (!location.hash.startsWith(HASH_PREFIX) || location.hash === lastHash) return;
        if (app.style.display === 'block') restoreFromHash(); else fab.click();
    });

    const sSw = $('seer-swatches');
    sSw.innerHTML = ACCENTS.map(([a, b]) => `<button class="seer-swatch" data-a="${a}" data-b="${b}" style="background:linear-gradient(135deg,${a},${b})" title="${a}"></button>`).join('');
    function markSw() { sSw.querySelectorAll('.seer-swatch').forEach(s => s.classList.toggle('on', s.dataset.a === settings.accent)); }
    function setAccent(a, b) {
        settings.accent = a; settings.accent2 = b;
        setPref('accent', a); setPref('accent2', b);
        applyAppearance(); markSw();
    }
    sSw.onclick = e => { const b = e.target.closest('.seer-swatch'); if (b) { setAccent(b.dataset.a, b.dataset.b); $('seer-accent-custom').value = b.dataset.a; } };
    $('seer-accent-custom').oninput = e => setAccent(e.target.value, `color-mix(in srgb, ${e.target.value} 65%, #a855f7)`);
    $('seer-pref-density').onchange = e => { settings.density = e.target.value === 'compact' ? 'compact' : 'comfortable'; setPref('density', settings.density); applyAppearance(); };
    markSw();

    $('seer-main-list').addEventListener('click', relPageClick);

    {
        const ri = $('seer-rel-q');
        let rt = null;
        ri.addEventListener('input', () => {
            if (!rel) return;
            rel.q = ri.value;
            const had = !!rel.sq;
            rel.sq = null;
            clearTimeout(rt);
            rt = setTimeout(() => { if (had) loadPage(1); else renderDeck(localFilterValue(), true); }, had ? 0 : 120);
        });
        ri.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); clearTimeout(rt); relRunSearch(); }
            else if (e.key === 'Escape' && ri.value) {
                e.preventDefault(); e.stopPropagation();
                clearTimeout(rt);
                ri.value = '';
                if (rel) { const had = !!rel.sq; rel.q = ''; rel.sq = null; if (had) { loadPage(1); return; } }
                renderDeck(localFilterValue(), true);
            }
        });
        $('seer-rel-submit').onclick = () => { clearTimeout(rt); relRunSearch(); };
    }
    $('seer-main-list').addEventListener('error', e => {
        const img = e.target;
        if (!(img instanceof HTMLImageElement)) return;
        const card = img.closest('.seer-rl-card');
        if (!card) return;
        const r = relEntry(card.dataset.name);
        const bad = img.getAttribute('src');
        img.parentElement.textContent = '👤';
        if (r.avTried) return;
        r.avTried = true;
        r.avatar = null;
        getRelAvatar(r).then(src => {
            if (src && src !== bad) { r.avatar = src; if (card.isConnected) setRlAvatar(card, src); }
        });
    }, true);
    $('seer-main-list').addEventListener('input', e => {
        if (e.target.id === 'seer-rl-q') { relPage.q = e.target.value.trim().toLowerCase(); paintRlGroups(); }
    });
    if (location.hash.startsWith(HASH_PREFIX)) fab.click();

    renderFacets();
    updateAdv();
    mobileEnhance();
}

const boot = () => { init(); setupPaging(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
