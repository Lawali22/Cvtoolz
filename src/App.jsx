import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";

// ── Signaler à la landing statique que React est prêt ──
if (typeof window !== "undefined") {
  window.__notifyReactReady = function() {
    window.__onReactReady && window.__onReactReady();
  };
}

// ── Lazy loading chunks ──
const TemplatesCV        = lazy(() => import("./TemplatesCV.jsx"));
const TemplatesLetter    = lazy(() => import("./TemplatesLetter.jsx"));
const AdminDashboardLazy = lazy(() => import("./Admin.jsx").then(m => ({ default: m.AdminDashboard })));

function ChunkLoader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      padding:40, color:"var(--ink3)", fontSize:13, gap:10 }}>
      <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--terra)",
        animation:"pulse 0.8s ease infinite" }}/>
      Chargement...
    </div>
  );
}

/* ─── GOOGLE SHEETS — Collecte candidats ─── */
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzitGS0pk6SnITCnxfU9bN43e6oi7z0X4jnyGKCG1dqUddlGKGQWkvjgYz4l5loTHUOGg/exec";

async function saveCandidat(form, mode) {
  try {
    const name = form.nameOrder === "lastFirst"
      ? (form.lastName + " " + form.firstName).trim()
      : (form.firstName + " " + form.lastName).trim();
    await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenom:      form.firstName || "",
        nom:         form.lastName  || "",
        email:       form.email     || "",
        telephone:   form.phone     || "",
        ville:       form.location  || "",
        titre:       form.title     || "",
        competences: form.skills    || "",
        mode:        mode,
        template:    form.template  || "",
      }),
    });
    console.log("Candidat enregistré dans Google Sheets ✓");
  } catch(err) {
    console.warn("Sheets:", err.message);
  }
}



/* ─────────────────────────────────────────────
   CVtools v9 — Navigation horizontale, nouveaux champs,
   drag-drop, lettre de motivation, partage WhatsApp
─────────────────────────────────────────────*/

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

  :root {
    --cream:#f5f0e8; --cream2:#ede6d6; --cream3:#e0d5c0;
    --ink:#1c1812; --ink2:#3a3228; --ink3:#6b5f52; --ink4:#9c8e80;
    --terra:#b85c38; --terra2:#d4764e; --gold:#c49a3c;
    --border:#d4c9b5; --border2:#c2b49e; --green:#2a7a2a;
    --pad-x: clamp(14px, 5vw, 44px);
    --content-max: 700px;
  }

  html, body {
    background:var(--cream); color:var(--ink);
    font-family:'DM Sans',sans-serif; font-size:15px; line-height:1.6;
    -webkit-font-smoothing:antialiased; overflow-x:hidden;
  }

  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:99px; }
  ::selection { background:rgba(180,90,50,0.15); }
  input,textarea,button,select { font-family:inherit; }

  /* ── Keyframes ── */
  @keyframes slideInRight  { from{opacity:0;transform:translateX(32px)}  to{opacity:1;transform:translateX(0)} }
  @keyframes slideInLeft   { from{opacity:0;transform:translateX(-32px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideOutLeft  { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-28px)} }
  @keyframes slideOutRight { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(28px)} }
  @keyframes fadeIn        { from{opacity:0} to{opacity:1} }
  @keyframes fadeUp        { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeDown      { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn       { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
  @keyframes spin          { to{transform:rotate(360deg)} }
  @keyframes shake         { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
  @keyframes confetti-fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
  @keyframes pulse         { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
  @keyframes buildLine     { from{width:0} to{width:100%} }
  @keyframes dotBounce     { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
  @keyframes shimmer       { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes popIn         { 0%{opacity:0;transform:scale(0.8) translateY(8px)} 70%{transform:scale(1.04) translateY(-2px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes hbarIn        { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes screenIn      { from{opacity:0;transform:scale(0.98)} to{opacity:1;transform:scale(1)} }

  /* ── Animation classes ── */
  .slide       { animation:slideInRight 0.38s cubic-bezier(0.16,1,0.3,1) both; }
  .slide-back  { animation:slideInLeft  0.38s cubic-bezier(0.16,1,0.3,1) both; }
  .fadein      { animation:fadeIn  0.35s ease both; }
  .fadeup      { animation:fadeUp  0.42s cubic-bezier(0.16,1,0.3,1) both; }
  .fadedown    { animation:fadeDown 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .scalein     { animation:scaleIn 0.32s cubic-bezier(0.16,1,0.3,1) both; }
  .popin       { animation:popIn   0.4s  cubic-bezier(0.16,1,0.3,1) both; }
  .screen-in   { animation:screenIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }

  /* ── FIELDS ── */
  .field {
    width:100%; background:#fff; border:1.5px solid var(--border);
    border-radius:8px; padding:11px 14px; color:var(--ink); font-size:14px;
    outline:none; transition:border-color 0.22s,box-shadow 0.22s,transform 0.15s; appearance:none;
    -webkit-appearance:none;
  }
  .field:focus { border-color:var(--terra); box-shadow:0 0 0 3px rgba(184,92,56,0.12); transform:translateY(-1px); }
  .field:focus::placeholder { opacity:0.5; transition:opacity 0.2s; }
  .field::placeholder { color:var(--ink4); font-style:italic; }
  .field:disabled { opacity:0.4; cursor:not-allowed; background:var(--cream2); }
  .field.err { border-color:#c0392b; box-shadow:0 0 0 3px rgba(192,57,43,0.08); }

  /* ── BUTTONS ── */
  .btn-main {
    background:var(--terra); color:#fff; border:none; border-radius:8px;
    padding:12px 24px; font-size:13.5px; font-weight:600; letter-spacing:0.2px;
    cursor:pointer; transition:background 0.2s,transform 0.18s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s;
    display:inline-flex; align-items:center; gap:8px; white-space:nowrap;
    -webkit-tap-highlight-color:transparent; position:relative; overflow:hidden;
  }
  .btn-main::after { content:''; position:absolute; inset:0; background:rgba(255,255,255,0);
    transition:background 0.15s; border-radius:inherit; }
  .btn-main:hover { background:var(--terra2); transform:translateY(-2px) scale(1.02); box-shadow:0 6px 20px rgba(184,92,56,0.35); }
  .btn-main:active { transform:translateY(0) scale(0.97); box-shadow:none; }
  .btn-main:active::after { background:rgba(255,255,255,0.12); }
  .btn-main:disabled { opacity:0.45; cursor:not-allowed; transform:none; box-shadow:none; }

  .btn-line {
    background:transparent; color:var(--ink3); border:1.5px solid var(--border);
    border-radius:8px; padding:11px 20px; font-size:13px; font-weight:500;
    cursor:pointer; transition:all 0.2s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1); white-space:nowrap;
    -webkit-tap-highlight-color:transparent;
  }
  .btn-line:hover { border-color:var(--terra); color:var(--terra); transform:translateY(-1px); }
  .btn-line:active { transform:scale(0.97); background:var(--cream2); }

  .btn-text {
    background:none; border:none; color:var(--ink4); font-size:12px;
    cursor:pointer; padding:4px; transition:color 0.2s;
    text-decoration:underline; text-underline-offset:3px;
    -webkit-tap-highlight-color:transparent;
  }
  .btn-text:hover { color:#c0392b; }

  .btn-add {
    width:100%; background:rgba(184,92,56,0.06);
    border:2px dashed var(--terra2); border-radius:10px;
    padding:14px; color:var(--terra); font-size:13px;
    cursor:pointer; transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1); font-weight:600;
    -webkit-tap-highlight-color:transparent;
  }
  .btn-add:hover { border-color:var(--terra); background:rgba(184,92,56,0.1); transform:translateY(-2px) scale(1.01); box-shadow:0 4px 16px rgba(184,92,56,0.12); }
  .btn-add:active { transform:scale(0.98); }

  /* ── STEP ITEMS ── */
  .step-item { transition:all 0.18s; cursor:pointer; }
  .step-item:hover .step-txt { color:var(--terra) !important; }
  .tcard { transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, border-color 0.2s; cursor:pointer; }
  .tcard:hover { transform:translateY(-4px) scale(1.02); box-shadow:0 8px 24px rgba(0,0,0,0.12); }
  .tcard.active { transform:translateY(-2px); }

  /* ── PHOTO DROP ── */
  .photo-drop {
    width:84px; height:104px; border:2px dashed var(--border2); border-radius:8px;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    cursor:pointer; transition:all 0.2s; background:var(--cream2); flex-shrink:0; overflow:hidden;
  }
  .photo-drop:hover { border-color:var(--terra); background:rgba(184,92,56,0.05); }

  /* ── ORNAMENT ── */
  .ornament {
    display:flex; align-items:center; gap:10px; color:var(--ink4);
    font-size:11px; letter-spacing:2px; text-transform:uppercase; margin:6px 0 18px;
  }
  .ornament::before,.ornament::after { content:''; flex:1; height:1px; background:var(--border); }

  /* ── DARK MODE ── */
  .dark {
    --cream:#1a1610; --cream2:#242018; --cream3:#2e2820;
    --ink:#f0ebe0; --ink2:#d4cfc4; --ink3:#9c8e80; --ink4:#6b5f52;
    --border:#3a3228; --border2:#4a3e30;
  }
  .dark .field { background:#242018; color:#f0ebe0; border-color:#3a3228; }
  .dark .field:focus { border-color:var(--terra); }
  .dark .btn-line { border-color:#3a3228; }

  /* ── TOOLTIP ── */
  .tip-wrap { position:relative; display:inline-flex; align-items:center; }
  .tip-icon { width:16px; height:16px; border-radius:50%; background:var(--cream3);
    color:var(--ink4); font-size:10px; display:inline-flex; align-items:center;
    justify-content:center; cursor:help; margin-left:5px; font-weight:700; flex-shrink:0; }
  .tip-box { display:none; position:absolute; left:0; top:calc(100% + 6px);
    background:var(--ink); color:#fff; font-size:11.5px; line-height:1.5;
    padding:8px 12px; border-radius:6px; width:200px; z-index:100;
    pointer-events:none; font-weight:400; }
  .tip-wrap:hover .tip-box { display:block; }

  /* ── HORIZONTAL STEPS BAR ── */
  .hbar {
    background:var(--cream); border-bottom:1.5px solid var(--border);
    display:flex; align-items:center; justify-content:space-between;
    padding:0 var(--pad-x); gap:0; min-height:54px; flex-shrink:0;
    position:sticky; top:0; z-index:200;
    box-shadow:0 1px 8px rgba(0,0,0,0.05);
    animation:hbarIn 0.4s cubic-bezier(0.16,1,0.3,1) both;
    backdrop-filter:blur(8px);
    -webkit-backdrop-filter:blur(8px);
  }
  .h-steps {
    display:flex; align-items:center; flex:1; overflow-x:auto;
    scrollbar-width:none; -ms-overflow-style:none; padding:0 8px;
  }
  .h-steps::-webkit-scrollbar { display:none; }
  .h-step { display:flex; align-items:center; flex-shrink:0; cursor:default; }
  .h-step-dot {
    width:26px; height:26px; border-radius:50%; display:flex; align-items:center;
    justify-content:center; font-size:10px; font-weight:700; font-family:'DM Mono',monospace;
    transition:all 0.25s; flex-shrink:0;
  }
  .h-step-label {
    font-size:11px; font-weight:500; margin-left:5px; white-space:nowrap;
    transition:color 0.2s;
  }
  .h-step-line { height:2px; width:20px; border-radius:99px; transition:background 0.3s; flex-shrink:0; margin:0 2px; }
  .h-step.clickable { cursor:pointer; }
  .h-step.clickable:hover .h-step-label { color:var(--terra); }

  /* ── MAIN LAYOUT ── */
  .main-layout { display:flex; flex-direction:column; min-height:100vh; }
  .main-header { padding:22px var(--pad-x) 0; display:flex; justify-content:space-between; align-items:flex-end; }
  .main-content { flex:1; padding:20px var(--pad-x) 20px; overflow-y:auto; }
  .content-inner { max-width:var(--content-max); width:100%; }
  .nav-bar {
    padding:14px var(--pad-x); display:flex; justify-content:space-between;
    align-items:center; gap:12px; flex-wrap:wrap;
  }
  .main-footer {
    padding:10px var(--pad-x); border-top:1px solid var(--border);
    display:flex; justify-content:space-between; align-items:center;
    background:var(--cream2); flex-wrap:wrap; gap:8px;
  }
  .footer-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

  /* ── GRID ── */
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }

  /* ── SKIP BANNER ── */
  .skip-banner {
    background:rgba(184,92,56,0.07); border:1px dashed var(--terra2);
    border-radius:8px; padding:12px 16px; display:flex; align-items:center;
    justify-content:space-between; gap:12px; margin-bottom:16px; flex-wrap:wrap;
  }

  /* ── DRAG ── */
  .drag-handle { cursor:grab; color:var(--ink4); padding:6px; font-size:18px; user-select:none; }
  .drag-handle:active { cursor:grabbing; }
  .dragging { opacity:0.5; transform:scale(0.98); }
  .drag-over { border-color:var(--terra) !important; background:rgba(184,92,56,0.04) !important; }

  /* ── SIGNATURE ── */
  .sig-canvas { border:1.5px solid var(--border); border-radius:6px; background:#fff; cursor:crosshair; touch-action:none; }

  /* ── SCORE ── */
  .score-ring { transition:stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1); }

  /* ── CONFETTI ── */
  .confetti { position:fixed; pointer-events:none; z-index:9999; top:0; left:0; width:100%; height:100%; overflow:hidden; }
  .confetti-piece { position:absolute; width:10px; height:10px; animation:confetti-fall linear forwards; }

  /* ── BUILD ANIM ── */
  .cv-build-line { height:2px; background:var(--terra); border-radius:1px; animation:buildLine 0.3s ease forwards; }

  /* ── LANDING ── */
  .land-hero {
    background:linear-gradient(135deg,var(--ink) 0%,var(--ink2) 100%);
    padding:clamp(36px,8vw,72px) var(--pad-x); text-align:center; position:relative; overflow:hidden;
  }
  .land-card {
    background:#fff; border:1.5px solid var(--border); border-radius:12px;
    padding:clamp(14px,4vw,20px);
    transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border-color 0.2s;
  }
  .land-card:hover { transform:translateY(-5px) scale(1.01); box-shadow:0 12px 32px rgba(0,0,0,0.1); border-color:var(--border2); }

  /* ── FAQ ── */
  .faq-item { border:1.5px solid var(--border); border-radius:8px; background:#fff; overflow:hidden; margin-bottom:8px; }
  .faq-q { padding:14px 16px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-weight:500; font-size:13.5px; }
  .faq-a { padding:0 16px 14px; font-size:13px; color:var(--ink3); line-height:1.7; }

  /* ── QUIZ ── */
  .quiz-opt { padding:13px 16px; border:1.5px solid var(--border); border-radius:8px;
    cursor:pointer; transition:all 0.18s; background:#fff; text-align:left; width:100%;
    font-size:13px; display:flex; align-items:center; gap:12px; }
  .quiz-opt:hover,.quiz-opt.sel { border-color:var(--terra); background:rgba(184,92,56,0.05); }
  .quiz-opt.sel { font-weight:600; }

  /* ── RECRUITER ── */
  .recruiter-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.85);
    z-index:9000; display:flex; flex-direction:column; align-items:center; justify-content:center; }

  /* ── LETTER ── */
  .letter-preview { background:#fff; border:1.5px solid var(--border); border-radius:8px;
    padding:28px 32px; font-family:'Georgia',serif; line-height:1.8; font-size:11.5px; color:#333; }

  /* ── SHARE ── */
  .share-row { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
  .share-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 16px;
    border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;
    border:none; text-decoration:none; }

  /* ── CV CHOICE SCREEN ── */
  .choice-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; width:100%; max-width:560px; }


  /* ── Ripple ── */
  @keyframes ripple { to { transform:scale(4); opacity:0; } }
  .ripple-container { position:relative; overflow:hidden; }
  .ripple-wave {
    position:absolute; border-radius:50%;
    background:rgba(255,255,255,0.35);
    transform:scale(0); animation:ripple 0.5s linear;
    pointer-events:none;
  }

  /* ── Toast ── */
  @keyframes toastIn  { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes toastOut { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(8px) scale(0.95)} }
  .toast { animation:toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .toast.hide { animation:toastOut 0.25s ease both; }

  /* ── Shimmer loader ── */
  .shimmer {
    background: linear-gradient(90deg, var(--cream2) 25%, var(--cream3) 50%, var(--cream2) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 6px;
  }

  /* ── Stagger children ── */
  .stagger > * { animation:fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .stagger > *:nth-child(1) { animation-delay:0.05s; }
  .stagger > *:nth-child(2) { animation-delay:0.1s; }
  .stagger > *:nth-child(3) { animation-delay:0.15s; }
  .stagger > *:nth-child(4) { animation-delay:0.2s; }
  .stagger > *:nth-child(5) { animation-delay:0.25s; }
  .stagger > *:nth-child(6) { animation-delay:0.3s; }

  /* ── Nav bar — slide up ── */
  .nav-bar { animation:fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }

  /* ── FAQ item ── */
  .faq-item { transition:box-shadow 0.2s, border-color 0.2s; }
  .faq-item:hover { box-shadow:0 4px 16px rgba(0,0,0,0.06); border-color:var(--border2); }

  /* ── Skip banner ── */
  .skip-banner { animation:fadeDown 0.3s cubic-bezier(0.16,1,0.3,1) both; }

  /* ══════════════════════════════════════
     RESPONSIVE — TABLET  ≤ 768px
  ══════════════════════════════════════ */
  @media (max-width: 768px) {
    :root { --pad-x: 18px; }

    /* Barre d'étapes — compacte */
    .h-step-label { display:none; }
    .h-step-dot { width:24px; height:24px; font-size:9px; }
    .h-step-line { width:12px; }
    .hbar { min-height:48px; padding:0 12px; }

    /* Header de page */
    .main-header { padding:16px var(--pad-x) 0; }
    .main-header h1 { font-size:20px !important; }
    .main-content { padding:16px var(--pad-x) 16px; }
    .nav-bar { padding:12px var(--pad-x); }
    .main-footer { padding:10px var(--pad-x); }

    /* Grilles — une colonne */
    .grid2 { grid-template-columns:1fr; gap:12px; }
    .grid3 { grid-template-columns:1fr 1fr; gap:10px; }

    /* Score — masquer sur petits écrans */
    .score-hide { display:none !important; }

    /* Choice screen */
    .choice-grid { grid-template-columns:1fr; max-width:420px; }

    /* Footer right — compact */
    .footer-right .hide-mobile { display:none !important; }

    /* Skip banner — empilé */
    .skip-banner { flex-direction:column; align-items:flex-start; gap:8px; }
  }

  /* ══════════════════════════════════════
     RESPONSIVE — MOBILE  ≤ 480px
  ══════════════════════════════════════ */
  @media (max-width: 480px) {
    :root { --pad-x: 14px; }

    html,body { font-size:14px; }

    /* Barre étapes — encore plus compacte */
    .hbar { min-height:44px; padding:0 8px; gap:0; }
    .h-step-dot { width:22px; height:22px; font-size:8.5px; }
    .h-step-line { width:8px; margin:0 1px; }
    .hbar .logo-text { display:none; }

    /* En-tête */
    .main-header h1 { font-size:18px !important; }
    .main-header .citation { display:none; }

    /* Content */
    .main-content { padding:12px var(--pad-x) 12px; }
    .content-inner { max-width:100%; }

    /* Nav */
    .nav-bar { padding:10px var(--pad-x); gap:10px; }
    .nav-bar .btn-main { padding:11px 18px; font-size:13px; }
    .nav-bar .btn-line { padding:10px 14px; font-size:12.5px; }

    /* Grilles */
    .grid2 { grid-template-columns:1fr; }
    .grid3 { grid-template-columns:1fr; }

    /* Landing hero */
    .land-hero { padding:32px var(--pad-x); }

    /* Score ring — mini */
    .score-hide { display:none !important; }

    /* Bouton main — pleine largeur dans nav */
    .nav-btn-full { width:100%; justify-content:center; }

    /* Footer simplifié */
    .main-footer { flex-direction:column; gap:6px; text-align:center; }
    .footer-right { justify-content:center; }

    /* Templates grid — 1 colonne */
    .tpl-grid { grid-template-columns:1fr !important; }

    /* CV zoom — forcer fit */
    .cv-viewer { overflow-x:auto !important; }
  }

  /* ══════════════════════════════════════
     RESPONSIVE — GRAND ÉCRAN  ≥ 1200px
  ══════════════════════════════════════ */
  @media (min-width: 1200px) {
    :root { --pad-x: 56px; --content-max: 740px; }
  }

  /* ── Utilitaires responsive ── */
  .hide-mobile { }
  @media (max-width: 640px) { .hide-mobile { display:none !important; } }
  .show-mobile { display:none; }
  @media (max-width: 640px) { .show-mobile { display:block; } }
`;

/* ─── DONNÉES ─── */
const STEPS = [
  { id:"profile",    label:"Profil",        short:"01" },
  { id:"experience", label:"Expériences",   short:"02", skippable:true },
  { id:"education",  label:"Formation",     short:"03" },
  { id:"extras",     label:"Compétences",   short:"04" },
  { id:"references", label:"Références",    short:"05", skippable:true },
  { id:"template",   label:"Modèle",        short:"06" },
  { id:"result",     label:"Votre CV",      short:"07" },
];

// Parcours Lettre de motivation uniquement
const STEPS_LETTER = [
  { id:"expediteur",      label:"Expéditeur",  short:"01" },
  { id:"letter_only",     label:"Lettre",      short:"02" },
  { id:"letter_template", label:"Modèle",      short:"03" },
  { id:"result_letter",   label:"Ma Lettre",   short:"04" },
];

// Parcours CV + Lettre enchaîné
const STEPS_CV_LETTER = [
  { id:"profile",         label:"Profil",       short:"01" },
  { id:"experience",      label:"Expériences",  short:"02", skippable:true },
  { id:"education",       label:"Formation",    short:"03" },
  { id:"extras",          label:"Compétences",  short:"04" },
  { id:"references",      label:"Références",   short:"05", skippable:true },
  { id:"template",        label:"Modèle CV",    short:"06" },
  { id:"letter_only",     label:"Lettre",       short:"07" },
  { id:"letter_template", label:"Modèle Lettre",short:"08" },
  { id:"result_combo",    label:"CV + Lettre",  short:"09" },
];

const LETTER_TEMPLATES = [
  { id:"ltr-classique",   name:"Classique",    tag:"Universel · Administration",  accent:"#1c1812", font:"'Times New Roman',serif" },
  { id:"ltr-moderne",     name:"Moderne",      tag:"Entreprises · Privé",         accent:"#b85c38", font:"'Arial',sans-serif" },
  { id:"ltr-elegant",     name:"Élégant",      tag:"Cadres · Direction",          accent:"#c8a96e", font:"'Georgia',serif" },
  { id:"ltr-minimaliste", name:"Minimaliste",  tag:"Startups · Tech",             accent:"#111",    font:"'Helvetica Neue',sans-serif" },
  { id:"ltr-institutionnel", name:"Institutionnel", tag:"ONG · Institutions",     accent:"#1a3a5c", font:"'Georgia',serif" },
  { id:"ltr-academique",  name:"Académique",   tag:"Université · Recherche",      accent:"#4a2d7a", font:"'Palatino Linotype',serif" },
  { id:"ltr-juridique",   name:"Juridique",    tag:"Droit · Notariat",            accent:"#7a2d00", font:"'Times New Roman',serif" },
  { id:"ltr-medical",     name:"Médical",      tag:"Santé · Sciences",            accent:"#1a5c3a", font:"'Arial',sans-serif" },
  { id:"ltr-diplomatique",name:"Diplomatique", tag:"Ambassades · Protocole",      accent:"#2d1a5c", font:"'Georgia',serif" },
  { id:"ltr-creatif",     name:"Créatif",      tag:"Design · Communication",      accent:"#c0392b", font:"'Helvetica Neue',sans-serif" },
];
const LETTER_ATS_TEMPLATES = [
  { id:"ltr-ats-standard",  name:"Standard ATS",  tag:"Tous secteurs · Universel" },
  { id:"ltr-ats-ong",       name:"ONG / MINE",     tag:"Humanitaire · Extraction" },
  { id:"ltr-ats-banque",    name:"Banque",         tag:"Finance · Microfinance" },
  { id:"ltr-ats-admin",     name:"Administration", tag:"Fonction publique · Mairie" },
  { id:"ltr-ats-technique", name:"Technique",      tag:"BTP · Ingénierie · IT" },
  { id:"ltr-ats-sante",     name:"Santé",          tag:"Hôpital · Clinique · OMS" },
  { id:"ltr-ats-education", name:"Éducation",      tag:"École · Université · MENA" },
  { id:"ltr-ats-commerce",  name:"Commerce",       tag:"Vente · Marketing · GSM" },
  { id:"ltr-ats-canada",    name:"Canada / Europe",tag:"Immigration · Diaspora" },
  { id:"ltr-ats-junior",    name:"Junior / Stage", tag:"Premier emploi · Stage" },
];

const TEMPLATES = [
  { id:"executive", name:"Executive",  tag:"Cadre dirigeant",   accent:"#c8a96e", bg:"#1a1810" },
  { id:"tech",      name:"Tech",       tag:"Développeur · IT",  accent:"#64ffda", bg:"#020c1b" },
  { id:"creative",  name:"Creative",   tag:"Design · Artiste",  accent:"#ff6b9d", bg:"#1a0a2e" },
  { id:"minimal",   name:"Minimal",    tag:"Universel",          accent:"#111",    bg:"#f8f8f6" },
  { id:"corporate", name:"Corporate",  tag:"Finance · Conseil", accent:"#4fc3f7", bg:"#071522" },
  { id:"academic",  name:"Academic",   tag:"Recherche · Éduc.", accent:"#8b5cf6", bg:"#0e0a1a" },
  { id:"medical",   name:"Medical",    tag:"Santé · Sciences",  accent:"#34d399", bg:"#061a12" },
  { id:"legal",     name:"Legal",      tag:"Droit · Notariat",  accent:"#b8860b", bg:"#1a1508" },
  { id:"marketing", name:"Marketing",  tag:"Com · Growth",      accent:"#f97316", bg:"#1a0c06" },
  { id:"startup",   name:"Startup",    tag:"Entrepreneur · PM", accent:"#818cf8", bg:"#06060f" },
];

const ATS_TEMPLATES = [
  { id:"ats-clarte",      name:"Clarté",         tag:"Universel · Tous secteurs" },
  { id:"ats-dakar",       name:"Dakar",           tag:"Entreprises UEMOA · Afrique de l'Ouest" },
  { id:"ats-sahel",       name:"Sahel",           tag:"Cadres · Managers" },
  { id:"ats-diplomate",   name:"Diplomate",       tag:"Institutions · ONU · Administrations" },
  { id:"ats-ingenieur",   name:"Ingénieur",       tag:"IT · BTP · Industrie · Génie civil" },
  { id:"ats-consultant",  name:"Consultant",      tag:"Audit · Finance · Conseil" },
  { id:"ats-academique",  name:"Académique",      tag:"Recherche · Enseignement · Publications" },
  { id:"ats-humanitaire", name:"Humanitaire",     tag:"ONG · UNICEF · Oxfam · USAID · PAM" },
  { id:"ats-junior",      name:"Junior",          tag:"Jeunes diplômés · Stages · Premier emploi" },
  { id:"ats-cadre",       name:"Cadre Supérieur", tag:"DG · DRH · Directeurs · Exécutifs" },
];

const JOB_EXAMPLES = {
  comptable: { title:"Comptable Senior", summary:"Comptable expérimenté avec 6 ans d'expérience dans le secteur bancaire au Burkina Faso. Maîtrise des normes OHADA, gestion budgétaire et production des états financiers.", skills:"Sage Comptabilité, Excel avancé, OHADA, SAP, Gestion budgétaire", languages:"Français (courant), Mooré (natif), Anglais (intermédiaire)" },
  dev: { title:"Développeur Full Stack", summary:"Développeur web passionné avec 4 ans d'expérience en React et Node.js. Spécialisé dans les applications mobiles et les solutions SaaS pour le marché africain.", skills:"React, Node.js, Python, PostgreSQL, Git, Docker, API REST", languages:"Français (courant), Anglais (professionnel), Dioula (intermédiaire)" },
  manager: { title:"Chef de Projet", summary:"Manager orienté résultats avec 8 ans d'expérience dans la conduite de projets complexes. Expert en gestion d'équipes multiculturelles et coordination avec les bailleurs de fonds.", skills:"Gestion de projet, MS Project, Leadership, Budget, Reporting, Scrum", languages:"Français (courant), Anglais (courant), Mooré (natif)" },
  infirmier: { title:"Infirmier Diplômé d'État", summary:"Infirmier avec 5 ans d'expérience en milieu hospitalier et en ONG humanitaire. Formé aux protocoles MSF et aux soins d'urgence en zones rurales.", skills:"Soins infirmiers, Triage d'urgence, Vaccination, Protocoles MSF, CPN/CPoN", languages:"Français (courant), Mooré (natif), Dioula (notions)" },
  juriste: { title:"Juriste d'Entreprise", summary:"Juriste spécialisé en droit des affaires OHADA et droit du travail. Expérience en contentieux, rédaction contractuelle et conseil aux entreprises.", skills:"Droit OHADA, Droit du travail, Contentieux, Rédaction contractuelle, Veille juridique", languages:"Français (courant), Anglais (professionnel)" },
};


// Helper: returns full name respecting order preference
const fullName = (cv) => {
  const f = cv.firstName || "";
  const l = cv.lastName  || "";
  if (!f && !l) return "";
  if (cv.nameOrder === "lastFirst") return [l,f].filter(Boolean).join(" ");
  return [f,l].filter(Boolean).join(" ");
};

// Helper: returns accent color for a template id
const getTemplateAccent = (tplId, customColor) => {
  if (customColor) return customColor;
  const ALL = [
    {id:"executive",a:"#c8a96e"},{id:"tech",a:"#64ffda"},{id:"creative",a:"#ff6b9d"},
    {id:"minimal",a:"#1c1812"},{id:"corporate",a:"#4fc3f7"},{id:"academic",a:"#8b5cf6"},
    {id:"medical",a:"#34d399"},{id:"legal",a:"#b8860b"},{id:"marketing",a:"#f97316"},
    {id:"startup",a:"#818cf8"},{id:"ats-clarte",a:"#1c1812"},{id:"ats-dakar",a:"#7b2d2d"},
    {id:"ats-sahel",a:"#8b6914"},{id:"ats-diplomate",a:"#1a3a5c"},{id:"ats-ingenieur",a:"#1a4a8a"},
    {id:"ats-consultant",a:"#2d4a2d"},{id:"ats-academique",a:"#4a2d7a"},{id:"ats-humanitaire",a:"#8a3a1a"},
    {id:"ats-junior",a:"#1a6a4a"},{id:"ats-cadre",a:"#2a2a5a"},
  ];
  const found = ALL.find(x=>x.id===tplId);
  return found ? found.a : "#1c1812";
};

// Helper: returns font family for a template id  
const getTemplateFont = (tplId) => {
  const serif = ["executive","legal","academic","ats-academique","ats-diplomate","ats-cadre"];
  const mono  = ["tech"];
  if (serif.includes(tplId)) return "'Georgia',serif";
  if (mono.includes(tplId))  return "'Courier New',monospace";
  return "'Arial',sans-serif";
};

const CITATIONS = [
  { text:"Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.", author:"Winston Churchill" },
  { text:"La seule façon de faire du bon travail est d'aimer ce que vous faites.", author:"Steve Jobs" },
  { text:"Votre CV est votre première impression. Faites-la mémorable.", author:"CVtools" },
  { text:"En Afrique, quand un homme sait où il va, il y arrive.", author:"Proverbe africain" },
  { text:"Le talent sans travail n'est que médiocrité temporaire.", author:"Unknown" },
  { text:"Chaque expert a été débutant un jour.", author:"Helen Hayes" },
  { text:"Les opportunités ne se perdent pas. Ce sont les autres qui les prennent.", author:"Unknown" },
];

const TIPS = {
  summary: "Commencez par votre titre, ajoutez vos années d'expérience, votre secteur et 1-2 atouts clés. Visez 50-80 mots.",
  description: "Débutez par un verbe d'action (Géré, Développé, Coordonné). Ajoutez un chiffre concret : 'Équipe de 5 personnes', 'Budget de 2M FCFA'.",
  skills: "Listez vos compétences séparées par des virgules. Mettez les plus importantes en premier.",
  linkedin: "Copiez uniquement la partie après linkedin.com/in/ — ex: lawali-toe",
};

const INIT = {
  photo: null,
  nameOrder:"firstLast", firstName:"", lastName:"", title:"", email:"", phone:"", phone2:"",
  location:"", linkedin:"", portfolio:"", summary:"",
  nationality:"", maritalStatus:"", birthDate:"",
  experiences:[{ company:"", role:"", start:"", end:"", current:false, description:"" }],
  education:[{ school:"", degree:"", field:"", start:"", end:"" }],
  skills:"", languages:"",
  hobbies:[{ label:"" }],
  certifications:"",
  publications:"",
  sectionOrder:["experiences","education","skills","languages","certifications","publications","hobbies","references"],
  references:[{ name:"", role:"", company:"", email:"", phone:"" }],
  refsOnRequest: false,
  signatureCity:"", signatureDate:"",
  letter:"",
  letterRecipient:"", letterSubject:"", letterCountry:"", letterDevise:"", letterTemplate:"ltr-classique",
  template:"executive",
  accentColor: null,
  confidential: false,
  cvLang: "fr",
};

/* ─── LOGO SVG ─── */
const Logo = ({ size=36 }) => (
  <svg width={size} height={size*40/36} viewBox="0 0 36 40" fill="none">
    <rect x="5" y="5" width="26" height="33" rx="4" fill="rgba(0,0,0,0.05)"/>
    <rect x="3" y="2" width="26" height="33" rx="4" fill="#fff" stroke="#d4c9b5" strokeWidth="1.5"/>
    <path d="M22 2 L29 9 L22 9 Z" fill="#e8dfc8"/>
    <rect x="8" y="14" width="10" height="2.5" rx="1.2" fill="#b85c38"/>
    <rect x="8" y="20" width="16" height="1.5" rx="0.7" fill="#d4c9b5"/>
    <rect x="8" y="24" width="13" height="1.5" rx="0.7" fill="#d4c9b5"/>
    <circle cx="28" cy="33" r="6" fill="#2a7a2a"/>
    <path d="M25 33 L27.2 35.2 L31 31" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─── PRIMITIVES UI ─── */
const Label = ({ t, required, tip }) => (
  <div style={{ display:"flex", alignItems:"center", marginBottom:6 }}>
    <label style={{ fontSize:11, fontWeight:600, textTransform:"uppercase",
      letterSpacing:"1.8px", color:"var(--ink3)", fontFamily:"'DM Mono',monospace" }}>
      {t}{required && <span style={{ color:"var(--terra)", marginLeft:3 }}>*</span>}
    </label>
    {tip && (
      <div className="tip-wrap">
        <div className="tip-icon">?</div>
        <div className="tip-box">{tip}</div>
      </div>
    )}
  </div>
);

const Grid2 = ({ children }) => (
  <div className="grid2">{children}</div>
);
/* ── Ripple hook ── */
function useRipple() {
  return (e) => {
    const btn = e.currentTarget;
    btn.classList.add("ripple-container");
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(wave);
    wave.addEventListener("animationend", () => wave.remove());
  };
}

const Stack = ({ children, gap=16 }) => (
  <div style={{ display:"grid", gap }}>{children}</div>
);
const Block = ({ children, delay=0 }) => (
  <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:10, padding:20,
    animation:`fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
    transition:"box-shadow 0.2s, border-color 0.2s" }}>
    {children}
  </div>
);
/* ── FloatField — label flottant ── */
function FloatField({ label, value, onChange, type="text", placeholder, required, multiline, rows=3, style={} }) {
  const [focused, setFocused] = useState(false);
  const hasVal = value && value.length > 0;
  const lifted = focused || hasVal;
  return (
    <div style={{ position:"relative", marginBottom:0, ...style }}>
      <label style={{
        position:"absolute", left:12, top: lifted ? -8 : 11,
        fontSize: lifted ? 10.5 : 13.5,
        color: focused ? "var(--terra)" : lifted ? "var(--ink3)" : "var(--ink4)",
        background: lifted ? "#fff" : "transparent",
        padding: lifted ? "0 4px" : "0",
        borderRadius:3,
        transition:"all 0.18s cubic-bezier(0.16,1,0.3,1)",
        pointerEvents:"none", zIndex:1,
        fontFamily:"'DM Sans',sans-serif",
        fontWeight: lifted ? 600 : 400
      }}>
        {label}{required && <span style={{ color:"var(--terra)", marginLeft:2 }}>*</span>}
      </label>
      {multiline
        ? <textarea className="field" rows={rows} value={value||""} onChange={onChange}
            placeholder={focused ? "" : ""}
            style={{ paddingTop:18, resize:"vertical", fontFamily:"inherit", paddingBottom:10 }}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
        : <input className="field" type={type} value={value||""} onChange={onChange}
            placeholder={focused ? "" : ""}
            style={{ paddingTop:18, paddingBottom:8 }}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
      }
    </div>
  );
}

const BlockHeader = ({ label, onRemove, onDuplicate }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16,
    paddingBottom:12, borderBottom:"1px solid var(--cream3)" }}>
    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10.5, fontWeight:500,
      color:"var(--ink3)", textTransform:"uppercase", letterSpacing:"1.5px" }}>{label}</span>
    <div style={{ display:"flex", gap:8 }}>
      {onDuplicate && <button className="btn-text" onClick={onDuplicate}>Dupliquer</button>}
      {onRemove && <button className="btn-text" onClick={onRemove}>Retirer</button>}
    </div>
  </div>
);
const SectionTitle = ({ t }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:3, height:22, background:"var(--terra)", borderRadius:2 }}/>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:600,
        color:"var(--ink)", letterSpacing:"-0.3px" }}>{t}</h2>
    </div>
    <div style={{ height:1, background:"var(--border)", marginTop:12 }}/>
  </div>
);

/* ─── WORD COUNT ─── */
const WordCount = ({ text, min=50, max=80 }) => {
  const count = text?.trim().split(/\s+/).filter(Boolean).length || 0;
  const color = count < min ? "#c0392b" : count > max ? "#e67e22" : "#2a7a2a";
  return (
    <div style={{ fontSize:11, color, marginTop:4, fontFamily:"'DM Mono',monospace" }}>
      {count} mots — idéal entre {min} et {max} mots
    </div>
  );
};

/* ─── CV SCORE ─── */
function CVScore({ form }) {
  let score = 0;
  if (form.photo) score += 10;
  if (form.summary?.trim().length > 40) score += 15;
  if (form.experiences?.some(e => e.company && e.role && e.description)) score += 20;
  if (form.education?.some(e => e.school && e.degree)) score += 15;
  if (form.skills?.trim().length > 10) score += 15;
  if (form.languages?.trim().length > 3) score += 10;
  if (form.linkedin?.trim()) score += 5;
  if (form.references?.some(r => r.name) || form.refsOnRequest) score += 10;

  const label = score >= 80 ? "Fort" : score >= 50 ? "Moyen" : "Faible";
  const color = score >= 80 ? "#2a7a2a" : score >= 50 ? "#e67e22" : "#c0392b";
  const r = 22, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r={r} fill="none" stroke="var(--cream3)" strokeWidth="4"/>
        <circle cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 27 27)"
          className="score-ring"/>
        <text x="27" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color }}>{label}</div>
        <div style={{ fontSize:10.5, color:"var(--ink4)" }}>CV {score}%</div>
      </div>
    </div>
  );
}

