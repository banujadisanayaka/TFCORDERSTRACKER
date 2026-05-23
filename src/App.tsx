// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot,
  updateDoc, writeBatch, query, where, getDocs
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// ⚠️ Force-load the JSON database bypassing strict compilers
const recipeData = require("./TFC_Recipes_Database.json");
const RECIPE_DB = recipeData || [];

const itemsData = require("./TFC_Items_Database.json");
const ITEMS_DB = itemsData || [];

/* ═══════════════════════════════════════════════════════════════
   PREMIUM CSS ANIMATIONS & DARK MODE (V8 3D)
═══════════════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900&family=JetBrains+Mono:wght@500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; overflow-x: hidden; background: #04060E; -webkit-tap-highlight-color: transparent; }
  #root { overflow-x: hidden; }

  /* ── Safe-area / notch support ── */
  .safe-area-top { padding-top: env(safe-area-inset-top); }
  .offline-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: #7C1010; color: #FCA5A5; text-align: center; font-size: 12px; font-weight: 700; padding: calc(4px + env(safe-area-inset-top)) 16px 4px; letter-spacing: 0.04em; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .install-banner { position: fixed; bottom: env(safe-area-inset-bottom, 0px); left: 0; right: 0; z-index: 9990; background: rgba(4,6,14,0.97); border-top: 1px solid rgba(0,212,255,0.18); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); padding: 12px 20px; display: flex; align-items: center; gap: 12px; animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulseSoft { 0% { box-shadow: 0 0 0 0 rgba(211, 17, 24, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(211, 17, 24, 0); } 100% { box-shadow: 0 0 0 0 rgba(211, 17, 24, 0); } }
  @keyframes shimmerPulse { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  /* ── 3D Premium: orb float animations ── */
  @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.08)} 66%{transform:translate(-30px,55px) scale(0.96)} }
  @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-80px,55px) scale(1.06)} 66%{transform:translate(80px,-30px) scale(1.10)} }
  @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(35px,45px) scale(1.14)} }
  @keyframes logoGlow { 0%,100%{box-shadow:0 0 0 1px rgba(211,17,24,0.30),0 6px 28px rgba(211,17,24,0.28),0 0 80px rgba(211,17,24,0.10)} 50%{box-shadow:0 0 0 1px rgba(0,212,255,0.35),0 8px 40px rgba(0,212,255,0.28),0 0 110px rgba(0,212,255,0.12)} }
  @keyframes specularDrift { 0%,100%{opacity:1;transform:scaleX(1) translateX(0)} 33%{opacity:0.7;transform:scaleX(0.82) translateX(-4%)} 66%{opacity:0.85;transform:scaleX(0.92) translateX(3%)} }
  @keyframes liquidPulse { 0%,100%{backdrop-filter:blur(44px) brightness(1.12) saturate(1.9)} 50%{backdrop-filter:blur(48px) brightness(1.15) saturate(2.0)} }
  @keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes loadBar { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }
  @keyframes statusPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5} }

  /* ── iOS Liquid Glass card system ── */
  .glass-card {
    background-color: rgba(10,14,30,0.28);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    backdrop-filter: blur(44px) brightness(1.12) saturate(1.9);
    -webkit-backdrop-filter: blur(44px) brightness(1.12) saturate(1.9);
    border: 1px solid transparent;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.55), 0 40px 100px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,212,255,0.04);
    position: relative;
    overflow: hidden;
  }
  /* Gradient border — bright top-left → subtle bottom-right */
  .glass-card::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: inherit; padding: 1px;
    background: linear-gradient(160deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.12) 35%, rgba(255,255,255,0.04) 65%, rgba(0,212,255,0.09) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask-composite: exclude;
    pointer-events: none;
    z-index: 1;
  }
  /* Specular arc — curved light reflection at top */
  .glass-card::after {
    content: '';
    position: absolute;
    top: 0; left: 10%; right: 10%; height: 55%;
    background: radial-gradient(ellipse 75% 45% at 50% 0%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 45%, transparent 70%);
    pointer-events: none;
    border-radius: inherit;
    animation: specularDrift 9s ease-in-out infinite;
    z-index: 1;
  }

  /* ── Grain texture overlay ── */
  .grain::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    opacity: 0.025;
    pointer-events: none;
    z-index: 9998;
  }

  /* ── Role/tile card 3D hover (desktop) ── */
  .role-card { transition: transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.22s ease, border-color 0.18s ease !important; }
  @media (hover: hover) {
    .role-card:hover { transform: translateY(-7px) scale(1.025) !important; }
  }
  .role-card:active { transform: translateY(-2px) scale(0.98) !important; }

  /* ── 3D tilt wrapper ── */
  .tilt-wrap { transform-style: preserve-3d; will-change: transform; }

  /* ── Premium button 3D press ── */
  .btn-3d { transition: transform 0.1s ease, box-shadow 0.1s ease, opacity 0.2s ease !important; }
  .btn-3d:not(:disabled):active { transform: translateY(2px) scale(0.975) !important; box-shadow: 0 1px 4px rgba(211,17,24,0.3) !important; }
  @keyframes shimmerLoad { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes dotBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @keyframes celebrateGlow { 0% { box-shadow: 0 0 5px rgba(9, 115, 83, 0.2); } 50% { box-shadow: 0 0 20px rgba(9, 115, 83, 0.6); } 100% { box-shadow: 0 0 5px rgba(9, 115, 83, 0.2); } }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
  .shake { animation: shake 0.4s ease; }
  
  .animate-fade-up { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; will-change: transform, opacity; }
  .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; will-change: opacity; }
  .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
  
  .skeleton-box { background: linear-gradient(90deg, #111828 0%, #1B2640 50%, #111828 100%); background-size: 200% 100%; animation: shimmerLoad 2s infinite; border-radius: 12px; }
  .celebration-card { border: 2px solid #097353 !important; animation: celebrateGlow 2s infinite ease-in-out; }
  
  .glass-header { position: sticky; top: -20px; z-index: 40; backdrop-filter: blur(36px) brightness(1.08) saturate(1.6); -webkit-backdrop-filter: blur(36px) brightness(1.08) saturate(1.6); background: rgba(4,6,14,0.68); padding: 20px 20px 16px 20px; margin: -20px -20px 16px -20px; border-bottom: 1px solid rgba(211,17,24,0.12); transition: all 0.3s ease; }
  @media (min-width: 768px) { .glass-header { top: -32px; padding: 32px 40px 16px 40px; margin: -32px -40px 16px -40px; } }

  .accordion-content { overflow: hidden; transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease; max-height: 0; opacity: 0; }
  .accordion-content.open { max-height: 1000px; opacity: 1; }

  .cooking-shimmer { background: linear-gradient(90deg, #121A28 0%, #1E2C18 50%, #121A28 100%); background-size: 200% 100%; animation: shimmerPulse 2.5s infinite; }
  .prod-done-glow { background: linear-gradient(90deg, #0E1E18 0%, #162A1E 50%, #0E1E18 100%); background-size: 200% 100%; animation: shimmerPulse 3s infinite; }
  
  .dot { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: currentColor; margin: 0 2px; animation: dotBounce 1.4s infinite ease-in-out both; }
  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  .custom-scrollbar { -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(26,53,88,0.6); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #224070; }

  input:focus, textarea:focus, select:focus { border-color: #00D4FF !important; box-shadow: 0 0 0 3px rgba(0,212,255,0.15) !important; background: #07101C !important; }
  input::placeholder, textarea::placeholder { color: #2A3A58; }
  input, textarea, select { color: #EEF2FF !important; background: #0A1020 !important; }

  /* ── Premium card depth system (V6) ── */
  .packing-card { background: linear-gradient(160deg, #111828 0%, #0D1520 100%); transition: all 0.25s ease; }
  .packing-card-cooking { background: linear-gradient(160deg, #141A12 0%, #0E1810 100%) !important; }
  .packing-card-prod-done { background: linear-gradient(160deg, #0E1A14 0%, #0A1610 100%) !important; }
  .packing-card-packed { background: linear-gradient(160deg, #160E0E 0%, #120A0A 100%) !important; }
  .packing-card-delivered { opacity: 0.55; }

  /* ── Premium action buttons (V6) ── */
  .pack-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #D31118, #8A0B10); color: #fff; border: none; border-radius: 10px; font-weight: 900; font-size: 13px; cursor: pointer; letter-spacing: 0.03em; box-shadow: 0 4px 14px rgba(211,17,24,0.35); transition: all 0.2s ease; font-family: inherit; }
  .pack-btn:hover { box-shadow: 0 6px 20px rgba(211,17,24,0.5); transform: translateY(-1px); }
  .pack-btn:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(211,17,24,0.3); }
  .dispatch-btn { width: 100%; padding: 11px; background: linear-gradient(135deg, #097353, #065A40); color: #fff; border: none; border-radius: 10px; font-weight: 900; font-size: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(9,115,83,0.3); transition: all 0.2s ease; font-family: inherit; }
  .dispatch-btn:hover { box-shadow: 0 6px 20px rgba(9,115,83,0.45); transform: translateY(-1px); }

  /* ── Status accent left border (V6) ── */
  .border-cooking { border-left: 4px solid rgba(232,146,10,0.8) !important; }
  .border-prod-done { border-left: 4px solid rgba(74,222,128,0.7) !important; }
  .border-packed { border-left: 4px solid rgba(211,17,24,0.7) !important; }
  .border-delivered { border-left: 4px solid rgba(136,150,179,0.35) !important; }
  .border-short { border-left: 4px solid rgba(251,176,64,0.7) !important; }
  .border-oos { border-left: 4px solid rgba(252,165,165,0.6) !important; }
  .border-pending { border-left: 4px solid rgba(136,150,179,0.35) !important; }

  /* ── Production queue card (V6) ── */
  .queue-card { background: linear-gradient(145deg, #0F1828 0%, #0C1420 100%); border: 1px solid rgba(232,146,10,0.15); border-left: 4px solid #E8920A; border-radius: 16px; box-shadow: 0 6px 28px rgba(0,0,0,0.5), -2px 0 20px rgba(232,146,10,0.08); margin-bottom: 16px; overflow: hidden; }
  
  /* ── Daily production item (V6/V7) ── */
  .dp-item-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 0; border-bottom: 1px solid rgba(23,32,54,0.8); transition: all 0.2s ease; }
  .dp-item-row:last-child { border-bottom: none; }
  .dp-item-done { opacity: 0.45; }
  .dp-item-done-admin { opacity: 0.8; }
  .dp-item-done .dp-item-name { text-decoration: line-through; color: #4A5A7A !important; }
  [data-theme="light"] .dp-item-done .dp-item-name { color: #64748B !important; }

  /* ── Dot grid overlay ── */
  .dot-grid-fixed {
    position: fixed; inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
    z-index: 1;
  }

  /* ── Status glow on badges ── */
  .badge-glow-cooking  { box-shadow: 0 0 8px rgba(251,176,64,0.55)  !important; }
  .badge-glow-prod_done{ box-shadow: 0 0 8px rgba(74,222,128,0.55)  !important; }
  .badge-glow-packed   { box-shadow: 0 0 8px rgba(211,17,24,0.55)   !important; }
  .badge-glow-short    { box-shadow: 0 0 8px rgba(251,176,64,0.45)  !important; }
  .badge-glow-oos      { box-shadow: 0 0 8px rgba(252,165,165,0.45) !important; }

  /* ── Portal top bar gradient underline ── */
  .portal-bar-shine {
    position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(211,17,24,0.35) 40%, rgba(211,17,24,0.35) 60%, transparent 100%);
    pointer-events: none;
  }

  /* ── Stat card counter animation ── */
  @keyframes countPop { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
  .count-pop { animation: countPop 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }

  /* ═══ Packing Card V8 — depth glow system ═══ */
  .pk-card { border-radius:16px; overflow:hidden; margin-bottom:10px; position:relative; transition:transform 0.2s ease, box-shadow 0.2s ease; }
  @media(hover:hover){ .pk-card:hover { transform:translateY(-2px); } }
  .pk-card:active { transform:translateY(0) !important; }

  .pk-pending   { background:linear-gradient(160deg,rgba(12,18,32,0.32),rgba(8,14,26,0.22)); backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); -webkit-backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); border:1px solid rgba(136,150,179,0.14); box-shadow:-3px 0 0 0 rgba(136,150,179,0.38), 0 4px 22px rgba(0,0,0,0.45); }
  .pk-production{ background:linear-gradient(160deg,rgba(15,19,10,0.32),rgba(10,14,7,0.22)); backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); -webkit-backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); border:1px solid rgba(251,176,64,0.14); box-shadow:-3px 0 0 0 #FBB040, 0 4px 26px rgba(0,0,0,0.45), 0 0 32px rgba(251,176,64,0.08); }
  .pk-prod_done { background:linear-gradient(160deg,rgba(9,20,16,0.32),rgba(6,14,10,0.22)); backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); -webkit-backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); border:1px solid rgba(74,222,128,0.16); box-shadow:-3px 0 0 0 #4ADE80, 0 4px 26px rgba(0,0,0,0.45), 0 0 32px rgba(74,222,128,0.09); }
  .pk-packed    { background:linear-gradient(160deg,rgba(19,8,8,0.32),rgba(14,6,6,0.22)); backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); -webkit-backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); border:1px solid rgba(211,17,24,0.16); box-shadow:-3px 0 0 0 rgba(211,17,24,0.85), 0 4px 26px rgba(0,0,0,0.45), 0 0 30px rgba(211,17,24,0.08); }
  .pk-delivered { background:linear-gradient(160deg,rgba(9,11,20,0.22),rgba(7,9,15,0.15)); backdrop-filter:blur(16px) brightness(1.05) saturate(1.3); -webkit-backdrop-filter:blur(16px) brightness(1.05) saturate(1.3); border:1px solid rgba(255,255,255,0.05); box-shadow:none; opacity:0.5; }
  .pk-short     { background:linear-gradient(160deg,rgba(16,13,6,0.32),rgba(10,9,6,0.22)); backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); -webkit-backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); border:1px solid rgba(232,146,10,0.16); box-shadow:-3px 0 0 0 #E8920A, 0 4px 22px rgba(0,0,0,0.45), 0 0 26px rgba(232,146,10,0.09); }
  .pk-oos       { background:linear-gradient(160deg,rgba(19,10,10,0.32),rgba(14,8,8,0.22)); backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); -webkit-backdrop-filter:blur(20px) brightness(1.08) saturate(1.5); border:1px solid rgba(252,165,165,0.14); box-shadow:-3px 0 0 0 rgba(252,165,165,0.58), 0 4px 22px rgba(0,0,0,0.45); }

  /* Primary pack/dispatch action buttons */
  .pk-pack-btn { width:100%; padding:14px; background:linear-gradient(135deg,#D31118,#8A0B10); color:#fff; border:none; border-radius:12px; font-weight:900; font-size:14px; cursor:pointer; letter-spacing:0.02em; box-shadow:0 4px 20px rgba(211,17,24,0.45), inset 0 1px 0 rgba(255,255,255,0.12); transition:all 0.15s ease; font-family:inherit; }
  .pk-pack-btn:hover { box-shadow:0 6px 28px rgba(211,17,24,0.62), 0 0 0 1px rgba(211,17,24,0.28); transform:translateY(-1px); }
  .pk-pack-btn:active { transform:translateY(1px); box-shadow:0 2px 8px rgba(211,17,24,0.3); }
  .pk-ready-btn { background:linear-gradient(135deg,#16803C,#0F5C2C) !important; box-shadow:0 4px 20px rgba(22,128,60,0.45), inset 0 1px 0 rgba(255,255,255,0.12) !important; }
  .pk-ready-btn:hover { box-shadow:0 6px 28px rgba(22,128,60,0.60), 0 0 0 1px rgba(22,128,60,0.25) !important; }

  .pk-dispatch-btn { width:100%; padding:13px; background:linear-gradient(135deg,#097353,#065A40); color:#fff; border:none; border-radius:12px; font-weight:900; font-size:13px; cursor:pointer; box-shadow:0 4px 18px rgba(9,115,83,0.42), inset 0 1px 0 rgba(255,255,255,0.10); transition:all 0.15s ease; font-family:inherit; }
  .pk-dispatch-btn:hover { box-shadow:0 6px 26px rgba(9,115,83,0.56), 0 0 0 1px rgba(9,115,83,0.22); transform:translateY(-1px); }
  .pk-dispatch-btn:active { transform:translateY(1px); }

  /* Secondary action chips — 44px touch target */
  .pk-chip { flex:1; min-height:44px; padding:9px 6px; border-radius:9px; font-size:11px; font-weight:800; cursor:pointer; font-family:inherit; transition:all 0.15s ease; border:1px solid; text-align:center; white-space:nowrap; display:flex; align-items:center; justify-content:center; }
  .pk-chip:active { transform:scale(0.96); }
  .pk-chip-prod   { color:#B86F06; background:rgba(184,111,6,0.09); border-color:rgba(184,111,6,0.28); }
  .pk-chip-short  { color:#E8920A; background:rgba(232,146,10,0.08); border-color:rgba(232,146,10,0.28); }
  .pk-chip-oos    { color:#DC2626; background:rgba(220,38,38,0.08); border-color:rgba(220,38,38,0.28); }
  .pk-chip-edit   { color:#5A6A8A; background:rgba(90,106,138,0.08); border-color:rgba(90,106,138,0.2); }
  .pk-chip-reset  { color:#5A6A8A; background:rgba(90,106,138,0.08); border-color:rgba(90,106,138,0.2); }
  [data-theme="light"] .pk-chip-prod  { color:#92400E; border-color:rgba(146,64,14,0.35); }
  [data-theme="light"] .pk-chip-short { color:#92400E; border-color:rgba(146,64,14,0.35); }
  [data-theme="light"] .pk-chip-edit  { color:#334155; border-color:rgba(51,65,85,0.25); }
  [data-theme="light"] .pk-chip-reset { color:#334155; border-color:rgba(51,65,85,0.25); }

  /* Cooking shimmer for production state */
  .pk-cooking-state { display:flex; align-items:center; gap:10; padding:11px 14px; border-radius:10px; background:linear-gradient(90deg,#121A08 0%,#1A2410 50%,#121A08 100%); background-size:200% 100%; animation:shimmerPulse 2.5s infinite; border:1px solid rgba(251,176,64,0.15); }

  /* ── Toast: bottom-right slide-in ── */
  @keyframes toastSlideUp { from{opacity:0;transform:translateX(-50%) translateY(24px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  .toast-slide { animation: toastSlideUp 0.38s cubic-bezier(0.16,1,0.3,1) forwards; }
  @keyframes toastSlideRight { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
  .toast-slide-right { animation:toastSlideRight 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }

  /* ── Packing view progress bar ── */
  .pk-progress-track { height:5px; border-radius:99px; overflow:hidden; background:rgba(255,255,255,0.07); margin-top:4px; }
  .pk-progress-fill  { height:5px; border-radius:99px; transition:width 1s cubic-bezier(0.16,1,0.3,1); }

  /* ── Modal glass ── */
  .modal-sheet { background:rgba(7,9,20,0.97); backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px); border:1px solid rgba(255,255,255,0.07); box-shadow:0 24px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06); }

  /* ── Production batch card V2 ── */
  .batch-v2 { background:linear-gradient(160deg,#0D1420,#080E1A); border:1px solid rgba(232,146,10,0.18); border-left:4px solid #E8920A; border-radius:18px; margin-bottom:16px; overflow:hidden; box-shadow:0 6px 30px rgba(0,0,0,0.55), 0 0 40px rgba(232,146,10,0.06); }
  .batch-complete-btn { width:100%; padding:15px; background:linear-gradient(135deg,#097353,#065A40); color:#fff; border:none; border-radius:12px; font-weight:900; font-size:14px; cursor:pointer; letter-spacing:0.02em; box-shadow:0 4px 18px rgba(9,115,83,0.42), inset 0 1px 0 rgba(255,255,255,0.10); transition:all 0.15s ease; font-family:inherit; }
  .batch-complete-btn:hover { box-shadow:0 6px 26px rgba(9,115,83,0.6); transform:translateY(-1px); }
  .batch-complete-btn:active { transform:translateY(1px); }

  /* ── Admin day-tile ── */
  .day-tile { background:linear-gradient(160deg,#0A0C18,#070912); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:16px; margin-bottom:10px; transition:border-color 0.2s; }
  .day-tile-active { border-color:rgba(211,17,24,0.25) !important; }
  .day-tile-empty  { background:transparent; border:2px dashed rgba(255,255,255,0.06) !important; border-radius:12px; padding:14px; text-align:center; margin-bottom:10px; }

  /* ── RecipeCard terminal ── */
  .recipe-terminal { background:#060912; border:1px solid rgba(211,17,24,0.2); border-radius:12px; overflow:hidden; }
  .recipe-terminal-bar { background:rgba(211,17,24,0.08); border-bottom:1px solid rgba(211,17,24,0.15); padding:10px 14px; display:flex; align-items:center; gap:8px; }
  .recipe-terminal-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }

  /* ── Empty state ── */
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 24px; text-align:center; }
  .empty-icon { font-size:52px; margin-bottom:18px; filter:grayscale(0.3) opacity(0.7); }

  /* ── Gradient text ── */
  .gradient-text-red { background:linear-gradient(135deg,#FFFFFF 0%,#FFAAAD 40%,#FF2830 75%,#B80D13 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .gradient-text-amber { background:linear-gradient(135deg,#FFFFFF 0%,#FFD98A 40%,#F59E0B 75%,#C97A05 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .gradient-text-brand { background:linear-gradient(135deg,#EEF2FF 0%,#C8D0F0 30%,#FF9499 65%,#C8000A 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .gradient-text-white { background:linear-gradient(135deg,#FFFFFF 0%,#C8D4F8 50%,#8896B3 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .gradient-text-cyan { background:linear-gradient(135deg,#FFFFFF 0%,#A0F0FF 35%,#00D4FF 70%,#0090B8 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }

  /* ── Sidebar section label v2 ── */
  .section-label-v2 { display:flex; align-items:center; gap:8px; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.18em; color:#2A3A54; padding:10px 4px 6px; position:relative; }
  .section-label-v2::before { content:''; width:3px; height:12px; border-radius:2px; background:linear-gradient(180deg,#D31118,#8A0B10); flex-shrink:0; box-shadow:0 0 6px rgba(211,17,24,0.5); }

  /* ── Production cooking indicator dot ── */
  @keyframes prodPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
  .prod-dot { width:6px; height:6px; border-radius:50%; background:#FBB040; animation:prodPulse 1.6s ease-in-out infinite; display:inline-block; flex-shrink:0; box-shadow:0 0 7px rgba(251,176,64,0.65); }

  /* ── pk-card Liquid Glass glow system v4 ── */
  .pk-production { background:linear-gradient(160deg,rgba(15,19,10,0.38),rgba(10,14,7,0.26)) !important; backdrop-filter:blur(22px) brightness(1.10) saturate(1.6) !important; -webkit-backdrop-filter:blur(22px) brightness(1.10) saturate(1.6) !important; border:1px solid rgba(251,176,64,0.20) !important; box-shadow:-3px 0 0 0 #FBB040, 0 6px 36px rgba(0,0,0,0.55), 0 0 60px rgba(251,176,64,0.16), 0 0 0 1px rgba(251,176,64,0.07) !important; }
  .pk-prod_done  { background:linear-gradient(160deg,rgba(9,20,16,0.38),rgba(6,14,10,0.26)) !important; backdrop-filter:blur(22px) brightness(1.10) saturate(1.6) !important; -webkit-backdrop-filter:blur(22px) brightness(1.10) saturate(1.6) !important; border:1px solid rgba(74,222,128,0.22) !important; box-shadow:-3px 0 0 0 #4ADE80, 0 6px 36px rgba(0,0,0,0.55), 0 0 65px rgba(74,222,128,0.18), 0 0 0 1px rgba(74,222,128,0.07) !important; }
  .pk-packed     { background:linear-gradient(160deg,rgba(19,8,8,0.38),rgba(14,6,6,0.26)) !important; backdrop-filter:blur(22px) brightness(1.10) saturate(1.6) !important; -webkit-backdrop-filter:blur(22px) brightness(1.10) saturate(1.6) !important; border:1px solid rgba(211,17,24,0.22) !important; box-shadow:-3px 0 0 0 rgba(211,17,24,0.95), 0 6px 36px rgba(0,0,0,0.55), 0 0 60px rgba(211,17,24,0.15), 0 0 0 1px rgba(211,17,24,0.07) !important; }
  .pk-short      { background:linear-gradient(160deg,rgba(16,13,6,0.38),rgba(10,9,6,0.26)) !important; backdrop-filter:blur(22px) brightness(1.10) saturate(1.6) !important; -webkit-backdrop-filter:blur(22px) brightness(1.10) saturate(1.6) !important; border:1px solid rgba(232,146,10,0.22) !important; box-shadow:-3px 0 0 0 #E8920A, 0 6px 32px rgba(0,0,0,0.5), 0 0 55px rgba(232,146,10,0.15), 0 0 0 1px rgba(232,146,10,0.07) !important; }

  /* ── Modal sheet: iOS Liquid Glass ── */
  .modal-sheet { background:rgba(6,8,20,0.55) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E") !important; background-size:200px 200px !important; backdrop-filter:blur(64px) brightness(1.10) saturate(1.75) !important; -webkit-backdrop-filter:blur(64px) brightness(1.10) saturate(1.75) !important; border:1px solid transparent !important; box-shadow:0 40px 120px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 60px rgba(0,212,255,0.025) !important; position:relative !important; overflow:hidden !important; }
  .modal-sheet::before { content:''; position:absolute; inset:0; border-radius:inherit; padding:1px; background:linear-gradient(160deg,rgba(255,255,255,0.42) 0%,rgba(255,255,255,0.10) 40%,rgba(255,255,255,0.03) 70%,rgba(0,212,255,0.10) 100%); -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite:destination-out; mask-composite:exclude; pointer-events:none; z-index:1; }
  .modal-sheet::after { content:''; position:absolute; top:0; left:5%; right:5%; height:50%; background:radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.04) 45%, transparent 70%); pointer-events:none; border-radius:inherit; animation:specularDrift 11s ease-in-out infinite; z-index:1; }

  /* ── Portal ambient orbs ── */
  .portal-orb { position:fixed; border-radius:50%; pointer-events:none; z-index:0; }
  .portal-orb-1 { width:min(750px,85vw); height:min(750px,85vw); background:radial-gradient(circle,rgba(211,17,24,0.09) 0%,transparent 70%); top:-18%; left:-12%; animation:orbFloat1 28s ease-in-out infinite; filter:blur(65px); }
  .portal-orb-2 { width:min(580px,72vw); height:min(580px,72vw); background:radial-gradient(circle,rgba(232,146,10,0.06) 0%,transparent 70%); bottom:-15%; right:-8%; animation:orbFloat2 34s ease-in-out infinite; filter:blur(60px); }
  .portal-orb-3 { width:min(380px,55vw); height:min(380px,55vw); background:radial-gradient(circle,rgba(211,17,24,0.05) 0%,transparent 70%); top:45%; left:55%; animation:orbFloat3 22s ease-in-out infinite; filter:blur(70px); }
  .portal-orb-4 { width:min(520px,68vw); height:min(520px,68vw); background:radial-gradient(circle,rgba(0,212,255,0.07) 0%,transparent 70%); top:20%; right:-10%; animation:orbFloat2 40s ease-in-out infinite; filter:blur(65px); }
  .portal-orb-5 { width:min(420px,60vw); height:min(420px,60vw); background:radial-gradient(circle,rgba(63,70,200,0.07) 0%,transparent 70%); bottom:10%; left:5%; animation:orbFloat1 45s ease-in-out infinite; filter:blur(70px); }

  /* ── Create Order button shimmer sweep ── */
  @keyframes shimmerBtn { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .create-order-btn { position:relative; overflow:hidden; }
  .create-order-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.18) 50%,transparent 60%); background-size:200% 100%; animation:shimmerBtn 2.8s ease-in-out infinite; pointer-events:none; border-radius:inherit; }

  /* ── Enhanced hover-lift ── */
  .hover-lift:hover { transform:translateY(-4px) !important; box-shadow:0 12px 32px rgba(0,0,0,0.7) !important; }

  /* ── OrderCard active glow state ── */
  .order-card-active-vins { box-shadow:0 12px 40px rgba(0,0,0,0.75), 0 0 30px rgba(211,17,24,0.18) !important; }
  .order-card-active-manja { box-shadow:0 12px 40px rgba(0,0,0,0.75), 0 0 30px rgba(232,146,10,0.18) !important; }

  /* ── Bento card system (Tier 2) ── */
  .bento-hero { border-radius:16px; overflow:hidden; position:relative; transition:transform 0.22s cubic-bezier(0.16,1,0.3,1),box-shadow 0.22s ease; }
  @media(hover:hover){ .bento-hero:hover { transform:translateY(-3px); } }
  .bento-hero:active { transform:translateY(0) !important; }
  @media(max-width:400px) { .bento-stat-grid { grid-template-columns:1fr 1fr !important; } }

  /* ── Admin dashboard tab switcher pill ── */
  .admin-tab-bar { display:flex; padding:4px; border-radius:12px; }
  .admin-tab-btn { padding:8px 18px; border:none; border-radius:9px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s cubic-bezier(0.16,1,0.3,1); white-space:nowrap; }

  /* ── Bento tile top specular arc (Liquid Glass) ── */
  .bento-hero::before { content:''; position:absolute; top:0; left:8%; right:8%; height:55%; background:radial-gradient(ellipse 75% 40% at 50% 0%,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.04) 45%,transparent 70%); pointer-events:none; z-index:1; animation:specularDrift 10s ease-in-out infinite; }

  /* ── Cursor spotlight — liquid lens ── */
  .cursor-spotlight { background-image: radial-gradient(500px circle at var(--cx,-9999px) var(--cy,-9999px), rgba(0,212,255,0.07), rgba(255,255,255,0.025) 40%, transparent 70%); }

  /* ── Glass card hover — Liquid Glass intensified ── */
  @media(hover:hover) { .glass-card:hover { backdrop-filter:blur(52px) brightness(1.16) saturate(2.0) !important; -webkit-backdrop-filter:blur(52px) brightness(1.16) saturate(2.0) !important; background-color:rgba(10,14,30,0.32) !important; box-shadow: 0 2px 4px rgba(0,0,0,0.6), 0 16px 48px rgba(0,0,0,0.75), 0 40px 100px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,212,255,0.06) !important; } }

  /* ── Batch complete button ── */
  .batch-complete-btn:hover { box-shadow:0 6px 28px rgba(9,115,83,0.58) !important; }

  /* ── View-swap entrance animation (content transitions) ── */
  @keyframes viewEnter { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  .view-enter { animation: viewEnter 0.32s cubic-bezier(0.16,1,0.3,1) forwards; }

  /* ── Screen exit fade (role/back transitions) ── */
  .screen-exiting { opacity:0 !important; transition: opacity 0.3s ease !important; }
  .screen-idle { opacity:1; transition: opacity 0.3s ease; }

  /* ── Touch targets: enforce 44px on key tappable elements ── */
  .touch-44 { min-width:44px; min-height:44px; display:flex !important; align-items:center; justify-content:center; }

  /* ── Mobile: hide scrollbar on small screens for cleaner look ── */
  @media(max-width:768px) { .custom-scrollbar::-webkit-scrollbar { width:0; height:0; } }

  /* ── Mobile font scaling for large display numbers ── */
  @media(max-width:480px) {
    .mobile-stat-num { font-size:28px !important; }
    .mobile-title { font-size:20px !important; letter-spacing:-0.02em !important; }
  }

`;

/* ═══════════════════════════════════════════════════════════════
   FIREBASE CONFIGURATION
═══════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyC_5ZamGzFwZcVJFQn_pLwpUtfinWp_2_U",
  authDomain: "tfc-orders-tracker.firebaseapp.com",
  projectId: "tfc-orders-tracker",
  storageBucket: "tfc-orders-tracker.firebasestorage.app",
  messagingSenderId: "676492094770",
  appId: "1:676492094770:web:53d93adfdcc9ff6301bb2b",
  measurementId: "G-Y7FGTNSZZL"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const OWNER_EMAIL = "banuja2005@gmail.com";

/* ═══════════════════════════════════════════════════════════════
   HELPERS & HOOKS
═══════════════════════════════════════════════════════════════ */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

/* Counts up from 0 to target over ~900ms — used in StatCard */
function useCountUp(target) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 900, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target]);
  return val;
}

/* Animated ambient orb background — used by all auth screens */
function PremiumBg() {
  return (
    <>
      <div style={{position:"fixed",inset:0,background:"#04060E",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"fixed",width:"min(680px,90vw)",height:"min(680px,90vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(211,17,24,0.20) 0%,transparent 70%)",top:"-22%",left:"-12%",animation:"orbFloat1 22s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(55px)"}}/>
      <div style={{position:"fixed",width:"min(900px,110vw)",height:"min(900px,110vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(20,50,160,0.13) 0%,transparent 70%)",bottom:"-32%",right:"-22%",animation:"orbFloat2 28s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(65px)"}}/>
      <div style={{position:"fixed",width:"min(460px,70vw)",height:"min(460px,70vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(211,17,24,0.10) 0%,transparent 70%)",top:"42%",right:"8%",animation:"orbFloat3 19s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(50px)"}}/>
      <div style={{position:"fixed",width:"min(520px,72vw)",height:"min(520px,72vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,212,255,0.10) 0%,transparent 70%)",top:"15%",right:"-15%",animation:"orbFloat2 36s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(60px)"}}/>
      <div style={{position:"fixed",width:"min(360px,55vw)",height:"min(360px,55vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.04) 0%,transparent 70%)",top:"-8%",right:"18%",animation:"orbFloat3 52s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(80px)"}}/>
    </>
  );
}

/* Mouse-tracking 3D tilt — skipped on touch devices */
function useTilt(ref, maxDeg = 11) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    function onMove(e) {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      el.style.transform = `perspective(900px) rotateX(${-y * maxDeg}deg) rotateY(${x * maxDeg}deg) translateZ(10px)`;
      el.style.boxShadow = `${x * -14}px ${y * -14}px 50px rgba(0,0,0,0.55), 0 24px 70px rgba(0,0,0,0.45)`;
    }
    function onLeave() {
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
      el.style.boxShadow = "";
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, []);
}

/* Device-orientation tilt for mobile — gives the card a parallax feel when you tilt your phone */
function useDeviceTilt(ref, intensity = 7) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (typeof DeviceOrientationEvent === "undefined") return;
    let baseB = null, baseG = null;
    function handler(e) {
      if (baseB === null) { baseB = e.beta || 0; baseG = e.gamma || 0; }
      const dx = Math.max(-intensity, Math.min(intensity, ((e.gamma || 0) - baseG) * 0.6));
      const dy = Math.max(-intensity, Math.min(intensity, ((e.beta || 0) - baseB) * 0.4));
      el.style.transform = `perspective(900px) rotateX(${-dy}deg) rotateY(${dx}deg)`;
    }
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);
}

function deliveryUrgency(dateStr) {
  if (!dateStr) return null;
  try {
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    const p = dateStr.split(" ");
    if (p.length < 3) return null;
    const d = new Date(parseInt(p[2]), months[p[1]], parseInt(p[0]));
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    if (diff < 0)  return { label:`${Math.abs(diff)}d overdue`, c:"#DC2626", bg:"rgba(220,38,38,0.12)", bdr:"rgba(220,38,38,0.3)" };
    if (diff === 0) return { label:"Due Today!",    c:"#E8920A", bg:"rgba(232,146,10,0.12)", bdr:"rgba(232,146,10,0.3)" };
    if (diff === 1) return { label:"Due Tomorrow",  c:"#FBB040", bg:"rgba(251,176,64,0.10)", bdr:"rgba(251,176,64,0.28)" };
    if (diff <= 3)  return { label:`Due in ${diff}d`,c:"#FBB040",bg:"rgba(251,176,64,0.08)", bdr:"rgba(251,176,64,0.22)" };
    return { label:`Due in ${diff}d`, c:"#4A6080", bg:"rgba(74,96,128,0.07)", bdr:"rgba(74,96,128,0.2)" };
  } catch { return null; }
}

function findRecipe(name){
  if(!name) return null;
  const exactMatch = RECIPE_DB.find(r => r.recipe_name && r.recipe_name.toUpperCase().trim() === name.toUpperCase().trim());
  return exactMatch ? {...exactMatch, matchScore: 1} : null;
}

function findItemCode(name) {
  if (!name) return null;
  const upper = name.trim().toUpperCase();
  const recipe = RECIPE_DB.find(r => r.recipe_name && r.recipe_name.toUpperCase().trim() === upper);
  if (recipe && recipe.item_code) return recipe.item_code;
  const item = ITEMS_DB.find(i => i.name && i.name.trim().toUpperCase() === upper);
  return item ? item.item_code : null;
}

function findRecipeFuzzyBulk(lineText) {
  const cleanLine = lineText.toUpperCase().replace(/[^A-Z0-9 ]/g," ").trim();
  let bestMatch = null; let bestScore = 0;
  for (const r of RECIPE_DB) {
    if (!r.recipe_name) continue;
    const words = r.recipe_name.split(" ").filter(w => w.length > 2);
    let matchCount = 0;
    words.forEach(w => { if (cleanLine.includes(w)) matchCount++; });
    const score = matchCount / words.length;
    if (score > bestScore && score >= 0.75) { bestScore = score; bestMatch = r.recipe_name; }
  }
  return bestMatch;
}

function oStats(o){
  const i=o.items;
  return{
    total: i.length, packed: i.filter(x=>x.status==="packed").length, delivered: i.filter(x=>x.status==="delivered").length,
    short: i.filter(x=>x.status==="short").length, oos: i.filter(x=>x.status==="oos").length,
    prod: i.filter(x=>x.status==="production").length, prod_done: i.filter(x=>x.status==="prod_done").length, pending: i.filter(x=>x.status==="pending").length
  };
}

function fmtDate(){ return new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}); }

function getLocalYMD(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

/* ═══════════════════════════════════════════════════════════════
   THEME SYSTEM — dark / light palettes + context
═══════════════════════════════════════════════════════════════ */
const ThemeCtx = React.createContext(true); // true = dark
function useTheme(){
  return {
    isDark: true,
    divider:  "rgba(255,255,255,0.08)",
    subBg:    "rgba(255,255,255,0.04)",
    cardBg:   "rgba(255,255,255,0.04)",
    chipBg:   "rgba(255,255,255,0.06)",
    footerBg: "rgba(4,6,14,0.85)",
    headerBg: "rgba(4,6,14,0.92)",
    panelBg:  "rgba(4,7,16,0.82)",
    editBg:   "#060A12",
    editBdr:  "#1A2640",
    closeBg:  "rgba(255,255,255,0.05)",
    closeBdr: "rgba(255,255,255,0.09)",
    trackBg:  "rgba(255,255,255,0.07)",
    svgTrack: "rgba(255,255,255,0.07)",
    noteBg:   "rgba(255,255,255,0.03)",
    noteBdr:  "rgba(255,255,255,0.08)",
    cyGlow:   "rgba(0,212,255,0.12)",
  };
}

const DC={ // dark palette (default)
  w: "#0D1424", off: "#080C18", beige: "#080C18", beigeD: "#111A30",
  ch: "#EEF2FF", chM: "#B8C4E0", chL: "#8896B3", chXL: "#1E2D4A",
  bdr: "#1A2640", bdrL: "#111C32",
  ol: "#D31118", olDk: "#A50D12", olBg: "rgba(211,17,24,0.14)", olBgD: "rgba(211,17,24,0.26)",
  am: "#E8920A", amDk: "#B86F06", amBg: "rgba(232,146,10,0.13)", amBgD: "rgba(232,146,10,0.24)",
  gn: "#16A34A", gnBg: "rgba(22,163,74,0.13)",
  rd: "#DC2626", rdBg: "rgba(220,38,38,0.12)",
  cy: "#00D4FF", cyBg: "rgba(0,212,255,0.10)", cyBgD: "rgba(0,212,255,0.18)",
  sh: "0 2px 12px rgba(0,0,0,0.5)", shM: "0 8px 40px rgba(0,0,0,0.7)"
};
// Mutable palette — always dark
const C={...DC};

const ROLES={
  admin:{label:"Admin",icon:"⚙",color:C.ch,accent:C.ol,bg:C.beige,desc:"Create and manage all orders"},
  packing:{label:"Packing",icon:"◻",color:C.ol,accent:C.ol,bg:C.olBg,desc:"Smart status updater for dispatch"},
  production:{label:"Production",icon:"◈",color:C.am,accent:C.am,bg:C.amBg,desc:"Production queue with recipes"},
  vins:{label:"Vins Kitchen",icon:"V",color:C.chM,accent:C.chM,bg:C.beige,desc:"Live delivery tracker interface"},
  manja:{label:"Manja Kitchen",icon:"M",color:C.amDk,accent:C.amDk,bg:C.amBg,desc:"Live delivery tracker interface"},
};

const SC = {
  pending: { label: "Pending", c: "#8896B3", bg: "rgba(136,150,179,0.10)", bdr: "rgba(136,150,179,0.22)", step: 1 },
  production: { label: "Cooking", c: "#FBB040", bg: "rgba(232,146,10,0.12)", bdr: "rgba(232,146,10,0.30)", step: 2 },
  prod_done: { label: "Ready to Pack", c: "#4ADE80", bg: "rgba(22,163,74,0.12)", bdr: "rgba(22,163,74,0.30)", step: 3 },
  packed: { label: "Packed ✓", c: "#F87171", bg: "rgba(211,17,24,0.12)", bdr: "rgba(211,17,24,0.28)", step: 4 },
  delivered: { label: "Delivered 🚀", c: "#EEF2FF", bg: "rgba(238,242,255,0.07)", bdr: "rgba(238,242,255,0.14)", step: 5 },
  short: { label: "Short ⚠", c: "#FBB040", bg: "rgba(232,146,10,0.12)", bdr: "rgba(232,146,10,0.30)", step: -1 },
  oos: { label: "Out of Stock", c: "#FCA5A5", bg: "rgba(220,38,38,0.12)", bdr: "rgba(220,38,38,0.28)", step: -1 },
};

const UNITS = ["kg", "g", "pkt", "btl", "nos", "ctn", "ltr"];

/* ═══════════════════════════════════════════════════════════════
   MICRO COMPONENTS
═══════════════════════════════════════════════════════════════ */
function Badge({status}){
  const s=SC[status]||SC.pending;
  const glowClass = status && status !== "pending" && status !== "delivered" ? `badge-glow-${status}` : "";
  return <span className={glowClass} style={{fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:20,color:s.c,background:s.bg,border:"1px solid "+s.bdr,whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.04em",transition:"box-shadow 0.3s ease"}}>{s.label}</span>;
}

function Pill({count,label,color}){
  if(!count)return null;
  return <span style={{fontSize:10,color,background:color+"1A",border:"1px solid "+color+"50",borderRadius:20,padding:"2px 8px",fontWeight:600,flexShrink:0}}>{count} {label}</span>;
}

function Toast({msg,type}){
  const isErr=type==="error";
  const accentColor=isErr?"#DC2626":"#22C55E";
  return(
    <div className="toast-slide-right" style={{
      position:"fixed",bottom:28,right:24,
      zIndex:9999,maxWidth:360,minWidth:260,
      background:isErr?"rgba(14,4,4,0.97)":"rgba(4,12,8,0.97)",
      backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      backgroundSize:"200px 200px",
      border:"1px solid "+(isErr?"rgba(220,38,38,0.3)":"rgba(22,163,74,0.3)"),
      borderLeft:"3px solid "+accentColor,
      borderRadius:14,padding:"14px 18px",
      boxShadow:"0 16px 60px rgba(0,0,0,0.9), 0 0 0 1px "+(isErr?"rgba(220,38,38,0.06)":"rgba(22,163,74,0.06)"),
      backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
      display:"flex",alignItems:"center",gap:13,fontFamily:"'Plus Jakarta Sans',sans-serif"
    }}>
      <div style={{
        width:34,height:34,borderRadius:"50%",flexShrink:0,
        background:isErr?"rgba(220,38,38,0.14)":"rgba(22,163,74,0.14)",
        border:"1.5px solid "+(isErr?"rgba(220,38,38,0.45)":"rgba(22,163,74,0.45)"),
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:15,fontWeight:900,color:accentColor,
        boxShadow:"0 0 12px "+(isErr?"rgba(220,38,38,0.22)":"rgba(22,163,74,0.22)")
      }}>{isErr?"✕":"✓"}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:10,fontWeight:800,color:isErr?"rgba(248,113,113,0.65)":"rgba(74,222,128,0.65)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{isErr?"Error":"Done"}</div>
        <span style={{fontSize:13,fontWeight:700,color:"#EEF2FF",lineHeight:1.35}}>{msg}</span>
      </div>
    </div>
  );
}

function SectionLabel({text}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:9,fontSize:9,fontWeight:900,color:"#3A4E6A",textTransform:"uppercase",letterSpacing:"0.16em",marginBottom:14,marginTop:4}}>
      <div style={{width:3,height:13,borderRadius:2,background:"linear-gradient(180deg,#D31118,#8A0B10)",flexShrink:0,boxShadow:"0 0 6px rgba(211,17,24,0.45)"}}/>
      {text}
    </div>
  );
}

function ProgressRing({ radius, stroke, progress, color }) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <svg height={radius * 2} width={radius * 2} style={{transform: "rotate(-90deg)"}}>
      <circle stroke={C.bdrL} fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
      <circle stroke={color} fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} />
    </svg>
  );
}

function AdminDonutChart({ packed, pending, issues }) {
  const th=useTheme();
  const total = packed + pending + issues || 1;
  const radius = 40; const circumference = 2 * Math.PI * radius;
  const pPacked = (packed/total)*circumference; const pIssues = (issues/total)*circumference;
  const pct = Math.round((packed/total)*100);

  return (
    <div className="animate-fade-up glass-card" style={{borderRadius:18, padding:"22px 24px", display:"flex", alignItems:"center", gap:22, position:"relative", overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(211,17,24,0.25),transparent)",pointerEvents:"none"}}/>
      <div style={{position:"relative", width:100, height:100, flexShrink:0}}>
        <svg height="100" width="100" style={{transform: "rotate(-90deg)"}}>
          <circle stroke={th.svgTrack} fill="transparent" strokeWidth="13" r={radius} cx="50" cy="50" />
          <circle stroke={C.rd} fill="transparent" strokeWidth="13" strokeDasharray={`${pIssues} ${circumference}`} style={{transition:"all 1.2s cubic-bezier(0.16,1,0.3,1)"}} strokeLinecap="round" r={radius} cx="50" cy="50" />
          <circle stroke={C.ol} fill="transparent" strokeWidth="13" strokeDasharray={`${pPacked} ${circumference}`} strokeDashoffset={-pIssues} style={{transition:"all 1.2s cubic-bezier(0.16,1,0.3,1)"}} strokeLinecap="round" r={radius} cx="50" cy="50" />
        </svg>
        <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
          <span style={{fontSize:22, fontWeight:900, color:pct>80?"#4ADE80":pct>50?C.ch:C.rd, lineHeight:1}}>{pct}%</span>
          <span style={{fontSize:8, color:C.chL, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginTop:3}}>filled</span>
        </div>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13, fontWeight:900, color:C.ch, marginBottom:12, letterSpacing:"-0.01em"}}>Fulfillment Health</div>
        {[
          {dot:C.ol, label:"Ready / Delivered", val:packed},
          {dot:C.chL, label:"Processing", val:pending},
          {dot:C.rd, label:"Issues (OOS / Short)", val:issues},
        ].map(({dot,label,val})=>(
          <div key={label} style={{display:"flex",gap:10,alignItems:"center",fontSize:12,color:C.chM,fontWeight:600,marginBottom:8}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:dot,flexShrink:0,boxShadow:`0 0 6px ${dot}80`}}/>
            <span style={{flex:1}}>{label}</span>
            <span style={{fontWeight:900,color:C.ch,fontVariantNumeric:"tabular-nums"}}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({label,val,color}){
  const th=useTheme();
  const isNum = typeof val === "number";
  const displayed = useCountUp(isNum ? val : 0);
  return(
    <div className="hover-lift animate-fade-up glass-card" style={{borderRadius:16,padding:"24px 8px",textAlign:"center",position:"relative",overflow:"hidden",border:`1px solid ${th.divider}`,boxShadow:th.isDark?`0 2px 8px rgba(0,0,0,0.4), 0 0 32px ${color}20`:`0 2px 8px rgba(0,0,0,0.06), 0 0 20px ${color}15`}}>
      <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${color}50,transparent)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:90,height:90,borderRadius:"50%",background:`radial-gradient(circle,${color}16 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div className="count-pop" style={{fontSize:44,fontWeight:900,color,lineHeight:1,letterSpacing:"-0.05em",position:"relative"}}>{isNum ? displayed : val}</div>
      <div style={{fontSize:9,color:C.chL,marginTop:9,textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:800,position:"relative"}}>{label}</div>
    </div>
  );
}

function StatRow({s}){
  return(
    <div style={{display:"flex", gap:12, marginBottom:20, flexWrap:"wrap"}}>
      <div style={{display:"flex", gap:8, flex:1, minWidth:200}}>
        <div style={{flex:1, textAlign:"center", background:"rgba(22, 163, 74, 0.12)", padding:"10px 8px", borderRadius:10, border:"1px solid rgba(22, 163, 74, 0.3)"}}>
          <div style={{fontSize:22, fontWeight:900, color:"#4ADE80"}}>{s.packed + s.delivered}</div>
          <div style={{fontSize:9, color:"#4ADE80", fontWeight:800, marginTop:3, textTransform:"uppercase"}}>Ready / Done</div>
        </div>
        <div style={{flex:1, textAlign:"center", background:C.amBg, padding:"10px 8px", borderRadius:10, border:"1px solid "+C.amBgD}}>
          <div style={{fontSize:22, fontWeight:900, color:C.amDk}}>{s.prod + s.prod_done}</div>
          <div style={{fontSize:9, color:C.amDk, fontWeight:800, marginTop:3, textTransform:"uppercase"}}>In Prod</div>
        </div>
      </div>
      <div style={{display:"flex", gap:8, flex:1, minWidth:160}}>
        <div style={{flex:1, textAlign:"center", background: (s.short+s.oos)>0 ? C.olBg : C.off, padding:"10px 8px", borderRadius:10, border:"1px solid "+((s.short+s.oos)>0 ? C.olBgD : C.bdrL)}}>
          <div style={{fontSize:22, fontWeight:900, color:(s.short+s.oos)>0 ? C.rd : C.chL}}>{s.short + s.oos}</div>
          <div style={{fontSize:9, color:(s.short+s.oos)>0 ? C.rd : C.chL, fontWeight:800, marginTop:3, textTransform:"uppercase"}}>Issues</div>
        </div>
        <div style={{flex:1, textAlign:"center", background:C.off, padding:"10px 8px", borderRadius:10, border:"1px solid "+C.bdrL}}>
          <div style={{fontSize:22, fontWeight:900, color:C.chM}}>{s.pending}</div>
          <div style={{fontSize:9, color:C.chL, fontWeight:800, marginTop:3, textTransform:"uppercase"}}>Pending</div>
        </div>
      </div>
    </div>
  );
}

function RecipeCard({name}){
  const th=useTheme();
  const r = findRecipe(name);
  const [showSteps, setShowSteps] = useState(false);
  if(!r) return null;

  return(
    <div className="animate-fade-in recipe-terminal">
      {/* Terminal bar */}
      <div className="recipe-terminal-bar">
        <span className="recipe-terminal-dot" style={{background:"#DC2626"}}/>
        <span className="recipe-terminal-dot" style={{background:"#E8920A"}}/>
        <span className="recipe-terminal-dot" style={{background:"#22C55E"}}/>
        <span style={{flex:1,fontSize:10,color:C.ol,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.12em",textAlign:"center"}}>📖 {r.recipe_name}</span>
        <span style={{fontSize:9,color:"#4ADE80",fontWeight:800,background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.3)",borderRadius:4,padding:"2px 7px"}}>100% MATCH</span>
      </div>

      <div style={{padding:"14px 16px"}}>
        {r.section&&<div style={{fontSize:10,color:C.chL,fontWeight:700,marginBottom:10,background:th.subBg,borderRadius:6,padding:"4px 8px",display:"inline-block"}}>{r.section}</div>}
        <div style={{fontSize:10,fontWeight:800,color:C.chL,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{r.qty_column_label||"INGREDIENTS"}</div>
        {r.ingredients && r.ingredients.map((ing,i)=>{
          if(ing.type==="stage_label"||!ing.qty) return <div key={i} style={{marginTop:10,marginBottom:6,paddingBottom:4,borderBottom:"1px solid rgba(211,17,24,0.2)",color:C.ol,fontSize:11,fontWeight:900,letterSpacing:"0.04em"}}>{ing.item}</div>;
          return(
            <div key={i} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:12,paddingBottom:7,marginBottom:7,borderBottom:i===r.ingredients.length-1?"none":`1px solid ${th.divider}`}}>
              <span style={{color:C.chM,fontWeight:600}}>{ing.item}</span>
              <span style={{color:C.ol,fontFamily:"'JetBrains Mono',monospace",fontWeight:800,flexShrink:0}}>{ing.qty}</span>
            </div>
          );
        })}

        {r.steps&&r.steps.length>0&&(
          <div style={{marginTop:12}}>
            <button onClick={()=>setShowSteps(!showSteps)} style={{background:showSteps?"rgba(211,17,24,0.15)":th.subBg,border:"1px solid "+(showSteps?"rgba(211,17,24,0.3)":th.divider),padding:"8px 14px",borderRadius:8,fontSize:11,fontWeight:800,color:showSteps?C.ol:C.chL,cursor:"pointer",width:"100%",fontFamily:"inherit",transition:"all 0.2s"}}>
              {showSteps?"▲ Hide Steps":"▼ View Preparation Steps"}
            </button>
            <div className={`accordion-content ${showSteps?"open":""}`} style={{marginTop:showSteps?10:0,display:"flex",flexDirection:"column",gap:8}}>
              {r.steps.map(step=>(
                <div key={step.step_no} style={{fontSize:12,color:C.chM,lineHeight:1.55,background:th.cardBg,padding:"12px 14px",borderRadius:8,border:`1px solid ${th.divider}`}}>
                  <strong style={{color:C.ol,display:"block",marginBottom:4,fontSize:11,letterSpacing:"0.04em"}}>STEP {step.step_no}</strong>{step.instruction}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({children,onClick,variant="ghost",disabled=false,full=false,size="md", type="button"}){
  const [hov,setHov]=useState(false); const pad=size==="sm"?"6px 12px":"12px 24px"; const fs=size==="sm"?11:14;
  let bg, color, border, boxShadow = "none";
  if (variant === "primary") {
    bg = hov ? "linear-gradient(135deg, #A50D12, #6E0809)" : "linear-gradient(135deg, #D31118, #8A0B10)";
    color = "#FFFFFF"; border = "none"; boxShadow = hov ? "0 6px 20px rgba(211,17,24,0.45)" : "0 3px 10px rgba(211,17,24,0.3)";
  } else if (variant === "amber") {
    bg = hov ? "linear-gradient(135deg, #B86F06, #8A5204)" : "linear-gradient(135deg, #E8920A, #B86F06)";
    color = "#FFFFFF"; border = "none"; boxShadow = hov ? "0 6px 20px rgba(232,146,10,0.4)" : "0 3px 10px rgba(232,146,10,0.25)";
  } else if (variant === "success") {
    bg = hov ? "linear-gradient(135deg, #0D7A30, #085220)" : "linear-gradient(135deg, #16A34A, #0D7A30)";
    color = "#FFFFFF"; border = "none"; boxShadow = hov ? "0 6px 20px rgba(22,163,74,0.4)" : "0 3px 10px rgba(22,163,74,0.25)";
  } else if (variant === "dark") {
    bg = hov ? "linear-gradient(135deg, #D0D8F0, #A8B8D8)" : "linear-gradient(135deg, #EEF2FF, #C0CCE8)";
    color = "#090B10"; border = "none"; boxShadow = hov ? "0 6px 20px rgba(238,242,255,0.2)" : "none";
  } else if (variant === "danger") {
    bg = hov ? "rgba(220,38,38,0.2)" : "rgba(220,38,38,0.1)";
    color = "#DC2626"; border = "1px solid rgba(220,38,38,0.4)";
  } else {
    bg = hov ? "#111828" : "transparent";
    color = "#8896B3"; border = "1px solid #1E2A44";
  }
  return(
    <button onClick={onClick} disabled={disabled} type={type} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:pad,border,borderRadius:8,background:bg,color,fontSize:fs,cursor:disabled?"not-allowed":"pointer",fontWeight:800,width:full?"100%":"auto",opacity:disabled?0.5:1,letterSpacing:"0.01em", transform:hov&&!disabled?"translateY(-2px)":"none", boxShadow:disabled?"none":boxShadow, transition:"all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"}}>{children}</button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DAILY PRODUCTION COMPONENTS
═══════════════════════════════════════════════════════════════ */
function RecipeAutocomplete({ value, onChange, onSelect, placeholder = "Search or type product name..." }) {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(text) {
    onChange(text); 
    if (!text || text.length < 2) { setMatches([]); setOpen(false); return; }
    const upper = text.toUpperCase();
    const found = RECIPE_DB.filter(r => r.recipe_name?.toUpperCase().includes(upper)).slice(0, 6);
    setMatches(found);
    setOpen(found.length > 0);
  }

  function handleSelect(recipe) {
    onSelect({ product: recipe.recipe_name, recipeName: recipe.recipe_name, recipeId: recipe.recipe_id });
    setOpen(false); setMatches([]);
  }

  function handleKey(e) { if (e.key === "Escape") setOpen(false); }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input value={value} onChange={e => handleInput(e.target.value)} onKeyDown={handleKey} onFocus={() => value.length >= 2 && matches.length > 0 && setOpen(true)} placeholder={placeholder} autoComplete="off" style={{ padding: "11px 14px", border: "1px solid " + C.bdr, borderRadius: 10, fontSize: 13, color: C.ch, outline: "none", background: "#111828", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }} />
      {open && (
        <div className="custom-scrollbar animate-fade-in" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0F1422", border: "1px solid " + C.bdr, borderRadius: 10, zIndex: 200, maxHeight: 220, overflowY: "auto", boxShadow: C.shM }}>
          {matches.map((recipe, i) => (
            <button key={recipe.recipe_id || i} onMouseDown={e => { e.preventDefault(); handleSelect(recipe); }} style={{ width: "100%", padding: "11px 14px", border: "none", background: "transparent", color: C.ch, textAlign: "left", cursor: "pointer", borderBottom: "1px solid " + C.bdrL, fontSize: 13, fontWeight: 600, fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = C.w} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span>{recipe.recipe_name}</span><span style={{ color: C.ol, fontSize: 9, fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase" }}>✓ RECIPE</span>
            </button>
          ))}
          <div style={{ padding: "9px 14px", fontSize: 11, color: C.chL, fontWeight: 600 }}>💡 Press Enter or continue typing to add as custom item</div>
        </div>
      )}
    </div>
  );
}

function ExtraProductionModal({ onClose, onSave, dateStr }) {
  const th=useTheme();
  const isMobile = useIsMobile();
  const [productText, setProductText] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState({ product:"", recipeName:null, recipeId:null });
  const [actualKg, setActualKg] = useState("");
  const [actualPkts, setActualPkts] = useState("");
  const [itemNote, setItemNote] = useState(""); 
  const [err, setErr] = useState("");

  function handleSubmit() {
    const name = selectedRecipe.product || productText.trim();
    if (!name) { setErr("Enter a product name"); return; }
    if (!actualKg && !actualPkts) { setErr("Enter an actual quantity produced"); return; }
    
    onSave(dateStr, {
      id: "dprod_extra_" + Date.now() + "_" + Math.random().toString(36).slice(2,5),
      product: name, 
      recipeName: selectedRecipe.recipeName || null, 
      recipeId: selectedRecipe.recipeId || null,
      kgQty: 0, 
      packetQty: 0, 
      actualKgQty: parseFloat(actualKg) || 0, 
      actualPacketQty: parseFloat(actualPkts) || 0,
      notes: itemNote.trim(), 
      status: "prod_done", 
      isExtra: true 
    });
    onClose();
  }

  const inputStyle = { padding:"10px 14px", border:"1px solid "+C.amDk+"50", borderRadius:10, fontSize:13, color:C.ch, outline:"none", background:"#111828", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s" };

  return (
    <div className="animate-fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", zIndex:999, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:20 }}>
      <div className="animate-fade-up modal-sheet" style={{ borderRadius:isMobile?"24px 24px 0 0":20, width:"100%", maxWidth:500, maxHeight:isMobile?"94vh":"auto", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1, background:"linear-gradient(90deg,transparent,rgba(232,146,10,0.35),transparent)", pointerEvents:"none" }}/>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${th.divider}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:C.ch }}>+ Log Unplanned Production</div>
              <div style={{ fontSize:12, color:C.chL, marginTop:4 }}>Record items made outside of today's plan.</div>
            </div>
            <button onClick={onClose} style={{ background:th.closeBg, border:`1px solid ${th.closeBdr}`, borderRadius:"50%", width:32, height:32, cursor:"pointer", fontSize:14, color:C.chM, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
        </div>

        <div className="custom-scrollbar" style={{ overflowY:"auto", padding:"20px 24px" }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.amDk, fontWeight:800, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.1em" }}>Product Made</div>
            <RecipeAutocomplete value={selectedRecipe.product || productText} onChange={text => { setProductText(text); setSelectedRecipe({ product:text, recipeName:null, recipeId:null }); }} onSelect={sel => { setSelectedRecipe(sel); setProductText(sel.product); }} />
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase" }}>Actual Yield (kg)</div>
              <input type="number" value={actualKg} onChange={e=>setActualKg(e.target.value)} placeholder="e.g. 10" style={inputStyle} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase" }}>Actual Packets</div>
              <input type="number" value={actualPkts} onChange={e=>setActualPkts(e.target.value)} placeholder="e.g. 20" style={inputStyle} />
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase" }}>Notes</div>
            <input value={itemNote} onChange={e=>setItemNote(e.target.value)} placeholder="Why was this made?" style={inputStyle} />
          </div>
          {err && <div style={{ color:C.rd, fontSize:12, fontWeight:700, marginTop:12, background:"rgba(220,38,38,0.1)", padding:"8px 12px", borderRadius:8 }}>{err}</div>}
        </div>

        <div style={{ padding:"16px 24px", borderTop:`1px solid ${th.divider}`, background:th.footerBg, display:"flex", gap:10, borderRadius:isMobile?"0":"0 0 20px 20px" }}>
          <Btn full onClick={onClose}>Cancel</Btn>
          <Btn full variant="amber" onClick={handleSubmit}>Save Record</Btn>
        </div>
      </div>
    </div>
  );
}

function DailyProductionModal({ dayInfo, onSave, onClose }) {
  const th=useTheme();
  const existing = dayInfo.dp;
  const isMobile = useIsMobile();
  const [items, setItems] = useState(existing?.items || []);
  
  const [productText, setProductText] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState({ product:"", recipeName:null, recipeId:null });
  const [kgQty, setKgQty] = useState("");
  const [packetQty, setPacketQty] = useState("");
  const [itemNote, setItemNote] = useState(""); 
  const [err, setErr] = useState("");

  function handleAddItem() {
    const name = selectedRecipe.product || productText.trim();
    if (!name) { setErr("Enter a product name"); return; }
    setItems(prev => [...prev, {
      id: "dprod_" + Date.now() + "_" + Math.random().toString(36).slice(2,5),
      product: name, recipeName: selectedRecipe.recipeName || null, recipeId: selectedRecipe.recipeId || null,
      kgQty: parseFloat(kgQty) || 0, packetQty: parseFloat(packetQty) || 0,
      notes: itemNote.trim(), status: "pending"
    }]);
    setProductText(""); setSelectedRecipe({ product:"", recipeName:null, recipeId:null });
    setKgQty(""); setPacketQty(""); setItemNote(""); setErr("");
  }

  function handleSubmit() {
    if (items.length === 0) { setErr("Add at least one item"); return; }
    const saveKey = dayInfo.dp ? dayInfo.dp.id : dayInfo.date;
    onSave(saveKey, items, ""); 
    onClose();
  }

  const inputStyle = { padding:"10px 14px", border:"1px solid "+C.bdr, borderRadius:10, fontSize:13, color:C.ch, outline:"none", background:"#111828", width:"100%", boxSizing:"border-box" };

  return (
    <div className="animate-fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", zIndex:999, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:20 }}>
      <div className="animate-fade-up modal-sheet" style={{ borderRadius:isMobile?"24px 24px 0 0":20, width:"100%", maxWidth:640, maxHeight:isMobile?"94vh":"88vh", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1, background:"linear-gradient(90deg,transparent,rgba(211,17,24,0.28),transparent)", pointerEvents:"none" }}/>
        <div style={{ padding:"20px 30px", borderBottom:`1px solid ${th.divider}`, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:C.ch }}>{existing ? "Edit" : "Create"} — {dayInfo.dayOfWeek} {dayInfo.displayDate}</div>
              <div style={{ fontSize:12, color:C.chL, marginTop:4 }}>Add items with quantities and instructions</div>
            </div>
            <button onClick={onClose} style={{ background:th.closeBg, border:`1px solid ${th.closeBdr}`, borderRadius:"50%", width:36, height:36, cursor:"pointer", fontSize:15, color:C.chM, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
        </div>

        <div className="custom-scrollbar" style={{ overflowY:"auto", flex:1, padding:"24px 30px" }}>
          <SectionLabel text="Add Item" />
          <div style={{ background:"#0C1020", padding:16, borderRadius:14, border:"1px solid "+C.bdrL, marginBottom:24 }}>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase" }}>Product (Search recipe or type custom)</div>
              <RecipeAutocomplete value={selectedRecipe.product || productText} onChange={text => { setProductText(text); setSelectedRecipe({ product:text, recipeName:null, recipeId:null }); }} onSelect={sel => { setSelectedRecipe(sel); setProductText(sel.product); }} />
              {selectedRecipe.recipeName && <div className="animate-fade-in" style={{ marginTop:6, fontSize:11, color:C.ol, fontWeight:700, display:"flex", gap:6, alignItems:"center" }}>✓ Recipe matched — ingredients & steps available to production team</div>}
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase" }}>Quantity (kg)</div>
                <input type="number" value={kgQty} onChange={e=>setKgQty(e.target.value)} placeholder="e.g. 25" style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase" }}>Packets</div>
                <input type="number" value={packetQty} onChange={e=>setPacketQty(e.target.value)} placeholder="e.g. 50" style={inputStyle} />
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase" }}>Instructions / Notes (Optional)</div>
              <input value={itemNote} onChange={e=>setItemNote(e.target.value)} placeholder="e.g. Use premium cut, needs extra marination" style={inputStyle} />
            </div>
            <button onClick={handleAddItem} className="hover-lift" style={{ marginTop:14, width:"100%", padding:"12px", background:C.ch, color:C.w, border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", fontSize:13 }}>+ Add Item to Plan</button>
          </div>

          {err && <div style={{ color:C.rd, fontSize:13, fontWeight:700, background:C.rdBg, padding:"10px 14px", borderRadius:8, marginBottom:12 }}>{err}</div>}

          <SectionLabel text={`Items Planned (${items.length})`} />
          {items.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px", border:`2px dashed ${th.divider}`, borderRadius:12, color:C.chXL, fontWeight:600 }}>No items yet</div>
          ) : items.map((item) => (
            <div key={item.id} className="animate-fade-up" style={{ padding:"14px 18px", background:th.cardBg, border:`1px solid ${th.divider}`, borderRadius:12, marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:C.ch, marginBottom:2 }}>{item.product}</div>
                  <div style={{ fontSize:11, fontFamily:"monospace", color:C.am, fontWeight:700 }}>
                    {item.kgQty} kg — {item.packetQty} packets
                    {item.recipeName && <span style={{ marginLeft:8, color:C.ol, fontSize:10 }}>📖 Recipe</span>}
                  </div>
                  {item.notes && <div style={{ fontSize:11, color:C.chL, marginTop:4 }}>📝 {item.notes}</div>}
                </div>
                <button onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))} className="hover-lift" style={{ background:C.rdBg, border:"none", color:C.rd, fontSize:12, fontWeight:800, cursor:"pointer", padding:"8px 12px", borderRadius:8 }}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding:"18px 30px", borderTop:`1px solid ${th.divider}`, background:th.footerBg, borderRadius:isMobile?"0":"0 0 20px 20px", display:"flex", gap:12, justifyContent:"flex-end" }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSubmit} variant="primary">{existing ? "Update Plan" : "Save Day Plan"}</Btn>
        </div>
      </div>
    </div>
  );
}

function DailyProductionSection({ dailyProductions, onShowRecipe, onUpdateItem, role, onAddExtra }) {
  if (dailyProductions.length === 0) return (
    <div style={{ textAlign:"center", padding:"28px 20px", border:"2px dashed "+C.bdrL, borderRadius:14, color:C.chXL, marginBottom:24, fontSize:13, fontWeight:600 }}>
      No daily production plans for this week.
      <div style={{ fontSize:11, color:C.chL, marginTop:6 }}>Admin can plan via the Admin panel.</div>
      {role === 'production' && (
        <button onClick={onAddExtra} className="hover-lift" style={{ marginTop:14, background:C.amBg, border:"1px solid "+C.amDk+"40", color:C.am, padding:"8px 16px", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer" }}>
          + Log Unplanned Production
        </button>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:900, color:C.ol, textTransform:"uppercase", letterSpacing:"1.5px", display:"flex", alignItems:"center", gap:8 }}>
          📋 Daily Facility Production
          <span style={{ background:C.olBg, border:"1px solid "+C.olBgD, color:C.olDk, padding:"2px 8px", borderRadius:20, fontSize:9, fontWeight:900 }}>{dailyProductions.length} day(s)</span>
        </div>
        {role === 'production' && (
          <button onClick={onAddExtra} className="hover-lift" style={{ background:C.amBg, border:"1px solid "+C.amDk+"40", color:C.am, padding:"6px 12px", borderRadius:8, fontSize:10, fontWeight:800, cursor:"pointer" }}>
            + Extra Prod
          </button>
        )}
      </div>
      <div style={{ background:C.w, borderRadius:16, border:"1px solid "+C.bdrL, borderLeft:"4px solid "+C.ol, boxShadow:C.sh, overflow:"hidden", marginBottom:20 }}>
        {dailyProductions.map((dp, idx) => (
          <DailyProductionDayBlock key={dp.id} dp={dp} isLast={idx === dailyProductions.length - 1} onShowRecipe={onShowRecipe} onUpdateItem={onUpdateItem} role={role} />
        ))}
      </div>
    </div>
  );
}

function DailyProductionDayBlock({ dp, isLast, onShowRecipe, onUpdateItem, role }) {
  const [open, setOpen] = useState(true); 
  const isToday = dp.date === getLocalYMD();

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid "+C.bdrL }}>
      <button onClick={() => setOpen(!open)} style={{ width:"100%", padding:"14px 18px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:11, fontWeight:900, color: isToday ? C.ol : C.ch, textTransform:"uppercase", letterSpacing:"1px" }}>
            {dp.dayOfWeek}
            {isToday && <span style={{ marginLeft:8, background:C.olBg, color:C.ol, padding:"2px 8px", borderRadius:20, fontSize:9, fontWeight:900, border:"1px solid "+C.olBgD }}>TODAY</span>}
          </div>
          <div style={{ fontSize:11, color:C.chL, fontWeight:600 }}>{dp.date}</div>
          <div style={{ fontSize:10, color:C.chL, background:C.off, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>{dp.items.length} items</div>
        </div>
        <span style={{ color:C.chL, fontSize:12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="animate-fade-in" style={{ padding:"0 18px 14px" }}>
          {dp.items.map(item => (
            <DailyProductionItemRow key={item.id} item={item} dpId={dp.id} onShowRecipe={onShowRecipe} onUpdateItem={onUpdateItem} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}

function DailyProductionItemRow({ item, dpId, onShowRecipe, onUpdateItem, role }) {
  const th=useTheme();
  const hasRecipe = !!item.recipeName;
  const isDone = item.status === 'prod_done';
  const isExtra = item.isExtra;

  const [isCompleting, setIsCompleting] = useState(false);
  const [actualKg, setActualKg] = useState(item.kgQty || "");
  const [actualPkts, setActualPkts] = useState(item.packetQty || "");

  function handleConfirmComplete() {
    onUpdateItem(dpId, item.id, {
      status: "prod_done",
      actualKgQty: parseFloat(actualKg) || 0,
      actualPacketQty: parseFloat(actualPkts) || 0,
    });
    setIsCompleting(false);
  }

  const rowClass = isDone ? (role === 'admin' ? 'dp-item-done-admin animate-fade-up dp-item-row' : 'dp-item-done animate-fade-up dp-item-row') : 'animate-fade-up dp-item-row';

  return (
    <div className={rowClass} style={{ flexWrap:"wrap" }}>
      <div style={{ flex:1, minWidth:"200px" }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap:"wrap" }}>
          <div className="dp-item-name" style={{ fontSize:14, fontWeight:800, color:C.ch }}>{item.product}</div>
          {isDone && <span style={{ background: "rgba(22, 163, 74, 0.15)", color: "#4ADE80", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(22, 163, 74, 0.3)" }}>✓ DONE</span>}
          {isExtra && <span style={{ background: "rgba(184, 111, 6, 0.15)", color: "#E8920A", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(184, 111, 6, 0.3)" }}>+ UNPLANNED EXTRA</span>}
        </div>

        <div style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:C.am, fontWeight:700 }}>
          <span style={{color: isDone ? C.chL : C.am}}>Plan: {item.kgQty} kg {item.packetQty > 0 ? `| ${item.packetQty} pkts` : ''}</span>
          {isDone && (
            <div className="animate-fade-in" style={{ color: "#4ADE80", marginTop: 2 }}>
              Act: {item.actualKgQty ?? item.kgQty} kg {item.actualPacketQty > 0 || item.packetQty > 0 ? `| ${item.actualPacketQty ?? item.packetQty} pkts` : ''}
            </div>
          )}
        </div>
        {item.notes && <div style={{ fontSize:11, color:C.chL, marginTop:4, fontStyle:"italic", background:C.off, padding:"4px 8px", borderRadius:6, display:"inline-block" }}>📝 {item.notes}</div>}
      </div>

      <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
        {hasRecipe && onShowRecipe && (
          <button onClick={() => onShowRecipe(item.recipeName)} className="hover-lift" style={{ background:C.olBg, border:"1px solid "+C.olBgD, color:C.olDk, padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", flexShrink:0, transition:"all 0.2s" }}>
            📖 Recipe
          </button>
        )}
        
        {onUpdateItem && !isDone && !isCompleting && (
          <button onClick={() => setIsCompleting(true)} className="hover-lift" style={{ background:"#097353", border:"none", color:"#FFFFFF", padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", boxShadow:"0 2px 8px rgba(9,115,83,0.3)" }}>
            ✓ Complete
          </button>
        )}

        {isCompleting && (
          <div className="animate-fade-in" style={{ display:"flex", gap:6, alignItems:"center", background: th.editBg, padding: "6px 8px", borderRadius: 8, border: `1px solid ${th.editBdr}` }}>
            <input type="number" value={actualKg} onChange={e=>setActualKg(e.target.value)} placeholder="Act. kg" style={{ width: 50, padding: "6px", fontSize: 11, borderRadius: 4, background: "#111828", border: "1px solid #1E2A44", color: "#fff", outline:"none" }} />
            <span style={{ fontSize: 10, color: C.chL }}>kg</span>
            <input type="number" value={actualPkts} onChange={e=>setActualPkts(e.target.value)} placeholder="Act. pkts" style={{ width: 50, padding: "6px", fontSize: 11, borderRadius: 4, background: "#111828", border: "1px solid #1E2A44", color: "#fff", outline:"none" }} />
            <span style={{ fontSize: 10, color: C.chL }}>pkts</span>
            <button onClick={handleConfirmComplete} style={{ background: "#097353", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer", marginLeft:4 }}>Save</button>
            <button onClick={() => setIsCompleting(false)} style={{ background: "transparent", color: C.chL, border: "none", fontSize: 11, cursor: "pointer", fontWeight: 800 }}>✕</button>
          </div>
        )}

        {onUpdateItem && isDone && (
          <button onClick={() => onUpdateItem(dpId, item.id, {status: "pending"})} className="hover-lift" style={{ background:C.bdr, border:"none", color:C.ch, padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer" }}>
            ↩ Undo
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MODALS & SCREENS
═══════════════════════════════════════════════════════════════ */
function MergeModal({ pendingItem, activeBatches, onMerge, onNewBatch, onCancel }) {
  const th=useTheme();
  const isMobile = useIsMobile();
  return (
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",zIndex:9999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}}>
      <div className="animate-fade-up modal-sheet" style={{borderRadius:isMobile?"24px 24px 0 0":20,width:"100%",maxWidth:480,padding:"26px 28px",display:"flex",flexDirection:"column",maxHeight:isMobile?"90vh":"auto",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(211,17,24,0.3),transparent)",pointerEvents:"none"}}/>
        <div style={{fontSize:19,fontWeight:900,color:C.ch,letterSpacing:"-0.02em",marginBottom:6}}>Send to Production</div>
        <div style={{fontSize:13,color:C.chL,fontWeight:500,marginBottom:20}}>Choose how to send this item to the kitchen.</div>

        {/* Item preview */}
        <div style={{background:th.cardBg,padding:"14px 16px",borderRadius:12,border:`1px solid ${th.divider}`,marginBottom:18}}>
          <div style={{fontSize:10,fontWeight:800,color:C.chL,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>YOUR ITEM</div>
          <div style={{fontWeight:900,color:C.ch,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
            {pendingItem.product}
            <span style={{fontSize:12,color:C.ol,fontFamily:"'JetBrains Mono',monospace",fontWeight:800}}>{pendingItem.qty} {pendingItem.unit}</span>
          </div>
        </div>

        <Btn variant="primary" full onClick={onNewBatch}>+ Send as New Batch</Btn>

        {activeBatches.length > 0 && (
          <>
            <div style={{textAlign:"center",margin:"14px 0",fontSize:11,fontWeight:700,color:"#1E2A44",textTransform:"uppercase",letterSpacing:"0.1em"}}>— merge with active batch —</div>
            <div className="custom-scrollbar" style={{display:"flex",flexDirection:"column",gap:8,overflowY:"auto",maxHeight:220,marginBottom:16}}>
              {activeBatches.map(b=>(
                <button key={b.batchId} onClick={()=>onMerge(b.batchId)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",border:"1px solid rgba(232,146,10,0.28)",background:"rgba(232,146,10,0.07)",borderRadius:12,cursor:"pointer",textAlign:"left",transition:"all 0.15s",fontFamily:"inherit"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:C.amDk,marginBottom:3}}>{b.product}</div>
                    <div style={{fontSize:11,color:C.chL,fontWeight:600}}>{b.items.length} order{b.items.length!==1?"s":""} in this batch</div>
                  </div>
                  <span style={{fontSize:16,opacity:0.6}}>🔗</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{paddingTop:14,borderTop:`1px solid ${th.divider}`}}>
          <Btn full onClick={onCancel}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="animate-fade-in grain" style={{position:"fixed",inset:0,zIndex:99999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"opacity 0.5s ease",overflow:"hidden"}}>
      <PremiumBg/>
      <div className="animate-fade-up" style={{display:"flex",flexDirection:"column",alignItems:"center",animationDelay:"0.1s",position:"relative",zIndex:2}}>
        <div style={{position:"relative",width:96,height:96,margin:"0 auto 28px"}}>
          <div style={{width:96,height:96,borderRadius:"50%",background:"linear-gradient(145deg,#200A0A,#2E1010)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,animation:"logoGlow 3s infinite ease-in-out"}}>🍽️</div>
          <div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"1px solid rgba(211,17,24,0.18)",animation:"spinSlow 22s linear infinite",pointerEvents:"none"}}/>
          <div style={{position:"absolute",inset:-18,borderRadius:"50%",border:"1px solid rgba(211,17,24,0.08)",animation:"spinSlow 35s linear infinite reverse",pointerEvents:"none"}}/>
        </div>
        <div style={{fontSize:26,fontWeight:900,color:"#EEF2FF",letterSpacing:"-0.04em",marginBottom:6}}>The Food Company</div>
        <div style={{fontSize:11,color:"#3A5070",letterSpacing:"0.22em",textTransform:"uppercase",fontWeight:700,marginBottom:48}}>Operations Hub</div>
        <div style={{width:180,height:3,background:"rgba(255,255,255,0.05)",borderRadius:4,overflow:"hidden",position:"relative"}}>
          <div style={{position:"absolute",top:0,left:0,width:"45%",height:"100%",background:"linear-gradient(90deg,transparent,#D31118,transparent)",animation:"loadBar 1.6s ease-in-out infinite"}}/>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onSignIn }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cardRef = useRef(null);
  useTilt(cardRef);
  useDeviceTilt(cardRef);

  async function handleClick() {
    setLoading(true); setError("");
    try { await onSignIn(); }
    catch (e) {
      if (e?.code === "auth/unauthorized-domain") setError("This domain is not authorized in Firebase. Add it in Firebase Console → Authentication → Authorized domains.");
      else if (e?.code === "auth/popup-blocked") setError("Popup blocked — please allow popups for this site.");
      else setError("Sign-in failed. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="animate-fade-in grain" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
      <PremiumBg/>
      <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:2}}>
        {/* Logo */}
        <div className="animate-fade-up" style={{textAlign:"center",marginBottom:44}}>
          <div style={{position:"relative",width:90,height:90,margin:"0 auto 28px"}}>
            <div style={{width:90,height:90,borderRadius:"50%",background:"linear-gradient(145deg,#200A0A,#2E1010)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,animation:"logoGlow 3s infinite ease-in-out"}}>🍽️</div>
            <div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"1px solid rgba(211,17,24,0.2)",animation:"spinSlow 22s linear infinite",pointerEvents:"none"}}/>
          </div>
          <div style={{fontSize:30,fontWeight:900,color:"#EEF2FF",letterSpacing:"-0.05em",lineHeight:1,marginBottom:10}}>The Food Company</div>
          <div style={{fontSize:11,color:"#2A4060",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.18em"}}>Operations Hub</div>
        </div>

        {/* Glass card with 3D tilt */}
        <div ref={cardRef} className="animate-fade-up glass-card tilt-wrap" style={{borderRadius:24,padding:"36px 32px",position:"relative",overflow:"hidden",animationDelay:"0.15s"}}>
          {/* Top shine line */}
          <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.13),transparent)",pointerEvents:"none"}}/>
          <div style={{fontSize:11,fontWeight:700,color:"#2A4060",marginBottom:28,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.18em"}}>Sign in to continue</div>
          <button onClick={handleClick} disabled={loading} className="btn-3d" style={{width:"100%",padding:"15px 20px",background:loading?"rgba(30,40,60,0.8)":"linear-gradient(135deg,#D31118 0%,#8A0B10 100%)",border:"none",borderRadius:14,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,boxShadow:loading?"none":"0 4px 22px rgba(211,17,24,0.48),inset 0 1px 0 rgba(255,255,255,0.10)",transition:"all 0.2s ease"}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#D31118",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}>G</div>
            <span style={{fontSize:15,fontWeight:800,color:"#FFFFFF",letterSpacing:"0.02em"}}>{loading?"Signing in…":"Continue with Google"}</span>
            {!loading && <span style={{marginLeft:"auto",fontSize:16,opacity:0.5,color:"#fff"}}>→</span>}
          </button>
          {error && <div className="animate-fade-in" style={{marginTop:14,fontSize:12,color:C.rd,fontWeight:700,textAlign:"center",background:C.rdBg,padding:"10px 14px",borderRadius:10,border:"1px solid rgba(220,38,38,0.22)"}}>{error}</div>}
          <div style={{marginTop:28,paddingTop:20,borderTop:"1px solid rgba(255,255,255,0.05)",textAlign:"center",fontSize:11,color:"#1A2840",fontWeight:600}}>Secured via Google OAuth 2.0</div>
        </div>

        <div style={{textAlign:"center",marginTop:32,fontSize:11,color:"#1E2840",fontWeight:600}}>
          Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur
          <div style={{fontSize:10,marginTop:6,fontWeight:500,opacity:0.6}}>© 2026 Made by Banuja Disanayaka</div>
        </div>
      </div>
    </div>
  );
}

function RequestAccessScreen({ authUser, onSubmit, onSignOut }) {
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isMobile = useIsMobile();
  const successRef = useRef(null);
  useTilt(successRef, 7);

  function toggleRole(k) {
    setSelectedRoles(prev => prev.includes(k) ? prev.filter(r => r !== k) : [...prev, k]);
  }

  async function handleRequest() {
    if (selectedRoles.length === 0) return;
    setSubmitting(true);
    await onSubmit(selectedRoles);
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="animate-fade-in grain custom-scrollbar" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
      <PremiumBg/>
      <div style={{width:"100%",maxWidth:560,position:"relative",zIndex:2}}>
        {/* User chip */}
        <div className="animate-fade-up glass-card" style={{borderRadius:16,padding:"14px 18px",marginBottom:22,display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}}/>
          {authUser.photoURL ? <img src={authUser.photoURL} alt="" style={{width:44,height:44,borderRadius:"50%",border:"2px solid rgba(211,17,24,0.4)",flexShrink:0}}/> : <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#D31118,#8A0B10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff",flexShrink:0}}>{authUser.displayName?.[0]||"?"}</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:800,color:C.ch,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.displayName||"Unknown"}</div>
            <div style={{fontSize:11,color:C.chL,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.email}</div>
          </div>
          <button onClick={onSignOut} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:C.chL,padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>Sign Out</button>
        </div>

        <div className="animate-fade-up" style={{textAlign:"center",marginBottom:28,animationDelay:"0.05s"}}>
          <div style={{fontSize:20,fontWeight:900,color:"#EEF2FF",letterSpacing:"-0.02em",marginBottom:8}}>Request Access</div>
          <div style={{fontSize:13,color:"#4A6080",fontWeight:500,lineHeight:1.5}}>Select one or more roles you need. Your request will be reviewed by the owner.</div>
        </div>

        {submitted ? (
          <div ref={successRef} className="animate-fade-up glass-card tilt-wrap" style={{borderRadius:22,padding:"44px 32px",textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(74,222,128,0.3),transparent)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(9,115,83,0.18) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"relative",fontSize:48,marginBottom:18,filter:"drop-shadow(0 0 14px rgba(74,222,128,0.5))"}}>✓</div>
            <div style={{fontSize:20,fontWeight:900,color:"#4ADE80",marginBottom:10}}>Request Sent!</div>
            <div style={{fontSize:13,color:C.chM,fontWeight:500,lineHeight:1.6}}>Your request for <strong style={{color:"#EEF2FF"}}>{selectedRoles.map(r=>ROLES[r]?.label).join(", ")}</strong> access has been submitted. You'll be notified when approved.</div>
          </div>
        ) : (
          <>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:11,marginBottom:20}}>
              {Object.entries(ROLES).map(([k, r], i) => {
                const isSelected = selectedRoles.includes(k);
                return (
                  <div key={k} onClick={() => toggleRole(k)}
                    className="animate-fade-up glass-card role-card"
                    style={{
                      animationDelay:`${i*0.06}s`,
                      gridColumn:(!isMobile && i===4)?"1 / -1":"auto",
                      borderRadius:16, padding:"18px 20px",
                      cursor:"pointer", display:"flex", flexDirection:"column", gap:10, alignItems:"flex-start",
                      borderTop:"2px solid "+(isSelected?r.color:r.color+"40"),
                      border:isSelected?"2px solid "+r.color:"",
                      outline:isSelected?"none":"",
                      boxShadow:isSelected?`0 0 0 2px ${r.color}40, 0 12px 32px rgba(0,0,0,0.5)`:"",
                      position:"relative", overflow:"hidden",
                      transition:"all 0.2s ease",
                    }}>
                    <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${r.color}${isSelected?"40":"20"},transparent)`,pointerEvents:"none"}}/>
                    {isSelected && <div style={{position:"absolute",top:-30,right:-10,width:80,height:80,borderRadius:"50%",background:`radial-gradient(circle,${r.color}20 0%,transparent 70%)`,pointerEvents:"none"}}/>}
                    <div style={{width:40,height:40,background:`linear-gradient(135deg,${r.color}22,${r.color}0A)`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:r.color,border:"1px solid "+r.color+(isSelected?"50":"25"),transition:"transform 0.2s",transform:isSelected?"scale(1.12)":"scale(1)"}}>{r.icon}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:"#EEF2FF",marginBottom:3}}>{r.label}</div>
                      <div style={{fontSize:12,color:"#4A6080",lineHeight:1.5,fontWeight:500}}>{r.desc}</div>
                    </div>
                    {isSelected && <div style={{fontSize:11,color:r.color,fontWeight:800,display:"flex",alignItems:"center",gap:5,background:r.color+"14",border:"1px solid "+r.color+"30",padding:"4px 9px",borderRadius:6}}>✓ Selected</div>}
                  </div>
                );
              })}
            </div>

            <button onClick={handleRequest} disabled={selectedRoles.length===0||submitting} className="btn-3d"
              style={{width:"100%",padding:"15px",background:selectedRoles.length>0?"linear-gradient(135deg,#D31118,#8A0B10)":"rgba(20,28,46,0.8)",border:selectedRoles.length>0?"none":"1px solid rgba(255,255,255,0.06)",borderRadius:14,color:selectedRoles.length>0?"#fff":C.chL,fontSize:15,fontWeight:800,cursor:selectedRoles.length>0&&!submitting?"pointer":"not-allowed",boxShadow:selectedRoles.length>0?"0 4px 22px rgba(211,17,24,0.45),inset 0 1px 0 rgba(255,255,255,0.10)":"none",transition:"all 0.2s",opacity:submitting?0.7:1}}>
              {submitting?"Sending Request…":selectedRoles.length>0?`Request Access (${selectedRoles.length} role${selectedRoles.length>1?"s":""})`:"Select Roles Above"}
            </button>
          </>
        )}

        <div style={{textAlign:"center",marginTop:28,fontSize:11,color:"#1A2840",fontWeight:600}}>Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur</div>
      </div>
    </div>
  );
}

function PendingScreen({ request, authUser, onSignOut }) {
  const cardRef = useRef(null);
  useTilt(cardRef, 7);
  useDeviceTilt(cardRef, 5);
  return (
    <div className="animate-fade-in grain" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
      <PremiumBg/>
      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:2}}>
        {/* User chip */}
        <div className="animate-fade-up glass-card" style={{borderRadius:16,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}}/>
          {authUser.photoURL ? <img src={authUser.photoURL} alt="" style={{width:42,height:42,borderRadius:"50%",border:"2px solid rgba(211,17,24,0.4)",flexShrink:0}}/> : <div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#D31118,#8A0B10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff",flexShrink:0}}>{authUser.displayName?.[0]||"?"}</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:C.ch,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.displayName}</div>
            <div style={{fontSize:11,color:C.chL,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.email}</div>
          </div>
          <button onClick={onSignOut} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:C.chL,padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>Sign Out</button>
        </div>

        {/* Pending card */}
        <div ref={cardRef} className="animate-fade-up glass-card tilt-wrap" style={{borderRadius:22,padding:"44px 32px",textAlign:"center",position:"relative",overflow:"hidden",animationDelay:"0.1s"}}>
          <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(232,146,10,0.25),transparent)",pointerEvents:"none"}}/>
          {/* Amber glow orb behind icon */}
          <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(232,146,10,0.12) 0%,transparent 70%)",pointerEvents:"none"}}/>
          <div style={{position:"relative",fontSize:52,marginBottom:22,filter:"drop-shadow(0 0 16px rgba(232,146,10,0.4))"}}>⏳</div>
          <div style={{fontSize:22,fontWeight:900,color:"#EEF2FF",letterSpacing:"-0.02em",marginBottom:12}}>Awaiting Approval</div>
          <div style={{fontSize:13,color:C.chM,fontWeight:500,lineHeight:1.65,marginBottom:28}}>
            Your request for <strong style={{color:C.am}}>{(request.requestedRoles||[request.requestedRole]).map(r=>ROLES[r]?.label||r).join(", ")}</strong> access has been submitted. The owner will review and approve your request.
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(232,146,10,0.10)",border:"1px solid rgba(232,146,10,0.25)",borderRadius:40,padding:"10px 18px"}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:C.am,display:"inline-block",animation:"statusPulse 2s infinite ease-in-out",flexShrink:0}}/>
            <span style={{fontSize:12,color:C.am,fontWeight:800,letterSpacing:"0.03em"}}>Pending review</span>
          </div>
        </div>

        <div style={{textAlign:"center",marginTop:28,fontSize:11,color:"#1E2840",fontWeight:600}}>Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur</div>
      </div>
    </div>
  );
}

function ControlPanel({ requests, authorizedUsers, onApprove, onReject, onRemoveUser, onBack, authUser, onSignOut }) {
  const th=useTheme();
  const [tab, setTab] = useState("requests");
  const isMobile = useIsMobile();
  const pendingRequests = requests.filter(r => r.status === "pending");

  return (
    <div className="animate-fade-in grain" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif", position:"relative", overflow:"hidden" }}>
      <PremiumBg/>
      <div style={{ position:"relative", zIndex:2, background:th.headerBg, borderBottom:`1px solid ${th.divider}`, padding:"14px 24px", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:C.off, border:"1px solid "+C.bdrL, color:C.chM, padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit" }}>← Back</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:900, color:C.ch }}>Control Panel</div>
          <div style={{ fontSize:11, color:C.chL }}>Owner: {authUser.email}</div>
        </div>
        <button onClick={onSignOut} style={{ background:"none", border:"1px solid "+C.bdrL, color:C.chL, padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit" }}>Sign Out</button>
      </div>

      <div style={{ position:"relative", zIndex:2, display:"flex", background:th.panelBg, borderBottom:`1px solid ${th.divider}`, flexShrink:0, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
        {[{ key:"requests", label:`Pending Requests ${pendingRequests.length > 0 ? "("+pendingRequests.length+")" : ""}` }, { key:"users", label:`Manage Users (${authorizedUsers.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:"14px 16px", background:"none", border:"none", borderBottom:"3px solid "+(tab===t.key?C.ol:"transparent"), color:tab===t.key?C.ol:C.chL, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>{t.label}</button>
        ))}
      </div>

      <div className="custom-scrollbar" style={{ position:"relative", zIndex:2, flex:1, overflowY:"auto", padding: isMobile ? 20 : 32 }}>
        {tab === "requests" && (
          <div>
            {pendingRequests.length === 0 ? (
              <div className="animate-fade-up" style={{ textAlign:"center", padding:"60px 20px", color:C.chXL }}>
                <div style={{ fontSize:48, marginBottom:16 }}>✓</div>
                <div style={{ fontSize:16, fontWeight:700 }}>No pending requests</div>
              </div>
            ) : pendingRequests.map((req, i) => (
              <div key={req.id} className="animate-fade-up" style={{ animationDelay:`${i*0.05}s`, background:C.w, borderRadius:16, padding:"20px 24px", border:"1px solid "+C.bdrL, boxShadow:C.sh, marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                  {req.photoURL ? (
                    <img src={req.photoURL} alt="" style={{ width:48, height:48, borderRadius:"50%", border:"2px solid "+C.bdrL, flexShrink:0 }} />
                  ) : (
                    <div style={{ width:48, height:48, borderRadius:"50%", background:C.bdrL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:C.chM, flexShrink:0 }}>{req.name?.[0] || "?"}</div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:C.ch, marginBottom:2 }}>{req.name}</div>
                    <div style={{ fontSize:12, color:C.chL, marginBottom:4 }}>{req.email}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>{(req.requestedRoles || [req.requestedRole]).map(r => <span key={r} style={{ fontSize:11, fontWeight:800, color:ROLES[r]?.color || C.chM, background:ROLES[r]?.bg || C.off, border:"1px solid "+(ROLES[r]?.color || C.bdrL)+"40", borderRadius:6, padding:"3px 8px" }}>{ROLES[r]?.icon} {ROLES[r]?.label || r}</span>)}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => onApprove(req)} style={{ flex:1, padding:"11px", background:"linear-gradient(135deg, #097353, #065A40)", border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"0 3px 10px rgba(9,115,83,0.3)", fontFamily:"inherit" }}>✓ Approve</button>
                  <button onClick={() => onReject(req)} style={{ flex:1, padding:"11px", background:C.rdBg, border:"1px solid rgba(220,38,38,0.3)", borderRadius:10, color:C.rd, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>✕ Reject</button>
                </div>
              </div>
            ))}

            {requests.filter(r => r.status !== "pending").length > 0 && (
              <div style={{ marginTop:24 }}>
                <div style={{ fontSize:10, fontWeight:900, color:C.chL, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:12 }}>Past Requests</div>
                {requests.filter(r => r.status !== "pending").map((req, i) => (
                  <div key={req.id} className="animate-fade-up" style={{ animationDelay:`${i*0.03}s`, background:C.off, borderRadius:12, padding:"14px 18px", border:"1px solid "+C.bdrL, marginBottom:8, display:"flex", alignItems:"center", gap:12, opacity:0.7 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.ch }}>{req.name}</div>
                      <div style={{ fontSize:11, color:C.chL }}>{req.email} · {(req.requestedRoles || [req.requestedRole]).map(r => ROLES[r]?.label || r).join(", ")}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:800, padding:"3px 8px", borderRadius:6, background:req.status==="approved"?"rgba(9,115,83,0.2)":C.rdBg, color:req.status==="approved"?"#4ADE80":C.rd, border:"1px solid "+(req.status==="approved"?"rgba(9,115,83,0.4)":"rgba(220,38,38,0.3)") }}>{req.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div>
            {authorizedUsers.length === 0 ? (
              <div className="animate-fade-up" style={{ textAlign:"center", padding:"60px 20px", color:C.chXL }}>
                <div style={{ fontSize:16, fontWeight:700 }}>No authorized users yet</div>
              </div>
            ) : authorizedUsers.map((user, i) => (
              <div key={user.email} className="animate-fade-up" style={{ animationDelay:`${i*0.05}s`, background:C.w, borderRadius:16, padding:"18px 22px", border:"1px solid "+C.bdrL, boxShadow:C.sh, marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" style={{ width:44, height:44, borderRadius:"50%", border:"2px solid "+C.bdrL, flexShrink:0 }} />
                ) : (
                  <div style={{ width:44, height:44, borderRadius:"50%", background:C.bdrL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:C.chM, flexShrink:0 }}>{user.name?.[0] || "?"}</div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.ch, marginBottom:2 }}>{user.name}</div>
                  <div style={{ fontSize:11, color:C.chL, marginBottom:6 }}>{user.email}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {(user.roles || []).map(role => (
                      <span key={role} style={{ fontSize:11, fontWeight:800, color:ROLES[role]?.color || C.chM, background:ROLES[role]?.bg || C.off, border:"1px solid "+(ROLES[role]?.color || C.bdrL)+"40", borderRadius:6, padding:"3px 8px" }}>{ROLES[role]?.icon} {ROLES[role]?.label || role}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => { if(window.confirm(`Remove ${user.name}?`)) onRemoveUser(user.email); }} style={{ background:C.rdBg, border:"1px solid rgba(220,38,38,0.3)", color:C.rd, padding:"8px 12px", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", flexShrink:0, fontFamily:"inherit" }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoleSelectScreen({ availableRoles, onSelect, isOwner, onControlPanel, authUser, onSignOut, pendingCount }) {
  const isMobile = useIsMobile();
  const keys = availableRoles || Object.keys(ROLES);

  /* Per-card tilt: store refs in an array */
  const cardRefs = useRef([]);
  useEffect(() => {
    cardRefs.current.forEach(el => {
      if (!el) return;
      if (window.matchMedia("(pointer: coarse)").matches) return;
      function onMove(e) {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        el.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-6px) scale(1.02)`;
        el.style.boxShadow = `${x * -10}px ${y * -10}px 30px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.4)`;
      }
      function onLeave() {
        el.style.transform = "";
        el.style.boxShadow = "";
      }
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      el._tiltCleanup = () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
    });
    return () => cardRefs.current.forEach(el => el?._tiltCleanup?.());
  }, [keys.join(",")]);

  return (
    <div className="animate-fade-in grain custom-scrollbar" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
      <PremiumBg/>
      <div style={{width:"100%",maxWidth:560,position:"relative",zIndex:2}}>
        {/* User chip */}
        {authUser && (
          <div className="animate-fade-up glass-card" style={{borderRadius:16,padding:"13px 18px",marginBottom:24,display:"flex",alignItems:"center",gap:12,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}}/>
            {authUser.photoURL ? <img src={authUser.photoURL} alt="" style={{width:38,height:38,borderRadius:"50%",border:"2px solid "+(isOwner?"rgba(211,17,24,0.6)":"rgba(255,255,255,0.12)"),flexShrink:0}}/> : <div style={{width:38,height:38,borderRadius:"50%",background:isOwner?"linear-gradient(135deg,#D31118,#8A0B10)":"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",flexShrink:0}}>{authUser.displayName?.[0]||"?"}</div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:800,color:C.ch,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.displayName||"User"}</div>
              <div style={{fontSize:10,color:isOwner?C.ol:C.chL,fontWeight:isOwner?800:500,textTransform:"uppercase",letterSpacing:"0.06em"}}>{isOwner?"Owner · Full Access":"Authorized User"}</div>
            </div>
            {isOwner && (
              <button onClick={onControlPanel} style={{background:"rgba(211,17,24,0.12)",border:"1px solid rgba(211,17,24,0.3)",color:C.ol,padding:"7px 13px",borderRadius:9,fontSize:11,fontWeight:800,cursor:"pointer",flexShrink:0,fontFamily:"inherit",position:"relative",transition:"all 0.2s"}}>
                Control Panel
                {pendingCount > 0 && <span style={{position:"absolute",top:-7,right:-7,background:C.rd,color:"#fff",borderRadius:"50%",width:17,height:17,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #04060E"}}>{pendingCount}</span>}
              </button>
            )}
            <button onClick={onSignOut} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:C.chL,padding:"6px 10px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>Sign Out</button>
          </div>
        )}

        {/* Heading */}
        <div className="animate-fade-up" style={{textAlign:"center",marginBottom:28,animationDelay:"0.05s"}}>
          <div style={{position:"relative",width:62,height:62,margin:"0 auto 18px"}}>
            <div style={{width:62,height:62,borderRadius:"50%",background:"linear-gradient(145deg,#200A0A,#2E1010)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,animation:"logoGlow 3s infinite ease-in-out"}}>🍽️</div>
            <div style={{position:"absolute",inset:-8,borderRadius:"50%",border:"1px solid rgba(211,17,24,0.16)",animation:"spinSlow 22s linear infinite",pointerEvents:"none"}}/>
          </div>
          <div style={{fontSize:22,fontWeight:900,color:"#EEF2FF",letterSpacing:"-0.03em",lineHeight:1}}>Welcome back.</div>
          <div style={{fontSize:13,color:"#4A6080",fontWeight:500,marginTop:8}}>Select your operational role to continue</div>
        </div>

        {/* Role tiles */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          {keys.map((k, i) => {
            const r = ROLES[k]; if (!r) return null;
            return (
              <div
                key={k}
                ref={el => { cardRefs.current[i] = el; }}
                onClick={() => onSelect(k)}
                className="animate-fade-up glass-card role-card"
                style={{
                  animationDelay:`${i * 0.07}s`,
                  gridColumn:(!isMobile && i === keys.length - 1 && keys.length % 2 !== 0) ? "1 / -1" : "auto",
                  borderRadius:18, padding:"22px 22px 18px",
                  cursor:"pointer", display:"flex", flexDirection:"column", gap:14, alignItems:"flex-start",
                  borderTop:"2px solid "+r.color+"60",
                  position:"relative", overflow:"hidden",
                }}
              >
                {/* Top shine */}
                <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${r.color}30,transparent)`,pointerEvents:"none"}}/>
                {/* Subtle glow orb */}
                <div style={{position:"absolute",top:-40,right:-20,width:100,height:100,borderRadius:"50%",background:`radial-gradient(circle,${r.color}15 0%,transparent 70%)`,pointerEvents:"none"}}/>
                {/* Icon */}
                <div style={{width:46,height:46,background:`linear-gradient(135deg,${r.color}22,${r.color}0A)`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:r.color,border:"1px solid "+r.color+"30",flexShrink:0}}>
                  {r.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:900,color:"#EEF2FF",marginBottom:5,letterSpacing:"-0.02em"}}>{r.label}</div>
                  <div style={{fontSize:12,color:"#4A6080",lineHeight:1.55,fontWeight:500}}>{r.desc}</div>
                </div>
                <div style={{fontSize:11,color:r.color,display:"flex",alignItems:"center",gap:6,fontWeight:700,background:r.color+"14",border:"1px solid "+r.color+"28",padding:"5px 10px",borderRadius:6}}>
                  <span style={{fontSize:9}}>▶</span> Enter portal
                </div>
              </div>
            );
          })}
        </div>

        <div className="animate-fade-up" style={{textAlign:"center",marginTop:36,fontSize:11,color:"#1A2840",fontWeight:600,animationDelay:"0.4s"}}>
          Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur
          <div style={{fontSize:10,marginTop:6,fontWeight:500,opacity:0.6}}>© 2026 Made by Banuja Disanayaka</div>
        </div>
      </div>
    </div>
  );
}


function NewOrderModal({onClose,onSubmit,notify}){
  const th=useTheme();
  const isMobile = useIsMobile(); const [rest,setRest]=useState("Vins"); const [poName, setPoName] = useState(""); const [poDate, setPoDate] = useState(fmtDate()); const [delDate, setDelDate] = useState(""); const [stagedItems, setStagedItems] = useState([]);
  const [prod, setProd] = useState(""); const [qty, setQty] = useState(""); const [unit, setUnit] = useState("kg"); const [err, setErr] = useState(""); const [inputMode, setInputMode] = useState("manual"); const [bulkText, setBulkText] = useState("");
  const [editId, setEditId] = useState(null); const [ep, setEp] = useState(""); const [eq, setEq] = useState(""); const [eu, setEu] = useState("");

  function handleAddItem(e){ e.preventDefault(); if(!prod.trim()) { setErr("Please enter a product name."); return; } setStagedItems(prev => [{ id: "stg_"+Date.now()+Math.random(), product: prod.trim(), qty: qty, unit: unit }, ...prev]); setProd(""); setQty(""); setErr(""); }
  function removeItem(id){ setStagedItems(prev => prev.filter(i => i.id !== id)); }
  function submitFinalOrder(){ if(stagedItems.length === 0){ setErr("Please add at least one item before submitting."); return; } onSubmit(rest, poName, poDate, delDate, stagedItems); }
  function saveInlineEdit() { if(!ep.trim()) return; setStagedItems(prev => prev.map(i => i.id === editId ? {...i, product: ep.trim(), qty: eq, unit: eu} : i)); setEditId(null); }

  function handleBulkTextParse() {
    if (!bulkText.trim()) { setErr("Please paste some text first."); return; }
    setErr(""); const lines = bulkText.split("\n"); let addedCount = 0; const newItems = [];
    lines.forEach(line => {
      if (!line.trim()) return;
      const numMatch = line.match(/(\d+(?:\.\d+)?)/); const rowQty = numMatch ? numMatch[1] : "";
      let rowUnit = "kg"; const upperLine = line.toUpperCase();
      if (upperLine.match(/(?:^|\s|\d|-)(PKTS?|PACKETS?)\b/)) rowUnit = "pkt"; 
      else if (upperLine.match(/(?:^|\s|\d|-)(BTLS?|BOTTLES?)\b/)) rowUnit = "btl"; 
      else if (upperLine.match(/(?:^|\s|\d|-)(NOS|PCS?|PIECES?)\b/)) rowUnit = "nos"; 
      else if (upperLine.match(/(?:^|\s|\d|-)(G|GMS?|GRAMS?)\b/) && !upperLine.match(/(?:^|\s|\d|-)KGS?\b/)) rowUnit = "g"; 
      else if (upperLine.match(/(?:^|\s|\d|-)(CTNS?|CARTONS?)\b/)) rowUnit = "ctn";

      const matchedCatalogName = findRecipeFuzzyBulk(line);
      if (matchedCatalogName) { newItems.push({ id: "bulk_" + Date.now() + "_" + Math.random(), product: matchedCatalogName, qty: rowQty, unit: rowUnit }); addedCount++; } 
      else { let cleanName = line; if (rowQty) cleanName = cleanName.replace(rowQty, ""); cleanName = cleanName.replace(/-/g, "").replace(/\b(pkts?|packets?|nos|pcs?|pieces?|kgs?|g|gms?|grams?|btls?|bottles?|ctns?|cartons?)\b/gi, "").trim(); newItems.push({ id: "bulk_" + Date.now() + "_" + Math.random(), product: cleanName || line, qty: rowQty, unit: rowUnit }); addedCount++; }
    });
    if (newItems.length > 0) { setStagedItems(prev => [...newItems, ...prev]); setBulkText(""); setInputMode("manual"); notify(`✓ Processed ${addedCount} items!`); } else { setErr("Could not process layout structure."); }
  }

  const inputStyle = {padding:"10px 14px",border:"1px solid #1E2A44",borderRadius:10,fontSize:13,color:"#EEF2FF",outline:"none",background:"#111828",width:"100%",boxSizing:"border-box",transition: "border-color 0.2s, box-shadow 0.2s"};

  return(
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",zIndex:999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20,fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif"}}>
      <datalist id="recipe-database">
        {RECIPE_DB.map(r => <option key={r.recipe_id} value={r.recipe_name} label={r.item_code ? `${r.recipe_name} · ${r.item_code}` : r.recipe_name} />)}
        {ITEMS_DB.filter(i => {const u=i.name.trim().toUpperCase(); return !RECIPE_DB.some(r=>r.recipe_name&&r.recipe_name.toUpperCase().trim()===u);}).map(i => <option key={i.item_code+"_"+i.name} value={i.name} label={`${i.name} · ${i.item_code}`} />)}
      </datalist>
      <div className="animate-fade-up modal-sheet" style={{borderRadius:isMobile?"24px 24px 0 0":20,width:"100%",maxWidth:720,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"22px 30px",borderBottom:`1px solid ${th.divider}`,flexShrink:0,position:"relative"}}>
          <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(211,17,24,0.28),transparent)",pointerEvents:"none"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:C.ch,letterSpacing:"-0.02em"}}>Draft Purchase Order</div>
              <div style={{fontSize:13,color:C.chL,marginTop:4,fontWeight:500}}>Configure details and build your item list below.</div>
            </div>
            <button onClick={onClose} style={{background:th.closeBg,border:`1px solid ${th.closeBdr}`,borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:15,color:C.chM,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
          </div>
        </div>
        <div className="custom-scrollbar" style={{overflowY:"auto",flex:1,padding:"24px 30px"}}>
          
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}><div style={{width:28, height:28, borderRadius:"50%", background:C.ch, color:C.w, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0}}>1</div><div style={{fontSize:13, fontWeight:800, color:C.ch}}>Order Details</div></div>
          <div style={{display:"flex", gap:12, marginBottom:16, flexDirection: isMobile ? "column" : "row"}}>
            <div style={{flex:1}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>Kitchen</div><div style={{display:"flex",gap:8}}>{["Vins","Manja"].map(rn=>(<button key={rn} onClick={()=>setRest(rn)} className="hover-lift" style={{padding:"10px 14px",borderRadius:10,border:"2px solid "+(rest===rn?C.ol:C.bdrL),background:rest===rn?C.olBg:C.w,color:rest===rn?C.olDk:C.chL,fontWeight:800,fontSize:13,cursor:"pointer", flex: 1}}>{rn}</button>))}</div></div>
            <div style={{flex:1}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>PO Reference Name</div><input value={poName} onChange={e=>setPoName(e.target.value)} placeholder="e.g. Sago event PO" style={inputStyle}/></div>
          </div>
          <div style={{display:"flex", gap:12, marginBottom:28, flexDirection: isMobile ? "column" : "row"}}>
            <div style={{flex:1}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>PO Received Date</div><input value={poDate} onChange={e=>setPoDate(e.target.value)} style={inputStyle}/></div>
            <div style={{flex:1}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>Deliver Before (Optional)</div><input value={delDate} onChange={e=>setDelDate(e.target.value)} placeholder="e.g. 20th May" style={inputStyle}/></div>
          </div>
          <div style={{display:"flex", flexDirection: isMobile ? "column" : "row", justifyContent:"space-between", alignItems: isMobile ? "flex-start" : "center", gap: 12, marginBottom:16}}>
            <div style={{display:"flex", alignItems:"center", gap:12}}><div style={{width:28, height:28, borderRadius:"50%", background:C.ch, color:C.w, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0}}>2</div><div style={{fontSize:13, fontWeight:800, color:C.ch}}>Add Items to Order</div></div>
            <div style={{display:"flex", background:"#0C1020", borderRadius:10, border:"1px solid "+C.bdrL, padding:4}}><button onClick={() => setInputMode("manual")} style={{padding:"8px 16px", border:"none", background: inputMode==="manual"?C.w:"transparent", borderRadius:8, fontSize:12, fontWeight:700, color:inputMode==="manual"?C.ch:C.chL, cursor:"pointer", boxShadow:inputMode==="manual"?C.sh:"none"}}>Manual Addition</button><button onClick={() => setInputMode("bulk")} style={{padding:"8px 16px", border:"none", background: inputMode==="bulk"?C.w:"transparent", borderRadius:8, fontSize:12, fontWeight:700, color:inputMode==="bulk"?C.olDk:C.chL, cursor:"pointer", boxShadow:inputMode==="bulk"?C.sh:"none"}}>Paste WhatsApp List</button></div>
          </div>
          {inputMode === "manual" && (<form className="animate-fade-in" onSubmit={handleAddItem} style={{background:"#0C1020", padding:20, borderRadius:16, border:"1px solid "+C.bdrL, marginBottom:28}}><div style={{display:"flex", flexDirection: isMobile ? "column" : "row", gap: 12, alignItems:"flex-start"}}><div style={{flex:1, width:"100%"}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>Product (Type to search)</div><input list="recipe-database" value={prod} onChange={e => {setProd(e.target.value); setErr("");}} placeholder="e.g. Madras Spiced" style={{padding:"12px 16px",border:"2px solid "+C.w,borderRadius:10,fontSize:14,color:C.ch,outline:"none",background:C.w,width:"100%",boxSizing:"border-box", boxShadow:C.sh}}/></div><div style={{display:"flex", gap:12, width: isMobile ? "100%" : "auto"}}><div style={{width: 80}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>Qty</div><input value={qty} onChange={e => setQty(e.target.value)} placeholder="—" style={{padding:"12px 8px",border:"2px solid "+C.w,borderRadius:10,fontSize:14,color:C.ch,outline:"none",background:C.w,width:"100%",boxSizing:"border-box",textAlign:"center", boxShadow:C.sh}}/></div><div style={{width: 90}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>Unit</div><select value={unit} onChange={e => setUnit(e.target.value)} style={{padding:"12px 10px",border:"2px solid "+C.w,borderRadius:10,fontSize:14,color:C.ch,outline:"none",background:C.w,width:"100%",cursor:"pointer", height:46, boxShadow:C.sh}}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div></div></div><button type="submit" className="hover-lift" style={{marginTop:16,width:"100%",padding:"14px",background:C.ch,color:C.w,border:"none",borderRadius:10,fontWeight:800,cursor:"pointer", fontSize:14}}>+ Add Item to List</button></form>)}
          {inputMode === "bulk" && (<div className="animate-fade-in" style={{background:C.olBg, padding:20, borderRadius:16, border:"1px solid "+C.olBgD, marginBottom:28}}><div style={{fontSize:13, color:C.olDk, fontWeight:700, marginBottom:12}}>Paste your structural text list cleanly. Unmatched items will be added exactly as typed.</div><textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder="Whole chicken - 10kg&#10;Feta Cheese - 10pkts" style={{width:"100%", boxSizing:"border-box", height:140, padding:16, borderRadius:10, border:"2px solid "+C.olBgD, outline:"none", fontSize:14, resize:"none", marginBottom:12, fontFamily:"monospace"}}/><button onClick={handleBulkTextParse} className="hover-lift" style={{width:"100%", padding:"14px", background:C.ol, color:C.w, border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", fontSize:14, boxShadow:C.sh}}>⚡ Run Instant Bulk Parse</button></div>)}
          {err&&<div className="animate-fade-in" style={{marginBottom:16,fontSize:13,color:C.rd,fontWeight:700, background:C.rdBg, padding:"10px 14px", borderRadius:8}}>{err}</div>}
          
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}><div style={{width:28, height:28, borderRadius:"50%", background:C.ch, color:C.w, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0}}>3</div><div style={{fontSize:13, fontWeight:800, color:C.ch}}>Final Review</div></div>
          {stagedItems.length === 0 ? (<div style={{textAlign:"center", padding:"40px 20px", border:"2px dashed "+C.bdrL, borderRadius:16, color:C.chXL, fontSize:14, fontWeight:600}}>No items added yet.</div>) : (
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {stagedItems.map((item, i) => (
                <div key={item.id} className="animate-fade-up" style={{animationDelay:`${Math.min(i*0.05, 0.5)}s`, padding:"14px 18px", background:C.w, border:"1px solid "+C.bdr, borderRadius:12, boxShadow:C.sh}}>
                  {editId === item.id ? (
                    <div className="animate-fade-in" style={{display:"flex", flexDirection:"column", gap:10}}>
                      <input list="recipe-database" value={ep} onChange={e=>setEp(e.target.value)} placeholder="Product Name" style={{padding:"10px 14px", border:"2px solid "+C.ol, borderRadius:8, outline:"none", fontSize:14, fontWeight:600}} />
                      <div style={{display:"flex", gap:10}}>
                        <input value={eq} onChange={e=>setEq(e.target.value)} placeholder="Qty" style={{padding:"10px 14px", border:"1px solid "+C.bdr, borderRadius:8, flex:1, outline:"none", fontSize:14}} />
                        <select value={eu} onChange={e=>setEu(e.target.value)} style={{padding:"10px 14px", border:"1px solid "+C.bdr, borderRadius:8, flex:1, outline:"none", fontSize:14, cursor:"pointer"}}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select>
                      </div>
                      <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:4}}><Btn size="sm" onClick={()=>setEditId(null)}>Cancel</Btn><Btn size="sm" variant="success" onClick={saveInlineEdit}>✓ Save</Btn></div>
                    </div>
                  ) : (
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div><div style={{fontSize:14, fontWeight:800, color:C.ch, marginBottom:4}}>{item.product}</div><div style={{fontSize:12, color:C.chL, fontFamily:"monospace", fontWeight:600}}>Qty: {item.qty || "—"} {item.unit}</div></div>
                      <div style={{display:"flex", gap:6}}><button onClick={()=>{setEditId(item.id); setEp(item.product); setEq(item.qty); setEu(item.unit);}} className="hover-lift" style={{background:C.amBg, border:"none", color:C.amDk, fontSize:12, fontWeight:800, cursor:"pointer", padding:"8px 12px", borderRadius:8}}>Edit</button><button onClick={()=>removeItem(item.id)} className="hover-lift" style={{background:C.rdBg, border:"none", color:C.rd, fontSize:12, fontWeight:800, cursor:"pointer", padding:"8px 12px", borderRadius:8}}>Remove</button></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{padding:"18px 30px",borderTop:`1px solid ${th.divider}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:th.footerBg,borderRadius:isMobile?"0":"0 0 20px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{background:stagedItems.length>0?"rgba(211,17,24,0.15)":th.chipBg,border:"1px solid "+(stagedItems.length>0?"rgba(211,17,24,0.35)":th.divider),color:stagedItems.length>0?C.ol:C.chL,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:800,transition:"all 0.3s"}}>
              {stagedItems.length} item{stagedItems.length!==1?"s":""}
            </div>
            {stagedItems.length===0&&<span style={{fontSize:11,color:C.chL,fontWeight:600}}>Add items above</span>}
          </div>
          <div style={{display:"flex",gap:10}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={submitFinalOrder} variant="primary">Submit Order</Btn></div>
        </div>
      </div>
    </div>
  );
}

function EditOrderModal({order, onClose, onSave, notify}){
  const th=useTheme();
  const isMobile = useIsMobile(); const [epName, setEpName] = useState(order.poName || ""); const [epDate, setEpDate] = useState(order.orderDate || ""); const [edDate, setEdDate] = useState(order.deliveryDate || ""); const [items, setItems] = useState([...order.items]); const [editId, setEditId] = useState(null); const [ep, setEp] = useState(""); const [eq, setEq] = useState(""); const [eu, setEu] = useState(""); const [np, setNp] = useState(""); const [nq, setNq] = useState(""); const [nu, setNu] = useState("kg");
  function handleSaveInline(){ if(!ep.trim()) return; setItems(prev => prev.map(i => i.id === editId ? {...i, product: ep.trim(), qty: eq, unit: eu} : i)); setEditId(null); } function handleAddNew(e){ e.preventDefault(); if(!np.trim()) { notify("Please enter a product name", "error"); return; } setItems(prev => [{id: "item_added_"+Date.now(), product: np.trim(), qty: nq, unit: nu, status: "pending", packedQty: "", notes: ""}, ...prev]); setNp(""); setNq(""); } function handleRemove(id){ setItems(prev => prev.filter(i => i.id !== id)); } function submit(){ if(items.length === 0){ notify("Order must have at least 1 item. Delete the order instead.", "error"); return; } onSave(order.id, items, {poName: epName, orderDate: epDate, deliveryDate: edDate}); }

  const inputStyle = {padding:"10px 14px",border:"1px solid #1E2A44",borderRadius:10,fontSize:13,color:"#EEF2FF",outline:"none",background:"#111828",width:"100%",boxSizing:"border-box",transition: "border-color 0.2s, box-shadow 0.2s"};

  return(
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",zIndex:999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20,fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif"}}>
      <datalist id="recipe-database">
        {RECIPE_DB.map(r => <option key={r.recipe_id} value={r.recipe_name} label={r.item_code ? `${r.recipe_name} · ${r.item_code}` : r.recipe_name} />)}
        {ITEMS_DB.filter(i => {const u=i.name.trim().toUpperCase(); return !RECIPE_DB.some(r=>r.recipe_name&&r.recipe_name.toUpperCase().trim()===u);}).map(i => <option key={i.item_code+"_"+i.name} value={i.name} label={`${i.name} · ${i.item_code}`} />)}
      </datalist>
      <div className="animate-fade-up modal-sheet" style={{borderRadius:isMobile?"24px 24px 0 0":20,width:"100%",maxWidth:720,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"22px 30px 20px",borderBottom:`1px solid ${th.divider}`,flexShrink:0,position:"relative"}}>
          <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(232,146,10,0.28),transparent)",pointerEvents:"none"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:C.ch,letterSpacing:"-0.02em"}}>Edit Live Order</div>
              <div style={{fontSize:13,color:C.chL,marginTop:4,fontWeight:500}}>Modify quantities, dates, or remove items.</div>
            </div>
            <button onClick={onClose} style={{background:th.closeBg,border:`1px solid ${th.closeBdr}`,borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:15,color:C.chM,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
          </div>
        </div>
        <div className="custom-scrollbar" style={{overflowY:"auto",flex:1,padding:"24px 30px"}}>
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}><div style={{width:28, height:28, borderRadius:"50%", background:C.ch, color:C.w, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0}}>1</div><div style={{fontSize:13, fontWeight:800, color:C.ch}}>Update Details</div></div>
          <div style={{display:"flex", gap:10, marginBottom:20, flexDirection: isMobile ? "column" : "row"}}><div style={{flex:1}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6}}>PO REFERENCE NAME</div><input value={epName} onChange={e=>setEpName(e.target.value)} style={inputStyle}/></div><div style={{display:"flex", gap:10, flex:1}}><div style={{flex:1}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6}}>RECEIVED DATE</div><input value={epDate} onChange={e=>setEpDate(e.target.value)} style={inputStyle}/></div><div style={{flex:1}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6}}>DELIVERY BEFORE</div><input value={edDate} onChange={e=>setEdDate(e.target.value)} style={inputStyle}/></div></div></div>
          
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}><div style={{width:28, height:28, borderRadius:"50%", background:C.ch, color:C.w, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0}}>2</div><div style={{fontSize:13, fontWeight:800, color:C.ch}}>Add Missed Item</div></div>
          <form onSubmit={handleAddNew} style={{display:"flex", flexDirection:isMobile?"column":"row", gap:10, background:"#0C1020", padding:"16px", borderRadius:14, border:"1px solid "+C.bdrL, marginBottom:28}}><input list="recipe-database" value={np} onChange={e=>setNp(e.target.value)} placeholder="Product Name" style={{flex:2, padding:"10px 14px", border:"1px solid "+C.bdr, borderRadius:8, outline:"none", fontSize:14, fontWeight:600}} /><div style={{display:"flex", gap:10, flex:1}}><input value={nq} onChange={e=>setNq(e.target.value)} placeholder="Qty" style={{width:"60px", padding:"10px 10px", border:"1px solid "+C.bdr, borderRadius:8, outline:"none", fontSize:14, textAlign:"center"}} /><select value={nu} onChange={e=>setNu(e.target.value)} style={{width:"80px", padding:"10px", border:"1px solid "+C.bdr, borderRadius:8, outline:"none", fontSize:14, cursor:"pointer"}}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div><Btn type="submit" variant="dark" full={isMobile}>+ Add</Btn></form>
          
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}><div style={{width:28, height:28, borderRadius:"50%", background:C.ch, color:C.w, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0}}>3</div><div style={{fontSize:13, fontWeight:800, color:C.ch}}>Current Items ({items.length})</div></div>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {items.map((item, i) => (
              <div key={item.id} className="animate-fade-up" style={{animationDelay:`${Math.min(i*0.05, 0.5)}s`, padding:"14px 18px", background:C.w, border:"1px solid "+C.bdr, borderRadius:12, boxShadow:C.sh}}>
                {editId === item.id ? (
                  <div className="animate-fade-in" style={{display:"flex", flexDirection:"column", gap:10}}><input list="recipe-database" value={ep} onChange={e=>setEp(e.target.value)} placeholder="Product Name" style={{padding:"10px 14px", border:"2px solid "+C.ol, borderRadius:8, outline:"none", fontSize:14, fontWeight:600}} /><div style={{display:"flex", gap:10}}><input value={eq} onChange={e=>setEq(e.target.value)} placeholder="Qty" style={{padding:"10px 14px", border:"1px solid "+C.bdr, borderRadius:8, flex:1, outline:"none", fontSize:14}} /><select value={eu} onChange={e=>setEu(e.target.value)} style={{padding:"10px 14px", border:"1px solid "+C.bdr, borderRadius:8, flex:1, outline:"none", fontSize:14, cursor:"pointer"}}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div><div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:4}}><Btn size="sm" onClick={()=>setEditId(null)}>Cancel</Btn><Btn size="sm" variant="success" onClick={handleSaveInline}>✓ Save</Btn></div></div>
                ) : (
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}><div><div style={{fontSize:14, fontWeight:800, color:C.ch, marginBottom:4, display:"flex", alignItems:"center", gap:8}}>{item.product}{item.status !== 'pending' && <Badge status={item.status} />}</div><div style={{fontSize:12, color:C.chL, fontFamily:"monospace", fontWeight:600}}>Qty: {item.qty || "—"} {item.unit}</div></div><div style={{display:"flex", gap:6}}><button onClick={()=>{setEditId(item.id); setEp(item.product); setEq(item.qty); setEu(item.unit);}} className="hover-lift" style={{background:C.amBg, border:"none", color:C.amDk, fontSize:12, fontWeight:800, cursor:"pointer", padding:"8px 12px", borderRadius:8}}>Edit</button><button onClick={()=>handleRemove(item.id)} className="hover-lift" style={{background:C.rdBg, border:"none", color:C.rd, fontSize:12, fontWeight:800, cursor:"pointer", padding:"8px 12px", borderRadius:8}}>Remove</button></div></div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"18px 30px",borderTop:`1px solid ${th.divider}`,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10,flexShrink:0,background:th.footerBg,borderRadius:isMobile?"0":"0 0 20px 20px"}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={submit} variant="primary">✓ Update Live Order</Btn></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ORDER CARD & VIEWS 
═══════════════════════════════════════════════════════════════ */
function OrderCard({order, active, onClick, onDelete, index}){
  const th=useTheme();
  const s=oStats(order);
  const rc=order.restaurant==="Vins"?C.ol:C.am;
  const totalCompleted=s.packed+s.delivered;
  const pct=s.total?Math.round((totalCompleted/s.total)*100):0;
  const isComplete=pct===100;
  const [showDel,setShowDel]=useState(false);
  const hasIssue=s.short+s.oos>0;

  return(
    <div
      onClick={onClick}
      className={`animate-fade-up hover-lift ${isComplete&&!active?'celebration-card':''} ${active?(order.restaurant==="Vins"?"order-card-active-vins":"order-card-active-manja"):""}`}
      style={{
        animationDelay:`${index*0.05}s`,
        padding:"14px 16px",borderRadius:16,marginBottom:8,cursor:"pointer",
        background:active?(th.isDark?`linear-gradient(160deg,#111E36,#0B1228)`:`linear-gradient(160deg,#EFF4FF,#E8F0FF)`):C.off,
        border:`1.5px solid ${active?rc+"60":C.bdrL}`,
        borderLeft:`4px solid ${active?rc:C.bdrL}`,
        transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)"
      }}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:active?10:8,position:"relative"}}>
        <div style={{fontWeight:800,color:active?C.ch:C.chM,fontSize:active?15:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.02em",transition:"font-size 0.2s ease"}}>
          {order.poName||order.restaurant+" Order"}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8}}>
          {hasIssue&&<span style={{width:7,height:7,borderRadius:"50%",background:"#D31118",animation:"pulseSoft 2s infinite",display:"inline-block"}}/>}
          <span style={{fontSize:active?19:14,fontWeight:900,color:pct===100?"#4ADE80":rc,lineHeight:1,letterSpacing:"-0.03em",textShadow:active?`0 0 14px ${rc}80`:"none"}}>{pct}%</span>
        </div>
      </div>

      <div style={{marginBottom:8,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:900,color:rc,background:rc+"18",borderRadius:99,padding:"3px 11px",letterSpacing:"0.03em",border:`1px solid ${rc}30`}}>{order.restaurant}</span>
        {(s.prod+s.prod_done)>0&&<span style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"#FBB040",fontWeight:800,background:"rgba(251,176,64,0.08)",border:"1px solid rgba(251,176,64,0.18)",borderRadius:99,padding:"2px 9px"}}><span className="prod-dot"/>{s.prod+s.prod_done} cooking</span>}
      </div>

      <div style={{height:5,background:C.bdrL,borderRadius:99,marginBottom:6,overflow:"hidden"}}>
        <div style={{height:5,width:pct+"%",background:pct===100?"linear-gradient(90deg,#097353,#16A34A)":`linear-gradient(90deg,${rc},${rc}CC)`,borderRadius:99,transition:"width 0.8s cubic-bezier(0.16,1,0.3,1)",boxShadow:active?(pct===100?"0 0 10px rgba(9,115,83,0.6)":`0 0 10px ${rc}80`):"none"}}/>
      </div>
      <div style={{fontSize:9,color:C.chL,marginBottom:10,fontWeight:600}}>{s.packed+s.delivered}/{s.total} items done</div>

      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:onDelete?10:0}}>
        {s.delivered>0&&<span style={{fontSize:9,color:C.chM,background:"rgba(184,196,224,0.12)",border:"1px solid rgba(184,196,224,0.2)",borderRadius:20,padding:"2px 7px",fontWeight:700}}>{s.delivered} dlvrd</span>}
        {s.packed>0&&<span style={{fontSize:9,color:C.ol,background:C.olBg,border:"1px solid rgba(211,17,24,0.2)",borderRadius:20,padding:"2px 7px",fontWeight:700}}>{s.packed} packed</span>}
        {(s.prod+s.prod_done)>0&&<span style={{fontSize:9,color:C.amDk,background:C.amBg,border:"1px solid rgba(232,146,10,0.2)",borderRadius:20,padding:"2px 7px",fontWeight:700}}>{s.prod+s.prod_done} prod</span>}
        {s.short>0&&<span style={{fontSize:9,color:"#E8920A",background:"rgba(232,146,10,0.1)",border:"1px solid rgba(232,146,10,0.25)",borderRadius:20,padding:"2px 7px",fontWeight:700}}>{s.short} short</span>}
        {s.oos>0&&<span style={{fontSize:9,color:"#DC2626",background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.25)",borderRadius:20,padding:"2px 7px",fontWeight:700}}>{s.oos} OOS</span>}
      </div>

      {onDelete&&(
        <div onClick={e=>{e.stopPropagation();}} style={{paddingTop:10,borderTop:`1px solid ${C.bdrL}`}}>
          {!showDel?(
            <button onClick={()=>setShowDel(true)} style={{fontSize:11,color:C.chXL,background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:600,fontFamily:"inherit"}}>Remove order</button>
          ):(
            <div className="animate-fade-in" style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:11,color:C.rd,fontWeight:700}}>Delete this order?</span>
              <button onClick={()=>{onDelete(order.id);setShowDel(false);}} style={{fontSize:11,color:"#fff",background:C.rd,border:"none",cursor:"pointer",fontWeight:800,padding:"4px 10px",borderRadius:6,fontFamily:"inherit"}}>Yes</button>
              <button onClick={()=>setShowDel(false)} style={{fontSize:11,color:C.chM,background:C.beigeD,border:"none",cursor:"pointer",fontWeight:700,padding:"4px 10px",borderRadius:6,fontFamily:"inherit"}}>No</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PackingRow({item, orderId, orders, onUpdate, notify, isFirst}){
  const th=useTheme();
  const [showEdit, setShowEdit] = useState(false);
  const [qty, setQty] = useState(item.packedQty || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showShortModal, setShowShortModal] = useState(false);
  const [shortQty, setShortQty] = useState("");
  const [shortNote, setShortNote] = useState("");

  function commit(status, extra={}){
    let dQty=qty;
    if(status==='packed'&&!qty&&item.qty){dQty=item.qty;setQty(item.qty);}
    onUpdate(orderId,item.id,{status,packedQty:dQty,notes,updatedAt:Date.now(),...extra});
    setShowEdit(false);
  }
  function handleSendToProduction(){ setShowMergeModal(true); }
  function handleShort(){
    setShortQty(qty || "");
    setShortNote(notes || "");
    setShowShortModal(true);
  }
  function confirmShort(){
    const sq=parseFloat(shortQty);
    const rq=parseFloat(item.qty);
    if(!shortQty||isNaN(sq)||sq<0){notify("Please enter a valid sent quantity.","error");return;}
    if(rq&&sq>=rq){notify("Sent qty ≥ requested — mark as Packed instead?","error");return;}
    onUpdate(orderId,item.id,{status:'short',packedQty:shortQty,notes:shortNote,updatedAt:Date.now()});
    setQty(shortQty); setNotes(shortNote);
    setShowShortModal(false);
  }
  const getActiveBatches=()=>{
    const b={};
    orders.forEach(o=>o.items.forEach(it=>{if(it.status==="production"){const bId=it.batchId||it.id;if(!b[bId])b[bId]={batchId:bId,product:it.product,items:[]};b[bId].items.push(it);}}));
    return Object.values(b);
  };

  const SC2={
    pending:   {label:"Pending",       c:"#8896B3", cls:"pk-pending"},
    production:{label:"Cooking",       c:"#FBB040", cls:"pk-production"},
    prod_done: {label:"Ready to Pack", c:"#4ADE80", cls:"pk-prod_done"},
    packed:    {label:"Packed ✓",      c:"#F87171", cls:"pk-packed"},
    delivered: {label:"Delivered",     c:"#6A7A9A", cls:"pk-delivered"},
    short:     {label:"Short ⚠",       c:"#E8920A", cls:"pk-short"},
    oos:       {label:"Out of Stock",  c:"#FCA5A5", cls:"pk-oos"},
  };
  const cur=SC2[item.status]||SC2.pending;
  const itemCode=findItemCode(item.product);

  return(
    <>
      {showMergeModal&&<MergeModal pendingItem={item} activeBatches={getActiveBatches()} onMerge={bId=>{commit('production',{batchId:bId});setShowMergeModal(false);}} onNewBatch={()=>{commit('production',{batchId:"b_"+Date.now()+Math.random()});setShowMergeModal(false);}} onCancel={()=>setShowMergeModal(false)}/>}

      {showShortModal&&(
        <div className="animate-fade-in" onClick={()=>setShowShortModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
          <div className="animate-fade-up modal-sheet" onClick={e=>e.stopPropagation()} style={{borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"28px 28px 32px",display:"flex",flexDirection:"column",gap:16,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(232,146,10,0.45),transparent)",pointerEvents:"none"}}/>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.12)",borderRadius:4,margin:"0 auto -4px"}}/>
            <div style={{fontSize:19,fontWeight:900,color:"#EEF2FF",letterSpacing:"-0.02em"}}>Short Shipment</div>
            <div style={{background:th.cardBg,padding:"14px 16px",borderRadius:12,border:`1px solid rgba(232,146,10,0.25)`}}>
              <div style={{fontSize:10,fontWeight:800,color:C.chL,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>ITEM</div>
              <div style={{fontWeight:900,color:"#EEF2FF",fontSize:15,marginBottom:4}}>{item.product}</div>
              <div style={{fontSize:12,color:"#E8920A",fontFamily:"'JetBrains Mono',monospace",fontWeight:800}}>Requested: {item.qty} {item.unit||""}</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:C.chL,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>How much are you actually sending?</div>
              <input
                autoFocus
                value={shortQty}
                onChange={e=>setShortQty(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")confirmShort();}}
                placeholder={`Sent qty (max ${item.qty} ${item.unit||""})`}
                type="number"
                min="0"
                style={{width:"100%",padding:"13px 16px",background:"rgba(232,146,10,0.06)",border:"1.5px solid rgba(232,146,10,0.35)",borderRadius:10,fontSize:15,fontWeight:800,color:"#EEF2FF",outline:"none",fontFamily:"'JetBrains Mono',monospace",boxSizing:"border-box"}}
              />
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:C.chL,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Reason / Note <span style={{fontWeight:500,textTransform:"none",letterSpacing:0}}>(optional)</span></div>
              <input
                value={shortNote}
                onChange={e=>setShortNote(e.target.value)}
                placeholder="e.g. ran out of stock at 2pm"
                style={{width:"100%",padding:"11px 14px",background:th.panelBg,border:`1px solid ${th.divider}`,borderRadius:10,fontSize:13,fontWeight:500,color:"#EEF2FF",outline:"none",boxSizing:"border-box"}}
              />
            </div>
            <div style={{display:"flex",gap:10,paddingTop:4}}>
              <button onClick={()=>setShowShortModal(false)} style={{flex:1,padding:"13px",background:th.chipBg,border:`1px solid ${th.divider}`,borderRadius:12,fontSize:13,fontWeight:800,color:C.chL,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={confirmShort} style={{flex:2,padding:"13px",background:"linear-gradient(135deg,rgba(232,146,10,0.25),rgba(232,146,10,0.12))",border:"1.5px solid rgba(232,146,10,0.45)",borderRadius:12,fontSize:13,fontWeight:900,color:"#E8920A",cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.02em"}}>⚠ Confirm Short</button>
            </div>
          </div>
        </div>
      )}

      <div className={`animate-fade-up pk-card ${cur.cls}`}>
        <div style={{padding:"16px 18px"}}>

          {/* ── Header: name + status ── */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#EEF2FF",fontSize:15,fontWeight:900,lineHeight:1.25,marginBottom:5,letterSpacing:"-0.02em"}}>{item.product}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:item.status==='short'?"#E8920A":"#3A5070",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>
                  {item.status==='short'?`Sent ${item.packedQty||0} / Req ${item.qty} ${item.unit}`:`${item.qty} ${item.unit}`}
                </span>
                {itemCode&&<span style={{fontSize:10,fontWeight:900,color:"#D31118",background:"rgba(211,17,24,0.12)",border:"1px solid rgba(211,17,24,0.28)",borderRadius:5,padding:"2px 7px",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",boxShadow:"0 0 6px rgba(211,17,24,0.18)"}}># {itemCode}</span>}
              </div>
            </div>
            <span className={`badge-glow-${item.status}`} style={{fontSize:10,fontWeight:800,padding:"5px 11px",borderRadius:20,color:cur.c,background:cur.c+"18",border:"1px solid "+cur.c+"35",whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.04em"}}>{cur.label}</span>
          </div>

          {/* ── Inline edit form ── */}
          {showEdit&&item.status!=='delivered'&&(
            <div className="animate-fade-in" style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",background:th.panelBg,padding:"12px",borderRadius:10,border:`1px solid ${th.divider}`}}>
              <input value={qty} onChange={e=>setQty(e.target.value)} placeholder="Qty sent" style={{width:90,padding:"8px 10px",border:"1px solid #1E2A44",borderRadius:7,fontSize:12,outline:"none",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,flexShrink:0}}/>
              <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Note (optional)" style={{flex:1,minWidth:100,padding:"8px 10px",border:"1px solid #1E2A44",borderRadius:7,fontSize:12,outline:"none",fontWeight:500}}/>
              <button onClick={()=>setShowEdit(false)} style={{padding:"8px 14px",background:th.chipBg,border:`1px solid ${th.closeBdr}`,borderRadius:7,fontSize:11,fontWeight:800,color:C.chM,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>Done</button>
            </div>
          )}

          {/* ── Action area ── */}
          {item.status==='delivered'?(
            <div style={{display:"flex",gap:8,alignItems:"center",background:th.cardBg,padding:"10px 14px",borderRadius:10,border:`1px solid ${th.divider}`}}>
              <span style={{color:"#6A7A9A",fontWeight:800,fontSize:12,flex:1,letterSpacing:"0.02em"}}>🚀 Dispatched</span>
              <button onClick={()=>commit('packed')} className="pk-chip pk-chip-reset" style={{flex:"0 0 auto",padding:"6px 14px"}}>↩ Undo</button>
            </div>
          ):item.status==='packed'?(
            <div style={{display:"flex",gap:8}}>
              <button className="pk-dispatch-btn" onClick={()=>commit('delivered')}>🚀 Confirm Dispatch</button>
              <button onClick={()=>commit('pending')} className="pk-chip pk-chip-reset" style={{flexShrink:0,padding:"13px 14px"}}>↩</button>
            </div>
          ):item.status==='short'||item.status==='oos'?(
            <button onClick={()=>commit('pending')} style={{width:"100%",padding:"12px",background:th.subBg,border:`1px solid ${th.divider}`,borderRadius:10,fontSize:12,fontWeight:800,color:C.chL,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>↻ Reset to Pending</button>
          ):item.status==='production'?(
            <div>
              <div className="pk-cooking-state">
                <span style={{width:7,height:7,borderRadius:"50%",background:"#FBB040",display:"inline-block",animation:"pulseSoft 1.8s infinite",flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:800,color:"#FBB040",flex:1}}>Currently Cooking</span>
                <span><span className="dot" style={{color:"#FBB040"}}/><span className="dot" style={{color:"#FBB040"}}/><span className="dot" style={{color:"#FBB040"}}/></span>
              </div>
              <div style={{display:"flex",gap:6,marginTop:8}}>
                <button onClick={handleShort}  className="pk-chip pk-chip-short">⚠ Short</button>
                <button onClick={()=>commit('oos')} className="pk-chip pk-chip-oos">✕ OOS</button>
                <button onClick={()=>setShowEdit(!showEdit)} className="pk-chip pk-chip-edit">✎ Edit</button>
              </div>
            </div>
          ):(
            /* pending or prod_done — primary pack button + secondary chips */
            <div>
              <button
                className={`pk-pack-btn${item.status==='prod_done'?" pk-ready-btn":""}`}
                onClick={()=>commit('packed')}
              >
                {item.status==='prod_done'?"✓ Pack Now — Ready!":"✓ Mark as Packed"}
              </button>
              <div style={{display:"flex",gap:6,marginTop:8}}>
                {item.status!=='prod_done'&&<button onClick={handleSendToProduction} className="pk-chip pk-chip-prod">→ Prod</button>}
                <button onClick={handleShort}       className="pk-chip pk-chip-short">⚠ Short</button>
                <button onClick={()=>commit('oos')} className="pk-chip pk-chip-oos">✕ OOS</button>
                <button onClick={()=>setShowEdit(!showEdit)} className="pk-chip pk-chip-edit">✎</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

function generateWhatsAppMessage(order) {
  let msg = `📋 *${order.poName || 'Purchase Order'}*\nRestaurant: ${order.restaurant}\n`;
  if(order.orderDate) msg += `PO received on : ${order.orderDate}\n`;
  const sending = order.items.filter(i => i.status === 'packed' || i.status === 'delivered' || i.status === 'prod_done');
  const prod = order.items.filter(i => i.status === 'production');
  const issues = order.items.filter(i => i.status === 'short' || i.status === 'oos');

  msg += `\n✅ Sending/ Delivered:\n`; if(sending.length === 0) msg += `- None yet\n`; sending.forEach(i => { msg += `- ${i.product} : ${i.packedQty || i.qty || '-'}\n`; });
  msg += `\n🍳 In production:\n`; if(prod.length === 0) msg += `- None currently\n`; prod.forEach(i => { msg += `- ${i.product} : ${i.qty || '-'}\n`; });
  msg += `\n⚠️ ISSUES:\n`; if(issues.length === 0) msg += `- No issues reported\n`; 
  issues.forEach(i => { 
    if(i.status === 'short') {
      msg += `- ${i.product} (Short: Sent ${i.packedQty || '0'} instead of ${i.qty})${i.notes ? ' - ' + i.notes : ''}\n`; 
    } else {
      msg += `- ${i.product} (Out of Stock)${i.notes ? ' - ' + i.notes : ''}\n`; 
    }
  });
  return encodeURIComponent(msg + `\nThank you.`);
}

function PackingView({order, onUpdate, orders, notify}){
  const s=oStats(order); const rc=order.restaurant==="Vins"?C.ol:C.am;
  const totalDone=s.packed+s.delivered; const pct=s.total?Math.round((totalDone/s.total)*100):0;
  const urg=deliveryUrgency(order.deliveryDate);
  const allDone = pct===100;

  return(
    <div className="animate-fade-in custom-scrollbar">
      <div className="glass-header">
        {/* Name + WhatsApp */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div className="mobile-title" style={{fontSize:26,fontWeight:900,letterSpacing:"-0.04em",lineHeight:1.1,marginBottom:8}}><span className={`gradient-text-${order.restaurant==="Vins"?"red":"amber"}`}>{order.poName||"Packing View"}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:11,fontWeight:900,color:rc,background:rc+"18",borderRadius:6,padding:"4px 10px"}}>{order.restaurant}</span>
              {order.orderDate&&<span style={{fontSize:11,color:C.chL,fontWeight:600}}>{order.orderDate}</span>}
              {urg&&<span style={{fontSize:11,fontWeight:800,color:urg.c,background:urg.bg,border:"1px solid "+urg.bdr,borderRadius:20,padding:"3px 10px"}}>{urg.label}</span>}
            </div>
          </div>
          <button onClick={()=>window.open(`https://wa.me/?text=${generateWhatsAppMessage(order)}`,"_blank")}
            style={{padding:"10px 18px",background:"linear-gradient(135deg,#097353,#065A40)",color:"#fff",border:"none",borderRadius:12,fontWeight:800,fontSize:13,cursor:"pointer",boxShadow:"0 4px 16px rgba(9,115,83,0.38)",flexShrink:0,fontFamily:"inherit",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:7,letterSpacing:"0.01em",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 22px rgba(9,115,83,0.56)";e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(9,115,83,0.38)";e.currentTarget.style.transform="";}}>
            📲 WhatsApp
          </button>
        </div>

        {/* Progress bar */}
        <div style={{marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <span style={{fontSize:10,color:C.chL,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>{totalDone} of {s.total} packed</span>
            <span style={{fontSize:16,fontWeight:900,color:allDone?"#4ADE80":C.ch,letterSpacing:"-0.02em"}}>{pct}%</span>
          </div>
          <div className="pk-progress-track">
            <div className="pk-progress-fill" style={{width:pct+"%",background:allDone?"linear-gradient(90deg,#16A34A,#4ADE80)":"linear-gradient(90deg,"+rc+","+rc+"BB)",boxShadow:allDone?"0 0 12px rgba(74,222,128,0.5)":"0 0 8px "+rc+"50"}}/>
          </div>
        </div>

        {/* Issue / status pills */}
        {(s.short>0||s.oos>0||s.prod>0||s.prod_done>0)&&(
          <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>
            {s.prod>0&&<span style={{fontSize:10,color:C.amDk,background:C.amBg,border:"1px solid rgba(232,146,10,0.25)",borderRadius:20,padding:"2px 9px",fontWeight:800}}>{s.prod} cooking</span>}
            {s.prod_done>0&&<span style={{fontSize:10,color:"#4ADE80",background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.25)",borderRadius:20,padding:"2px 9px",fontWeight:800}}>{s.prod_done} ready</span>}
            {s.short>0&&<span style={{fontSize:10,color:"#E8920A",background:"rgba(232,146,10,0.08)",border:"1px solid rgba(232,146,10,0.25)",borderRadius:20,padding:"2px 9px",fontWeight:800}}>{s.short} short</span>}
            {s.oos>0&&<span style={{fontSize:10,color:"#DC2626",background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.25)",borderRadius:20,padding:"2px 9px",fontWeight:800}}>{s.oos} OOS</span>}
          </div>
        )}

        {/* All-done celebration */}
        {allDone&&(
          <div className="animate-fade-up" style={{marginTop:12,padding:"12px 16px",background:"linear-gradient(135deg,rgba(9,115,83,0.25),rgba(22,163,74,0.15))",borderRadius:10,border:"1px solid rgba(74,222,128,0.3)",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>🎉</span>
            <span style={{fontSize:13,fontWeight:800,color:"#4ADE80"}}>All items packed — ready to dispatch!</span>
          </div>
        )}
      </div>

      {order.items.map((item, index)=><PackingRow key={item.id} item={item} orderId={order.id} orders={orders} onUpdate={onUpdate} notify={notify} isFirst={index===0}/>)}
    </div>
  );
}

function OrderBatchCard({ batch, idx, onBatchUpdate }) {
  const th=useTheme();
  const totalQty = batch.items.reduce((sum, it) => sum + (parseFloat(it.qty) || 0), 0);
  const batchUnit = batch.items[0]?.unit || "kg";
  const isMerged = batch.items.length > 1;

  return(
    <div className="animate-fade-up batch-v2" style={{animationDelay:`${idx*0.06}s`}}>
      <div style={{padding:"22px 24px"}}>
        {/* Header: product name + large qty */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div style={{flex:1,minWidth:0}}>
            {isMerged&&(
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(232,146,10,0.12)",border:"1px solid rgba(232,146,10,0.3)",borderRadius:20,padding:"3px 10px",marginBottom:8}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:C.am,display:"inline-block",animation:"pulseSoft 1.8s infinite"}}/>
                <span style={{fontSize:10,fontWeight:900,color:C.amDk,textTransform:"uppercase",letterSpacing:"0.12em"}}>Master Batch · {isMerged?batch.items.length+" orders":""}</span>
              </div>
            )}
            <div style={{color:C.ch,fontSize:18,fontWeight:900,letterSpacing:"-0.02em",lineHeight:1.2}}>{batch.displayProduct}</div>
          </div>
          {totalQty > 0 && (
            <div style={{textAlign:"right",flexShrink:0,marginLeft:16}}>
              <div style={{fontSize:38,fontWeight:900,color:C.am,lineHeight:1,letterSpacing:"-0.04em"}}>{totalQty}</div>
              <div style={{fontSize:10,color:C.amDk,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>{batchUnit}</div>
            </div>
          )}
        </div>

        {/* Sub-items from merged orders */}
        {isMerged&&(
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16,background:"rgba(232,146,10,0.06)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(232,146,10,0.1)"}}>
            {batch.items.map((sub, i) => (
              <div key={i} style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:11,color:sub.restaurant==="Vins"?C.ol:C.am,background:sub.restaurant==="Vins"?C.ol+"1A":C.am+"1A",borderRadius:6,padding:"3px 8px",fontWeight:800}}>{sub.restaurant}</span>
                <span style={{fontSize:11,color:C.chM,fontWeight:700}}>{sub.poName||"Standard PO"}</span>
                {sub.qty&&<span style={{fontSize:11,color:C.am,fontFamily:"'JetBrains Mono',monospace",fontWeight:800,marginLeft:"auto"}}>{sub.qty} {sub.unit}</span>}
              </div>
            ))}
          </div>
        )}
        {!isMerged&&batch.items[0]&&(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:11,color:batch.items[0].restaurant==="Vins"?C.ol:C.am,background:batch.items[0].restaurant==="Vins"?C.ol+"1A":C.am+"1A",borderRadius:6,padding:"3px 8px",fontWeight:800}}>{batch.items[0].restaurant}</span>
            <span style={{fontSize:11,color:C.chM,fontWeight:700}}>{batch.items[0].poName||"Standard PO"}</span>
          </div>
        )}

        {/* Recipe card */}
        <div style={{marginBottom:18}}><RecipeCard name={batch.displayProduct}/></div>

        {/* Action */}
        <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:16,borderTop:`1px solid ${th.divider}`}}>
          <button className="batch-complete-btn" onClick={()=>onBatchUpdate(batch,"prod_done")}>✓ Batch Complete — Mark Ready to Pack</button>
          <button onClick={()=>onBatchUpdate(batch,"pending")} style={{width:"100%",padding:"10px",background:"transparent",border:`1px solid ${th.divider}`,borderRadius:10,fontSize:12,fontWeight:700,color:C.chL,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>↩ Undo Batch</button>
        </div>
      </div>
    </div>
  );
}

function ProductionView({orders, dailyProductions = [], onBatchUpdate, onDailyProdUpdate, role, onAddExtra}){
  const [recipeModal, setRecipeModal] = useState(null); 

  const today = getLocalYMD();
  
  const relevantDPs = dailyProductions.filter(dp => {
    if (role === "admin") return dp.date >= today;
    return dp.status === "active" && dp.date >= today;
  }).slice(0, 14);

  function extractBatches(allOrders, restaurant) {
    const map = {};
    allOrders.filter(o => o.restaurant === restaurant).forEach(o => {
      o.items.forEach(it => {
        if (it.status === "production") {
          const bId = it.batchId || it.id;
          if (!map[bId]) map[bId] = { id: bId, items: [], displayProduct: it.product, restaurant };
          map[bId].items.push({ ...it, orderId: o.id, poName: o.poName });
        }
      });
    });
    return Object.values(map);
  }

  const vinsBatches = extractBatches(orders, "Vins");
  const manjaBatches = extractBatches(orders, "Manja");
  const totalBatches = vinsBatches.length + manjaBatches.length;

  const [showExtraModal, setShowExtraModal] = useState(false);

  return(
    <div className="animate-fade-in custom-scrollbar">
      {recipeModal && (
        <div className="animate-fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(4px)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div className="animate-fade-up custom-scrollbar" style={{ background:"#0F1422", borderRadius:20, maxWidth:500, width:"100%", maxHeight:"88vh", overflowY:"auto", padding:24, boxShadow:C.shM }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <span style={{ fontSize:16, fontWeight:900, color:C.ch }}>📖 Recipe</span>
              <button onClick={() => setRecipeModal(null)} style={{ background:C.off, border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", color:C.chM, fontSize:14 }}>✕</button>
            </div>
            <RecipeCard name={recipeModal} />
          </div>
        </div>
      )}

      {showExtraModal && (
        <ExtraProductionModal 
          dateStr={today} 
          onSave={onAddExtra} 
          onClose={() => setShowExtraModal(false)} 
        />
      )}

      <div className="glass-header">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div>
            <div style={{fontSize:28,fontWeight:900,color:C.ch,letterSpacing:"-0.04em",marginBottom:6}}>Master Production Queue</div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              {relevantDPs.length>0&&<span style={{fontSize:10,color:C.amDk,background:C.amBg,border:"1px solid rgba(232,146,10,0.25)",borderRadius:20,padding:"2px 9px",fontWeight:800}}>{relevantDPs.length} daily plan{relevantDPs.length!==1?"s":""}</span>}
              {totalBatches>0&&<span style={{fontSize:10,color:"#FBB040",background:"rgba(251,176,64,0.08)",border:"1px solid rgba(251,176,64,0.25)",borderRadius:20,padding:"2px 9px",fontWeight:800,display:"flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:"#FBB040",display:"inline-block",animation:"pulseSoft 1.8s infinite"}}/>{totalBatches} batch{totalBatches!==1?"es":""} cooking</span>}
              {relevantDPs.length===0&&totalBatches===0&&<span style={{fontSize:12,color:C.chL,fontWeight:600}}>All quiet — no active production</span>}
            </div>
          </div>
          <button onClick={()=>setShowExtraModal(true)} style={{padding:"9px 16px",background:"rgba(232,146,10,0.1)",border:"1px solid rgba(232,146,10,0.3)",borderRadius:10,fontSize:12,fontWeight:800,color:C.amDk,cursor:"pointer",fontFamily:"inherit",flexShrink:0,transition:"all 0.15s",whiteSpace:"nowrap"}}>+ Log Extra</button>
        </div>
      </div>
      
      <DailyProductionSection 
        dailyProductions={relevantDPs} 
        onShowRecipe={setRecipeModal} 
        onUpdateItem={onDailyProdUpdate} 
        role={role}
        onAddExtra={() => setShowExtraModal(true)}
      />

      {(vinsBatches.length > 0 || manjaBatches.length > 0) && (
        <div style={{ height:2, background:"linear-gradient(90deg,"+C.bdr+",transparent)", borderRadius:4, margin:"24px 0" }} />
      )}

      {vinsBatches.length > 0 && (
        <>
          <div style={{ fontSize:10, fontWeight:900, color:C.ol, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
            🍽️ Vins Kitchen Orders <span style={{ color:C.chL }}>({vinsBatches.length} batch{vinsBatches.length!==1?"es":""})</span>
          </div>
          {vinsBatches.map((batch, idx) => <OrderBatchCard key={batch.id} batch={batch} idx={idx} onBatchUpdate={onBatchUpdate} />)}
        </>
      )}

      {vinsBatches.length > 0 && manjaBatches.length > 0 && (
        <div style={{ height:2, background:"linear-gradient(90deg,"+C.am+"30,transparent)", borderRadius:4, margin:"20px 0" }} />
      )}

      {manjaBatches.length > 0 && (
        <>
          <div style={{ fontSize:10, fontWeight:900, color:C.am, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
            🍚 Manja Kitchen Orders <span style={{ color:C.chL }}>({manjaBatches.length} batch{manjaBatches.length!==1?"es":""})</span>
          </div>
          {manjaBatches.map((batch, idx) => <OrderBatchCard key={batch.id} batch={batch} idx={idx} onBatchUpdate={onBatchUpdate} />)}
        </>
      )}

      {relevantDPs.length === 0 && totalBatches === 0 && (
        <div className="animate-fade-up empty-state">
          <div style={{fontSize:52,marginBottom:16,filter:"drop-shadow(0 0 18px rgba(22,163,74,0.3))"}}>✓</div>
          <div style={{fontSize:18,fontWeight:900,color:C.ch,marginBottom:6}}>Kitchen Queue Clear</div>
          <div style={{fontSize:13,color:C.chL,fontWeight:500,lineHeight:1.5}}>No active batches or daily production plans.</div>
        </div>
      )}
    </div>
  );
}

function OrderingView({order}){
  const isMobile = useIsMobile();
  const s=oStats(order); const rc=order.restaurant==="Vins"?C.ol:C.am; const totalCompleted = s.packed + s.delivered; const pct = s.total ? Math.round((totalCompleted/s.total)*100) : 0;
  const ringRadius = isMobile ? 52 : 40;
  
  return(
    <div className="animate-fade-in custom-scrollbar">
      <div className="glass-header">
        <div style={{fontSize:26,fontWeight:900,letterSpacing:"-0.03em",marginBottom:6}}><span className="gradient-text-white">{order.poName || "Live Order Tracker"}</span></div>
        <div style={{fontSize:13,color:C.chL, fontWeight:500}}>PO Date: {order.orderDate} {order.deliveryDate ? `· Deliver By: ${order.deliveryDate}` : ""}</div>
      </div>
      
      {pct === 100 && (
        <div className="animate-fade-up" style={{background:"linear-gradient(135deg, #097353, #0D8A5E)",borderRadius:14, padding:"18px 20px",marginBottom:20, textAlign:"center",boxShadow:"0 8px 24px rgba(9,115,83,0.3)"}}>
          <div style={{fontSize:28, marginBottom:6}}>🎉</div>
          <div style={{color:"#FFFFFF", fontSize:16, fontWeight:900, marginBottom:4}}>Order Complete!</div>
          <div style={{color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:600}}>All {s.total} items are packed and ready.</div>
        </div>
      )}

      <div className="animate-fade-up glass-card" style={{borderRadius:16,padding:"22px 28px",marginBottom:22,display:"flex",alignItems:"center",gap:20,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${pct===100?"rgba(74,222,128,0.3)":"rgba(211,17,24,0.22)"},transparent)`,pointerEvents:"none"}}/>
        <ProgressRing radius={ringRadius} stroke={isMobile?10:8} progress={pct} color={pct===100?"#4ADE80":C.ol} />
        <div>
          <div style={{fontSize:10,color:C.chL,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:800,marginBottom:4}}>Fulfillment</div>
          <div className="mobile-stat-num" style={{fontSize:isMobile?36:32,color:pct===100?"#4ADE80":C.ch,fontWeight:900,lineHeight:1,letterSpacing:"-0.03em"}}>{pct}%</div>
          <div style={{fontSize:11,color:C.chL,marginTop:6,fontWeight:600}}>{s.packed+s.delivered} of {s.total} items</div>
        </div>
      </div>
      {(s.short>0||s.oos>0)&&(<div className="animate-fade-up" style={{padding:"14px 18px",background:C.amBg,border:"1px solid "+C.amBgD,borderRadius:12,marginBottom:20,fontSize:13,color:C.amDk,fontWeight:600}}><span style={{fontSize:18}}>⚠</span> <div>{s.short>0?`${s.short} item(s) are short-stocked. `:""}{s.oos>0?`${s.oos} item(s) are out of stock. `:""}TFC will contact you regarding alternatives.</div></div>)}
      <SectionLabel text="Order Manifest" />
      {order.items.map((item, idx)=>{ 
        const isCooking = item.status === "production"; const isDoneCooking = item.status === "prod_done"; const isDelivered = item.status === "delivered"; const badgeObj = SC[item.status] || SC.pending; 
        return ( 
          <div key={item.id} className={`animate-fade-up ${isCooking ? "cooking-shimmer" : ""} ${isDoneCooking ? "prod-done-glow" : ""}`} style={{animationDelay:`${idx*0.02}s`, display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,padding:"16px 20px",background: (isCooking||isDoneCooking) ? "transparent" : C.w,borderRadius:12,marginBottom:10,border:"1px solid "+ (isDelivered ? C.bdr : C.bdrL),borderLeft:"5px solid "+badgeObj.c,boxShadow:C.sh, opacity: isDelivered ? 0.6 : 1}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:C.ch,fontSize:15,fontWeight:800,marginBottom:4}}>{item.product}</div>
              <div style={{fontSize:12,color:item.status==='short'?C.amDk:C.chL,fontFamily:"monospace", fontWeight:500}}>
                {item.status === 'short' ? `Req: ${item.qty} ${item.unit||""} · Sent: ${item.packedQty||0}` : `Req: ${item.qty} ${item.unit||""}`}
                {item.status !== 'short' && item.packedQty ? ` · Pack: ${item.packedQty}` : ""}
                {item.notes ? ` · 📝 ${item.notes}` : ""}
              </div>
            </div>
            <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end"}}>{isCooking ? (<div style={{fontSize:11, fontWeight:800, color:C.amDk, background:C.w+"99", padding:"6px 12px", borderRadius:10, border:"1px solid "+C.amBgD}}>Cooking<span className="dot"></span><span className="dot"></span><span className="dot"></span></div>) : isDoneCooking ? (<div style={{fontSize:11, fontWeight:800, color:"#097353", background:C.w+"99", padding:"6px 12px", borderRadius:10, border:"1px solid #A3D9C5"}}>Ready to Pack</div>) : (<Badge status={item.status}/>)}</div>
          </div> 
        ); 
      })}
    </div>
  );
}

function AdminOrderView({order, onEditOrder}){
  const s=oStats(order); const rc=order.restaurant==="Vins"?C.ol:C.am;
  const isMobile=useIsMobile();
  return(
    <div className="animate-fade-in custom-scrollbar">
      <div className="glass-header">
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"flex-start":"flex-start",gap:isMobile?10:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:isMobile?20:26,fontWeight:900,color:C.ch,letterSpacing:"-0.03em",marginBottom:6,lineHeight:1.2}}>
              {order.poName || "Order Overview"} — <span style={{color:rc}}>{order.restaurant}</span>
            </div>
            <div style={{fontSize:12,color:C.chL,fontWeight:500}}>PO Date: {order.orderDate} {order.deliveryDate ? `· Deliver By: ${order.deliveryDate}` : ""} · {order.items.length} line items</div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <Btn variant="success" onClick={() => window.open(`https://wa.me/?text=${generateWhatsAppMessage(order)}`, "_blank")}>📲 {isMobile?"WA":"WhatsApp"}</Btn>
            <Btn variant="amber" onClick={()=>onEditOrder(order)}>✏️ Edit</Btn>
          </div>
        </div>
      </div>
      <StatRow s={s}/>
      {order.items.map((item, idx)=>( 
        <div key={item.id} className="animate-fade-up" style={{animationDelay:`${idx*0.02}s`, display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,padding:"14px 18px",background:C.w,borderRadius:12,marginBottom:8,border:"1px solid "+C.bdrL,borderLeft:"4px solid "+(SC[item.status]||SC.pending).c,boxShadow:C.sh}}>
          <div style={{flex:1}}>
            <div style={{color:C.ch,fontSize:14,fontWeight:700,marginBottom:4}}>{item.product}</div>
            <div style={{fontSize:12,color:item.status==='short'?C.amDk:C.chL,fontFamily:"monospace", fontWeight:500}}>
              {item.status === 'short' ? `Req: ${item.qty} ${item.unit||""} · Sent: ${item.packedQty||0}` : `Req: ${item.qty} ${item.unit||""}`}
              {item.status !== 'short' && item.packedQty ? ` · Sending: ${item.packedQty}` : ""}
              {item.notes ? ` · 📝 ${item.notes}` : ""}
            </div>
          </div>
          <Badge status={item.status}/>
        </div> 
      ))}
    </div>
  );
}

function AdminOrdersTab({ orders }) {
  const th=useTheme();
  const totals={total:0,packed:0,delivered:0,short:0,oos:0,prod:0,prod_done:0,pending:0}; 
  orders.forEach(o=>{const s=oStats(o);Object.keys(totals).forEach(k=>{totals[k]+=(s[k]||0);});});
  
  if(orders.length === 0) return (
    <div className="animate-fade-up glass-card empty-state" style={{borderRadius:18}}>
      <div className="empty-icon">📋</div>
      <div style={{fontSize:18,fontWeight:900,color:C.ch,marginBottom:8}}>No orders yet</div>
      <div style={{fontSize:13,color:C.chL,fontWeight:500,maxWidth:260,lineHeight:1.6,marginBottom:20}}>Tap <strong style={{color:C.ch}}>+ Create Order</strong> in the sidebar to add your first order.</div>
      <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.ol,fontWeight:700,background:C.olBg,border:"1px solid "+C.olBgD,borderRadius:8,padding:"8px 14px"}}><span>←</span> Start from the sidebar</div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div style={{marginBottom:20}}><AdminDonutChart packed={totals.packed + totals.delivered} pending={totals.prod + totals.prod_done + totals.pending} issues={totals.short + totals.oos} /></div>

      {/* ── Bento stat grid ── */}
      <div className="bento-stat-grid" style={{display:"grid",gridTemplateColumns:"1.7fr 1fr 1fr",gridTemplateRows:"auto auto",gap:10,marginBottom:22}}>

        {/* Hero: Fulfilled (spans 2 rows) */}
        <div className="bento-hero glass-card animate-fade-up" style={{gridRow:"span 2",padding:"24px 22px",display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:148}}>
          <div style={{fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.16em",color:"#00D4FF",opacity:0.9}}>Fulfilled</div>
          <div>
            <div className="gradient-text-cyan count-pop" style={{fontSize:54,fontWeight:900,letterSpacing:"-0.05em",lineHeight:1}}>{totals.packed+totals.delivered}</div>
            <div style={{fontSize:11,color:C.chL,marginTop:6,fontWeight:600}}>of <strong style={{color:C.chM}}>{totals.total}</strong> total items</div>
          </div>
          <div>
            <div style={{height:4,background:th.trackBg,borderRadius:99,overflow:"hidden",marginBottom:5}}>
              <div style={{height:4,width:totals.total?((totals.packed+totals.delivered)/totals.total*100)+"%":"0%",background:"linear-gradient(90deg,#0090B8,#00D4FF)",borderRadius:99,transition:"width 1.2s cubic-bezier(0.16,1,0.3,1)",boxShadow:"0 0 10px rgba(0,212,255,0.45)"}}/>
            </div>
            <div style={{fontSize:9,color:C.chL,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.10em"}}>
              {totals.total?Math.round(((totals.packed+totals.delivered)/totals.total)*100):0}% complete
            </div>
          </div>
        </div>

        {/* Issues */}
        {(()=>{const hasIssues=(totals.short+totals.oos)>0; return(
          <div className="bento-hero animate-fade-up" style={{animationDelay:"0.05s",padding:"18px 16px",borderRadius:16,
            background:hasIssues?"linear-gradient(135deg,rgba(20,8,8,0.28),rgba(14,6,6,0.18))":"rgba(8,10,22,0.25)",
            backdropFilter:"blur(32px) brightness(1.08) saturate(1.7)",WebkitBackdropFilter:"blur(32px) brightness(1.08) saturate(1.7)",
            border:"1px solid "+(hasIssues?"rgba(220,38,38,0.22)":C.bdrL)}}>
            <div style={{fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.14em",color:hasIssues?C.rd:C.chL,marginBottom:8,opacity:0.85}}>Issues</div>
            <div style={{fontSize:38,fontWeight:900,color:hasIssues?C.rd:C.chL,letterSpacing:"-0.04em",lineHeight:1}}>{totals.short+totals.oos}</div>
            {hasIssues&&<div style={{fontSize:9,color:C.rd,marginTop:7,fontWeight:800,display:"flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:C.rd,animation:"pulseSoft 1.5s infinite",display:"inline-block"}}/> Needs attention</div>}
            {!hasIssues&&<div style={{fontSize:9,color:C.chL,marginTop:7,fontWeight:600}}>All clear ✓</div>}
          </div>
        );})()}

        {/* Total Items */}
        <div className="bento-hero animate-fade-up" style={{animationDelay:"0.08s",padding:"18px 16px",borderRadius:16,background:"rgba(8,10,22,0.25)",backdropFilter:"blur(32px) brightness(1.08) saturate(1.7)",WebkitBackdropFilter:"blur(32px) brightness(1.08) saturate(1.7)",border:"1px solid "+C.bdrL}}>
          <div style={{fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.14em",color:C.chL,marginBottom:8,opacity:0.85}}>Total Items</div>
          <div style={{fontSize:38,fontWeight:900,color:C.chM,letterSpacing:"-0.04em",lineHeight:1}}>{totals.total}</div>
          <div style={{fontSize:9,color:C.chXL,marginTop:7,fontWeight:600}}>across all orders</div>
        </div>

        {/* In Production — spans 2 cols */}
        <div className="bento-hero animate-fade-up" style={{animationDelay:"0.12s",gridColumn:"span 2",padding:"18px 20px",borderRadius:16,
          background:"linear-gradient(135deg,rgba(18,14,6,0.28),rgba(12,10,4,0.18))",
          backdropFilter:"blur(32px) brightness(1.08) saturate(1.7)",WebkitBackdropFilter:"blur(32px) brightness(1.08) saturate(1.7)",
          border:"1px solid rgba(232,146,10,0.20)",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.14em",color:C.amDk,marginBottom:8,opacity:0.9}}>In Production</div>
            <div style={{fontSize:38,fontWeight:900,color:C.am,letterSpacing:"-0.04em",lineHeight:1}}>{totals.prod+totals.prod_done}</div>
          </div>
          {totals.prod>0&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:800,color:C.amDk}}><span className="prod-dot"/>Active now</div>
              <div style={{fontSize:28,fontWeight:900,color:C.am,letterSpacing:"-0.03em"}}>{totals.prod}</div>
            </div>
          )}
          {totals.prod===0&&totals.prod_done>0&&<div style={{fontSize:11,fontWeight:700,color:C.amDk}}>✓ All ready to pack</div>}
        </div>
      </div>

      <SectionLabel text="Active Orders"/>
      {orders.slice(0,5).map((o, idx)=>{
        const s=oStats(o); const rc=o.restaurant==="Vins"?C.ol:C.am;
        const pct=s.total?Math.round(((s.packed+s.delivered)/s.total)*100):0;
        const hasIssue=s.short+s.oos>0;
        return(
          <div key={o.id} className={`animate-fade-up glass-card hover-lift ${pct===100?"celebration-card":""}`}
            style={{animationDelay:`${idx*0.05}s`,borderRadius:14,padding:"16px 20px",marginBottom:10,position:"relative",overflow:"hidden",border:`1px solid ${hasIssue?"rgba(220,38,38,0.2)":th.divider}`}}>
            <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${rc}30,transparent)`}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:11,fontWeight:900,color:rc,background:rc+"18",borderRadius:6,padding:"3px 9px"}}>{o.restaurant}</span>
                <span style={{fontSize:12,color:C.chM,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{o.poName||o.orderDate}</span>
                {hasIssue&&<span style={{fontSize:9,color:C.rd,background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.25)",borderRadius:20,padding:"2px 7px",fontWeight:900}}>⚠ Issues</span>}
              </div>
              <span style={{fontSize:16,fontWeight:900,color:pct===100?"#4ADE80":C.ch,letterSpacing:"-0.02em"}}>{pct}%</span>
            </div>
            <div style={{height:5,background:th.trackBg,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:5,width:pct+"%",background:pct===100?"linear-gradient(90deg,#16A34A,#4ADE80)":"linear-gradient(90deg,"+rc+","+rc+"BB)",borderRadius:99,transition:"width 1s cubic-bezier(0.16,1,0.3,1)",boxShadow:pct===100?"0 0 8px rgba(74,222,128,0.5)":"none"}}/>
            </div>
            <div style={{fontSize:10,color:C.chL,marginTop:6,fontWeight:600}}>{s.packed+s.delivered}/{s.total} items fulfilled</div>
          </div>
        );
      })}
    </div>
  );
}

function DailyProductionsTab({ weekDays, selectedWeek, weekDPs, hasDrafts, onShiftWeek, onCreateDP, onUpdateDP, onDeleteDP, onActivateWeek }) {
  const th=useTheme();
  const [editingDay, setEditingDay] = useState(null);

  return (
    <div className="animate-fade-in">
      {editingDay && (
        <DailyProductionModal
          dayInfo={editingDay}
          onSave={(saveKey, items, notes) => {
            if (editingDay.dp) onUpdateDP(saveKey, items, notes, selectedWeek);
            else onCreateDP(saveKey, items, notes);
          }}
          onClose={() => setEditingDay(null)}
        />
      )}
      
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:900,color:C.chL,textTransform:"uppercase",letterSpacing:"1px"}}>Week of {new Date(selectedWeek).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={() => onShiftWeek(-1)} className="hover-lift" style={{padding:"6px 12px",background:C.off,border:"1px solid "+C.bdrL,borderRadius:7,fontSize:11,color:C.chL,fontWeight:700,cursor:"pointer"}}>◀ Prev</button>
          <button onClick={() => onShiftWeek(1)} className="hover-lift" style={{padding:"6px 12px",background:C.olBg,border:"1px solid "+C.olBgD,borderRadius:7,fontSize:11,color:C.ol,fontWeight:800,cursor:"pointer"}}>Next ▶</button>
        </div>
      </div>

      {weekDays.map(day => {
        const isToday = day.date === getLocalYMD();
        const isActive = day.dp?.status === "active";

        if (!day.dp) {
          return (
            <div key={day.date} className="day-tile-empty">
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <span style={{fontSize:11,fontWeight:900,color:isToday?C.ol:C.chL,textTransform:"uppercase",letterSpacing:"0.1em"}}>{day.dayOfWeek}</span>
                  <span style={{fontSize:11,color:C.chL,fontWeight:600,marginLeft:8}}>{day.displayDate}</span>
                  {isToday&&<span style={{marginLeft:8,fontSize:9,background:C.olBg,color:C.ol,border:"1px solid "+C.olBgD,borderRadius:20,padding:"2px 7px",fontWeight:900}}>TODAY</span>}
                </div>
                <button onClick={()=>setEditingDay(day)} style={{background:"rgba(211,17,24,0.09)",border:"1px solid rgba(211,17,24,0.25)",borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:800,color:C.ol,cursor:"pointer",fontFamily:"inherit"}}>+ Plan</button>
              </div>
            </div>
          );
        }

        const doneCnt = day.dp.items.filter(i=>i.status==="prod_done").length;
        const totalCnt = day.dp.items.length;

        return (
          <div key={day.date} className={`day-tile ${isActive?"day-tile-active":""}`} style={{border:isToday?"1px solid rgba(211,17,24,0.3)":""}}>
            {/* Day header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${th.divider}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:900,color:isToday?C.ol:C.ch,textTransform:"uppercase",letterSpacing:"0.1em"}}>{day.dayOfWeek} · {day.displayDate}</div>
                </div>
                <span style={{fontSize:9,fontWeight:900,padding:"2px 7px",borderRadius:20,
                  background:isActive?"rgba(22,163,74,0.12)":"rgba(136,150,179,0.1)",
                  color:isActive?"#4ADE80":"#8896B3",
                  border:"1px solid "+(isActive?"rgba(22,163,74,0.3)":"rgba(136,150,179,0.2)")
                }}>{isActive?"● LIVE":"○ DRAFT"}</span>
                {isToday&&<span style={{fontSize:9,background:C.olBg,color:C.ol,border:"1px solid "+C.olBgD,borderRadius:20,padding:"2px 7px",fontWeight:900}}>TODAY</span>}
              </div>
              <span style={{fontSize:11,fontWeight:900,color:doneCnt===totalCnt&&totalCnt>0?"#4ADE80":C.chM}}>{doneCnt}/{totalCnt}</span>
            </div>

            {/* Items */}
            {day.dp.items.map(item=>(
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:`1px solid ${th.divider}`,fontSize:11}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,color:item.status==="prod_done"?"#4ADE80":C.ch,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2,textDecoration:item.status==="prod_done"?"line-through":"none",opacity:item.status==="prod_done"?0.7:1}}>
                    {item.product}
                    {item.isExtra&&<span style={{background:"rgba(184,111,6,0.15)",color:C.am,fontSize:9,fontWeight:900,padding:"1px 5px",borderRadius:4}}>EXTRA</span>}
                  </div>
                  {item.recipeName&&<span style={{fontSize:9,color:C.ol,fontWeight:700}}>📖 recipe</span>}
                  {item.notes&&<div style={{fontSize:10,color:C.chL,fontStyle:"italic",marginTop:1}}>📝 {item.notes}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.am,fontSize:10}}>{item.kgQty}kg{item.packetQty>0?` · ${item.packetQty}pkts`:""}</div>
                  {item.status==="prod_done"&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#4ADE80",fontSize:10}}>{item.actualKgQty??item.kgQty}kg ✓</div>}
                </div>
              </div>
            ))}

            {/* Actions */}
            <div style={{marginTop:10,paddingTop:10,display:"flex",gap:8}}>
              <button onClick={()=>setEditingDay(day)} style={{flex:1,padding:"8px",background:"rgba(232,146,10,0.08)",border:"1px solid rgba(232,146,10,0.2)",borderRadius:8,fontSize:11,fontWeight:800,color:C.amDk,cursor:"pointer",fontFamily:"inherit"}}>✎ Edit</button>
              <button onClick={()=>{if(window.confirm("Delete this day's plan?"))onDeleteDP(day.dp.id);}} style={{flex:1,padding:"8px",background:"rgba(220,38,38,0.07)",border:"1px solid rgba(220,38,38,0.18)",borderRadius:8,fontSize:11,fontWeight:800,color:C.rd,cursor:"pointer",fontFamily:"inherit"}}>🗑 Remove</button>
            </div>
          </div>
        );
      })}

      {weekDPs.length > 0 && (
        <div style={{display:"flex",gap:10,marginTop:16,paddingTop:16,borderTop:"1px solid "+C.bdrL}}>
          <div style={{flex:1,padding:12,background:C.off,border:"1px solid "+C.bdrL,borderRadius:9,fontSize:12,fontWeight:800,color:hasDrafts ? C.chL : "#097353",textAlign:"center"}}>
            {hasDrafts ? "You have unpublished drafts" : "✓ All plans active for production"}
          </div>
          {hasDrafts && (
            <button onClick={onActivateWeek} className="hover-lift" style={{flex:2,padding:12,background:"linear-gradient(135deg,#D31118,#8A0B10)",border:"none",borderRadius:9,fontSize:12,fontWeight:900,color:"#fff",cursor:"pointer",boxShadow:"0 4px 16px rgba(211,17,24,.4)"}}>⚡ Activate Drafts → Send to Kitchen</button>
          )}
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ orders, dailyProductions = [], onCreateDP, onUpdateDP, onDeleteDP, onActivateWeek }) {
  const th=useTheme();
  const [adminTab, setAdminTab] = useState("orders");
  
  function getCurrentSunday() {
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    return getLocalYMD(d);
  }
  const [selectedWeek, setSelectedWeek] = useState(getCurrentSunday());

  const weekDPs = dailyProductions.filter(dp => dp.weekOf === selectedWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedWeek + "T00:00:00");
    d.setDate(d.getDate() + i + 1); 
    const dateStr = getLocalYMD(d);
    const existing = weekDPs.find(dp => dp.date === dateStr);
    return { date: dateStr, dayOfWeek: d.toLocaleDateString("en-GB", { weekday: "long" }), displayDate: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), dp: existing || null };
  });

  function shiftWeek(dir) {
    const d = new Date(selectedWeek + "T00:00:00");
    d.setDate(d.getDate() + dir * 7);
    setSelectedWeek(getLocalYMD(d));
  }

  const hasDrafts = weekDPs.length > 0 && weekDPs.some(d => d.status === "draft");

  return (
    <div className="animate-fade-in custom-scrollbar">
      <div className="glass-header">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div>
            <div className="gradient-text-brand" style={{ fontSize:26, fontWeight:900, letterSpacing:"-0.03em", marginBottom:4 }}>
              {adminTab === "orders" ? "Dashboard" : "Productions"}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.chL, fontWeight:500 }}>
              {adminTab === "orders"
                ? <><span style={{width:6,height:6,borderRadius:"50%",background:C.ol,animation:"pulseSoft 2s infinite",display:"inline-block",flexShrink:0}}/>{orders.length} active order{orders.length!==1?"s":""}</>
                : <><span style={{width:6,height:6,borderRadius:"50%",background:C.am,display:"inline-block",flexShrink:0}}/>Weekly plan</>}
            </div>
          </div>
          <div className="admin-tab-bar" style={{ background:th.isDark?"rgba(4,6,16,0.7)":C.beigeD, border:"1px solid "+C.bdrL }}>
            {[{key:"orders",label:"📊 Orders"},{key:"daily",label:"📋 Productions"}].map(tab => (
              <button key={tab.key} onClick={() => setAdminTab(tab.key)} className="admin-tab-btn"
                style={{
                  background: adminTab===tab.key
                    ? (tab.key==="daily" ? C.olBg : th.isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF")
                    : "transparent",
                  color: adminTab===tab.key
                    ? (tab.key==="daily" ? C.olDk : C.ch)
                    : C.chL,
                  boxShadow: adminTab===tab.key
                    ? (th.isDark ? "0 2px 12px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.08)")
                    : "none",
                  border: adminTab===tab.key && tab.key!=="daily"
                    ? `1px solid ${th.isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"}`
                    : "1px solid transparent",
                }}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      {adminTab === "orders" && <AdminOrdersTab orders={orders} />}
      {adminTab === "daily" && <DailyProductionsTab
        weekDays={weekDays} selectedWeek={selectedWeek} weekDPs={weekDPs} hasDrafts={hasDrafts}
        onShiftWeek={shiftWeek} onCreateDP={onCreateDP} onUpdateDP={onUpdateDP} onDeleteDP={onDeleteDP} onActivateWeek={() => onActivateWeek(selectedWeek)}
      />}
    </div>
  );
}

// Always prefer SW.showNotification() — works on all platforms including Android Chrome.
// Fall back to direct Notification constructor only when no SW is available (desktop without SW).
function fireNotif(title, options) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { icon: "/icon-192.png", badge: "/icon-192.png", ...options };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(title, opts))
      .catch(() => { try { new Notification(title, opts); } catch(_){} });
  } else {
    try { new Notification(title, opts); } catch(_) {}
  }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP ROUTER (WITH ERROR BOUNDARY)
═══════════════════════════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("TFC App Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#090B10", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div style={{ background: "#141928", borderRadius: 16, padding: 32, maxWidth: 400, border: "1px solid #D31118", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#EEF2FF", marginBottom: 8 }}>Something went wrong</div>
            <div style={{ fontSize: 13, color: "#8896B3", marginBottom: 24 }}>{this.state.error?.message || "An unexpected error occurred."}</div>
            <button onClick={() => window.location.reload()} style={{ background: "#D31118", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function TFCOrderSystem(){
  const isMobile = useIsMobile();
  const [splashState, setSplashState] = useState("visible");
  const [phase,setPhase]=useState("select"); const [role,setRole]=useState(null); const [screenExiting,setScreenExiting]=useState(false);

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => ("Notification" in window ? Notification.permission : "denied"));
  const prevOrdersRef = useRef(null);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Keep notifPermission in sync if user changes it in browser settings then returns to the tab
  useEffect(() => {
    if (!("Notification" in window)) return;
    const sync = () => setNotifPermission(Notification.permission);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const [orders,setOrders]=useState([]);
  const [dailyProductions, setDailyProductions] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Role-based push notifications — diffs Firestore snapshots and fires per-role alerts
  useEffect(() => {
    const prev = prevOrdersRef.current;
    prevOrdersRef.current = orders; // always keep ref current so no burst on permission grant

    // Only fire when role is active and permission is granted
    if(!role || notifPermission !== "granted" || !("Notification" in window)) return;
    // Skip on initial load (prev not yet set)
    if(prev === null || prev === orders) return;

    // Build a flat map of previous item states for O(1) lookup
    const prevMap = {};
    prev.forEach(o => o.items && o.items.forEach(it => { prevMap[it.id] = it; }));

    orders.forEach(order => {
      if(!order.items) return;
      order.items.forEach(item => {
        const was = prevMap[item.id];
        if(!was || was.status === item.status) return; // no change
        const to = item.status;

        if(role === "admin"){
          if(to === "short") fireNotif("⚠ Short Shipment", {body:`${item.product} (${order.poName||order.restaurant}): Sent ${item.packedQty||"?"} of ${item.qty} ${item.unit||""}`,tag:`short-${item.id}`});
          if(to === "oos")   fireNotif("✕ Out of Stock", {body:`${item.product} — ${order.poName||order.restaurant}`,tag:`oos-${item.id}`});
        }
        if(role === "packing"){
          if(to === "prod_done") fireNotif("✓ Ready to Pack", {body:`${item.product} · ${item.qty} ${item.unit||""} · ${order.restaurant}`,tag:`ready-${item.id}`});
        }
        if(role === "production"){
          if(to === "production") fireNotif("🍳 New Batch Needed", {body:`${item.product} · ${item.qty} ${item.unit||""}`,tag:`prod-${item.id}`});
        }
        if(role === "vins" && order.restaurant === "Vins"){
          if(to === "short") fireNotif("⚠ Short — Vins", {body:`${item.product}: Sent ${item.packedQty||"?"} / Req ${item.qty} ${item.unit||""}`,tag:`vs-${item.id}`});
          if(to === "oos")   fireNotif("✕ Out of Stock — Vins", {body:`${item.product} unavailable`,tag:`vo-${item.id}`});
        }
        if(role === "manja" && order.restaurant === "Manja"){
          if(to === "short") fireNotif("⚠ Short — Manja", {body:`${item.product}: Sent ${item.packedQty||"?"} / Req ${item.qty} ${item.unit||""}`,tag:`ms-${item.id}`});
          if(to === "oos")   fireNotif("✕ Out of Stock — Manja", {body:`${item.product} unavailable`,tag:`mo-${item.id}`});
        }
      });

      // Alert restaurant role when their whole order is packed/delivered
      const isMyRestaurant = (role === "vins" && order.restaurant === "Vins") || (role === "manja" && order.restaurant === "Manja");
      if(isMyRestaurant){
        const prevOrder = prev.find(o => o.id === order.id);
        if(prevOrder && prevOrder.items){
          const wasDone = prevOrder.items.every(i => i.status === "delivered" || i.status === "packed");
          const nowDone = order.items.every(i => i.status === "delivered" || i.status === "packed");
          if(!wasDone && nowDone){
            fireNotif("🚀 Order Ready!", {body:`${order.poName||order.restaurant} — fully packed and ready for dispatch`,tag:`done-${order.id}`});
          }
        }
      }
    });
  }, [orders, role, notifPermission]);

  const [activeId,setActiveId]=useState(null); const [showModal,setShowModal]=useState(false); const [editingOrder, setEditingOrder] = useState(null); const [toast,setToast] = useState(null); const [sidebarOpen, setSidebarOpen]=useState(false);

  // Auth state
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRecord, setUserRecord] = useState(null);
  const [userRecordLoading, setUserRecordLoading] = useState(false);
  const [accessRequest, setAccessRequest] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);

  useEffect(() => { const timer1 = setTimeout(() => setSplashState("fading"), 2000); const timer2 = setTimeout(() => setSplashState("hidden"), 2500); return () => { clearTimeout(timer1); clearTimeout(timer2); }; }, []);
  function notify(msg,type="success"){ setToast({msg,type}); setTimeout(()=>setToast(null),4000); }

  const isDark = true;

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Listen to user's Firestore record
  useEffect(() => {
    if (!authUser) { setUserRecord(null); setAccessRequest(null); return; }
    if (authUser.email === OWNER_EMAIL) return;

    setUserRecordLoading(true);
    const unsubRecord = onSnapshot(
      doc(db, "authorized_users", authUser.email),
      (snap) => { setUserRecord(snap.exists() ? snap.data() : null); setUserRecordLoading(false); },
      () => { setUserRecord(null); setUserRecordLoading(false); }
    );

    // Listen to ALL requests for this user (any status) to avoid race condition
    const q = query(collection(db, "access_requests"), where("email", "==", authUser.email));
    const unsubReq = onSnapshot(q, (snap) => {
      if (snap.empty) { setAccessRequest(null); return; }
      const all = snap.docs.map(d => d.data()).sort((a, b) => b.createdAt - a.createdAt);
      setAccessRequest(all[0]); // most recent request (any status)
    });

    return () => { unsubRecord(); unsubReq(); };
  }, [authUser]);

  // Owner listeners
  useEffect(() => {
    if (!authUser || authUser.email !== OWNER_EMAIL) return;
    const unsubReqs = onSnapshot(collection(db, "access_requests"), (snap) => {
      setAccessRequests(snap.docs.map(d => d.data()).sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubUsers = onSnapshot(collection(db, "authorized_users"), (snap) => {
      setAuthorizedUsers(snap.docs.map(d => d.data()));
    });
    return () => { unsubReqs(); unsubUsers(); };
  }, [authUser]);

  async function handleGoogleSignIn() {
    try { await signInWithPopup(auth, googleProvider); }
    catch(e) {
      const msg = e?.code === "auth/unauthorized-domain"
        ? "Domain not authorized in Firebase — add this site's URL to Firebase Console → Authentication → Authorized domains."
        : e?.code === "auth/popup-blocked"
        ? "Sign-in popup was blocked. Allow popups for this site and try again."
        : "Sign-in failed. Please try again.";
      notify(msg, "error");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    setPhase("select"); setRole(null); setActiveId(null);
    setUserRecord(null); setAccessRequest(null);
  }

  async function submitAccessRequest(requestedRoles) {
    try {
      const id = "req_" + Date.now();
      await setDoc(doc(db, "access_requests", id), {
        id, email: authUser.email, name: authUser.displayName, photoURL: authUser.photoURL,
        requestedRole: requestedRoles[0], requestedRoles, status: "pending", createdAt: Date.now()
      });
      notify("Request sent! Waiting for owner approval.");
    } catch(e) { notify("Failed to send request", "error"); }
  }

  async function approveRequest(request) {
    try {
      const rolesToGrant = request.requestedRoles || [request.requestedRole];
      await setDoc(doc(db, "authorized_users", request.email), {
        email: request.email, name: request.name, photoURL: request.photoURL,
        roles: rolesToGrant, approvedAt: Date.now()
      });
      await setDoc(doc(db, "access_requests", request.id), { ...request, status: "approved" });
      notify(`${request.name} approved for ${rolesToGrant.map(r => ROLES[r]?.label || r).join(", ")}!`);
    } catch(e) { notify("Failed to approve", "error"); }
  }

  async function rejectRequest(request) {
    try {
      await setDoc(doc(db, "access_requests", request.id), { ...request, status: "rejected" });
      notify("Request rejected.");
    } catch(e) { notify("Failed to reject", "error"); }
  }

  async function removeUser(email) {
    try {
      await deleteDoc(doc(db, "authorized_users", email));
      notify("User removed.");
    } catch(e) { notify("Failed to remove user", "error"); }
  }

  useEffect(() => {
    const ordersCol = collection(db, "orders");
    const unsubscribeOrders = onSnapshot(ordersCol, (snapshot) => {
      const liveOrders = snapshot.docs.map(doc => doc.data());
      liveOrders.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(liveOrders);
      setLoadingInitial(false);
    }, (err) => {
      console.error("Orders snapshot error:", err);
      setLoadingInitial(false);
    });
    return () => unsubscribeOrders();
  }, []);

  useEffect(() => {
    const dpCol = collection(db, "daily_productions");
    const unsubscribeDP = onSnapshot(dpCol, (snapshot) => {
      const dps = snapshot.docs.map(d => d.data());
      dps.sort((a, b) => new Date(a.date) - new Date(b.date));
      setDailyProductions(dps);
    });
    return () => unsubscribeDP();
  }, []);

  async function updateItem(orderId, itemId, updates){ try { const orderToUpdate = orders.find(o => o.id === orderId); if(!orderToUpdate) return; const updatedItems = orderToUpdate.items.map(i => i.id === itemId ? {...i, ...updates} : i); await setDoc(doc(db, "orders", orderId), {...orderToUpdate, items: updatedItems}); } catch (e) { console.error("Update item failed:", e); notify("Failed to update", "error"); } }
  async function handleBatchUpdate(batch, status) { try { const updatesPromises = []; const affectedOrderIds = [...new Set(batch.items.map(it => it.orderId))]; affectedOrderIds.forEach(oId => { const orderToUpdate = orders.find(o => o.id === oId); if(!orderToUpdate) return; const updatedItems = orderToUpdate.items.map(i => { if(batch.items.some(batchIt => batchIt.id === i.id)) { return {...i, status: status, updatedAt: Date.now()}; } return i; }); updatesPromises.push(setDoc(doc(db, "orders", oId), {...orderToUpdate, items: updatedItems})); }); await Promise.all(updatesPromises); notify("Master Batch updated!", "success"); } catch (e) { console.error("Batch update failed:", e); notify("Failed to update batch", "error"); } }
  async function saveOrderEdit(orderId, newItems, metaData) { try { const orderToUpdate = orders.find(o => o.id === orderId); if(!orderToUpdate) return; await setDoc(doc(db, "orders", orderId), { ...orderToUpdate, items: newItems, ...metaData, updatedAt: Date.now() }); setEditingOrder(null); notify("Order updated!", "success"); } catch (e) { console.error("Save order edit failed:", e); notify("Failed to update", "error"); } }
  async function deleteOrder(orderId){ try { await deleteDoc(doc(db, "orders", orderId)); if(activeId === orderId) setActiveId(null); notify("Order removed", "success"); } catch (e) { console.error("Delete order failed:", e); notify("Failed to delete", "error"); } }
  async function handleNewOrder(restaurant, poName, poDate, delDate, rows){ try { const newOrder = { id: "ord_" + Date.now(), restaurant, poName: poName.trim() || `${restaurant} Order`, orderDate: poDate, deliveryDate: delDate.trim(), createdAt: Date.now(), items: rows.map((r,i) => ({ id: "item_" + i + "_" + Date.now(), product: r.product.trim(), qty: r.qty, unit: r.unit, status: "pending", packedQty: "", notes: "" })) }; await setDoc(doc(db, "orders", newOrder.id), newOrder); setActiveId(newOrder.id); setShowModal(false); notify(`${rows.length} items added`, "success"); } catch (e) { console.error("Create order failed:", e); notify("Failed to save", "error"); } }

  async function createDailyProduction(dateStr, items, notes = "") {
    try {
      const dateObj = new Date(dateStr + "T00:00:00");
      const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const docId = "daily_" + dateStr.replace(/-/g, "");
      const sunOffset = dateObj.getDay(); 
      const sunday = new Date(dateObj);
      sunday.setDate(sunday.getDate() - sunOffset);
      const weekOf = getLocalYMD(sunday);

      await setDoc(doc(db, "daily_productions", docId), {
        id: docId, date: dateStr, dayOfWeek: days[dateObj.getDay()], weekOf, status: "active", notes, 
        items: items.map(item => ({
          id: "dprod_" + Date.now() + "_" + Math.random().toString(36).slice(2,6),
          product: item.product, recipeName: item.recipeName || null, recipeId: item.recipeId || null,
          kgQty: parseFloat(item.kgQty) || 0, packetQty: parseFloat(item.packetQty) || 0,
          notes: item.notes || "", status: "pending", updatedAt: Date.now()
        })),
        createdAt: Date.now(), updatedAt: Date.now()
      });
      notify("Daily production saved!", "success");
    } catch (e) { console.error("createDailyProduction failed:", e); notify("Failed to save production plan", "error"); }
  }

  async function logExtraProduction(dateStr, newItem) {
    try {
      const docId = "daily_" + dateStr.replace(/-/g, "");
      const dpRef = doc(db, "daily_productions", docId);
      const existingDp = dailyProductions.find(d => d.date === dateStr);

      if (existingDp) {
        const updatedItems = [...existingDp.items, newItem];
        await updateDoc(dpRef, { items: updatedItems, updatedAt: Date.now() });
      } else {
        const dateObj = new Date(dateStr + "T00:00:00");
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const sunOffset = dateObj.getDay(); 
        const sunday = new Date(dateObj);
        sunday.setDate(sunday.getDate() - sunOffset);
        const weekOf = getLocalYMD(sunday);

        await setDoc(dpRef, {
          id: docId, date: dateStr, dayOfWeek: days[dateObj.getDay()], weekOf, status: "active", notes: "Contains unplanned production", 
          items: [newItem],
          createdAt: Date.now(), updatedAt: Date.now()
        });
      }
      notify("Extra production logged!", "success");
    } catch (e) { console.error("logExtraProduction failed:", e); notify("Failed to log extra production", "error"); }
  }

  async function updateDailyProduction(docId, items, notes, weekOf) {
    try {
      await updateDoc(doc(db, "daily_productions", docId), { items, notes, weekOf, updatedAt: Date.now() });
      notify("Plan updated!", "success");
    } catch (e) { console.error("updateDailyProduction failed:", e); notify("Failed to update", "error"); }
  }

  async function activateWeek(weekOf) {
    try {
      const q = query(collection(db, "daily_productions"), where("weekOf", "==", weekOf));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.update(d.ref, { status: "active", updatedAt: Date.now() }));
      await batch.commit();
      notify("Week activated! Production team can now see it.", "success");
    } catch (e) { console.error("activateWeek failed:", e); notify("Failed to activate week", "error"); }
  }

  async function deleteDailyProduction(docId) {
    try {
      await deleteDoc(doc(db, "daily_productions", docId));
      notify("Day plan removed", "success");
    } catch (e) { console.error("deleteDailyProduction failed:", e); notify("Failed to delete", "error"); }
  }

  async function updateDailyProdItem(docId, itemId, updates) {
    try {
      const dp = dailyProductions.find(d => d.id === docId);
      if (!dp) return;
      const updatedItems = dp.items.map(i => i.id === itemId ? { ...i, ...updates, updatedAt: Date.now() } : i);
      await updateDoc(doc(db, "daily_productions", docId), { items: updatedItems, updatedAt: Date.now() });
    } catch (e) { console.error("updateDailyProdItem failed:", e); notify("Update failed", "error"); }
  }

  function selectRole(r){
    if("Notification" in window && Notification.permission === "default"){
      Notification.requestPermission().then(p => setNotifPermission(p));
    }
    setScreenExiting(true);
    setTimeout(()=>{ setRole(r); setPhase("app"); setScreenExiting(false); }, 320);
  }

  if (splashState === "visible" || splashState === "fading") return ( <ThemeCtx.Provider value={true}><style>{GLOBAL_STYLES}</style><div data-theme="dark" style={{ opacity: splashState === "fading" ? 0 : 1, transition: "opacity 0.5s ease" }}><SplashScreen /></div></ThemeCtx.Provider> );

  // Auth loading
  if (authLoading) return (<ThemeCtx.Provider value={true}><style>{GLOBAL_STYLES}</style><div data-theme="dark"><SplashScreen /></div></ThemeCtx.Provider>);

  // Not logged in
  if (!authUser) return (<ThemeCtx.Provider value={true}><style>{GLOBAL_STYLES}</style><div data-theme="dark"><LoginScreen onSignIn={handleGoogleSignIn} /></div></ThemeCtx.Provider>);

  // Loading user's Firestore record
  if (userRecordLoading) return (<ThemeCtx.Provider value={true}><style>{GLOBAL_STYLES}</style><div data-theme="dark"><SplashScreen /></div></ThemeCtx.Provider>);

  let AppContent;
  const isOwner = authUser.email === OWNER_EMAIL;
  const availableRoles = isOwner ? Object.keys(ROLES) : (userRecord?.roles || []);

  if (phase === "control_panel") {
    AppContent = <ControlPanel
      requests={accessRequests} authorizedUsers={authorizedUsers}
      onApprove={approveRequest} onReject={rejectRequest} onRemoveUser={removeUser}
      onBack={() => setPhase("select")} authUser={authUser} onSignOut={handleSignOut}
    />;
  } else if(phase==="select") {
    if (!isOwner && !userRecord) {
      if (accessRequest && accessRequest.status === "pending") {
        AppContent = <PendingScreen request={accessRequest} authUser={authUser} onSignOut={handleSignOut} />;
      } else {
        AppContent = <RequestAccessScreen authUser={authUser} onSubmit={submitAccessRequest} onSignOut={handleSignOut} />;
      }
    } else {
      AppContent = <RoleSelectScreen
        availableRoles={availableRoles} onSelect={selectRole}
        isOwner={isOwner} onControlPanel={() => setPhase("control_panel")}
        authUser={authUser} onSignOut={handleSignOut}
        pendingCount={accessRequests.filter(r => r.status === "pending").length}
      />;
    }
  } else {
    const viewOrders=role==="vins"?orders.filter(o=>o.restaurant==="Vins"):role==="manja"?orders.filter(o=>o.restaurant==="Manja"):orders;
    const activeOrder=orders.find(o=>o.id===activeId)||null;
    const roleConfig=ROLES[role];

    const totalIssues = orders.reduce((acc, o) => {
      const s = oStats(o);
      return acc + s.short + s.oos;
    }, 0);

    const renderMain = () => {
      if(loadingInitial) return (
        <div style={{padding:"24px 0"}}>
          <div className="skeleton-box" style={{height: 40, width: "60%", marginBottom: 30}}></div>
          <div style={{display:"flex", gap:10, marginBottom:30}}><div className="skeleton-box" style={{height: 100, flex: 1}}></div><div className="skeleton-box" style={{height: 100, flex: 1}}></div><div className="skeleton-box" style={{height: 100, flex: 1}}></div></div>
          <div className="skeleton-box" style={{height: 80, width: "100%", marginBottom: 12}}></div><div className="skeleton-box" style={{height: 80, width: "100%", marginBottom: 12}}></div><div className="skeleton-box" style={{height: 80, width: "100%", marginBottom: 12}}></div>
        </div>
      );
      
      if (role === "admin") {
        if (activeOrder) return <AdminOrderView order={activeOrder} onEditOrder={setEditingOrder}/>;
        return <AdminDashboard 
          orders={orders} 
          dailyProductions={dailyProductions} 
          onCreateDP={createDailyProduction}
          onUpdateDP={updateDailyProduction}
          onDeleteDP={deleteDailyProduction}
          onActivateWeek={activateWeek}
        />;
      }
      
      if (role === "production") {
        return <ProductionView 
          orders={orders} 
          dailyProductions={dailyProductions} 
          onBatchUpdate={handleBatchUpdate}
          onDailyProdUpdate={updateDailyProdItem}
          role={role}
          onAddExtra={logExtraProduction}
        />;
      }
      
      if (role === "packing") {
        if (!activeOrder) return(
          <div className="animate-fade-in empty-state">
            <div className="empty-icon">◻</div>
            <div style={{fontSize:18,fontWeight:900,color:C.ch,marginBottom:6}}>Select an Order</div>
            <div style={{fontSize:13,color:C.chL,fontWeight:500,maxWidth:220,lineHeight:1.5}}>Choose an order from the sidebar to start packing.</div>
          </div>
        );
        return <PackingView order={activeOrder} onUpdate={updateItem} orders={orders} notify={notify}/>;
      }

      if (role === "vins" || role === "manja") {
        if (!activeOrder) return(
          <div className="animate-fade-in empty-state">
            <div className="empty-icon">{viewOrders.length===0?"📋":"👈"}</div>
            <div style={{fontSize:18,fontWeight:900,color:C.ch,marginBottom:6}}>{viewOrders.length===0?"No Orders Yet":"Select an Order"}</div>
            <div style={{fontSize:13,color:C.chL,fontWeight:500,maxWidth:220,lineHeight:1.5}}>{viewOrders.length===0?"Your admin will create orders shortly.":"Pick an order from the sidebar to view its status."}</div>
          </div>
        );
        return <OrderingView order={activeOrder}/>;
      }
    };

    const topBarBg   = "linear-gradient(180deg,rgba(4,6,14,0.98) 0%,rgba(4,6,14,0.94) 100%)";
    const topBarBdr  = "1px solid rgba(0,212,255,0.09)";
    const topBarShd  = "0 4px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(0,212,255,0.06)";
    const sidebarBg  = "rgba(4,6,14,0.97)";
    const sidebarBdr = "1px solid rgba(255,255,255,0.07)";
    const mainBg     = "radial-gradient(ellipse 90% 50% at 50% -5%,rgba(211,17,24,0.07) 0%,transparent 55%), radial-gradient(ellipse 60% 40% at 85% 20%,rgba(0,212,255,0.05) 0%,transparent 50%), radial-gradient(ellipse 50% 35% at 15% 70%,rgba(63,70,200,0.06) 0%,transparent 50%), #04060E";
    const orderCount = "#1E2D4A";
    const copyright  = "#142030";

    AppContent = (
      <div
        className="animate-fade-in cursor-spotlight"
        style={{height:"100vh",display:"flex",flexDirection:"column",backgroundColor:"#04060E",fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",overflow:"hidden",position:"relative",transition:"background-color 0.4s ease, opacity 0.32s ease",opacity:screenExiting?0:1}}
        onMouseMove={e=>{const el=e.currentTarget;const r=el.getBoundingClientRect();el.style.setProperty("--cx",(e.clientX-r.left)+"px");el.style.setProperty("--cy",(e.clientY-r.top)+"px");}}
        onMouseLeave={e=>{e.currentTarget.style.setProperty("--cx","-9999px");e.currentTarget.style.setProperty("--cy","-9999px");}}
      >
        <div className="dot-grid-fixed"/>
        <div className="portal-orb portal-orb-1"/>
        <div className="portal-orb portal-orb-2"/>
        <div className="portal-orb portal-orb-3"/>
        <div className="portal-orb portal-orb-4"/>
        <div className="portal-orb portal-orb-5"/>

        {toast&&<Toast msg={toast.msg} type={toast.type}/>}
        {showModal&&<NewOrderModal onClose={()=>setShowModal(false)} onSubmit={handleNewOrder} notify={notify}/>}
        {editingOrder&&<EditOrderModal order={editingOrder} onClose={()=>setEditingOrder(null)} onSave={saveOrderEdit} notify={notify}/>}

        {/* ── Offline Bar ── */}
        {!isOnline&&<div className="offline-bar"><span>⚡</span>You're offline — changes will sync when reconnected</div>}

        {/* ── Install Banner ── */}
        {showInstallBanner&&<div className="install-banner">
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#D31118,#8A0B10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,boxShadow:"0 4px 14px rgba(211,17,24,0.45)"}}>🍽️</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:"#EEF2FF",lineHeight:1.2}}>Add to Home Screen</div>
            <div style={{fontSize:11,color:"#8896B3",marginTop:2,fontWeight:500}}>Install TFC Order Tracker for quick access</div>
          </div>
          <button onClick={async()=>{ if(installPrompt){await installPrompt.prompt();setInstallPrompt(null);} setShowInstallBanner(false); }} style={{background:"linear-gradient(135deg,#D31118,#8A0B10)",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:800,padding:"8px 14px",cursor:"pointer",flexShrink:0,boxShadow:"0 2px 10px rgba(211,17,24,0.4)"}}>Install</button>
          <button onClick={()=>setShowInstallBanner(false)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#8896B3",fontSize:12,fontWeight:700,padding:"8px 12px",cursor:"pointer",flexShrink:0}}>Later</button>
        </div>}

        {/* ── Portal Top Bar ── */}
        <div style={{background:topBarBg,borderBottom:topBarBdr,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",flexShrink:0,zIndex:60,position:"relative",boxShadow:topBarShd,transition:"all 0.4s ease",paddingTop:"env(safe-area-inset-top, 0px)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:58}}>
          <div className="portal-bar-shine"/>
          {/* Left */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isMobile&&<button onClick={()=>setSidebarOpen(true)} style={{background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",border:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`,borderRadius:8,minWidth:44,minHeight:44,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.ch,fontSize:17,flexShrink:0}}>☰</button>}
            <div style={{position:"relative",width:34,height:34,flexShrink:0}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(145deg,#200A0A,#2E1010)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:"0 0 0 1px rgba(211,17,24,0.3),0 2px 10px rgba(211,17,24,0.2)"}}>🍽️</div>
              <div style={{position:"absolute",inset:-4,borderRadius:"50%",border:"1px solid rgba(211,17,24,0.18)",animation:"spinSlow 22s linear infinite",pointerEvents:"none"}}/>
            </div>
            <div>
              <div className="gradient-text-brand" style={{fontSize:15,fontWeight:900,letterSpacing:"-0.02em",lineHeight:1}}>Order Tracker</div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}>
                <span style={{width:5,height:5,background:C.ol,borderRadius:"50%",animation:"pulseSoft 2s infinite",display:"inline-block",flexShrink:0}}/>
                <span style={{fontSize:9,color:C.ol,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:800}}>Live</span>
                {!isMobile&&<span style={{fontSize:9,color:orderCount,fontWeight:600,marginLeft:4}}>{viewOrders.length} order{viewOrders.length!==1?"s":""}</span>}
              </div>
            </div>
          </div>
          {/* Right */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{position:"relative"}}>
              <span style={{fontSize:11,fontWeight:800,color:roleConfig.color,background:roleConfig.color+"14",border:"1px solid "+roleConfig.color+"35",borderRadius:20,padding:isMobile?"6px 10px":"6px 14px",letterSpacing:"0.02em",whiteSpace:"nowrap",boxShadow:"0 0 14px "+roleConfig.color+"25",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10}}>{roleConfig.icon}</span>{!isMobile&&roleConfig.label}
              </span>
              {totalIssues>0&&<span style={{position:"absolute",top:-6,right:-6,background:"#D31118",color:"#fff",borderRadius:"50%",width:17,height:17,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #04060E",animation:"pulseSoft 2s infinite"}}>{totalIssues}</span>}
            </div>
            {"Notification" in window && (
              <button
                onClick={()=>{
                  if(notifPermission==="default"){
                    Notification.requestPermission().then(p=>{setNotifPermission(p); if(p==="granted") notify("Notifications enabled!","success"); else if(p==="denied") notify("Notifications blocked. Allow them in browser settings.","error");});
                  } else if(notifPermission==="denied"){
                    notify("Notifications are blocked. Go to browser Settings → Site settings to allow them.","error");
                  } else {
                    notify("Notifications are enabled ✓","success");
                  }
                }}
                title={notifPermission==="granted"?"Notifications on":notifPermission==="denied"?"Notifications blocked":"Enable notifications"}
                style={{background:notifPermission==="granted"?"rgba(74,222,128,0.08)":notifPermission==="denied"?"rgba(248,113,113,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${notifPermission==="granted"?"rgba(74,222,128,0.25)":notifPermission==="denied"?"rgba(248,113,113,0.25)":"rgba(255,255,255,0.08)"}`,borderRadius:8,minWidth:36,minHeight:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,position:"relative",flexShrink:0,transition:"all 0.2s"}}
              >
                {notifPermission==="granted"?"🔔":notifPermission==="denied"?"🔕":"🔔"}
                {notifPermission==="default"&&<span style={{position:"absolute",top:3,right:3,width:6,height:6,background:"#E8920A",borderRadius:"50%",border:"1.5px solid #04060E"}}/>}
              </button>
            )}
            {!isMobile&&authUser&&(authUser.photoURL?<img src={authUser.photoURL} alt="" style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${isDark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)"}`,flexShrink:0}}/>:<div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#D31118,#8A0B10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#fff",flexShrink:0}}>{authUser.displayName?.[0]||"?"}</div>)}
            <button onClick={()=>{ setScreenExiting(true); setTimeout(()=>{ setPhase("select");setRole(null);setActiveId(null);setScreenExiting(false); }, 320); }} style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)",border:`1px solid ${isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)"}`,color:C.chL,padding:"6px 12px",borderRadius:8,minHeight:36,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{isMobile?"←":"Roles"}</button>
          </div>
        </div>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative",zIndex:2}}>
          {isMobile&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(3px)",zIndex:40,animation:"fadeIn 0.3s ease-out forwards"}}/>}

          {/* Sidebar */}
          <div className="custom-scrollbar" style={{width:240,borderRight:sidebarBdr,background:sidebarBg,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",padding:"14px 12px",overflowY:"auto",flexShrink:0,display:"flex",flexDirection:"column",gap:5,position:isMobile?"absolute":"relative",zIndex:50,height:"100%",left:0,top:0,transform:isMobile?(sidebarOpen?"translateX(0)":"translateX(-100%)"):"none",transition:"transform 0.3s cubic-bezier(0.16,1,0.3,1), background 0.4s ease",boxShadow:isMobile&&sidebarOpen?(isDark?"0 0 60px rgba(0,0,0,0.8)":"0 0 40px rgba(0,0,0,0.15)"):"none"}}>
            {role==="admin"&&(<div style={{marginBottom:10}}><button className="btn-3d create-order-btn" onClick={()=>{setShowModal(true);if(isMobile)setSidebarOpen(false);}} style={{width:"100%",padding:"14px 0",border:"none",borderRadius:12,background:"linear-gradient(135deg,#D31118,#8A0B10)",color:"#FFFFFF",fontSize:14,cursor:"pointer",fontWeight:900,letterSpacing:"0.03em",boxShadow:"0 4px 22px rgba(211,17,24,0.55),0 0 40px rgba(211,17,24,0.12),inset 0 1px 0 rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:18}}>+</span> Create Order</button></div>)}
            {role==="production"&&(<div style={{padding:"12px 14px",background:"rgba(232,146,10,0.08)",borderRadius:10,border:"1px solid rgba(232,146,10,0.2)",marginBottom:10}}><div style={{fontSize:11,fontWeight:900,color:C.amDk,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3}}>Production Mode</div><div style={{fontSize:11,color:C.chL,lineHeight:1.4,fontWeight:500}}>All items flagged for production.</div></div>)}
            <div className="section-label-v2" style={{color:C.chL}}>Orders {viewOrders.length>0&&<span style={{fontWeight:700,marginLeft:3}}>({viewOrders.length})</span>}</div>
            {loadingInitial?(<div style={{padding:"10px 0"}}><div className="skeleton-box" style={{height:80,marginBottom:10}}></div><div className="skeleton-box" style={{height:80}}></div></div>):viewOrders.length===0?<div style={{fontSize:13,color:C.chXL,textAlign:"center",padding:"32px 0",fontWeight:600}}>No orders found</div>:viewOrders.map((o,i)=>(<OrderCard key={o.id} index={i} order={o} active={activeId===o.id} onClick={()=>{setActiveId(o.id);if(isMobile)setSidebarOpen(false);}} onDelete={role==="admin"?deleteOrder:null}/>))}
            <div style={{marginTop:"auto",paddingTop:20,textAlign:"center",fontSize:9,color:copyright,fontWeight:500}}>© 2026 Made by Banuja Disanayaka</div>
          </div>

          {/* Main content */}
          <div className="custom-scrollbar" style={{flex:1,overflowY:"auto",padding:isMobile?"16px":"32px 40px",background:mainBg,width:"100%",position:"relative",transition:"background 0.4s ease"}}>
            <div key={`${role}-${activeId||"none"}`} className="view-enter" style={{minHeight:"100%"}}>
              {renderMain()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return ( <ThemeCtx.Provider value={true}><style>{GLOBAL_STYLES}</style><div data-theme="dark" style={{minHeight:"100vh",opacity:screenExiting?0:1,transition:"opacity 0.32s ease"}}>{AppContent}</div></ThemeCtx.Provider> );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TFCOrderSystem />
    </ErrorBoundary>
  );
}