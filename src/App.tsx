// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "animate.css";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot,
  updateDoc, writeBatch, query, where, getDocs, addDoc, orderBy, limit, runTransaction, getDoc
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// ⚠️ Force-load the JSON database bypassing strict compilers
const recipeData = require("./TFC_Recipes_Database.json");
const RECIPE_DB = recipeData || [];

const itemsData = require("./TFC_Items_Database.json");
const ITEMS_DB = itemsData || [];

/* ═══════════════════════════════════════════════════════════════
   SKETCH DESIGN SYSTEM — Paper + Ink Aesthetic
═══════════════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900&family=JetBrains+Mono:wght@500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; touch-action: manipulation; }
  html, body { margin: 0; padding: 0; overflow-x: hidden; -webkit-tap-highlight-color: transparent; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
  #root { overflow-x: hidden; overscroll-behavior-y: contain; }
  button, a { -webkit-tap-highlight-color: transparent; }
  button, input, select { -webkit-appearance: none; appearance: none; }

  /* ── CSS Custom Properties (theme vars) ── */
  :root, [data-theme="dark"] {
    --page-bg: #222222; --card-bg: #2A2828; --card-shadow: 2px 3px 0 rgba(0,0,0,0.50);
    --modal-bg: #222222; --border: rgba(194,216,196,0.24); --text: #F8EDAD;
    --text-sub: #A09080; --accent: #700143; --input-bg: #1E1E1E;
    --gold: #C2D8C4; --burgundy: #4A0030;
    --input-focus-border: #C2D8C4; --input-focus-shadow: rgba(194,216,196,0.15);
    --input-focus-bg: #1A1A1A; --sidebar-bg: #1E1E1E;
    --header-bg: rgba(34,34,34,0.96); --paper-dot: rgba(194,216,196,0.06);
    --border-faint: rgba(194,216,196,0.16);
    --sub-bg: rgba(194,216,196,0.05);
  }
  [data-theme="light"] {
    --page-bg: #F8EDAD; --card-bg: #FFFFFF; --card-shadow: 2px 3px 0 rgba(0,0,0,0.08);
    --modal-bg: #F8EDAD; --border: rgba(34,34,34,0.20); --text: #222222;
    --text-sub: #6B4060; --accent: #700143; --input-bg: #FFFFFF;
    --input-focus-border: #700143; --input-focus-shadow: rgba(112,1,67,0.14);
    --input-focus-bg: #FDF5F0; --sidebar-bg: #EFE5D8;
    --header-bg: rgba(248,237,173,0.95); --paper-dot: rgba(112,1,67,0.04);
    --border-faint: rgba(34,34,34,0.14);
    --sub-bg: rgba(34,34,34,0.04);
    --color-success: #15803D; --color-warning: #B45309; --color-danger: #A02040; --color-info: #0369A1;
  }

  /* Type scale */
  :root {
    --text-2xs: 10px; --ls-label: 0.12em;
    --text-xs: 11px; --text-sm: 13px; --text-base: 15px;
    --text-md: 17px; --text-lg: 20px; --text-xl: 24px; --text-2xl: 28px;
    --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
    --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px;
    --radius-sm:8px; --radius-md:12px;
  }
  :root, [data-theme="dark"] {
    --color-success: #16A34A; --color-warning: #E8920A; --color-danger: #C1305A; --color-info: #0EA5E9;
    --accent-glow: rgba(112,1,67,0.30); --gold-glow: rgba(194,216,196,0.18);
  }

  /* Paper dot texture */
  body { background-color: var(--page-bg); background-image: radial-gradient(circle, var(--paper-dot) 1px, transparent 1px); background-size: 24px 24px; }

  /* ── Safe-area / notch support ── */
  .safe-area-top { padding-top: env(safe-area-inset-top); }
  .offline-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: #4D002E; color: #F8EDAD; text-align: center; font-size: 12px; font-weight: 700; padding: calc(4px + env(safe-area-inset-top)) 16px 4px; letter-spacing: 0.04em; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .install-banner { position: fixed; bottom: env(safe-area-inset-bottom, 0px); left: 0; right: 0; z-index: 9990; background: var(--header-bg); border-top: 1.5px solid var(--border); padding: 12px 20px; display: flex; align-items: center; gap: 12px; animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulseSoft { 0% { box-shadow: 0 0 0 0 rgba(112, 1, 67, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(112, 1, 67, 0); } 100% { box-shadow: 0 0 0 0 rgba(112, 1, 67, 0); } }
  @keyframes shimmerPulse { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  /* ── 3D Premium: orb float animations ── */
  @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.08)} 66%{transform:translate(-30px,55px) scale(0.96)} }
  @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-80px,55px) scale(1.06)} 66%{transform:translate(80px,-30px) scale(1.10)} }
  @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(35px,45px) scale(1.14)} }
  @keyframes logoGlow { 0%,100%{box-shadow:0 0 0 1px rgba(112,1,67,0.30),0 6px 28px rgba(112,1,67,0.28),0 0 80px rgba(112,1,67,0.10)} 50%{box-shadow:0 0 0 1px rgba(194,216,196,0.35),0 8px 40px rgba(194,216,196,0.28),0 0 110px rgba(194,216,196,0.12)} }
  @keyframes specularDrift { 0%,100%{opacity:1;transform:scaleX(1) translateX(0)} 33%{opacity:0.7;transform:scaleX(0.82) translateX(-4%)} 66%{opacity:0.85;transform:scaleX(0.92) translateX(3%)} }
  @keyframes liquidPulse { 0%,100%{backdrop-filter:blur(44px) brightness(1.12) saturate(1.9)} 50%{backdrop-filter:blur(48px) brightness(1.15) saturate(2.0)} }
  @keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes loadBar { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }
  @keyframes statusPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5} }

  /* ── Sketch card system (replaces glass-card) ── */
  .glass-card {
    background: var(--card-bg);
    border: 1.5px solid var(--border);
    border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
    box-shadow: var(--card-shadow);
    position: relative;
    overflow: hidden;
  }
  .glass-card::before, .glass-card::after { display: none !important; }

  .sketch-card {
    background: var(--card-bg);
    border: 1.5px solid var(--border);
    border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
    box-shadow: var(--card-shadow);
    position: relative;
    overflow: hidden;
  }
  /* Sketch pill buttons */
  .sketch-pill {
    border: 1.5px solid var(--border);
    border-radius: 100px 95px 100px 95px / 100px 100px 95px 100px;
    padding: 10px 22px; background: transparent; color: var(--text);
    cursor: pointer; font-weight: 700; font-size: 13px;
    box-shadow: 1px 2px 0 rgba(0,0,0,0.10);
    transition: all 0.15s ease; font-family: inherit; min-height: 44px;
    letter-spacing: 0.01em;
  }
  .sketch-pill.active, .sketch-pill.selected { background: var(--accent); color: #fff; border-color: var(--accent); }
  .sketch-pill:active { transform: scale(0.95); }

  /* Sketch font */
  .sketch-font { font-weight: 700; letter-spacing: -0.01em; }

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
  .btn-3d:not(:disabled):active { transform: translateY(2px) scale(0.975) !important; box-shadow: 0 1px 4px rgba(112,1,67,0.3) !important; }
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
  [data-theme="light"] .skeleton-box { background: linear-gradient(90deg, #E8E8D8 0%, #F0F0E0 50%, #E8E8D8 100%); background-size: 200% 100%; }
  .celebration-card { border: 2px solid #097353 !important; animation: celebrateGlow 2s infinite ease-in-out; }
  
  .glass-header { position: sticky; top: -20px; z-index: 40; background: var(--header-bg); padding: 20px 20px 16px 20px; margin: -20px -20px 16px -20px; border-bottom: 1px solid var(--border); transition: all 0.3s ease; }
  @media (min-width: 768px) { .glass-header { top: -32px; padding: 32px 40px 16px 40px; margin: -32px -40px 16px -40px; } }

  .accordion-content { overflow: hidden; transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease; max-height: 0; opacity: 0; }
  .accordion-content.open { max-height: 1000px; opacity: 1; }

  .cooking-shimmer { background: linear-gradient(90deg, #121A28 0%, #1E2C18 50%, #121A28 100%); background-size: 200% 100%; animation: shimmerPulse 2.5s infinite; }
  .prod-done-glow { background: linear-gradient(90deg, #0E1E18 0%, #162A1E 50%, #0E1E18 100%); background-size: 200% 100%; animation: shimmerPulse 3s infinite; }
  
  .dot { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: currentColor; margin: 0 2px; animation: dotBounce 1.4s infinite ease-in-out both; }
  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  .custom-scrollbar { -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; opacity: 0.5; }
  @media(max-width:768px) { .custom-scrollbar::-webkit-scrollbar { width: 0; height: 0; } }

  input:focus, textarea:focus, select:focus { border-color: var(--input-focus-border) !important; box-shadow: 0 0 0 3px var(--input-focus-shadow) !important; background: var(--input-focus-bg) !important; outline: none; }
  input::placeholder, textarea::placeholder { color: var(--text-sub); opacity: 0.6; }
  input, textarea, select { color: var(--text) !important; background: var(--input-bg) !important; border: 1.5px solid var(--border); border-radius: 12px 11px 13px 12px; font-size: 16px; }

  /* ── Premium card depth system (V6) ── */
  .packing-card { background: linear-gradient(160deg, #111828 0%, #0D1520 100%); transition: all 0.25s ease; }
  .packing-card-cooking { background: linear-gradient(160deg, #141A12 0%, #0E1810 100%) !important; }
  .packing-card-prod-done { background: linear-gradient(160deg, #0E1A14 0%, #0A1610 100%) !important; }
  .packing-card-packed { background: linear-gradient(160deg, #160E0E 0%, #120A0A 100%) !important; }
  .packing-card-delivered { opacity: 0.55; }

  /* ── Premium action buttons (V6) ── */
  .pack-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #700143, #4D002E); color: #fff; border: none; border-radius: 10px; font-weight: 900; font-size: 13px; cursor: pointer; letter-spacing: 0.03em; box-shadow: 0 4px 14px rgba(112,1,67,0.35); transition: all 0.2s ease; font-family: inherit; }
  .pack-btn:hover { box-shadow: 0 6px 20px rgba(112,1,67,0.5); transform: translateY(-1px); }
  .pack-btn:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(112,1,67,0.3); }
  .dispatch-btn { width: 100%; padding: 11px; background: linear-gradient(135deg, #097353, #065A40); color: #fff; border: none; border-radius: 10px; font-weight: 900; font-size: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(9,115,83,0.3); transition: all 0.2s ease; font-family: inherit; }
  .dispatch-btn:hover { box-shadow: 0 6px 20px rgba(9,115,83,0.45); transform: translateY(-1px); }

  /* ── Status accent left border (V6) ── */
  .border-cooking { border-left: 4px solid rgba(232,146,10,0.8) !important; }
  .border-prod-done { border-left: 4px solid rgba(74,222,128,0.7) !important; }
  .border-packed { border-left: 4px solid rgba(112,1,67,0.7) !important; }
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
  .badge-glow-packed   { box-shadow: 0 0 8px rgba(112,1,67,0.55)    !important; }
  .badge-glow-short    { box-shadow: 0 0 8px rgba(251,176,64,0.45)  !important; }
  .badge-glow-oos      { box-shadow: 0 0 8px rgba(252,165,165,0.45) !important; }

  /* ── Portal top bar gradient underline ── */
  .portal-bar-shine {
    position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(112,1,67,0.35) 40%, rgba(112,1,67,0.35) 60%, transparent 100%);
    pointer-events: none;
  }

  /* ── Stat card counter animation ── */
  @keyframes countPop { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
  .count-pop { animation: countPop 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }

  /* ═══ Packing Card V8 — depth glow system ═══ */
  .pk-card { border-radius:16px; overflow:hidden; margin-bottom:10px; position:relative; transition:transform 0.2s ease, box-shadow 0.2s ease; }
  @media(hover:hover){ .pk-card:hover { transform:translateY(-2px); } }
  .pk-card:active { transform:translateY(0) !important; }

  .pk-pending   { background:#0F1525; border:1px solid rgba(136,150,179,0.22); box-shadow:-3px 0 0 0 rgba(136,150,179,0.42), 0 4px 18px rgba(0,0,0,0.30); }
  .pk-production{ background:#111A0D; border:1px solid rgba(251,176,64,0.22); box-shadow:-3px 0 0 0 #FBB040, 0 4px 22px rgba(0,0,0,0.30), 0 0 20px rgba(251,176,64,0.07); }
  .pk-prod_done { background:#091410; border:1px solid rgba(74,222,128,0.22); box-shadow:-3px 0 0 0 #4ADE80, 0 4px 22px rgba(0,0,0,0.30), 0 0 20px rgba(74,222,128,0.07); }
  .pk-packed    { background:#1A0814; border:1px solid rgba(112,1,67,0.22); box-shadow:-3px 0 0 0 rgba(112,1,67,0.85), 0 4px 22px rgba(0,0,0,0.30), 0 0 18px rgba(112,1,67,0.06); }
  .pk-delivered { background:#090B14; border:1px solid rgba(255,255,255,0.05); box-shadow:none; opacity:0.5; }
  .pk-short     { background:#100D06; border:1px solid rgba(232,146,10,0.22); box-shadow:-3px 0 0 0 #E8920A, 0 4px 18px rgba(0,0,0,0.30), 0 0 18px rgba(232,146,10,0.07); }
  .pk-oos       { background:#130A0A; border:1px solid rgba(252,165,165,0.18); box-shadow:-3px 0 0 0 rgba(252,165,165,0.55), 0 4px 18px rgba(0,0,0,0.30); }

  [data-theme="light"] .pk-pending   { background:#F8F9FF; border:1px solid rgba(100,116,139,0.25); box-shadow:-3px 0 0 0 rgba(100,116,139,0.50), 0 2px 10px rgba(0,0,0,0.07); }
  [data-theme="light"] .pk-production{ background:#FFFBF0; border:1px solid rgba(217,119,6,0.28); box-shadow:-3px 0 0 0 #D97706, 0 2px 10px rgba(0,0,0,0.07); }
  [data-theme="light"] .pk-prod_done { background:#F0FFF6; border:1px solid rgba(22,163,74,0.28); box-shadow:-3px 0 0 0 #16A34A, 0 2px 10px rgba(0,0,0,0.07); }
  [data-theme="light"] .pk-packed    { background:#FFF0F8; border:1px solid rgba(112,1,67,0.28); box-shadow:-3px 0 0 0 rgba(112,1,67,0.85), 0 2px 10px rgba(0,0,0,0.07); }
  [data-theme="light"] .pk-delivered { background:#F8F8F8; opacity:0.6; }
  [data-theme="light"] .pk-short     { background:#FFFAF0; border:1px solid rgba(180,115,8,0.28); box-shadow:-3px 0 0 0 #B47308, 0 2px 8px rgba(0,0,0,0.07); }
  [data-theme="light"] .pk-oos       { background:#FFF5F5; border:1px solid rgba(185,28,28,0.22); box-shadow:-3px 0 0 0 rgba(185,28,28,0.55), 0 2px 8px rgba(0,0,0,0.07); }

  /* Primary pack/dispatch action buttons */
  .pk-pack-btn { width:100%; padding:14px; background:linear-gradient(135deg,#700143,#4D002E); color:#fff; border:none; border-radius:12px; font-weight:900; font-size:14px; cursor:pointer; letter-spacing:0.02em; box-shadow:0 4px 20px rgba(112,1,67,0.45), inset 0 1px 0 rgba(255,255,255,0.12); transition:all 0.15s ease; font-family:inherit; }
  .pk-pack-btn:hover { box-shadow:0 6px 28px rgba(112,1,67,0.62), 0 0 0 1px rgba(112,1,67,0.28); transform:translateY(-1px); }
  .pk-pack-btn:active { transform:translateY(1px); box-shadow:0 2px 8px rgba(112,1,67,0.3); }
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
  .modal-sheet { background:var(--card-bg); border:1px solid rgba(255,255,255,0.08); border-top:3px solid var(--accent); box-shadow:0 24px 80px rgba(0,0,0,0.5), 2px 3px 0 rgba(0,0,0,0.12); }
  [data-theme="light"] .modal-sheet { border-color:rgba(0,0,0,0.12); box-shadow:0 16px 60px rgba(0,0,0,0.20), 2px 3px 0 rgba(0,0,0,0.08); }

  /* ── Production batch card V2 ── */
  .batch-v2 { background:linear-gradient(160deg,#0D1420,#080E1A); border:1px solid rgba(232,146,10,0.18); border-left:4px solid #E8920A; border-radius:18px; margin-bottom:16px; overflow:hidden; box-shadow:0 6px 30px rgba(0,0,0,0.55), 0 0 40px rgba(232,146,10,0.06); }
  .batch-complete-btn { width:100%; padding:15px; background:linear-gradient(135deg,#097353,#065A40); color:#fff; border:none; border-radius:12px; font-weight:900; font-size:14px; cursor:pointer; letter-spacing:0.02em; box-shadow:0 4px 18px rgba(9,115,83,0.42), inset 0 1px 0 rgba(255,255,255,0.10); transition:all 0.15s ease; font-family:inherit; }
  .batch-complete-btn:hover { box-shadow:0 6px 26px rgba(9,115,83,0.6); transform:translateY(-1px); }
  .batch-complete-btn:active { transform:translateY(1px); }

  /* ── Admin day-tile ── */
  .day-tile { background:var(--card-bg); border:1px solid var(--border-faint); border-radius:14px; padding:16px; margin-bottom:10px; transition:border-color 0.2s; }
  .day-tile-active { border-color:rgba(112,1,67,0.25) !important; }
  .day-tile-empty  { background:transparent; border:2px dashed rgba(194,216,196,0.12) !important; border-radius:12px; padding:14px; text-align:center; margin-bottom:10px; }

  /* ── RecipeCard terminal ── */
  .recipe-terminal { background:#1A1A1A; border:1px solid rgba(112,1,67,0.2); border-radius:12px; overflow:hidden; }
  .recipe-terminal-bar { background:rgba(112,1,67,0.08); border-bottom:1px solid rgba(112,1,67,0.15); padding:10px 14px; display:flex; align-items:center; gap:8px; }
  .recipe-terminal-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }

  /* ── Empty state ── */
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 24px; text-align:center; }
  .empty-icon { font-size:52px; margin-bottom:18px; filter:grayscale(0.3) opacity(0.7); }

  /* ── Gradient text (dark mode — white-start gradients) ── */
  .gradient-text-red { background:linear-gradient(135deg,#F8EDAD 0%,#E8B0C4 40%,#A00060 75%,#700143 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .gradient-text-amber { background:linear-gradient(135deg,#F8EDAD 0%,#FFD98A 40%,#F59E0B 75%,#C97A05 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .gradient-text-brand { background:linear-gradient(135deg,#F8EDAD 0%,#C2D8C4 30%,#A0609A 65%,#700143 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .gradient-text-white { background:linear-gradient(135deg,#FFFFFF 0%,#C2D8C4 50%,#A0B8A2 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .gradient-text-cyan { background:linear-gradient(135deg,#F8EDAD 0%,#C2D8C4 40%,#7AA880 70%,#4A7850 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }

  /* ── Gradient text light-mode overrides (dark-start so text is visible on cream) ── */
  [data-theme="light"] .gradient-text-red { background:linear-gradient(135deg,#4D002E 0%,#700143 55%,#9A0060 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  [data-theme="light"] .gradient-text-amber { background:linear-gradient(135deg,#7A3000 0%,#B45309 55%,#D97706 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  [data-theme="light"] .gradient-text-brand { background:linear-gradient(135deg,#1A0A10 0%,#700143 50%,#4A0030 90%,#222222 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  [data-theme="light"] .gradient-text-white { background:none; -webkit-text-fill-color:#222222; }
  [data-theme="light"] .gradient-text-cyan { background:none; -webkit-text-fill-color:#5A8A60; }

  /* ── Modal dimmer overlay (adaptive) ── */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:999; }
  [data-theme="light"] .modal-overlay { background:rgba(0,0,0,0.45); }
  .modal-overlay-top { z-index:9999; }

  /* ── Sidebar section label v2 ── */
  .section-label-v2 { display:flex; align-items:center; gap:8px; font-size:var(--text-2xs,10px); font-weight:900; text-transform:uppercase; letter-spacing:var(--ls-label,0.12em); color:var(--text-sub); padding:10px 4px 6px; position:relative; }
  .section-label-v2::before { content:''; width:3px; height:12px; border-radius:2px; background:linear-gradient(180deg,#700143,#4D002E); flex-shrink:0; box-shadow:0 0 6px rgba(112,1,67,0.5); }

  /* ── Design system utility classes ── */
  .left-accent-card { background:var(--card-bg); border:1px solid var(--border-faint); border-left:3px solid var(--accent); border-radius:12px; box-shadow:var(--card-shadow); }
  .toggle-switch { width:48px; height:26px; border-radius:99px; position:relative; cursor:pointer; transition:background .25s; border:1.5px solid var(--border-faint); flex-shrink:0; }
  .toggle-switch__dot { position:absolute; top:3px; width:18px; height:18px; border-radius:50%; background:#fff; transition:left .25s; box-shadow:0 1px 4px rgba(0,0,0,.30); }
  .ds-badge { display:inline-flex; align-items:center; border-radius:99px; font-size:var(--text-xs,11px); font-weight:800; letter-spacing:var(--ls-label,0.12em); padding:3px 10px; }

  /* ── Production cooking indicator dot ── */
  @keyframes prodPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
  .prod-dot { width:6px; height:6px; border-radius:50%; background:#FBB040; animation:prodPulse 1.6s ease-in-out infinite; display:inline-block; flex-shrink:0; box-shadow:0 0 7px rgba(251,176,64,0.65); }

  /* (pk-card states defined above — no duplicates) */

  /* ── Portal ambient orbs ── */
  .portal-orb { position:fixed; border-radius:50%; pointer-events:none; z-index:0; }
  .portal-orb-1 { width:min(750px,85vw); height:min(750px,85vw); background:radial-gradient(circle,rgba(112,1,67,0.10) 0%,transparent 70%); top:-18%; left:-12%; animation:orbFloat1 28s ease-in-out infinite; filter:blur(65px); }
  .portal-orb-2 { width:min(580px,72vw); height:min(580px,72vw); background:radial-gradient(circle,rgba(194,216,196,0.07) 0%,transparent 70%); bottom:-15%; right:-8%; animation:orbFloat2 34s ease-in-out infinite; filter:blur(60px); }
  .portal-orb-3 { width:min(380px,55vw); height:min(380px,55vw); background:radial-gradient(circle,rgba(112,1,67,0.06) 0%,transparent 70%); top:45%; left:55%; animation:orbFloat3 22s ease-in-out infinite; filter:blur(70px); }
  .portal-orb-4 { width:min(520px,68vw); height:min(520px,68vw); background:radial-gradient(circle,rgba(194,216,196,0.06) 0%,transparent 70%); top:20%; right:-10%; animation:orbFloat2 40s ease-in-out infinite; filter:blur(65px); }
  .portal-orb-5 { width:min(420px,60vw); height:min(420px,60vw); background:radial-gradient(circle,rgba(74,0,48,0.08) 0%,transparent 70%); bottom:10%; left:5%; animation:orbFloat1 45s ease-in-out infinite; filter:blur(70px); }

  /* ── Create Order button shimmer sweep ── */
  @keyframes shimmerBtn { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .create-order-btn { position:relative; overflow:hidden; }
  .create-order-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.18) 50%,transparent 60%); background-size:200% 100%; animation:shimmerBtn 2.8s ease-in-out infinite; pointer-events:none; border-radius:inherit; }

  /* ── Enhanced hover-lift ── */
  .hover-lift:hover { transform:translateY(-4px) !important; box-shadow:0 12px 32px rgba(0,0,0,0.7) !important; }

  /* ── OrderCard active glow state ── */
  .order-card-active-vins { box-shadow:0 12px 40px rgba(0,0,0,0.75), 0 0 30px rgba(112,1,67,0.18) !important; }
  .order-card-active-manja { box-shadow:0 12px 40px rgba(0,0,0,0.75), 0 0 30px rgba(232,146,10,0.18) !important; }

  /* ── Bento card system (Tier 2) ── */
  .bento-hero { border-radius:16px; overflow:hidden; position:relative; transition:transform 0.22s cubic-bezier(0.16,1,0.3,1),box-shadow 0.22s ease; }
  @media(hover:hover){ .bento-hero:hover { transform:translateY(-3px); } }
  .bento-hero:active { transform:translateY(0) !important; }
  @media(max-width:400px) { .bento-stat-grid { grid-template-columns:1fr 1fr !important; } }

  /* ── Admin dashboard tab switcher pill ── */
  .admin-tab-bar { display:flex; padding:4px; border-radius:12px; }
  .admin-tab-btn { padding:8px 18px; border:none; border-radius:9px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s cubic-bezier(0.16,1,0.3,1); white-space:nowrap; }

  .bento-hero::before { display: none; }

  /* ── Cursor spotlight — liquid lens ── */
  .cursor-spotlight { background-image: radial-gradient(500px circle at var(--cx,-9999px) var(--cy,-9999px), rgba(0,212,255,0.07), rgba(255,255,255,0.025) 40%, transparent 70%); }

  @media(hover:hover) { .glass-card:hover { box-shadow: 3px 4px 0 rgba(0,0,0,0.14) !important; transform: translateY(-1px); } }
  [data-theme="light"] .glass-card:hover { box-shadow: 3px 4px 0 rgba(0,0,0,0.10) !important; }

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

  /* ── Mobile font scaling ── */
  @media(max-width:480px) {
    .mobile-stat-num { font-size:28px !important; }
    .mobile-title { font-size:20px !important; letter-spacing:-0.02em !important; }
  }

  /* ── Bottom Navigation Bar ── */
  .bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
    height: 64px; padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--header-bg); border-top: 1.5px solid var(--border);
    display: flex; align-items: stretch;
    box-shadow: 0 -2px 12px rgba(0,0,0,0.12);
  }
  .bottom-nav-tab {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 2px;
    padding: 6px 4px; background: transparent; border: none;
    cursor: pointer; font-family: inherit; min-height: 44px; min-width: 44px;
    -webkit-tap-highlight-color: transparent; transition: opacity 0.15s ease;
  }
  .bottom-nav-tab:active { opacity: 0.65; transform: scale(0.94); }
  .bottom-nav-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-family: inherit; }

  /* Main content bottom padding when nav is visible */
  .has-bottom-nav { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; }

  /* Day-tile light mode */
  [data-theme="light"] .day-tile { background: #FFFFFF; border-color: rgba(26,26,46,0.18); }
  [data-theme="light"] .batch-v2 { background: linear-gradient(160deg,#FFFBF5,#FFF8F0); border-color: rgba(232,146,10,0.22); }
  [data-theme="light"] .queue-card { background: linear-gradient(145deg,#FFFFF5,#FFFBF0); border-color: rgba(232,146,10,0.18); }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
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

// FCM: get your VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = "BIN1-ss4iczuvtzmloazWkckRh4XELDk5g8ugpYi3CVlGMYEHukVUfA0K3VlJy0UpEKV67BTiPAQZHcSF5a3GRI";
const FCM_TTL_MS  = 6 * 24 * 60 * 60 * 1000; // re-register before FCM 7-day idle expiry
const FCM_LS_KEY  = "tfc_fcm_reg"; // localStorage: {ts, role}
let _messaging = null;
function getMsg() {
  if (!_messaging) { try { _messaging = getMessaging(app); } catch(_) {} }
  return _messaging;
}

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
      <div style={{position:"fixed",inset:0,background:"#222222",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"fixed",width:"min(680px,90vw)",height:"min(680px,90vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(112,1,67,0.20) 0%,transparent 70%)",top:"-22%",left:"-12%",animation:"orbFloat1 22s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(55px)"}}/>
      <div style={{position:"fixed",width:"min(900px,110vw)",height:"min(900px,110vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(20,50,160,0.13) 0%,transparent 70%)",bottom:"-32%",right:"-22%",animation:"orbFloat2 28s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(65px)"}}/>
      <div style={{position:"fixed",width:"min(460px,70vw)",height:"min(460px,70vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(112,1,67,0.10) 0%,transparent 70%)",top:"42%",right:"8%",animation:"orbFloat3 19s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(50px)"}}/>
      <div style={{position:"fixed",width:"min(520px,72vw)",height:"min(520px,72vw)",borderRadius:"50%",background:"radial-gradient(circle,rgba(14,165,233,0.10) 0%,transparent 70%)",top:"15%",right:"-15%",animation:"orbFloat2 36s infinite ease-in-out",pointerEvents:"none",zIndex:0,filter:"blur(60px)"}}/>
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
const DC={ // dark palette — charcoal/plum/sage
  w: "#222222", off: "#2A2828", beige: "#2A2828", beigeD: "#343030",
  ch: "#F8EDAD", chM: "#D4C498", chL: "#A09080", chXL: "#504840",
  bdr: "#3A2A34", bdrL: "#2E2828",
  gold: "#C2D8C4", goldBg: "rgba(194,216,196,0.12)", goldBgD: "rgba(194,216,196,0.22)",
  bur: "#4A0030", burBg: "rgba(74,0,48,0.22)",
  ol: "#700143", olDk: "#4D002E", olBg: "rgba(112,1,67,0.15)", olBgD: "rgba(112,1,67,0.28)",
  am: "#E8920A", amDk: "#B86F06", amBg: "rgba(232,146,10,0.13)", amBgD: "rgba(232,146,10,0.24)",
  gn: "#16A34A", gnBg: "rgba(22,163,74,0.13)",
  rd: "#C1305A", rdBg: "rgba(193,48,90,0.14)",
  cy: "#C2D8C4", cyBg: "rgba(194,216,196,0.10)", cyBgD: "rgba(194,216,196,0.20)",
  sh: "2px 3px 0 rgba(0,0,0,0.50)", shM: "3px 5px 0 rgba(0,0,0,0.65)"
};
const LC={ // light palette — cream/plum/sage
  w: "#F8EDAD", off: "#EFE5D8", beige: "#EFE5D8", beigeD: "#C2D8C4",
  ch: "#222222", chM: "#3D1A30", chL: "#6B4060", chXL: "#A08090",
  bdr: "#222222", bdrL: "#8A7A70",
  ol: "#700143", olDk: "#4D002E", olBg: "rgba(112,1,67,0.09)", olBgD: "rgba(112,1,67,0.18)",
  am: "#A0720A", amDk: "#7A5508", amBg: "rgba(160,114,10,0.10)", amBgD: "rgba(160,114,10,0.20)",
  gn: "#15803D", gnBg: "rgba(21,128,61,0.10)",
  rd: "#A02040", rdBg: "rgba(160,32,64,0.10)",
  cy: "#5A8A60", cyBg: "rgba(90,138,96,0.10)", cyBgD: "rgba(90,138,96,0.18)",
  sh: "2px 3px 0 rgba(0,0,0,0.08)", shM: "3px 5px 0 rgba(0,0,0,0.12)"
};
// Module-level C = DC (for static defaults; components use useTheme() for reactive palette)
const C={...DC};

function makeThemeObj(palette, isDark) {
  return {
    isDark,
    ...palette,
    divider:  isDark ? "rgba(255,255,255,0.08)"     : "rgba(34,34,34,0.12)",
    subBg:    isDark ? "rgba(194,216,196,0.05)"     : "rgba(239,229,216,0.60)",
    cardBg:   isDark ? "#2A2828"                    : "#FFFFFF",
    chipBg:   isDark ? "rgba(255,255,255,0.06)"     : "rgba(34,34,34,0.07)",
    footerBg: isDark ? "rgba(34,34,34,0.92)"        : "rgba(239,229,216,0.90)",
    headerBg: isDark ? "rgba(34,34,34,0.96)"        : "rgba(248,237,173,0.95)",
    panelBg:  isDark ? "#1E1E1E"                    : "#EFE5D8",
    editBg:   isDark ? "#1A1A1A"                    : "#FFFFFF",
    editBdr:  isDark ? "#2E2828"                    : "#D8D0C0",
    closeBg:  isDark ? "rgba(255,255,255,0.05)"     : "rgba(34,34,34,0.05)",
    closeBdr: isDark ? "rgba(255,255,255,0.09)"     : "rgba(34,34,34,0.12)",
    trackBg:  isDark ? "rgba(255,255,255,0.07)"     : "rgba(34,34,34,0.10)",
    svgTrack: isDark ? "rgba(255,255,255,0.07)"     : "rgba(34,34,34,0.10)",
    noteBg:   isDark ? "rgba(255,255,255,0.03)"     : "rgba(255,255,255,0.70)",
    noteBdr:  isDark ? "rgba(255,255,255,0.08)"     : "rgba(34,34,34,0.12)",
    cyGlow:   isDark ? "rgba(194,216,196,0.12)"     : "rgba(90,138,96,0.10)",
  };
}

const ThemeCtx = React.createContext(makeThemeObj(DC, true));
function useTheme() { return React.useContext(ThemeCtx); }

const ROLES={
  admin:{label:"Admin",icon:"⚙",color:C.ch,accent:C.ol,bg:C.beige,desc:"Create and manage all orders"},
  packing:{label:"Packing",icon:"◻",color:C.ol,accent:C.ol,bg:C.olBg,desc:"Smart status updater for dispatch"},
  production:{label:"Production",icon:"◈",color:C.am,accent:C.am,bg:C.amBg,desc:"Production queue with recipes"},
  vins:{label:"Vins Kitchen",icon:"V",color:C.chM,accent:C.chM,bg:C.beige,desc:"Live delivery tracker interface"},
  manja:{label:"Manja Kitchen",icon:"M",color:C.amDk,accent:C.amDk,bg:C.amBg,desc:"Live delivery tracker interface"},
};

const SC = {
  pending: { label: "Pending", c: "#A0B8A2", bg: "rgba(162,184,162,0.10)", bdr: "rgba(162,184,162,0.22)", step: 1 },
  production: { label: "Cooking", c: "#FBB040", bg: "rgba(232,146,10,0.12)", bdr: "rgba(232,146,10,0.30)", step: 2 },
  prod_done: { label: "Ready to Pack", c: "#4ADE80", bg: "rgba(22,163,74,0.12)", bdr: "rgba(22,163,74,0.30)", step: 3 },
  packed: { label: "Packed ✓", c: "#D46090", bg: "rgba(112,1,67,0.12)", bdr: "rgba(112,1,67,0.28)", step: 4 },
  delivered: { label: "Delivered 🚀", c: "#F8EDAD", bg: "rgba(248,237,173,0.07)", bdr: "rgba(248,237,173,0.14)", step: 5 },
  short: { label: "Short ⚠", c: "#FBB040", bg: "rgba(232,146,10,0.12)", bdr: "rgba(232,146,10,0.30)", step: -1 },
  oos: { label: "Out of Stock", c: "#E8A0B4", bg: "rgba(193,48,90,0.12)", bdr: "rgba(193,48,90,0.28)", step: -1 },
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
    <motion.div
      initial={{opacity:0,y:-60,scale:0.95}}
      animate={{opacity:1,y:0,scale:1}}
      exit={{opacity:0,y:-40,scale:0.95}}
      transition={{duration:0.35,ease:[0.16,1,0.3,1]}}
      style={{
      position:"fixed",bottom:28,right:24,
      zIndex:9999,maxWidth:360,minWidth:260,
      background:isErr?"rgba(14,4,4,0.97)":"rgba(4,12,8,0.97)",
      backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      backgroundSize:"200px 200px",
      border:"1px solid "+(isErr?"rgba(220,38,38,0.3)":"rgba(22,163,74,0.3)"),
      borderLeft:"3px solid "+accentColor,
      borderRadius:14,padding:"14px 18px",
      boxShadow:"0 16px 60px rgba(0,0,0,0.9), 0 0 0 1px "+(isErr?"rgba(220,38,38,0.06)":"rgba(22,163,74,0.06)"),
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
        <span style={{fontSize:13,fontWeight:700,color:C.ch,lineHeight:1.35}}>{msg}</span>
      </div>
    </motion.div>
  );
}

function SectionLabel({text}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:9,fontSize:9,fontWeight:900,color:"#3A4E6A",textTransform:"uppercase",letterSpacing:"0.16em",marginBottom:14,marginTop:4}}>
      <div style={{width:3,height:13,borderRadius:2,background:"linear-gradient(180deg,#700143,#4D002E)",flexShrink:0,boxShadow:"0 0 6px rgba(112,1,67,0.45)"}}/>
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
      <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(112,1,67,0.25),transparent)",pointerEvents:"none"}}/>
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
          if(ing.type==="stage_label"||!ing.qty) return <div key={i} style={{marginTop:10,marginBottom:6,paddingBottom:4,borderBottom:"1px solid rgba(112,1,67,0.2)",color:C.ol,fontSize:11,fontWeight:900,letterSpacing:"0.04em"}}>{ing.item}</div>;
          return(
            <div key={i} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:12,paddingBottom:7,marginBottom:7,borderBottom:i===r.ingredients.length-1?"none":`1px solid ${th.divider}`}}>
              <span style={{color:C.chM,fontWeight:600}}>{ing.item}</span>
              <span style={{color:C.ol,fontFamily:"'JetBrains Mono',monospace",fontWeight:800,flexShrink:0}}>{ing.qty}</span>
            </div>
          );
        })}

        {r.steps&&r.steps.length>0&&(
          <div style={{marginTop:12}}>
            <button onClick={()=>setShowSteps(!showSteps)} style={{background:showSteps?"rgba(112,1,67,0.15)":th.subBg,border:"1px solid "+(showSteps?"rgba(112,1,67,0.3)":th.divider),padding:"8px 14px",borderRadius:8,fontSize:11,fontWeight:800,color:showSteps?C.ol:C.chL,cursor:"pointer",width:"100%",fontFamily:"inherit",transition:"all 0.2s"}}>
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
    bg = hov ? "linear-gradient(135deg, #4D002E, #380020)" : "linear-gradient(135deg, #700143, #4D002E)";
    color = "#FFFFFF"; border = "none"; boxShadow = hov ? "0 6px 20px rgba(112,1,67,0.45)" : "0 3px 10px rgba(112,1,67,0.3)";
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
      <input value={value} onChange={e => handleInput(e.target.value)} onKeyDown={handleKey} onFocus={() => value.length >= 2 && matches.length > 0 && setOpen(true)} placeholder={placeholder} autoComplete="off" style={{ padding: "11px 14px", border: "1px solid " + C.bdr, borderRadius: 10, fontSize: 13, color: C.ch, outline: "none", background: "var(--card-bg)", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }} />
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

  const inputStyle = { padding:"10px 14px", border:"1px solid "+C.amDk+"50", borderRadius:10, fontSize:16, color:C.ch, outline:"none", background:"var(--card-bg)", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s" };

  return (
    <div className="animate-fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:999, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:20 }}>
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

  const inputStyle = { padding:"10px 14px", border:"1px solid "+C.bdr, borderRadius:10, fontSize:16, color:C.ch, outline:"none", background:"var(--card-bg)", width:"100%", boxSizing:"border-box" };

  return (
    <div className="animate-fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:999, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:20 }}>
      <div className="animate-fade-up modal-sheet" style={{ borderRadius:isMobile?"24px 24px 0 0":20, width:"100%", maxWidth:640, maxHeight:isMobile?"94vh":"88vh", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1, background:"linear-gradient(90deg,transparent,rgba(112,1,67,0.28),transparent)", pointerEvents:"none" }}/>
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
          <div style={{ background:"var(--sub-bg)", padding:16, borderRadius:14, border:"1px solid "+C.bdrL, marginBottom:24 }}>
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
  const allItemsDone = dp.items.length > 0 && dp.items.every(i => i.status === "prod_done");

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid "+C.bdrL }}>
      <button onClick={() => setOpen(!open)} style={{ width:"100%", padding:"14px 18px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:11, fontWeight:900, color: isToday ? C.ol : C.ch, textTransform:"uppercase", letterSpacing:"1px" }}>
            {dp.dayOfWeek}
            {isToday && <span style={{ marginLeft:8, background:C.olBg, color:C.ol, padding:"2px 8px", borderRadius:20, fontSize:9, fontWeight:900, border:"1px solid "+C.olBgD }}>TODAY</span>}
          </div>
          <div style={{ fontSize:11, color:C.chL, fontWeight:600 }}>{dp.date}</div>
          <div style={{ fontSize:10, color:allItemsDone?"#4ADE80":C.chL, background:allItemsDone?"rgba(22,163,74,0.12)":C.off, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>{allItemsDone ? "✓ All done" : dp.items.length+" items"}</div>
        </div>
        <span style={{ color:C.chL, fontSize:12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="animate-fade-in" style={{ padding:"0 18px 14px" }}>
          {dp.items.map(item => (
            <DailyProductionItemRow key={item.id} item={item} dpId={dp.id} onShowRecipe={onShowRecipe} onUpdateItem={onUpdateItem} role={role} />
          ))}
          {allItemsDone && (
            <div className="animate-fade-up" style={{ marginTop:10, padding:"10px 14px", background:"linear-gradient(135deg,rgba(9,115,83,0.22),rgba(22,163,74,0.12))", borderRadius:10, border:"1px solid rgba(74,222,128,0.3)", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{fontSize:18}}>🎉</span>
              <div style={{fontSize:12,fontWeight:800,color:"#4ADE80"}}>All {dp.items.length} items done for {dp.dayOfWeek}!</div>
            </div>
          )}
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
  const [kgError, setKgError] = useState(false);

  function handleConfirmComplete() {
    const kg = parseFloat(actualKg);
    if (isNaN(kg) || kg <= 0) { setKgError(true); return; }
    onUpdateItem(dpId, item.id, {
      status: "prod_done",
      actualKgQty: kg,
      actualPacketQty: parseFloat(actualPkts) || 0,
    });
    setIsCompleting(false);
    setKgError(false);
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
            <input type="number" value={actualKg} onChange={e=>{setActualKg(e.target.value);setKgError(false);}} placeholder="Act. kg*" style={{ width: 52, padding: "6px", fontSize: 11, borderRadius: 4, background: "var(--card-bg)", border: kgError ? "1px solid var(--color-danger,#C1305A)" : "1px solid var(--border-faint)", color: "var(--text)", outline:"none", transition:"border-color 0.2s" }} />
            <span style={{ fontSize: 10, color: C.chL }}>kg</span>
            <input type="number" value={actualPkts} onChange={e=>setActualPkts(e.target.value)} placeholder="Act. pkts" style={{ width: 50, padding: "6px", fontSize: 11, borderRadius: 4, background: "var(--card-bg)", border: "1px solid var(--border-faint)", color: "var(--text)", outline:"none" }} />
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
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:9999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}}>
      <div className="animate-fade-up modal-sheet" style={{borderRadius:isMobile?"24px 24px 0 0":20,width:"100%",maxWidth:480,padding:"26px 28px",display:"flex",flexDirection:"column",maxHeight:isMobile?"90vh":"auto",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(112,1,67,0.3),transparent)",pointerEvents:"none"}}/>
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
      <motion.div
        initial={{opacity:0,y:24}}
        animate={{opacity:1,y:0}}
        transition={{duration:0.8,ease:[0.16,1,0.3,1],delay:0.1}}
        style={{display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:2}}
      >
        <div style={{position:"relative",width:96,height:96,margin:"0 auto 28px"}}>
          <div style={{width:96,height:96,borderRadius:"50%",background:"linear-gradient(145deg,#200A0A,#2E1010)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,animation:"logoGlow 3s infinite ease-in-out"}}>🍽️</div>
          <div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"1px solid rgba(112,1,67,0.18)",animation:"spinSlow 22s linear infinite",pointerEvents:"none"}}/>
          <div style={{position:"absolute",inset:-18,borderRadius:"50%",border:"1px solid rgba(112,1,67,0.08)",animation:"spinSlow 35s linear infinite reverse",pointerEvents:"none"}}/>
        </div>
        <div style={{fontSize:26,fontWeight:900,color:"var(--text)",letterSpacing:"-0.04em",marginBottom:6}}>The Food Company</div>
        <div style={{fontSize:11,color:"#3A5070",letterSpacing:"0.22em",textTransform:"uppercase",fontWeight:700,marginBottom:48}}>Operations Hub</div>
        <div style={{width:180,height:3,background:"rgba(255,255,255,0.05)",borderRadius:4,overflow:"hidden",position:"relative"}}>
          <div style={{position:"absolute",top:0,left:0,width:"45%",height:"100%",background:"linear-gradient(90deg,transparent,#700143,transparent)",animation:"loadBar 1.6s ease-in-out infinite"}}/>
        </div>
      </motion.div>
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
        <motion.div
          initial={{opacity:0,y:-20}}
          animate={{opacity:1,y:0}}
          transition={{duration:0.7,ease:[0.16,1,0.3,1]}}
          style={{textAlign:"center",marginBottom:44}}
        >
          <div style={{position:"relative",width:90,height:90,margin:"0 auto 28px"}}>
            <div style={{width:90,height:90,borderRadius:"50%",background:"linear-gradient(145deg,#200A0A,#2E1010)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,animation:"logoGlow 3s infinite ease-in-out"}}>🍽️</div>
            <div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"1px solid rgba(112,1,67,0.2)",animation:"spinSlow 22s linear infinite",pointerEvents:"none"}}/>
          </div>
          <div style={{fontSize:30,fontWeight:900,color:"var(--text)",letterSpacing:"-0.05em",lineHeight:1,marginBottom:10}}>The Food Company</div>
          <div style={{fontSize:11,color:"#2A4060",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.18em"}}>Operations Hub</div>
        </motion.div>

        {/* Glass card with 3D tilt + Framer Motion */}
        <motion.div
          ref={cardRef}
          className="glass-card tilt-wrap"
          style={{borderRadius:24,padding:"36px 32px",position:"relative",overflow:"hidden"}}
          initial={{opacity:0,y:30}}
          animate={{opacity:1,y:0}}
          transition={{duration:0.6,ease:[0.16,1,0.3,1],delay:0.2}}
        >
          {/* Top shine line */}
          <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.13),transparent)",pointerEvents:"none"}}/>
          <div style={{fontSize:11,fontWeight:700,color:"#2A4060",marginBottom:28,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.18em"}}>Sign in to continue</div>
          <motion.button
            onClick={handleClick} disabled={loading} className="btn-3d"
            style={{width:"100%",padding:"15px 20px",background:loading?"rgba(30,40,60,0.8)":"linear-gradient(135deg,#700143 0%,#4D002E 100%)",border:"none",borderRadius:14,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,boxShadow:loading?"none":"0 4px 22px rgba(112,1,67,0.48),inset 0 1px 0 rgba(255,255,255,0.10)",transition:"background 0.2s ease"}}
            whileHover={loading?{}:{scale:1.02,boxShadow:"0 6px 30px rgba(112,1,67,0.6)"}}
            whileTap={loading?{}:{scale:0.97}}
          >
            <div style={{width:26,height:26,borderRadius:"50%",background:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#700143",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}>G</div>
            <span style={{fontSize:15,fontWeight:800,color:"#FFFFFF",letterSpacing:"0.02em"}}>{loading?"Signing in…":"Continue with Google"}</span>
            {!loading && <span style={{marginLeft:"auto",fontSize:16,opacity:0.5,color:"#fff"}}>→</span>}
          </motion.button>
          {error && <div className="animate-fade-in" style={{marginTop:14,fontSize:12,color:C.rd,fontWeight:700,textAlign:"center",background:C.rdBg,padding:"10px 14px",borderRadius:10,border:"1px solid rgba(220,38,38,0.22)"}}>{error}</div>}
          <div style={{marginTop:28,paddingTop:20,borderTop:"1px solid rgba(255,255,255,0.05)",textAlign:"center",fontSize:11,color:"#1A2840",fontWeight:600}}>Secured via Google OAuth 2.0</div>
        </motion.div>

        <div style={{textAlign:"center",marginTop:32,fontSize:11,color:"#1E2840",fontWeight:600}}>
          Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur
          <div style={{fontSize:10,marginTop:6,fontWeight:500,opacity:0.6}}>© 2026 Made by Banuja Disanayaka</div>
        </div>
      </div>
    </div>
  );
}

function InstallAppButton({ installPrompt, onInstallDone }) {
  const [showGuide, setShowGuide] = useState(false);
  const ua = navigator.userAgent;
  // iPad on iOS 13+ reports as Macintosh — detect via touch points
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  // Already installed — hide
  if (isStandalone) return null;
  // Desktop browser with no prompt — hide (they can use browser menu themselves)
  if (!installPrompt && !isIOS && !isAndroid) return null;

  async function handleClick() {
    if (installPrompt) {
      await installPrompt.prompt();
      onInstallDone?.();
    } else {
      setShowGuide(true);
    }
  }

  const iosSteps = [
    { icon:"1️⃣", title:"Tap the Share button", desc:'Tap the Share icon (📤) at the bottom of Safari — looks like a box with an arrow pointing up.' },
    { icon:"2️⃣", title:'Tap "Add to Home Screen"', desc:'Scroll down in the share sheet and tap "Add to Home Screen".' },
    { icon:"3️⃣", title:'Tap "Add" to confirm', desc:'The app icon will appear on your home screen.' },
  ];
  const androidSteps = [
    { icon:"1️⃣", title:"Tap the menu  ⋮", desc:'Tap the three-dot menu at the top-right of Chrome.' },
    { icon:"2️⃣", title:'Tap "Add to Home screen"', desc:'Scroll down and tap "Add to Home screen" in the menu.' },
    { icon:"3️⃣", title:'Tap "Add" to confirm', desc:'The app icon will appear on your home screen.' },
  ];
  const steps = isIOS ? iosSteps : androidSteps;
  const guideLabel = isIOS ? "iOS Guide" : "Android Guide";

  return (
    <>
      <button
        onClick={handleClick}
        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,width:"100%",padding:"13px 20px",background:"linear-gradient(135deg,rgba(14,165,233,0.10),rgba(14,165,233,0.05))",border:"1px solid rgba(14,165,233,0.22)",borderRadius:14,cursor:"pointer",fontFamily:"inherit",color:"#0EA5E9",fontSize:13,fontWeight:800,letterSpacing:"0.01em",transition:"all 0.2s",marginTop:16}}
        onMouseEnter={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(0,212,255,0.16),rgba(0,212,255,0.08))";e.currentTarget.style.borderColor="rgba(0,212,255,0.4)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(14,165,233,0.10),rgba(14,165,233,0.05))";e.currentTarget.style.borderColor="rgba(14,165,233,0.22)";}}
      >
        <span style={{fontSize:17}}>📲</span>
        Add to Home Screen
        {!installPrompt && <span style={{fontSize:10,fontWeight:600,color:"rgba(0,212,255,0.6)",marginLeft:2}}>({guideLabel})</span>}
      </button>

      {showGuide && (
        <div className="animate-fade-in" onClick={()=>setShowGuide(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div className="animate-fade-up modal-sheet" onClick={e=>e.stopPropagation()} style={{borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"28px 28px 40px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(0,212,255,0.35),transparent)",pointerEvents:"none"}}/>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.12)",borderRadius:4,margin:"0 auto 20px"}}/>
            <div style={{fontSize:19,fontWeight:900,color:"var(--text)",marginBottom:6}}>Add to Home Screen</div>
            <div style={{fontSize:13,color:"#4A6080",marginBottom:24,fontWeight:500}}>
              {isIOS ? "Follow these steps in Safari:" : "Follow these steps in Chrome:"}
            </div>
            {steps.map(step => (
              <div key={step.icon} style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:18}}>
                <span style={{fontSize:22,flexShrink:0,marginTop:1}}>{step.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:3}}>{step.title}</div>
                  <div style={{fontSize:12,color:"#4A6080",lineHeight:1.55,fontWeight:500}}>{step.desc}</div>
                </div>
              </div>
            ))}
            <button onClick={()=>setShowGuide(false)} style={{width:"100%",padding:"13px",marginTop:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",borderRadius:12,fontSize:13,fontWeight:800,color:"#8896B3",cursor:"pointer",fontFamily:"inherit"}}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

function RequestAccessScreen({ authUser, onSubmit, onSignOut, installPrompt, onInstallDone }) {
  const th = useTheme();
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [enteredName, setEnteredName] = useState(authUser?.displayName || "");
  const [enteredOutlet, setEnteredOutlet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleRole(k) {
    setSelectedRoles(prev => prev.includes(k) ? prev.filter(r => r !== k) : [...prev, k]);
  }

  const canSubmit = enteredName.trim() && enteredOutlet.trim() && selectedRoles.length > 0;

  async function handleRequest() {
    if (!canSubmit) return;
    setSubmitting(true);
    await onSubmit(selectedRoles, enteredName.trim(), enteredOutlet.trim());
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="animate-fade-in custom-scrollbar" style={{minHeight:"100vh",background:"var(--page-bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px"}}>
      <div style={{width:"100%",maxWidth:420}}>
        {/* User chip */}
        <div className="animate-fade-up sketch-card" style={{padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          {authUser.photoURL ? <img src={authUser.photoURL} alt="" style={{width:36,height:36,borderRadius:"50%",border:"2px solid var(--accent)",flexShrink:0}}/> : <div style={{width:36,height:36,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",flexShrink:0}}>{authUser.displayName?.[0]||"?"}</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.displayName||"User"}</div>
            <div style={{fontSize:10,color:"var(--text-sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.email}</div>
          </div>
          <button onClick={onSignOut} style={{background:th.closeBg,border:"1.5px solid var(--border)",color:"var(--text-sub)",padding:"6px 10px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"inherit",minHeight:36}}>Sign Out</button>
        </div>

        <div style={{marginBottom:20}}>
          <div style={{fontSize:24,fontWeight:900,color:"var(--accent)",letterSpacing:"-0.03em",lineHeight:1,marginBottom:4}}>Request Access</div>
          <div style={{fontSize:13,color:"var(--text-sub)",fontWeight:500}}>Fill in your details and select roles to request.</div>
        </div>

        {submitted ? (
          <div className="animate-fade-up sketch-card" style={{padding:"36px 28px",textAlign:"center"}}>
            <div style={{fontSize:44,marginBottom:14}}>✓</div>
            <div style={{fontSize:22,fontWeight:900,color:"var(--accent)",letterSpacing:"-0.02em",marginBottom:8}}>Request Sent!</div>
            <div style={{fontSize:13,color:"var(--text-sub)",lineHeight:1.6}}>Your request for <strong style={{color:"var(--text)"}}>{selectedRoles.map(r=>ROLES[r]?.label).join(", ")}</strong> has been submitted.</div>
          </div>
        ) : (
          <>
            {/* Name input */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-sub)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>Your Name</div>
              <input
                value={enteredName} onChange={e=>setEnteredName(e.target.value)}
                placeholder="e.g. Ahmad Razif"
                style={{width:"100%",padding:"12px 14px",borderRadius:"12px 11px 13px 12px",border:"1.5px solid var(--border)",background:"var(--input-bg)",color:"var(--text)",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
              />
            </div>
            {/* Outlet input */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-sub)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>Outlet / Location</div>
              <input
                value={enteredOutlet} onChange={e=>setEnteredOutlet(e.target.value)}
                placeholder="e.g. TTDI, Bangsar, Damansara"
                style={{width:"100%",padding:"12px 14px",borderRadius:"12px 11px 13px 12px",border:"1.5px solid var(--border)",background:"var(--input-bg)",color:"var(--text)",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
              />
            </div>

            {/* Role pills */}
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-sub)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Select Roles</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:24}}>
              {Object.entries(ROLES).map(([k, r]) => {
                const isSelected = selectedRoles.includes(k);
                return (
                  <button key={k} onClick={() => toggleRole(k)}
                    style={{
                      borderRadius:"100px 95px 100px 95px / 100px 100px 95px 100px",
                      padding:"10px 18px",
                      background:isSelected?"var(--accent)":"transparent",
                      border:`1.5px solid ${isSelected?"var(--accent)":"var(--border)"}`,
                      color:isSelected?"#fff":"var(--text)",
                      fontWeight:700,fontSize:13,cursor:"pointer",
                      fontFamily:"inherit",
                      minHeight:44,
                      transition:"all 0.15s ease",
                      letterSpacing:"0.01em",
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            <motion.button onClick={handleRequest} disabled={!canSubmit||submitting} whileTap={{scale:0.97}}
              style={{width:"100%",padding:"14px",background:canSubmit?"var(--accent)":"rgba(194,216,196,0.12)",border:"none",borderRadius:"255px 15px 225px 15px / 15px 225px 15px 255px",color:canSubmit?"#fff":"var(--text-sub)",fontSize:15,fontWeight:800,cursor:canSubmit&&!submitting?"pointer":"not-allowed",fontFamily:"inherit",letterSpacing:"0.01em",transition:"all 0.2s ease",opacity:submitting?0.7:1}}>
              {submitting ? "Sending…" : canSubmit ? `Request Access (${selectedRoles.length} role${selectedRoles.length>1?"s":""})` : "Fill all fields above"}
            </motion.button>
          </>
        )}

        <div style={{marginTop:16}}>
          <InstallAppButton installPrompt={installPrompt} onInstallDone={onInstallDone}/>
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"var(--text-sub)",fontWeight:500}}>Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur</div>
      </div>
    </div>
  );
}

function PendingScreen({ request, authUser, onSignOut, installPrompt, onInstallDone }) {
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
          {authUser.photoURL ? <img src={authUser.photoURL} alt="" style={{width:42,height:42,borderRadius:"50%",border:"2px solid rgba(112,1,67,0.4)",flexShrink:0}}/> : <div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#700143,#4D002E)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff",flexShrink:0}}>{authUser.displayName?.[0]||"?"}</div>}
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
          <div style={{fontSize:22,fontWeight:900,color:"var(--text)",letterSpacing:"-0.02em",marginBottom:12}}>Awaiting Approval</div>
          <div style={{fontSize:13,color:C.chM,fontWeight:500,lineHeight:1.65,marginBottom:28}}>
            Your request for <strong style={{color:C.am}}>{(request.requestedRoles||[request.requestedRole]).map(r=>ROLES[r]?.label||r).join(", ")}</strong> access has been submitted. The owner will review and approve your request.
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(232,146,10,0.10)",border:"1px solid rgba(232,146,10,0.25)",borderRadius:40,padding:"10px 18px"}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:C.am,display:"inline-block",animation:"statusPulse 2s infinite ease-in-out",flexShrink:0}}/>
            <span style={{fontSize:12,color:C.am,fontWeight:800,letterSpacing:"0.03em"}}>Pending review</span>
          </div>
        </div>

        <InstallAppButton installPrompt={installPrompt} onInstallDone={onInstallDone}/>
        <div style={{textAlign:"center",marginTop:24,fontSize:11,color:"#1E2840",fontWeight:600}}>Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur</div>
      </div>
    </div>
  );
}

function ControlPanel({ requests, authorizedUsers, onApprove, onReject, onRemoveUser, onBack, authUser, onSignOut, notify }) {
  const th=useTheme();
  const [tab, setTab] = useState("requests");
  const isMobile = useIsMobile();
  const pendingRequests = requests.filter(r => r.status === "pending");
  const [editingUser, setEditingUser] = useState(null);
  const [editRoles, setEditRoles] = useState([]);
  const [confirmRejectId, setConfirmRejectId] = useState(null);
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState(null);

  function startEdit(user) { setEditingUser(user.email); setEditRoles(user.roles || []); }
  function toggleEditRole(rk) { setEditRoles(prev => prev.includes(rk) ? prev.filter(r => r !== rk) : [...prev, rk]); }
  async function saveEditRoles() {
    try {
      await updateDoc(doc(db, "authorized_users", editingUser), { roles: editRoles });
      if (notify) notify("Roles updated for " + editingUser.split("@")[0], "success");
      setEditingUser(null);
    } catch(e) { if (notify) notify("Failed to update roles", "error"); }
  }

  return (
    <div className="animate-fade-in" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--page-bg)" }}>
      <div style={{ background:"var(--header-bg)", borderBottom:"1.5px solid var(--border)", padding:"14px 20px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"var(--card-bg)", border:"1.5px solid var(--border)", color:"var(--text)", padding:"8px 14px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit", minHeight:36 }}>← Back</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:700, color:"var(--text)" }}>Control Panel</div>
          <div style={{ fontSize:11, color:"var(--text-sub)" }}>{authUser.email}</div>
        </div>
        <button onClick={onSignOut} style={{ background:"none", border:"1.5px solid var(--border)", color:"var(--text-sub)", padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit", minHeight:36 }}>Sign Out</button>
      </div>

      {pendingRequests.length > 0 && (
        <div style={{ background:"rgba(232,146,10,0.12)", borderBottom:"1px solid rgba(232,146,10,0.25)", padding:"10px 20px", display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:"var(--text-xs,11px)", fontWeight:800, color:"var(--color-warning,#E8920A)" }}>
            ⚠ {pendingRequests.length} request{pendingRequests.length>1?"s":""} waiting for approval
          </span>
        </div>
      )}
      <div style={{ display:"flex", background:"var(--card-bg)", borderBottom:"1.5px solid var(--border)", flexShrink:0 }}>
        {[{ key:"requests", label:`Requests ${pendingRequests.length > 0 ? "("+pendingRequests.length+")" : ""}` }, { key:"users", label:`Users (${authorizedUsers.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:"14px 12px", background:"none", border:"none", borderBottom:"3px solid "+(tab===t.key?"var(--accent)":"transparent"), color:tab===t.key?"var(--accent)":"var(--text-sub)", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>{t.label}</button>
        ))}
      </div>

      <div className="custom-scrollbar" style={{ flex:1, overflowY:"auto", padding: isMobile ? 16 : 28 }}>
        {tab === "requests" && (
          <div>
            {pendingRequests.length === 0 ? (
              <div className="empty-state" style={{ paddingTop:60 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>✓</div>
                <div style={{ fontSize:"var(--text-lg,20px)", fontWeight:900, color:"var(--color-success,#16A34A)", marginBottom:6 }}>All caught up</div>
                <div style={{ fontSize:"var(--text-sm,13px)", color:"var(--text-sub)" }}>No pending access requests</div>
              </div>
            ) : pendingRequests.map((req, i) => (
              <div key={req.id} className="animate-fade-up sketch-card" style={{ animationDelay:`${i*0.05}s`, padding:"18px 20px", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  {req.photoURL ? <img src={req.photoURL} alt="" style={{ width:44, height:44, borderRadius:"50%", border:"2px solid var(--border)", flexShrink:0 }}/> : <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"var(--text)", flexShrink:0 }}>{req.name?.[0] || "?"}</div>}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}>{req.name}</div>
                    <div style={{ fontSize:11, color:"var(--text-sub)" }}>{req.email}</div>
                    {req.outlet && <div style={{ fontSize:11, color:"var(--text-sub)", marginTop:2 }}>📍 {req.outlet}</div>}
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:6 }}>{(req.requestedRoles || [req.requestedRole]).map(r => <span key={r} style={{ fontSize:11, fontWeight:700, color:"var(--accent)", background:th.olBg, border:"1px solid var(--accent)", borderRadius:20, padding:"2px 8px" }}>{ROLES[r]?.label || r}</span>)}</div>
                  </div>
                </div>
                {confirmRejectId === req.id ? (
                  <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(112,1,67,0.08)", border:"1px solid rgba(112,1,67,0.25)", borderRadius:10, padding:"10px 14px" }}>
                    <span style={{ flex:1, fontSize:12, color:"var(--text-sub)" }}>Reject {req.name}?</span>
                    <button onClick={() => { onReject(req); setConfirmRejectId(null); }} style={{ padding:"9px 14px", background:th.rdBg, border:"1.5px solid "+th.rd, borderRadius:8, color:th.rd, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", minHeight:40 }}>Confirm</button>
                    <button onClick={() => setConfirmRejectId(null)} style={{ padding:"9px 14px", background:"transparent", border:"1px solid var(--border-faint)", borderRadius:8, color:"var(--text-sub)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", minHeight:40 }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={() => onApprove(req)} style={{ flex:1, padding:"11px", background:"linear-gradient(135deg,#097353,#065A40)", border:"none", borderRadius:"100px 95px 100px 95px / 100px 100px 95px 100px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", minHeight:44 }}>✓ Approve</button>
                    <button onClick={() => setConfirmRejectId(req.id)} style={{ flex:1, padding:"11px", background:th.rdBg, border:"1.5px solid "+th.rd, borderRadius:"100px 95px 100px 95px / 100px 100px 95px 100px", color:th.rd, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", minHeight:44 }}>✕ Reject</button>
                  </div>
                )}
              </div>
            ))}

            {requests.filter(r => r.status !== "pending").length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:10, fontWeight:900, color:"var(--text-sub)", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:10 }}>Past Requests</div>
                {requests.filter(r => r.status !== "pending").map((req, i) => (
                  <div key={req.id} style={{ animationDelay:`${i*0.03}s`, background:th.subBg, borderRadius:10, padding:"12px 14px", border:"1px solid var(--border)", marginBottom:8, display:"flex", alignItems:"center", gap:10, opacity:0.75 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{req.name}</div>
                      <div style={{ fontSize:11, color:"var(--text-sub)" }}>{req.email} · {(req.requestedRoles || [req.requestedRole]).map(r => ROLES[r]?.label || r).join(", ")}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:800, padding:"3px 8px", borderRadius:20, background:req.status==="approved"?"rgba(9,115,83,0.2)":th.rdBg, color:req.status==="approved"?"#4ADE80":th.rd, border:"1px solid "+(req.status==="approved"?"rgba(9,115,83,0.35)":th.rd+"50") }}>{req.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div>
            {authorizedUsers.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text-sub)" }}>
                <div style={{ fontSize:16, fontWeight:700 }}>No authorized users yet</div>
              </div>
            ) : authorizedUsers.map((user, i) => (
              <div key={user.email} className="animate-fade-up sketch-card" style={{ animationDelay:`${i*0.05}s`, padding:"16px 18px", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: editingUser === user.email ? 12 : 0 }}>
                  {user.photoURL ? <img src={user.photoURL} alt="" style={{ width:40, height:40, borderRadius:"50%", border:"2px solid var(--border)", flexShrink:0 }}/> : <div style={{ width:40, height:40, borderRadius:"50%", background:"var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"var(--text)", flexShrink:0 }}>{user.name?.[0] || "?"}</div>}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"var(--text)" }}>{user.name}</div>
                    <div style={{ fontSize:11, color:"var(--text-sub)" }}>{user.email}</div>
                    {user.outlet && <div style={{ fontSize:11, color:"var(--text-sub)", marginTop:1 }}>📍 {user.outlet}</div>}
                    {user.approvedAt && <div style={{ fontSize:"var(--text-2xs,10px)", color:"var(--text-sub)", marginTop:2 }}>Since {new Date(user.approvedAt).toLocaleDateString("en-MY",{month:"short",year:"numeric"})}</div>}
                    {editingUser !== user.email && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6 }}>
                        {(user.roles || []).map(role => <span key={role} style={{ fontSize:11, fontWeight:700, color:"var(--accent)", background:th.olBg, border:"1px solid var(--accent)", borderRadius:20, padding:"2px 8px" }}>{ROLES[role]?.label || role}</span>)}
                      </div>
                    )}
                  </div>
                  {editingUser !== user.email && (
                    confirmRemoveEmail === user.email ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
                        <div style={{ fontSize:10, color:"var(--text-sub)", textAlign:"center", fontWeight:700 }}>Remove?</div>
                        <button onClick={() => { onRemoveUser(user.email); setConfirmRemoveEmail(null); }} style={{ background:th.rdBg, border:"1px solid "+th.rd, color:th.rd, padding:"6px 10px", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit", minHeight:34 }}>Yes</button>
                        <button onClick={() => setConfirmRemoveEmail(null)} style={{ background:"transparent", border:"1px solid var(--border-faint)", color:"var(--text-sub)", padding:"6px 10px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", minHeight:34 }}>No</button>
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                        <button onClick={() => startEdit(user)} style={{ background:th.chipBg, border:"1.5px solid var(--border)", color:"var(--text)", padding:"6px 10px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", minHeight:34 }}>✏ Edit</button>
                        <button onClick={() => setConfirmRemoveEmail(user.email)} style={{ background:th.rdBg, border:"1px solid "+th.rd, color:th.rd, padding:"6px 10px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", minHeight:34 }}>Remove</button>
                      </div>
                    )
                  )}
                </div>
                {/* Inline role editor */}
                {editingUser === user.email && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"var(--text-sub)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Edit Roles</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                      {Object.keys(ROLES).map(rk => {
                        const has = editRoles.includes(rk);
                        return (
                          <button key={rk} onClick={() => toggleEditRole(rk)}
                            style={{ borderRadius:"100px 95px 100px 95px / 100px 100px 95px 100px", padding:"8px 16px", fontSize:13,
                              background:has?"var(--accent)":"transparent",
                              border:`1.5px solid ${has?"var(--accent)":"var(--border)"}`,
                              color:has?"#fff":"var(--text)", fontWeight:700, cursor:"pointer",
                              fontFamily:"inherit", minHeight:40, transition:"all 0.15s" }}>
                            {ROLES[rk].label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={saveEditRoles} style={{ flex:1, padding:"10px", background:"var(--accent)", border:"none", borderRadius:"100px 95px 100px 95px / 100px 100px 95px 100px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", minHeight:44 }}>Save</button>
                      <button onClick={() => setEditingUser(null)} style={{ flex:1, padding:"10px", background:th.chipBg, border:"1.5px solid var(--border)", borderRadius:"100px 95px 100px 95px / 100px 100px 95px 100px", color:"var(--text-sub)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", minHeight:44 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoleSelectScreen({ availableRoles, onSelect, isOwner, onControlPanel, authUser, onSignOut, pendingCount, installPrompt, onInstallDone }) {
  const th = useTheme();
  const keys = availableRoles || Object.keys(ROLES);
  const [selected, setSelected] = useState(null);

  return (
    <div className="animate-fade-in custom-scrollbar" style={{minHeight:"100vh",background:"var(--page-bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",position:"relative"}}>
      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:2}}>

        {/* User chip */}
        {authUser && (
          <div className="animate-fade-up sketch-card" style={{padding:"13px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
            {authUser.photoURL ? <img src={authUser.photoURL} alt="" style={{width:36,height:36,borderRadius:"50%",border:"2px solid "+(isOwner?"var(--accent)":"var(--border)"),flexShrink:0}}/> : <div style={{width:36,height:36,borderRadius:"50%",background:isOwner?"var(--accent)":"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",flexShrink:0}}>{authUser.displayName?.[0]||"?"}</div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.displayName||"User"}</div>
              <div style={{fontSize:10,color:isOwner?"var(--accent)":"var(--text-sub)",fontWeight:isOwner?800:500,textTransform:"uppercase",letterSpacing:"0.06em"}}>{isOwner?"Owner · Full Access":"Authorized User"}</div>
            </div>
            {isOwner && (
              <button onClick={onControlPanel} style={{background:th.olBg,border:"1.5px solid var(--accent)",color:"var(--accent)",padding:"7px 12px",borderRadius:20,fontSize:11,fontWeight:800,cursor:"pointer",flexShrink:0,fontFamily:"inherit",position:"relative",transition:"all 0.2s",minHeight:36}}>
                Panel
                {pendingCount > 0 && <span style={{position:"absolute",top:-6,right:-6,background:"var(--accent)",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{pendingCount}</span>}
              </button>
            )}
            <button onClick={onSignOut} style={{background:th.closeBg,border:"1.5px solid var(--border)",color:"var(--text-sub)",padding:"6px 10px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"inherit",minHeight:36}}>Out</button>
          </div>
        )}

        {/* Heading */}
        <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} transition={{duration:0.5,ease:[0.16,1,0.3,1]}} style={{marginBottom:24}}>
          <div style={{borderLeft:"4px solid var(--gold,#C2D8C4)",paddingLeft:14}}>
            <div style={{fontSize:"var(--text-2xl,28px)",fontWeight:900,color:"var(--accent)",letterSpacing:"-0.04em",lineHeight:1,marginBottom:4}}>TFC Order Tracker</div>
            <div style={{fontSize:"var(--text-sm,13px)",color:"var(--text-sub)",fontWeight:500}}>Select your role to continue</div>
          </div>
        </motion.div>

        {/* Role pills */}
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginBottom:24}}>
          {keys.map((k, i) => {
            const r = ROLES[k]; if (!r) return null;
            const isActive = selected === k;
            return (
              <motion.button
                key={k}
                onClick={() => setSelected(k)}
                initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:i*0.07,ease:[0.16,1,0.3,1]}}
                whileTap={{scale:0.97}}
                style={{
                  borderRadius:"100px 95px 100px 95px / 100px 100px 95px 100px",
                  background:isActive?"var(--accent)":"transparent",
                  border:`1.5px solid ${isActive?"var(--accent)":"rgba(194,216,196,0.28)"}`,
                  color:isActive?"#fff":"var(--text)",
                  fontWeight:700,fontSize:13,cursor:"pointer",
                  boxShadow:isActive?"0 0 0 3px rgba(112,1,67,0.20), 2px 3px 0 rgba(0,0,0,0.20)":"1px 2px 0 rgba(0,0,0,0.08)",
                  fontFamily:"inherit",
                  letterSpacing:"0.02em",
                  transition:"all 0.15s ease",
                  minHeight:52,
                  padding:"12px 18px",
                  textAlign:"left",
                  width:"100%",
                }}
              >
                <div style={{fontSize:13,fontWeight:800,lineHeight:1.2}}>{r.icon} {r.label}</div>
                {r.desc && <div style={{fontSize:10,color:isActive?"rgba(255,255,255,0.75)":"var(--text-sub)",fontWeight:500,marginTop:3,lineHeight:1.3,letterSpacing:"0.01em"}}>{r.desc}</div>}
              </motion.button>
            );
          })}
        </div>

        {/* Enter button */}
        <motion.button
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          whileTap={{scale:0.97}}
          style={{
            width:"100%",padding:"14px 0",
            background:selected?"linear-gradient(135deg,#700143,#4D002E)":"var(--border)",
            border:"none",
            borderRadius:"255px 15px 225px 15px / 15px 225px 15px 255px",
            color:selected?"#fff":"var(--text-sub)",
            fontSize:16,fontWeight:700,cursor:selected?"pointer":"default",
            fontFamily:"inherit",
            boxShadow:selected?"0 4px 14px rgba(112,1,67,0.35), 2px 3px 0 rgba(0,0,0,0.18)":"none",
            transition:"all 0.2s ease",
            opacity:selected?1:0.5,
          }}
        >
          Enter →
        </motion.button>

        <div style={{marginTop:16}}>
          <InstallAppButton installPrompt={installPrompt} onInstallDone={onInstallDone}/>
        </div>

        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"var(--text-sub)",fontWeight:500}}>
          Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur
          <div style={{fontSize:10,marginTop:4,opacity:0.6}}>© 2026 Made by Banuja Disanayaka</div>
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

  const inputStyle = {padding:"10px 14px",border:"1px solid var(--border-faint)",borderRadius:10,fontSize:16,color:"var(--text)",outline:"none",background:"var(--card-bg)",width:"100%",boxSizing:"border-box",transition: "border-color 0.2s, box-shadow 0.2s"};

  return(
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20,fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif"}}>
      <datalist id="recipe-database">
        {RECIPE_DB.map(r => <option key={r.recipe_id} value={r.recipe_name} label={r.item_code ? `${r.recipe_name} · ${r.item_code}` : r.recipe_name} />)}
        {ITEMS_DB.filter(i => {const u=i.name.trim().toUpperCase(); return !RECIPE_DB.some(r=>r.recipe_name&&r.recipe_name.toUpperCase().trim()===u);}).map(i => <option key={i.item_code+"_"+i.name} value={i.name} label={`${i.name} · ${i.item_code}`} />)}
      </datalist>
      <div className="animate-fade-up modal-sheet" style={{borderRadius:isMobile?"24px 24px 0 0":20,width:"100%",maxWidth:720,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"22px 30px",borderBottom:`1px solid ${th.divider}`,flexShrink:0,position:"relative"}}>
          <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(112,1,67,0.28),transparent)",pointerEvents:"none"}}/>
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
            <div style={{display:"flex", background:"var(--sub-bg)", borderRadius:10, border:"1px solid "+C.bdrL, padding:4}}><button onClick={() => setInputMode("manual")} style={{padding:"8px 16px", border:"none", background: inputMode==="manual"?C.w:"transparent", borderRadius:8, fontSize:12, fontWeight:700, color:inputMode==="manual"?C.ch:C.chL, cursor:"pointer", boxShadow:inputMode==="manual"?C.sh:"none"}}>Manual Addition</button><button onClick={() => setInputMode("bulk")} style={{padding:"8px 16px", border:"none", background: inputMode==="bulk"?C.w:"transparent", borderRadius:8, fontSize:12, fontWeight:700, color:inputMode==="bulk"?C.olDk:C.chL, cursor:"pointer", boxShadow:inputMode==="bulk"?C.sh:"none"}}>Paste WhatsApp List</button></div>
          </div>
          {inputMode === "manual" && (<form className="animate-fade-in" onSubmit={handleAddItem} style={{background:"var(--sub-bg)", padding:20, borderRadius:16, border:"1px solid "+C.bdrL, marginBottom:28}}><div style={{display:"flex", flexDirection: isMobile ? "column" : "row", gap: 12, alignItems:"flex-start"}}><div style={{flex:1, width:"100%"}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>Product (Type to search)</div><input list="recipe-database" value={prod} onChange={e => {setProd(e.target.value); setErr("");}} placeholder="e.g. Madras Spiced" style={{padding:"12px 16px",border:"2px solid "+C.w,borderRadius:10,fontSize:14,color:C.ch,outline:"none",background:C.w,width:"100%",boxSizing:"border-box", boxShadow:C.sh}}/></div><div style={{display:"flex", gap:12, width: isMobile ? "100%" : "auto"}}><div style={{width: 80}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>Qty</div><input value={qty} onChange={e => setQty(e.target.value)} placeholder="—" style={{padding:"12px 8px",border:"2px solid "+C.w,borderRadius:10,fontSize:14,color:C.ch,outline:"none",background:C.w,width:"100%",boxSizing:"border-box",textAlign:"center", boxShadow:C.sh}}/></div><div style={{width: 90}}><div style={{fontSize:11, color:C.chM, fontWeight:800, marginBottom:6, textTransform:"uppercase"}}>Unit</div><select value={unit} onChange={e => setUnit(e.target.value)} style={{padding:"12px 10px",border:"2px solid "+C.w,borderRadius:10,fontSize:14,color:C.ch,outline:"none",background:C.w,width:"100%",cursor:"pointer", height:46, boxShadow:C.sh}}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div></div></div><button type="submit" className="hover-lift" style={{marginTop:16,width:"100%",padding:"14px",background:C.ch,color:C.w,border:"none",borderRadius:10,fontWeight:800,cursor:"pointer", fontSize:14}}>+ Add Item to List</button></form>)}
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
            <div style={{background:stagedItems.length>0?"rgba(112,1,67,0.15)":th.chipBg,border:"1px solid "+(stagedItems.length>0?"rgba(112,1,67,0.35)":th.divider),color:stagedItems.length>0?C.ol:C.chL,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:800,transition:"all 0.3s"}}>
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

  const inputStyle = {padding:"10px 14px",border:"1px solid var(--border-faint)",borderRadius:10,fontSize:16,color:"var(--text)",outline:"none",background:"var(--card-bg)",width:"100%",boxSizing:"border-box",transition: "border-color 0.2s, box-shadow 0.2s"};

  return(
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20,fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif"}}>
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
          <form onSubmit={handleAddNew} style={{display:"flex", flexDirection:isMobile?"column":"row", gap:10, background:"var(--sub-bg)", padding:"16px", borderRadius:14, border:"1px solid "+C.bdrL, marginBottom:28}}><input list="recipe-database" value={np} onChange={e=>setNp(e.target.value)} placeholder="Product Name" style={{flex:2, padding:"10px 14px", border:"1px solid "+C.bdr, borderRadius:8, outline:"none", fontSize:14, fontWeight:600}} /><div style={{display:"flex", gap:10, flex:1}}><input value={nq} onChange={e=>setNq(e.target.value)} placeholder="Qty" style={{width:"60px", padding:"10px 10px", border:"1px solid "+C.bdr, borderRadius:8, outline:"none", fontSize:14, textAlign:"center"}} /><select value={nu} onChange={e=>setNu(e.target.value)} style={{width:"80px", padding:"10px", border:"1px solid "+C.bdr, borderRadius:8, outline:"none", fontSize:14, cursor:"pointer"}}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div><Btn type="submit" variant="dark" full={isMobile}>+ Add</Btn></form>
          
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
    <motion.div
      onClick={onClick}
      className={`hover-lift ${isComplete&&!active?'celebration-card':''} ${active?(order.restaurant==="Vins"?"order-card-active-vins":"order-card-active-manja"):""}`}
      style={{
        padding:"14px 16px",borderRadius:16,marginBottom:8,cursor:"pointer",
        background:active?(th.isDark?`linear-gradient(160deg,#111E36,#0B1228)`:`linear-gradient(160deg,#EFF4FF,#E8F0FF)`):C.off,
        border:`1.5px solid ${active?rc+"60":C.bdrL}`,
        borderLeft:`4px solid ${active?rc:C.bdrL}`,
        transition:"border 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s cubic-bezier(0.16,1,0.3,1)"
      }}
      initial={{opacity:0,y:16}}
      animate={{opacity:1,y:0}}
      transition={{duration:0.4,ease:[0.16,1,0.3,1],delay:Math.min((index||0)*0.05,0.4)}}
      whileHover={{y:-2}}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:active?10:8,position:"relative"}}>
        <div style={{fontWeight:800,color:active?C.ch:C.chM,fontSize:active?15:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.02em",transition:"font-size 0.2s ease"}}>
          {order.poName||order.restaurant+" Order"}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8}}>
          {hasIssue&&<span style={{width:7,height:7,borderRadius:"50%",background:"#700143",animation:"pulseSoft 2s infinite",display:"inline-block"}}/>}
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
        {s.packed>0&&<span style={{fontSize:9,color:C.ol,background:C.olBg,border:"1px solid rgba(112,1,67,0.2)",borderRadius:20,padding:"2px 7px",fontWeight:700}}>{s.packed} packed</span>}
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
    </motion.div>
  );
}

function PackingRow({item, orderId, orders, onUpdate, notify}){
  const th=useTheme();
  const [showEdit, setShowEdit] = useState(false);
  const [qty, setQty] = useState(item.packedQty || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showShortModal, setShowShortModal] = useState(false);
  const [shortQty, setShortQty] = useState("");
  const [shortNote, setShortNote] = useState("");

  // Bug fix: sync local edit state when Firestore pushes an update from another device,
  // but only when the edit panel is closed so we don't clobber in-progress edits.
  useEffect(() => {
    if (!showEdit) {
      setQty(item.packedQty || "");
      setNotes(item.notes || "");
    }
  }, [item.packedQty, item.notes, item.status]); // eslint-disable-line

  // Bug fix: close edit panel if item is externally moved to delivered
  useEffect(() => {
    if (item.status === 'delivered') setShowEdit(false);
  }, [item.status]);

  function commit(status, extra={}){
    let dQty=qty;
    if(status==='packed'&&!qty&&item.qty){dQty=item.qty;setQty(item.qty);}
    onUpdate(orderId,item.id,{status,packedQty:dQty,notes,updatedAt:Date.now(),...extra});
    setShowEdit(false);
  }
  function handleSendToProduction(){ setShowMergeModal(true); }
  function handleShort(){
    // Bug fix: pre-fill from committed item values, not the (possibly unsaved) edit-panel state
    setShortQty(item.packedQty || "");
    setShortNote(item.notes || "");
    setShowShortModal(true);
  }
  function confirmShort(){
    const sq=parseFloat(shortQty);
    const rq=parseFloat(item.qty);
    if(!shortQty||isNaN(sq)||sq<=0){notify("Enter the quantity you're sending — must be more than zero.","error");return;}
    // Bug fix: guard against NaN comparison when item.qty is missing
    if(!isNaN(rq)&&sq>=rq){notify("Sent qty ≥ requested — mark as Packed instead?","error");return;}
    onUpdate(orderId,item.id,{status:'short',packedQty:shortQty,notes:shortNote,updatedAt:Date.now()});
    // Bug fix: clear modal state so re-opening starts clean
    setShortQty(""); setShortNote("");
    setShowShortModal(false);
  }
  const getActiveBatches=()=>{
    const b={};
    (orders||[]).forEach(o=>o.items&&o.items.forEach(it=>{if(it.status==="production"){const bId=it.batchId||it.id;if(!b[bId])b[bId]={batchId:bId,product:it.product,items:[]};b[bId].items.push(it);}}));
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
        <div className="animate-fade-in" onClick={()=>setShowShortModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
          <div className="animate-fade-up modal-sheet" onClick={e=>e.stopPropagation()} style={{borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"28px 28px 32px",display:"flex",flexDirection:"column",gap:16,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:"linear-gradient(90deg,transparent,rgba(232,146,10,0.45),transparent)",pointerEvents:"none"}}/>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.12)",borderRadius:4,margin:"0 auto -4px"}}/>
            <div style={{fontSize:19,fontWeight:900,color:C.ch,letterSpacing:"-0.02em"}}>Short Shipment</div>
            <div style={{background:th.cardBg,padding:"14px 16px",borderRadius:12,border:`1px solid rgba(232,146,10,0.25)`}}>
              <div style={{fontSize:10,fontWeight:800,color:C.chL,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>ITEM</div>
              <div style={{fontWeight:900,color:C.ch,fontSize:15,marginBottom:4}}>{item.product}</div>
              <div style={{fontSize:12,color:"#E8920A",fontFamily:"'JetBrains Mono',monospace",fontWeight:800}}>Requested: {item.qty} {item.unit||""}</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:C.chL,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>How much are you actually sending?</div>
              <input
                autoFocus
                value={shortQty}
                onChange={e=>setShortQty(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")confirmShort();if(e.key==="Escape")setShowShortModal(false);}}
                placeholder={`Sent qty (max ${item.qty||"?"} ${item.unit||""})`}
                type="number"
                min="0.001"
                style={{width:"100%",padding:"13px 16px",border:"1.5px solid rgba(232,146,10,0.35)",borderRadius:10,fontSize:15,fontWeight:800,color:C.ch,outline:"none",fontFamily:"'JetBrains Mono',monospace",boxSizing:"border-box"}}
              />
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:C.chL,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Reason / Note <span style={{fontWeight:500,textTransform:"none",letterSpacing:0}}>(optional)</span></div>
              <input
                value={shortNote}
                onChange={e=>setShortNote(e.target.value)}
                onKeyDown={e=>{if(e.key==="Escape")setShowShortModal(false);}}
                placeholder="e.g. ran out of stock at 2pm"
                style={{width:"100%",padding:"11px 14px",background:th.panelBg,border:`1px solid ${th.divider}`,borderRadius:10,fontSize:13,fontWeight:500,color:C.ch,outline:"none",boxSizing:"border-box"}}
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
              <div style={{color:C.ch,fontSize:15,fontWeight:900,lineHeight:1.25,marginBottom:5,letterSpacing:"-0.02em"}}>{item.product}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:item.status==='short'?"#E8920A":"#3A5070",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>
                  {/* Bug fix: added ||"" guard on item.unit to prevent "undefined" */}
                  {item.status==='short'?`Sent ${item.packedQty||0} / Req ${item.qty} ${item.unit||""}`:`${item.qty} ${item.unit||""}`}
                </span>
                {itemCode&&<span style={{fontSize:10,fontWeight:900,color:"#700143",background:"rgba(112,1,67,0.12)",border:"1px solid rgba(112,1,67,0.28)",borderRadius:5,padding:"2px 7px",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",boxShadow:"0 0 6px rgba(112,1,67,0.18)"}}># {itemCode}</span>}
              </div>
            </div>
            <span className={`badge-glow-${item.status}`} style={{fontSize:10,fontWeight:800,padding:"5px 11px",borderRadius:20,color:cur.c,background:cur.c+"18",border:"1px solid "+cur.c+"35",whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.04em"}}>{cur.label}</span>
          </div>

          {/* ── Inline edit form ── */}
          {showEdit&&item.status!=='delivered'&&(
            <div className="animate-fade-in" style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",background:th.panelBg,padding:"12px",borderRadius:10,border:`1px solid ${th.divider}`}}>
              <input value={qty} onChange={e=>setQty(e.target.value)} placeholder={`Qty (req: ${item.qty||"?"})`} style={{width:110,padding:"8px 10px",border:"1px solid #1E2A44",borderRadius:7,fontSize:12,outline:"none",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,flexShrink:0}}/>
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
            /* pending or prod_done */
            <div>
              <button
                className={`pk-pack-btn${item.status==='prod_done'?" pk-ready-btn":""}`}
                onClick={()=>commit('packed')}
              >
                {item.status==='prod_done'?"✓ Pack Now — Ready!":"✓ Mark as Packed"}
              </button>
              <div style={{fontSize:9,color:C.chXL,textAlign:"center",marginTop:6,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700}}>or choose below</div>
              <div style={{display:"flex",gap:6,marginTop:6}}>
                {item.status!=='prod_done'&&<button onClick={handleSendToProduction} className="pk-chip pk-chip-prod">→ Prod</button>}
                {/* Bug fix: prod_done items can now be reset to pending if marked done by mistake */}
                {item.status==='prod_done'&&<button onClick={()=>commit('pending')} className="pk-chip pk-chip-reset">↩ Reset</button>}
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
  if (!order?.items) return encodeURIComponent("No order data.");
  let msg = `📋 *${order.poName || 'Purchase Order'}*\nRestaurant: ${order.restaurant}\n`;
  if(order.orderDate) msg += `PO received on : ${order.orderDate}\n`;
  // Bug fix: prod_done = "Ready to Pack" (not yet shipped) — removed from sending filter
  const sending = order.items.filter(i => i.status === 'packed' || i.status === 'delivered');
  // Bug fix: prod_done items shown under production ("ready, packing soon")
  const prod = order.items.filter(i => i.status === 'production' || i.status === 'prod_done');
  const issues = order.items.filter(i => i.status === 'short' || i.status === 'oos');

  // Bug fix: was running both the "none" message AND the forEach — now properly exclusive
  msg += `\n✅ Sending / Delivered:\n`;
  if(sending.length === 0) { msg += `- None yet\n`; } else { sending.forEach(i => { msg += `- ${i.product} : ${i.packedQty || i.qty || '-'} ${i.unit||""}\n`; }); }
  msg += `\n🍳 In production:\n`;
  if(prod.length === 0) { msg += `- None currently\n`; } else { prod.forEach(i => { msg += `- ${i.product} : ${i.qty || '-'} ${i.unit||""}${i.status==='prod_done'?' ✓ ready':''}\n`; }); }
  msg += `\n⚠️ ISSUES:\n`;
  if(issues.length === 0) { msg += `- No issues reported\n`; }
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
  // Bug fix: allDone only fired at 100% so orders with short/oos items never showed celebration.
  // Now "allResolved" = nothing left pending/cooking — short and oos items count as resolved.
  const allDone = pct===100;
  const hasIssues = s.short > 0 || s.oos > 0;
  const allResolved = s.total > 0 && s.pending === 0 && s.prod === 0 && s.prod_done === 0;

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

        {/* All-done / all-resolved celebration */}
        {allResolved&&(
          <div className="animate-fade-up" style={{marginTop:12,padding:"12px 16px",background:hasIssues?"linear-gradient(135deg,rgba(232,146,10,0.18),rgba(232,146,10,0.08))":"linear-gradient(135deg,rgba(9,115,83,0.25),rgba(22,163,74,0.15))",borderRadius:10,border:hasIssues?"1px solid rgba(232,146,10,0.35)":"1px solid rgba(74,222,128,0.3)",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{hasIssues?"⚠️":"🎉"}</span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:hasIssues?"#E8920A":"#4ADE80"}}>{hasIssues?`Dispatched with ${s.short+s.oos} issue${s.short+s.oos>1?"s":""}`:allDone?"All items packed — ready to dispatch!":"Ready to dispatch"}</div>
              {hasIssues&&<div style={{fontSize:11,color:C.chL,marginTop:2,fontWeight:500}}>{s.short>0?`${s.short} short`+( s.oos>0?`, ${s.oos} OOS`:""):""}{s.short===0&&s.oos>0?`${s.oos} out of stock`:""} — send WhatsApp update</div>}
            </div>
          </div>
        )}
      </div>

      {order.items.map((item)=><PackingRow key={item.id} item={item} orderId={order.id} orders={orders} onUpdate={onUpdate} notify={notify}/>)}
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
        <div className="animate-fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
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
        <div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${pct===100?"rgba(74,222,128,0.3)":"rgba(112,1,67,0.22)"},transparent)`,pointerEvents:"none"}}/>
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
        <div className="bento-hero glass-card animate-fade-up" style={{gridRow:"span 2",padding:"24px 22px",display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:148,borderTop:"3px solid var(--color-info,#0EA5E9)"}}>
          <div style={{fontSize:"var(--text-xs,11px)",fontWeight:900,textTransform:"uppercase",letterSpacing:"var(--ls-label,0.12em)",color:"var(--color-info,#0EA5E9)",opacity:0.9}}>Fulfilled</div>
          <div>
            <div className="gradient-text-cyan count-pop" style={{fontSize:54,fontWeight:900,letterSpacing:"-0.05em",lineHeight:1}}>{totals.packed+totals.delivered}</div>
            <div style={{fontSize:11,color:C.chL,marginTop:6,fontWeight:600}}>of <strong style={{color:C.chM}}>{totals.total}</strong> total items</div>
          </div>
          <div>
            <div style={{height:4,background:th.trackBg,borderRadius:99,overflow:"hidden",marginBottom:5}}>
              <div style={{height:4,width:totals.total?((totals.packed+totals.delivered)/totals.total*100)+"%":"0%",background:"linear-gradient(90deg,#0369A1,#0EA5E9)",borderRadius:99,transition:"width 1.2s cubic-bezier(0.16,1,0.3,1)",boxShadow:"0 0 10px rgba(14,165,233,0.35)"}}/>
            </div>
            <div style={{fontSize:9,color:C.chL,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.10em"}}>
              {totals.total?Math.round(((totals.packed+totals.delivered)/totals.total)*100):0}% complete
            </div>
          </div>
        </div>

        {/* Issues */}
        {(()=>{const hasIssues=(totals.short+totals.oos)>0; return(
          <div className="bento-hero animate-fade-up" style={{animationDelay:"0.05s",padding:"18px 16px",borderRadius:16,
            background:"var(--card-bg)",
            border:"1px solid var(--border-faint)",
            borderTop:`3px solid ${hasIssues?"var(--color-danger,#C1305A)":"var(--color-info,#0EA5E9)"}`,
            boxShadow:"var(--card-shadow)"}}>
            <div style={{fontSize:"var(--text-xs,11px)",fontWeight:900,textTransform:"uppercase",letterSpacing:"var(--ls-label,0.12em)",color:hasIssues?C.rd:C.chL,marginBottom:8,opacity:0.85}}>Issues</div>
            <div style={{fontSize:38,fontWeight:900,color:hasIssues?C.rd:C.chL,letterSpacing:"-0.04em",lineHeight:1}}>{totals.short+totals.oos}</div>
            {hasIssues&&<div style={{fontSize:9,color:C.rd,marginTop:7,fontWeight:800,display:"flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:C.rd,animation:"pulseSoft 1.5s infinite",display:"inline-block"}}/> Needs attention</div>}
            {!hasIssues&&<div style={{fontSize:9,color:C.chL,marginTop:7,fontWeight:600}}>All clear ✓</div>}
          </div>
        );})()}

        {/* Total Items */}
        <div className="bento-hero animate-fade-up" style={{animationDelay:"0.08s",padding:"18px 16px",borderRadius:16,background:"var(--card-bg)",border:"1px solid var(--border-faint)",borderTop:"3px solid var(--gold,#C2D8C4)",boxShadow:"var(--card-shadow)"}}>
          <div style={{fontSize:"var(--text-xs,11px)",fontWeight:900,textTransform:"uppercase",letterSpacing:"var(--ls-label,0.12em)",color:C.chL,marginBottom:8,opacity:0.85}}>Total Items</div>
          <div style={{fontSize:38,fontWeight:900,color:C.chM,letterSpacing:"-0.04em",lineHeight:1}}>{totals.total}</div>
          <div style={{fontSize:9,color:C.chXL,marginTop:7,fontWeight:600}}>across all orders</div>
        </div>

        {/* In Production — spans 2 cols */}
        <div className="bento-hero animate-fade-up" style={{animationDelay:"0.12s",gridColumn:"span 2",padding:"18px 20px",borderRadius:16,
          background:"var(--card-bg)",
          border:"1px solid var(--border-faint)",
          borderTop:"3px solid var(--color-warning,#E8920A)",
          boxShadow:"var(--card-shadow)",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:"var(--text-xs,11px)",fontWeight:900,textTransform:"uppercase",letterSpacing:"var(--ls-label,0.12em)",color:C.amDk,marginBottom:8,opacity:0.9}}>In Production</div>
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
  const [selectedDate, setSelectedDate] = useState(() => getLocalYMD());
  const [confirmDeleteDpId, setConfirmDeleteDpId] = useState(null);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);

  // Auto-select today when week changes
  React.useEffect(() => {
    const today = getLocalYMD();
    const todayInWeek = weekDays.find(d => d.date === today);
    setSelectedDate(todayInWeek ? today : weekDays[0]?.date || today);
  }, [selectedWeek]);

  // Always read displayDay fresh from weekDays props (so snapshot updates propagate)
  const displayDay = weekDays.find(d => d.date === selectedDate) || weekDays[0];
  const isDayActive = displayDay?.dp?.status === "active";
  const isTodaySelected = displayDay?.date === getLocalYMD();
  const doneCnt = displayDay?.dp?.items?.filter(i => i.status === "prod_done").length ?? 0;
  const totalCnt = displayDay?.dp?.items?.length ?? 0;

  return (
    <div className="animate-fade-in">
      {editingDay && (
        <DailyProductionModal
          dayInfo={editingDay}
          onSave={(saveKey, items, notes) => {
            if (editingDay.dp) onUpdateDP(saveKey, items, notes, selectedWeek);
            else onCreateDP(saveKey, items, notes);
            setSelectedDate(editingDay.date);
          }}
          onClose={() => setEditingDay(null)}
        />
      )}

      {/* Week navigation */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button onClick={() => onShiftWeek(-1)} style={{padding:"7px 13px",background:C.off,border:"1px solid "+C.bdrL,borderRadius:8,fontSize:12,color:C.chL,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>◀</button>
        <div style={{fontSize:11,fontWeight:900,color:C.chL,textTransform:"uppercase",letterSpacing:"0.08em",textAlign:"center"}}>
          {new Date(weekDays[0]?.date+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – {new Date(weekDays[6]?.date+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
        </div>
        <button onClick={() => onShiftWeek(1)} style={{padding:"7px 13px",background:C.olBg,border:"1px solid "+C.olBgD,borderRadius:8,fontSize:12,color:C.ol,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>▶</button>
      </div>

      {/* 7-day mini calendar strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16,padding:"10px",background:th.subBg,borderRadius:14,border:"1px solid "+th.divider}}>
        {weekDays.map(day => {
          const isToday = day.date === getLocalYMD();
          const isSelected = selectedDate === day.date;
          const hasPlan = !!day.dp;
          const isLive = day.dp?.status === "active";
          const dDone = day.dp?.items?.filter(i=>i.status==="prod_done").length ?? 0;
          const dTotal = day.dp?.items?.length ?? 0;
          const allDone = hasPlan && dTotal > 0 && dDone === dTotal;
          let dotColor = hasPlan ? (allDone ? "#4ADE80" : isLive ? C.ol : C.am) : "transparent";
          return (
            <button key={day.date} onClick={() => setSelectedDate(day.date)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 2px",borderRadius:10,border:isSelected?`2px solid ${C.ol}`:isToday?`1.5px solid rgba(112,1,67,0.30)`:"1.5px solid transparent",background:isSelected?C.olBg:isToday?"rgba(112,1,67,0.04)":"transparent",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              <span style={{fontSize:9,fontWeight:900,color:isToday?C.ol:C.chL,textTransform:"uppercase",letterSpacing:"0.04em"}}>{day.dayOfWeek.slice(0,3)}</span>
              <span style={{fontSize:15,fontWeight:isToday?900:700,color:isSelected?C.ol:isToday?C.ch:C.chM,lineHeight:1}}>{new Date(day.date+"T00:00:00").getDate()}</span>
              <span style={{width:6,height:6,borderRadius:"50%",background:dotColor,opacity:hasPlan?1:0.3,border:hasPlan&&!allDone?"1px solid "+dotColor:"none"}}/>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {displayDay && (
        <div className="animate-fade-in" key={displayDay.date}>
          {!displayDay.dp ? (
            <div style={{background:th.subBg,border:"2px dashed rgba(194,216,196,0.18)",borderRadius:16,padding:"28px 20px",textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:6}}>📋</div>
              <div style={{fontSize:14,fontWeight:900,color:C.ch,marginBottom:4}}>{displayDay.dayOfWeek}</div>
              <div style={{fontSize:11,color:C.chL,marginBottom:18}}>{displayDay.displayDate} · No production planned</div>
              <button onClick={()=>setEditingDay(displayDay)} style={{padding:"11px 28px",background:`linear-gradient(135deg,${C.ol},${C.olDk})`,border:"none",borderRadius:12,fontSize:13,fontWeight:900,color:"#fff",cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 16px rgba(112,1,67,0.35)`}}>+ Create Plan</button>
            </div>
          ) : (
            <div style={{background:"var(--card-bg)",border:`1px solid ${isDayActive?"rgba(112,1,67,0.28)":th.divider}`,borderRadius:16,overflow:"hidden",boxShadow:isDayActive?"0 0 0 1px rgba(112,1,67,0.10)":"none"}}>
              {/* Day header */}
              <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.divider}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:isTodaySelected?C.ol:C.ch,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{displayDay.dayOfWeek} · {displayDay.displayDate}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:9,fontWeight:900,padding:"2px 7px",borderRadius:20,background:isDayActive?"rgba(22,163,74,0.12)":"rgba(136,150,179,0.1)",color:isDayActive?"#4ADE80":"#8896B3",border:"1px solid "+(isDayActive?"rgba(22,163,74,0.3)":"rgba(136,150,179,0.2)")}}>{isDayActive?"● LIVE":"○ DRAFT"}</span>
                    {isTodaySelected&&<span style={{fontSize:9,background:C.olBg,color:C.ol,border:"1px solid "+C.olBgD,borderRadius:20,padding:"2px 7px",fontWeight:900}}>TODAY</span>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:24,fontWeight:900,lineHeight:1,color:doneCnt===totalCnt&&totalCnt>0?"#4ADE80":C.ch}}>{doneCnt}/{totalCnt}</div>
                  <div style={{fontSize:9,color:C.chL,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Done</div>
                </div>
              </div>
              {/* Progress bar */}
              {totalCnt > 0 && <div style={{height:3,background:th.trackBg}}><div style={{height:"100%",width:`${(doneCnt/totalCnt)*100}%`,background:doneCnt===totalCnt?"#4ADE80":C.ol,transition:"width 0.5s ease",borderRadius:2}}/></div>}

              {/* Items */}
              <div style={{padding:"10px 16px"}}>
                {displayDay.dp.items.map((item,idx) => {
                  const done = item.status === "prod_done";
                  return (
                    <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:idx<displayDay.dp.items.length-1?`1px solid ${th.divider}`:"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                        <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:done?"#4ADE80":isDayActive?C.ol:C.am,boxShadow:done?"0 0 6px rgba(74,222,128,0.5)":isDayActive?`0 0 6px rgba(112,1,67,0.3)`:"none"}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:800,color:done?C.chL:C.ch,textDecoration:done?"line-through":"none",opacity:done?0.65:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.product}</div>
                          <div style={{display:"flex",gap:4,marginTop:2,flexWrap:"wrap"}}>
                            {item.isExtra&&<span style={{fontSize:9,background:"rgba(184,111,6,0.15)",color:C.am,fontWeight:900,padding:"1px 5px",borderRadius:4}}>+EXTRA</span>}
                            {item.recipeName&&<span style={{fontSize:9,color:C.ol,fontWeight:700}}>📖 recipe</span>}
                            {item.notes&&<span style={{fontSize:9,color:C.chL,fontStyle:"italic"}}>📝 {item.notes}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,marginLeft:10,fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700}}>
                        {done
                          ? <span style={{color:"#4ADE80"}}>{item.actualKgQty??item.kgQty}kg ✓</span>
                          : <span style={{color:C.am}}>{item.kgQty}kg{item.packetQty>0?` · ${item.packetQty}p`:""}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              {confirmDeleteDpId === displayDay.dp.id ? (
                <div style={{margin:"0 16px 16px",display:"flex",alignItems:"center",gap:8,background:"rgba(112,1,67,0.07)",border:"1px solid rgba(112,1,67,0.2)",borderRadius:8,padding:"10px 12px"}}>
                  <span style={{flex:1,fontSize:11,color:"var(--text-sub)",fontWeight:700}}>Delete {displayDay.dayOfWeek}'s plan?</span>
                  <button onClick={()=>{onDeleteDP(displayDay.dp.id);setConfirmDeleteDpId(null);}} style={{padding:"7px 12px",background:"rgba(220,38,38,0.12)",border:"1px solid rgba(220,38,38,0.35)",borderRadius:7,fontSize:11,fontWeight:800,color:C.rd,cursor:"pointer",fontFamily:"inherit",minHeight:36}}>Delete</button>
                  <button onClick={()=>setConfirmDeleteDpId(null)} style={{padding:"7px 12px",background:"transparent",border:"1px solid var(--border-faint)",borderRadius:7,fontSize:11,fontWeight:700,color:"var(--text-sub)",cursor:"pointer",fontFamily:"inherit",minHeight:36}}>Cancel</button>
                </div>
              ) : (
                <div style={{padding:"10px 16px 16px",display:"flex",gap:8}}>
                  <button onClick={()=>setEditingDay(displayDay)} style={{flex:1,padding:"9px",background:"rgba(232,146,10,0.08)",border:"1px solid rgba(232,146,10,0.2)",borderRadius:8,fontSize:11,fontWeight:800,color:C.amDk,cursor:"pointer",fontFamily:"inherit"}}>✎ Edit Plan</button>
                  <button onClick={()=>setConfirmDeleteDpId(displayDay.dp.id)} style={{flex:1,padding:"9px",background:"rgba(220,38,38,0.07)",border:"1px solid rgba(220,38,38,0.18)",borderRadius:8,fontSize:11,fontWeight:800,color:C.rd,cursor:"pointer",fontFamily:"inherit"}}>🗑 Remove</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {weekDPs.length > 0 && (
        <div style={{display:"flex",gap:10,marginTop:16,paddingTop:16,borderTop:"1px solid "+C.bdrL}}>
          <div style={{flex:1,padding:12,background:C.off,border:"1px solid "+C.bdrL,borderRadius:9,fontSize:12,fontWeight:800,color:hasDrafts?C.chL:"#097353",textAlign:"center"}}>
            {hasDrafts ? "⚠ Unpublished drafts" : "✓ All plans live"}
          </div>
          {hasDrafts && (
            <button onClick={() => setShowActivateConfirm(true)} style={{flex:2,padding:12,background:`linear-gradient(135deg,${C.ol},${C.olDk})`,border:"none",borderRadius:9,fontSize:12,fontWeight:900,color:"#fff",cursor:"pointer",boxShadow:"0 4px 16px rgba(112,1,67,.4)",fontFamily:"inherit"}}>⚡ Activate → Send to Kitchen</button>
          )}
        </div>
      )}

      {showActivateConfirm && (
        <div className="animate-fade-in" onClick={()=>setShowActivateConfirm(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div className="animate-fade-up modal-sheet" onClick={e=>e.stopPropagation()} style={{borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"28px 28px 36px",display:"flex",flexDirection:"column",gap:14}}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.12)",borderRadius:4,margin:"0 auto -2px"}}/>
            <div style={{fontSize:19,fontWeight:900,color:C.ch,letterSpacing:"-0.02em"}}>⚡ Activate Week — Send to Kitchen?</div>
            <div style={{fontSize:13,color:C.chL,lineHeight:1.6}}>
              This will publish <strong style={{color:C.ch}}>{weekDPs.filter(d=>d.status!=="active").length} day plan{weekDPs.filter(d=>d.status!=="active").length!==1?"s":""}</strong> to the production team. <strong style={{color:C.rd}}>This cannot be undone.</strong>
            </div>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button onClick={()=>setShowActivateConfirm(false)} style={{flex:1,padding:"13px",background:th.chipBg,border:"1px solid "+th.divider,borderRadius:12,fontSize:13,fontWeight:800,color:C.chL,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>{onActivateWeek();setShowActivateConfirm(false);}} style={{flex:2,padding:"13px",background:"linear-gradient(135deg,#700143,#4D002E)",border:"none",borderRadius:12,fontSize:13,fontWeight:900,color:"#fff",cursor:"pointer",boxShadow:"0 4px 16px rgba(112,1,67,.4)",fontFamily:"inherit"}}>⚡ Yes, Activate</button>
            </div>
          </div>
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
    d.setDate(d.getDate() + i);
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
          <div style={{ background: "#2A2828", borderRadius: 16, padding: 32, maxWidth: 400, border: "1px solid #700143", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginBottom: 8 }}>Something went wrong</div>
            <div style={{ fontSize: 13, color: "#8896B3", marginBottom: 24 }}>{this.state.error?.message || "An unexpected error occurred."}</div>
            <button onClick={() => window.location.reload()} style={{ background: "#700143", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Bottom Navigation Bar ── */
function BottomNav({ activeTab, onTab, unreadCount }) {
  const C = useTheme();
  const tabs = [
    { id: "dashboard", label: "Home", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? C.ol : C.chL} stroke="none">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    )},
    { id: "notifications", label: "Alerts", badge: unreadCount, icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? C.ol : C.chL} stroke="none">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
      </svg>
    )},
    { id: "roles", label: "Roles", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? C.ol : C.chL} stroke="none">
        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
      </svg>
    )},
    { id: "profile", label: "Profile", icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? C.ol : C.chL} stroke="none">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    )},
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} className="bottom-nav-tab" onClick={() => onTab(tab.id)}
            style={{ color: active ? C.ol : C.chL }}>
            <div style={{ position: "relative", background: active ? (C.isDark ? "rgba(194,216,196,0.12)" : "rgba(112,1,67,0.08)") : "transparent", borderRadius: 12, padding: "5px 8px", transition: "background 0.2s" }}>
              {tab.icon(active)}
              {tab.badge > 0 && (
                <span style={{ position:"absolute", top:-4, right:-4, background:"#700143", color:"#fff", borderRadius:"50%", width:17, height:17, fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px solid var(--page-bg)", animation:"pulseSoft 2s infinite" }}>
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </div>
            <span className="bottom-nav-label" style={{ color: active ? C.ol : C.chL }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/* ── Notifications Tab ── */
function NotificationsTab({ role, userJoinDate }) {
  const C = useTheme();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("tfc_last_notif_seen", String(Date.now()));
    const cutoff = Math.max(Date.now() - WEEK_MS, userJoinDate || 0);
    const q = query(
      collection(db, "notifications"),
      where("sentAt", ">=", cutoff),
      orderBy("sentAt", "desc"),
      limit(60)
    );
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => d.data()).filter(n => n.targetRoles?.includes(role)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [role, userJoinDate]);

  function relTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return Math.floor(diff / 86400000) + "d ago";
  }

  return (
    <div className="custom-scrollbar" style={{ flex:1, overflowY:"auto", padding:"20px 20px 8px", maxWidth:560, margin:"0 auto", width:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:"var(--text-lg,20px)", fontWeight:900, color:C.ch, letterSpacing:"-0.02em" }}>Notifications</div>
        {!loading && notifs.length > 0 && <span className="ds-badge" style={{ color:"var(--gold,#C2D8C4)", background:"rgba(194,216,196,0.12)", border:"1px solid rgba(194,216,196,0.25)" }}>{notifs.length} this week</span>}
      </div>
      {loading ? (
        <div style={{ padding:"40px 0", textAlign:"center" }}>
          <div className="dot"/><div className="dot"/><div className="dot"/>
        </div>
      ) : notifs.length === 0 ? (
        <div className="empty-state" style={{ paddingTop:60 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔔</div>
          <div style={{ fontSize:"var(--text-lg,20px)", fontWeight:900, color:C.chL, marginBottom:6 }}>No notifications yet</div>
          <div style={{ fontSize:"var(--text-sm,13px)", color:C.chXL }}>Notifications from the last 7 days appear here</div>
        </div>
      ) : notifs.map((n, i) => {
        const roleColor = ROLES[n.targetRoles?.[0]]?.color || C.chM;
        return (
          <div key={i} style={{ padding:"14px 16px", marginBottom:8, background:"var(--card-bg)", border:"1px solid var(--border-faint)", borderLeft:`3px solid ${roleColor}`, borderRadius:12, boxShadow:"var(--card-shadow)" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:800, color:C.ch, marginBottom:2 }}>{n.title}</div>
              {n.body ? <div style={{ fontSize:12, color:C.chM, lineHeight:1.5 }}>{n.body}</div> : null}
              <div style={{ fontSize:11, color:C.chL, marginTop:5 }}>{relTime(n.sentAt)}</div>
            </div>
          </div>
        );
      })}
      <div style={{ height:16 }}/>
    </div>
  );
}

/* ── Profile Tab ── */
function ProfileTab({ authUser, userRecord, onSignOut, installPrompt, onInstallDone, orders }) {
  const C = useTheme();
  const { isDark, toggleTheme } = React.useContext(ThemeCtx);
  return (
    <div className="custom-scrollbar" style={{ flex:1, overflowY:"auto", padding:"24px 20px", maxWidth:440, margin:"0 auto", width:"100%" }}>
      <div style={{ fontSize:20, fontWeight:900, color:C.ch, letterSpacing:"-0.02em", marginBottom:20 }}>Profile</div>
      {/* Avatar + name */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24, padding:"16px 18px", background:C.off, border:"1.5px solid "+C.bdrL, borderRadius:"255px 15px 225px 15px / 15px 225px 15px 255px", boxShadow:C.sh }}>
        {authUser?.photoURL
          ? <img src={authUser.photoURL} alt="" style={{ width:52, height:52, borderRadius:"50%", border:"2px solid "+C.bdrL, flexShrink:0 }}/>
          : <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#700143,#4D002E)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#fff", flexShrink:0 }}>{authUser?.displayName?.[0]||"?"}</div>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:800, color:C.ch, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{authUser?.displayName||"User"}</div>
          <div style={{ fontSize:12, color:C.chL, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{authUser?.email}</div>
          {userRecord?.outlet && <div style={{ fontSize:11, color:C.chL, marginTop:2 }}>📍 {userRecord.outlet}</div>}
        </div>
      </div>

      {/* Stats row */}
      {(()=>{
        const WEEK_MS_P = 7*24*60*60*1000;
        const packedThisWeek = (orders||[]).filter(o =>
          o.items?.some(i => (i.status==="packed"||i.status==="delivered") && i.updatedAt > Date.now()-WEEK_MS_P)
        ).length;
        return (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
            <div style={{ background:"var(--sub-bg,rgba(245,222,141,0.04))", border:"1px solid var(--border-faint)", borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontSize:"var(--text-2xs,10px)", color:C.chL, textTransform:"uppercase", letterSpacing:"var(--ls-label,0.12em)", marginBottom:4 }}>Since</div>
              <div style={{ fontSize:"var(--text-sm,13px)", fontWeight:800, color:C.ch }}>{userRecord?.approvedAt ? new Date(userRecord.approvedAt).toLocaleDateString("en-MY",{month:"short",year:"numeric"}) : "—"}</div>
            </div>
            <div style={{ background:"var(--sub-bg,rgba(245,222,141,0.04))", border:"1px solid var(--border-faint)", borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontSize:"var(--text-2xs,10px)", color:C.chL, textTransform:"uppercase", letterSpacing:"var(--ls-label,0.12em)", marginBottom:4 }}>Roles</div>
              <div style={{ fontSize:"var(--text-md,17px)", fontWeight:800, color:C.ch }}>{userRecord?.roles?.length || 1}</div>
            </div>
            <div style={{ background:"var(--sub-bg,rgba(245,222,141,0.04))", border:"1px solid var(--border-faint)", borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontSize:"var(--text-2xs,10px)", color:C.chL, textTransform:"uppercase", letterSpacing:"var(--ls-label,0.12em)", marginBottom:4 }}>Packed/wk</div>
              <div style={{ fontSize:"var(--text-md,17px)", fontWeight:800, color:packedThisWeek>0?"var(--color-success,#16A34A)":C.ch }}>{packedThisWeek}</div>
            </div>
          </div>
        );
      })()}

      {/* Theme toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:C.off, border:"1.5px solid "+C.bdrL, borderRadius:"255px 15px 225px 15px / 15px 225px 15px 255px", marginBottom:12, boxShadow:C.sh }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.ch }}>{isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}</div>
          <div style={{ fontSize:11, color:C.chL }}>Tap to switch theme</div>
        </div>
        <div onClick={toggleTheme} className="toggle-switch" style={{ background: isDark ? "var(--accent)" : "var(--gold,#C2D8C4)" }}>
          <div className="toggle-switch__dot" style={{ left: isDark ? 26 : 3 }}/>
        </div>
      </div>

      {/* Sign out */}
      <button onClick={onSignOut}
        style={{ width:"100%", padding:"13px", background:"transparent", border:"1.5px solid var(--color-danger,#C1305A)", borderRadius:"255px 15px 225px 15px / 15px 225px 15px 255px", color:"var(--color-danger,#C1305A)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:12, minHeight:48 }}>
        Sign Out
      </button>

      <InstallAppButton installPrompt={installPrompt} onInstallDone={onInstallDone}/>

      <div style={{ textAlign:"center", marginTop:24, fontSize:10, color:C.chXL, fontWeight:500 }}>
        Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur<br/>
        © 2026 Made by Banuja Disanayaka
      </div>
    </div>
  );
}

/* ── Roles Tab (quick role switcher) ── */
function RolesTab({ availableRoles, currentRole, onSelect }) {
  const C = useTheme();
  const [selected, setSelected] = useState(currentRole);
  const keys = availableRoles || Object.keys(ROLES);
  return (
    <div style={{ flex:1, padding:"24px 20px", maxWidth:440, margin:"0 auto", width:"100%" }}>
      <div style={{ fontSize:20, fontWeight:900, color:C.ch, letterSpacing:"-0.02em", marginBottom:6 }}>Switch Role</div>
      <div style={{ fontSize:12, color:C.chL, marginBottom:20 }}>Current: <strong style={{ color:C.ch }}>{ROLES[currentRole]?.label}</strong></div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:24 }}>
        {keys.map(rk => {
          const r = ROLES[rk]; if (!r) return null;
          const active = selected === rk;
          return (
            <motion.button key={rk}
              onClick={() => setSelected(rk)}
              whileTap={{ scale: 0.93 }}
              className={`sketch-pill ${active ? "selected" : ""}`}
              style={{ border:"1.5px solid "+(active ? C.ol : C.bdrL), color: active ? "#fff" : C.chM, background: active ? C.ol : "transparent", minHeight:52, padding:"11px 18px", textAlign:"left" }}>
              <div style={{fontSize:13,fontWeight:800,lineHeight:1.2}}>{r.icon} {r.label}</div>
              {r.desc && <div style={{fontSize:10,color:active?"rgba(255,255,255,0.75)":C.chL,fontWeight:500,marginTop:3,lineHeight:1.3}}>{r.desc}</div>}
            </motion.button>
          );
        })}
      </div>
      <motion.button
        disabled={selected === currentRole || !selected}
        onClick={() => onSelect(selected)}
        whileTap={{ scale: 0.97 }}
        style={{ width:"100%", padding:"14px", background:selected && selected !== currentRole ? C.ol : C.off, border:"1.5px solid "+(selected && selected !== currentRole ? C.ol : C.bdrL), borderRadius:"255px 15px 225px 15px / 15px 225px 15px 255px", color:selected && selected !== currentRole ? "#fff" : C.chL, fontSize:15, fontWeight:800, cursor:selected && selected !== currentRole ? "pointer" : "not-allowed", fontFamily:"inherit", minHeight:52, boxShadow:C.sh }}>
        {selected === currentRole ? "Already on this role" : "Switch →"}
      </motion.button>
    </div>
  );
}

function TFCOrderSystem(){
  const isMobile = useIsMobile();
  const [splashState, setSplashState] = useState("visible");
  const [phase,setPhase]=useState("select"); const [role,setRole]=useState(null); const [screenExiting,setScreenExiting]=useState(false);

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => ("Notification" in window ? Notification.permission : "denied"));
  const [notifStatus, setNotifStatus] = useState("idle"); // idle | active | error
  // authUser must be declared before any useEffect that references it in deps,
  // otherwise minified production builds hit a TDZ error on the deps array eval.
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const prevOrdersRef = useRef(null);
  const currentFCMToken = useRef(null);
  // Tracks whether the orders observer has seen its first post-load snapshot.
  // Prevents firing N "new order" notifications when the initial Firestore
  // snapshot arrives (every existing order would look "new" otherwise).
  const observerArmedRef = useRef(false);
  // Tracks the last (role, uid) tuple we registered FCM for. When this tuple
  // changes (role switch or user switch), we know we need to re-register.
  const fcmRegLastKeyRef = useRef(null);
  // Latest in-flight registration role — if another call supersedes, abort writes.
  const pendingRegRoleRef = useRef(null);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      // Re-register FCM token as soon as network recovers — the previous attempt may have failed offline
      if ("Notification" in window && Notification.permission === "granted" && role) {
        registerFCMToken(role);
      }
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [role]); // role in deps so goOnline closure sees current role

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Read notifStatus through a ref so the visibility handler doesn't need to re-bind on every status flip
  const notifStatusRef = useRef(notifStatus);
  useEffect(() => { notifStatusRef.current = notifStatus; }, [notifStatus]);

  // On every tab-focus: sync permission state AND heal a stale/broken FCM token
  useEffect(() => {
    if (!("Notification" in window)) return;
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      const perm = Notification.permission;
      setNotifPermission(perm);
      if (perm !== "granted" || !role) return;
      // Re-register if token not active, last registration > TTL, role changed, or user changed
      let needsRefresh = notifStatusRef.current !== "active";
      if (!needsRefresh) {
        try {
          const d = JSON.parse(localStorage.getItem(FCM_LS_KEY) || "{}");
          needsRefresh = !d.ts || Date.now() - d.ts > FCM_TTL_MS || d.role !== role || d.uid !== authUser?.uid;
        } catch(_) { needsRefresh = true; }
      }
      if (needsRefresh) {
        console.log("[FCM] tab-focus heal: re-registering");
        setNotifStatus("idle");
        registerFCMToken(role);
      }
    };
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [role, authUser?.uid]);

  // Initial FCM registration: fires once per (role, uid) when role+permission+auth are all ready.
  // Without this, users who already have role cached in localStorage and previously granted
  // permission would never have their FCM token registered after a fresh app load.
  // We always call registerFCMToken (not just when LS says fresh) because currentFCMToken.current
  // is in-memory only — every page load needs the token re-fetched to populate it for sendPush.
  // Re-fires when role OR uid changes (so a user switch correctly re-registers under the new uid).
  useEffect(() => {
    if (!role || notifPermission !== "granted" || !authUser?.uid) {
      fcmRegLastKeyRef.current = null;
      return;
    }
    const key = role + ":" + authUser.uid;
    if (fcmRegLastKeyRef.current === key) return;
    fcmRegLastKeyRef.current = key;
    registerFCMToken(role);
  }, [role, notifPermission, authUser?.uid]); // eslint-disable-line

  // FCM foreground message handler — fires when the app has any open tab (visible or hidden).
  // Visible tabs are handled by the Firestore observer (in-app toast); for hidden tabs we show
  // a browser notification so the user sees something even if they're on another tab.
  useEffect(() => {
    const msg = getMsg();
    if (!msg) return;
    return onMessage(msg, payload => {
      if (document.visibilityState === "visible") return;
      const n = payload.notification;
      const d = payload.data;
      const title = n?.title || d?.title;
      const body  = n?.body  || d?.body  || "";
      const tag   = d?.tag || n?.tag || ("tfc-" + Date.now());
      if (title) fireNotif(title, { body, tag });
    });
  }, []);

  // SW → app message channel: respond to pushsubscriptionchange or other SW-initiated events
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === "fcm-resubscribe" && role && Notification.permission === "granted") {
        console.log("[FCM] SW requested re-subscribe");
        setNotifStatus("idle");
        registerFCMToken(role);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [role]);

  async function sendPush(roles, title, body, tag, _attempt = 0) {
    if (!roles?.length) return;
    // Filter out null/undefined/empty role names (e.g. when restaurant is unknown)
    const cleanRoles = roles.filter(r => r && typeof r === "string");
    if (!cleanRoles.length) return;
    try {
      const res = await fetch("/.netlify/functions/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRoles: cleanRoles,
          payload: { title, body, tag },
          senderToken: currentFCMToken.current,
          senderEmail: authUser?.email || null,
        }),
      });
      if (!res.ok) {
        // Server error (500/502/etc) — retry once after 2s before giving up
        if (_attempt < 1) {
          await new Promise(r => setTimeout(r, 2000));
          return sendPush(roles, title, body, tag, _attempt + 1);
        }
        console.warn("[Push] HTTP", res.status, "for", cleanRoles);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.sent === 0 || data.reason === "no_tokens") {
        console.warn("[Push] no tokens found for roles:", cleanRoles, data);
        notify(`No devices registered for ${cleanRoles.join("/")} — ask them to open the app and allow notifications`, "error");
      } else if (data.sent > 0) {
        console.log("[Push]", title, "→", cleanRoles, ":", data.sent + "/" + data.total, "delivered");
      }
      // Persist to Firestore notification history (7-day TTL via expiresAt field)
      addDoc(collection(db, "notifications"), {
        title, body: body || "", tag: tag || "tfc",
        targetRoles: cleanRoles,
        senderEmail: authUser?.email || null,
        sentAt: Date.now(),
        expiresAt: Date.now() + WEEK_MS,
      }).catch(() => {});
    } catch (e) {
      // Network error — retry once
      if (_attempt < 1) {
        await new Promise(r => setTimeout(r, 2000));
        return sendPush(roles, title, body, tag, _attempt + 1);
      }
      console.warn("[Push] failed:", e.message);
    }
  }

  async function registerFCMToken(r, _attempt = 0) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!VAPID_KEY || VAPID_KEY.startsWith("YOUR_")) return;
    pendingRegRoleRef.current = r; // claim this role for the race-safety check
    console.log("[FCM] register attempt", _attempt + 1, "for role:", r);
    try {
      const msg = getMsg();
      if (!msg) throw new Error("getMessaging() returned null — browser may not support FCM");
      const reg = await navigator.serviceWorker.ready;
      // Nudge SW to pick up any pending update before requesting token
      reg.update().catch(() => {});
      const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
      if (!token) throw new Error("empty token returned by FCM");
      // Race-safety: if another registerFCMToken call superseded this one, abort
      if (pendingRegRoleRef.current !== r) {
        console.log("[FCM] aborted — superseded by newer registration");
        return;
      }
      // Update in-memory token FIRST so even if Firestore write fails,
      // we know our own token and can exclude it from sendPush recipients.
      currentFCMToken.current = token;
      try {
        await setDoc(doc(db, "fcm_tokens", token.slice(-28)), {
          token,
          email: authUser?.email || "anon",
          uid: authUser?.uid || null,
          activeRole: r,
          updatedAt: Date.now(),
        });
      } catch (writeErr) {
        // Write failed (rules, network) — log but don't kill registration
        console.error("[FCM] token doc write failed:", writeErr.message);
        throw writeErr; // trigger retry path
      }
      // Persist registration metadata so TTL health-check can detect stale tokens
      try {
        localStorage.setItem(FCM_LS_KEY, JSON.stringify({
          ts: Date.now(), role: r, uid: authUser?.uid || null,
        }));
      } catch(_) {}
      setNotifStatus("active");
      console.log("[FCM] ✓ registered for", r, "token …" + token.slice(-8));
    } catch (e) {
      console.error("[FCM] attempt", _attempt + 1, "failed:", e.message);
      // Retry with exponential back-off: 3 s, then 9 s, then give up
      if (_attempt < 2) {
        setTimeout(() => registerFCMToken(r, _attempt + 1), _attempt === 0 ? 3000 : 9000);
      } else {
        setNotifStatus("error");
        console.warn("[FCM] all 3 attempts failed — bell icon is red, click it to retry");
      }
    }
  }

  const [orders,setOrders]=useState([]);
  const [dailyProductions, setDailyProductions] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Role-based push notifications — diffs Firestore snapshots and fires per-role alerts
  useEffect(() => {
    const prev = prevOrdersRef.current;
    prevOrdersRef.current = orders; // always keep ref current so no burst on permission grant

    // Skip while initial Firestore load is in progress
    if (loadingInitial) return;
    // First post-load snapshot establishes the baseline — every existing order would
    // look "new" against the empty prev otherwise, spawning N false notifications.
    if (!observerArmedRef.current) {
      observerArmedRef.current = true;
      return;
    }
    // Only fire when role is active and permission is granted
    if(!role || notifPermission !== "granted" || !("Notification" in window)) return;
    // Skip if same reference (no actual change)
    if(prev === orders) return;
    // Foreground observer handles visible tab only — hidden/closed tabs receive FCM push from the Netlify function
    if (document.visibilityState !== "visible") return;
    // Defensive: prev may be null if observer fires before any data arrived (shouldn't happen given loadingInitial guard, but cheap to check)
    if (!prev) return;

    // Build a flat map of previous item states for O(1) lookup
    const prevMap = {};
    prev.forEach(o => o.items && o.items.forEach(it => { prevMap[it.id] = it; }));

    orders.forEach(order => {
      if(!order.items) return;
      order.items.forEach(item => {
        const was = prevMap[item.id];
        if(!was || was.status === item.status) return; // no change
        if(item.updatedBy && item.updatedBy === authUser?.email) return; // skip own changes — FCM handles other devices
        const to = item.status;

        if(role === "admin"){
          if(to === "short")     fireNotif("⚠ Short Shipment",  {body:`${item.product} (${order.poName||order.restaurant}): Sent ${item.packedQty||"?"} of ${item.qty} ${item.unit||""}`,tag:`short-${item.id}`});
          if(to === "oos")       fireNotif("✕ Out of Stock",     {body:`${item.product} — ${order.poName||order.restaurant}`,tag:`oos-${item.id}`});
          if(to === "delivered") fireNotif("🚀 Delivered",       {body:`${item.product} · ${order.poName||order.restaurant}`,tag:`del-${item.id}`});
        }
        if(role === "packing"){
          if(to === "prod_done") fireNotif("✓ Ready to Pack",   {body:`${item.product} · ${item.qty} ${item.unit||""} · ${order.restaurant}`,tag:`ready-${item.id}`});
        }
        if(role === "production"){
          if(to === "production") fireNotif("🍳 New Batch Needed",{body:`${item.product} · ${item.qty} ${item.unit||""}`,tag:`prod-${item.id}`});
        }
        if(role === "vins" && order.restaurant === "Vins"){
          if(to === "short")     fireNotif("⚠ Short — Vins",    {body:`${item.product}: Sent ${item.packedQty||"?"} / Req ${item.qty} ${item.unit||""}`,tag:`vs-${item.id}`});
          if(to === "oos")       fireNotif("✕ Out of Stock — Vins",{body:`${item.product} unavailable`,tag:`vo-${item.id}`});
          if(to === "delivered") fireNotif("🚀 Delivered — Vins",{body:`${item.product} · ${item.qty} ${item.unit||""}`,tag:`vd-${item.id}`});
        }
        if(role === "manja" && order.restaurant === "Manja"){
          if(to === "short")     fireNotif("⚠ Short — Manja",   {body:`${item.product}: Sent ${item.packedQty||"?"} / Req ${item.qty} ${item.unit||""}`,tag:`ms-${item.id}`});
          if(to === "oos")       fireNotif("✕ Out of Stock — Manja",{body:`${item.product} unavailable`,tag:`mo-${item.id}`});
          if(to === "delivered") fireNotif("🚀 Delivered — Manja",{body:`${item.product} · ${item.qty} ${item.unit||""}`,tag:`md-${item.id}`});
        }
      });

      // Alert restaurant role when their whole order is fully dispatched
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

      // Alert admin when whole order is delivered
      if(role === "admin"){
        const prevOrder = prev.find(o => o.id === order.id);
        if(prevOrder && prevOrder.items){
          const wasDone = prevOrder.items.every(i => i.status === "delivered");
          const nowDone = order.items.every(i => i.status === "delivered");
          if(!wasDone && nowDone){
            fireNotif("🚀 Order Fully Delivered", {body:`${order.poName||order.restaurant} — all items dispatched`,tag:`fulldel-${order.id}`});
          }
        }
      }
    });

    // Detect new orders (tab is open — foreground path for packing, vins, manja)
    const prevIds = new Set(prev.map(o => o.id));
    orders.forEach(order => {
      if(prevIds.has(order.id)) return;
      if(role === "packing"){
        fireNotif("📋 New PO Received", {body:`${order.restaurant}: ${order.poName||"New Order"}`,tag:`newpo-${order.id}`});
      }
      if(role === "vins" && order.restaurant === "Vins"){
        fireNotif("📋 New Order — Vins", {body:`${order.poName||"New Order"}`,tag:`newpo-${order.id}`});
      }
      if(role === "manja" && order.restaurant === "Manja"){
        fireNotif("📋 New Order — Manja", {body:`${order.poName||"New Order"}`,tag:`newpo-${order.id}`});
      }
    });
  }, [orders, role, notifPermission, loadingInitial]);

  const [activeId,setActiveId]=useState(null); const [showModal,setShowModal]=useState(false); const [editingOrder, setEditingOrder] = useState(null); const [toast,setToast] = useState(null); const [sidebarOpen, setSidebarOpen]=useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("tfc_theme") !== "light");
  const toggleTheme = () => setIsDark(d => { localStorage.setItem("tfc_theme", !d ? "dark" : "light"); return !d; });

  // Auth state (authUser/authLoading hoisted above for TDZ safety in notification effects)
  const [userRecord, setUserRecord] = useState(null);
  const [userRecordLoading, setUserRecordLoading] = useState(false);
  const [accessRequest, setAccessRequest] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);

  useEffect(() => { const timer1 = setTimeout(() => setSplashState("fading"), 2000); const timer2 = setTimeout(() => setSplashState("hidden"), 2500); return () => { clearTimeout(timer1); clearTimeout(timer2); }; }, []);
  function notify(msg,type="success"){ setToast({msg,type}); setTimeout(()=>setToast(null),4000); }

  // Reset tab to dashboard when role changes
  useEffect(() => { setActiveTab("dashboard"); }, [role]);

  // Sync data-theme on <html> so CSS vars (body bg, etc.) update correctly at root level
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Unread notification count
  useEffect(() => {
    if (!role) return;
    const userJoinDate = authUser?.email === OWNER_EMAIL
      ? new Date(authUser?.metadata?.creationTime || 0).getTime()
      : (userRecord?.approvedAt || 0);
    const cutoff = Math.max(Date.now() - WEEK_MS, userJoinDate);
    const q = query(collection(db, "notifications"), where("sentAt", ">=", cutoff), orderBy("sentAt", "desc"), limit(30));
    return onSnapshot(q, snap => {
      const lastSeen = parseInt(localStorage.getItem("tfc_last_notif_seen") || "0");
      const relevant = snap.docs.map(d => d.data()).filter(n => n.targetRoles?.includes(role));
      setUnreadCount(relevant.filter(n => n.sentAt > lastSeen).length);
    });
  }, [role, authUser, userRecord]);

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

  async function submitAccessRequest(requestedRoles, enteredName, enteredOutlet) {
    try {
      const id = "req_" + Date.now();
      await setDoc(doc(db, "access_requests", id), {
        id, email: authUser.email,
        name: enteredName || authUser.displayName,
        photoURL: authUser.photoURL,
        outlet: enteredOutlet || "",
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
        outlet: request.outlet || "",
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

  async function updateItem(orderId, itemId, updates){
    try {
      const orderToUpdate = orders.find(o => o.id === orderId); if(!orderToUpdate) return;
      const item = orderToUpdate.items.find(i => i.id === itemId);
      const updatedItems = orderToUpdate.items.map(i => i.id === itemId ? {...i, ...updates, updatedBy: authUser?.email} : i);
      await setDoc(doc(db, "orders", orderId), {...orderToUpdate, items: updatedItems});
      // Push to other devices
      if(updates.status && item && updates.status !== item.status){
        const rr = orderToUpdate.restaurant?.toLowerCase();
        const pn = item.product;
        const on = orderToUpdate.poName || orderToUpdate.restaurant;
        if(updates.status==="production")  sendPush(["production"], "🍳 New Batch", `${pn} · ${item.qty} ${item.unit||""}`, `prod-${itemId}`);
        else if(updates.status==="prod_done") sendPush(["packing"], "✓ Ready to Pack", `${pn} · ${item.qty} ${item.unit||""} · ${orderToUpdate.restaurant}`, `ready-${itemId}`);
        else if(updates.status==="short")  sendPush(["admin",rr], "⚠ Short Shipment", `${pn} (${on}): Sent ${updates.packedQty||"?"} / Req ${item.qty} ${item.unit||""}`, `short-${itemId}`);
        else if(updates.status==="oos")    sendPush(["admin",rr], "✕ Out of Stock", `${pn} — ${on}`, `oos-${itemId}`);
        else if(updates.status==="delivered") sendPush(["admin",rr], "🚀 Delivered", `${pn} · ${on}`, `del-${itemId}`);
      }
    } catch (e) { console.error("Update item failed:", e); notify("Failed to update", "error"); }
  }
  async function handleBatchUpdate(batch, status) {
    try {
      const updatesPromises = []; const affectedOrderIds = [...new Set(batch.items.map(it => it.orderId))];
      affectedOrderIds.forEach(oId => {
        const orderToUpdate = orders.find(o => o.id === oId); if(!orderToUpdate) return;
        const updatedItems = orderToUpdate.items.map(i => batch.items.some(b => b.id === i.id) ? {...i, status, updatedAt: Date.now(), updatedBy: authUser?.email} : i);
        updatesPromises.push(setDoc(doc(db, "orders", oId), {...orderToUpdate, items: updatedItems}));
      });
      await Promise.all(updatesPromises);
      notify("Master Batch updated!", "success");
      if(status==="prod_done") sendPush(["packing"], "✓ Batch Ready to Pack", `${batch.items.length} item${batch.items.length!==1?"s":""} ready`, `batch-${Date.now()}`);
      if(status==="production") sendPush(["production"], "🍳 Batch Production", `${batch.items.length} item${batch.items.length!==1?"s":""} to produce`, `bprod-${Date.now()}`);
    } catch (e) { console.error("Batch update failed:", e); notify("Failed to update batch", "error"); }
  }
  async function saveOrderEdit(orderId, newItems, metaData) {
    try {
      const orderToUpdate = orders.find(o => o.id === orderId); if(!orderToUpdate) return;
      await setDoc(doc(db, "orders", orderId), { ...orderToUpdate, items: newItems, ...metaData, updatedAt: Date.now() });
      setEditingOrder(null); notify("Order updated!", "success");
      sendPush(["packing"], "✏ PO Updated", `${orderToUpdate.poName||orderToUpdate.restaurant} has been edited`, `edit-${orderId}`);
    } catch (e) { console.error("Save order edit failed:", e); notify("Failed to update", "error"); }
  }
  async function deleteOrder(orderId){ try { await deleteDoc(doc(db, "orders", orderId)); if(activeId === orderId) setActiveId(null); notify("Order removed", "success"); } catch (e) { console.error("Delete order failed:", e); notify("Failed to delete", "error"); } }
  async function handleNewOrder(restaurant, poName, poDate, delDate, rows){
    try {
      const newOrder = { id: "ord_" + Date.now(), restaurant, poName: poName.trim() || `${restaurant} Order`, orderDate: poDate, deliveryDate: delDate.trim(), createdAt: Date.now(), items: rows.map((r,i) => ({ id: "item_" + i + "_" + Date.now(), product: r.product.trim(), qty: r.qty, unit: r.unit, status: "pending", packedQty: "", notes: "" })) };
      await setDoc(doc(db, "orders", newOrder.id), newOrder);
      setActiveId(newOrder.id); setShowModal(false); notify(`${rows.length} items added`, "success");
      sendPush(["packing"], "📋 New PO Received", `${restaurant}: ${newOrder.poName}`, `new-${newOrder.id}`);
    } catch (e) { console.error("Create order failed:", e); notify("Failed to save", "error"); }
  }

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

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(dpRef);
        if (snap.exists()) {
          const freshItems = [...(snap.data().items || []), newItem];
          transaction.update(dpRef, { items: freshItems, updatedAt: Date.now() });
        } else {
          const dateObj = new Date(dateStr + "T00:00:00");
          const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
          const sunOffset = dateObj.getDay();
          const sunday = new Date(dateObj);
          sunday.setDate(sunday.getDate() - sunOffset);
          const weekOf = getLocalYMD(sunday);
          transaction.set(dpRef, {
            id: docId, date: dateStr, dayOfWeek: days[dateObj.getDay()], weekOf, status: "active",
            notes: "Contains unplanned production", items: [newItem],
            createdAt: Date.now(), updatedAt: Date.now()
          });
        }
      });
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
      const docRef = doc(db, "daily_productions", docId);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) throw new Error("Document not found: " + docId);
        const freshItems = (snap.data().items || []).map(i =>
          i.id === itemId ? { ...i, ...updates, updatedAt: Date.now() } : i
        );
        transaction.update(docRef, { items: freshItems, updatedAt: Date.now() });
      });
      if (updates.status === "prod_done") notify("✓ Marked done", "success");
    } catch (e) { console.error("updateDailyProdItem failed:", e); notify("Update failed", "error"); }
  }

  function selectRole(r){
    if("Notification" in window && Notification.permission === "default"){
      Notification.requestPermission().then(p => {
        setNotifPermission(p);
        if(p === "granted") registerFCMToken(r);
      });
    } else if("Notification" in window && Notification.permission === "granted"){
      registerFCMToken(r);
    }
    setScreenExiting(true);
    setTimeout(()=>{ setRole(r); setPhase("app"); setScreenExiting(false); }, 320);
  }

  const _themeVal = { ...makeThemeObj(isDark ? DC : LC, isDark), toggleTheme };
  const _dt = isDark ? "dark" : "light";

  if (splashState === "visible" || splashState === "fading") return ( <ThemeCtx.Provider value={_themeVal}><style>{GLOBAL_STYLES}</style><div data-theme={_dt} style={{ opacity: splashState === "fading" ? 0 : 1, transition: "opacity 0.5s ease" }}><SplashScreen /></div></ThemeCtx.Provider> );

  // Auth loading
  if (authLoading) return (<ThemeCtx.Provider value={_themeVal}><style>{GLOBAL_STYLES}</style><div data-theme={_dt}><SplashScreen /></div></ThemeCtx.Provider>);

  // Not logged in
  if (!authUser) return (<ThemeCtx.Provider value={_themeVal}><style>{GLOBAL_STYLES}</style><div data-theme={_dt}><LoginScreen onSignIn={handleGoogleSignIn} /></div></ThemeCtx.Provider>);

  // Loading user's Firestore record
  if (userRecordLoading) return (<ThemeCtx.Provider value={_themeVal}><style>{GLOBAL_STYLES}</style><div data-theme={_dt}><SplashScreen /></div></ThemeCtx.Provider>);

  let AppContent;
  const isOwner = authUser.email === OWNER_EMAIL;
  const availableRoles = isOwner ? Object.keys(ROLES) : (userRecord?.roles || []);

  if (phase === "control_panel") {
    AppContent = <ControlPanel
      requests={accessRequests} authorizedUsers={authorizedUsers}
      onApprove={approveRequest} onReject={rejectRequest} onRemoveUser={removeUser}
      onBack={() => setPhase("select")} authUser={authUser} onSignOut={handleSignOut} notify={notify}
    />;
  } else if(phase==="select") {
    const installProps = { installPrompt, onInstallDone: () => { setInstallPrompt(null); setShowInstallBanner(false); } };
    if (!isOwner && !userRecord) {
      if (accessRequest && accessRequest.status === "pending") {
        AppContent = <PendingScreen request={accessRequest} authUser={authUser} onSignOut={handleSignOut} {...installProps}/>;
      } else {
        AppContent = <RequestAccessScreen authUser={authUser} onSubmit={submitAccessRequest} onSignOut={handleSignOut} {...installProps}/>;
      }
    } else {
      AppContent = <RoleSelectScreen
        availableRoles={availableRoles} onSelect={selectRole}
        isOwner={isOwner} onControlPanel={() => setPhase("control_panel")}
        authUser={authUser} onSignOut={handleSignOut}
        pendingCount={accessRequests.filter(r => r.status === "pending").length}
        {...installProps}
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

    const th = makeThemeObj(isDark ? DC : LC, isDark);
    const topBarBg   = th.headerBg;
    const topBarBdr  = `1px solid ${th.divider}`;
    const topBarShd  = isDark ? "0 2px 16px rgba(0,0,0,0.50)" : "0 2px 10px rgba(0,0,0,0.06)";
    const sidebarBg  = th.panelBg;
    const sidebarBdr = `1px solid ${th.divider}`;
    const mainBg     = isDark ? "#222222" : "#F8EDAD";
    const orderCount = th.chL;
    const copyright  = th.chXL;

    const userJoinDate = authUser?.email === OWNER_EMAIL
      ? new Date(authUser?.metadata?.creationTime || 0).getTime()
      : (userRecord?.approvedAt || 0);
    const installProps2 = { installPrompt, onInstallDone: () => { setInstallPrompt(null); setShowInstallBanner(false); } };

    AppContent = (
      <div
        className="animate-fade-in"
        style={{height:"100vh",display:"flex",flexDirection:"column",backgroundColor:mainBg,fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",overflow:"hidden",position:"relative",transition:"background-color 0.4s ease",opacity:screenExiting?0:1}}
      >
        <div className="dot-grid-fixed"/>
        <div className="portal-orb portal-orb-1"/>
        <div className="portal-orb portal-orb-2"/>
        <div className="portal-orb portal-orb-3"/>
        <div className="portal-orb portal-orb-4"/>
        <div className="portal-orb portal-orb-5"/>

        <AnimatePresence>{toast&&<Toast msg={toast.msg} type={toast.type}/>}</AnimatePresence>
        {showModal&&<NewOrderModal onClose={()=>setShowModal(false)} onSubmit={handleNewOrder} notify={notify}/>}
        {editingOrder&&<EditOrderModal order={editingOrder} onClose={()=>setEditingOrder(null)} onSave={saveOrderEdit} notify={notify}/>}

        {/* ── Offline Bar ── */}
        {!isOnline&&<div className="offline-bar"><span>⚡</span>You're offline — changes will sync when reconnected</div>}

        {/* ── Install Banner ── */}
        {showInstallBanner&&<div className="install-banner">
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#700143,#4D002E)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,boxShadow:"0 4px 14px rgba(112,1,67,0.45)"}}>🍽️</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text)",lineHeight:1.2}}>Add to Home Screen</div>
            <div style={{fontSize:11,color:"#8896B3",marginTop:2,fontWeight:500}}>Install TFC Order Tracker for quick access</div>
          </div>
          <button onClick={async()=>{ if(installPrompt){await installPrompt.prompt();setInstallPrompt(null);} setShowInstallBanner(false); }} style={{background:"linear-gradient(135deg,#700143,#4D002E)",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:800,padding:"8px 14px",cursor:"pointer",flexShrink:0,boxShadow:"0 2px 10px rgba(112,1,67,0.4)"}}>Install</button>
          <button onClick={()=>setShowInstallBanner(false)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#8896B3",fontSize:12,fontWeight:700,padding:"8px 12px",cursor:"pointer",flexShrink:0}}>Later</button>
        </div>}

        {/* ── Portal Top Bar ── */}
        <div style={{background:topBarBg,borderBottom:topBarBdr,flexShrink:0,zIndex:60,position:"relative",boxShadow:topBarShd,transition:"all 0.4s ease",paddingTop:"env(safe-area-inset-top, 0px)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:58}}>
          <div className="portal-bar-shine"/>
          {/* Left */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isMobile&&<button onClick={()=>setSidebarOpen(true)} style={{background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",border:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`,borderRadius:8,minWidth:44,minHeight:44,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.ch,fontSize:17,flexShrink:0}}>☰</button>}
            <div style={{position:"relative",width:34,height:34,flexShrink:0}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(145deg,#200A0A,#2E1010)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:"0 0 0 1px rgba(112,1,67,0.3),0 2px 10px rgba(112,1,67,0.2)"}}>🍽️</div>
              <div style={{position:"absolute",inset:-4,borderRadius:"50%",border:"1px solid rgba(112,1,67,0.18)",animation:"spinSlow 22s linear infinite",pointerEvents:"none"}}/>
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
              {totalIssues>0&&<span style={{position:"absolute",top:-6,right:-6,background:"#700143",color:"#fff",borderRadius:"50%",width:17,height:17,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #222222",animation:"pulseSoft 2s infinite"}}>{totalIssues}</span>}
            </div>
            {"Notification" in window && (
              <button
                onClick={()=>{
                  if(notifPermission==="default"){
                    Notification.requestPermission().then(p=>{setNotifPermission(p); if(p==="granted"){registerFCMToken(role);notify("Notifications enabled!","success");}else if(p==="denied")notify("Notifications blocked. Allow in browser settings.","error");});
                  } else if(notifPermission==="denied"){
                    notify("Notifications blocked. Go to browser Settings → Site settings to allow them.","error");
                  } else if(notifPermission==="granted" && notifStatus !== "active"){
                    registerFCMToken(role);
                    notify("Re-registering notifications…","success");
                  } else {
                    notify("Notifications are active ✓","success");
                  }
                }}
                title={notifPermission==="granted"?(notifStatus==="active"?"Notifications active ✓":notifStatus==="error"?"Notification error — click to retry":"Registering…"):notifPermission==="denied"?"Notifications blocked":"Enable notifications"}
                style={{background:notifPermission==="granted"?(notifStatus==="active"?"rgba(74,222,128,0.08)":notifStatus==="error"?"rgba(248,113,113,0.08)":"rgba(232,146,10,0.08)"):"rgba(255,255,255,0.04)",border:`1px solid ${notifPermission==="granted"?(notifStatus==="active"?"rgba(74,222,128,0.25)":notifStatus==="error"?"rgba(248,113,113,0.25)":"rgba(232,146,10,0.25)"):notifPermission==="denied"?"rgba(248,113,113,0.25)":"rgba(255,255,255,0.08)"}`,borderRadius:8,minWidth:36,minHeight:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,position:"relative",flexShrink:0,transition:"all 0.2s"}}
              >
                {notifPermission==="denied"?"🔕":"🔔"}
                {notifPermission==="default"&&<span style={{position:"absolute",top:3,right:3,width:6,height:6,background:"#E8920A",borderRadius:"50%",border:"1.5px solid #222222"}}/>}
                {notifPermission==="granted"&&notifStatus==="active"&&<span style={{position:"absolute",top:3,right:3,width:6,height:6,background:"#4ADE80",borderRadius:"50%",border:"1.5px solid #222222"}}/>}
                {notifPermission==="granted"&&notifStatus==="error"&&<span style={{position:"absolute",top:3,right:3,width:6,height:6,background:"#F87171",borderRadius:"50%",border:"1.5px solid #222222"}}/>}
                {notifPermission==="granted"&&notifStatus==="idle"&&<span style={{position:"absolute",top:3,right:3,width:6,height:6,background:"#E8920A",borderRadius:"50%",border:"1.5px solid #222222"}}/>}
              </button>
            )}
            {!isMobile&&authUser&&(authUser.photoURL?<img src={authUser.photoURL} alt="" style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${isDark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)"}`,flexShrink:0}}/>:<div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#700143,#4D002E)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#fff",flexShrink:0}}>{authUser.displayName?.[0]||"?"}</div>)}
            <button onClick={()=>{ setScreenExiting(true); setTimeout(()=>{ setPhase("select");setRole(null);setActiveId(null);setScreenExiting(false); }, 320); }} style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)",border:`1px solid ${isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)"}`,color:C.chL,padding:"6px 12px",borderRadius:8,minHeight:36,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{isMobile?"←":"Roles"}</button>
          </div>
        </div>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative",zIndex:2}}>
          {isMobile&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",zIndex:40,animation:"fadeIn 0.3s ease-out forwards"}}/>}

          {/* Sidebar */}
          <div className="custom-scrollbar" style={{width:240,borderRight:sidebarBdr,background:sidebarBg,padding:"14px 12px",overflowY:"auto",flexShrink:0,display:"flex",flexDirection:"column",gap:5,position:isMobile?"absolute":"relative",zIndex:50,height:"100%",left:0,top:0,transform:isMobile?(sidebarOpen?"translateX(0)":"translateX(-100%)"):"none",transition:"transform 0.3s cubic-bezier(0.16,1,0.3,1), background 0.4s ease",boxShadow:isMobile&&sidebarOpen?(isDark?"0 0 40px rgba(0,0,0,0.7)":"0 0 24px rgba(0,0,0,0.10)"):"none"}}>
            {role==="admin"&&(<div style={{marginBottom:10}}><button className="btn-3d create-order-btn" onClick={()=>{setShowModal(true);if(isMobile)setSidebarOpen(false);}} style={{width:"100%",padding:"14px 0",border:"none",borderRadius:12,background:"linear-gradient(135deg,#700143,#4D002E)",color:"#FFFFFF",fontSize:14,cursor:"pointer",fontWeight:900,letterSpacing:"0.03em",boxShadow:"0 4px 22px rgba(112,1,67,0.55),0 0 40px rgba(112,1,67,0.12),inset 0 1px 0 rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:18}}>+</span> Create Order</button></div>)}
            {role==="production"&&(<div style={{padding:"12px 14px",background:"rgba(232,146,10,0.08)",borderRadius:10,border:"1px solid rgba(232,146,10,0.2)",marginBottom:10}}><div style={{fontSize:11,fontWeight:900,color:C.amDk,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3}}>Production Mode</div><div style={{fontSize:11,color:C.chL,lineHeight:1.4,fontWeight:500}}>All items flagged for production.</div></div>)}
            <div className="section-label-v2" style={{color:C.chL}}>Orders {viewOrders.length>0&&<span style={{fontWeight:700,marginLeft:3}}>({viewOrders.length})</span>}</div>
            {loadingInitial?(<div style={{padding:"10px 0"}}><div className="skeleton-box" style={{height:80,marginBottom:10}}></div><div className="skeleton-box" style={{height:80}}></div></div>):viewOrders.length===0?<div style={{fontSize:13,color:C.chXL,textAlign:"center",padding:"32px 0",fontWeight:600}}>No orders found</div>:viewOrders.map((o,i)=>(<OrderCard key={o.id} index={i} order={o} active={activeId===o.id} onClick={()=>{setActiveId(o.id);if(isMobile)setSidebarOpen(false);}} onDelete={role==="admin"?deleteOrder:null}/>))}
            <div style={{marginTop:"auto",paddingTop:20,textAlign:"center",fontSize:9,color:copyright,fontWeight:500}}>© 2026 Made by Banuja Disanayaka</div>
          </div>

          {/* Main content — dashboard tab */}
          {activeTab === "dashboard" && (
            <div className="custom-scrollbar has-bottom-nav" style={{flex:1,overflowY:"auto",padding:isMobile?"16px":"32px 40px",width:"100%",position:"relative",transition:"background 0.4s ease"}}>
              <div key={`${role}-${activeId||"none"}`} className="view-enter" style={{minHeight:"100%"}}>
                {renderMain()}
              </div>
            </div>
          )}
          {/* Non-dashboard tabs */}
          {activeTab !== "dashboard" && (
            <div className="custom-scrollbar has-bottom-nav" style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
              {activeTab === "notifications" && <NotificationsTab role={role} userJoinDate={userJoinDate}/>}
              {activeTab === "roles" && <RolesTab availableRoles={availableRoles} currentRole={role} onSelect={r=>{ selectRole(r); setActiveTab("dashboard"); }}/>}
              {activeTab === "profile" && <ProfileTab authUser={authUser} userRecord={userRecord} onSignOut={handleSignOut} orders={orders} {...installProps2}/>}
            </div>
          )}
        </div>
        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTab={t=>{ setActiveTab(t); if(t==="dashboard")setSidebarOpen(false); }} unreadCount={unreadCount}/>
      </div>
    );
  }

  return ( <ThemeCtx.Provider value={_themeVal}><style>{GLOBAL_STYLES}</style><div data-theme={_dt} style={{minHeight:"100vh"}}><AnimatePresence mode="wait"><motion.div key={phase+(role||"")} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.28,ease:[0.16,1,0.3,1]}}>{AppContent}</motion.div></AnimatePresence></div></ThemeCtx.Provider> );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TFCOrderSystem />
    </ErrorBoundary>
  );
}