/* ─── CONFETTI ─── */
function Confetti({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: ["#b85c38","#c49a3c","#2a7a2a","#4fc3f7","#ff6b9d","#818cf8"][Math.floor(Math.random()*6)],
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? "50%" : "2px",
  }));

  return (
    <div className="confetti" style={{ pointerEvents:"none" }}>
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left:`${p.left}%`, top:"-20px", width:p.size, height:p.size,
          background:p.color, borderRadius:p.shape,
          animationDuration:`${p.duration}s`, animationDelay:`${p.delay}s`,
        }}/>
      ))}
    </div>
  );
}

/* ─── SIGNATURE CANVAS ─── */
function SignatureCanvas({ value, onChange }) {
  const canvasRef = useRef();
  const drawing = useRef(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1c1812";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
    onChange(canvas.toDataURL());
  };

  const stopDraw = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div>
      <canvas ref={canvasRef} width={280} height={80} className="sig-canvas"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}/>
      <div style={{ display:"flex", gap:8, marginTop:6 }}>
        <button className="btn-text" onClick={clear}>Effacer</button>
        <span style={{ fontSize:11, color:"var(--ink4)", alignSelf:"center" }}>
          Signez avec votre doigt ou la souris
        </span>
      </div>
    </div>
  );
}

/* ─── PHOTO CROP ─── */
function PhotoCrop({ src, onCrop }) {
  const canvasRef = useRef();
  const [offset, setOffset] = useState({ x:0, y:0 });
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef(new window.Image());

  useEffect(() => {
    imgRef.current.onload = () => drawPreview();
    imgRef.current.src = src;
  }, [src]);

  useEffect(() => { drawPreview(); }, [offset, zoom]);

  const drawPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current.complete) return;
    const ctx = canvas.getContext("2d");
    const W = 90, H = 110;
    ctx.clearRect(0, 0, W, H);
    const img = imgRef.current;
    const scale = Math.max(W / img.width, H / img.height) * zoom;
    const sw = img.width * scale, sh = img.height * scale;
    const sx = (W - sw) / 2 + offset.x;
    const sy = (H - sh) / 2 + offset.y;
    ctx.drawImage(img, sx, sy, sw, sh);
  };

  const confirm = () => {
    onCrop(canvasRef.current.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
      <canvas ref={canvasRef} width={90} height={110} style={{ border:"1px solid var(--border)", borderRadius:6, cursor:"move" }}/>
      <div style={{ display:"flex", gap:8, alignItems:"center", fontSize:12 }}>
        <button className="btn-text" onClick={()=>setZoom(z=>Math.max(0.5,z-0.1))}>−</button>
        <span style={{ color:"var(--ink4)", minWidth:40, textAlign:"center" }}>Zoom {Math.round(zoom*100)}%</span>
        <button className="btn-text" onClick={()=>setZoom(z=>Math.min(3,z+0.1))}>+</button>
        <button className="btn-main" style={{ padding:"7px 16px", fontSize:12 }} onClick={confirm}>Confirmer</button>
      </div>
    </div>
  );
}

/* ─── CV BUILDING ANIMATION ─── */
function CVBuildAnimation({ onDone }) {
  const [phase, setPhase] = useState(0); // 0=building 1=done
  const [dots, setDots]   = useState(0);
  const steps = ["Analyse du profil","Mise en page","Insertion des données","Finalisation"];
  const [curStep, setCurStep] = useState(0);
  const lines = [60,80,70,90,50,75,65,85,55,80,70,60,90,75,50];
  const total  = lines.length * 110 + 600;

  useEffect(() => {
    // Dots
    const dIv = setInterval(() => setDots(d => (d+1)%4), 380);
    // Step labels
    const sIv = setInterval(() => setCurStep(s => Math.min(s+1, steps.length-1)), total/steps.length);
    // Done
    const t = setTimeout(() => { setPhase(1); setTimeout(onDone, 500); }, total);
    return () => { clearInterval(dIv); clearInterval(sIv); clearTimeout(t); };
  }, []);

  return (
    <div style={{ background:"#fff", padding:"28px 24px", borderRadius:12,
      border:"1.5px solid var(--border)", minHeight:220,
      animation:"scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--terra)",
          animation:"pulse 1s ease infinite" }}/>
        <div style={{ fontSize:12, color:"var(--terra)", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>
          {phase === 1 ? "✓ CV généré !" : steps[curStep] + ".".repeat(dots+1)}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {lines.map((w, i) => (
          <div key={i} style={{ height:2, background:"var(--cream3)", borderRadius:1, overflow:"hidden" }}>
            <div style={{ height:"100%", background: i%5===0?"var(--terra)":i%3===0?"var(--terra2)":"var(--border2)",
              borderRadius:1, width:`${w}%`,
              animation:`buildLine 0.28s ease ${i*105}ms both`,
              opacity:0, animationFillMode:"forwards" }}/>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── RECRUITER SIM ─── */
function RecruiterSim({ cvEl, onClose }) {
  const [phase, setPhase] = useState("countdown");
  const [seconds, setSeconds] = useState(6);
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (phase !== "countdown") return;
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(t);
          const s2 = 60 + Math.floor(Math.random() * 35);
          setScore(s2);
          setPhase("result");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className="recruiter-overlay" onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:12, padding:32, maxWidth:400, width:"90%", textAlign:"center" }}
        onClick={e=>e.stopPropagation()}>
        {phase === "countdown" ? (
          <>
            <div style={{ fontSize:64, fontWeight:900, color:"var(--terra)", fontFamily:"'DM Mono',monospace" }}>{seconds}</div>
            <p style={{ fontSize:14, color:"var(--ink3)", marginTop:8 }}>
              Un recruteur lit votre CV pendant {seconds} seconde{seconds > 1 ? "s" : ""}...
            </p>
            <div style={{ height:4, background:"var(--cream3)", borderRadius:2, marginTop:16, overflow:"hidden" }}>
              <div style={{ height:"100%", background:"var(--terra)", borderRadius:2, transition:"width 1s linear",
                width:`${((6 - seconds) / 6) * 100}%` }}/>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:48, marginBottom:8 }}>{score >= 80 ? "🎯" : score >= 60 ? "👍" : "💡"}</div>
            <div style={{ fontSize:24, fontWeight:700, color:score >= 80 ? "#2a7a2a" : score >= 60 ? "#e67e22" : "#c0392b" }}>
              {score}/100
            </div>
            <div style={{ fontSize:14, fontWeight:600, marginTop:4 }}>
              {score >= 80 ? "Excellent ! CV très lisible" : score >= 60 ? "Bon CV, quelques améliorations possibles" : "CV à améliorer"}
            </div>
            <p style={{ fontSize:12.5, color:"var(--ink3)", marginTop:12, lineHeight:1.6 }}>
              {score >= 80
                ? "Votre CV capte l'attention rapidement. Le recruteur a repéré vos points clés."
                : score >= 60
                ? "Le recruteur a vu votre titre et quelques expériences. Enrichissez le résumé."
                : "Le recruteur a eu du mal à identifier votre profil. Ajoutez plus de détails."}
            </p>
            <button className="btn-main" style={{ marginTop:16, width:"100%" }} onClick={onClose}>Fermer</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── FAQ ─── */
const FAQ_DATA = [
  { q:"Comment télécharger mon CV ?", a:"À l'étape 7 (Votre CV), cliquez sur le bouton 'Télécharger PDF'. Votre CV sera téléchargé directement sur votre appareil." },
  { q:"Puis-je modifier mon CV après l'avoir créé ?", a:"Oui ! Importez votre PDF CVtools depuis l'étape 7 pour retrouver toutes vos données et modifier votre CV." },
  { q:"Qu'est-ce qu'un modèle ATS ?", a:"ATS (compatible logiciels de recrutement) : certains recruteurs utilisent des logiciels qui lisent les CV automatiquement. Ces modèles sont en 1 colonne, simples et bien lisibles par ces systèmes." },
  { q:"Comment ajouter une photo ?", a:"À l'étape Profil, cliquez sur la zone photo (📷). Choisissez une photo depuis votre téléphone ou ordinateur." },

  { q:"Mon CV est-il sauvegardé ?", a:"Vos données sont sauvegardées automatiquement dans votre navigateur. Elles sont restaurées si vous revenez sur CVtools. Le PDF contient aussi toutes vos données pour reimport." },
];

function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <div>
      {FAQ_DATA.map((item, i) => (
        <div key={i} className="faq-item">
          <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
            {item.q}
            <span style={{ color:"var(--terra)", fontWeight:700, fontSize:16 }}>{open === i ? "−" : "+"}</span>
          </div>
          {open === i && <div className="faq-a">{item.a}</div>}
        </div>
      ))}
    </div>
  );
}

/* ─── TEMPLATE QUIZ ─── */
function TemplateQuiz({ onResult }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);

  const questions = [
    { q:"Quel est votre secteur ?", opts:["Technique / IT","Créatif / Design","Finance / Conseil","ONG / Administration","Autre"] },
    { q:"Postulez-vous à une grande entreprise ou ONG ?", opts:["Oui, grande structure","Non, PME ou directement","Je ne sais pas"] },
    { q:"Votre profil est :", opts:["Jeune diplômé","Professionnel expérimenté","Cadre dirigeant"] },
  ];

  const pick = (opt) => {
    const na = [...answers, opt];
    if (step < questions.length - 1) { setAnswers(na); setStep(s=>s+1); }
    else {
      const a0 = na[0], a1 = na[1], a2 = na[2];
      let rec = "executive";
      if (a0 === "Technique / IT") rec = a1 === "Oui, grande structure" ? "ats-ingenieur" : "tech";
      else if (a0 === "Créatif / Design") rec = "creative";
      else if (a0 === "Finance / Conseil") rec = a1 === "Oui, grande structure" ? "ats-consultant" : "corporate";
      else if (a0 === "ONG / Administration") rec = "ats-humanitaire";
      else if (a2 === "Jeune diplômé") rec = "ats-junior";
      else if (a2 === "Cadre dirigeant") rec = a1 === "Oui, grande structure" ? "ats-cadre" : "executive";
      onResult(rec);
    }
  };

  const q = questions[step];
  return (
    <div>
      <div style={{ fontSize:12, color:"var(--ink4)", marginBottom:12, fontFamily:"'DM Mono',monospace" }}>
        Question {step+1}/{questions.length}
      </div>
      <div style={{ fontSize:14, fontWeight:600, color:"var(--ink)", marginBottom:14 }}>{q.q}</div>
      <Stack gap={8}>
        {q.opts.map((opt, i) => (
          <button key={i} className="quiz-opt" onClick={() => pick(opt)}>
            <span style={{ width:20, height:20, borderRadius:"50%", border:"1.5px solid var(--border)",
              display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0 }}>
              {i+1}
            </span>
            {opt}
          </button>
        ))}
      </Stack>
    </div>
  );
}

/* ─── IMPORT CV CVTOOLS ─── */


function ImportCVToolsCV({ onClose, onLoaded }) {
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const bytes = new Uint8Array(ev.target.result);
        let str = "";
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] > 31 && bytes[i] < 127) str += String.fromCharCode(bytes[i]);
        }
        const match = str.match(/Subject\s*\(([A-Za-z0-9+/=]{50,})\)/);
        if (match) {
          const decoded = decodeURIComponent(escape(atob(match[1])));
          const data = JSON.parse(decoded);
          if (data._cvtools) {
            setStatus("success");
            setMsg(`✓ CV de ${data.firstName} ${data.lastName} retrouvé !`);
            setTimeout(() => onLoaded(data), 800);
            return;
          }
        }
        setStatus("error");
        setMsg("Ce PDF n'a pas été généré par CVtools ou les données sont introuvables.");
      } catch(err) {
        setStatus("error");
        setMsg("Impossible de lire ce fichier. Assurez-vous que c'est un PDF CVtools.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ background:"rgba(184,92,56,0.06)", border:"2px solid var(--terra)",
      borderRadius:10, padding:20, width:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:600, color:"var(--terra)" }}>
          ✦ Reprendre un CV CVtools
        </div>
        <button className="btn-text" onClick={onClose}>Fermer ×</button>
      </div>
      <p style={{ fontSize:12.5, color:"var(--ink3)", marginBottom:14, lineHeight:1.6 }}>
        Importez un PDF téléchargé avec CVtools — toutes vos données seront restaurées automatiquement.
      </p>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={handleFile}/>
      {status === "idle" && (
        <button className="btn-main" onClick={() => fileRef.current.click()}>
          📂 Choisir mon CV CVtools (PDF)
        </button>
      )}
      {status === "loading" && <div style={{ fontSize:13, color:"var(--ink3)" }}>⏳ Lecture en cours...</div>}
      {status === "success" && <div style={{ fontSize:13, color:"#2a7a2a", fontWeight:600 }}>{msg}</div>}
      {status === "error" && (
        <div>
          <div style={{ fontSize:13, color:"#c0392b", marginBottom:10 }}>⚠ {msg}</div>
          <button className="btn-line" onClick={() => { setStatus("idle"); setMsg(""); }}>Réessayer</button>
        </div>
      )}
    </div>
  );
}

/* ─── LETTRE DE MOTIVATION — EN-TÊTE AFRICAINE ─── */
/* ─── LETTER RENDERER ─── */
function LetterHeader({ cv, accent }) {
  const loc = (cv.location || cv.nationality || "").toLowerCase();
  let devise = "La Patrie ou la Mort, nous vaincrons !";
  let pays   = "BURKINA FASO";
  if (loc.includes("mali"))    { devise = "Un Peuple · Un But · Une Foi"; pays = "MALI"; }
  else if (loc.includes("niger"))   { devise = "Fraternité · Travail · Progrès"; pays = "NIGER"; }
  else if (loc.includes("sénégal")||loc.includes("senegal")) { devise = "Un Peuple · Un But · Une Foi"; pays = "SÉNÉGAL"; }
  else if (loc.includes("côte")||loc.includes("ivoire"))  { devise = "Union · Discipline · Travail"; pays = "CÔTE D\'IVOIRE"; }
  else if (loc.includes("togo"))    { devise = "Travail · Liberté · Patrie"; pays = "TOGO"; }
  else if (loc.includes("bénin")||loc.includes("benin"))  { devise = "Fraternité · Justice · Travail"; pays = "BÉNIN"; }
  else if (loc.includes("cameroun"))  { devise = "Paix · Travail · Patrie"; pays = "CAMEROUN"; }
  else if (loc.includes("guinée")||loc.includes("guinee"))  { devise = "Travail · Justice · Solidarité"; pays = "GUINÉE"; }
  else if (loc.includes("congo"))   { devise = "Unité · Travail · Progrès"; pays = "CONGO"; }
  if (cv.letterCountry?.trim()) pays   = cv.letterCountry.trim().toUpperCase();
  if (cv.letterDevise?.trim())  devise = cv.letterDevise.trim();
  const name = fullName(cv);
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div style={{ fontSize:11, lineHeight:1.9, maxWidth:"46%" }}>
        <div style={{ fontWeight:700, fontSize:12 }}>{name}</div>
        {cv.title && <div style={{ color:accent, fontSize:10.5 }}>{cv.title}</div>}
        {cv.location && <div>{cv.location}</div>}
        {cv.phone  && <div>Tél : {cv.phone}</div>}
        {cv.phone2 && <div>{cv.phone2}</div>}
        {cv.email  && <div>E-mail : <span style={{ color:accent }}>{cv.email}</span></div>}
      </div>
      <div style={{ textAlign:"center", fontSize:11 }}>
        <div style={{ fontWeight:800, fontSize:12, letterSpacing:1.5 }}>{pays}</div>
        <div style={{ borderTop:`1px solid ${accent}`, borderBottom:`1px solid ${accent}`, padding:"3px 0", marginTop:3 }}>
          {devise.split("·").map((d,i,arr)=>(
            <span key={i} style={{ fontSize:10.5 }}>{d.trim()}{i<arr.length-1&&<span style={{ margin:"0 5px", color:accent }}>·</span>}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LetterTail({ cv, accent }) {
  const hasSig = cv.signatureCity || cv.signatureDate;
  return (
    <div>
      {cv.letterSubject && (
        <div style={{ marginBottom:20, fontSize:11.5 }}>
          <span style={{ fontWeight:700 }}>Objet : </span>
          <span style={{ textDecoration:"underline" }}>{cv.letterSubject}</span>
        </div>
      )}
      <div style={{ whiteSpace:"pre-wrap", textAlign:"justify", fontSize:11.5, lineHeight:1.85 }}>
        {cv.letter}
      </div>
      <div style={{ marginTop:32, textAlign:"right" }}>
        {hasSig && (
          <div style={{ fontSize:10.5, color:"#666", marginBottom:8 }}>
            {[cv.signatureCity, cv.signatureDate].filter(Boolean).join(", le ")}
          </div>
        )}
        {cv.signature
          ? <img src={cv.signature} alt="Signature" style={{ height:54, display:"block", marginLeft:"auto", marginBottom:4 }}/>
          : <div style={{ height:44 }}/>}
      </div>
    </div>
  );
}

function RecipientBlock({ cv }) {
  return cv.letterRecipient ? (
    <div style={{ textAlign:"right", marginBottom:20, fontSize:11, lineHeight:1.9 }}>
      <div style={{ fontWeight:600 }}>A</div>
      <div>{cv.letterRecipient}</div>
    </div>
  ) : null;
}

function DateBlock({ cv }) {
  const hasSig = cv.signatureCity || cv.signatureDate;
  return hasSig ? (
    <div style={{ textAlign:"right", fontSize:11, marginBottom:16, color:"#666" }}>
      {[cv.signatureCity, cv.signatureDate].filter(Boolean).join(", le ")}
    </div>
  ) : null;
}

function LetterRenderer({ cv }) {
  const tpl    = LETTER_TEMPLATES.find(t => t.id === (cv.letterTemplate||"ltr-classique")) || LETTER_TEMPLATES[0];
  const accent = cv.accentColor || tpl.accent;

  if (tpl.id === "ltr-classique") return (
    <div style={{ background:"#fff", fontFamily:"'Georgia',serif", fontSize:11.5, color:"#111",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.85 }}>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:2, background:`linear-gradient(90deg,${accent},${accent}20)`, margin:"24px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-elegante") return (
    <div style={{ background:"#fffef8", fontFamily:"'Palatino Linotype',serif", fontSize:11.5, color:"#1a1208",
      padding:"48px 56px 40px", minHeight:780, lineHeight:1.9 }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:9, letterSpacing:6, textTransform:"uppercase", color:accent }}>Lettre de motivation</div>
        <div style={{ width:60, height:1.5, background:accent, margin:"6px auto" }}/>
      </div>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:1, background:accent+"40", margin:"22px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-moderne") return (
    <div style={{ background:"#fff", fontFamily:"'Arial',sans-serif", fontSize:11.5, color:"#111",
      padding:"0 0 40px", minHeight:780, lineHeight:1.8 }}>
      <div style={{ background:accent, padding:"22px 48px", marginBottom:28 }}>
        <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>{fullName(cv)}</div>
        {cv.title && <div style={{ color:"rgba(255,255,255,0.8)", fontSize:11, marginTop:2 }}>{cv.title}</div>}
        <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, marginTop:5 }}>
          {[cv.phone, cv.email, cv.location].filter(Boolean).join("   ·   ")}
        </div>
      </div>
      <div style={{ padding:"0 48px" }}>
        <LetterHeader cv={cv} accent={accent}/>
        <div style={{ height:1, background:"#eee", margin:"20px 0" }}/>
        <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
        <LetterTail cv={cv} accent={accent}/>
      </div>
    </div>
  );
  if (tpl.id === "lettre-creative") return (
    <div style={{ background:"#fff", fontFamily:"'Helvetica Neue',sans-serif", fontSize:11.5, color:"#111",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.8 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:800, color:accent, letterSpacing:"-0.5px" }}>{fullName(cv)}</div>
        {cv.title && <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{cv.title}</div>}
        <div style={{ fontSize:10, color:"#bbb", marginTop:4 }}>{[cv.phone, cv.email].filter(Boolean).join(" · ")}</div>
      </div>
      <div style={{ height:4, background:`linear-gradient(90deg,${accent},#f9a8d4,${accent}40)`, borderRadius:99, marginBottom:24 }}/>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:1, background:"#f0f0f0", margin:"20px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-executive") return (
    <div style={{ background:"#fffef8", fontFamily:"'Times New Roman',serif", fontSize:11.5, color:"#1a1208",
      padding:"48px 52px 40px", minHeight:780, lineHeight:1.9 }}>
      <div style={{ borderBottom:`2.5px double ${accent}`, paddingBottom:16, marginBottom:28 }}>
        <LetterHeader cv={cv} accent={accent}/>
      </div>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-tech") return (
    <div style={{ background:"#f8fafc", fontFamily:"'Courier New',monospace", fontSize:11, color:"#0f172a",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.85 }}>
      <div style={{ borderLeft:`3px solid ${accent}`, paddingLeft:16, marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:13, color:accent }}>{fullName(cv)}</div>
        {cv.title && <div style={{ fontSize:10.5, color:"#64748b", marginTop:2 }}>{cv.title}</div>}
        <div style={{ fontSize:10, color:"#94a3b8", marginTop:4 }}>{[cv.phone, cv.email].filter(Boolean).join(" | ")}</div>
      </div>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ margin:"16px 0", fontSize:9, color:accent }}>{"/* Lettre de motivation */"}</div>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-sante") return (
    <div style={{ background:"#f0fdf4", fontFamily:"'Arial',sans-serif", fontSize:11.5, color:"#111",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.85 }}>
      <div style={{ background:"#fff", border:`1.5px solid ${accent}30`, borderRadius:8, padding:"16px 20px", marginBottom:24 }}>
        <LetterHeader cv={cv} accent={accent}/>
      </div>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-juridique") return (
    <div style={{ background:"#faf5ff", fontFamily:"'Times New Roman',serif", fontSize:11.5, color:"#111",
      padding:"48px 52px 40px", minHeight:780, lineHeight:1.9 }}>
      <div style={{ textAlign:"center", borderBottom:`1.5px solid ${accent}`, paddingBottom:14, marginBottom:24 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>{fullName(cv)}</div>
        {cv.title && <div style={{ color:accent, fontSize:11, marginTop:2 }}>{cv.title}</div>}
        <div style={{ fontSize:10, color:"#888", marginTop:5 }}>{[cv.phone, cv.email, cv.location].filter(Boolean).join("   |   ")}</div>
      </div>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:1, background:accent+"30", margin:"18px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-academique") return (
    <div style={{ background:"#fff7ed", fontFamily:"'Georgia',serif", fontSize:11.5, color:"#111",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.9 }}>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ borderTop:`2px solid ${accent}`, borderBottom:`1px solid ${accent}40`, padding:"6px 0", margin:"20px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-minimaliste") return (
    <div style={{ background:"#f9fafb", fontFamily:"'Helvetica Neue',sans-serif", fontSize:11.5, color:"#111",
      padding:"52px 60px 40px", minHeight:780, lineHeight:1.85 }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:13, fontWeight:300, letterSpacing:3, textTransform:"uppercase" }}>{fullName(cv)}</div>
        <div style={{ fontSize:10, color:"#9ca3af", letterSpacing:1, marginTop:4 }}>{[cv.phone, cv.email, cv.location].filter(Boolean).join("   ")}</div>
      </div>
      <div style={{ height:1, background:"#e5e7eb", marginBottom:24 }}/>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:1, background:"#e5e7eb", margin:"18px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  // ATS — tous les modèles ATS (structure identique, accent variable)
  return (
    <div style={{ background:"#fff", fontFamily:"'Arial',sans-serif", fontSize:11.5, color:"#111",
      padding:"38px 44px 36px", minHeight:780, lineHeight:1.85 }}>
      <div style={{ borderBottom:`2px solid ${accent}`, paddingBottom:14, marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>{fullName(cv)}</div>
        {cv.title && <div style={{ fontSize:11, color:accent, marginTop:2 }}>{cv.title}</div>}
        <div style={{ fontSize:10, color:"#555", marginTop:6, lineHeight:1.9 }}>
          {cv.location && <div>{cv.location}</div>}
          {cv.phone && <div>Tél : {cv.phone}{cv.phone2?" / "+cv.phone2:""}</div>}
          {cv.email && <div>Email : {cv.email}</div>}
        </div>
        <LetterHeader cv={cv} accent={accent}/>
      </div>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
}


/* ─── CV RENDERERS ─── */
const Sec = ({ t, a, children }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ fontSize:8.5, fontWeight:800, textTransform:"uppercase", letterSpacing:"3.5px",
      color:a, borderBottom:`1.5px solid ${a}35`, paddingBottom:4, marginBottom:9 }}>{t}</div>
    {children}
  </div>
);
const ExpBlk = ({ e, a }) => (
  <div style={{ marginBottom:11 }}>
    <div style={{ display:"flex", justifyContent:"space-between" }}>
      <strong style={{ fontSize:11.5 }}>{e.role}</strong>
      <span style={{ fontSize:9.5, color:"#999" }}>{e.start}–{e.current?"Présent":e.end}</span>
    </div>
    <div style={{ fontSize:10.5, color:a, marginBottom:2 }}>{e.company}</div>
    <p style={{ fontSize:10.5, color:"#555", lineHeight:1.6, margin:0 }}>{e.description}</p>
  </div>
);
const EduBlk = ({ e }) => (
  <div style={{ marginBottom:8 }}>
    <div style={{ display:"flex", justifyContent:"space-between" }}>
      <strong style={{ fontSize:11.5 }}>{e.degree} {e.field}</strong>
      <span style={{ fontSize:9.5, color:"#999" }}>{e.start}–{e.end}</span>
    </div>
    <div style={{ fontSize:10.5, color:"#999" }}>{e.school}</div>
  </div>
);

function CVFooter({ cv, a }) {
  const hasHobbies = cv.hobbies?.filter(h=>h.label).length > 0;
  const hasRefs    = cv.references?.filter(r=>r.name).length > 0;
  const hasSig     = cv.signatureCity || cv.signatureDate;
  const linkedinDisplay = cv.linkedin
    ? cv.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i,"").replace(/\/$/,"")
    : null;
  return (
    <>
      {hasHobbies&&<Sec t="Centres d'intérêt" a={a}><div style={{display:"flex",flexWrap:"wrap",gap:"6px 12px"}}>{cv.hobbies.filter(h=>h.label).map((h,i)=><span key={i} style={{fontSize:10.5,color:"#555",background:`${a}12`,border:`1px solid ${a}25`,borderRadius:20,padding:"2px 10px"}}>{h.label}</span>)}</div></Sec>}
      {cv.certifications?.trim()&&<Sec t="Certifications" a={a}><p style={{fontSize:10.5,color:"#555",margin:0}}>{cv.certifications}</p></Sec>}
      {cv.publications?.trim()&&<Sec t="Publications & Projets" a={a}><p style={{fontSize:10.5,color:"#555",margin:0,whiteSpace:"pre-line"}}>{cv.publications}</p></Sec>}
      {hasRefs&&<Sec t="Références professionnelles" a={a}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>{cv.references.filter(r=>r.name).map((r,i)=><div key={i} style={{fontSize:10.5,lineHeight:1.7}}><div style={{fontWeight:700,color:"#222"}}>{r.name}</div>{r.role&&<div style={{color:a,fontSize:10}}>{r.role}{r.company?` · ${r.company}`:""}</div>}{r.email&&<div style={{color:"#777",fontSize:9.5}}>{r.email}</div>}{r.phone&&<div style={{color:"#777",fontSize:9.5}}>{r.phone}</div>}</div>)}</div></Sec>}
      {cv.refsOnRequest&&!hasRefs&&<div style={{fontSize:10,color:"#999",fontStyle:"italic",marginTop:8}}>Références disponibles sur demande.</div>}
      {hasSig&&(
        <div style={{marginTop:24}}>
          <div style={{fontSize:9.5,color:"#888",fontStyle:"italic",textAlign:"center",
            border:`1px solid ${a}25`,borderRadius:5,padding:"6px 12px",marginBottom:16,lineHeight:1.6}}>
            Je déclare sur l'honneur que toutes ces informations sont sincères et vérifiables.
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{textAlign:"right",fontSize:10.5,color:"#888"}}>
              <div>{[cv.signatureCity,cv.signatureDate].filter(Boolean).join(", le ")}</div>
              {cv.signature
                ? <img src={cv.signature} alt="Signature" style={{height:50,marginTop:8,display:"block",marginLeft:"auto"}}/>
                : <div style={{marginTop:28,borderTop:`1px solid ${a}50`,paddingTop:4,fontSize:10,color:"#aaa",minWidth:160}}>Signature</div>}
            </div>
          </div>
        </div>
      )}
      {cv.confidential&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%) rotate(-30deg)",fontSize:48,fontWeight:900,color:"rgba(0,0,0,0.04)",pointerEvents:"none",letterSpacing:4,textTransform:"uppercase",whiteSpace:"nowrap",zIndex:0}}>CONFIDENTIEL</div>}
      {linkedinDisplay&&<div style={{marginTop:12,textAlign:"right",fontSize:9,color:"#ccc"}}><a href={`https://linkedin.com/in/${linkedinDisplay}`} style={{color:a,textDecoration:"none"}} target="_blank" rel="noopener noreferrer">{cv.firstName} {cv.lastName}</a>{cv.portfolio&&<> · <a href={cv.portfolio} style={{color:a,textDecoration:"none"}} target="_blank" rel="noopener noreferrer">Portfolio</a></>}</div>}
    </>
  );
}

