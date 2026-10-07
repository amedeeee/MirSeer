// ==UserScript==
// @name         MirSeer
// @namespace    https://github.com/amedeeee/MirSeer
// @version      1.2
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
// @downloadURL  https://raw.githubusercontent.com/amedeeee/MirSeer/main/mirseer.user.js
// @updateURL    https://raw.githubusercontent.com/amedeeee/MirSeer/main/mirseer.user.js
// @run-at       document-end
// ==/UserScript==

(function () {
'use strict';

const HERO_COUNT = 7;
const HERO_POOL = 14;
const HERO_MAX_TOTAL = 100;

const PAGE_SIZE = 25;
const IMG_HI_COUNT = 8;

const EXCLUDE_SELECTOR = '#recent-topics, .recent-topics, .recenttopics, [class*="recent_topics"], [class*="active-topics"], [id*="active-topics"]';
const RECENT_HEAD_RE = /topic\s+attiv|attivi\s+di\s+recente|argomenti\s+attiv|ultimi\s+\d*\s*(?:topic|argomenti|messaggi)|\b20\s+topic|recent\s+(?:topics|posts)|active\s+topics/i;

const SECTIONS = [
    { name: 'Film',           fid: 26, nav: 'films',  ico: '🎬' },
    { name: 'Serie TV',       fid: 28, nav: 'series', ico: '📺' },
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
    { name: 'Games PC',       fid: 67,                ico: '🎮' }
];
const FILE_TYPES = new Set(['EBooks', 'Comics', 'Edicola', 'Games PC']);
const AUDIO_TYPES = new Set(['ABooks', 'Musica Audio']);
const VIDEO_TYPES = new Set(['Film', 'Serie TV', 'Documentari', 'TV Show', 'Teatro', 'Videocorsi', 'Anime Movies', 'Anime Series', 'Cartoon Movies', 'Cartoon Series', 'Musica Video']);

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
    scroll-behavior: smooth;
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
    transition: all 0.2s ease; position: relative;
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
.tag-hdr { background: #d946ef; color: #fff; }
.tag-dv { background: #f59e0b; color: #000; }
.tag-season { background: rgba(99,102,241,0.2); color: #c7d2fe; border: 1px solid rgba(99,102,241,0.4); }
.tag-text { background: rgba(148,163,184,0.18); color: #e2e8f0; border: 1px solid rgba(148,163,184,0.35); }
.tag-audio { background: rgba(16,185,129,0.18); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.4); }
.tag-file { background: rgba(14,165,233,0.18); color: #7dd3fc; border: 1px solid rgba(14,165,233,0.4); }
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
.seer-detail-window.is-portrait, .seer-detail-window:not(.is-landscape) { flex-direction: row; width: 100%; max-width: 960px; height: 560px; max-height: 92vh; }
.seer-detail-window.is-portrait .seer-modal-left, .seer-detail-window:not(.is-landscape) .seer-modal-left {
    width: 320px; min-width: 280px; height: 100%; background: #070b14; position: relative; overflow: hidden;
    display: flex; align-items: center; justify-content: center; border-right: 1px solid var(--seer-border); flex-shrink: 0;
}
.seer-detail-window.is-portrait .seer-modal-left img, .seer-detail-window:not(.is-landscape) .seer-modal-left img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.seer-detail-window.is-landscape { flex-direction: column; width: 100%; max-width: 820px; height: auto; max-height: 90vh; }
.seer-detail-window.is-landscape .seer-modal-left {
    width: 100%; height: 250px; min-width: unset; background: #060913; position: relative; overflow: hidden;
    border-right: none; border-bottom: 1px solid var(--seer-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.seer-detail-window.is-landscape .seer-modal-left img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.seer-detail-window.is-landscape .seer-modal-left::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,22,38,0) 55%, #0f1626 100%); pointer-events: none; }
.seer-modal-right { flex: 1; padding: 26px 30px; display: flex; flex-direction: column; overflow-y: auto; position: relative; min-height: 0; }
.seer-modal-close {
    position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    border: 1px solid var(--seer-border); color: #fff; width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; z-index: 30; transition: all 0.2s;
}
.seer-modal-close:hover { background: #ef4444; transform: scale(1.1); }
.seer-modal-title { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; margin: 0 0 10px 0; padding-right: 36px; color: #fff; line-height: 1.3; }
.seer-chips-row { display: flex; align-items: center; gap: 7px; margin-bottom: 15px; flex-wrap: wrap; }
.seer-chip { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 7px; font-size: 12px; font-weight: 700; color: #e2e8f0; }
.seer-chip.chip-audio { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.35); color: #34d399; }
.seer-chip.chip-subs { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.35); color: #fbbf24; }
.seer-chip.chip-season { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.45); color: #a5b4fc; }
.seer-chip.chip-file { background: rgba(14,165,233,0.15); border-color: rgba(14,165,233,0.4); color: #7dd3fc; }
.seer-specs-matrix { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: rgba(0,0,0,0.25); border: 1px solid var(--seer-border); padding: 12px; border-radius: 10px; margin-bottom: 15px; }
.seer-spec-box { display: flex; flex-direction: column; }
.seer-spec-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--seer-text-muted); margin-bottom: 2px; }
.seer-spec-value { font-size: 12.5px; font-weight: 700; color: #f1f5f9; }
.seer-synopsis-box { margin-bottom: 15px; }
.seer-synopsis-head { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: var(--seer-accent); margin-bottom: 5px; }
.seer-synopsis-body { color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0; max-height: 110px; overflow-y: auto; padding-right: 6px; }
.seer-text-box {
    display: none; flex: 1; min-height: 120px; max-height: 340px; overflow-y: auto; margin-bottom: 15px;
    background: rgba(0,0,0,0.25); border: 1px solid var(--seer-border); border-radius: 10px; padding: 14px 16px;
    color: #cbd5e1; font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word;
}
.seer-detail-window.text-mode .seer-text-box { display: block; }
.seer-detail-window.text-mode .seer-synopsis-box { display: none; }
.seer-detail-window.no-specs .seer-specs-matrix { display: none; }
.seer-raw-box { background: rgba(0,0,0,0.35); border-radius: 8px; padding: 8px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #64748b; word-break: break-all; margin-bottom: 15px; border: 1px dashed rgba(255,255,255,0.08); }
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
    .seer-modal-left { width: 100% !important; height: 200px !important; min-width: unset !important; border-right: none !important; border-bottom: 1px solid var(--seer-border) !important; }
    .seer-specs-matrix { grid-template-columns: repeat(2, 1fr); }
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
.seer-theme-btn {
    background: rgba(255,255,255,0.06); border: 1px solid var(--seer-border); color: #fff;
    width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 16px; flex-shrink: 0; transition: 0.2s;
    display: inline-flex; align-items: center; justify-content: center;
}
.seer-theme-btn:hover { background: rgba(99,102,241,0.25); border-color: var(--seer-accent); }

.seer-modal-forum {
    position: absolute; top: 16px; right: 58px; z-index: 30; height: 34px; padding: 0 12px;
    display: flex; align-items: center; gap: 6px; border-radius: 17px;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); border: 1px solid var(--seer-border);
    color: #fff !important; font-size: 12px; font-weight: 700; text-decoration: none !important; transition: all 0.2s;
}
.seer-modal-forum:hover { background: var(--seer-accent); transform: scale(1.05); }
.seer-modal-title { padding-right: 150px; }

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

// Nuovi componenti: vista griglia, filtri rapidi, preferiti, scaricati, trailer, MediaInfo, toast
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

.seer-modal-tools { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px; }
.seer-tool-btn {
    background: rgba(255,255,255,0.06); border: 1px solid var(--seer-border); color: #e2e8f0 !important;
    font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer;
    text-decoration: none !important; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit;
}
.seer-tool-btn.on { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.55); color: #fcd34d !important; }
.seer-tool-btn:hover { background: rgba(99,102,241,0.3); border-color: var(--seer-accent); color: #fff !important; }
.seer-tool-btn.trailer { background: linear-gradient(135deg, #ef4444, #f97316); border-color: transparent; color: #fff !important; }
.seer-tool-btn.trailer:hover { filter: brightness(1.1); }

.seer-mediainfo { margin-bottom: 15px; border: 1px solid var(--seer-border); border-radius: 10px; background: rgba(0,0,0,0.25); }
.seer-mediainfo summary { cursor: pointer; padding: 10px 14px; font-size: 12.5px; font-weight: 800; color: #e2e8f0; list-style: none; user-select: none; }
.seer-mediainfo summary::-webkit-details-marker { display: none; }
.seer-mediainfo summary::before { content: '▸ '; }
.seer-mediainfo[open] summary::before { content: '▾ '; }
.seer-mediainfo pre {
    margin: 0; padding: 0 14px 14px; max-height: 280px; overflow: auto; font-size: 11px; line-height: 1.5;
    color: #94a3b8; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre; background: transparent; border: none;
}

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
}
`);

// Light-theme overrides: every selector below is automatically prefixed with #mirseer-app.seer-light
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
.seer-modal-close,.seer-modal-forum{background:rgba(255,255,255,.85);color:#0f172a !important;border-color:rgba(15,23,42,.15);}
.seer-modal-close:hover{background:#ef4444;color:#fff !important;}
.seer-modal-forum:hover{background:var(--seer-accent);color:#fff !important;}
.seer-modal-title{color:#0f172a;}
.seer-specs-matrix,.seer-text-box,.seer-magnet-item{background:rgba(15,23,42,.04);}
.seer-spec-value,.seer-magnet-label{color:#0f172a;}
.seer-synopsis-body,.seer-text-box{color:#334155;}
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
.seer-mediainfo{background:rgba(15,23,42,.04);}
.seer-mediainfo summary{color:#1e293b;}
.seer-mediainfo pre{color:#475569;}
.seer-kbd-help kbd{background:rgba(15,23,42,.06);color:#0f172a;}
`;
GM_addStyle(LIGHT_RULES.replace(/(^|\})\s*([^{}]+)\{/g, (m, a, sel) =>
    a + sel.split(',').map(s => '#mirseer-app.seer-light ' + s.trim()).join(',') + '{'));

// Settings modal
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
.seer-settings-actions { display: flex; gap: 10px; margin-top: 2px; }
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
    padding-top: 10px; border-top: 1px solid var(--seer-border);
}
.seer-magnet-box .seer-action-btn {
    padding: 11px 12px; font-size: 13px; gap: 8px; line-height: 1.2; text-align: center;
}
.seer-magnet-box #seer-copy-all-btn {
    background: rgba(99,102,241,0.14); border: 1px solid rgba(99,102,241,0.45);
    color: #c7d2fe; box-shadow: none;
}
.seer-magnet-box #seer-copy-all-btn:hover { background: rgba(99,102,241,0.3); box-shadow: none; }
.seer-magnet-box #seer-copy-all-btn.copied { border-color: transparent; color: #fff; }
.seer-magnet-box .seer-magnet-list { grid-column: 1 / -1; max-height: 170px; }

#mirseer-app.seer-light .seer-magnet-box #seer-copy-all-btn { color: #4338ca; }
#mirseer-app.seer-light .seer-magnet-box #seer-copy-all-btn.copied { color: #fff; }
`);
const CACHE_PREFIX = 'mirseer_v23_';
const FREQ_KEY = CACHE_PREFIX + 'imgfreq';
const FILM_FORUM_ID = 26;
const SERIES_FORUM_ID = 28;

const MAX_CONCURRENT = 8;
const CANCELLED = Symbol('cancelled');
const THANKS_SELECTOR = 'a[href*="thanks="], a[href*="action=thanks"], a[title*="Grazie"], a[title*="Thanks"], .thanks-icon a';
const SIDE_HIDE_RE = /\b(richiest|regolament|segnalaz|comunicat|annunc|off[\s._-]*topic|presentaz|cestin|archiv|faq|guid|tutorial|staff|reseed)/i;
const MAIN_SUB_EXCLUDE_RE = /\b(richiest|regolament|music|audio|concert|ebook|software|gioch|edic|archivi|cestin|segnalaz|guid|tutorial|faq|comunicat|off[\s._-]*topic|presentaz|discussi)\b/i;

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const absHref = a => { try { return new URL(a.getAttribute('href'), location.href).href; } catch (e) { return a.href || ''; } };
const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

// Logo MirSeer (occhio stilizzato) in SVG: nitido a qualsiasi dimensione
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

const fmtViews = n => {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + 'k';
};

const sectionList = SECTIONS.map(s => ({ ...s }));
const forumToSection = new Map([[String(FILM_FORUM_ID), 'Film'], [String(SERIES_FORUM_ID), 'Serie TV']]);
const registry = new Map();
const main = { items: [], group: null, loaded: false, exhausted: false };
const sections = new Map();
let view = { key: 'home', section: null };
let search = { active: false, scope: 'scoped', query: '', label: '', items: [], nextUrl: null, sc: null };
let sortMode = 'recent';
let viewToken = 0, searchToken = 0, modalToken = 0;
let currentTopicUrl = null;
let currentModalItem = null;
let posterObserver = null;
let sidebarLoaded = false, sidebarReady = false;
let lastBaseCount = 0;

const iconFor = name => { const s = sectionList.find(x => x.name === name); return s ? s.ico : '📁'; };
const typeIcon = item => iconFor(item.type);
const sectionByName = name => { const s = name && sectionList.find(x => x.re && x.re.test(name)); return s ? s.name : null; };

// =====================================================================
//  CACHE su IndexedDB (con mirror in memoria per letture sincrone)
//  - lettura sincrona dalla Map in RAM, scrittura asincrona a lotti su IDB
//  - nessun limite rigido di ~5 MB come localStorage, nessun blocco della UI
// =====================================================================
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
                    const cur = idbDb.transaction(CACHE_STORE, 'readonly').objectStore(CACHE_STORE).openCursor();
                    cur.onsuccess = () => {
                        const c = cur.result;
                        if (c) { if (!cacheMem.has(c.key) && !dQueue.has(c.key)) cacheMem.set(c.key, c.value); c.continue(); }
                        else res();
                    };
                    cur.onerror = () => res();
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

// Rimuove il ~30% delle voci piu' vecchie quando si supera il tetto
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
    // pulizia di eventuali residui delle vecchie versioni su localStorage
    try {
        const del = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('mirseer_')) del.push(k);
        }
        del.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
}

// localStorage resta usato SOLO come fallback per le preferenze quando GM_* non e' disponibile
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

// ---- Preferenze centralizzate: GM_getValue / GM_setValue con fallback su localStorage ----
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
const settings = {
    heroEnabled: !!getPref('heroEnabled', true),
    heroSpeed: (v => (HERO_SPEEDS.includes(v) ? v : 5000))(Number(getPref('heroSpeed', 5000))),
    startView: String(getPref('startView', 'home')),
    magnetAction: getPref('magnetAction', 'copy') === 'open' ? 'open' : 'copy'
};

// ---- Vista (lista / griglia), filtri rapidi, "scaricati" e preferiti ----
let viewMode = getPref('viewMode', 'list') === 'grid' ? 'grid' : 'list';
let hideSeen = !!getPref('hideSeen', false);
const filters = { q4k: false, hdr: false, ita: false, complete: false, type: 'all', fmt: 'all' };

let seenSet = new Set((() => { const a = getPref('seen', []); return Array.isArray(a) ? a : []; })().map(String));
let favs = (() => { const f = getPref('favs', {}); return (f && typeof f === 'object' && !Array.isArray(f)) ? f : {}; })();

const isFav = id => !!favs[String(id)];
const isSeen = id => seenSet.has(String(id));

function persistSeen() {
    let arr = [...seenSet];
    if (arr.length > 5000) { arr = arr.slice(-4000); seenSet = new Set(arr); }
    setPref('seen', arr);
}

// ---- Toast ----
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

// Svuota i metadati in cache (non FREQ_KEY) cosi' i titoli gia' visti vengono riletti con/senza TMDb
function resetMetadataCache() {
    [...cacheMem.keys()].forEach(k => { if (k.startsWith(CACHE_PREFIX) && k !== FREQ_KEY) cacheDel(k); });
    savePending.clear();
    resolvedMem.clear();
    registry.forEach(it => { it.posterTried = false; it.tmdbTried = false; });
    heroNext = null;
}

// Svuota TUTTA la cache locale (metadati, risposte TMDb, frequenza immagini). Preferenze, preferiti e "scaricati" non vengono toccati.
function clearAllCache() {
    clearTimeout(saveTimer); saveTimer = null;
    clearTimeout(freqTimer); freqTimer = null; freqDirty = false;
    cacheClearAll();
    imgFreq = {};
    savePending.clear();
    resolvedMem.clear();
    warmed.clear();
    registry.forEach(it => { it.posterTried = false; it.tmdbTried = false; });
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

// true = valida, false = rifiutata da TMDb, null = impossibile verificare
async function checkTmdbKey(key) {
    try {
        const j = await httpGetJson(`https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(key)}`);
        if (j && j.images) return true;
        if (j && j.status_code === 7) return false;
        return null;
    } catch (e) { return null; }
}

// Pulizia residui di versioni precedenti (localStorage e voci IDB con prefisso vecchio)
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

const resolvedMem = new Map();
const savePending = new Map();
let saveTimer = null;

const snapshot = it => ({
    poster: it.poster || null, posterSrc: it.posterSrc || null, posterAlts: it.posterAlts || [],
    backdrop: it.backdrop || null, synopsis: it.synopsis,
    magnet: it.magnet || null,
    magnets: (it.magnets || []).map(m => ({ uri: m.uri, dn: m.dn || '', label: m.label, season: m.season == null ? null : m.season, ep: m.ep == null ? null : m.ep })),
    thanksUrl: it.thanksUrl || null, extId: it.extId || null, kind: it.kind || 'video',
    origTitle: it.origTitle || null, fieldYear: it.fieldYear || null, genre: it.genre || null, country: it.country || null,
    tmdbId: it.tmdbId || null, tmdbKind: it.tmdbKind || null, vote: it.vote || null,
    genres: it.genres || [], trailer: it.trailer || null, imdbId: it.imdbId || null,
    mediaInfo: it.mediaInfo || null,
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
});

function readCache(id) {
    const hit = resolvedMem.get(String(id));
    if (hit) return hit;
    const raw = cacheGet(CACHE_PREFIX + id);
    if (!raw) return null;
    let p;
    try { p = JSON.parse(raw); } catch (e) { return null; }
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

// ---- Estrazione del blocco MediaInfo ([spoiler] / [code]) dal post ----
const MEDIAINFO_MARKERS = [/Complete name/i, /Format\s*(?:profile|\/Info|settings)?\s*:/i, /Bit ?rate/i, /Duration/i, /Frame rate/i, /Codec ID/i, /Channel\(s\)/i, /\bWidth\s*:/i, /\bLanguage\s*:/i, /Unique ID/i, /File size/i];
const looksLikeMediaInfo = t => t && MEDIAINFO_MARKERS.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0) >= 3;

function extractMediaInfo(root, fullText) {
    if (root) {
        const cands = [...root.querySelectorAll('dl.codebox code, dl.codebox, pre, code, .codebox, .spoiler, .spoilertext, .spoiler-content, .spoiler_content, [class*="spoiler"], [class*="codecontent"]')];
        const passing = cands.map(el => ({ el, text: extractText(el) })).filter(x => x.text.length > 80 && looksLikeMediaInfo(x.text));
        const inner = passing.filter(x => !passing.some(o => o !== x && x.el.contains(o.el)));
        if (inner.length) {
            const seen = new Set();
            const parts = [];
            inner.forEach(x => { if (!seen.has(x.text)) { seen.add(x.text); parts.push(x.text); } });
            const txt = parts.join('\n\n────────────────────\n\n');
            if (txt) return txt.slice(0, 14000);
        }
    }
    const t = fullText || '';
    if (/Complete name\s*:/i.test(t)) {
        const gi = t.search(/(?:^|\n)\s*(?:General|Generale)\s*\n/i);
        const start = gi >= 0 ? gi : Math.max(0, t.search(/Complete name\s*:/i) - 40);
        return t.slice(start, start + 10000).trim() || null;
    }
    return null;
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
    if (/\b(ita|italian|italiano)\b/i.test(raw)) audioLangs.push('ITA');
    if (/\b(eng|english|inglese)\b/i.test(raw)) audioLangs.push('ENG');
    if (/\b(jap|japanese|giapponese)\b/i.test(raw)) audioLangs.push('JAP');
    if (/\b(fra|fre|french|francese)\b/i.test(raw)) audioLangs.push('FRA');
    if (/\b(spa|spanish|spagnolo)\b/i.test(raw)) audioLangs.push('SPA');
    if (/\b(ger|german|tedesco)\b/i.test(raw)) audioLangs.push('GER');
    if (/\b(multi|multiaudio|dual|dual[\s.-]*audio)\b/i.test(raw) && audioLangs.length === 0) audioLangs.push('MULTI');

    let audioCodec = '';
    if (/\b(atmos|dolby[\s.-]*atmos)\b/i.test(raw)) audioCodec = 'Atmos';
    else if (/\b(truehd|true-hd)\b/i.test(raw)) audioCodec = 'TrueHD';
    else if (/\b(dts-hd[\s.-]*ma|dts-ma)\b/i.test(raw)) audioCodec = 'DTS-HD MA';
    else if (/\b(dts-hd)\b/i.test(raw)) audioCodec = 'DTS-HD';
    else if (/\b(dts)\b/i.test(raw)) audioCodec = 'DTS';
    else if (/\b(ddp|dd\+|e-?ac3|eac3)\b/i.test(raw)) audioCodec = 'E-AC3';
    else if (/\b(ac3|dd5\.1|dd2\.0|dolby[\s.-]*digital)\b/i.test(raw)) audioCodec = 'AC3';
    else if (/\b(aac|aac2\.0)\b/i.test(raw)) audioCodec = 'AAC';
    else if (/\b(flac)\b/i.test(raw)) audioCodec = 'FLAC';

    let channels = '';
    if (/\b(7\.1)\b/.test(raw)) channels = '7.1';
    else if (/\b(5\.1)\b/.test(raw)) channels = '5.1';
    else if (/\b(2\.0)\b/.test(raw)) channels = '2.0';

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
    const yearMatch = raw.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[1] : '';

    let clean = raw.replace(/^\[[^\]]+\]/g, '').replace(/\[.*?\]|\(.*?\)/g, '');
    clean = stripSeasonText(clean)
        .replace(/-MirCrew|-SpyRo|-NovaRip|-TNTVillage|\bMirCrew\b/gi, '')
        .replace(/\b(stagion[ei]|seasons?|completa|complete|pack|in\s*corso|integrale|episodi[oe]?)\b/gi, ' ')
        .replace(/\b(2160p|4k|1080p|1080i|720p|576p|480p|uhd|fhd|hd)\b/gi, '')
        .replace(/\b(remux|uhd[\s.-]*bluray|bluray|bdrip|brrip|web-dl|webdl|webrip|hdtv|dvdrip|dvd)\b/gi, '')
        .replace(/\b(x265|x264|hevc|avc|av1|h\.?264|h\.?265|10bit|10-bit)\b/gi, '')
        .replace(/\b(xvid|divx|sd|pdtv|dsr|hdrip|tvrip|satrip|dvbrip|pir8)\b/gi, '')
        .replace(/\b(hdr10\+|hdr10|hdr|dolby[\s.-]*vision|dv|sdr)\b/gi, '')
        .replace(/\b(dts-hd[\s.-]*ma|dts-hd|dts|truehd|atmos|ddp|eac3|ac3|aac|flac|mp3|5\.1|7\.1|2\.0)\b/gi, '')
        .replace(/\b(sub[\s._-]*(?:ita|eng|multi|forced)|subita|subeng|multisub|softsub|hardsub)\b/gi, '')
        .replace(/\b(ita|eng|italian|english|japanese|jap|fra|spa|ger|multi|dual)\b/gi, '')
        .replace(/[.\-_]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const baseTitle = clean || raw;
    const displayTitle = (isTvSeries && season) ? `${baseTitle} – ${season.label}` : baseTitle;

    return {
        cleanTitle: baseTitle, displayTitle, season, isTvSeries,
        is4k, is1080p, is720p, isH265, isH264, isAv1, is10bit, isHDR, isDV,
        source, audioFormatted, subsFormatted, audioLangs, subLangs,
        audioCodec: audioCodec || 'Standard', year
    };
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

// Costruisce un item "vuoto" a partire dai dati base del topic (usato da forum, ricerca e preferiti)
function buildItem({ topicId, href, raw, type, views, replies, ts, author }) {
    const meta = parseReleaseInfo(raw);
    return {
        id: String(topicId), type,
        url: href, rawTitle: raw,
        cleanTitle: meta.cleanTitle, displayTitle: meta.displayTitle,
        year: meta.year, meta,
        views: views || 0, replies: replies || 0, ts: ts || 0, author: author || '',
        kind: null,
        body: null,
        poster: null, posterSrc: null, posterAlts: [], backdrop: null,
        posterTried: false, synopsis: null, magnet: null, magnets: [], thanksUrl: null, extId: null,
        origTitle: null, fieldYear: null, genre: null, country: null,
        tmdbId: null, tmdbKind: null, vote: null, genres: [], trailer: null, imdbId: null, mediaInfo: null
    };
}

function parseTopicsFromDoc(doc, defaultType, relaxed = false, fallbackType = null) {
    let links = doc.querySelectorAll('a.topictitle');
    if (!links.length) links = [...doc.querySelectorAll('a[href*="viewtopic.php"]')].filter(a => /[?&]t=\d+/.test(a.getAttribute('href') || ''));

    const auto = defaultType === 'auto';
    const generic = defaultType === 'Film' || defaultType === 'Serie TV';
    const items = [];
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

        if (relaxed ? !isReleaseInSection(raw) : !isMovieOrSeries(raw)) return;

        const num = sel => {
            const el = row && row.querySelector(sel);
            if (!el) return 0;
            const t = el.firstChild ? el.firstChild.textContent : el.textContent;
            return parseInt(String(t).replace(/[^\d]/g, ''), 10) || 0;
        };
        const timeEl = row && (row.querySelector('dt time') || row.querySelector('time'));
        const ts = timeEl ? (Date.parse(timeEl.getAttribute('datetime')) || 0) : 0;
        const views = num('.views');
        const replies = num('.posts');
        const authorEl = row && row.querySelector('.username, .username-coloured');
        const author = authorEl ? authorEl.textContent.trim() : '';

        let forumId = null, forumName = '';
        if (auto && row) {
            const fl = row.querySelector('a[href*="viewforum.php"]');
            if (fl) {
                forumId = (fl.getAttribute('href').match(/[?&]f=(\d+)/) || [])[1] || null;
                forumName = fl.textContent.trim();
            }
        }

        let item = registry.get(topicId);
        if (item) {
            item.views = views || item.views;
            item.replies = replies || item.replies;
            item.ts = ts || item.ts;
            item.author = item.author || author;
        } else {
            const meta = parseReleaseInfo(raw);
            let type;
            if (auto) type = (forumId && forumToSection.get(forumId)) || sectionByName(forumName) || fallbackType || forumName || (meta.isTvSeries ? 'Serie TV' : 'Film');
            else type = generic ? ((defaultType === 'Serie TV' || meta.isTvSeries) ? 'Serie TV' : 'Film') : defaultType;
            item = buildItem({ topicId, href, raw, type, views, replies, ts, author });
            registry.set(topicId, item);
        }
        if (auto && forumId) { item.forumId = forumId; item.forumName = forumName; }
        items.push(item);
    });

    items.raw = rawCount;
    items.ids = [...seen];
    return items;
}

// ---- Preferiti ("I miei Preferiti") ----
function favSnapshot(item) {
    return {
        id: String(item.id), url: item.url, rawTitle: item.rawTitle, type: item.type,
        views: item.views || 0, replies: item.replies || 0, ts: item.ts || 0, author: item.author || '',
        forumId: item.forumId || null, forumName: item.forumName || '', added: Date.now()
    };
}

function favItems() {
    return Object.values(favs).map(f => {
        let it = registry.get(String(f.id));
        if (!it) {
            it = buildItem({ topicId: f.id, href: f.url, raw: f.rawTitle, type: f.type || 'Film', views: f.views, replies: f.replies, ts: f.ts, author: f.author });
            if (f.forumId) { it.forumId = f.forumId; it.forumName = f.forumName || ''; }
            registry.set(String(f.id), it);
        }
        return it;
    });
}

function updateFavCount() {
    const el = $('seer-fav-count');
    if (el) el.textContent = Object.keys(favs).length || '';
}

function toggleFav(item) {
    const id = String(item.id);
    if (favs[id]) { delete favs[id]; toast('Rimosso dai preferiti'); }
    else { favs[id] = favSnapshot(item); toast('⭐ Aggiunto ai preferiti', 'ok'); }
    setPref('favs', favs);
    updateFavCount();
    if (view.key === 'favs' && !search.active) renderDeck(localFilterValue());
    else refreshItem(item);
}

// ---- Stato "Scaricato" ----
function markSeen(item, on = true) {
    const id = String(item.id);
    if (on) seenSet.add(id); else seenSet.delete(id);
    persistSeen();
    refreshItem(item);
}
const inflight = new Map();
const jobQueue = [];
let activeJobs = 0;

function enqueue(key, task, el = null) {
    return new Promise((resolve, reject) => {
        jobQueue.push({ key, task, el, resolve, reject });
        pump();
    });
}

function jobScore(job) {
    if (!job.el) return -1;
    const r = job.el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom >= 0 && r.top <= vh) return r.top + r.left / 1000;
    return 100000 + Math.abs(r.top - vh / 2);
}

function pump() {
    while (activeJobs < MAX_CONCURRENT && jobQueue.length) {
        let bestIdx = -1;
        let bestScore = Infinity;
        for (let i = 0; i < jobQueue.length; i++) {
            const job = jobQueue[i];
            if (job.el && !job.el.isConnected) {
                jobQueue.splice(i, 1);
                inflight.delete(job.key);
                job.resolve(CANCELLED);
                i--;
                continue;
            }
            const s = jobScore(job);
            if (s < bestScore) { bestScore = s; bestIdx = i; }
        }
        if (bestIdx === -1) break;

        const [job] = jobQueue.splice(bestIdx, 1);
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
        try { url = new URL(rawSrc, location.href); } catch (e) { continue; }

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

// Cerca nel post un identificativo esterno affidabile: IMDb (tt1234567) oppure link TMDb diretto.
// Ritorna 'tt1234567' | 'tmdb:movie:123' | 'tmdb:tv:456' | null
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
    poster: r.poster_path ? 'https://image.tmdb.org/t/p/w500' + r.poster_path : null,
    backdrop: r.backdrop_path ? 'https://image.tmdb.org/t/p/w1280' + r.backdrop_path : null,
    overview: r.overview || '',
    vote: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
    genres: Array.isArray(r.genres) ? r.genres.map(g => g.name).slice(0, 4) : [],
    trailer: null, imdbId: r.imdb_id || null
});

// Dettagli aggiuntivi: voto, generi, trailer YouTube (it, con fallback en), IMDb ID. Ritorna null in caso di errore.
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

// ---- Campi della scheda nel post (TITOLO ORIGINALE / ANNO / GENERE / PAESE) ----
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

const normT = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

const COUNTRY_MAP = [
    [/\b(usa|stati\s*uniti|america)/i, 'US'], [/\b(italia|italy)/i, 'IT'],
    [/\b(regno\s*unito|uk|inghilterra|gran\s*bretagna)/i, 'GB'], [/\b(francia|france)/i, 'FR'],
    [/\b(giappone|japan)/i, 'JP'], [/\b(corea|korea)/i, 'KR'], [/\b(spagna|spain)/i, 'ES'],
    [/\b(germania|germany)/i, 'DE'], [/\b(canada)/i, 'CA'], [/\b(australia)/i, 'AU']
];
const countryCode = s => { if (!s) return null; const m = COUNTRY_MAP.find(([re]) => re.test(s)); return m ? m[1] : null; };

// Sceglie il risultato TMDb più coerente con i dati del post; null se nessuno è affidabile
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
            else if (kind === 'movie' || firstSeason) continue;   // anno incompatibile: scarta
        }
        if (cc && Array.isArray(r.origin_country) && r.origin_country.includes(cc)) s += 15;
        s += Math.min(r.popularity || 0, 50) / 10;

        if (s > bestScore) { bestScore = s; best = r; }
    }
    return bestScore >= 40 ? best : null;
}

// undefined = errore API (non cacheare), null = nessun risultato affidabile
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

// 1) se il post contiene un ID IMDb/TMDb lo usa (preciso); 2) altrimenti cerca per titolo originale + anno + paese
async function tmdbLookup(item) {
    const apiKey = getTmdbKey();
    if (!apiKey) return null;
    const ext = item.extId || '';
    const isVideoSection = sectionKindOf(item.type) === 'video';
    if (item.type !== 'Film' && item.type !== 'Serie TV' && !(ext && isVideoSection)) return null;

    // --- ricerca tramite ID ---
    if (ext) {
        const idKey = `${CACHE_PREFIX}tmdb_id_${ext.replace(/[^a-z0-9]/gi, '_')}`;
        try { const c = cacheGet(idKey); if (c) return JSON.parse(c); } catch (e) {}
        try {
            let r = null, rk = null;
            if (/^tt\d+$/.test(ext)) {
                const j = await httpGetJson(`https://api.themoviedb.org/3/find/${ext}?api_key=${encodeURIComponent(apiKey)}&language=it-IT&external_source=imdb_id`);
                if (!j || !Array.isArray(j.movie_results) || !Array.isArray(j.tv_results)) return null;   // errore (chiave, rate limit): non cacheare
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
                const en = await tmdbEnrich(out, apiKey);
                if (en) {
                    Object.assign(out, en);
                    cacheSet(idKey, JSON.stringify({ t: Date.now(), ...out }));
                }
                return out;
            }
        } catch (e) { console.warn('TMDB id lookup failed, uso la ricerca per titolo', e); }
        // ID non trovato su TMDb: ripiega sul titolo (solo Film / Serie TV)
        if (item.type !== 'Film' && item.type !== 'Serie TV') return null;
    }

    // --- ricerca per titolo + anno + paese (con punteggio) ---
    const kind = item.type === 'Serie TV' ? 'tv' : 'movie';
    const yKey = item.fieldYear || item.year || '';
    const ck = `${CACHE_PREFIX}tmdb_${kind}_${normT(item.origTitle || item.cleanTitle).replace(/ /g, '_')}_${yKey}`;
    try { const c = cacheGet(ck); if (c) return JSON.parse(c); } catch (e) {}

    const r = await tmdbSearchSmart(item, apiKey, kind);
    if (r === undefined) return null;          // errore API: non cacheare
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
    item.kind = p.kind || 'video';
    if (sectionKindOf(item.type) === 'video' && item.kind === 'audio') item.kind = 'video';
    item.body = p.body || null;
    item.posterTried = true;
    resolvedMem.set(String(item.id), snapshot(item));
}

function scrapeTopicData(item, el = null) {
    if (item.posterTried) return Promise.resolve(snapshot(item));

    const cached = readCache(item.id);
    if (cached) {
        applyParsed(item, cached);
        warmImage(item.poster);
        return Promise.resolve(cached);
    }

    if (inflight.has(item.id)) {
        if (!el) {
            const queued = jobQueue.find(j => j.key === item.id);
            if (queued) queued.el = null;
        }
        return inflight.get(item.id);
    }

    const p = (async () => {
        try {
            const page = await enqueue(item.id, () => fetchTopicPage(item.url), el);
            if (page === CANCELLED) return null;

            const { doc, html } = page;
            const postContent = doc.querySelector('.post .content, .postbody .content, div.content');
            const fullText = postContent ? extractText(postContent) : '';
            const magnets = findMagnets(doc, html);
            const thanksEl = doc.querySelector(THANKS_SELECTOR);
            const thanksUrl = thanksEl && thanksEl.getAttribute('href') ? absHref(thanksEl) : null;
            const authorEl = doc.querySelector('.post .username, .post .username-coloured, .postprofile .username');
            const author = authorEl ? authorEl.textContent.trim() : (item.author || '');
            if (author && !item.author) item.author = author;
            const kind = detectKind(postContent, fullText, magnets, item, !!thanksUrl && !magnets.length);
            item.extId = findExtId(postContent, fullText);

            // Scheda del post: titolo originale, anno, genere, paese (usati per il match TMDb)
            const fields = parsePostFields(fullText);
            Object.assign(item, fields);

            let posterUrl = null, posterAlts = [], posterSrc = null, backdrop = null;
            let synopsisText = null;
            let tm = null;

            if (postContent) {
                const found = pickPosters(postContent, item, author);
                if (found) { posterUrl = found.best; posterAlts = found.alts; posterSrc = 'forum'; }
                synopsisText = extractSynopsis(fullText);
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
                } catch (e) { console.warn('TMDB error', e); }
            }

            const result = {
                ...fields,
                poster: posterUrl, posterSrc, posterAlts, backdrop,
                synopsis: synopsisText || (kind === 'text' ? '' : "Sinossi disponibile all'interno del post sul forum."),
                magnets, magnet: magnets[0] ? magnets[0].uri : null, thanksUrl, extId: item.extId || null, kind,
                tmdbId: tm ? tm.id || null : null, tmdbKind: tm ? tm.kind || null : null,
                vote: tm ? tm.vote || null : null, genres: tm ? tm.genres || [] : [],
                trailer: tm ? tm.trailer || null : null, imdbId: tm ? tm.imdbId || null : null,
                mediaInfo: extractMediaInfo(postContent, fullText),
                body: kind === 'text' ? (stripDividers(fullText).slice(0, 4000) || null) : null
            };

            applyParsed(item, result);
            warmImage(item.poster);
            saveCache(item);
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
            if (!data || !row.isConnected) return;
            fillRow(row, item);
        });
    });
}

// =====================================================================
//  Client torrent locale (qBittorrent / Transmission WebUI)
// =====================================================================
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
}

function renderHero() {
    const box = $('seer-hero');
    if (!heroSlides.length) {
        box.innerHTML = heroBuilding ? '<div class="seer-hero-loading">Sto cercando i titoli del momento…</div>' : '';
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
            ${bg ? `<img class="seer-hero-bg ${blur ? 'blur' : ''}" src="${esc(bg)}" alt="" decoding="async" ${active ? 'fetchpriority="high"' : ''} ${bgRole}>` : ''}
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
                ${it.poster ? `<div class="seer-hero-poster"><img src="${esc(it.poster)}" alt="" decoding="async" ${active ? 'fetchpriority="high"' : ''} data-seer-id="${esc(it.id)}" data-seer-role="poster"></div>` : ''}
            </div>
        </div>`;
    }).join('');

    const dots = heroSlides.map((_, i) => `<button class="seer-hero-dot ${i === heroIdx ? 'active' : ''}" data-hero="${i}" aria-label="Slide ${i + 1}"></button>`).join('');
    box.innerHTML = slides +
        (heroSlides.length > 1 ? `<button class="seer-hero-arrow prev" data-hero="prev" aria-label="Precedente">‹</button><button class="seer-hero-arrow next" data-hero="next" aria-label="Successivo">›</button>` : '') +
        `<div class="seer-hero-dots">${dots}</div>`;
}

let mainMorePromise = null;
function loadMoreMain() {
    if (mainMorePromise) return mainMorePromise;
    mainMorePromise = (async () => {
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

async function collectHeroBatch(token, onEach) {
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

        const jobs = pool.map(it => scrapeTopicData(it).catch(() => null));
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
        const b = await collectHeroBatch(token);
        if (token === heroToken && b && b.length) { heroNext = b; b.forEach(it => warmImage(it.backdrop || it.poster)); }
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

// Link esterni rapidi (IMDb / TMDb / JustWatch)
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

function paintModalTools(item) {
    const box = $('seer-modal-tools');
    if (!box) return;
    const fav = isFav(item.id), seen = isSeen(item.id);
    let h = `<button class="seer-tool-btn ${fav ? 'on' : ''}" data-act="fav">${fav ? '★ Nei preferiti' : '☆ Aggiungi ai preferiti'}</button>`;
    h += `<button class="seer-tool-btn ${seen ? 'on' : ''}" data-act="seen">${seen ? '✓ Scaricato (clic per annullare)' : '⬇️ Segna come scaricato'}</button>`;
    if (item.trailer) h += `<button class="seer-tool-btn trailer" data-act="trailer">▶ Guarda Trailer</button>`;
    externalLinks(item).forEach(l => {
        h += `<a class="seer-tool-btn" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${l.ico} ${esc(l.name)}</a>`;
    });
    box.innerHTML = h;
}

function paintModal(item) {
    const kind = effKind(item) || 'video';
    const win = $('seer-modal-overlay').querySelector('.seer-detail-window');
    win.classList.toggle('no-specs', kind !== 'video');
    win.classList.toggle('text-mode', kind === 'text');

    $('seer-modal-title').innerText = item.displayTitle;
    $('seer-modal-forum').href = item.url;

    let chipsHtml = '';
    if (item.year) chipsHtml += `<span class="seer-chip">${esc(item.year)}</span>`;
    chipsHtml += `<span class="seer-chip">${esc(item.type)}</span>`;
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
        chipsHtml += `<span class="seer-chip">${esc(item.meta.source)}</span>`;
        if (item.meta.isDV) chipsHtml += `<span class="seer-chip" style="background:#f59e0b; color:#000;">Dolby Vision</span>`;
        if (item.meta.isHDR) chipsHtml += `<span class="seer-chip" style="background:#d946ef; color:#fff;">HDR</span>`;
        chipsHtml += `<span class="seer-chip chip-audio">🔊 ${esc(item.meta.audioFormatted)}</span>`;
        chipsHtml += `<span class="seer-chip chip-subs">💬 Sub: ${esc(item.meta.subsFormatted)}</span>`;
    }
    $('seer-modal-chips').innerHTML = chipsHtml;

    if (kind === 'video') {
        $('spec-res').innerText = item.meta.is4k ? '4K Ultra HD (2160p)' : (item.meta.is1080p ? 'Full HD (1080p)' : (item.meta.is720p ? 'HD (720p)' : 'SD / Standard'));
        $('spec-codec').innerText = (item.meta.isH265 ? 'HEVC (H.265)' : (item.meta.isH264 ? 'AVC (H.264)' : (item.meta.isAv1 ? 'AV1' : 'H.264'))) + (item.meta.is10bit ? ' 10-bit' : '');
        $('spec-audio').innerText = item.meta.audioFormatted;
        $('spec-subs').innerText = item.meta.subsFormatted;
    }
    $('seer-modal-raw').innerText = item.rawTitle;
    $('seer-modal-text').innerText = kind === 'text' ? (item.body || 'Caricamento del testo dal post...') : '';
    $('seer-modal-overview').innerText = item.synopsis || 'Caricamento sinossi originale dal post...';

    // Fisarmonica MediaInfo
    const mi = $('seer-mediainfo-wrap');
    if (item.mediaInfo && kind !== 'text') {
        mi.style.display = '';
        if (mi.dataset.itemId !== String(item.id)) { mi.open = false; mi.dataset.itemId = String(item.id); }
        $('seer-mediainfo-pre').textContent = item.mediaInfo;
    } else {
        mi.style.display = 'none';
        mi.dataset.itemId = '';
    }

    paintModalTools(item);
}

function copyToClipboard(t) {
    if (typeof GM_setClipboard !== 'undefined') GM_setClipboard(t);
    else navigator.clipboard.writeText(t);
}

function openMagnet(uri) {
    const a = document.createElement('a');
    a.href = uri;
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

async function openDetailModal(item) {
    const myToken = ++modalToken;

    const overlay = $('seer-modal-overlay');
    const modalWindow = overlay.querySelector('.seer-detail-window');
    const copyBtn = $('seer-copy-btn');

    currentModalItem = item;
    modalWindow.classList.remove('is-landscape', 'is-portrait');
    $('seer-mediainfo-wrap').dataset.itemId = '';

    currentTopicUrl = null;
    copyBtn.className = 'seer-action-btn';
    copyBtn.disabled = true;
    copyBtn.innerHTML = `<span>⏳</span> Lettura del post...`;

    paintModal(item);
    paintModalArt(item);
    renderMagnetUI(item);
    overlay.style.display = 'flex';

    await scrapeTopicData(item);
    if (myToken !== modalToken) return;

    paintModal(item);
    paintModalArt(item);

    if (!(item.magnets && item.magnets.length)) {
        try {
            const found = await unlockMagnet(item);
            if (found && found.length) {
                item.magnets = found;
                item.magnet = found[0].uri;
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

// ---- Trailer (lightbox YouTube) ----
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

function applySort(items) {
    const a = items.slice();
    switch (sortMode) {
        case 'views':   a.sort((x, y) => (y.views || 0) - (x.views || 0)); break;
        case 'replies': a.sort((x, y) => (y.replies || 0) - (x.replies || 0)); break;
        case 'title':   a.sort((x, y) => x.cleanTitle.localeCompare(y.cleanTitle, 'it', { numeric: true, sensitivity: 'base' })); break;
        default:        a.sort((x, y) => (y.ts || 0) - (x.ts || 0));
    }
    return a;
}

// ---- Filtri rapidi (facets) ----
// ---- Filtri rapidi (facets) dipendenti dalla sezione ----
const FACETS = [['q4k', '💎 Solo 4K / UHD'], ['hdr', '📺 Dolby Vision / HDR'], ['complete', '📦 Stagione Completa']];
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
    if (!search.active && view.key === 'favs') return 'mixed';
    const n = curSectionName();
    return (n && sectionKindOf(n)) || 'home';
}

function facetsFor() {
    const sc = facetScope(), n = curSectionName();
    const vid = sc === 'home' || sc === 'video';
    return { vid, complete: vid && !FILM_ONLY.has(n), type: sc === 'home', fmts: FMT_BY_SECTION[n] || [] };
}

function anyFilter() {
    const f = facetsFor();
    return hideSeen
        || (f.vid && (filters.q4k || filters.hdr || filters.ita))
        || (f.complete && filters.complete)
        || (f.type && filters.type !== 'all')
        || f.fmts.includes(filters.fmt);
}

const isCompleteRelease = it =>
    !!(it.meta.season && (it.meta.season.kind === 'complete' || /Complet/i.test(it.meta.season.label))) ||
    /\b(complet[ae]|integrale|full[\s._-]*series)\b/i.test(it.rawTitle);

const fmtHaystack = it => [it.rawTitle, it.mediaInfo || '', ...(it.magnets || []).map(m => m.dn || '')].join(' ');

function applyFilters(items) {
    if (!anyFilter()) return items;
    const f = facetsFor();
    const fmtRe = f.fmts.includes(filters.fmt) ? FMT[filters.fmt][1] : null;
    return items.filter(it => {
        const m = it.meta;
        if (f.vid) {
            if (filters.q4k && !m.is4k) return false;
            if (filters.hdr && !(m.isDV || m.isHDR)) return false;
            if (filters.ita && !m.audioLangs.includes('ITA')) return false;
        }
        if (f.complete && filters.complete && !isCompleteRelease(it)) return false;
        if (f.type) {
            if (filters.type === 'film' && it.type !== 'Film') return false;
            if (filters.type === 'series' && it.type !== 'Serie TV') return false;
        }
        if (fmtRe && !fmtRe.test(fmtHaystack(it))) return false;
        if (hideSeen && isSeen(it.id)) return false;
        return true;
    });
}

function renderFacets() {
    const box = $('seer-facets');
    if (!box) return;
    const f = facetsFor();
    const chip = (attr, label, on, cls = '') => `<button class="seer-facet ${on ? 'active' : ''} ${cls}" ${attr}>${label}</button>`;
    const groups = [];
    if (f.vid) groups.push(FACETS.filter(([k]) => k !== 'complete' || f.complete).map(([k, l]) => chip(`data-facet="${k}"`, l, filters[k])).join(''));
    if (f.type) groups.push(chip('data-ftype="film"', '🗂️ Solo Film', filters.type === 'film') + chip('data-ftype="series"', '📺 Solo Serie', filters.type === 'series'));
    if (f.fmts.length) groups.push(f.fmts.map(k => chip(`data-fmt="${k}"`, FMT[k][0], filters.fmt === k)).join(''));
    groups.push(chip('data-facet="hideSeen"', '🙈 Nascondi già scaricati', hideSeen) + (anyFilter() ? chip('data-facet="reset"', '✖ Azzera filtri', false, 'reset') : ''));
    box.innerHTML = groups.join('<span class="seer-facet-sep"></span>');
}

function getVisibleItems() {
    let base;
    if (search.active) base = search.items;
    else if (view.key === 'favs') base = favItems();
    else if (view.key === 'section') base = currentSectionStore().items;
    else {
        base = main.items;
        if (view.key === 'films') base = base.filter(i => i.type === 'Film');
        if (view.key === 'series') base = base.filter(i => i.type === 'Serie TV');
    }
    lastBaseCount = base.length;
    return applyFilters(applySort(base));
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
    const btn = $('seer-load-more-btn');
    let show = true, label = '📥 Carica Altre Uscite';
    if (search.active) { show = !!search.nextUrl; label = '📥 Carica altri risultati'; }
    else if (view.key === 'favs') { show = false; }
    else if (view.key === 'section') { show = !currentSectionStore().exhausted; label = '📥 Carica altri topic'; }
    else { show = !main.exhausted; }
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
    else if (view.key === 'films') t.textContent = '🎬 Film Disponibili';
    else if (view.key === 'series') t.textContent = '📺 Serie TV';
    else if (view.key === 'favs') t.textContent = '⭐ I miei Preferiti';
    else if (view.key === 'section') t.textContent = iconFor(view.section.name) + ' ' + view.section.name;
    else t.textContent = '🆕 Ultime Release';

    const hint = $('seer-search-hint');
    if (search.active && search.scope === 'scoped') {
        hint.innerHTML = `<span>Risultati solo in <b>${esc(search.label)}</b>.</span><button class="seer-load-btn" id="seer-search-all-btn" style="padding:6px 14px; font-size:12.5px;">🌐 Cerca in tutte le sezioni</button>`;
    } else hint.innerHTML = '';

    $('seer-search-input').placeholder = `Cerca in ${resolveSearchScope().label}…  ( / )`;

    document.querySelectorAll('#seer-view-toggle button').forEach(b => b.classList.toggle('active', b.dataset.view === viewMode));
    renderFacets();
    syncSidebarActive();
    updateHeroVisibility();
    updateLoadMore();
}

function fillRow(row, item) {
    const m = item.meta;
    const kind = effKind(item);
    const looksVideo = kind === 'video' || (!kind && VIDEO_TYPES.has(item.type));
    const grid = viewMode === 'grid';
    const seen = isSeen(item.id);
    const fav = isFav(item.id);

    row.classList.toggle('is-card', grid);
    row.classList.toggle('is-seen', seen);

    let badgesHtml = '';
    let specsHtml = '';

    if (kind === 'text') {
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
        if (m.isDV) badgesHtml += `<span class="seer-tag tag-dv">DV</span>`;
        else if (m.isHDR) badgesHtml += `<span class="seer-tag tag-hdr">HDR</span>`;
        if (m.season) badgesHtml += `<span class="seer-tag tag-season">📺 ${esc(m.season.short)}</span>`;
        specsHtml = `
            <span class="seer-pill audio">🔊 ${esc(m.audioFormatted)}</span>
            ${m.subLangs.length ? `<span class="seer-pill subs">💬 Sub: ${esc(m.subsFormatted)}</span>` : ''}
            <span class="seer-pill codec">${esc(m.isH265 ? 'H.265' : (m.isH264 ? 'H.264' : 'Video'))}</span>
            <span class="seer-pill codec">${esc(m.source)}</span>`;
    } else {
        specsHtml = `<span class="seer-preview">Lettura del post…</span>`;
    }
    if (seen) badgesHtml += `<span class="seer-tag tag-seen">✓ Scaricato</span>`;

    const icon = kind ? kindIcon(item) : typeIcon(item);
    const hi = row.dataset.hi === '1';
    const posterHtml = item.poster
        ? `<img class="seer-poster" src="${esc(item.poster)}" alt="" decoding="async" ${hi ? 'fetchpriority="high"' : 'loading="lazy"'} data-seer-id="${esc(item.id)}" data-seer-role="poster" />`
        : `<div class="seer-poster-fallback">${icon}</div>`;

    const favBtn = `<button class="seer-fav-btn ${fav ? 'on' : ''}" data-fav="1" title="${fav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">${fav ? '★' : '☆'}</button>`;

    if (grid) {
        row.innerHTML = `
            <div class="seer-poster-wrap">${posterHtml}<div class="seer-card-badges">${badgesHtml}</div>${favBtn}</div>
            <div class="seer-info"><span class="seer-title" title="${esc(item.rawTitle)}">${esc(item.displayTitle)}</span></div>
            <div class="seer-card-meta"><span>${esc(item.type)}${item.year ? ' · ' + esc(item.year) : ''}</span><span>👁️ ${esc(fmtViews(item.views || 0))}</span></div>
        `;
        return;
    }

    row.innerHTML = `
        <div class="seer-poster-wrap">${posterHtml}</div>
        <div class="seer-info">
            <div class="seer-title-line">
                <span class="seer-title" title="${esc(item.rawTitle)}">${esc(item.displayTitle)}</span>
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

function renderDeck(filterQuery = '') {
    cancelQueued();
    const listContainer = $('seer-main-list');
    listContainer.innerHTML = '';
    listContainer.classList.toggle('seer-grid', viewMode === 'grid');

    let displayed = getVisibleItems();
    updateChrome();
    if (filterQuery && !search.active) {
        const q = filterQuery.toLowerCase();
        displayed = displayed.filter(item => item.rawTitle.toLowerCase().includes(q));
    }

    $('seer-count').innerText = search.active
        ? `${displayed.length} risultati per "${search.query}"`
        : `${displayed.length} uscite mostrate`;

    if (displayed.length === 0) {
        if (view.key === 'favs' && !search.active && lastBaseCount === 0) showListMessage('Non hai ancora preferiti: premi ☆ su una release per aggiungerla qui.');
        else if (anyFilter() && lastBaseCount > 0) showListMessage('Nessuna uscita corrisponde ai filtri attivi. Prova ad azzerarli o a caricare altre uscite.');
        else showListMessage('Nessuna uscita da mostrare qui.');
        return;
    }

    let idx = 0;
    const addRow = item => {
        const row = document.createElement('div');
        row.className = 'seer-row' + (viewMode === 'grid' ? ' is-card' : '');
        row.dataset.topicId = item.id;
        if (idx++ < IMG_HI_COUNT) row.dataset.hi = '1';
        fillRow(row, item);
        row.onclick = e => {
            if (e.target.closest('.seer-fav-btn')) { e.stopPropagation(); toggleFav(item); return; }
            openDetailModal(item);
        };
        listContainer.appendChild(row);
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
            listContainer.appendChild(h);
            arr.forEach(addRow);
        });
    } else {
        displayed.forEach(addRow);
    }
}

const localFilterValue = () => {
    const q = $('seer-search-input').value.trim();
    return (!search.active && q.length >= 3) ? q : '';
};
async function setView(key, section = null) {
    const token = ++viewToken;

    if (search.active) {
        searchToken++;
        search = { active: false, scope: 'scoped', query: '', label: '', items: [], nextUrl: null, sc: null };
    }
    $('seer-search-input').value = '';
    view = { key, section };
    $('seer-sidebar').classList.remove('open');
    $('mirseer-app').scrollTop = 0;

    if (key === 'section') {
        let store = sections.get(String(section.id));
        if (!store) {
            store = { items: [], group: null, exhausted: false, loaded: false };
            sections.set(String(section.id), store);
        }
        if (!store.loaded) {
            updateChrome();
            showListMessage(`Caricamento di "${esc(section.name)}"...`);
            await loadSection(section, store);
            if (token !== viewToken) return;
        }
    } else if (key !== 'favs' && !main.loaded) {
        updateChrome();
        showListMessage('Caricamento uscite in corso...');
        await loadMain();
        if (token !== viewToken) return;
    }
    renderDeck();
}

async function fetchForumTopics(forumId, typeName, start = 0, relaxed = false) {
    try {
        const resp = await fetch(`/viewforum.php?f=${forumId}&start=${start}`, { credentials: 'same-origin' });
        const text = await resp.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        return { doc, items: parseTopicsFromDoc(doc, typeName, relaxed) };
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
    if (settings.heroEnabled) buildHero();
}

async function loadMorePages() {
    $('seer-load-more-btn').innerText = 'Caricamento in corso...';
    await loadMoreMain();
    renderDeck(localFilterValue());
}

async function loadSection(section, store) {
    if (!store.group) store.group = makeGroup([makeCursor(section.id, section.name, true, true)], true, SIDE_HIDE_RE);
    const got = await pullGroup(store.group);
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
    const resp = await fetch(url, { credentials: 'same-origin' });
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const items = parseTopicsFromDoc(doc, 'auto', sc.relaxed, sc.fallbackType);
    const msg = (doc.querySelector('#message') || {}).textContent || '';
    const flood = items.length === 0 && /presto|soon|flood/i.test(msg);
    const next = doc.querySelector('a[rel="next"]');
    const nextUrl = next ? new URL(next.getAttribute('href'), location.href).href : null;
    return { items, flood, nextUrl };
}

async function runSearch(query) {
    const token = ++searchToken;
    cancelQueued();
    const sc = resolveSearchScope();
    showListMessage(`🔍 Ricerca "${esc(query)}" in ${esc(sc.label)}...`);

    try {
        const page = await fetchSearchPage(buildSearchUrl(query, sc.fids), sc);
        if (token !== searchToken) return;

        if (page.flood) {
            toast('⏳ Limite frequenza ricerche del forum raggiunto: attendi qualche secondo e riprova', 'warn', 4500);
            showListMessage('⏳ Il forum limita la frequenza delle ricerche. Attendi qualche secondo e riprova.', 'warn');
            return;
        }
        search = { active: true, scope: sc.mode === 'all' ? 'all' : 'scoped', query, label: sc.label, items: page.items, nextUrl: page.nextUrl, sc };
        renderDeck();
        if (page.items.length === 0) showListMessage(`Nessun risultato per "${esc(query)}" in ${esc(sc.label)}.`);
    } catch (e) {
        if (token !== searchToken) return;
        console.error('Search failed', e);
        toast('Richiesta di ricerca non riuscita: controlla la connessione', 'err');
        showListMessage('Richiesta non riuscita. Verifica la connessione al forum.', 'err');
    }
}

async function loadMoreSearch() {
    if (!search.nextUrl) return;
    const token = searchToken;
    $('seer-load-more-btn').innerText = 'Caricamento in corso...';
    try {
        const page = await fetchSearchPage(search.nextUrl, search.sc);
        if (token !== searchToken) return;
        search.items = uniqById([...search.items, ...page.items]);
        search.nextUrl = page.nextUrl;
    } catch (e) { console.error(e); toast('Caricamento dei risultati non riuscito', 'err'); }
    renderDeck();
}

function resetSearchState() {
    searchToken++;
    search = { active: false, scope: 'scoped', query: '', label: '', items: [], nextUrl: null, sc: null };
}

function exitSearchMode(filterQuery = '') {
    resetSearchState();
    renderDeck(filterQuery);
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
                <button class="seer-theme-btn" id="seer-settings-btn" title="Impostazioni">⚙️</button>
                <button class="seer-theme-btn" id="seer-theme-btn" title="Cambia tema">☀️</button>
                <button class="seer-exit-btn" id="seer-exit" title="Esci (Esc)">Esci</button>
            </div>
        </div>

        <div class="seer-shell">
            <aside class="seer-sidebar" id="seer-sidebar">
                <div class="seer-side-title">Navigazione</div>
                <button class="seer-side-item active" data-nav="home"><span class="ico">🏠</span><span class="lbl">Home</span></button>
                <button class="seer-side-item" data-nav="favs"><span class="ico">⭐</span><span class="lbl">I miei Preferiti</span><span class="seer-side-count" id="seer-fav-count"></span></button>
                <div class="seer-side-title">🧭 Sezioni</div>
                <div id="seer-side-sections"></div>
            </aside>

            <main class="seer-content">
                <section id="seer-hero"></section>
                <div class="seer-header-row">
                    <h2 class="seer-section-title" id="seer-section-title">🆕 Ultime Release</h2>
                    <div class="seer-header-tools">
                        <span id="seer-count" class="seer-count-badge">Caricamento...</span>
                        <div class="seer-view-toggle" id="seer-view-toggle">
                            <button data-view="list" title="Vista lista">☰</button>
                            <button data-view="grid" title="Vista locandine">▦</button>
                        </div>
                        <select id="seer-sort-select" class="seer-sort-select" title="Ordina per">
                            <option value="recent">🕒 Più recenti</option>
                            <option value="views">🔥 Più visti</option>
                            <option value="title">🔤 Titolo (A - Z)</option>
                            <option value="replies">💬 Più risposte</option>
                        </select>
                    </div>
                </div>
                <div id="seer-search-hint"></div>
                <div class="seer-facets" id="seer-facets"></div>
                <div class="seer-list seer-main-list" id="seer-main-list"></div>
                <div style="text-align:center; margin:35px 0 25px 0;">
                    <button id="seer-load-more-btn" class="seer-load-btn">📥 Carica Altre Uscite</button>
                </div>
            </main>
        </div>

        <div id="seer-modal-overlay">
            <div class="seer-detail-window">
                <button class="seer-modal-close" id="seer-modal-close-btn">&times;</button>
                <a class="seer-modal-forum" id="seer-modal-forum" href="#" target="_blank" rel="noopener" title="Apri il post sul forum">🔗 Forum</a>
                <div class="seer-modal-left" id="seer-modal-left-art"></div>
                <div class="seer-modal-right">
                    <h2 class="seer-modal-title" id="seer-modal-title"></h2>
                    <div class="seer-chips-row" id="seer-modal-chips"></div>
                    <div class="seer-modal-tools" id="seer-modal-tools"></div>
                    <div class="seer-specs-matrix">
                        <div class="seer-spec-box"><span class="seer-spec-label">Risoluzione</span><span class="seer-spec-value" id="spec-res">--</span></div>
                        <div class="seer-spec-box"><span class="seer-spec-label">Video Codec</span><span class="seer-spec-value" id="spec-codec">--</span></div>
                        <div class="seer-spec-box"><span class="seer-spec-label">Traccia Audio</span><span class="seer-spec-value" id="spec-audio">--</span></div>
                        <div class="seer-spec-box"><span class="seer-spec-label">Sottotitoli</span><span class="seer-spec-value" id="spec-subs">--</span></div>
                    </div>
                    <div class="seer-synopsis-box">
                        <div class="seer-synopsis-head">Trama / Sinossi</div>
                        <p class="seer-synopsis-body" id="seer-modal-overview"></p>
                    </div>
                    <div class="seer-text-box" id="seer-modal-text"></div>
                    <details class="seer-mediainfo" id="seer-mediainfo-wrap" style="display:none;">
                        <summary>🔬 Mostra MediaInfo Completo</summary>
                        <pre id="seer-mediainfo-pre"></pre>
                    </details>
                    <div class="seer-raw-box" id="seer-modal-raw"></div>
                    <div class="seer-magnet-box" id="seer-magnet-box">
                        <button class="seer-action-btn" id="seer-send-all-btn" style="display:none;"><span>⬇️</span> Invia Tutti</button>
                        <div class="seer-magnet-list" id="seer-magnet-list"></div>
                    </div>
                    <button class="seer-action-btn" id="seer-copy-btn"><span>📋</span> Copia Magnet Link negli Appunti</button>
                    <button class="seer-action-btn" id="seer-send-btn" style="display:none; margin-top:9px;"><span>⬇️</span> Invia al client torrent</button>
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
                                <span class="seer-set-sub">"Apri nel client" richiede un client Torrent associato ai link magnet. "Copia tutti" copia sempre negli appunti.</span>
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
                            <kbd>←</kbd> <kbd>→</kbd> — cambia slide del carosello
                        </p>
                    </section>

                    <p class="seer-settings-help">Le preferenze vengono salvate automaticamente. Solo la chiave TMDb richiede di premere "Salva".</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(app);
    updateFavCount();

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

    // --- Impostazioni: TMDb API Key ---
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

    // --- Impostazioni: preferenze, avvio, magnet, client torrent, cache ---
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
        sStart.innerHTML = '<option value="home">🏠 Home (Ultime uscite)</option><option value="favs">⭐ I miei Preferiti</option>' +
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
            const t = startTarget();
            await setView(t.key, t.section);
        } else updateHeroVisibility();
    };

    const exitApp = () => {
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

    // --- Modale dettaglio ---
    const overlay = $('seer-modal-overlay');
    const closeModal = () => { overlay.style.display = 'none'; };
    $('seer-modal-close-btn').onclick = closeModal;
    overlay.onclick = e => { if (e.target === overlay) closeModal(); };

    $('seer-modal-tools').onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b || !currentModalItem) return;
        const it = currentModalItem;
        if (b.dataset.act === 'fav') toggleFav(it);
        else if (b.dataset.act === 'seen') { markSeen(it, !isSeen(it.id)); toast(isSeen(it.id) ? '✓ Segnato come scaricato' : 'Rimosso dagli scaricati'); }
        else if (b.dataset.act === 'trailer') openTrailer(it);
    };

    // --- Trailer ---
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
                openMagnet(mags[0].uri);
                flash(copyBtn, `<span>✅</span> Magnet inviato al client!`, magnetBtnLabel(), 'copied');
                toast('🧲 Magnet inviato al client torrent', 'ok');
            } else {
                copyToClipboard(mags[0].uri);
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
            openMagnet(m.uri);
            flash(b, '✅ Inviato', magnetItemLabel(), 'copied');
            toast('🧲 Magnet inviato al client torrent', 'ok');
        } else {
            copyToClipboard(m.uri);
            flash(b, '✅ Copiato', magnetItemLabel(), 'copied');
            toast('📋 Magnet copiato negli appunti', 'ok');
        }
        markSeen(currentModalItem, true);
    };

    $('seer-load-more-btn').onclick = () => {
        if (search.active) loadMoreSearch();
        else if (view.key === 'section') loadMoreSection();
        else loadMorePages();
    };

    $('seer-sort-select').onchange = e => {
        sortMode = e.target.value;
        renderDeck(localFilterValue());
    };

    // --- Vista lista / griglia ---
    $('seer-view-toggle').onclick = e => {
        const b = e.target.closest('button[data-view]');
        if (!b) return;
        const v = b.dataset.view === 'grid' ? 'grid' : 'list';
        if (v === viewMode) return;
        viewMode = v;
        setPref('viewMode', viewMode);
        renderDeck(localFilterValue());
    };

    // --- Filtri rapidi ---
    $('seer-facets').onclick = e => {
        const b = e.target.closest('.seer-facet');
        if (!b) return;
        const f = b.dataset.facet, t = b.dataset.ftype, fm = b.dataset.fmt;
        if (t) filters.type = filters.type === t ? 'all' : t;
        else if (fm) filters.fmt = filters.fmt === fm ? 'all' : fm;
        else if (f === 'reset') {
            filters.q4k = filters.hdr = filters.ita = filters.complete = false;
            filters.type = 'all';
            filters.fmt = 'all';
            if (hideSeen) { hideSeen = false; setPref('hideSeen', false); }
        } else if (f === 'hideSeen') { hideSeen = !hideSeen; setPref('hideSeen', hideSeen); }
        else if (f in filters) filters[f] = !filters[f];
        renderDeck(localFilterValue());
    };

    const searchInput = $('seer-search-input');
    let searchTimer = null;

    searchInput.oninput = e => {
        const q = e.target.value.trim();
        clearTimeout(searchTimer);

        if (q.length < 3) {
            exitSearchMode();
            return;
        }
        if (!search.active) renderDeck(q);
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

    // --- Scorciatoie da tastiera ---
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
            } else exitApp();
            return;
        }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing && !trailerOpen && !settingsOpen && !modalOpen && heroWanted() && heroSlides.length > 1) {
            e.preventDefault();
            goHero(e.key === 'ArrowLeft' ? heroIdx - 1 : heroIdx + 1);
            startHero();
        }
    });

    renderFacets();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