function CVExecutive({ cv }) {
  const a = cv.accentColor || "#c8a96e";
  return <div style={{fontFamily:"'Georgia',serif",background:"#fff",color:"#111",padding:"36px 40px",minHeight:680,position:"relative"}}><div style={{borderBottom:`2.5px solid ${a}`,paddingBottom:16,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontSize:24,fontWeight:700}}>{fullName(cv)}</div><div style={{color:a,fontSize:12,fontWeight:600,marginTop:3}}>{cv.title}</div><div style={{fontSize:9.5,color:"#777",lineHeight:2,marginTop:6}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("  ·  ")}</div></div>{cv.photo&&<img src={cv.photo} alt="" style={{width:72,height:86,objectFit:"cover",borderRadius:6,marginLeft:16,border:`2px solid ${a}30`}}/>}</div>{cv.summary&&<Sec t="Profil" a={a}><p style={{fontSize:11,lineHeight:1.75,color:"#444",margin:0}}>{cv.summary}</p></Sec>}{cv.experiences?.length>0&&<Sec t="Expériences" a={a}>{cv.experiences.map((e,i)=><ExpBlk key={i} e={e} a={a}/>)}</Sec>}{cv.education?.length>0&&<Sec t="Formation" a={a}>{cv.education.map((e,i)=><EduBlk key={i} e={e}/>)}</Sec>}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{cv.skills&&<Sec t="Compétences" a={a}><p style={{fontSize:10.5,color:"#555",margin:0}}>{cv.skills}</p></Sec>}{cv.languages&&<Sec t="Langues" a={a}><p style={{fontSize:10.5,color:"#555",margin:0}}>{cv.languages}</p></Sec>}</div><CVFooter cv={cv} a={a}/></div>;
}
function CVTech({ cv }) {
  return <div style={{fontFamily:"'Courier New',monospace",background:"#020c1b",color:"#8892b0",padding:"36px",minHeight:680,position:"relative"}}><div style={{borderLeft:"3px solid #64ffda",paddingLeft:16,marginBottom:26,display:"flex",gap:16,alignItems:"flex-start"}}><div style={{flex:1}}><div style={{color:"#ccd6f6",fontSize:22,fontWeight:700}}>{fullName(cv)}</div><div style={{color:"#64ffda",fontSize:11,marginTop:3}}>{cv.title}</div><div style={{fontSize:9.5,marginTop:7,color:"#4a5568"}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join(" · ")}</div></div>{cv.photo&&<img src={cv.photo} alt="" style={{width:60,height:72,objectFit:"cover",borderRadius:6,border:"2px solid #64ffda30"}}/>}</div>{cv.summary&&<div style={{marginBottom:18}}><div style={{fontSize:9,color:"#64ffda",marginBottom:5}}>{"// about"}</div><p style={{fontSize:10.5,lineHeight:1.75,margin:0}}>{cv.summary}</p></div>}{cv.experiences?.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:9,color:"#64ffda",marginBottom:9}}>{"// experience"}</div>{cv.experiences.map((e,i)=><div key={i} style={{marginBottom:12}}><div style={{color:"#ccd6f6",fontWeight:700,fontSize:11}}>{e.role} <span style={{color:"#64ffda"}}>@</span> {e.company} <span style={{color:"#4a5568",fontSize:9.5}}>({e.start}–{e.current?"now":e.end})</span></div><p style={{fontSize:10.5,lineHeight:1.65,margin:"3px 0 0"}}>{e.description}</p></div>)}</div>}{cv.education?.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:9,color:"#64ffda",marginBottom:8}}>{"// education"}</div>{cv.education.map((e,i)=><div key={i} style={{fontSize:10.5,marginBottom:6}}><span style={{color:"#ccd6f6"}}>{e.degree} {e.field}</span> — {e.school}</div>)}</div>}{cv.skills&&<div style={{marginBottom:14}}><div style={{fontSize:9,color:"#64ffda",marginBottom:5}}>{"// skills"}</div><p style={{fontSize:10.5,margin:0}}>{cv.skills}</p></div>}<CVFooter cv={cv} a="#64ffda"/></div>;
}
function CVCreative({ cv }) {
  return <div style={{fontFamily:"'Georgia',serif",background:"#fff",minHeight:680,display:"grid",gridTemplateColumns:"180px 1fr",position:"relative"}}><div style={{background:"#1a0a2e",padding:"28px 16px"}}>{cv.photo&&<img src={cv.photo} alt="" style={{width:80,height:96,objectFit:"cover",borderRadius:10,marginBottom:14,border:"2px solid #ff6b9d50"}}/>}<div style={{color:"#fff",fontSize:14,fontWeight:700}}>{fullName(cv)}</div><div style={{color:"#ff6b9d",fontSize:9.5,fontStyle:"italic",marginTop:3}}>{cv.title}</div><div style={{marginTop:18,fontSize:9,color:"#aaa",lineHeight:2.1}}>{[cv.email,cv.phone,cv.location].filter(Boolean).map((v,i)=><div key={i}>{v}</div>)}</div>{cv.skills&&<><div style={{color:"#ff6b9d",fontSize:8,fontWeight:800,textTransform:"uppercase",letterSpacing:2,marginTop:20,marginBottom:8}}>Skills</div><p style={{fontSize:9,color:"#ccc",lineHeight:1.9,margin:0}}>{cv.skills}</p></>}{cv.languages&&<><div style={{color:"#ff6b9d",fontSize:8,fontWeight:800,textTransform:"uppercase",letterSpacing:2,marginTop:14,marginBottom:6}}>Langues</div><p style={{fontSize:9,color:"#ccc",margin:0}}>{cv.languages}</p></>}</div><div style={{padding:"28px 24px"}}>{cv.summary&&<div style={{borderLeft:"3px solid #ff6b9d",paddingLeft:12,marginBottom:16}}><p style={{fontSize:11,color:"#444",lineHeight:1.75,fontStyle:"italic",margin:0}}>{cv.summary}</p></div>}{cv.experiences?.length>0&&<Sec t="Expériences" a="#ff6b9d">{cv.experiences.map((e,i)=><ExpBlk key={i} e={e} a="#ff6b9d"/>)}</Sec>}{cv.education?.length>0&&<Sec t="Formation" a="#ff6b9d">{cv.education.map((e,i)=><EduBlk key={i} e={e}/>)}</Sec>}<CVFooter cv={cv} a="#ff6b9d"/></div></div>;
}
function CVMinimal({ cv }) {
  return <div style={{fontFamily:"'Helvetica Neue',sans-serif",background:"#fff",color:"#111",padding:"44px 40px",minHeight:680,position:"relative"}}><div style={{marginBottom:26,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:28,fontWeight:200,letterSpacing:4,textTransform:"uppercase"}}>{fullName(cv)}</div><div style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",color:"#aaa",marginTop:5}}>{cv.title}</div><div style={{display:"flex",gap:14,marginTop:10,fontSize:9.5,color:"#bbb"}}>{[cv.email,cv.phone,cv.location].filter(Boolean).map((v,i)=><span key={i}>{v}</span>)}</div></div>{cv.photo&&<img src={cv.photo} alt="" style={{width:64,height:78,objectFit:"cover",borderRadius:4}}/>}</div><div style={{height:1,background:"#eee",marginBottom:24}}/>{cv.summary&&<div style={{marginBottom:24}}><p style={{fontSize:11,color:"#666",lineHeight:1.85,margin:0}}>{cv.summary}</p></div>}{cv.experiences?.length>0&&<div style={{marginBottom:22}}><div style={{fontSize:8,letterSpacing:4,textTransform:"uppercase",color:"#ccc",marginBottom:12}}>Expérience</div>{cv.experiences.map((e,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"100px 1fr",gap:10,marginBottom:12}}><div style={{fontSize:9.5,color:"#ccc",paddingTop:2}}>{e.start}–{e.current?"now":e.end}</div><div><div style={{fontWeight:600,fontSize:11}}>{e.role}</div><div style={{fontSize:10,color:"#aaa"}}>{e.company}</div><p style={{fontSize:10,color:"#777",marginTop:3,lineHeight:1.6,marginBottom:0}}>{e.description}</p></div></div>)}</div>}{cv.education?.length>0&&<div style={{marginBottom:22}}><div style={{fontSize:8,letterSpacing:4,textTransform:"uppercase",color:"#ccc",marginBottom:10}}>Formation</div>{cv.education.map((e,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"100px 1fr",gap:10,marginBottom:9}}><div style={{fontSize:9.5,color:"#ccc"}}>{e.start}–{e.end}</div><div><div style={{fontWeight:600,fontSize:11}}>{e.degree} {e.field}</div><div style={{fontSize:10,color:"#aaa"}}>{e.school}</div></div></div>)}</div>}{cv.skills&&<div style={{marginBottom:14}}><div style={{fontSize:8,letterSpacing:4,textTransform:"uppercase",color:"#ccc",marginBottom:7}}>Compétences</div><p style={{fontSize:10,color:"#777",margin:0}}>{cv.skills}</p></div>}<CVFooter cv={cv} a="#111"/></div>;
}
function CVCorporate({ cv }) {
  return <div style={{fontFamily:"'Georgia',serif",background:"#fff",minHeight:680,position:"relative"}}><div style={{background:"#0d1b2a",padding:"24px 34px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:20,fontWeight:700,letterSpacing:1.5,color:"#fff"}}>{fullName(cv).toUpperCase()}</div><div style={{color:"#4fc3f7",fontSize:11,fontWeight:600,marginTop:3}}>{cv.title}</div><div style={{fontSize:9.5,color:"#90a4ae",marginTop:5}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("  ·  ")}</div></div>{cv.photo&&<img src={cv.photo} alt="" style={{width:62,height:74,objectFit:"cover",borderRadius:6,border:"2px solid #4fc3f730"}}/>}</div><div style={{padding:"24px 34px"}}>{cv.summary&&<Sec t="Synthèse" a="#4fc3f7"><p style={{fontSize:11,lineHeight:1.75,color:"#333",margin:0}}>{cv.summary}</p></Sec>}{cv.experiences?.length>0&&<Sec t="Parcours" a="#4fc3f7">{cv.experiences.map((e,i)=><ExpBlk key={i} e={e} a="#4fc3f7"/>)}</Sec>}{cv.education?.length>0&&<Sec t="Formation" a="#4fc3f7">{cv.education.map((e,i)=><EduBlk key={i} e={e}/>)}</Sec>}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{cv.skills&&<Sec t="Compétences" a="#4fc3f7"><p style={{fontSize:10.5,color:"#555",margin:0}}>{cv.skills}</p></Sec>}{cv.languages&&<Sec t="Langues" a="#4fc3f7"><p style={{fontSize:10.5,color:"#555",margin:0}}>{cv.languages}</p></Sec>}</div><CVFooter cv={cv} a="#4fc3f7"/></div></div>;
}
function CVAcademic({ cv }) {
  return <div style={{fontFamily:"'Times New Roman',serif",background:"#fff",color:"#111",padding:"38px",minHeight:680,position:"relative"}}><div style={{textAlign:"center",borderBottom:"2px solid #8b5cf6",paddingBottom:16,marginBottom:20,position:"relative"}}>{cv.photo&&<img src={cv.photo} alt="" style={{width:60,height:72,objectFit:"cover",borderRadius:4,position:"absolute",right:0,top:0}}/>}<div style={{fontSize:21,fontWeight:700}}>{fullName(cv)}</div><div style={{color:"#8b5cf6",fontSize:11,marginTop:3}}>{cv.title}</div><div style={{fontSize:9.5,color:"#888",marginTop:6}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join(" | ")}</div></div>{cv.summary&&<Sec t="Résumé" a="#8b5cf6"><p style={{fontSize:11,lineHeight:1.8,textAlign:"justify",margin:0}}>{cv.summary}</p></Sec>}{cv.experiences?.length>0&&<Sec t="Expériences" a="#8b5cf6">{cv.experiences.map((e,i)=><ExpBlk key={i} e={e} a="#8b5cf6"/>)}</Sec>}{cv.education?.length>0&&<Sec t="Formation Académique" a="#8b5cf6">{cv.education.map((e,i)=><EduBlk key={i} e={e}/>)}</Sec>}{cv.skills&&<Sec t="Compétences" a="#8b5cf6"><p style={{fontSize:10.5,margin:0}}>{cv.skills}</p></Sec>}<CVFooter cv={cv} a="#8b5cf6"/></div>;
}
function CVMedical({ cv }) {
  return <div style={{fontFamily:"'Arial',sans-serif",background:"#fff",minHeight:680,position:"relative"}}><div style={{background:"linear-gradient(135deg,#0a2440,#0d3b6e)",padding:"24px 34px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:20,fontWeight:700,color:"#fff"}}>{fullName(cv)}</div><div style={{color:"#34d399",fontSize:11,marginTop:3}}>{cv.title}</div><div style={{fontSize:9.5,color:"#90caf9",marginTop:5}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("  ·  ")}</div></div>{cv.photo&&<img src={cv.photo} alt="" style={{width:62,height:74,objectFit:"cover",borderRadius:6,border:"2px solid #34d39930"}}/>}</div><div style={{padding:"24px 34px"}}>{cv.summary&&<Sec t="Présentation" a="#34d399"><p style={{fontSize:11,lineHeight:1.75,color:"#333",margin:0}}>{cv.summary}</p></Sec>}{cv.experiences?.length>0&&<Sec t="Expériences" a="#34d399">{cv.experiences.map((e,i)=><ExpBlk key={i} e={e} a="#34d399"/>)}</Sec>}{cv.education?.length>0&&<Sec t="Formation" a="#34d399">{cv.education.map((e,i)=><EduBlk key={i} e={e}/>)}</Sec>}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{cv.skills&&<Sec t="Compétences" a="#34d399"><p style={{fontSize:10.5,color:"#555",margin:0}}>{cv.skills}</p></Sec>}{cv.languages&&<Sec t="Langues" a="#34d399"><p style={{fontSize:10.5,color:"#555",margin:0}}>{cv.languages}</p></Sec>}</div><CVFooter cv={cv} a="#34d399"/></div></div>;
}
function CVLegal({ cv }) {
  return <div style={{fontFamily:"'Palatino Linotype',serif",background:"#fffef8",color:"#1a1208",padding:"38px",minHeight:680,position:"relative"}}><div style={{textAlign:"center",marginBottom:24,position:"relative"}}>{cv.photo&&<img src={cv.photo} alt="" style={{width:62,height:74,objectFit:"cover",borderRadius:4,position:"absolute",right:0,top:0,border:"1px solid #b8860b30"}}/>}<div style={{fontSize:9.5,letterSpacing:7,textTransform:"uppercase",color:"#b8860b",marginBottom:7}}>Curriculum Vitæ</div><div style={{fontSize:22,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>{fullName(cv)}</div><div style={{color:"#b8860b",fontSize:11,fontStyle:"italic",marginTop:3}}>{cv.title}</div><div style={{width:44,height:1.5,background:"#b8860b",margin:"10px auto"}}/><div style={{fontSize:9.5,color:"#999"}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("  •  ")}</div></div>{cv.summary&&<Sec t="Profil" a="#b8860b"><p style={{fontSize:11,lineHeight:1.85,textAlign:"justify",margin:0}}>{cv.summary}</p></Sec>}{cv.experiences?.length>0&&<Sec t="Expériences Professionnelles" a="#b8860b">{cv.experiences.map((e,i)=><ExpBlk key={i} e={e} a="#b8860b"/>)}</Sec>}{cv.education?.length>0&&<Sec t="Formation" a="#b8860b">{cv.education.map((e,i)=><EduBlk key={i} e={e}/>)}</Sec>}{cv.skills&&<Sec t="Compétences" a="#b8860b"><p style={{fontSize:10.5,margin:0}}>{cv.skills}</p></Sec>}<CVFooter cv={cv} a="#b8860b"/></div>;
}
function CVMarketing({ cv }) {
  return <div style={{fontFamily:"'Helvetica Neue',sans-serif",background:"#fff",minHeight:680,display:"grid",gridTemplateColumns:"188px 1fr",position:"relative"}}><div style={{background:"#111",padding:"28px 16px"}}>{cv.photo&&<img src={cv.photo} alt="" style={{width:80,height:96,objectFit:"cover",borderRadius:10,marginBottom:12,border:"2px solid #f9731640"}}/>}<div style={{color:"#fff",fontSize:13,fontWeight:800}}>{fullName(cv)}</div><div style={{color:"#f97316",fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginTop:3}}>{cv.title}</div><div style={{marginTop:16,fontSize:9,color:"#888",lineHeight:2.1}}>{[cv.email,cv.phone,cv.location].filter(Boolean).map((v,i)=><div key={i}>{v}</div>)}</div>{cv.skills&&<><div style={{color:"#f97316",fontSize:8,fontWeight:800,textTransform:"uppercase",letterSpacing:2,marginTop:20,marginBottom:8}}>Skills</div>{cv.skills.split(",").map((s,i)=><div key={i} style={{background:"#f9731615",border:"1px solid #f9731430",borderRadius:4,padding:"2px 7px",fontSize:9,color:"#f97316",marginBottom:5}}>{s.trim()}</div>)}</>}{cv.languages&&<><div style={{color:"#f97316",fontSize:8,fontWeight:800,textTransform:"uppercase",letterSpacing:2,marginTop:16,marginBottom:6}}>Langues</div><p style={{fontSize:9,color:"#aaa",margin:0}}>{cv.languages}</p></>}</div><div style={{padding:"28px 24px"}}>{cv.summary&&<div style={{background:"#fff7ed",borderLeft:"3.5px solid #f97316",padding:"10px 12px",borderRadius:"0 8px 8px 0",marginBottom:18}}><p style={{fontSize:11,color:"#555",lineHeight:1.75,margin:0}}>{cv.summary}</p></div>}{cv.experiences?.length>0&&<Sec t="Expériences" a="#f97316">{cv.experiences.map((e,i)=><ExpBlk key={i} e={e} a="#f97316"/>)}</Sec>}{cv.education?.length>0&&<Sec t="Formation" a="#f97316">{cv.education.map((e,i)=><EduBlk key={i} e={e}/>)}</Sec>}<CVFooter cv={cv} a="#f97316"/></div></div>;
}
function CVStartup({ cv }) {
  return <div style={{fontFamily:"'Helvetica Neue',sans-serif",background:"#06060f",color:"#e2e8f0",padding:"34px",minHeight:680,position:"relative"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}><div><div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-0.5px"}}>{fullName(cv)}</div><div style={{color:"#818cf8",fontSize:12,fontWeight:600,marginTop:3}}>{cv.title}</div><div style={{fontSize:9.5,color:"#4a5568",marginTop:5}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join(" · ")}</div></div>{cv.photo&&<img src={cv.photo} alt="" style={{width:60,height:72,objectFit:"cover",borderRadius:10,border:"2px solid #818cf830"}}/>}</div>{cv.summary&&<div style={{background:"#0f0f1f",border:"1px solid #818cf825",borderRadius:10,padding:13,marginBottom:20}}><p style={{fontSize:11,color:"#a5b4fc",lineHeight:1.75,margin:0}}>{cv.summary}</p></div>}{cv.experiences?.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:8.5,fontWeight:800,color:"#818cf8",textTransform:"uppercase",letterSpacing:3,marginBottom:10}}>Expériences</div>{cv.experiences.map((e,i)=><div key={i} style={{background:"#0f0f1f",border:"1px solid #1e1e3f",borderRadius:9,padding:11,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#fff",fontWeight:700,fontSize:11}}>{e.role}</span><span style={{color:"#818cf8",fontSize:9.5}}>{e.start}–{e.current?"now":e.end}</span></div><div style={{color:"#818cf8",fontSize:9.5,marginBottom:4}}>{e.company}</div><p style={{fontSize:10.5,color:"#94a3b8",lineHeight:1.65,margin:0}}>{e.description}</p></div>)}</div>}{cv.education?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:8.5,fontWeight:800,color:"#818cf8",textTransform:"uppercase",letterSpacing:3,marginBottom:9}}>Formation</div>{cv.education.map((e,i)=><div key={i} style={{fontSize:10.5,marginBottom:7}}><span style={{color:"#fff",fontWeight:600}}>{e.degree} {e.field}</span> · <span style={{color:"#818cf8"}}>{e.school}</span></div>)}</div>}{cv.skills&&<div style={{marginBottom:14}}><div style={{fontSize:8.5,fontWeight:800,color:"#818cf8",textTransform:"uppercase",letterSpacing:3,marginBottom:7}}>Skills</div><p style={{fontSize:10.5,color:"#94a3b8",margin:0}}>{cv.skills}</p></div>}<CVFooter cv={cv} a="#818cf8"/></div>;
}

/* ATS primitives */
const A = ({ label, color="#1c1812" }) => (
  <div style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"3px",
    color, borderBottom:`2px solid ${color}`, paddingBottom:3, marginBottom:10, marginTop:16 }}>{label}</div>
);
const AExp = ({ e, accent }) => (
  <div style={{ marginBottom:12 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
      <strong style={{ fontSize:11.5, color:"#111" }}>{e.role}</strong>
      <span style={{ fontSize:9.5, color:"#666", whiteSpace:"nowrap", marginLeft:8 }}>{e.start}{e.end||e.current?` – ${e.current?"Présent":e.end}`:""}</span>
    </div>
    <div style={{ fontSize:10.5, color:accent, fontWeight:600, marginBottom:3 }}>{e.company}</div>
    <p style={{ fontSize:10.5, color:"#444", lineHeight:1.65, margin:0 }}>{e.description}</p>
  </div>
);
const AEdu = ({ e }) => (
  <div style={{ marginBottom:9 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
      <strong style={{ fontSize:11.5, color:"#111" }}>{e.degree}{e.field?` — ${e.field}`:""}</strong>
      <span style={{ fontSize:9.5, color:"#666" }}>{e.start}{e.end?` – ${e.end}`:""}</span>
    </div>
    <div style={{ fontSize:10.5, color:"#666" }}>{e.school}</div>
  </div>
);
const AFooter = ({ cv, accent }) => {
  const hasH = cv.hobbies?.filter(h=>h.label).length > 0;
  const hasR = cv.references?.filter(r=>r.name).length > 0;
  const hasSig = cv.signatureCity || cv.signatureDate;
  return (<>
    {hasH&&<><A label="Centres d'intérêt" color={accent}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.7,margin:0}}>{cv.hobbies.filter(h=>h.label).map(h=>h.label).join("  ·  ")}</p></>}
    {cv.certifications?.trim()&&<><A label="Certifications" color={accent}/><p style={{fontSize:10.5,color:"#444",margin:0}}>{cv.certifications}</p></>}
    {cv.publications?.trim()&&<><A label="Publications & Projets" color={accent}/><p style={{fontSize:10.5,color:"#444",margin:0,whiteSpace:"pre-line"}}>{cv.publications}</p></>}
    {hasR&&<><A label="Références professionnelles" color={accent}/>{cv.references.filter(r=>r.name).map((r,i)=><div key={i} style={{marginBottom:8,fontSize:10.5}}><strong>{r.name}</strong>{r.role&&<span style={{color:accent}}> — {r.role}{r.company?`, ${r.company}`:""}</span>}{r.email&&<span style={{color:"#666"}}> · {r.email}</span>}{r.phone&&<span style={{color:"#666"}}> · {r.phone}</span>}</div>)}</>}
    {cv.refsOnRequest&&!hasR&&<p style={{fontSize:10,color:"#999",fontStyle:"italic",marginTop:8}}>Références disponibles sur demande.</p>}
    {hasSig&&<div style={{marginTop:24}}><div style={{fontSize:9.5,color:"#888",fontStyle:"italic",textAlign:"center",border:`1px solid ${accent}25`,borderRadius:5,padding:"6px 12px",marginBottom:16,lineHeight:1.6}}>Je déclare sur l'honneur que toutes ces informations sont sincères et vérifiables.</div><div style={{display:"flex",justifyContent:"flex-end"}}><div style={{textAlign:"right",fontSize:10.5,color:"#888"}}><div>{[cv.signatureCity,cv.signatureDate].filter(Boolean).join(", le ")}</div>{cv.signature?<img src={cv.signature} alt="Signature" style={{height:50,marginTop:8,display:"block",marginLeft:"auto"}}/>:<div style={{marginTop:24,borderTop:`1px solid ${accent}60`,paddingTop:4,minWidth:160,fontSize:10,color:"#aaa"}}>Signature</div>}</div></div></div>}
  </>);
};
const ATSWrap = ({ cv, accent="#1c1812", bg="#fff", children }) => (
  <div style={{ fontFamily:"'Arial',sans-serif", background:bg, color:"#1c1812", padding:"32px 38px", minHeight:680, maxWidth:"100%", position:"relative" }}>
    {children}
    {cv.experiences?.length>0&&<><A label="Expériences professionnelles" color={accent}/>{cv.experiences.map((e,i)=><AExp key={i} e={e} accent={accent}/>)}</>}
    {cv.education?.length>0&&<><A label="Formation" color={accent}/>{cv.education.map((e,i)=><AEdu key={i} e={e}/>)}</>}
    {cv.skills&&<><A label="Compétences" color={accent}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.7,margin:0}}>{cv.skills}</p></>}
    {cv.languages&&<><A label="Langues" color={accent}/><p style={{fontSize:10.5,color:"#444",margin:0}}>{cv.languages}</p></>}
    <AFooter cv={cv} accent={accent}/>
  </div>
);

function ATSClarte({ cv }) {
  return (<ATSWrap cv={cv} accent="#1c1812"><div style={{borderBottom:"2px solid #1c1812",paddingBottom:14,marginBottom:4}}><div style={{fontSize:22,fontWeight:700,color:"#1c1812",letterSpacing:"-0.3px"}}>{fullName(cv)}</div><div style={{fontSize:12,color:"#444",marginTop:3}}>{cv.title}</div><div style={{fontSize:10,color:"#666",marginTop:6,lineHeight:1.8}}>{[cv.email,cv.phone,cv.location,cv.linkedin].filter(Boolean).join("   |   ")}</div></div>{cv.summary&&<><A label="Profil professionnel" color="#1c1812"/><p style={{fontSize:10.5,color:"#444",lineHeight:1.75,margin:0}}>{cv.summary}</p></>}</ATSWrap>);
}
function ATSDakar({ cv }) {
  const ACC="#7b2d2d";
  return (<ATSWrap cv={cv} accent={ACC}><div style={{borderLeft:`4px solid ${ACC}`,paddingLeft:16,marginBottom:4}}>{cv.photo&&<img src={cv.photo} alt="" style={{width:62,height:75,objectFit:"cover",float:"right",borderRadius:4,border:`2px solid ${ACC}30`}}/>}<div style={{fontSize:21,fontWeight:700,color:"#1c1812"}}>{fullName(cv)}</div><div style={{fontSize:11.5,color:ACC,fontWeight:600,marginTop:2}}>{cv.title}</div><div style={{fontSize:10,color:"#666",marginTop:6,lineHeight:1.9}}>{[cv.email,cv.phone,cv.location].filter(Boolean).map((v,i)=><div key={i}>{v}</div>)}</div><div style={{clear:"both"}}/></div>{cv.summary&&<><A label="Présentation" color={ACC}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.75,margin:0}}>{cv.summary}</p></>}</ATSWrap>);
}
function ATSSahel({ cv }) {
  const ACC="#8b6914";
  return (<ATSWrap cv={cv} accent={ACC}><div style={{textAlign:"center",paddingBottom:14,marginBottom:4,borderBottom:`1px solid ${ACC}`}}>{cv.photo&&<img src={cv.photo} alt="" style={{width:62,height:75,objectFit:"cover",borderRadius:"50%",border:`2px solid ${ACC}`,marginBottom:8,display:"block",margin:"0 auto 8px"}}/>}<div style={{fontSize:22,fontWeight:700,letterSpacing:"1px",color:"#1c1812",textTransform:"uppercase"}}>{fullName(cv)}</div><div style={{fontSize:11,color:ACC,marginTop:4,fontStyle:"italic"}}>{cv.title}</div><div style={{fontSize:10,color:"#777",marginTop:6}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("   ·   ")}</div></div>{cv.summary&&<><A label="Profil" color={ACC}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.75,margin:0,textAlign:"justify"}}>{cv.summary}</p></>}</ATSWrap>);
}
function ATSDiplomate({ cv }) {
  return (<div style={{fontFamily:"'Times New Roman',serif",background:"#fff",color:"#111",padding:"32px 38px",minHeight:680,position:"relative"}}><div style={{textAlign:"center",borderBottom:"1px solid #111",paddingBottom:12,marginBottom:4}}><div style={{fontSize:20,fontWeight:700,textTransform:"uppercase",letterSpacing:"2px"}}>{fullName(cv)}</div><div style={{fontSize:11,color:"#555",marginTop:3,fontStyle:"italic"}}>{cv.title}</div><div style={{fontSize:10,color:"#666",marginTop:6}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("   |   ")}</div></div>{cv.summary&&<><A label="Résumé" color="#111"/><p style={{fontSize:10.5,lineHeight:1.85,textAlign:"justify",margin:0}}>{cv.summary}</p></>}{cv.experiences?.length>0&&<><A label="Expériences professionnelles" color="#111"/>{cv.experiences.map((e,i)=><AExp key={i} e={e} accent="#111"/>)}</>}{cv.education?.length>0&&<><A label="Formation" color="#111"/>{cv.education.map((e,i)=><AEdu key={i} e={e}/>)}</>}{cv.skills&&<><A label="Compétences" color="#111"/><p style={{fontSize:10.5,margin:0}}>{cv.skills}</p></>}{cv.languages&&<><A label="Langues" color="#111"/><p style={{fontSize:10.5,margin:0}}>{cv.languages}</p></>}<AFooter cv={cv} accent="#111"/></div>);
}
function ATSIngenieur({ cv }) {
  const ACC="#1a3a5c";
  return (<ATSWrap cv={cv} accent={ACC}><div style={{background:ACC,color:"#fff",padding:"16px 20px",margin:"-32px -38px 4px",borderBottom:"3px solid #c49a3c"}}><div style={{fontSize:20,fontWeight:700}}>{fullName(cv)}</div><div style={{fontSize:11,color:"#a8c4e0",marginTop:2}}>{cv.title}</div><div style={{fontSize:10,color:"#7ca8cc",marginTop:6}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("   |   ")}</div></div><div style={{marginTop:20}}>{cv.summary&&<><A label="Profil technique" color={ACC}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.75,margin:0}}>{cv.summary}</p></>}</div></ATSWrap>);
}
function ATSConsultant({ cv }) {
  const ACC="#1a4d3a";
  return (<ATSWrap cv={cv} accent={ACC}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:`2px solid ${ACC}`,paddingBottom:14,marginBottom:4}}><div><div style={{fontSize:21,fontWeight:700,color:"#111"}}>{fullName(cv)}</div><div style={{fontSize:11.5,color:ACC,fontWeight:600,marginTop:2}}>{cv.title}</div></div><div style={{textAlign:"right",fontSize:10,color:"#666",lineHeight:2}}>{[cv.email,cv.phone,cv.location].filter(Boolean).map((v,i)=><div key={i}>{v}</div>)}</div></div>{cv.summary&&<><A label="Synthèse executive" color={ACC}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.75,margin:0}}>{cv.summary}</p></>}</ATSWrap>);
}
function ATSAcademique({ cv }) {
  const ACC="#3b2f6b";
  return (<div style={{fontFamily:"'Georgia',serif",background:"#fff",color:"#111",padding:"32px 38px",minHeight:680,position:"relative"}}><div style={{textAlign:"center",borderBottom:`1.5px solid ${ACC}`,paddingBottom:14,marginBottom:4}}>{cv.photo&&<img src={cv.photo} alt="" style={{width:56,height:68,objectFit:"cover",borderRadius:4,float:"right"}}/>}<div style={{fontSize:20,fontWeight:700}}>{fullName(cv)}</div><div style={{fontSize:11,color:ACC,fontStyle:"italic",marginTop:3}}>{cv.title}</div><div style={{fontSize:10,color:"#666",marginTop:5}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("   |   ")}</div><div style={{clear:"both"}}/></div>{cv.summary&&<><A label="Résumé académique" color={ACC}/><p style={{fontSize:10.5,lineHeight:1.85,textAlign:"justify",margin:0}}>{cv.summary}</p></>}{cv.experiences?.length>0&&<><A label="Expériences d'enseignement & recherche" color={ACC}/>{cv.experiences.map((e,i)=><AExp key={i} e={e} accent={ACC}/>)}</>}{cv.education?.length>0&&<><A label="Formation académique" color={ACC}/>{cv.education.map((e,i)=><AEdu key={i} e={e}/>)}</>}{cv.skills&&<><A label="Domaines de recherche & compétences" color={ACC}/><p style={{fontSize:10.5,margin:0}}>{cv.skills}</p></>}{cv.languages&&<><A label="Langues" color={ACC}/><p style={{fontSize:10.5,margin:0}}>{cv.languages}</p></>}<AFooter cv={cv} accent={ACC}/></div>);
}
function ATSHumanitaire({ cv }) {
  const ACC="#c25e00";
  return (<ATSWrap cv={cv} accent={ACC}><div style={{borderBottom:`2px solid ${ACC}`,paddingBottom:14,marginBottom:4}}>{cv.photo&&<img src={cv.photo} alt="" style={{width:60,height:72,objectFit:"cover",float:"right",borderRadius:4}}/>}<div style={{fontSize:20,fontWeight:700}}>{fullName(cv)}</div><div style={{fontSize:11.5,color:ACC,fontWeight:600,marginTop:2}}>{cv.title}</div><div style={{fontSize:10,color:"#666",marginTop:6,lineHeight:1.9}}>{[cv.email,cv.phone,cv.location].filter(Boolean).map((v,i)=><div key={i}>{v}</div>)}</div><div style={{clear:"both"}}/></div>{cv.summary&&<><A label="Profil & engagements terrain" color={ACC}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.75,margin:0}}>{cv.summary}</p></>}</ATSWrap>);
}
function ATSJunior({ cv }) {
  const ACC="#0e5a8a";
  return (<div style={{fontFamily:"'Arial',sans-serif",background:"#fff",color:"#1c1812",padding:"32px 38px",minHeight:680,position:"relative"}}><div style={{borderBottom:`3px solid ${ACC}`,paddingBottom:12,marginBottom:4}}><div style={{fontSize:20,fontWeight:700}}>{fullName(cv)}</div><div style={{fontSize:11.5,color:ACC,marginTop:2}}>{cv.title}</div><div style={{fontSize:10,color:"#666",marginTop:5}}>{[cv.email,cv.phone,cv.location].filter(Boolean).join("   |   ")}</div></div>{cv.summary&&<><A label="Objectif professionnel" color={ACC}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.75,margin:0}}>{cv.summary}</p></>}{cv.education?.length>0&&<><A label="Formation" color={ACC}/>{cv.education.map((e,i)=><AEdu key={i} e={e}/>)}</>}{cv.experiences?.length>0&&<><A label="Expériences & stages" color={ACC}/>{cv.experiences.map((e,i)=><AExp key={i} e={e} accent={ACC}/>)}</>}{cv.skills&&<><A label="Compétences" color={ACC}/><p style={{fontSize:10.5,color:"#444",lineHeight:1.7,margin:0}}>{cv.skills}</p></>}{cv.languages&&<><A label="Langues" color={ACC}/><p style={{fontSize:10.5,color:"#444",margin:0}}>{cv.languages}</p></>}<AFooter cv={cv} accent={ACC}/></div>);
}
function ATSCadre({ cv }) {
  const ACC="#111";
  return (<div style={{fontFamily:"'Georgia',serif",background:"#fff",color:"#111",padding:"32px 38px",minHeight:680,position:"relative"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"2.5px solid #111",paddingBottom:14,marginBottom:4}}><div><div style={{fontSize:23,fontWeight:700,letterSpacing:"-0.5px"}}>{fullName(cv)}</div><div style={{fontSize:12,color:"#444",fontStyle:"italic",marginTop:3}}>{cv.title}</div></div>{cv.photo&&<img src={cv.photo} alt="" style={{width:60,height:72,objectFit:"cover",borderRadius:3,border:"1px solid #ddd"}}/>}</div><div style={{display:"flex",gap:20,fontSize:10,color:"#666",marginBottom:4,marginTop:10}}>{[cv.email,cv.phone,cv.location].filter(Boolean).map((v,i)=><span key={i}>{v}</span>)}</div>{cv.summary&&<><A label="Profil exécutif" color={ACC}/><p style={{fontSize:10.5,lineHeight:1.8,margin:0,fontStyle:"italic",color:"#333"}}>{cv.summary}</p></>}{cv.experiences?.length>0&&<><A label="Parcours professionnel" color={ACC}/>{cv.experiences.map((e,i)=><AExp key={i} e={e} accent={ACC}/>)}</>}{cv.education?.length>0&&<><A label="Formation" color={ACC}/>{cv.education.map((e,i)=><AEdu key={i} e={e}/>)}</>}{cv.skills&&<><A label="Compétences clés" color={ACC}/><p style={{fontSize:10.5,margin:0}}>{cv.skills}</p></>}{cv.languages&&<><A label="Langues" color={ACC}/><p style={{fontSize:10.5,margin:0}}>{cv.languages}</p></>}<AFooter cv={cv} accent={ACC}/></div>);
}

const RENDERERS = { executive:CVExecutive,tech:CVTech,creative:CVCreative,minimal:CVMinimal,corporate:CVCorporate,academic:CVAcademic,medical:CVMedical,legal:CVLegal,marketing:CVMarketing,startup:CVStartup };
const ATS_RENDERERS = { "ats-clarte":ATSClarte,"ats-dakar":ATSDakar,"ats-sahel":ATSSahel,"ats-diplomate":ATSDiplomate,"ats-ingenieur":ATSIngenieur,"ats-consultant":ATSConsultant,"ats-academique":ATSAcademique,"ats-humanitaire":ATSHumanitaire,"ats-junior":ATSJunior,"ats-cadre":ATSCadre };

/* ─── FORM STEPS ─── */
function StepProfile({ form, setForm, showErrors, importedText }) {
  const f = k => e => setForm({ ...form, [k]: e.target.value });
  const photoRef = useRef();
  const [cropSrc, setCropSrc] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const err = (v) => showErrors && !v?.trim();

  const handlePhoto = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCrop = (dataUrl) => {
    setForm({ ...form, photo: dataUrl });
    setCropSrc(null);
  };

  const today = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});

  return (
    <Stack>
      {importedText && (
        <div style={{ background:"#f0f7ff", border:"1px solid #b0d0f0", borderRadius:8,
          padding:12, fontSize:12, color:"#1a3a5c", lineHeight:1.6 }}>
          📄 <strong>Texte importé disponible.</strong> Copiez les informations ci-dessous dans les champs.
          <div style={{ maxHeight:100, overflowY:"auto", marginTop:8, fontSize:11,
            fontFamily:"'DM Mono',monospace", color:"#444", whiteSpace:"pre-wrap" }}>
            {importedText.substring(0,500)}...
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
        <div>
          <Label t="Photo"/>
          {cropSrc ? (
            <PhotoCrop src={cropSrc} onCrop={handleCrop}/>
          ) : (
            <div className="photo-drop" onClick={() => photoRef.current.click()}>
              {form.photo
                ? <img src={form.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                : <div style={{ textAlign:"center", padding:8 }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>📷</div>
                    <div style={{ fontSize:10, color:"var(--ink4)", lineHeight:1.4 }}>Ajouter<br/>une photo</div>
                  </div>
              }
            </div>
          )}
          <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto}/>
          {form.photo && !cropSrc && (
            <button className="btn-text" style={{ width:"100%", marginTop:5, textAlign:"center" }}
              onClick={()=>setForm({...form,photo:null})}>Retirer</button>
          )}
        </div>
        <div style={{ flex:1, display:"grid", gap:14 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"var(--ink3)" }}>Ordre du nom</span>
              <div style={{ display:"flex", gap:0, borderRadius:8, overflow:"hidden", border:"1px solid var(--border)" }}>
                <button type="button"
                  onClick={()=>setForm({...form, nameOrder:"firstLast"})}
                  style={{ padding:"4px 12px", fontSize:11.5, cursor:"pointer", border:"none",
                    background: form.nameOrder!=="lastFirst" ? "var(--terra)" : "transparent",
                    color: form.nameOrder!=="lastFirst" ? "#fff" : "var(--ink3)",
                    fontWeight: form.nameOrder!=="lastFirst" ? 700 : 400 }}>
                  Prénom Nom
                </button>
                <button type="button"
                  onClick={()=>setForm({...form, nameOrder:"lastFirst"})}
                  style={{ padding:"4px 12px", fontSize:11.5, cursor:"pointer", border:"none",
                    background: form.nameOrder==="lastFirst" ? "var(--terra)" : "transparent",
                    color: form.nameOrder==="lastFirst" ? "#fff" : "var(--ink3)",
                    fontWeight: form.nameOrder==="lastFirst" ? 700 : 400 }}>
                  NOM Prénom
                </button>
              </div>
            </div>
            <Grid2>
              <FloatField label="Prénom" required value={form.firstName||""} onChange={f("firstName")} style={{ marginBottom:0 }}/>
              <FloatField label="Nom" required value={form.lastName||""} onChange={f("lastName")} style={{ marginBottom:0 }}/>
            </Grid2>
          </div>
          <div>
            <FloatField label="Titre professionnel" required value={form.title||""} onChange={f("title")} style={{ marginBottom:0 }}/>
            <datalist id="job-suggestions">
              {["Comptable","Comptable Senior","Contrôleur de gestion","Développeur Full Stack","Chef de Projet","Ingénieur Civil","Juriste","Infirmier","Directeur Financier","Chargé RH","Commercial","Consultant","Auditeur","Data Analyst","Manager"].map(j=><option key={j} value={j}/>)}
            </datalist>
          </div>
        </div>
      </div>

      <Grid2>
        <FloatField label="Email" required type="email" value={form.email||""} onChange={f("email")} style={{ marginBottom:0 }}/>
        <FloatField label="Téléphone" required value={form.phone||""} onChange={f("phone")} style={{ marginBottom:0 }}/>
      </Grid2>
      <Grid2>
        <div><Label t="Téléphone 2 (optionnel)"/><input className="field" placeholder="+226 65 00 00 00" value={form.phone2||""} onChange={f("phone2")}/></div>
        <div><Label t="Localisation"/><input className="field" placeholder="Ouagadougou, Burkina Faso" value={form.location} onChange={f("location")}/></div>
      </Grid2>
      <Grid2>
        <div><Label t="Nationalité (optionnel)"/><input className="field" placeholder="Burkinabè, Ivoirienne..." value={form.nationality||""} onChange={f("nationality")}/></div>
        <div><Label t="Date de naissance (optionnel)"/><input className="field" placeholder="15 mars 1995" value={form.birthDate||""} onChange={f("birthDate")}/></div>
      </Grid2>
      <Grid2>
        <div>
          <Label t="Situation matrimoniale (optionnel)"/>
          <select className="field" value={form.maritalStatus||""} onChange={f("maritalStatus")}>
            <option value="">— Non renseigné —</option>
            <option value="Célibataire">Célibataire</option>
            <option value="Marié(e)">Marié(e)</option>
            <option value="Divorcé(e)">Divorcé(e)</option>
            <option value="Veuf/Veuve">Veuf/Veuve</option>
          </select>
        </div>
        <div>
          <Label t="LinkedIn" tip={TIPS.linkedin}/>
          <input className="field" placeholder="linkedin.com/in/lawali-toe" value={form.linkedin} onChange={f("linkedin")}/>
        </div>
      </Grid2>
      <div>
        <Label t="Portfolio / Site web"/>
        <input className="field" placeholder="https://monportfolio.com" value={form.portfolio||""} onChange={f("portfolio")}/>
      </div>
      <div>
        <FloatField label="Résumé professionnel" multiline rows={3}
          value={form.summary||""} onChange={f("summary")}/>
        <WordCount text={form.summary}/>
      </div>

      {/* Exemples métier */}
      <div style={{ background:"var(--cream2)", border:"1px solid var(--border)", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"var(--ink3)", marginBottom:10 }}>
          💡 Voir un exemple de profil :
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {Object.entries({ comptable:"Comptable", dev:"Développeur", manager:"Manager", infirmier:"Infirmier", juriste:"Juriste" }).map(([k,v]) => (
            <button key={k} className="btn-line" style={{ padding:"6px 14px", fontSize:12 }}
              onClick={() => setForm({ ...form, title:JOB_EXAMPLES[k].title, summary:JOB_EXAMPLES[k].summary, skills:JOB_EXAMPLES[k].skills, languages:JOB_EXAMPLES[k].languages })}>
              {v}
            </button>
          ))}
        </div>
      </div>
    </Stack>
  );
}

function StepExp({ form, setForm, showErrors, onSkip }) {
  const upd = (i,k,v) => { const a=[...form.experiences]; a[i]={...a[i],[k]:v}; setForm({...form,experiences:a}); };
  const add = () => setForm({...form, experiences:[...form.experiences,{company:"",role:"",start:"",end:"",current:false,description:""}]});
  const rm  = i => setForm({...form, experiences:form.experiences.filter((_,j)=>j!==i)});
  const dup = i => { const a=[...form.experiences]; a.splice(i+1,0,{...a[i]}); setForm({...form,experiences:a}); };
  const err = (v) => showErrors && !v?.trim();
  const dragOver = useRef(null);

  const handleDragStart = (e, i) => { e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("idx", i); };
  const handleDrop = (e, target) => {
    const src = parseInt(e.dataTransfer.getData("idx"));
    if (src === target) return;
    const a = [...form.experiences];
    const [item] = a.splice(src, 1);
    a.splice(target, 0, item);
    setForm({...form, experiences:a});
  };

  return (
    <Stack>
      <div className="skip-banner">
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--terra)" }}>Pas encore d'expérience professionnelle ?</div>
          <div style={{ fontSize:12, color:"var(--ink3)", marginTop:2 }}>Jeune diplômé, première recherche d'emploi ? Vous pouvez passer cette étape.</div>
        </div>
        <button className="btn-line" style={{ fontSize:12, padding:"8px 16px", flexShrink:0 }}
          onClick={() => { setForm({...form, experiences:[]}); onSkip(); }}>
          Passer →
        </button>
      </div>
      {form.experiences.map((e,i) => (
        <div key={i} draggable onDragStart={ev=>handleDragStart(ev,i)}
          onDragOver={ev=>{ev.preventDefault();dragOver.current=i;}}
          onDrop={ev=>handleDrop(ev,i)}>
          <Block>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16,
              paddingBottom:12, borderBottom:"1px solid var(--cream3)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span className="drag-handle" title="Glisser pour réorganiser">⠿</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10.5, fontWeight:500,
                  color:"var(--ink3)", textTransform:"uppercase", letterSpacing:"1.5px" }}>Expérience {i+1}</span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn-text" onClick={()=>dup(i)}>Dupliquer</button>
                {form.experiences.length>1 && <button className="btn-text" onClick={()=>rm(i)}>Retirer</button>}
              </div>
            </div>
            <Stack gap={14}>
              <Grid2>
                <div><Label t="Entreprise" required/><input className={`field${err(e.company)?" err":""}`} placeholder="SONABHY / Banque Atlantique / ONG..." value={e.company} onChange={x=>upd(i,"company",x.target.value)}/></div>
                <div>
                  <Label t="Poste" required/>
                  <input className={`field${err(e.role)?" err":""}`} placeholder="Responsable Comptable"
                    value={e.role} onChange={x=>upd(i,"role",x.target.value)} list={`roles-${i}`}/>
                  <datalist id={`roles-${i}`}>
                    {["Comptable","Chef de Projet","Directeur Financier","Développeur","Ingénieur","Consultant","Manager","Chargé RH","Auditeur","Commercial"].map(r=><option key={r} value={r}/>)}
                  </datalist>
                </div>
              </Grid2>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:12, alignItems:"end" }}>
                <div><Label t="Début" required/><input className={`field${err(e.start)?" err":""}`} placeholder="Jan 2020" value={e.start} onChange={x=>upd(i,"start",x.target.value)}/></div>
                <div><Label t="Fin"/><input className="field" placeholder="Déc 2023" value={e.end} onChange={x=>upd(i,"end",x.target.value)} disabled={e.current}/></div>
                <label style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:"var(--ink3)", cursor:"pointer", paddingBottom:13, whiteSpace:"nowrap" }}>
                  <input type="checkbox" checked={e.current} onChange={x=>upd(i,"current",x.target.checked)} style={{ accentColor:"var(--terra)", width:15, height:15 }}/>En poste
                </label>
              </div>
              <div>
                <Label t="Missions & réalisations" required tip={TIPS.description}/>
                <textarea className={`field${err(e.description)?" err":""}`} rows={3} style={{ resize:"vertical", lineHeight:1.7 }}
                  placeholder="Gestion de la comptabilité générale, suivi budgétaire, production des bilans..."
                  value={e.description} onChange={x=>upd(i,"description",x.target.value)}/>
                <div style={{ fontSize:11, color:e.description?.trim().split(/\s+/).filter(Boolean).length < 15 ? "#c0392b" : "#2a7a2a", marginTop:3 }}>
                  {e.description?.trim().split(/\s+/).filter(Boolean).length < 15 ? "⚠ Trop court — décrivez vos missions en détail" : "✓ Bonne longueur"}
                </div>
              </div>
            </Stack>
          </Block>
        </div>
      ))}
      <button className="btn-add" onClick={add}>+ Ajouter une expérience</button>
    </Stack>
  );
}

function StepEdu({ form, setForm, showErrors }) {
  const upd = (i,k,v) => { const a=[...form.education]; a[i]={...a[i],[k]:v}; setForm({...form,education:a}); };
  const add = () => setForm({...form, education:[...form.education,{school:"",degree:"",field:"",start:"",end:""}]});
  const rm  = i => setForm({...form, education:form.education.filter((_,j)=>j!==i)});
  const dup = i => { const a=[...form.education]; a.splice(i+1,0,{...a[i]}); setForm({...form,education:a}); };
  const err = (v) => showErrors && !v?.trim();
  return (
    <Stack>
      {form.education.map((e,i) => (
        <Block key={i}>
          <BlockHeader label={`Formation ${i+1}`}
            onRemove={form.education.length>1 ? ()=>rm(i) : null}
            onDuplicate={()=>dup(i)}/>
          <Stack gap={14}>
            <div><Label t="Établissement" required/><input className={`field${err(e.school)?" err":""}`} placeholder="Université Ouaga II / ISCG / 2iE..." value={e.school} onChange={x=>upd(i,"school",x.target.value)}/></div>
            <Grid2>
              <div><Label t="Diplôme" required/><input className={`field${err(e.degree)?" err":""}`} placeholder="Licence, Master, BTS..." value={e.degree} onChange={x=>upd(i,"degree",x.target.value)}/></div>
              <div><Label t="Domaine" required/><input className={`field${err(e.field)?" err":""}`} placeholder="Gestion / Informatique / Droit" value={e.field} onChange={x=>upd(i,"field",x.target.value)}/></div>
            </Grid2>
            <Grid2>
              <div><Label t="Début"/><input className="field" placeholder="2018" value={e.start} onChange={x=>upd(i,"start",x.target.value)}/></div>
              <div><Label t="Fin"/><input className="field" placeholder="2020" value={e.end} onChange={x=>upd(i,"end",x.target.value)}/></div>
            </Grid2>
          </Stack>
        </Block>
      ))}
      <button className="btn-add" onClick={add}>+ Ajouter une formation</button>
    </Stack>
  );
}

/* ── Suggestions de compétences ── */
const SKILL_BANK = {
  comptable:   ["Sage Comptabilité","OHADA","Excel avancé","Gestion budgétaire","Fiscalité","SAP","Trésorerie","Audit interne","États financiers","Contrôle de gestion"],
  informatique:["JavaScript","Python","React","Node.js","SQL","Git","API REST","Docker","Linux","TypeScript"],
  rh:          ["Recrutement","Paie","GPEC","Formation","Droit du travail","ATS","Entretiens","Onboarding","Excel RH","Gestion des talents"],
  projet:      ["Gestion de projet","Scrum","Agile","MS Project","Budget","Reporting","Coordination","PMI","Risques","Planification"],
  commerce:    ["Négociation","Prospection","CRM","Vente B2B","Fidélisation","Excel","PowerPoint","SAP","Force de vente","Objectifs"],
  ingenieur:   ["AutoCAD","BIM","Béton armé","Topographie","Hydraulique","SIG","MATLAB","Gestion chantier","Normes ISO","Dessin technique"],
  sante:       ["Soins infirmiers","Pharmacologie","Urgences","Dossier patient","Hygiène","Dialyse","Bloc opératoire","ECG","Pédiatrie","Maternité"],
  juriste:     ["Droit OHADA","Contrats","Contentieux","Rédaction juridique","Droit social","Arbitrage","Plaidoirie","Veille juridique","Droit des affaires","UEMOA"],
  education:   ["Pédagogie","Élaboration de cours","Évaluation","Tutorat","E-learning","Gestion de classe","Programmes scolaires","Accompagnement","Présentation","Recherche"],
  default:     ["Microsoft Office","Communication","Travail en équipe","Organisation","Ponctualité","Adaptabilité","Leadership","Autonomie","Rigueur","Esprit d'analyse"],
};

function getSkillCategory(title) {
  if (!title) return "default";
  const t = title.toLowerCase();
  if (t.includes("compt") || t.includes("financ") || t.includes("audit") || t.includes("fisc")) return "comptable";
  if (t.includes("info") || t.includes("develop") || t.includes("logiciel") || t.includes("tech") || t.includes("data")) return "informatique";
  if (t.includes("rh") || t.includes("ressource") || t.includes("human") || t.includes("recru")) return "rh";
  if (t.includes("projet") || t.includes("manager") || t.includes("chef") || t.includes("coordinat")) return "projet";
  if (t.includes("commerc") || t.includes("vente") || t.includes("market") || t.includes("commercial")) return "commerce";
  if (t.includes("ingéni") || t.includes("ingeni") || t.includes("civil") || t.includes("btp") || t.includes("génie")) return "ingenieur";
  if (t.includes("infirm") || t.includes("médec") || t.includes("santé") || t.includes("sage-femme") || t.includes("pharma")) return "sante";
  if (t.includes("jurist") || t.includes("droit") || t.includes("avocat") || t.includes("notaire")) return "juriste";
  if (t.includes("enseign") || t.includes("profess") || t.includes("éducat") || t.includes("formateur")) return "education";
  return "default";
}

function SkillSuggestions({ title, current, onAdd }) {
  const cat = getSkillCategory(title);
  const suggestions = [
    ...(cat !== "default" ? SKILL_BANK[cat] : []),
    ...SKILL_BANK.default,
  ].filter(s => !(current||"").toLowerCase().includes(s.toLowerCase())).slice(0, 10);

  if (!suggestions.length) return null;
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ fontSize:11, color:"var(--ink4)", marginBottom:7, fontWeight:500 }}>
        Suggestions — cliquez pour ajouter :
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {suggestions.map(s => (
          <button key={s} className="btn-text" onClick={() => onAdd(s)}
            style={{ fontSize:11.5, padding:"4px 10px",
              background:"var(--cream2)", border:"1px solid var(--border)",
              borderRadius:20, color:"var(--ink3)", cursor:"pointer",
              transition:"all 0.15s", fontFamily:"inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(184,92,56,0.08)"; e.currentTarget.style.borderColor="var(--terra)"; e.currentTarget.style.color="var(--terra)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="var(--cream2)"; e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--ink3)"; }}>
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepExtras({ form, setForm }) {
  const f = k => e => setForm({ ...form, [k]: e.target.value });
  const [showMore, setShowMore] = useState(false);
  const updH = (i,v) => { const a=[...form.hobbies]; a[i]={label:v}; setForm({...form,hobbies:a}); };
  const addH = () => setForm({...form, hobbies:[...form.hobbies,{label:""}]});
  const rmH  = i => setForm({...form, hobbies:form.hobbies.filter((_,j)=>j!==i)});
  // Champs avancés — locaux uniquement, n'affectent PAS le CV final
  const [advPub, setAdvPub] = useState("");
  const [advNotes, setAdvNotes] = useState("");

  const today = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});

  return (
    <Stack>
      <Block>
        <BlockHeader label="Compétences & Langues"/>
        <Stack gap={14}>
          <div>
            <Label t="Compétences" tip={TIPS.skills}/>
            <textarea className="field" rows={3} style={{ resize:"vertical", lineHeight:1.7 }}
              placeholder="Sage Comptabilité, Excel, OHADA, Gestion de projet, Pack Office..."
              value={form.skills} onChange={f("skills")}/>
            {/* Suggestions cliquables selon le titre */}
            <SkillSuggestions title={form.title} current={form.skills}
              onAdd={skill => {
                const cur = form.skills ? form.skills.trim() : "";
                const already = cur.toLowerCase().includes(skill.toLowerCase());
                if (!already) setForm({...form, skills: cur ? cur + ", " + skill : skill});
              }}/>
          </div>
          <div><Label t="Langues"/><input className="field" placeholder="Français (courant), Mooré (natif), Dioula (intermédiaire)" value={form.languages} onChange={f("languages")}/></div>
        </Stack>
      </Block>

      <Block>
        <BlockHeader label="Certifications"/>
        <textarea className="field" rows={2} style={{ resize:"vertical" }}
          placeholder="PMP, CPA, Google Analytics, Microsoft Azure, CISA..."
          value={form.certifications||""} onChange={f("certifications")}/>
      </Block>

      <Block>
        <BlockHeader label="Centres d'intérêt"/>
        <Stack gap={8}>
          {form.hobbies.map((h,i) => (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input className="field" style={{ flex:1 }}
                placeholder="Ex : Football, Lecture, Bénévolat, Musique traditionnelle..."
                value={h.label} onChange={e=>updH(i,e.target.value)}/>
              {form.hobbies.length>1 && <button className="btn-text" onClick={()=>rmH(i)}>Retirer</button>}
            </div>
          ))}
          <button className="btn-add" onClick={addH}>+ Ajouter un centre d'intérêt</button>
        </Stack>
      </Block>

      <Block>
        <BlockHeader label="Date & Signature numérique"/>
        <Grid2>
          <div><Label t="Ville"/><input className="field" placeholder="Ouagadougou" value={form.signatureCity} onChange={f("signatureCity")}/></div>
          <div>
            <Label t="Date"/>
            <div style={{ display:"flex", gap:8 }}>
              <input className="field" style={{ flex:1 }} placeholder="06 mars 2026" value={form.signatureDate} onChange={f("signatureDate")}/>
              <button className="btn-line" style={{ padding:"10px 12px", fontSize:12, flexShrink:0 }}
                onClick={()=>setForm({...form,signatureDate:today})}>
                Aujourd'hui
              </button>
            </div>
          </div>
        </Grid2>
        <div style={{ marginTop:14 }}>
          <Label t="Signature (optionnel)"/>
          <SignatureCanvas value={form.signature} onChange={sig=>setForm({...form,signature:sig})}/>
        </div>
      </Block>

      <Block>
        <BlockHeader label="Options"/>
        <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:13 }}>
          <input type="checkbox" checked={form.confidential||false}
            onChange={e=>setForm({...form,confidential:e.target.checked})}
            style={{ accentColor:"var(--terra)", width:15, height:15 }}/>
          Ajouter filigrane "CONFIDENTIEL" (banque, administration)
        </label>
      </Block>

      {/* ── Champs avancés — notes personnelles, n'apparaissent PAS dans le CV ── */}
      <button onClick={() => setShowMore(m=>!m)}
        style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none",
          cursor:"pointer", padding:"10px 0", fontSize:12.5, color:"var(--ink4)",
          fontFamily:"inherit", width:"100%" }}>
        <span style={{ fontSize:14 }}>{showMore ? "▲" : "▼"}</span>
        {showMore ? "Masquer les champs avancés" : "Afficher les champs avancés"}
        <span style={{ fontSize:11, background:"var(--cream2)", border:"1px solid var(--border)",
          borderRadius:4, padding:"1px 7px", color:"var(--ink4)", marginLeft:2 }}>
          non affichés dans le CV
        </span>
      </button>

      {showMore && (
        <div style={{ borderTop:"2px dashed var(--border)", paddingTop:16,
          animation:"fadeUp 0.25s ease both" }}>
          <div style={{ fontSize:11.5, color:"var(--ink4)", marginBottom:14,
            display:"flex", alignItems:"center", gap:6 }}>
            <span>ℹ️</span>
            Ces champs sont pour vos notes personnelles uniquement — ils n'apparaissent pas dans le CV généré.
          </div>
          <Stack gap={14}>
            <Block>
              <BlockHeader label="Publications & Projets (notes perso)"/>
              <textarea className="field" rows={3} style={{ resize:"vertical", lineHeight:1.7 }}
                placeholder="Titre du projet / article, 2024 — Description courte..."
                value={advPub} onChange={e=>setAdvPub(e.target.value)}/>
            </Block>
            <Block>
              <BlockHeader label="Notes personnelles"/>
              <textarea className="field" rows={2} style={{ resize:"vertical" }}
                placeholder="Rappels, objectifs, informations à ne pas oublier..."
                value={advNotes} onChange={e=>setAdvNotes(e.target.value)}/>
            </Block>
          </Stack>
        </div>
      )}
    </Stack>
  );
}

function StepReferences({ form, setForm, onSkip }) {
  const upd = (i,k,v) => { const a=[...form.references]; a[i]={...a[i],[k]:v}; setForm({...form,references:a}); };
  const add = () => setForm({...form, references:[...form.references,{name:"",role:"",company:"",email:"",phone:""}]});
  const rm  = i => setForm({...form, references:form.references.filter((_,j)=>j!==i)});
  return (
    <Stack>
      <div className="skip-banner">
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--terra)" }}>Pas de références pour l'instant ?</div>
          <div style={{ fontSize:12, color:"var(--ink3)", marginTop:2 }}>Vous pouvez passer cette étape et cocher "Sur demande".</div>
        </div>
        <button className="btn-line" style={{ fontSize:12, padding:"8px 16px", flexShrink:0 }}
          onClick={() => { setForm({...form, references:[], refsOnRequest:true}); onSkip(); }}>
          Passer →
        </button>
      </div>
      {form.references.map((r,i) => (
        <Block key={i}>
          <BlockHeader label={`Référence ${i+1}`} onRemove={form.references.length>1 ? ()=>rm(i) : null}/>
          <Stack gap={14}>
            <div><Label t="Nom complet"/><input className="field" placeholder="Amadou OUEDRAOGO" value={r.name} onChange={x=>upd(i,"name",x.target.value)}/></div>
            <Grid2>
              <div><Label t="Poste"/><input className="field" placeholder="Directeur Financier" value={r.role} onChange={x=>upd(i,"role",x.target.value)}/></div>
              <div><Label t="Entreprise"/><input className="field" placeholder="BSIC Burkina" value={r.company} onChange={x=>upd(i,"company",x.target.value)}/></div>
            </Grid2>
            <Grid2>
              <div><Label t="Email"/><input className="field" placeholder="a.ouedraogo@bsic.bf" value={r.email} onChange={x=>upd(i,"email",x.target.value)}/></div>
              <div><Label t="Téléphone"/><input className="field" placeholder="+226 25 00 00 00" value={r.phone} onChange={x=>upd(i,"phone",x.target.value)}/></div>
            </Grid2>
          </Stack>
        </Block>
      ))}
      <button className="btn-add" onClick={add}>+ Ajouter une référence</button>
      <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer",
        padding:"14px 16px", border:"1.5px solid var(--border)", borderRadius:8, background:"#fff" }}>
        <input type="checkbox" checked={form.refsOnRequest||false}
          onChange={e=>setForm({...form,refsOnRequest:e.target.checked})}
          style={{ accentColor:"var(--terra)", width:16, height:16, marginTop:2, flexShrink:0 }}/>
        <div>
          <div style={{ fontSize:13, color:"var(--ink)", fontWeight:600 }}>Références disponibles sur demande</div>
          <div style={{ fontSize:12, color:"var(--ink4)", marginTop:2, lineHeight:1.5 }}>Ajoute une mention discrète sans afficher les coordonnées</div>
        </div>
      </label>
    </Stack>
  );
}

function StepLetter({ form, setForm, onSkip }) {
  const f = k => e => setForm({ ...form, [k]: e.target.value });
  const today = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
  const wantLetter = form.wantLetter !== false; // true par défaut

  const toggleLetter = (val) => {
    if (!val) {
      setForm({ ...form, wantLetter: false, letter: "", letterRecipient: "", letterSubject: "" });
    } else {
      setForm({ ...form, wantLetter: true });
    }
  };

  const generateLetter = () => {
    const name = form.nameOrder === "lastFirst" ? `${form.lastName} ${form.firstName}`.trim() : `${form.firstName} ${form.lastName}`.trim();
    const title = form.title || "professionnel(le)";
    const subject = form.letterSubject || "le poste proposé";
    const exp = form.experiences?.[0];
    const hasExp = exp && exp.company && exp.role;
    const letter = `Madame, Monsieur,

C'est avec un grand intérêt que je vous adresse ma candidature pour ${subject}.

${hasExp
  ? `Fort(e) de mon expérience en tant que ${exp.role} au sein de ${exp.company}, j'ai développé des compétences solides dans mon domaine.`
  : `En tant que ${title}, je suis convaincu(e) de pouvoir apporter une contribution significative à votre équipe.`
}

${form.skills ? `Mes compétences en ${form.skills.split(",").slice(0,3).join(", ")} me permettent d'aborder avec confiance les missions qui me seraient confiées.` : ""}

Motivé(e) et rigoureux(se), je suis disponible pour un entretien à votre convenance afin de vous exposer mes motivations de vive voix.

Dans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${name}
${form.phone || ""}
${form.email || ""}`;
    setForm({ ...form, wantLetter: true, letter });
  };

  return (
    <Stack>
      {/* Toggle principal */}
      <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:10, padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--ink)", marginBottom:3 }}>
              Voulez-vous une lettre de motivation ?
            </div>
            <div style={{ fontSize:12, color:"var(--ink4)" }}>
              Optionnel — vous pouvez passer cette étape
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => toggleLetter(false)}
              style={{ padding:"8px 18px", borderRadius:6, border:"1.5px solid",
                borderColor: !wantLetter ? "var(--terra)" : "var(--border)",
                background: !wantLetter ? "rgba(184,92,56,0.08)" : "#fff",
                fontSize:13, cursor:"pointer", fontWeight: !wantLetter ? 700 : 400,
                color: !wantLetter ? "var(--terra)" : "var(--ink3)" }}>
              Non, passer
            </button>
            <button onClick={() => toggleLetter(true)}
              style={{ padding:"8px 18px", borderRadius:6, border:"1.5px solid",
                borderColor: wantLetter ? "var(--terra)" : "var(--border)",
                background: wantLetter ? "rgba(184,92,56,0.08)" : "#fff",
                fontSize:13, cursor:"pointer", fontWeight: wantLetter ? 700 : 400,
                color: wantLetter ? "var(--terra)" : "var(--ink3)" }}>
              Oui, rédiger
            </button>
          </div>
        </div>
      </div>

      {/* Contenu lettre — affiché seulement si wantLetter */}
      {wantLetter && (
        <>
          <Block>
            <BlockHeader label="Informations de l'offre"/>
            <Stack gap={14}>
              <div><Label t="Destinataire (optionnel)"/><input className="field" placeholder="M. le Directeur RH / Cabinet SOFITEX..." value={form.letterRecipient||""} onChange={f("letterRecipient")}/></div>
              <div><Label t="Objet / Poste visé"/><input className="field" placeholder="Candidature au poste de Comptable Senior" value={form.letterSubject||""} onChange={f("letterSubject")}/></div>

            </Stack>
          </Block>

          <Block>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10.5, fontWeight:500,
                color:"var(--ink3)", textTransform:"uppercase", letterSpacing:"1.5px" }}>Corps de la lettre</span>
              <button className="btn-line" style={{ fontSize:12, padding:"7px 14px" }} onClick={generateLetter}>
                ✦ Générer automatiquement
              </button>
            </div>
            <textarea className="field" rows={12} style={{ resize:"vertical", lineHeight:1.8, fontFamily:"'Georgia',serif" }}
              placeholder={"Madame, Monsieur,\n\nC'est avec un grand intérêt que je vous adresse ma candidature...\n\n..."}
              value={form.letter||""} onChange={f("letter")}/>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
              <span style={{ fontSize:11, color:"var(--ink4)" }}>
                {(form.letter||"").trim().split(/\s+/).filter(Boolean).length} mots
              </span>
              {form.letter && (
                <button className="btn-text" onClick={()=>setForm({...form,letter:""})}>Effacer</button>
              )}
            </div>
          </Block>

          {form.letter && (
            <Block>
              <BlockHeader label="Aperçu"/>
              <div className="letter-preview" style={{ fontSize:11, whiteSpace:"pre-wrap", lineHeight:1.85 }}>
                <div style={{ textAlign:"right", marginBottom:24, fontSize:10.5, color:"#666" }}>
                  {form.signatureCity && `${form.signatureCity}, `}{form.signatureDate || today}
                </div>
                {form.letterRecipient && (
                  <div style={{ marginBottom:16, fontSize:10.5, color:"#555" }}>{form.letterRecipient}</div>
                )}
                {form.letterSubject && (
                  <div style={{ fontWeight:700, marginBottom:20, fontSize:11 }}>Objet : {form.letterSubject}</div>
                )}
                {form.letter}
              </div>
            </Block>
          )}
        </>
      )}

      {!wantLetter && (
        <div style={{ textAlign:"center", padding:"24px 0", color:"var(--ink4)", fontSize:13 }}>
          ✓ Étape passée — cliquez sur <strong>Continuer</strong> pour choisir votre modèle.
        </div>
      )}
    </Stack>
  );
}


function StepTemplate({ form, setForm }) {
  const isATS = form.template?.startsWith("ats-");
  const [tab, setTab] = useState(isATS ? "ats" : "design");
  const [showQuiz, setShowQuiz] = useState(false);

  const handleQuizResult = (rec) => {
    setForm({...form, template:rec});
    setShowQuiz(false);
    setTab(rec.startsWith("ats-") ? "ats" : "design");
  };


  const TabBtn = ({ id, label, sub }) => (
    <button onClick={() => setTab(id)}
      style={{ flex:1, padding:"12px 16px", border:"none", cursor:"pointer",
        background: tab===id ? "#fff" : "transparent",
        borderBottom: tab===id ? "2px solid var(--terra)" : "2px solid transparent",
        textAlign:"left", transition:"all 0.18s" }}>
      <div style={{ fontSize:13, fontWeight:600, color: tab===id ? "var(--terra)" : "var(--ink3)" }}>{label}</div>
      <div style={{ fontSize:10.5, color:"var(--ink4)", marginTop:2 }}>{sub}</div>
    </button>
  );

  const DesignCard = ({ t }) => {
    const active = form.template === t.id;
    return (
      <button className="tcard" onClick={() => setForm({...form, template:t.id})}
        style={{ background: active ? "rgba(184,92,56,0.06)" : "#fff",
          border:`1.5px solid ${active ? "var(--terra)" : "var(--border)"}`,
          borderRadius:8, padding:"12px 14px", cursor:"pointer", textAlign:"left", position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:26, height:34, borderRadius:4, background:t.bg,
            border:`1.5px solid ${t.accent}60`, flexShrink:0, padding:"5px 4px" }}>
            <div style={{ width:"70%", height:1.5, background:t.accent, marginBottom:3 }}/>
            <div style={{ width:"100%", height:1, background:t.accent+"60", marginBottom:2 }}/>
            <div style={{ width:"80%", height:1, background:t.accent+"30" }}/>
          </div>
          <div>
            <div style={{ fontSize:12.5, fontWeight:600, color: active ? "var(--terra)" : "var(--ink)" }}>{t.name}</div>
            <div style={{ fontSize:10.5, color:"var(--ink4)", marginTop:1 }}>{t.tag}</div>
          </div>
        </div>
        {active && <div style={{ position:"absolute", top:10, right:10, width:18, height:18,
          borderRadius:"50%", background:"var(--terra)", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#fff" }}>✓</div>}
      </button>
    );
  };

  const ATSCard = ({ t }) => {
    const active = form.template === t.id;
    return (
      <button className="tcard" onClick={() => setForm({...form, template:t.id})}
        style={{ background: active ? "rgba(184,92,56,0.06)" : "#fff",
          border:`1.5px solid ${active ? "var(--terra)" : "var(--border)"}`,
          borderRadius:8, padding:"12px 14px", cursor:"pointer", textAlign:"left", position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:26, height:34, borderRadius:4, background:"#fff",
            border:"1.5px solid #ccc", flexShrink:0, padding:"5px 4px" }}>
            <div style={{ width:"60%", height:2, background:"#333", marginBottom:3 }}/>
            <div style={{ width:"100%", height:1, background:"#bbb", marginBottom:2 }}/>
            <div style={{ width:"90%", height:1, background:"#bbb", marginBottom:2 }}/>
            <div style={{ width:"80%", height:1, background:"#ddd" }}/>
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ fontSize:12.5, fontWeight:600, color: active ? "var(--terra)" : "var(--ink)" }}>{t.name}</div>
              <span style={{ fontSize:9, fontWeight:700, background:"#e8f4e8", color:"#2a7a2a",
                padding:"1px 6px", borderRadius:3, letterSpacing:"0.5px" }}>ATS · compatible logiciels RH</span>
            </div>
            <div style={{ fontSize:10.5, color:"var(--ink4)", marginTop:1 }}>{t.tag}</div>
          </div>
        </div>
        {active && <div style={{ position:"absolute", top:10, right:10, width:18, height:18,
          borderRadius:"50%", background:"var(--terra)", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#fff" }}>✓</div>}
      </button>
    );
  };

  return (
    <div>
      {/* Quiz suggestion */}
      {!showQuiz ? (
        <div style={{ background:"var(--cream2)", border:"1px solid var(--border)", borderRadius:8,
          padding:"12px 16px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12.5, color:"var(--ink3)" }}>
            🎯 Vous ne savez pas quel modèle choisir ?
          </div>
          <button className="btn-line" style={{ padding:"7px 14px", fontSize:12 }}
            onClick={() => setShowQuiz(true)}>
            Trouver mon modèle →
          </button>
        </div>
      ) : (
        <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:8,
          padding:16, marginBottom:14 }}>
          <TemplateQuiz onResult={handleQuizResult}/>
          <button className="btn-text" style={{ marginTop:10 }} onClick={() => setShowQuiz(false)}>Annuler</button>
        </div>
      )}

      {/* Couleur accent pour Design */}
      {!isATS && (
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14,
          padding:"10px 14px", background:"#fff", border:"1px solid var(--border)", borderRadius:8 }}>
          <span style={{ fontSize:12, color:"var(--ink3)" }}>Couleur personnalisée :</span>
          <input type="color" value={form.accentColor||"#c8a96e"}
            onChange={e=>setForm({...form,accentColor:e.target.value})}
            style={{ width:32, height:28, border:"none", borderRadius:4, cursor:"pointer", padding:0 }}/>
          {form.accentColor && (
            <button className="btn-text" onClick={()=>setForm({...form,accentColor:null})}>Réinitialiser</button>
          )}
        </div>
      )}



      {/* Tabs — switch visible avec animation */}
      <div style={{ marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ fontSize:11.5, color:"var(--terra)", fontWeight:700,
          background:"rgba(184,92,56,0.1)", border:"1px solid rgba(184,92,56,0.3)",
          borderRadius:6, padding:"4px 10px", animation:"pulse 2s ease infinite" }}>
          ↕ Cliquez sur un onglet pour changer de catégorie
        </div>
      </div>
      <div style={{ display:"flex", background:"var(--cream2)", borderRadius:"8px 8px 0 0",
        border:"1.5px solid var(--border)", borderBottom:"none", position:"relative" }}>
        <TabBtn id="design" label="✦ Design (10)" sub="Couleurs · Mise en page riche"/>
        <div style={{ width:1, background:"var(--border)", margin:"8px 0" }}/>
        <TabBtn id="ats"    label="✓ ATS (10)"    sub="Recruteurs · Logiciels RH"/>
        {/* Indicateur de switch */}
        <div style={{ position:"absolute", right:-1, top:-28, fontSize:10,
          color:"var(--ink4)", fontStyle:"italic" }}>
          ← 10 modèles de chaque côté
        </div>
      </div>
      <div style={{ border:"1.5px solid var(--border)", borderTop:"none",
        borderRadius:"0 0 8px 8px", background:"#fff", padding:16 }}>
        {tab === "design" && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:14, flexWrap:"wrap", gap:8 }}>
              <p style={{ fontSize:12, color:"var(--ink4)", margin:0, lineHeight:1.6 }}>
                Modèles visuellement riches — idéaux pour candidatures directes ou secteurs créatifs.
              </p>
              <button onClick={()=>setTab("ats")}
                style={{ fontSize:11.5, color:"var(--terra)", fontWeight:700, background:"rgba(184,92,56,0.08)",
                  border:"1.5px solid rgba(184,92,56,0.3)", borderRadius:6, padding:"5px 12px", cursor:"pointer",
                  whiteSpace:"nowrap" }}>
                Voir les ATS →
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {TEMPLATES.map(t => <DesignCard key={t.id} t={t}/>)}
            </div>
          </>
        )}
        {tab === "ats" && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:14, gap:8, flexWrap:"wrap" }}>
              <div style={{ background:"#f0f7f0", border:"1px solid #c3e0c3", borderRadius:6,
                padding:"8px 12px", fontSize:12, color:"#2a6a2a", lineHeight:1.6, flex:1 }}>
                <strong>✓ ATS</strong> — Compatible avec les logiciels de recrutement. Idéal grandes entreprises & ONG.
              </div>
              <button onClick={()=>setTab("design")}
                style={{ fontSize:11.5, color:"var(--terra)", fontWeight:700, background:"rgba(184,92,56,0.08)",
                  border:"1.5px solid rgba(184,92,56,0.3)", borderRadius:6, padding:"5px 12px", cursor:"pointer",
                  whiteSpace:"nowrap" }}>
                ← Voir Design
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {ATS_TEMPLATES.map(t => <ATSCard key={t.id} t={t}/>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── LOAD SCRIPT ─── */
function loadScript(src) {
  return new Promise((res,rej)=>{
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });
}

/* ─── STEP RESULT ─── */
function StepResult({ form, onRestart, onAddLetter }) {
  const cvRef = useRef(null);
  const letterRef = useRef(null);

  const [zoom, setZoom] = useState(() => window.innerWidth < 480 ? 0.55 : window.innerWidth < 768 ? 0.7 : 0.9);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [building, setBuilding] = useState(true);
  const [showRecruiter, setShowRecruiter] = useState(false);
  const isATS = form.template?.startsWith("ats-");

  useEffect(() => {
    const t = setTimeout(() => {
      setBuilding(false);
      setTimeout(() => { setShowCongrats(true); setTimeout(() => setShowCongrats(false), 4000); }, 300);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  const photoRef2 = useRef();
  const [localForm, setLocalForm] = useState(form);
  const handlePhotoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setLocalForm(f => ({...f, photo: ev.target.result}));
    };
    reader.readAsDataURL(file);
  };
  const cvFinal = { ...localForm, name: localForm.nameOrder === "lastFirst" ? `${localForm.lastName} ${localForm.firstName}`.trim() : `${localForm.firstName} ${localForm.lastName}`.trim() };

  const cv = {
    ...cvFinal,
    name: cvFinal.name,
  };

  const Renderer = RENDERERS[form.template] || ATS_RENDERERS[form.template] || CVExecutive;

  const embedAndDownload = async (pdfDoc, fileName) => {
    const data = JSON.stringify({ ...cvFinal, _cvtools: true, _version: "v9" });
    const encoded = btoa(unescape(encodeURIComponent(data)));
    pdfDoc.setProperties({ subject: encoded });
    pdfDoc.save(fileName);
  };

  // Génère un PDF multi-pages sans couper les blocs de texte
  const renderElementToPDF = async (el, pdf) => {
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 0;
    const usableH = pageH - margin * 2;

    // Prend un snapshot haute résolution de l'élément
    const fullCanvas = await window.html2canvas(el, {
      scale: 2.5, useCORS: true, allowTaint: true,
      backgroundColor: "#ffffff", logging: false,
      windowWidth: 595, windowHeight: el.scrollHeight
    });

    const pxPerMm = fullCanvas.width / pageW;
    const pageHeightPx = usableH * pxPerMm;

    // Cherche les points de coupure sûrs : entre les blocs enfants de haut niveau
    const children = Array.from(el.querySelectorAll(
      "div[style*='margin-bottom'], div[style*='marginBottom'], .exp-block, .edu-block, [class*='sec']"
    ));

    // Calcule les positions Y de chaque enfant en px canvas
    const elRect = el.getBoundingClientRect();
    const breakPoints = new Set([0]);
    children.forEach(child => {
      const r = child.getBoundingClientRect();
      const topPx = (r.top - elRect.top) * (fullCanvas.width / elRect.width);
      const bottomPx = (r.bottom - elRect.top) * (fullCanvas.width / elRect.width);
      if (topPx > 0) breakPoints.add(Math.floor(topPx));
      breakPoints.add(Math.floor(bottomPx));
    });
    breakPoints.add(fullCanvas.height);
    const pts = Array.from(breakPoints).sort((a,b)=>a-b);

    // Détermine les tranches de pages en respectant les blocs
    const slices = [];
    let pageStart = 0;
    while (pageStart < fullCanvas.height) {
      const pageEnd = pageStart + pageHeightPx;
      if (pageEnd >= fullCanvas.height) {
        slices.push({ start: pageStart, end: fullCanvas.height });
        break;
      }
      // Cherche le meilleur point de coupure juste avant pageEnd
      let bestCut = pageEnd;
      for (let i = pts.length - 1; i >= 0; i--) {
        if (pts[i] <= pageEnd && pts[i] > pageStart + pageHeightPx * 0.4) {
          bestCut = pts[i];
          break;
        }
      }
      slices.push({ start: pageStart, end: bestCut });
      pageStart = bestCut;
    }

    // Génère chaque page
    slices.forEach((slice, idx) => {
      if (idx > 0) pdf.addPage();
      const sliceH = slice.end - slice.start;
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = fullCanvas.width;
      tmpCanvas.height = sliceH;
      const ctx = tmpCanvas.getContext("2d");
      ctx.drawImage(fullCanvas, 0, slice.start, fullCanvas.width, sliceH, 0, 0, fullCanvas.width, sliceH);
      const imgData = tmpCanvas.toDataURL("image/jpeg", 0.95);
      const sliceHmm = sliceH / pxPerMm;
      pdf.addImage(imgData, "JPEG", margin, margin, pageW - margin*2, sliceHmm);
    });
  };

  const [downloadDone, setDownloadDone] = useState(false);
  const downloadPDF = async () => {
    setExporting(true); setExportErr(null);
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
      const el = cvRef.current;
      if (!el) throw new Error("Élément introuvable");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      await renderElementToPDF(el, pdf);
      await embedAndDownload(pdf, `${fullName(form).replace(/ /g,"_")}.pdf`);
      saveCandidat(form, "cv");
    } catch(err) {
      console.error(err);
      setExportErr("Export PDF échoué. Utilisez le bouton Imprimer.");
    } finally {
      setExporting(false);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 4000);
    }
  };

  const downloadLetter = async () => {
    if (!form.wantLetter || !form.letter) return;
    setExporting(true); setExportErr(null);
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
      const el = letterRef.current;
      if (!el) throw new Error("Lettre introuvable");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      await renderElementToPDF(el, pdf);
      pdf.save(`Lettre_${fullName(form).replace(/ /g,"_")}.pdf`);
      saveCandidat(form, "letter");
    } catch(err) {
      console.error(err);
      setExportErr("Export lettre échoué.");
    } finally {
      setExporting(false);
    }
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`J'ai créé mon CV professionnel avec CVtools ! 🎯\nCréez le vôtre : https://cvtools-v6.vercel.app`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const recommendWhatsApp = () => {
    const msg = encodeURIComponent(`Salut ! Je te recommande CVtools pour créer ton CV professionnel en 5 minutes 💼\nhttps://cvtools-v6.vercel.app`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const importAndReload = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".pdf";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Try to read embedded data from PDF
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const bytes = new Uint8Array(ev.target.result);
          let str = "";
          for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] > 31 && bytes[i] < 127) str += String.fromCharCode(bytes[i]);
          }
          // Look for our base64 encoded data
          const match = str.match(/Subject\s*\(([A-Za-z0-9+/=]{50,})\)/);
          if (match) {
            const decoded = decodeURIComponent(escape(atob(match[1])));
            const data = JSON.parse(decoded);
            if (data._cvtools) {
              alert("✓ CV retrouvé ! Rechargement de vos données...");
              window.location.reload(); // In real app would call setForm
            }
          } else {
            alert("Ce PDF ne contient pas de données CVtools sauvegardées.");
          }
        } catch(err) {
          alert("Impossible de lire les données de ce fichier.");
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  if (building) {
    return <CVBuildAnimation onDone={() => setBuilding(false)}/>;
  }

  return (
    <div>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)}/>}
      {showCongrats && (
        <div style={{ position:"fixed", top:80, left:"50%", transform:"translateX(-50%)",
          zIndex:9998, animation:"popIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
          pointerEvents:"none" }}>
          <div style={{ background:"rgba(28,24,18,0.92)", backdropFilter:"blur(12px)",
            border:"1.5px solid rgba(212,201,181,0.3)", borderRadius:16,
            padding:"16px 28px", textAlign:"center",
            boxShadow:"0 16px 48px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🎉</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17,
              fontWeight:700, color:"#fff", fontStyle:"italic" }}>
              Félicitations{form.firstName ? ` ${form.firstName}` : ""} !
            </div>
            <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.65)", marginTop:4 }}>
              Votre CV est prêt à impressionner ✦
            </div>
          </div>
        </div>
      )}
      {showRecruiter && <RecruiterSim onClose={() => setShowRecruiter(false)}/>}

      {/* Toolbar */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16, alignItems:"center" }}>
        <button className="btn-main" onClick={downloadPDF} disabled={exporting}
          style={{ fontSize:15, padding:"13px 28px", background: exporting ? undefined : "var(--terra)",
            boxShadow: exporting ? "none" : "0 4px 16px rgba(184,92,56,0.35)" }}>
          {exporting ? "⏳ Génération en cours..." : "⬇ Télécharger mon CV (PDF)"}
        </button>
        {downloadDone && (
          <span style={{ fontSize:12.5, color:"#2a7a2a", fontWeight:600,
            animation:"fadeUp 0.3s ease both", display:"flex", alignItems:"center", gap:5 }}>
            ✓ CV téléchargé avec succès !
          </span>
        )}
        <button className="btn-line" onClick={onAddLetter}
          style={{ fontSize:13, borderColor:"var(--terra)", color:"var(--terra)",
            fontWeight:700, display:"flex", alignItems:"center", gap:7 }}>
          ✉ + Lettre de motivation
        </button>


        <button className="btn-line" onClick={() => window.print()}>🖨 Imprimer</button>
        {isATS && (
          <span style={{ fontSize:10, fontWeight:700, background:"#e8f4e8", color:"#2a7a2a",
            padding:"4px 10px", borderRadius:4, letterSpacing:"0.5px" }}>✓ Compatible logiciels RH</span>
        )}
      </div>

      {/* Change photo from result */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16, alignItems:"center" }}>
        <button className="btn-line" style={{ fontSize:12 }}
          onClick={() => photoRef2.current?.click()}>
          📷 Changer la photo
        </button>
        <input ref={photoRef2} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoChange}/>
        {form.email && (
          <button className="btn-line" style={{ fontSize:11 }}
            onClick={()=>navigator.clipboard?.writeText(form.email)} title="Copier l'email">
            📋 {form.email}
          </button>
        )}
        <CVScore form={form}/>
      </div>

      {/* Share / Recommend */}
      <div className="share-row" style={{ marginBottom:20 }}>
        <button className="share-btn" onClick={shareWhatsApp}
          style={{ background:"#25D366", color:"#fff" }}>
          💬 Partager mon CV
        </button>
        <button className="share-btn" onClick={recommendWhatsApp}
          style={{ background:"var(--ink)", color:"#fff" }}>
          ✦ Recommander CVtools
        </button>
      </div>

      {exportErr && (
        <div style={{ background:"#fdf0ee", border:"1px solid rgba(192,57,43,0.2)", borderRadius:6,
          padding:"10px 14px", marginBottom:14, fontSize:13, color:"#c0392b" }}>
          ⚠ {exportErr}
        </div>
      )}

      {/* CV Preview */}
      <div style={{ marginBottom:8, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:11.5, color:"var(--ink3)" }}>Zoom :</span>
        {[0.45,0.6,0.75,0.9,1.0].map(z=>(
          <button key={z} onClick={()=>setZoom(z)}
            style={{ padding:"3px 9px", fontSize:11, borderRadius:6, cursor:"pointer",
              border: zoom===z ? "2px solid var(--terra)" : "1.5px solid var(--border)",
              background: zoom===z ? "rgba(184,92,56,0.1)" : "transparent",
              color: zoom===z ? "var(--terra)" : "var(--ink3)", fontWeight: zoom===z ? 700 : 400 }}>
            {Math.round(z*100)}%
          </button>
        ))}

      </div>



      <div className="cv-viewer" style={{ background:"#e8e0d0", padding:12, borderRadius:8, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        <div style={{ width:595*zoom, margin:"0 auto", transition:"width 0.2s", minWidth:"min-content" }}>
          <div ref={cvRef} style={{ width:595, transformOrigin:"top left",
            transform:`scale(${zoom})`, boxShadow:"0 4px 32px rgba(0,0,0,0.18)", position:"relative" }}>
            <Renderer cv={cv}/>
          </div>
        </div>
      </div>



      <div style={{ marginTop:16, textAlign:"center" }}>
        <button className="btn-line" onClick={onRestart} style={{ fontSize:12, color:"var(--ink4)" }}>
          + Créer un nouveau CV
        </button>
      </div>
    </div>
  );
}


/* ─── SIGNATURE PAD ─── */
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);

  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, 400, 120);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    }
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 400 / rect.width;
    const scaleY = 120 / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };
  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1c1812";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };
  const stopDraw = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 400, 120);
    onChange("");
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <Label t="Signature manuscrite" tip="Dessinez votre signature avec la souris ou le doigt"/>
        {value && (
          <button className="btn-text" onClick={clear} style={{ fontSize:11.5, color:"var(--terra)" }}>
            ✕ Effacer
          </button>
        )}
      </div>
      <div style={{ border:"1.5px solid var(--border)", borderRadius:8, background:"#fafaf8",
        overflow:"hidden", cursor:"crosshair", touchAction:"none" }}>
        <canvas
          ref={canvasRef}
          width={400} height={120}
          style={{ display:"block", width:"100%", height:120 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div style={{ fontSize:10.5, color:"var(--ink4)", marginTop:5, fontStyle:"italic" }}>
        {value ? "✓ Signature enregistrée — elle apparaîtra en bas de votre lettre" : "Cliquez ou touchez pour signer"}
      </div>
    </div>
  );
}

/* ─── STEP EXPÉDITEUR (parcours lettre) ─── */
/* ─── RÉSULTAT COMBO CV + LETTRE ─── */
function StepResultCombo({ form, onRestart }) {
  const cvRef     = useRef(null);
  const letterRef = useRef(null);
  const [exporting, setExporting]   = useState(false);
  const [exportErr, setExportErr]   = useState(null);
  const [doneMsg,   setDoneMsg]     = useState("");
  const [showConfetti, setShowConfetti] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [building, setBuilding]     = useState(true);
  const [activeTab, setActiveTab]   = useState("cv"); // "cv" | "letter" | "both"

  useEffect(() => {
    const t = setTimeout(() => {
      setBuilding(false);
      setTimeout(() => { setShowCongrats(true); setTimeout(() => setShowCongrats(false), 4500); }, 300);
    }, 2400);
    return () => clearTimeout(t);
  }, []);

  const fullName = (f) => f.nameOrder === "lastFirst"
    ? `${f.lastName} ${f.firstName}`.trim()
    : `${f.firstName} ${f.lastName}`.trim();

  const cv = {
    ...form,
    name: fullName(form),
    template: form.template || "executive",
  };

  const Renderer = RENDERERS[form.template] || ATS_RENDERERS[form.template] || CVExecutive;

  // LetterRenderer attend { cv } avec cv.letterTemplate etc.
  const [letterCountry, setLetterCountry] = useState(form.letterCountry || "");
  const [letterDevise,  setLetterDevise]  = useState(form.letterDevise  || "");

  const letterCv = {
    ...form,
    name: fullName(form),
    letterTemplate: form.letterTemplate || "ltr-classique",
    // Signature du CV transmise automatiquement
    signature:    form.signature    || null,
    signatureCity: form.signatureCity || "",
    signatureDate: form.signatureDate || "",
    // Pays / devise modifiables ici
    letterCountry: letterCountry,
    letterDevise:  letterDevise,
  };

  const loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  const renderToPDF = async (el, pdf, pageNum) => {
    const canvas = await window.html2canvas(el, {
      scale: 2, useCORS: true, allowTaint: true,
      backgroundColor: "#fff", logging: false,
    });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    const W = 210, H = (canvas.height / canvas.width) * W;
    if (pageNum > 1) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, W, Math.min(H, 297));
  };

  const downloadBoth = async () => {
    setExporting(true); setExportErr(null); setDoneMsg("");
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      if (cvRef.current)     await renderToPDF(cvRef.current, pdf, 1);
      if (letterRef.current) await renderToPDF(letterRef.current, pdf, 2);
      pdf.save(`${fullName(form).replace(/ /g,"_")}_CV_et_Lettre.pdf`);
      saveCandidat(form, "cv+letter");
      setDoneMsg("✓ CV + Lettre téléchargés !");
      setTimeout(() => setDoneMsg(""), 4000);
    } catch(err) {
      console.error(err);
      setExportErr("Export échoué. Essayez Imprimer (Ctrl+P).");
    } finally { setExporting(false); }
  };

  const downloadCV = async () => {
    setExporting(true); setExportErr(null);
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      if (cvRef.current) await renderToPDF(cvRef.current, pdf, 1);
      pdf.save(`CV_${fullName(form).replace(/ /g,"_")}.pdf`);
    } catch(err) { setExportErr("Export CV échoué."); }
    finally { setExporting(false); }
  };

  const downloadLetter = async () => {
    setExporting(true); setExportErr(null);
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      if (letterRef.current) await renderToPDF(letterRef.current, pdf, 1);
      pdf.save(`Lettre_${fullName(form).replace(/ /g,"_")}.pdf`);
    } catch(err) { setExportErr("Export lettre échoué."); }
    finally { setExporting(false); }
  };

  if (building) return <CVBuildAnimation onDone={() => setBuilding(false)}/>;

  return (
    <div>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)}/>}
      {showCongrats && (
        <div style={{ position:"fixed", top:80, left:"50%", transform:"translateX(-50%)",
          zIndex:9998, animation:"popIn 0.4s cubic-bezier(0.16,1,0.3,1) both", pointerEvents:"none" }}>
          <div style={{ background:"rgba(28,24,18,0.92)", backdropFilter:"blur(12px)",
            border:"1.5px solid rgba(212,201,181,0.3)", borderRadius:16,
            padding:"16px 28px", textAlign:"center", boxShadow:"0 16px 48px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🎉</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17,
              fontWeight:700, color:"#fff", fontStyle:"italic" }}>
              Félicitations{form.firstName ? ` ${form.firstName}` : ""} !
            </div>
            <div style={{ fontSize:12.5, color:"rgba(255,255,255,0.65)", marginTop:4 }}>
              Votre CV et votre lettre sont prêts ✦
            </div>
          </div>
        </div>
      )}

      {/* ── Boutons d'export ── */}
      <div style={{ background:"var(--cream2)", border:"1.5px solid var(--border)",
        borderRadius:12, padding:"16px 18px", marginBottom:18 }}>
        <div style={{ fontSize:12, color:"var(--ink4)", marginBottom:12, fontWeight:600,
          textTransform:"uppercase", letterSpacing:"1px" }}>
          Télécharger vos documents
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
          <button className="btn-main" onClick={downloadBoth} disabled={exporting}
            style={{ fontSize:15, padding:"13px 28px",
              background: exporting ? undefined : "var(--terra)",
              boxShadow: exporting ? "none" : "0 4px 16px rgba(184,92,56,0.35)" }}>
            {exporting ? "⏳ Génération en cours..." : "⬇ Télécharger CV + Lettre (PDF)"}
          </button>
        </div>
        {doneMsg && (
          <div style={{ marginTop:10, fontSize:13, color:"#2a7a2a",
            fontWeight:600, animation:"fadeUp 0.3s ease both",
            display:"flex", alignItems:"center", gap:6 }}>
            {doneMsg}
          </div>
        )}
        {exportErr && (
          <div style={{ marginTop:10, fontSize:12.5, color:"#c0392b",
            background:"#fdf0ee", borderRadius:6, padding:"8px 12px" }}>
            ⚠ {exportErr}
          </div>
        )}
      </div>

      {/* ── Pays / Devise personnalisables ── */}
      <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:10,
        padding:"14px 16px", marginBottom:16, display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" }}>
        <div style={{ flex:"1 1 160px" }}>
          <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:5,
            textTransform:"uppercase", letterSpacing:"0.8px" }}>Pays (en-tête lettre)</div>
          <input className="field" style={{ margin:0 }}
            placeholder="BURKINA FASO"
            value={letterCountry}
            onChange={e => setLetterCountry(e.target.value)}/>
        </div>
        <div style={{ flex:"2 1 220px" }}>
          <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:5,
            textTransform:"uppercase", letterSpacing:"0.8px" }}>Devise nationale</div>
          <input className="field" style={{ margin:0 }}
            placeholder="La Patrie ou la Mort, nous vaincrons !"
            value={letterDevise}
            onChange={e => setLetterDevise(e.target.value)}/>
        </div>
        {form.signature && (
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12,
            color:"#2a7a2a", fontWeight:600, padding:"8px 12px",
            background:"rgba(42,122,42,0.07)", borderRadius:8, border:"1px solid rgba(42,122,42,0.2)" }}>
            ✓ Signature du CV utilisée
          </div>
        )}
      </div>

      {/* ── Tabs CV / Lettre ── */}
      <div style={{ display:"flex", gap:0, marginBottom:16,
        border:"1.5px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
        {[
          { key:"cv",     label:"📄 Mon CV" },
          { key:"letter", label:"✉ Ma Lettre" },
          { key:"both",   label:"📋 Les deux" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              flex:1, padding:"11px 8px", fontSize:13, fontWeight: activeTab===tab.key ? 700 : 400,
              border:"none", cursor:"pointer", fontFamily:"inherit",
              background: activeTab===tab.key ? "var(--terra)" : "#fff",
              color: activeTab===tab.key ? "#fff" : "var(--ink3)",
              transition:"all 0.2s",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Aperçu documents ── */}
      <div style={{ display: activeTab==="both" ? "grid" : "block",
        gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* CV */}
        {(activeTab==="cv" || activeTab==="both") && (
          <div>
            {activeTab==="both" && (
              <div style={{ fontSize:11, fontWeight:700, color:"var(--ink3)",
                textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>
                📄 CV
              </div>
            )}
            <div style={{ background:"#e8e0d0", padding:10, borderRadius:8,
              overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <div style={{ width: activeTab==="both" ? "100%" : 595*0.75,
                margin:"0 auto", minWidth:"min-content" }}>
                <div ref={cvRef} style={{
                  width:595,
                  transformOrigin:"top left",
                  transform: activeTab==="both" ? "scale(0.42)" : "scale(0.75)",
                  boxShadow:"0 4px 32px rgba(0,0,0,0.18)" }}>
                  <Renderer cv={cv}/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lettre */}
        {(activeTab==="letter" || activeTab==="both") && (
          <div>
            {activeTab==="both" && (
              <div style={{ fontSize:11, fontWeight:700, color:"var(--ink3)",
                textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>
                ✉ Lettre de motivation
              </div>
            )}
            <div style={{ background:"#e8e0d0", padding:10, borderRadius:8,
              overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <div style={{ width: activeTab==="both" ? "100%" : 595*0.75,
                margin:"0 auto", minWidth:"min-content" }}>
                <div ref={letterRef} style={{
                  width:595,
                  transformOrigin:"top left",
                  transform: activeTab==="both" ? "scale(0.42)" : "scale(0.75)",
                  boxShadow:"0 4px 32px rgba(0,0,0,0.18)" }}>
                  <LetterRenderer cv={letterCv}/>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Restart */}
      <div style={{ marginTop:24, textAlign:"center" }}>
        <button className="btn-line" onClick={onRestart} style={{ fontSize:13 }}>
          + Créer un nouveau CV
        </button>
      </div>
    </div>
  );
}

function StepExpediteur({ form, setForm }) {
  const f = k => e => setForm({ ...form, [k]: e.target.value });
  return (
    <Stack>
      <Block>
        <BlockHeader label="Vos informations" sub="Elles apparaîtront en haut à gauche de la lettre"/>
        <Stack gap={14}>
          <Grid2>
            <div>
              <Label t="Prénom *"/>
              <input className="field" placeholder="Lawali" value={form.firstName||""} onChange={f("firstName")}/>
            </div>
            <div>
              <Label t="Nom *"/>
              <input className="field" placeholder="TOE" value={form.lastName||""} onChange={f("lastName")}/>
            </div>
          </Grid2>
          <div>
            <Label t="Titre / Fonction" tip="Ex : Comptable, Ingénieur informatique..."/>
            <input className="field" placeholder="Comptable Senior" value={form.title||""} onChange={f("title")}/>
          </div>
          <Grid2>
            <div>
              <Label t="Téléphone *"/>
              <input className="field" placeholder="+226 70 00 00 00" value={form.phone||""} onChange={f("phone")}/>
            </div>
            <div>
              <Label t="Téléphone 2 (optionnel)"/>
              <input className="field" placeholder="+226 60 00 00 00" value={form.phone2||""} onChange={f("phone2")}/>
            </div>
          </Grid2>
          <div>
            <Label t="Email *"/>
            <input className="field" placeholder="votre@email.com" value={form.email||""} onChange={f("email")}/>
          </div>
          <div>
            <Label t="Adresse / Ville *"/>
            <input className="field" placeholder="Bobo-Dioulasso, Zone du bois" value={form.location||""} onChange={f("location")}/>
          </div>
          <Grid2>
            <div>
              <Label t="Ville (signature)" tip="Apparaît avant la date"/>
              <input className="field" placeholder="Bobo-Dioulasso" value={form.signatureCity||""} onChange={f("signatureCity")}/>
            </div>
            <div>
              <Label t="Date"/>
              <input className="field" placeholder={new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})} value={form.signatureDate||""} onChange={f("signatureDate")}/>
            </div>
          </Grid2>
        </Stack>
      </Block>

      <Block>
        <BlockHeader label="Pays et devise" sub="En-tête administratif africain"/>
        <Stack gap={12}>
          <Grid2>
            <div>
              <Label t="Pays" tip="Ex : BURKINA FASO, MALI..."/>
              <input className="field" placeholder="BURKINA FASO" value={form.letterCountry||""} onChange={f("letterCountry")}/>
            </div>
            <div>
              <Label t="Devise nationale"/>
              <input className="field" placeholder="La Patrie ou la Mort, nous vaincrons !" value={form.letterDevise||""} onChange={f("letterDevise")}/>
            </div>
          </Grid2>
          <div style={{ fontSize:11, color:"var(--ink4)", background:"var(--cream2)",
            borderRadius:6, padding:"8px 12px", lineHeight:1.6 }}>
            💡 Laissez vide pour utiliser les valeurs détectées automatiquement selon votre ville.
          </div>
        </Stack>
      </Block>

      <Block>
        <BlockHeader label="Signature" sub="Optionnel — apparaît en bas de la lettre"/>
        <SignaturePad value={form.signature||""} onChange={v => setForm({...form, signature:v})}/>
      </Block>
    </Stack>
  );
}

/* ─── STEP LETTER ONLY (parcours lettre — sans toggle Oui/Non) ─── */
function StepLetterOnly({ form, setForm }) {
  const f = k => e => setForm({ ...form, [k]: e.target.value });
  const today = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});

  // Auto-générer si vient du parcours CV (letter vide)
  useEffect(() => {
    if (!form.letter) generateLetter();
  }, []);

  const generateLetter = () => {
    const subject = form.letterSubject || "le poste proposé";
    const exps = (form.experiences||[]).filter(e => e.role && e.company);
    const lastExp = exps[0];

    // Paragraphe expérience si disponible
    const expPara = lastExp
      ? `Fort(e) de mon expérience en tant que ${lastExp.role} au sein de ${lastExp.company}${exps.length > 1 ? ` et de mes ${exps.length} expériences professionnelles` : ""}, je dispose des compétences et de la rigueur nécessaires pour contribuer efficacement à votre équipe.`
      : form.title
        ? `En tant que ${form.title}, je suis convaincu(e) de pouvoir apporter une contribution significative à votre structure.`
        : "Je suis convaincu(e) de pouvoir apporter une contribution significative à votre structure.";

    // Compétences si disponibles
    const skillsPara = form.skills
      ? `Mes compétences en ${form.skills.split(",").slice(0,3).join(", ")} me permettront de répondre pleinement aux exigences du poste.`
      : "";

    const expBlock = skillsPara ? expPara + "\n\n" + skillsPara : expPara;
    const letter = "Madame, Monsieur,\n\nC'est avec un grand intérêt que je vous adresse ma candidature pour " + subject + ".\n\n" + expBlock + "\n\nDisponible et motivé(e), je serais ravi(e) de vous rencontrer afin de vous exposer mes motivations de vive voix et de vous démontrer l'adéquation de mon profil avec vos attentes.\n\nDans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.";
    setForm({ ...form, wantLetter: true, letter });
  };

  return (
    <Stack>
      <Block>
        <BlockHeader label="Destinataire et objet"/>
        <Stack gap={14}>
          <div>
            <Label t="Destinataire" tip="Ex : M. le Directeur Général de SOFITEX"/>
            <input className="field" placeholder="M. le Directeur des Ressources Humaines" value={form.letterRecipient||""} onChange={f("letterRecipient")}/>
          </div>
          <div>
            <Label t="Objet / Poste visé *"/>
            <input className="field" placeholder="Candidature au poste de Comptable Senior" value={form.letterSubject||""} onChange={f("letterSubject")}/>
          </div>
        </Stack>
      </Block>

      <Block>
        <BlockHeader label="Corps de la lettre"/>
        <Stack gap={10}>
          <button className="btn-line" style={{ alignSelf:"flex-start", fontSize:12 }}
            onClick={generateLetter}>
            ✨ Générer un modèle
          </button>
          <textarea className="field" rows={14} placeholder="Madame, Monsieur,&#10;&#10;..." value={form.letter||""}
            onChange={f("letter")}
            style={{ resize:"vertical", fontFamily:"'Georgia',serif", fontSize:12, lineHeight:1.85 }}/>
          <div style={{ fontSize:11, color:"var(--ink4)" }}>
            {(form.letter||"").split(/\s+/).filter(Boolean).length} mots
          </div>
        </Stack>
      </Block>

    </Stack>
  );
}

/* ─── STEP LETTER TEMPLATE ─── */
function StepLetterTemplate({ form, setForm }) {
  const [tab, setTab] = useState(form.letterTemplate?.startsWith("ltr-ats") ? "ats" : "design");

  const getLtAccent = (tplId) => {
    const t = [...LETTER_TEMPLATES, ...LETTER_ATS_TEMPLATES].find(x => x.id === tplId);
    return t?.accent || "#1c1812";
  };

  const TabBtn = ({ id, label, sub }) => (
    <button onClick={() => setTab(id)}
      style={{ flex:1, padding:"12px 16px", border:"none", cursor:"pointer",
        background: tab===id ? "#fff" : "transparent",
        borderBottom: tab===id ? "2px solid var(--terra)" : "2px solid transparent",
        textAlign:"left", transition:"all 0.18s" }}>
      <div style={{ fontSize:13, fontWeight:600, color: tab===id ? "var(--terra)" : "var(--ink3)" }}>{label}</div>
      <div style={{ fontSize:10.5, color:"var(--ink4)", marginTop:2 }}>{sub}</div>
    </button>
  );

  const DesignCard = ({ t }) => {
    const active = form.letterTemplate === t.id;
    return (
      <button onClick={() => setForm({...form, letterTemplate:t.id})}
        style={{ background: active ? "rgba(184,92,56,0.06)" : "#fff",
          border:`1.5px solid ${active ? "var(--terra)" : "var(--border)"}`,
          borderRadius:8, padding:"12px 14px", cursor:"pointer", textAlign:"left",
          position:"relative", display:"flex", alignItems:"center", gap:12 }}>
        {/* Mini aperçu lettre */}
        <div style={{ width:26, height:34, borderRadius:3, background: t.id==="ltr-tech" ? "#f8fafc" : t.id==="ltr-minimaliste" ? "#f9fafb" : t.id==="ltr-academique" ? "#fff7ed" : "#fff",
          border:`1.5px solid ${t.accent}40`, flexShrink:0, padding:"3px 2px", overflow:"hidden", position:"relative" }}>
          {/* Bande top pour modèles avec header coloré */}
          {t.id==="ltr-moderne" && <div style={{ width:"100%", height:8, background:t.accent, marginBottom:2 }}/>}
          {t.id!=="ltr-moderne" && <div style={{ width:"90%", height:1.5, background:t.accent, marginBottom:2, borderBottom: t.id==="ltr-executive" ? `1px solid ${t.accent}` : "none" }}/>}
          <div style={{ width:"65%", height:1, background:t.accent+"90", marginBottom:1.5 }}/>
          <div style={{ width:"100%", height:"1px", background:t.accent+"30", marginBottom:3 }}/>
          <div style={{ width:"80%", height:"1px", background:"#ccc", marginBottom:1.5 }}/>
          <div style={{ width:"55%", height:"1px", background:"#ccc", marginBottom:1.5 }}/>
          <div style={{ width:"90%", height:"1px", background:"#ccc" }}/>
          {t.id==="ltr-creatif" && <div style={{ position:"absolute", bottom:2, left:0, right:0, height:2, background:`linear-gradient(90deg,${t.accent},#f9a8d4)` }}/>}
        </div>
        <div>
          <div style={{ fontSize:12.5, fontWeight:600, color: active ? "var(--terra)" : "var(--ink)" }}>{t.name}</div>
          <div style={{ fontSize:10.5, color:"var(--ink4)", marginTop:1 }}>{t.tag}</div>
        </div>
        {active && <div style={{ position:"absolute", top:8, right:8, width:18, height:18,
          borderRadius:"50%", background:"var(--terra)", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#fff" }}>✓</div>}
      </button>
    );
  };

  const ATSCard = ({ t }) => {
    const active = form.letterTemplate === t.id;
    return (
      <button onClick={() => setForm({...form, letterTemplate:t.id})}
        style={{ background: active ? "rgba(184,92,56,0.06)" : "#fff",
          border:`1.5px solid ${active ? "var(--terra)" : "var(--border)"}`,
          borderRadius:8, padding:"12px 14px", cursor:"pointer", textAlign:"left",
          position:"relative", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:26, height:34, borderRadius:3, background:"#fafafa",
          border:"1.5px solid #1c181230", flexShrink:0, padding:"4px 3px" }}>
          <div style={{ width:"100%", height:1.5, background:"#1c1812", marginBottom:2 }}/>
          <div style={{ width:"80%", height:1, background:"#666", marginBottom:1.5 }}/>
          <div style={{ width:"100%", height:1, background:"#aaa", marginBottom:3 }}/>
          <div style={{ width:"70%", height:1, background:"#ccc", marginBottom:1.5 }}/>
          <div style={{ width:"90%", height:1, background:"#ccc" }}/>
        </div>
        <div>
          <div style={{ fontSize:12.5, fontWeight:600, color: active ? "var(--terra)" : "var(--ink)" }}>{t.name}</div>
          <div style={{ fontSize:10.5, color:"var(--ink4)", marginTop:1 }}>{t.tag}</div>
        </div>
        {active && <div style={{ position:"absolute", top:8, right:8, width:18, height:18,
          borderRadius:"50%", background:"var(--terra)", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#fff" }}>✓</div>}
      </button>
    );
  };

  return (
    <div>
      {/* Hint switch */}
      <div style={{ marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ fontSize:11.5, color:"var(--terra)", fontWeight:700,
          background:"rgba(184,92,56,0.1)", border:"1px solid rgba(184,92,56,0.3)",
          borderRadius:6, padding:"4px 10px", animation:"pulse 2s ease infinite" }}>
          ↕ Cliquez sur un onglet pour changer de style
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"var(--cream2)", borderRadius:"8px 8px 0 0",
        border:"1.5px solid var(--border)", borderBottom:"none" }}>
        <TabBtn id="design" label="✦ Style Design (10)" sub="Mise en page élaborée"/>
        <div style={{ width:1, background:"var(--border)", margin:"8px 0" }}/>
        <TabBtn id="ats"    label="✓ Style ATS (10)"    sub="Sobre · Lisible"/>
      </div>
      <div style={{ border:"1.5px solid var(--border)", borderTop:"none",
        borderRadius:"0 0 8px 8px", background:"#fff", padding:16 }}>
        {tab === "design" && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:8, flexWrap:"wrap" }}>
              <p style={{ fontSize:12, color:"var(--ink4)", margin:0, lineHeight:1.6 }}>
                Mises en page riches avec couleurs accent et typographie soignée.
              </p>
              <button onClick={()=>setTab("ats")} style={{ fontSize:11.5, color:"var(--terra)", fontWeight:700,
                background:"rgba(184,92,56,0.08)", border:"1.5px solid rgba(184,92,56,0.3)",
                borderRadius:6, padding:"5px 12px", cursor:"pointer", whiteSpace:"nowrap" }}>
                Voir ATS →
              </button>
            </div>
            <div className="grid2" style={{ gap:10 }}>
              {LETTER_TEMPLATES.map(t => <DesignCard key={t.id} t={t}/>)}
            </div>
          </>
        )}
        {tab === "ats" && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:8, flexWrap:"wrap" }}>
              <div style={{ background:"#f0f7f0", border:"1px solid #c3e0c3", borderRadius:6,
                padding:"8px 12px", fontSize:12, color:"#2a6a2a", lineHeight:1.6, flex:1 }}>
                <strong>✓ ATS</strong> — Compatible logiciels de recrutement, sobre et lisible.
              </div>
              <button onClick={()=>setTab("design")} style={{ fontSize:11.5, color:"var(--terra)", fontWeight:700,
                background:"rgba(184,92,56,0.08)", border:"1.5px solid rgba(184,92,56,0.3)",
                borderRadius:6, padding:"5px 12px", cursor:"pointer", whiteSpace:"nowrap" }}>
                ← Voir Design
              </button>
            </div>
            <div className="grid2" style={{ gap:10 }}>
              {LETTER_ATS_TEMPLATES.map(t => <ATSCard key={t.id} t={t}/>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


/* ─── STEP LETTER TEMPLATE ─── */
/* ─── STEP RESULT LETTER ─── */
function StepResultLetter({ form, onRestart }) {
  const letterRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState(null);
  const [zoom, setZoom] = useState(() => window.innerWidth < 480 ? 0.55 : window.innerWidth < 768 ? 0.7 : 0.9);
  const [building, setBuilding] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBuilding(false), 1800);
    return () => clearTimeout(t);
  }, []);

  if (building) return <CVBuildAnimation onDone={() => setBuilding(false)}/>;

  const cvFinal = { ...form,
    name: form.nameOrder === "lastFirst"
      ? `${form.lastName} ${form.firstName}`.trim()
      : `${form.firstName} ${form.lastName}`.trim()
  };

  const downloadLetter = async () => {
    setExporting(true); setExportErr(null);
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
      const el = letterRef.current;
      if (!el) throw new Error("Introuvable");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      await renderElementToPDF(el, pdf);
      pdf.save(`Lettre_${fullName(form).replace(/ /g,"_")}.pdf`);
    } catch(err) {
      setExportErr("Export échoué. Utilisez Imprimer.");
    } finally {
      setExporting(false);
    }
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`J'ai rédigé ma lettre de motivation avec CVtools ! ✉\nhttps://cvtools-v6.vercel.app`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16, alignItems:"center" }}>
        <button className="btn-main" onClick={downloadLetter} disabled={exporting}>
          {exporting ? "⏳ Génération..." : "✉ Télécharger la lettre PDF"}
        </button>
        <button className="btn-line" onClick={() => window.print()}>🖨 Imprimer</button>
      </div>

      {exportErr && (
        <div style={{ background:"#fdf0ee", border:"1px solid rgba(192,57,43,0.2)", borderRadius:6,
          padding:"10px 14px", marginBottom:14, fontSize:13, color:"#c0392b" }}>⚠ {exportErr}</div>
      )}

      {/* Zoom */}
      <div style={{ marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:12, color:"var(--ink3)" }}>Zoom :</span>
        {[0.45,0.6,0.75,0.9,1.0].map(z=>(
          <button key={z} onClick={()=>setZoom(z)}
            style={{ padding:"3px 10px", fontSize:11.5, borderRadius:6, cursor:"pointer",
              border: zoom===z ? "2px solid var(--terra)" : "1.5px solid var(--border)",
              background: zoom===z ? "rgba(184,92,56,0.1)" : "transparent",
              color: zoom===z ? "var(--terra)" : "var(--ink3)", fontWeight: zoom===z ? 700 : 400 }}>
            {Math.round(z*100)}%
          </button>
        ))}
      </div>

      {/* Aperçu lettre */}
      <div className="cv-viewer" style={{ background:"#e8e0d0", padding:12, borderRadius:8, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        <div style={{ width:595*zoom, margin:"0 auto", transition:"width 0.2s", minWidth:"min-content" }}>
          <div ref={letterRef} style={{ width:595, transformOrigin:"top left",
            transform:`scale(${zoom})`, boxShadow:"0 4px 32px rgba(0,0,0,0.18)" }}>
            <LetterRenderer cv={cvFinal}/>
          </div>
        </div>
      </div>

      {/* Share */}
      <div className="share-row" style={{ marginTop:20 }}>
        <button className="share-btn" onClick={shareWhatsApp}
          style={{ background:"#25D366", color:"#fff" }}>
          💬 Partager
        </button>
      </div>

      <div style={{ marginTop:20, textAlign:"center" }}>
        <button className="btn-line" onClick={onRestart} style={{ fontSize:13 }}>
          + Créer un nouveau document
        </button>
      </div>
    </div>
  );
}

/* ─── HORIZONTAL STEPS BAR ─── */
function HStepsBar({ step, setStep, steps=STEPS, mode="cv", darkMode, onToggleDark, onNavBack }) {
  return (
    <div className="hbar">

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 12px", flexShrink:0 }}>
        <Logo size={24}/>
        <span className="logo-text" style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700,
          fontStyle:"italic", color:"var(--ink)", letterSpacing:"-0.3px" }}>CVtools</span>
      </div>

      {/* Steps */}
      <div className="h-steps" style={{ flex:1 }}>
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const clickable = i < step; // dots passés cliquables (pas le courant)
          // Séparateur de phase CV → Lettre dans le parcours cv+letter
          const isLetterStart = mode === "cv+letter" && i === 6;
          return (
            <React.Fragment key={s.id}>
            {isLetterStart && (
              <div style={{ display:"flex", alignItems:"center", flexShrink:0,
                padding:"0 4px", gap:3 }}>
                <div style={{ width:1, height:20,
                  background:"rgba(184,92,56,0.3)" }}/>
                <span style={{ fontSize:8.5, color:"var(--terra)", fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.8px",
                  writingMode:"vertical-rl", transform:"rotate(180deg)", lineHeight:1 }}>
                  Lettre
                </span>
              </div>
            )}
            <div className={`h-step${clickable?" clickable":""}`}
              onClick={() => {
                if (!clickable) return;
                if (onNavBack) onNavBack(i);
                else setStep(i);
              }}>
              <div className="h-step-dot" style={{
                background: done ? "var(--terra)" : active ? "rgba(184,92,56,0.15)" : "var(--cream3)",
                border: active ? "2px solid var(--terra)" : done ? "none" : "2px solid var(--border2)",
                color: done ? "#fff" : active ? "var(--terra)" : "var(--ink4)",
                animation: active ? "popIn 0.4s cubic-bezier(0.16,1,0.3,1) both" : done ? "none" : "none",
                boxShadow: active ? "0 0 0 4px rgba(184,92,56,0.15)" : "none" }}>
                {done ? "✓" : s.short}
              </div>
              <span className="h-step-label" style={{
                color: active ? "var(--terra)" : done ? "var(--ink2)" : "var(--ink4)",
                fontWeight: active ? 700 : 400 }}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className="h-step-line" style={{
                  background: i < step ? "var(--terra2)" : "var(--border2)",
                  transition: "background 0.4s ease" }}/>
              )}
            </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Dark mode toggle */}
      <button onClick={onToggleDark}
        style={{ background:"transparent", border:"1px solid var(--border)",
          borderRadius:6, padding:"6px 10px", fontSize:13, color:"var(--ink3)",
          cursor:"pointer", flexShrink:0, marginRight:8 }}>
        {darkMode ? "☀" : "🌙"}
      </button>
    </div>
  );
}

/* ─── LANDING PAGE ─── */
function CGUModal({ onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:14, maxWidth:560, width:"100%", maxHeight:"80vh", overflow:"auto", padding:"28px 28px 24px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"var(--ink)", marginBottom:16 }}>Conditions Générales d'Utilisation</div>
        <div style={{ fontSize:12.5, color:"#555", lineHeight:1.85 }}>
          <p style={{ fontWeight:700, color:"var(--ink)", marginBottom:6 }}>1. Objet</p>
          <p style={{ marginBottom:12 }}>CVtools est un outil de création de CV professionnel. L'utilisation de cet outil est soumise aux présentes conditions générales.</p>
          <p style={{ fontWeight:700, color:"var(--ink)", marginBottom:6 }}>2. Données personnelles & utilisation</p>
          <p style={{ marginBottom:8 }}>Les informations renseignées par l'utilisateur lors de la création de son CV (nom, prénom, coordonnées, expériences, formation, compétences, photo, etc.) peuvent être utilisées par CVtools pour :</p>
          <ul style={{ paddingLeft:18, marginBottom:12 }}>
            <li style={{ marginBottom:4 }}>améliorer ses services et fonctionnalités ;</li>
            <li style={{ marginBottom:4 }}>constituer une base de profils professionnels pouvant être consultée par des <strong>recruteurs partenaires</strong>.</li>
          </ul>
          <p style={{ marginBottom:12 }}>En utilisant CVtools, l'utilisateur consent expressément à ces utilisations de ses données.</p>
          <p style={{ fontWeight:700, color:"var(--ink)", marginBottom:6 }}>3. Responsabilité</p>
          <p style={{ marginBottom:12 }}>L'utilisateur est seul responsable du contenu de son CV et de l'exactitude des informations saisies. CVtools décline toute responsabilité quant à l'usage fait du document généré.</p>
          <p style={{ fontWeight:700, color:"var(--ink)", marginBottom:6 }}>4. Propriété intellectuelle</p>
          <p style={{ marginBottom:12 }}>Les modèles de CV et le code de l'application sont la propriété de CVtools. Toute reproduction commerciale sans autorisation préalable est interdite.</p>
          <p style={{ fontWeight:700, color:"var(--ink)", marginBottom:6 }}>5. Modifications</p>
          <p style={{ marginBottom:0 }}>CVtools se réserve le droit de modifier ces conditions à tout moment. L'utilisation de l'application vaut acceptation des conditions en vigueur.</p>
        </div>
        <button className="btn-main" style={{ marginTop:20, width:"100%", padding:"11px" }} onClick={onClose}>J'ai lu et compris ✓</button>
      </div>
    </div>
  );
}

/* ─── CV CHOICE SCREEN ─── */
function CVChoiceScreen({ onNew, onImport, onBack }) {
  const [showImport, setShowImport] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [msg, setMsg] = useState("");
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const bytes = new Uint8Array(ev.target.result);
        let str = "";
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] > 31 && bytes[i] < 127) str += String.fromCharCode(bytes[i]);
        }
        const match = str.match(/Subject\s*\(([A-Za-z0-9+/=]{50,})\)/);
        if (match) {
          const decoded = decodeURIComponent(escape(atob(match[1])));
          const data = JSON.parse(decoded);
          if (data._cvtools) {
            setStatus("success");
            setMsg(`CV de ${data.firstName} ${data.lastName} retrouvé !`);
            setTimeout(() => onImport(data), 900);
            return;
          }
        }
        setStatus("error");
        setMsg("Ce PDF n'a pas été généré par CVtools ou les données sont introuvables.");
      } catch(err) {
        setStatus("error");
        setMsg("Impossible de lire ce fichier.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>

      {/* Titre */}
      <div style={{ marginBottom:36, textAlign:"center", animation:"fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div style={{ animation:"popIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
          <Logo size={44}/>
        </div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700,
          color:"var(--ink)", fontStyle:"italic", margin:"14px 0 8px" }}>
          Créer mon CV
        </h1>
        <p style={{ fontSize:13.5, color:"var(--ink4)", margin:0, lineHeight:1.6 }}>
          Comment souhaitez-vous commencer ?
        </p>
      </div>

      {/* Zone grille + bulle — relative pour positionner la bulle */}
      <div style={{ position:"relative", width:"100%", maxWidth:560 }}>

        {/* Deux cartes côte à côte */}
        <div className="choice-grid">

          {/* Option 1 — Nouveau CV */}
          <button onClick={onNew}
            style={{ background:"#fff", border:"2px solid var(--border)", borderRadius:14,
              padding:"30px 22px", cursor:"pointer", textAlign:"left",
              transition:"transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, border-color 0.2s",
              display:"flex", flexDirection:"column", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
              animation:"fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.12s both" }}
            onMouseEnter={e => { e.currentTarget.style.border="2px solid var(--terra)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(184,92,56,0.13)"; e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.border="2px solid var(--border)"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"; e.currentTarget.style.transform="translateY(0)"; }}>
            <div style={{ width:48, height:48, borderRadius:12, background:"rgba(184,92,56,0.1)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
              ✦
            </div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700,
                color:"var(--ink)", marginBottom:6 }}>
                Nouveau CV
              </div>
              <div style={{ fontSize:12.5, color:"var(--ink4)", lineHeight:1.65 }}>
                Créer un CV complet depuis zéro en quelques étapes guidées
              </div>
            </div>
            <div style={{ marginTop:"auto", fontSize:12, color:"var(--terra)", fontWeight:600 }}>
              Commencer →
            </div>
          </button>

          {/* Option 2 — Importer (carte avec overlay interne) */}
          <div style={{ position:"relative" }}>
            <button onClick={() => setShowImport(v => !v)}
              style={{ width:"100%", background: showImport ? "rgba(184,92,56,0.04)" : "#fff",
                border: showImport ? "2px solid var(--terra)" : "2px solid var(--border)",
                borderRadius:14, padding:"30px 22px", cursor:"pointer", textAlign:"left",
                transition:"transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, border-color 0.2s",
                display:"flex", flexDirection:"column", gap:12,
                boxShadow: showImport ? "0 6px 24px rgba(184,92,56,0.13)" : "0 2px 8px rgba(0,0,0,0.04)",
                animation:"fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}
              onMouseEnter={e => { if(!showImport){ e.currentTarget.style.border="2px solid var(--terra)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(184,92,56,0.13)"; e.currentTarget.style.transform="translateY(-2px)"; }}}
              onMouseLeave={e => { if(!showImport){ e.currentTarget.style.border="2px solid var(--border)"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"; e.currentTarget.style.transform="translateY(0)"; }}}>
              <div style={{ width:48, height:48, borderRadius:12,
                background: showImport ? "rgba(184,92,56,0.12)" : "rgba(28,24,18,0.07)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                📂
              </div>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700,
                  color: showImport ? "var(--terra)" : "var(--ink)", marginBottom:6 }}>
                  Reprendre un CV
                </div>
                <div style={{ fontSize:12.5, color:"var(--ink4)", lineHeight:1.65 }}>
                  Importez un CV fait avec CVtools pour retrouver toutes vos données en un clic
                </div>
              </div>
              <div style={{ marginTop:"auto", fontSize:12, color: showImport ? "var(--terra)" : "var(--ink3)", fontWeight:600 }}>
                {showImport ? "✕ Fermer" : "Importer →"}
              </div>
            </button>

            {/* Bulle overlay — par-dessus la carte, même position */}
            {showImport && (
              <div style={{
                position:"absolute", inset:0,
                background:"#fff",
                border:"2px solid var(--terra)",
                borderRadius:14, padding:"18px 18px 16px",
                boxShadow:"0 8px 32px rgba(184,92,56,0.2)",
                animation:"popIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
                zIndex:20, display:"flex", flexDirection:"column", gap:10
              }}>
                {/* Titre */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:"var(--terra)" }}>
                    📂 Importer un CV
                  </div>
                  <button onClick={e => { e.stopPropagation(); setShowImport(false); setStatus("idle"); setMsg(""); }}
                    style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", color:"var(--ink4)", lineHeight:1, padding:2 }}>
                    ✕
                  </button>
                </div>

                {/* Info */}
                <div style={{ fontSize:11.5, color:"var(--ink3)", lineHeight:1.65,
                  background:"rgba(184,92,56,0.05)", borderRadius:8, padding:"8px 10px" }}>
                  Vos données sont <strong>dans le PDF</strong> CVtools — tout sera restauré instantanément.
                </div>

                <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={handleFile}/>

                {status === "idle" && (
                  <button className="btn-main" style={{ justifyContent:"center", fontSize:12.5, padding:"10px 12px", marginTop:"auto" }}
                    onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>
                    📂 Choisir mon PDF
                  </button>
                )}
                {status === "loading" && (
                  <div style={{ textAlign:"center", padding:"8px 0", fontSize:13, color:"var(--ink3)", marginTop:"auto" }}>
                    ⏳ Lecture...
                  </div>
                )}
                {status === "success" && (
                  <div style={{ textAlign:"center", marginTop:"auto" }}>
                    <div style={{ fontSize:24 }}>✓</div>
                    <div style={{ fontSize:12.5, fontWeight:700, color:"#2a7a2a", marginTop:4 }}>{msg}</div>
                  </div>
                )}
                {status === "error" && (
                  <div style={{ marginTop:"auto" }}>
                    <div style={{ fontSize:11.5, color:"#c0392b", marginBottom:8, padding:"7px 9px",
                      background:"#fdf0ee", borderRadius:6, lineHeight:1.6 }}>⚠ {msg}</div>
                    <button className="btn-line" style={{ width:"100%", fontSize:12, padding:"7px" }}
                      onClick={e => { e.stopPropagation(); setStatus("idle"); setMsg(""); if(fileRef.current) fileRef.current.value=""; }}>
                      Réessayer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}


/* ─── CODES PROMO — gérés via Google Sheets ─── */

// ── Helpers Sheets API ──
async function sheetsGet(action, params) {
  let url = SHEETS_URL + "?action=" + action;
  if (params) Object.keys(params).forEach(k => url += "&" + k + "=" + encodeURIComponent(params[k]));
  const res = await fetch(url);
  return res.json();
}
async function sheetsPost(data) {
  await fetch(SHEETS_URL, {
    method:"POST", mode:"no-cors",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(data),
  });
}
async function sheetsPostResp(data) {
  const res = await fetch(SHEETS_URL, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── Config (mot de passe + annonce) ──
let _configCache = null;
async function getConfig() {
  if (_configCache) return _configCache;
  try { const j = await sheetsGet("getConfig"); _configCache = j.data || {}; return _configCache; }
  catch(e) { return {}; }
}
async function getAdminPwd() { const c = await getConfig(); return c.admin_pwd || "cvtools2026"; }
async function getAnnounce() { const c = await getConfig(); return c.announce || ""; }
async function updateConfig(key, value) { _configCache = null; return sheetsPostResp({ action:"updateConfig", key, value }); }

// ── Témoignages ──
const DEFAULT_TESTIMONIALS = [
  { id:"t1", name:"Fousseni DIALLO",      role:"Assistant en communication", text:"J'ai créé mon CV en 4 minutes. Très simple et professionnel !", actif:true },
  { id:"t2", name:"Adou Issa Fader SERE", role:"Étudiant",                   text:"Grâce à CVtools j'ai pu faire mon premier CV pas à pas. Ça m'a beaucoup aidé dans la recherche de stage.", actif:true },
  { id:"t3", name:"Wilfried SANOU",       role:"Logisticien",                text:"Enfin un outil en français adapté à l'Afrique. Je recommande !", actif:true },
];

// ── Codes promo ──
async function verifierCodePromo(code) {
  if (!code) return null;
  try {
    const json = await sheetsGet("verifierCode", { code });
    return json;
  } catch(e) { return { valide: false, message: "Erreur réseau" }; }
}

/* ─── ADMIN DASHBOARD ─── */
function AdminDashboard({ onBack }) {
  const [adminTab,  setAdminTab]  = useState("candidats");
  const [candidats, setCandidats] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");

  // Codes promo — gérés par PromoTab

  // Témoignages
  const [testis,       setTestis]      = useState(DEFAULT_TESTIMONIALS);
  const [testiLoading, setTestiLoading]= useState(false);
  const [testiForm,    setTestiForm]   = useState({ name:"", role:"", text:"" });
  const [testiEdit,    setTestiEdit]   = useState(null);
  const [testiMsg,     setTestiMsg]    = useState("");

  // Paramètres
  const [pwdCurrent,  setPwdCurrent]  = useState("");
  const [pwdNew,      setPwdNew]      = useState("");
  const [pwdConfirm,  setPwdConfirm]  = useState("");
  const [pwdMsg,      setPwdMsg]      = useState("");
  const [announce,    setAnnounce]    = useState("");
  const [announceMsg, setAnnounceMsg] = useState("");

  useEffect(() => { loadData(); loadPromos(); loadTestis(); loadSettings(); }, []);

  const loadTestis = async () => {
    setTestiLoading(true);
    try { const j = await sheetsGet("getTemoignages"); if (j.data) setTestis(j.data); }
    catch(e) { console.warn("Témoignages:", e); }
    finally { setTestiLoading(false); }
  };

  const loadSettings = async () => { setAnnounce(await getAnnounce()); };

  // ── Témoignages helpers ──
  const addTesti = async () => {
    if (!testiForm.name.trim() || !testiForm.text.trim()) { setTestiMsg("⚠ Nom et texte requis."); return; }
    setTestiLoading(true);
    await sheetsPost({ action:"addTemoignage", name:testiForm.name.trim(), role:testiForm.role.trim(), text:testiForm.text.trim() });
    await loadTestis();
    setTestiForm({ name:"", role:"", text:"" });
    setTestiMsg("✓ Témoignage ajouté !"); setTimeout(() => setTestiMsg(""), 3000);
  };
  const updateTesti = async () => {
    if (!testiForm.name.trim() || !testiForm.text.trim()) return;
    setTestiLoading(true);
    await sheetsPostResp({ action:"updateTemoignage", id:testiEdit, name:testiForm.name.trim(), role:testiForm.role.trim(), text:testiForm.text.trim() });
    await loadTestis();
    setTestiEdit(null); setTestiForm({ name:"", role:"", text:"" });
    setTestiMsg("✓ Modifié !"); setTimeout(() => setTestiMsg(""), 3000);
  };
  const deleteTesti = async (id) => {
    if (!window.confirm("Supprimer ce témoignage ?")) return;
    setTestiLoading(true);
    await sheetsPostResp({ action:"deleteTemoignage", id });
    await loadTestis();
  };
  const toggleTesti = async (t) => {
    setTestiLoading(true);
    await sheetsPostResp({ action:"updateTemoignage", id:t.id, actif:!t.actif });
    await loadTestis();
  };
  const startEdit = (t) => { setTestiEdit(t.id); setTestiForm({ name:t.name, role:t.role, text:t.text }); };
  const cancelEdit = () => { setTestiEdit(null); setTestiForm({ name:"", role:"", text:"" }); };

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(SHEETS_URL + "?action=getCandidats");
      const json = await res.json();
      const rows = (json.data || []).map((r, i) => ({
        id:           i,
        prenom:       r[0] || "",
        nom:          r[1] || "",
        email:        r[2] || "",
        telephone:    r[3] || "",
        ville:        r[4] || "",
        titre:        r[5] || "",
        competences:  r[6] || "",
        mode:         r[7] || "",
        template:     r[8] || "",
        date_creation: r[9] ? String(r[9]) : "",
      })).reverse(); // plus récents en premier
      setCandidats(rows);
    } catch(e) { setError("Erreur chargement : " + e.message); }
    finally { setLoading(false); }
  };

  const loadPromos = async () => {}; // géré par PromoTab

  const csvCell = (v) => { var s = (v||"").toString().replace(/"/g, '""'); return '"' + s + '"'; };
  const exportCSV = () => {
    const rows = filtered;
    const header = ["Prénom","Nom","Email","Téléphone","Ville","Titre","Compétences","Mode","Template","Date"];
    const lines = rows.map(r => [
      r.prenom, r.nom, r.email, r.telephone, r.ville,
      r.titre, r.competences, r.mode, r.template,
      r.date_creation ? new Date(r.date_creation).toLocaleDateString("fr-FR") : ""
    ].map(v => csvCell(v)).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cvtools_candidats.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = candidats
    .filter(c => filter === "all" || c.mode === filter)
    .filter(c => !search || [c.prenom,c.nom,c.email,c.titre,c.ville].some(v =>
      (v||"").toLowerCase().includes(search.toLowerCase())
    ));

  const stats = {
    total:  candidats.length,
    cv:     candidats.filter(c=>c.mode==="cv").length,
    letter: candidats.filter(c=>c.mode==="letter").length,
    combo:  candidats.filter(c=>c.mode==="cv+letter").length,
    today:  candidats.filter(c => {
      if (!c.date_creation) return false;
      const d = new Date(c.date_creation), n = new Date();
      return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
    }).length,
  };

  const LIMIT = 400;
  const fillPct = Math.round((candidats.length / 500) * 100);

  const TARIFS = { cv: 300, letter: 200, "cv+letter": 400 };

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", padding:"0 0 40px" }}>
      {/* Header */}
      <div style={{ background:"var(--ink)", padding:"16px 20px",
        display:"flex", alignItems:"center", gap:16 }}>
        <button onClick={onBack}
          style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)",
            color:"#fff", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13 }}>
          ← Retour
        </button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18,
          fontWeight:700, color:"#fff", flex:1 }}>
          ⚙ Admin — CVtools
        </div>
        <button onClick={() => { loadData(); loadPromos(); }}
          style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)",
            color:"#fff", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13 }}>
          ↻ Actualiser
        </button>
      </div>

      {/* Onglets */}
      <div style={{ background:"var(--ink)", borderTop:"1px solid rgba(255,255,255,0.1)",
        display:"flex", padding:"0 8px", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
        {[
          { key:"candidats",    label:"👥 Candidats" },
          { key:"stats",        label:"📈 Statistiques" },
          { key:"testimonials", label:"💬 Témoignages" },
          { key:"promos",       label:"🎟 Codes promo" },
          { key:"settings",     label:"⚙️ Paramètres" },
        ].map(t => (
          <button key={t.key} onClick={() => setAdminTab(t.key)}
            style={{ padding:"12px 14px", fontSize:12.5, whiteSpace:"nowrap", fontWeight: adminTab===t.key ? 700 : 400,
              background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit",
              color: adminTab===t.key ? "#fff" : "rgba(255,255,255,0.5)",
              borderBottom: adminTab===t.key ? "2px solid var(--terra)" : "2px solid transparent",
              transition:"all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px" }}>

        {/* ═══════════════ ONGLET CANDIDATS ═══════════════ */}
        {adminTab === "candidats" && (<>
          {candidats.length >= LIMIT && (
            <div style={{ background:"#fff3cd", border:"1px solid #ffc107", borderRadius:10,
              padding:"12px 16px", marginBottom:16, fontSize:13, fontWeight:600, color:"#856404" }}>
              ⚠ {candidats.length} entrées — pensez à exporter en CSV puis nettoyer le Google Sheet.
            </div>
          )}

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
            {[
              { label:"Total",       val:stats.total,  color:"var(--ink)" },
              { label:"Aujourd'hui", val:stats.today,  color:"var(--terra)" },
              { label:"CV",          val:stats.cv,     color:"#2563eb" },
              { label:"Lettres",     val:stats.letter, color:"#7c3aed" },
              { label:"CV+Lettre",   val:stats.combo,  color:"#059669" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)",
                borderRadius:10, padding:"14px 12px", textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:11, color:"var(--ink4)", marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Jauge */}
          <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:10,
            padding:"12px 16px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12,
              color:"var(--ink3)", marginBottom:6 }}>
              <span>Entrées Google Sheets (limite affichage : 500)</span>
              <span style={{ fontWeight:700, color: fillPct>80 ? "#c0392b" : "var(--ink)" }}>{fillPct}%</span>
            </div>
            <div style={{ height:8, background:"#eee", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:fillPct+"%", borderRadius:4, transition:"width 0.5s",
                background: fillPct>80 ? "#c0392b" : fillPct>50 ? "#f59e0b" : "var(--terra)" }}/>
            </div>
          </div>

          {/* Filtres */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16, alignItems:"center" }}>
            <input style={{ flex:1, minWidth:180, padding:"9px 12px", border:"1.5px solid var(--border)",
              borderRadius:8, fontSize:13, fontFamily:"inherit", background:"#fff" }}
              placeholder="Rechercher nom, email, ville..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
            {["all","cv","letter","cv+letter"].map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:"8px 14px", fontSize:12, borderRadius:8, cursor:"pointer",
                  fontFamily:"inherit", fontWeight: filter===f ? 700 : 400, border:"1.5px solid",
                  borderColor: filter===f ? "var(--terra)" : "var(--border)",
                  background: filter===f ? "rgba(184,92,56,0.1)" : "#fff",
                  color: filter===f ? "var(--terra)" : "var(--ink3)" }}>
                {f==="all"?"Tous":f==="cv"?"CV":f==="letter"?"Lettres":"CV+Lettre"}
                {" "}({f==="all"?stats.total:f==="cv"?stats.cv:f==="letter"?stats.letter:stats.combo})
              </button>
            ))}
            <button onClick={exportCSV}
              style={{ padding:"9px 16px", fontSize:13, borderRadius:8, cursor:"pointer",
                fontFamily:"inherit", fontWeight:700, background:"var(--terra)", color:"#fff",
                border:"none", boxShadow:"0 2px 8px rgba(184,92,56,0.3)" }}>
              ⬇ Export CSV
            </button>
          </div>

          {/* Tableau */}
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"var(--ink3)" }}>Chargement...</div>
          ) : error ? (
            <div style={{ background:"#fdf0ee", border:"1px solid rgba(192,57,43,0.2)",
              borderRadius:8, padding:16, color:"#c0392b", fontSize:13 }}>{error}</div>
          ) : (
            <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"var(--cream)", borderBottom:"2px solid var(--border)" }}>
                      {["Nom complet","Email","Téléphone","Ville","Titre","Mode","Date"].map(h => (
                        <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontWeight:700,
                          fontSize:11, textTransform:"uppercase", letterSpacing:"0.5px",
                          color:"var(--ink3)", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:"var(--ink4)" }}>
                        Aucun candidat trouvé
                      </td></tr>
                    ) : filtered.map((r,i) => (
                      <tr key={r.id} style={{ borderBottom:"1px solid var(--border)",
                        background: i%2===0 ? "#fff" : "var(--cream2)" }}>
                        <td style={{ padding:"9px 12px", fontWeight:600 }}>{r.prenom} {r.nom}</td>
                        <td style={{ padding:"9px 12px", color:"var(--terra)" }}>{r.email}</td>
                        <td style={{ padding:"9px 12px" }}>{r.telephone}</td>
                        <td style={{ padding:"9px 12px" }}>{r.ville}</td>
                        <td style={{ padding:"9px 12px", maxWidth:160, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.titre}</td>
                        <td style={{ padding:"9px 12px" }}>
                          <span style={{ padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:700,
                            background: r.mode==="cv+letter" ? "rgba(5,150,105,0.1)" :
                                        r.mode==="letter"    ? "rgba(124,58,237,0.1)" : "rgba(37,99,235,0.1)",
                            color:      r.mode==="cv+letter" ? "#059669" :
                                        r.mode==="letter"    ? "#7c3aed" : "#2563eb" }}>
                            {r.mode==="cv+letter" ? "CV+Lettre" : r.mode==="letter" ? "Lettre" : "CV"}
                          </span>
                        </td>
                        <td style={{ padding:"9px 12px", color:"var(--ink4)", whiteSpace:"nowrap" }}>
                          {r.date_creation ? (() => { try { const d = new Date(r.date_creation); return isNaN(d) ? r.date_creation.slice(0,10) : d.toLocaleDateString("fr-FR"); } catch(e) { return r.date_creation.slice(0,10); } })() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:"10px 14px", fontSize:11, color:"var(--ink4)",
                borderTop:"1px solid var(--border)", textAlign:"right" }}>
                {filtered.length} résultat{filtered.length>1?"s":""} affiché{filtered.length>1?"s":""}
              </div>
            </div>
          )}
        </>)}

        {/* ═══════════════ ONGLET STATISTIQUES ═══════════════ */}
        {adminTab === "stats" && (() => {
          const byMode = { cv:0, letter:0, "cv+letter":0 };
          candidats.forEach(c => { if(byMode[c.mode] !== undefined) byMode[c.mode]++; });

          // Par jour (7 derniers jours)
          const dayLabels = [], dayCounts = [];
          for (let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const key = d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
            dayLabels.push(key);
            dayCounts.push(candidats.filter(c => {
              if (!c.date_creation) return false;
              try { const cd = new Date(c.date_creation); return cd.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}) === key; }
              catch(e) { return false; }
            }).length);
          }
          const maxDay = Math.max(...dayCounts, 1);

          // Templates
          const tplCount = {};
          candidats.forEach(c => { if(c.template) tplCount[c.template] = (tplCount[c.template]||0)+1; });
          const topTpls = Object.entries(tplCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

          // Villes
          const villeCount = {};
          candidats.forEach(c => { if(c.ville) { const v=c.ville.trim().split(",")[0].trim(); villeCount[v]=(villeCount[v]||0)+1; }});
          const topVilles = Object.entries(villeCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

          return (
            <div>
              {/* Répartition modes */}
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase",
                  letterSpacing:"1px", marginBottom:14 }}>Répartition par produit</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  {[
                    { label:"CV seuls",    val:byMode.cv,          color:"#2563eb", pct: candidats.length ? Math.round(byMode.cv/candidats.length*100) : 0 },
                    { label:"Lettres",     val:byMode.letter,      color:"#7c3aed", pct: candidats.length ? Math.round(byMode.letter/candidats.length*100) : 0 },
                    { label:"CV+Lettre",   val:byMode["cv+letter"],color:"#059669", pct: candidats.length ? Math.round(byMode["cv+letter"]/candidats.length*100) : 0 },
                  ].map(s => (
                    <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)",
                      borderRadius:12, padding:"16px 14px" }}>
                      <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:11, color:"var(--ink4)", marginTop:2 }}>{s.label}</div>
                      <div style={{ marginTop:10, height:6, background:"#eee", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:s.pct+"%", background:s.color, borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:11, color:s.color, fontWeight:700, marginTop:4 }}>{s.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphique 7 jours */}
              <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12,
                padding:"18px 16px", marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase",
                  letterSpacing:"1px", marginBottom:16 }}>Téléchargements — 7 derniers jours</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                  {dayLabels.map((label, i) => (
                    <div key={label} style={{ flex:1, display:"flex", flexDirection:"column",
                      alignItems:"center", gap:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"var(--terra)" }}>
                        {dayCounts[i] > 0 ? dayCounts[i] : ""}
                      </div>
                      <div style={{ width:"100%", background:"var(--terra)", borderRadius:"4px 4px 0 0",
                        height: Math.max(4, (dayCounts[i]/maxDay)*90) + "px",
                        opacity: dayCounts[i]===0 ? 0.15 : 1, transition:"height 0.4s" }}/>
                      <div style={{ fontSize:10, color:"var(--ink4)", whiteSpace:"nowrap" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top templates + Villes */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12, padding:"16px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase",
                    letterSpacing:"1px", marginBottom:12 }}>Top templates</div>
                  {topTpls.length === 0 ? <div style={{ fontSize:12, color:"var(--ink4)" }}>Aucune donnée</div> :
                    topTpls.map(([name, count]) => (
                      <div key={name} style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:12, color:"var(--ink3)", flex:1,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--terra)",
                          marginLeft:8, flexShrink:0 }}>{count}</span>
                      </div>
                    ))
                  }
                </div>
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12, padding:"16px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase",
                    letterSpacing:"1px", marginBottom:12 }}>Top villes</div>
                  {topVilles.length === 0 ? <div style={{ fontSize:12, color:"var(--ink4)" }}>Aucune donnée</div> :
                    topVilles.map(([ville, count]) => (
                      <div key={ville} style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:12, color:"var(--ink3)" }}>{ville}</div>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--terra)" }}>{count}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════ ONGLET TÉMOIGNAGES ═══════════════ */}
        {adminTab === "testimonials" && (
          <div>
            {/* Message feedback */}
            {testiMsg && (
              <div style={{ marginBottom:14, fontSize:13, fontWeight:700,
                color: testiMsg.startsWith("⚠") ? "#c0392b" : "#059669",
                background: testiMsg.startsWith("⚠") ? "#fdf0ee" : "rgba(5,150,105,0.08)",
                border: "1px solid " + (testiMsg.startsWith("⚠") ? "rgba(192,57,43,0.2)" : "rgba(5,150,105,0.2)"),
                borderRadius:8, padding:"10px 14px" }}>
                {testiMsg}
              </div>
            )}

            {/* Formulaire ajout / édition */}
            <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12,
              padding:"18px 16px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", marginBottom:14 }}>
                {testiEdit ? "✏️ Modifier le témoignage" : "➕ Ajouter un témoignage"}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>Nom *</div>
                  <input className="field" style={{ margin:0 }}
                    placeholder="Ex : Fousseni DIALLO"
                    value={testiForm.name}
                    onChange={e => setTestiForm(f => ({...f, name:e.target.value}))}/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>Rôle / Métier</div>
                  <input className="field" style={{ margin:0 }}
                    placeholder="Ex : Étudiant, Comptable..."
                    value={testiForm.role}
                    onChange={e => setTestiForm(f => ({...f, role:e.target.value}))}/>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>Témoignage *</div>
                <textarea className="field" rows={3} style={{ margin:0, resize:"vertical" }}
                  placeholder="Ce que la personne dit de CVtools..."
                  value={testiForm.text}
                  onChange={e => setTestiForm(f => ({...f, text:e.target.value}))}/>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-main" style={{ fontSize:13, padding:"9px 20px" }}
                  onClick={testiEdit ? updateTesti : addTesti}>
                  {testiEdit ? "💾 Enregistrer" : "➕ Ajouter"}
                </button>
                {testiEdit && (
                  <button className="btn-line" style={{ fontSize:13 }} onClick={cancelEdit}>
                    Annuler
                  </button>
                )}
              </div>
            </div>

            {/* Liste des témoignages */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {testis.length === 0 ? (
                <div style={{ textAlign:"center", padding:32, color:"var(--ink4)", fontSize:13 }}>
                  Aucun témoignage — ajoutez-en un ci-dessus.
                </div>
              ) : testis.map((t, i) => (
                <div key={t.id} style={{ background:"#fff", border:"1.5px solid var(--border)",
                  borderRadius:10, padding:"14px 16px",
                  opacity: t.actif === false ? 0.5 : 1, transition:"opacity 0.2s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{t.name}</span>
                        {t.role && <span style={{ fontSize:11, color:"var(--ink4)" }}>— {t.role}</span>}
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, fontWeight:600,
                          background: t.actif === false ? "#fdf0ee" : "rgba(5,150,105,0.1)",
                          color:      t.actif === false ? "#c0392b" : "#059669",
                          border:     "1px solid " + (t.actif === false ? "rgba(192,57,43,0.2)" : "rgba(5,150,105,0.2)") }}>
                          {t.actif === false ? "Masqué" : "Visible"}
                        </span>
                      </div>
                      <div style={{ fontSize:12.5, color:"var(--ink3)", fontStyle:"italic",
                        lineHeight:1.6 }}>"{t.text}"</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                      <button className="btn-text" style={{ fontSize:12 }}
                        onClick={() => startEdit(t)}>✏️ Modifier</button>
                      <button className="btn-text" style={{ fontSize:12 }}
                        onClick={() => toggleTesti(t)}>
                        {t.actif === false ? "▶ Afficher" : "⏸ Masquer"}
                      </button>
                      <button className="btn-text" style={{ fontSize:12, color:"#c0392b" }}
                        onClick={() => deleteTesti(t.id)}>🗑 Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ ONGLET CODES PROMO ═══════════════ */}
        {adminTab === "promos" && (() => {
          // Composant interne pour gérer son propre state
          return <PromoTab/>;
        })()}

                {/* ═══════════════ ONGLET PARAMÈTRES ═══════════════ */}
        {adminTab === "settings" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* ── Changer le mot de passe ── */}
            <div style={{ background:"#fff", border:"1.5px solid var(--border)",
              borderRadius:12, padding:"20px 18px" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>
                🔒 Changer le mot de passe admin
              </div>
              <div style={{ fontSize:12, color:"var(--ink4)", marginBottom:16 }}>
                Mot de passe actuel par défaut : <strong>cvtools2026</strong>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:400 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
                    Mot de passe actuel *
                  </div>
                  <input type="password" className="field" style={{ margin:0 }}
                    placeholder="Votre mot de passe actuel"
                    value={pwdCurrent}
                    onChange={e => setPwdCurrent(e.target.value)}/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
                    Nouveau mot de passe *
                  </div>
                  <input type="password" className="field" style={{ margin:0 }}
                    placeholder="Minimum 6 caractères"
                    value={pwdNew}
                    onChange={e => setPwdNew(e.target.value)}/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
                    Confirmer le nouveau mot de passe *
                  </div>
                  <input type="password" className="field" style={{ margin:0 }}
                    placeholder="Répétez le nouveau mot de passe"
                    value={pwdConfirm}
                    onChange={e => setPwdConfirm(e.target.value)}/>
                </div>
                {pwdMsg && (
                  <div style={{ fontSize:13, fontWeight:600, padding:"9px 14px", borderRadius:8,
                    background: pwdMsg.startsWith("✓") ? "rgba(5,150,105,0.08)" : "#fdf0ee",
                    color:      pwdMsg.startsWith("✓") ? "#059669" : "#c0392b",
                    border:     "1px solid " + (pwdMsg.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(192,57,43,0.2)") }}>
                    {pwdMsg}
                  </div>
                )}
                <button className="btn-main" style={{ fontSize:13, padding:"10px 20px",
                  alignSelf:"flex-start" }}
                  onClick={async () => {
                    if (!pwdCurrent) { setPwdMsg("⚠ Entrez votre mot de passe actuel."); return; }
                    const currentOk = await getAdminPwd();
                    if (pwdCurrent !== currentOk) { setPwdMsg("⚠ Mot de passe actuel incorrect."); return; }
                    if (pwdNew.length < 6) { setPwdMsg("⚠ Minimum 6 caractères."); return; }
                    if (pwdNew !== pwdConfirm) { setPwdMsg("⚠ Les mots de passe ne correspondent pas."); return; }
                    await updateConfig("admin_pwd", pwdNew);
                    setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
                    setPwdMsg("✓ Mot de passe changé avec succès !");
                    setTimeout(() => setPwdMsg(""), 4000);
                  }}>
                  🔒 Changer le mot de passe
                </button>
              </div>
            </div>

            {/* ── Message d'annonce landing ── */}
            <div style={{ background:"#fff", border:"1.5px solid var(--border)",
              borderRadius:12, padding:"20px 18px" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>
                📢 Message d'annonce
              </div>
              <div style={{ fontSize:12, color:"var(--ink4)", marginBottom:16 }}>
                Affiché en bandeau sur la landing page. Laissez vide pour désactiver.
              </div>
              <textarea className="field" rows={3} style={{ margin:0, resize:"vertical", maxWidth:500 }}
                placeholder="Ex : 🎉 Promotion -50% ce week-end ! Code : PROMO50"
                value={announce}
                onChange={e => setAnnounce(e.target.value)}/>
              {announceMsg && (
                <div style={{ marginTop:8, fontSize:13, fontWeight:600, color:"#059669" }}>
                  {announceMsg}
                </div>
              )}
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button className="btn-main" style={{ fontSize:13, padding:"9px 20px" }}
                  onClick={async () => {
                    await updateConfig("announce", announce);
                    setAnnounceMsg("✓ Message enregistré !");
                    setTimeout(() => setAnnounceMsg(""), 3000);
                  }}>
                  💾 Enregistrer
                </button>
                {announce && (
                  <button className="btn-line" style={{ fontSize:13 }}
                    onClick={async () => {
                      setAnnounce("");
                      await updateConfig("announce", "");
                      setAnnounceMsg("✓ Message supprimé.");
                      setTimeout(() => setAnnounceMsg(""), 3000);
                    }}>
                    🗑 Supprimer l'annonce
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

/* ─── TESTIMONIALS SLIDER ─── */

/* ─── PROMO TAB ─── */
function PromoTab() {
  const [codes,   setCodes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(null);
  const [msg,     setMsg]     = useState("");
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState({ code:"", type:"pourcentage", valeur:"", usageMax:"", expiration:"" });

  useEffect(() => { loadCodes(); }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const j = await sheetsGet("getCodesPromo");
      if (j.data) setCodes(j.data);
    } catch(e) { console.warn(e); }
    finally { setLoading(false); }
  };

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const handleSave = async () => {
    if (!form.code.trim() || !form.valeur) { showMsg("\u26a0 Code et valeur requis."); return; }
    setSaving("saving");
    if (editId) {
      await sheetsPostResp({ action:"updateCodePromo", id:editId, code:form.code.toUpperCase().trim(),
        type:form.type, valeur:parseFloat(form.valeur), usageMax:parseInt(form.usageMax)||0, expiration:form.expiration||"" });
      showMsg("\u2713 Code modifi\xe9 !");
      setEditId(null);
    } else {
      await sheetsPost({ action:"addCodePromo", code:form.code.toUpperCase().trim(),
        type:form.type, valeur:parseFloat(form.valeur), usageMax:parseInt(form.usageMax)||0, expiration:form.expiration||"" });
      showMsg("\u2713 Code cr\xe9\xe9 !");
    }
    await loadCodes();
    setForm({ code:"", type:"pourcentage", valeur:"", usageMax:"", expiration:"" });
    setSaving(null);
  };

  const toggleCode = async (code) => {
    setSaving(code.id);
    await sheetsPostResp({ action:"updateCodePromo", id:code.id, actif:!code.actif });
    await loadCodes(); setSaving(null);
    showMsg(code.actif ? "\u2713 D\xe9sactiv\xe9" : "\u2713 Activ\xe9");
  };

  const resetCount = async (code) => {
    setSaving(code.id);
    await sheetsPostResp({ action:"updateCodePromo", id:code.id, usageCount:0 });
    await loadCodes(); setSaving(null);
    showMsg("\u2713 Compteur remis \xe0 z\xe9ro");
  };

  const deleteCode = async (id) => {
    if (!window.confirm("Supprimer ce code ?")) return;
    setSaving(id);
    await sheetsPostResp({ action:"deleteCodePromo", id });
    await loadCodes(); setSaving(null);
  };

  const F = { margin:0, width:"100%", padding:"9px 12px", border:"1.5px solid var(--border)",
    borderRadius:8, fontSize:13, fontFamily:"inherit", background:"#fff", boxSizing:"border-box" };

  return (
    <div>
      {msg && (
        <div style={{ marginBottom:14, padding:"10px 14px", borderRadius:8, fontSize:13, fontWeight:600,
          background: msg.startsWith("\u26a0") ? "#fdf0ee" : "rgba(5,150,105,0.08)",
          color:      msg.startsWith("\u26a0") ? "#c0392b" : "#059669",
          border:"1px solid " + (msg.startsWith("\u26a0") ? "rgba(192,57,43,0.2)" : "rgba(5,150,105,0.2)") }}>
          {msg}
        </div>
      )}
      <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12,
        padding:"18px 16px", marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:14 }}>
          {editId ? "\u270f\ufe0f Modifier le code" : "\u2795 Cr\xe9er un code promo"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>Code *</div>
            <input style={F} placeholder="Ex : NOEL2026" value={form.code}
              onChange={e => setForm(f => ({...f, code:e.target.value.toUpperCase()}))}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>Type *</div>
            <select style={F} value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))}>
              <option value="pourcentage">Pourcentage (%)</option>
              <option value="fixe">Montant fixe (FCFA)</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
              Valeur * {form.type==="pourcentage" ? "(ex: 50 = -50%)" : "(ex: 100 = -100 FCFA)"}
            </div>
            <input style={F} type="number" placeholder="50" value={form.valeur}
              onChange={e => setForm(f => ({...f, valeur:e.target.value}))}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
              Utilisations max (0 = illimit\xe9)
            </div>
            <input style={F} type="number" placeholder="0" value={form.usageMax}
              onChange={e => setForm(f => ({...f, usageMax:e.target.value}))}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
              Date d'expiration (optionnel)
            </div>
            <input style={F} type="date" value={form.expiration}
              onChange={e => setForm(f => ({...f, expiration:e.target.value}))}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <button className="btn-main" style={{ fontSize:13, padding:"9px 20px" }}
            disabled={saving==="saving"} onClick={handleSave}>
            {saving==="saving" ? "..." : editId ? "\U0001f4be Enregistrer" : "\u2795 Cr\xe9er le code"}
          </button>
          {editId && (
            <button className="btn-line" style={{ fontSize:13 }}
              onClick={() => { setEditId(null); setForm({ code:"", type:"pourcentage", valeur:"", usageMax:"", expiration:"" }); }}>
              Annuler
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign:"center", padding:32, color:"var(--ink4)" }}>Chargement...</div>
      ) : codes.length === 0 ? (
        <div style={{ textAlign:"center", padding:32, color:"var(--ink4)", fontSize:13 }}>
          Aucun code promo — cr\xe9ez-en un ci-dessus.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {codes.map(code => (
            <div key={code.id} style={{ background:"#fff",
              border:"1.5px solid " + (code.actif ? "rgba(5,150,105,0.3)" : "var(--border)"),
              borderRadius:12, padding:"14px 16px",
              opacity: saving===code.id ? 0.6 : 1, transition:"all 0.2s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:6 }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700,
                  background:"var(--cream)", padding:"2px 10px", borderRadius:6,
                  border:"1px solid var(--border)" }}>{code.code}</span>
                <span style={{ fontSize:12, fontWeight:700, padding:"2px 8px", borderRadius:10,
                  background:"rgba(37,99,235,0.1)", color:"#2563eb" }}>
                  {code.type==="pourcentage" ? "-"+code.valeur+"%" : "-"+code.valeur+" FCFA"}
                </span>
                <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, fontWeight:700,
                  background: code.actif ? "rgba(5,150,105,0.1)" : "#f5f5f5",
                  color: code.actif ? "#059669" : "#999" }}>
                  {code.actif ? "\u25cf ACTIF" : "\u25cb INACTIF"}
                </span>
                <span style={{ fontSize:11, color:"var(--ink4)", marginLeft:4 }}>
                  {parseInt(code.usageMax)===0 ? "Illimit\xe9" : (code.usageCount||0)+"/"+code.usageMax+" util."}
                  {code.expiration ? " · exp. "+code.expiration : ""}
                </span>
                <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                  <button className="btn-text" style={{ fontSize:12 }}
                    onClick={() => { setEditId(code.id); setForm({ code:code.code, type:code.type, valeur:String(code.valeur), usageMax:String(code.usageMax||0), expiration:code.expiration||"" }); }}>
                    \u270f\ufe0f
                  </button>
                  <button className="btn-text" style={{ fontSize:12 }} onClick={() => toggleCode(code)}>
                    {code.actif ? "\u23f8" : "\u25b6"}
                  </button>
                  {(parseInt(code.usageCount)||0) > 0 && (
                    <button className="btn-text" style={{ fontSize:12 }} onClick={() => resetCount(code)}>\u21ba</button>
                  )}
                  <button className="btn-text" style={{ fontSize:12, color:"#c0392b" }} onClick={() => deleteCode(code.id)}>\U0001f5d1</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop:20, background:"rgba(184,92,56,0.05)", border:"1px solid rgba(184,92,56,0.15)",
        borderRadius:10, padding:"14px 16px", fontSize:12, color:"var(--ink3)", lineHeight:1.7 }}>
        <strong style={{ color:"var(--terra)" }}>Tarifs de base :</strong>
        {"  CV seul \u2192 300 FCFA  \xb7  Lettre seule \u2192 200 FCFA  \xb7  CV + Lettre \u2192 400 FCFA"}
      </div>
    </div>
  );
}

function TestimonialsSlider({ testimonials }) {
  const [idx,     setIdx]     = useState(0);
  const [animDir, setAnimDir] = useState("right"); // "right" | "left"
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  const goTo = (next, dir) => {
    setVisible(false);
    setAnimDir(dir);
    setTimeout(() => {
      setIdx(next);
      setVisible(true);
    }, 280);
  };

  const next = () => goTo((idx + 1) % testimonials.length, "right");
  const prev = () => goTo((idx - 1 + testimonials.length) % testimonials.length, "left");

  // Défilement automatique toutes les 4 secondes
  useEffect(() => {
    timerRef.current = setInterval(() => next(), 4000);
    return () => clearInterval(timerRef.current);
  }, [idx]);

  const t = testimonials[idx];

  return (
    <div style={{ marginBottom:48 }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:600,
        color:"var(--ink)", textAlign:"center", marginBottom:24 }}>
        Ils ont créé leur CV avec CVtools
      </h2>

      <div style={{ position:"relative", maxWidth:480, margin:"0 auto" }}>
        {/* Carte */}
        <div style={{
          background:"#fff", border:"1.5px solid var(--border)", borderRadius:16,
          padding:"28px 32px", textAlign:"center", minHeight:140,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateX(0) scale(1)" : animDir === "right" ? "translateX(30px) scale(0.97)" : "translateX(-30px) scale(0.97)",
          transition:"opacity 0.28s ease, transform 0.28s ease",
          boxShadow:"0 4px 24px rgba(28,24,18,0.07)",
        }}>
          <div style={{ fontSize:28, color:"var(--terra)", marginBottom:12, lineHeight:1 }}>❝</div>
          <div style={{ fontSize:14, color:"var(--ink3)", lineHeight:1.75,
            fontStyle:"italic", marginBottom:16 }}>
            {t.text}
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{t.name}</div>
          <div style={{ fontSize:11.5, color:"var(--ink4)", marginTop:3 }}>{t.role}</div>
        </div>

        {/* Boutons prev / next */}
        <button onClick={() => { clearInterval(timerRef.current); prev(); }}
          style={{ position:"absolute", left:-18, top:"50%", transform:"translateY(-50%)",
            width:36, height:36, borderRadius:"50%", border:"1.5px solid var(--border)",
            background:"#fff", cursor:"pointer", fontSize:16, display:"flex",
            alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)", color:"var(--ink3)" }}>
          ‹
        </button>
        <button onClick={() => { clearInterval(timerRef.current); next(); }}
          style={{ position:"absolute", right:-18, top:"50%", transform:"translateY(-50%)",
            width:36, height:36, borderRadius:"50%", border:"1.5px solid var(--border)",
            background:"#fff", cursor:"pointer", fontSize:16, display:"flex",
            alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)", color:"var(--ink3)" }}>
          ›
        </button>
      </div>

      {/* Indicateurs points */}
      <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:16 }}>
        {testimonials.map((_, i) => (
          <button key={i} onClick={() => { clearInterval(timerRef.current); goTo(i, i > idx ? "right" : "left"); }}
            style={{ width: i===idx ? 20 : 8, height:8, borderRadius:4, border:"none",
              cursor:"pointer", transition:"all 0.3s",
              background: i===idx ? "var(--terra)" : "var(--border)" }}/>
        ))}
      </div>
    </div>
  );
}

function AnnounceBanner() {
  const [msg, setMsg] = useState("");
  useEffect(() => { getAnnounce().then(setMsg); }, []);
  if (!msg) return null;
  return (
    <div style={{ background:"var(--terra)", color:"#fff", textAlign:"center",
      padding:"10px 20px", fontSize:13, fontWeight:600, letterSpacing:"0.2px" }}>
      {msg}
    </div>
  );
}

function LandingPage({ onStartCV, onStartLetter }) {
  const [showFAQ, setShowFAQ]   = useState(false);
  const [showAssist, setShowAssist] = useState(false);
  const [showCGU, setShowCGU]   = useState(false);

  // ── Typing effect ──
  const PHRASES = [
    "Créez votre CV professionnel en 5 minutes",
    "Décrochez l'emploi de vos rêves",
    "20 modèles · Téléchargement instantané",
    "Compatible avec tous les logiciels de recrutement",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typed, setTyped]         = useState("");
  const [deleting, setDeleting]   = useState(false);
  const [typePause, setTypePause] = useState(false);
  useEffect(() => {
    const full = PHRASES[phraseIdx];
    if (typePause) {
      const t = setTimeout(() => { setDeleting(true); setTypePause(false); }, 2200);
      return () => clearTimeout(t);
    }
    if (!deleting) {
      if (typed.length < full.length) {
        const t = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), 42);
        return () => clearTimeout(t);
      } else {
        setTypePause(true);
      }
    } else {
      if (typed.length > 0) {
        const t = setTimeout(() => setTyped(typed.slice(0, -1)), 22);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setPhraseIdx(i => (i + 1) % PHRASES.length);
      }
    }
  }, [typed, deleting, typePause, phraseIdx]);

  const [cguDone, setCguDone] = useState(() => {
    try { return !!localStorage.getItem("cvtools_cgu"); } catch(e) { return false; }
  });
  const [cguChecked, setCguChecked] = useState(false);
  const [cguShake,   setCguShake]   = useState(false);
  const [cguAnchor,  setCguAnchor]  = useState("top"); // "top" | "bottom"
  const [showCguPopup, setShowCguPopup] = useState(false);

  const triggerCGU = (anchor) => {
    setCguAnchor(anchor);
    setShowCguPopup(true);
    setCguShake(true);
    setTimeout(() => setCguShake(false), 500);
  };

  const acceptCGU = () => {
    if (!cguChecked) { setCguShake(true); setTimeout(()=>setCguShake(false),500); return; }
    try { localStorage.setItem("cvtools_cgu","1"); } catch(e) {}
    setCguDone(true);
    setShowCguPopup(false);
    setCguDone(true);
  };

  const features = [
    { icon:"✦", title:"20 Modèles", desc:"10 Design + 10 ATS optimisés" },
    { icon:"📱", title:"Mobile-friendly", desc:"Fonctionne sur smartphone" },
    { icon:"⬇", title:"Export PDF", desc:"Téléchargement instantané" },
    { icon:"✓", title:"ATS Ready", desc:"Passe les filtres recruteurs" },
  ];

  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS.filter(t => t.actif !== false));
  useEffect(() => {
    sheetsGet("getTemoignages").then(j => {
      if (j.data) setTestimonials(j.data.filter(t => t.actif !== false));
    }).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)" }}>
      {showCGU && <CGUModal onClose={()=>setShowCGU(false)}/>}

      {/* Bandeau annonce */}
      <AnnounceBanner/>

      {/* Hero */}
      <div className="land-hero">
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 30% 50%,rgba(184,92,56,0.15),transparent 60%)", pointerEvents:"none" }}/>
        <div style={{ position:"relative", maxWidth:600, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
            <Logo size={56}/>
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(28px,8vw,46px)", fontWeight:700,
            color:"#fff", fontStyle:"italic", marginBottom:12, lineHeight:1.1 }}>
            CVtools
          </h1>
          <p style={{ fontSize:"clamp(14px,4vw,17px)", color:"rgba(255,255,255,0.85)",
            marginBottom:32, minHeight:"1.5em", letterSpacing:"0.1px" }}>
            {typed}
            <span style={{ display:"inline-block", width:2, height:"1em",
              background:"rgba(255,255,255,0.7)", marginLeft:2, verticalAlign:"middle",
              animation:"pulse 0.9s ease infinite" }}/>
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <button className="btn-main" style={{ fontSize:15, padding:"14px 36px" }} onClick={()=>{
              if(!cguDone){ triggerCGU("top"); return; }
              onStartCV();
            }}>
              📄 Créer mon CV
            </button>
            <button style={{ fontSize:15, padding:"14px 36px", borderRadius:8, border:"2px solid rgba(255,255,255,0.5)",
              background:"transparent", color:"#fff", fontWeight:700, cursor:"pointer",
              fontFamily:"inherit", transition:"all 0.2s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.12)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
              onClick={()=>{
                if(!cguDone){ triggerCGU("top"); return; }
                onStartLetter();
              }}>
              ✉ Créer ma lettre
            </button>
          </div>
          <div style={{ marginTop:16, fontSize:12, color:"rgba(255,255,255,0.3)" }}>
            vos données restent sur votre appareil
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth:700, margin:"0 auto", padding:"clamp(28px,6vw,48px) var(--pad-x)" }}>
        <div className="stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:16, marginBottom:48 }}>
          {features.map((f,i) => (
            <div key={i} className="land-card" style={{ textAlign:"center", padding:24, cursor:"default" }}>
              <div style={{ fontSize:32, marginBottom:10, display:"block",
                animation:`popIn 0.5s cubic-bezier(0.16,1,0.3,1) ${0.1+i*0.08}s both` }}>{f.icon}</div>
              <div style={{ fontWeight:700, fontSize:14, color:"var(--ink)", marginBottom:4 }}>{f.title}</div>
              <div style={{ fontSize:12, color:"var(--ink4)" }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Testimonials — Diaporama */}
        <TestimonialsSlider testimonials={testimonials}/>

        {/* CTA */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <button className="btn-main" style={{ fontSize:14, padding:"13px 32px" }} onClick={()=>{
              if(!cguDone){ triggerCGU("bottom"); return; }
              onStartCV();
            }}>
              📄 Créer mon CV →
            </button>
            <button className="btn-line" style={{ fontSize:14, padding:"13px 32px" }} onClick={()=>{
              if(!cguDone){ triggerCGU("bottom"); return; }
              onStartLetter();
            }}>
              ✉ Créer ma lettre →
            </button>
          </div>
        </div>

        {/* FAQ & Assist */}
        <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:32 }}>
          <button className="btn-line" onClick={() => setShowFAQ(!showFAQ)}>
            {showFAQ ? "Masquer la FAQ" : "❓ FAQ"}
          </button>
          <button className="btn-line" onClick={() => setShowAssist(!showAssist)}>
            💬 Assistance
          </button>
        </div>

        {showFAQ && (
          <div className="fadeup" style={{ marginBottom:32 }}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, marginBottom:14 }}>Questions fréquentes</h3>
            <FAQ/>
          </div>
        )}

        {showAssist && (
          <div className="fadeup" style={{ background:"#fff", border:"1.5px solid var(--border)",
            borderRadius:10, padding:24, marginBottom:32 }}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, marginBottom:14 }}>Assistance CVtools</h3>
            <p style={{ fontSize:13.5, color:"var(--ink3)", lineHeight:1.7, marginBottom:16 }}>
              Vous avez une question ou un problème ? Notre équipe vous répond sur WhatsApp.
            </p>
            <a href="https://wa.me/22667645563?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20avec%20CVtools"
              target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:8,
                background:"#25D366", color:"#fff", padding:"11px 20px",
                borderRadius:6, textDecoration:"none", fontSize:13, fontWeight:600 }}>
              <span>💬</span> Contacter sur WhatsApp
            </a>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:"center", padding:"20px 0", borderTop:"1px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:8 }}>
            <Logo size={16}/>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:12, fontStyle:"italic", color:"var(--ink4)", cursor:"pointer", userSelect:"none" }}
              onClick={() => { window._adminClicks = (window._adminClicks||0) + 1; if(window._adminClicks >= 5){ window._adminClicks=0; window._adminCb && window._adminCb(); } }}>
              lawalitoe
            </span>
          </div>
          <div style={{ fontSize:10, color:"var(--ink4)", letterSpacing:"1px", textTransform:"uppercase" }}>
            CVtools · {new Date().getFullYear()}
          </div>
          <button className="btn-text" style={{ fontSize:11, color:"var(--ink4)", marginTop:6, textDecoration:"underline", background:"none", border:"none", cursor:"pointer" }}
            onClick={()=>setShowCGU(true)}>
            Conditions Générales d'Utilisation
          </button>
        </div>
      </div>
      {/* ── CGU Popup ancré haut ou bas selon le bouton cliqué ── */}
      {showCguPopup && !cguDone && (
        <div style={{
          position:"fixed",
          top:    cguAnchor === "top"    ? 0      : "auto",
          bottom: cguAnchor === "bottom" ? 0      : "auto",
          left:0, right:0, zIndex:9000,
          background: cguAnchor === "top"
            ? "linear-gradient(to bottom, rgba(28,24,18,0.95), transparent)"
            : "linear-gradient(to top, rgba(28,24,18,0.95), transparent)",
          padding: cguAnchor === "top" ? "20px 20px 40px" : "40px 20px 20px",
          display:"flex",
          alignItems: cguAnchor === "top" ? "flex-start" : "flex-end",
          justifyContent:"center",
          animation:"fadeIn 0.25s ease",
          pointerEvents:"none"
        }}>
          <div style={{
            background:"#fff", borderRadius:16, padding:"20px",
            maxWidth:400, width:"100%",
            boxShadow:"0 8px 32px rgba(0,0,0,0.25)",
            animation: cguAnchor === "top"
              ? "slideDown 0.3s cubic-bezier(0.16,1,0.3,1) both"
              : "fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
            pointerEvents:"all"
          }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)",
              marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>📋</span>
              Acceptez les CGU pour continuer
            </div>

            <label style={{ display:"flex", alignItems:"flex-start", gap:10,
              cursor:"pointer", padding:"12px 14px",
              background: cguChecked ? "rgba(184,92,56,0.06)" : "var(--cream2)",
              borderRadius:10, border:"1.5px solid",
              borderColor: cguChecked ? "var(--terra)" : "var(--border)",
              transition:"all 0.2s", marginBottom:12,
              animation: cguShake ? "shake 0.4s ease" : "none"
            }}>
              <input type="checkbox" checked={cguChecked}
                onChange={e => setCguChecked(e.target.checked)}
                style={{ width:17, height:17, marginTop:2,
                  accentColor:"var(--terra)", cursor:"pointer", flexShrink:0 }}/>
              <span style={{ fontSize:12.5, color:"var(--ink3)", lineHeight:1.6 }}>
                J'accepte les{" "}
                <span style={{ color:"var(--terra)", textDecoration:"underline",
                  fontWeight:600, cursor:"pointer" }}
                  onClick={e=>{e.stopPropagation(); setShowCguPopup(false); setShowCGU(true);}}>
                  CGU
                </span>
                {" "}et le traitement de mes données sur cet appareil.
              </span>
            </label>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowCguPopup(false)}
                style={{ flex:1, padding:"10px", fontSize:13, borderRadius:8,
                  border:"1.5px solid var(--border)", background:"transparent",
                  color:"var(--ink4)", cursor:"pointer", fontFamily:"inherit" }}>
                Plus tard
              </button>
              <button onClick={acceptCGU}
                style={{ flex:2, padding:"10px", fontSize:13, fontWeight:700,
                  border:"none", borderRadius:8, fontFamily:"inherit",
                  cursor: cguChecked ? "pointer" : "not-allowed",
                  background: cguChecked ? "var(--terra)" : "#ddd",
                  color: cguChecked ? "#fff" : "#aaa",
                  transition:"all 0.2s",
                  boxShadow: cguChecked ? "0 3px 12px rgba(184,92,56,0.3)" : "none"
                }}>
                {cguChecked ? "✓ Commencer →" : "Cochez la case d'abord"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ASSISTANCE FLOTTANTE ─── */
function AssistFloat({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ position:"fixed", bottom:24, right:24, width:48, height:48,
        borderRadius:"50%", background:"var(--terra)", color:"#fff", border:"none",
        fontSize:20, cursor:"pointer", boxShadow:"0 4px 16px rgba(184,92,56,0.4)",
        zIndex:500, display:"flex", alignItems:"center", justifyContent:"center",
        transition:"transform 0.2s" }}
      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
      ?
    </button>
  );
}

/* ─── MAIN APP ─── */
export default function App({ initialAction }) {
  const [screen, setScreen] = useState("landing");

  // Démarrage automatique depuis la landing statique
  useEffect(() => {
    if (initialAction === "cv") {
      setMode("cv");
      setScreenDir("forward");
      setScreenKey(k => k+1);
      setScreen("cv-choice");
    } else if (initialAction === "letter") {
      setMode("letter");
      setForm({...INIT, wantLetter:true});
      setScreenDir("forward");
      setScreenKey(k => k+1);
      setScreen("app");
    }
  }, [initialAction]);
  const [adminUnlocked, setAdminUnlocked] = useState(false); // landing | cv-choice | app
  const [mode, setMode] = useState("cv"); // cv | letter
  const [step, setStep]       = useState(0);
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [form, setForm]       = useState(() => {
    // Restore from localStorage if available
    try {
      const saved = localStorage.getItem("cvtools_draft");
      if (saved) {
        const data = JSON.parse(saved);
        if (data._cvtools_draft) return { ...INIT, ...data };
      }
    } catch(e) {}
    return INIT;
  });
  const [animKey, setAnimKey]     = useState(0);
  const [animDir, setAnimDir]     = useState("forward");
  const [screenDir, setScreenDir] = useState("forward"); // forward | backward (entre screens)
  const [screenKey, setScreenKey] = useState(0);         // force re-mount pour animation
  const [showErrors, setShowErrors] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showAssist, setShowAssist] = useState(false);
  const [importedText, setImportedText] = useState(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showLeaveWarn, setShowLeaveWarn] = useState(false);
  const [toast, setToast]       = useState(null); // { msg, type }
  const toastTimer = useRef(null);
  const autoSaveRef = useRef(null);

  const showToast = (msg, type="success") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const addRipple = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size/2;
    const y = e.clientY - rect.top - size/2;
    const wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.style.position = "relative";
    btn.style.overflow = "hidden";
    btn.appendChild(wave);
    wave.addEventListener("animationend", () => wave.remove());
  };
  const citation = CITATIONS[step % CITATIONS.length];

  // Auto-save avec toast + timestamp
  useEffect(() => {
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      try {
        localStorage.setItem("cvtools_draft", JSON.stringify({
          ...form, _cvtools_draft:true, _savedAt: Date.now()
        }));
        if (screen === "app") showToast("Brouillon sauvegardé ✓");
      } catch(e) {}
    }, 8000); // 8s après dernière modif
    return () => clearTimeout(autoSaveRef.current);
  }, [form]);

  // ── History / bouton retour appareil ──────────────────────────────────────
  // Stratégie : chaque écran/étape pushState une entrée.
  // popstate lit l'état de DESTINATION (pile[n-1]) et sync React dessus.
  // On ignore les popstate qui ne viennent pas de nous.

  const historyReady = useRef(false);

  // Au montage : remplacer l'entrée courante avec landing, puis push cv-choice si besoin
  useEffect(() => {
    window.history.replaceState({ _cv: true, screen: "landing", step: 0 }, "");
    historyReady.current = true;
  }, []);

  // Quand screen/step changent par navigation avant → push
  const prevNav = useRef({ screen: "landing", step: 0 });
  useEffect(() => {
    if (!historyReady.current) return;
    const prev = prevNav.current;
    // Seulement push si c'est une navigation AVANT (pas déclenchée par popstate)
    if (!window.history.state?._fromPop) {
      window.history.pushState({ _cv: true, screen, step }, "");
    }
    prevNav.current = { screen, step };
  }, [screen, step]);

  useEffect(() => {
    const handlePop = (e) => {
      const st = e.state;
      if (!st?._cv) return; // entrée étrangère, ignorer
      // Marquer que ce changement vient d'un pop
      window.history.replaceState({ ...st, _fromPop: true }, "");
      // Sync React sur l'état de destination
      if (st.screen === "landing") {
        setScreenDir("backward"); setScreenKey(k=>k+1); setScreen("landing");
      } else if (st.screen === "cv-choice") {
        setScreenDir("backward"); setScreenKey(k=>k+1); setScreen("cv-choice");
      } else if (st.screen === "app") {
        setScreenDir("forward"); setScreenKey(k=>k+1); setScreen("app");
        setAnimDir("backward");
        setAnimKey(k => k + 1);
        setStep(st.step);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setPwaInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installPWA = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === "accepted") setPwaInstalled(true);
    setPwaPrompt(null);
  };

  // Warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (screen === "app" && step > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [screen, step]);

  // Accès admin secret : 5 clics sur "lawalitoe" dans le footer
  useEffect(() => {
    window._adminCb = () => {
      const pwd = window.prompt("Code admin :");
      getAdminPwd().then(adminPwd => {
        if (pwd === adminPwd) { setAdminUnlocked(true); setScreen("admin"); }
        else { window.alert("Mot de passe incorrect."); }
      });
    };
    return () => { delete window._adminCb; };
  }, []);

  const ACTIVE_STEPS = mode === "letter" ? STEPS_LETTER : mode === "cv+letter" ? STEPS_CV_LETTER : STEPS;
  const isLast  = step === ACTIVE_STEPS.length - 1;
  const isFirst = step === 0;
  const progress = Math.round((step / (ACTIVE_STEPS.length - 1)) * 100);


  const validate = () => {
    const id = ACTIVE_STEPS[step].id;
    if (id === "profile")
      return form.firstName.trim() && form.lastName.trim() && form.title.trim() && form.email.trim() && form.phone.trim();
    if (id === "experience")
      return form.experiences.length === 0 || form.experiences.every(e => e.company.trim() && e.role.trim() && e.start.trim() && e.description.trim());
    if (id === "education")
      return form.education.every(e => e.school.trim() && e.degree.trim() && e.field.trim());
    return true;
  };

  const ERRORS = {
    profile:    "Veuillez remplir les champs obligatoires : Prénom, Nom, Titre, Email et Téléphone.",
    experience: "Chaque expérience doit avoir : Entreprise, Poste, Début et Description.",
    education:  "Chaque formation doit avoir : Établissement, Diplôme et Domaine.",
  };

  const goNext = () => {
    if (!validate()) { setShowErrors(true); return; }
    setShowErrors(false);
    setAnimDir("forward");
    setStep(s => s + 1);
    setAnimKey(k => k + 1);
    window.scrollTo(0, 0);
  };
  const goPrev = () => {
    setShowErrors(false);
    setAnimDir("backward");
    setStep(s => s - 1);
    setAnimKey(k => k + 1);
    window.scrollTo(0, 0);
  };

  const restart = () => {
    setForm(INIT);
    setStep(0);
    setMode("cv");
    setAnimKey(k => k + 1);
    setShowErrors(false);
    localStorage.removeItem("cvtools_draft");
  };

  const skipStep = useCallback(() => {
    setShowErrors(false);
    setStep(s => s + 1);
    setAnimKey(k => k + 1);
    window.scrollTo(0, 0);
  }, []);

  const CONTENT = {
    profile:    <StepProfile    form={form} setForm={setForm} showErrors={showErrors} importedText={importedText}/>,
    experience: <StepExp        form={form} setForm={setForm} showErrors={showErrors} onSkip={skipStep}/>,
    education:  <StepEdu        form={form} setForm={setForm} showErrors={showErrors}/>,
    extras:     <StepExtras     form={form} setForm={setForm}/>,
    references: <StepReferences form={form} setForm={setForm} onSkip={skipStep}/>,
    template:   <StepTemplate   form={form} setForm={setForm}/>,
    result:     <StepResult     form={form} onRestart={restart}
                  onAddLetter={() => {
                    // Pré-remplir lettre depuis données CV
                    const today = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
                    const subj = form.title ? `Candidature au poste de ${form.title}` : "";
                    setForm(f => ({
                      ...f,
                      wantLetter: true,
                      letterSubject: f.letterSubject || subj,
                      signatureDate: f.signatureDate || today,
                      signatureCity: f.signatureCity || f.location?.split(",")[0] || "",
                    }));
                    setMode("cv+letter");
                    // Aller directement à l'étape lettre (index 6 = letter_only)
                    setAnimDir("forward");
                    setAnimKey(k => k+1);
                    setStep(6);
                    window.scrollTo(0,0);
                  }}/>,
    expediteur:   <StepExpediteur   form={form} setForm={setForm}/>,
    letter_only:  <StepLetterOnly   form={form} setForm={setForm}/>,
    letter_template: <StepLetterTemplate form={form} setForm={setForm}/>,
    result_letter:   <StepResultLetter  form={form} onRestart={restart}/>,
    result_combo:    <StepResultCombo   form={form} onRestart={restart}/>,
  };

  const cur = ACTIVE_STEPS[step];
  const firstName = form.firstName || "vous";

  if (screen === "admin" && adminUnlocked) {
    return (
      <>
        <style>{CSS}</style>
        <AdminDashboard onBack={() => setScreen("landing")}/>
      </>
    );
  }

  if (screen === "landing") {
    return (
      <>
        <style>{CSS}</style>
        <style>{`
          @keyframes slideScreenRight { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
          @keyframes slideScreenLeft  { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
          .screen-forward { animation:slideScreenRight 0.35s cubic-bezier(0.16,1,0.3,1) both; }
          .screen-backward { animation:slideScreenLeft 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        `}</style>
        <div key={`landing-${screenKey}`} className={`${darkMode?"dark":""} ${screenDir==="backward"?"screen-backward":"screen-forward"}`}>
          <LandingPage
            onStartCV={() => { setMode("cv"); setScreenDir("forward"); setScreenKey(k=>k+1); setScreen("cv-choice"); }}
            onStartLetter={() => { setMode("letter"); setForm({...INIT, wantLetter:true}); setScreenDir("forward"); setScreenKey(k=>k+1); setScreen("app"); }}
          />
        </div>
      </>
    );
  }

  if (screen === "cv-choice") {
    return (
      <>
        <style>{CSS}</style>
        <div key={`cvchoice-${screenKey}`} className={`${darkMode?"dark":""} ${screenDir==="backward"?"screen-backward":"screen-forward"}`} style={{ background:"var(--cream)", minHeight:"100vh" }}>
          <CVChoiceScreen
            onNew={() => { setForm(INIT); setStep(0); setScreenDir("forward"); setScreenKey(k=>k+1); setScreen("app"); }}
            onImport={(data) => { setForm({...INIT, ...data}); setStep(0); setScreenDir("forward"); setScreenKey(k=>k+1); setScreen("app"); }}
            onBack={() => { setScreenDir("backward"); setScreenKey(k=>k+1); setScreen("landing"); }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div key={`app-${screenKey}`} className={`${darkMode?"dark":""} ${screenDir==="backward"?"screen-backward":"screen-forward"}`} style={{ background:"var(--cream)", minHeight:"100vh" }}>
        <div className="main-layout" style={{ display:"flex", flexDirection:"column", minHeight:"100vh" }}>

          {/* Horizontal Steps Bar (replaces black sidebar) */}
          <HStepsBar step={step} setStep={setStep} steps={ACTIVE_STEPS} mode={mode}
            darkMode={darkMode} onToggleDark={() => setDarkMode(d=>!d)}
            onNavBack={(i) => { setAnimDir("backward"); setAnimKey(k=>k+1); setStep(i); }}/>

          {/* Zone principale */}
          <div style={{ flex:1, display:"flex", flexDirection:"column" }}>

            {/* En-tête */}
            <div className="main-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
              <div>
                <h1 key={step} style={{ fontFamily:"'Playfair Display',serif", fontSize:26,
                  fontWeight:600, color:"var(--ink)", lineHeight:1.1, letterSpacing:"-0.5px",
                  animation:"slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both" }}>
                  {cur.label}
                  {mode === "cv+letter" && (
                    <span style={{ fontSize:11, fontWeight:600, marginLeft:10,
                      padding:"2px 9px", borderRadius:12, verticalAlign:"middle",
                      background: step >= 6 ? "rgba(184,92,56,0.12)" : "rgba(28,24,18,0.07)",
                      color: step >= 6 ? "var(--terra)" : "var(--ink4)",
                      border: step >= 6 ? "1px solid rgba(184,92,56,0.25)" : "1px solid var(--border)" }}>
                      {step >= 6 ? "✉ Lettre" : "📄 CV"}
                    </span>
                  )}
                </h1>
                {step > 0 && step < STEPS.length - 1 && (
                  <div className="citation hide-mobile" style={{ fontSize:11, color:"var(--ink4)", marginTop:5, fontStyle:"italic" }}>
                    "{citation.text}" — {citation.author}
                  </div>
                )}
              </div>

              {/* Score + progress */}
              <div className="score-hide" style={{ display:"flex", alignItems:"center", gap:16 }}>
                <CVScore form={form}/>
              </div>
            </div>



            {/* Contenu */}
            <div className="main-content" style={{ flex:1, overflowY:"auto" }}>
              <div key={animKey} className={animDir === "backward" ? "slide-back content-inner" : "slide content-inner"}>
                {CONTENT[cur.id]}
              </div>
            </div>

            {/* Nav bar */}
            {/* Nav bar — visible partout, y compris étape résultat */}
            <div style={{ borderTop:"1.5px solid var(--border)", background:"var(--cream2)" }}>
                {!isLast && showErrors && ERRORS[cur.id] && (
                  <div style={{ padding:"10px var(--pad-x)", background:"#fdf0ee",
                    borderBottom:"1px solid rgba(192,57,43,0.15)",
                    display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:14 }}>⚠️</span>
                    <span style={{ fontSize:12.5, color:"#c0392b" }}>{ERRORS[cur.id]}</span>
                  </div>
                )}
                <div className="nav-bar">
                  {!isFirst
                    ? <button className="btn-line" onClick={goPrev} style={{ display:"flex", alignItems:"center", gap:6 }}>‹ Retour</button>
                    : <button className="btn-line" style={{ display:"flex", alignItems:"center", gap:6 }}
                        onClick={() => {
                          const hasData = form.firstName || form.lastName || (form.experiences||[]).length > 0;
                          if (hasData) { setShowLeaveWarn(true); }
                          else { window.history.back(); }
                        }}>‹ Accueil</button>}

                  {!isLast && (
                    <button className="btn-main ripple-container" onClick={(e)=>{ addRipple(e); goNext(); }}
                      style={{ minWidth:140, justifyContent:"center" }}>
                      {step===ACTIVE_STEPS.length-2 ? "Voir mon résultat →" : "Continuer →"}
                    </button>
                  )}
                </div>
            </div>

            {/* Footer */}
            <div className="main-footer">
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Logo size={16}/>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:11,
                  fontStyle:"italic", color:"var(--ink4)" }}>lawalitoe</span>
              </div>
              <div className="footer-right">
                {/* Bouton PWA install */}
                {pwaPrompt && !pwaInstalled && (
                  <button onClick={installPWA}
                    style={{ display:"flex", alignItems:"center", gap:6,
                      background:"var(--ink)", color:"#fff", border:"none",
                      borderRadius:5, padding:"5px 12px", fontSize:11, cursor:"pointer",
                      fontWeight:600 }}>
                    📲 Installer l'appli
                  </button>
                )}
                <button className="btn-text" onClick={restart}
                  style={{ fontSize:12, color:"var(--terra)", fontWeight:600, textDecoration:"none",
                    border:"1px solid var(--terra)", borderRadius:5, padding:"5px 12px" }}>
                  ↺ Recommencer
                </button>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9.5,
                  color:"var(--ink4)", letterSpacing:"1.5px", textTransform:"uppercase" }}>
                  CVtools · {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating assist button */}
        <AssistFloat onClick={() => setShowAssist(!showAssist)}/>

        {/* Assist panel */}
        {showAssist && (
          <div style={{ position:"fixed", bottom:84, right:24, width:320,
            background:"#fff", border:"1.5px solid var(--border)", borderRadius:12,
            boxShadow:"0 8px 32px rgba(0,0,0,0.15)", zIndex:600, maxHeight:"70vh", overflowY:"auto" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:600 }}>
                Assistance
              </div>
              <button className="btn-text" onClick={() => setShowAssist(false)}>×</button>
            </div>
            <div style={{ padding:"16px 20px" }}>
              <p style={{ fontSize:13, color:"var(--ink3)", marginBottom:14, lineHeight:1.6 }}>
                Besoin d'aide ? Consultez la FAQ ou contactez-nous sur WhatsApp.
              </p>
              <FAQ/>
              <div style={{ marginTop:16 }}>
                <a href="https://wa.me/22667645563?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20avec%20CVtools"
                  target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:8,
                    background:"#25D366", color:"#fff", padding:"11px 16px",
                    borderRadius:6, textDecoration:"none", fontSize:13, fontWeight:600 }}>
                  <span>💬</span> WhatsApp Support
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Leave warning — modal de confirmation */}
        {showLeaveWarn && (
          <div style={{ position:"fixed", inset:0, background:"rgba(28,24,18,0.6)",
            backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)",
            zIndex:900, display:"flex", alignItems:"center", justifyContent:"center",
            animation:"fadeIn 0.18s ease both" }}>
            <div style={{ background:"#fff", borderRadius:16, padding:"32px 28px",
              maxWidth:360, width:"90%", textAlign:"center",
              animation:"popIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
              boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(184,92,56,0.1)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:26, margin:"0 auto 16px" }}>📝</div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
                fontWeight:700, color:"var(--ink)", marginBottom:10 }}>
                Quitter la création ?
              </h3>
              <p style={{ fontSize:13.5, color:"var(--ink3)", lineHeight:1.65, marginBottom:24 }}>
                Vos données sont <strong>sauvegardées automatiquement</strong>.<br/>
                Vous pouvez reprendre là où vous en étiez à tout moment.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <button className="btn-main" style={{ justifyContent:"center", width:"100%" }}
                  onClick={() => setShowLeaveWarn(false)}>
                  ✓ Continuer la création
                </button>
                <button className="btn-line" style={{ width:"100%", justifyContent:"center" }}
                  onClick={() => { setScreenDir("backward"); setScreenKey(k=>k+1); setScreen("landing"); setShowLeaveWarn(false); }}>
                  Retourner à l'accueil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast global */}
      {toast && (
        <div className="toast" style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          zIndex:9999, background:"rgba(28,24,18,0.93)", backdropFilter:"blur(10px)",
          border:"1px solid rgba(212,201,181,0.25)", borderRadius:12,
          padding:"11px 22px", display:"flex", alignItems:"center", gap:10,
          boxShadow:"0 8px 32px rgba(0,0,0,0.25)", pointerEvents:"none",
          whiteSpace:"nowrap"
        }}>
          <span style={{ fontSize:16 }}>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span style={{ fontSize:13, color:"#fff", fontWeight:500 }}>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
