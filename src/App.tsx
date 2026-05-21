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
   PREMIUM CSS ANIMATIONS & DARK MODE (V7 FINAL)
═══════════════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900&family=JetBrains+Mono:wght@500;600&display=swap');

  @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulseSoft { 0% { box-shadow: 0 0 0 0 rgba(211, 17, 24, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(211, 17, 24, 0); } 100% { box-shadow: 0 0 0 0 rgba(211, 17, 24, 0); } }
  @keyframes shimmerPulse { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
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
  
  .animate-fade-up { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
  .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
  
  .skeleton-box { background: linear-gradient(90deg, #111828 0%, #1B2640 50%, #111828 100%); background-size: 200% 100%; animation: shimmerLoad 2s infinite; border-radius: 12px; }
  .celebration-card { border: 2px solid #097353 !important; animation: celebrateGlow 2s infinite ease-in-out; }
  
  .glass-header { position: sticky; top: -20px; z-index: 40; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: rgba(9, 11, 16, 0.90); padding: 20px 20px 16px 20px; margin: -20px -20px 16px -20px; border-bottom: 1px solid rgba(30, 42, 68, 0.8); transition: all 0.3s ease; }
  @media (min-width: 768px) { .glass-header { top: -32px; padding: 32px 40px 16px 40px; margin: -32px -40px 16px -40px; } }

  .accordion-content { overflow: hidden; transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease; max-height: 0; opacity: 0; }
  .accordion-content.open { max-height: 1000px; opacity: 1; }

  .cooking-shimmer { background: linear-gradient(90deg, #121A28 0%, #1E2C18 50%, #121A28 100%); background-size: 200% 100%; animation: shimmerPulse 2.5s infinite; }
  .prod-done-glow { background: linear-gradient(90deg, #0E1E18 0%, #162A1E 50%, #0E1E18 100%); background-size: 200% 100%; animation: shimmerPulse 3s infinite; }
  
  .dot { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: currentColor; margin: 0 2px; animation: dotBounce 1.4s infinite ease-in-out both; }
  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #1E2A44; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2A3860; }

  input:focus, textarea:focus, select:focus { border-color: #D31118 !important; box-shadow: 0 0 0 3px rgba(211, 17, 24, 0.2) !important; background: #0E1420 !important; }
  input::placeholder, textarea::placeholder { color: #2A3A58; }
  input, textarea, select { color: #EEF2FF !important; background: #111828 !important; }

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
   CONFIG & PALETTE (DARK MODE PRO)
═══════════════════════════════════════════════════════════════ */
const UNITS=["kg","g","pkt","nos","btl","ctn","ltr","tray","box","pc","reel","can","portion"];
const C={ 
  w: "#141928", off: "#0E1018", beige: "#0E1018", beigeD: "#1B2238",       
  ch: "#EEF2FF", chM: "#B8C4E0", chL: "#8896B3", chXL: "#2A3450",       
  bdr: "#1E2A44", bdrL: "#172036",       
  ol: "#D31118", olDk: "#A50D12", olBg: "rgba(211,17,24,0.14)", olBgD: "rgba(211,17,24,0.26)",
  am: "#E8920A", amDk: "#B86F06", amBg: "rgba(232,146,10,0.13)", amBgD: "rgba(232,146,10,0.24)",
  gn: "#16A34A", gnBg: "rgba(22,163,74,0.13)",
  rd: "#DC2626", rdBg: "rgba(220,38,38,0.12)",
  sh: "0 2px 10px rgba(0,0,0,0.4)", shM: "0 8px 32px rgba(0,0,0,0.6)"
};

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

/* ═══════════════════════════════════════════════════════════════
   MICRO COMPONENTS
═══════════════════════════════════════════════════════════════ */
function Badge({status}){
  const s=SC[status]||SC.pending;
  return <span style={{fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:20,color:s.c,background:s.bg,border:"1px solid "+s.bdr,whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.04em"}}>{s.label}</span>;
}

function Pill({count,label,color}){
  if(!count)return null;
  return <span style={{fontSize:10,color,background:color+"1A",border:"1px solid "+color+"50",borderRadius:20,padding:"2px 8px",fontWeight:600,flexShrink:0}}>{count} {label}</span>;
}

function Toast({msg,type}){
  return(
    <div className="animate-fade-up" style={{position:"fixed",top:20,right:20,zIndex:9999,maxWidth:320,background:type==="error"?C.rdBg:C.w,border:"1px solid "+(type==="error"?C.rd:C.ol)+"70",borderRadius:12,padding:"14px 20px",color:type==="error"?C.rd:C.ch,fontSize:13,boxShadow:C.shM,fontWeight:600,display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:24,height:24,borderRadius:"50%",background:type==="error"?C.rd:C.ol,color:C.w,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900}}>{type==="error"?"✕":"✓"}</div>{msg}
    </div>
  );
}

function SectionLabel({text}){ return <div style={{fontSize:10,fontWeight:800,color:C.chL,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:12}}>{text}</div>; }

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
  const total = packed + pending + issues || 1;
  const radius = 40; const circumference = 2 * Math.PI * radius;
  const pPacked = (packed/total)*circumference; const pIssues = (issues/total)*circumference;
  
  return (
    <div className="animate-fade-up" style={{background:C.w, borderRadius:16, padding:"20px", border:"1px solid "+C.bdrL, boxShadow:C.sh, display:"flex", alignItems:"center", gap:20}}>
      <div style={{position:"relative", width:100, height:100}}>
        <svg height="100" width="100" style={{transform: "rotate(-90deg)"}}>
          <circle stroke={C.beige} fill="transparent" strokeWidth="14" r={radius} cx="50" cy="50" />
          <circle stroke={C.rd} fill="transparent" strokeWidth="14" strokeDasharray={`${pIssues} ${circumference}`} style={{transition:"all 1s"}} strokeLinecap="round" r={radius} cx="50" cy="50" />
          <circle stroke={C.ol} fill="transparent" strokeWidth="14" strokeDasharray={`${pPacked} ${circumference}`} strokeDashoffset={-pIssues} style={{transition:"all 1s"}} strokeLinecap="round" r={radius} cx="50" cy="50" />
        </svg>
        <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
          <span style={{fontSize:22, fontWeight:900, color:C.ch, lineHeight:1}}>{Math.round((packed/total)*100)}%</span>
        </div>
      </div>
      <div>
        <div style={{fontSize:14, fontWeight:900, color:C.ch, marginBottom:8}}>Fulfillment Health</div>
        <div style={{display:"flex", gap:10, alignItems:"center", fontSize:13, color:C.chM, fontWeight:600, marginBottom:6}}>
          <span style={{width:10, height:10, borderRadius:"50%", background:C.ol, display:"inline-block", flexShrink:0}}/>
          <span>Ready/Delivered</span>
          <span style={{marginLeft:"auto", fontWeight:900, color:C.ch}}>{packed}</span>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center", fontSize:13, color:C.chM, fontWeight:600, marginBottom:6}}>
          <span style={{width:10, height:10, borderRadius:"50%", background:C.chL, display:"inline-block", flexShrink:0}}/>
          <span>Processing</span>
          <span style={{marginLeft:"auto", fontWeight:900, color:C.ch}}>{pending}</span>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center", fontSize:13, color:C.chM, fontWeight:600, marginBottom:6}}>
          <span style={{width:10, height:10, borderRadius:"50%", background:C.rd, display:"inline-block", flexShrink:0}}/>
          <span>Issues (OOS/Short)</span>
          <span style={{marginLeft:"auto", fontWeight:900, color:C.ch}}>{issues}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({label,val,color}){
  return(
    <div className="hover-lift animate-fade-up" style={{background:C.w,borderRadius:12,padding:"16px 6px",textAlign:"center",border:"1px solid "+C.bdrL,boxShadow:C.sh}}>
      <div style={{fontSize:28,fontWeight:900,color,lineHeight:1,letterSpacing:"-0.03em"}}>{val}</div>
      <div style={{fontSize:9,color:C.chL,marginTop:6,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>{label}</div>
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
  const r = findRecipe(name);
  const [showSteps, setShowSteps] = useState(false);
  if(!r) return null;

  return(
    <div className="animate-fade-in" style={{padding:"16px",background:C.w,borderRadius:12,border:"1px solid "+C.bdrL, boxShadow:C.sh}}>
      <SectionLabel text="Recipe Match"/>
      <div style={{color:C.ch,fontSize:14,fontWeight:800,marginBottom:4}}>{r.recipe_name}</div>
      <div style={{fontSize:11,color:C.chL,marginBottom:16, display:"flex", alignItems:"center", gap:6}}>{r.section && <span style={{background:C.beige, padding:"4px 8px", borderRadius:6, fontWeight:700}}>{r.section}</span>}<span style={{color:C.ol,marginLeft:"auto",fontWeight:900}}>100% Match ✓</span></div>

      <div style={{background:C.off, borderRadius:8, padding:"12px 14px", border:"1px solid "+C.bdr}}>
        <div style={{fontSize:10, fontWeight:800, color:C.chL, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.1em"}}>{r.qty_column_label || "INGREDIENTS"}</div>
        {r.ingredients && r.ingredients.map((ing,i)=>{
          if(ing.type === "stage_label" || !ing.qty) return <div key={i} style={{ marginTop: 12, marginBottom: 6, paddingBottom: 4, borderBottom: "2px solid " + C.bdrL, color: C.olDk, fontSize: 11, fontWeight: 900 }}>{ing.item}</div>;
          return <div key={i} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:12,borderBottom: i === r.ingredients.length-1 ? "none" : "1px solid "+C.bdrL,paddingBottom: i === r.ingredients.length-1 ? 0 : 8,marginBottom: i === r.ingredients.length-1 ? 0 : 8}}><span style={{color:C.chM, fontWeight:600}}>{ing.item}</span><span style={{color:C.olDk,fontFamily:"monospace",fontWeight:800}}>{ing.qty}</span></div>
        })}
      </div>

      {r.steps && r.steps.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowSteps(!showSteps)} className="hover-lift" style={{ background: showSteps ? C.ch : C.olBg, border: "none", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 800, color: showSteps ? C.w : C.olDk, cursor: "pointer", width: "100%", transition: "all 0.2s" }}>
            {showSteps ? "Hide Preparation Steps" : "View Preparation Steps"}
          </button>
          <div className={`accordion-content ${showSteps ? 'open' : ''}`} style={{ marginTop: showSteps ? 12 : 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {r.steps.map(step => <div key={step.step_no} style={{ fontSize: 12, color: C.chM, lineHeight: 1.5, background: C.off, padding: "12px 14px", borderRadius: 8, border: "1px solid " + C.bdrL }}><strong style={{ color: C.olDk, display:"block", marginBottom: 4 }}>Step {step.step_no}</strong>{step.instruction}</div>)}
          </div>
        </div>
      )}
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
    <div className="animate-fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(4px)", zIndex:999, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:20 }}>
      <div className="animate-fade-up" style={{ background:"#0F1422", borderRadius:isMobile?"28px 28px 0 0":24, width:"100%", maxWidth:500, maxHeight:isMobile?"94vh":"auto", display:"flex", flexDirection:"column", boxShadow:C.shM, borderTop:"4px solid #E8920A" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #1A2640" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:C.ch }}>+ Log Unplanned Production</div>
              <div style={{ fontSize:12, color:C.chL, marginTop:4 }}>Record items made outside of today's plan.</div>
            </div>
            <button onClick={onClose} style={{ background:C.off, border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", fontSize:14, color:C.chM }}>✕</button>
          </div>
        </div>

        <div className="custom-scrollbar" style={{ overflowY:"auto", padding:"20px 24px" }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.am, fontWeight:800, marginBottom:6, textTransform:"uppercase" }}>Product Made</div>
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
          {err && <div style={{ color:C.rd, fontSize:12, fontWeight:700, marginTop:12 }}>{err}</div>}
        </div>

        <div style={{ padding:"16px 24px", borderTop:"1px solid #1A2640", background:"#0A0E1A", display:"flex", gap:10, borderRadius:isMobile?"0":"0 0 24px 24px" }}>
          <Btn full onClick={onClose}>Cancel</Btn>
          <Btn full variant="amber" onClick={handleSubmit}>Save Record</Btn>
        </div>
      </div>
    </div>
  );
}

function DailyProductionModal({ dayInfo, onSave, onClose }) {
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
    <div className="animate-fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(4px)", zIndex:999, display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", padding:isMobile?0:20 }}>
      <div className="animate-fade-up" style={{ background:"#0F1422", borderRadius:isMobile?"28px 28px 0 0":24, width:"100%", maxWidth:640, maxHeight:isMobile?"94vh":"88vh", display:"flex", flexDirection:"column", boxShadow:C.shM }}>
        <div style={{ padding:"20px 30px", borderBottom:"1px solid #1A2640", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:C.ch }}>{existing ? "Edit" : "Create"} — {dayInfo.dayOfWeek} {dayInfo.displayDate}</div>
              <div style={{ fontSize:12, color:C.chL, marginTop:4 }}>Add items with quantities and instructions</div>
            </div>
            <button onClick={onClose} style={{ background:C.off, border:"none", borderRadius:"50%", width:36, height:36, cursor:"pointer", fontSize:16, color:C.chM, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
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
            <div style={{ textAlign:"center", padding:"32px", border:"2px dashed "+C.bdrL, borderRadius:12, color:C.chXL, fontWeight:600 }}>No items yet</div>
          ) : items.map((item) => (
            <div key={item.id} className="animate-fade-up" style={{ padding:"14px 18px", background:C.w, border:"1px solid "+C.bdr, borderRadius:12, marginBottom:8, boxShadow:C.sh }}>
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

        <div style={{ padding:"20px 30px", borderTop:"1px solid #1A2640", background:"#0A0E1A", borderRadius:isMobile?"0":"0 0 24px 24px", display:"flex", gap:12, justifyContent:"flex-end" }}>
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
          <div className="animate-fade-in" style={{ display:"flex", gap:6, alignItems:"center", background: "#080C14", padding: "6px 8px", borderRadius: 8, border: "1px solid #1E2A44" }}>
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
  const isMobile = useIsMobile();
  return (
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0, 0, 0, 0.85)",backdropFilter:"blur(4px)",zIndex:9999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20}}>
      <div className="animate-fade-up" style={{background:"#0F1422",borderRadius:isMobile?"28px 28px 0 0":24,width:"100%",maxWidth:500,boxShadow:C.shM, padding: "24px 30px", display:"flex", flexDirection:"column", maxHeight: isMobile?"90vh":"auto"}}>
        <div style={{fontSize:20,fontWeight:900,color:C.ch,letterSpacing:"-0.02em", marginBottom:8}}>Send to Production</div>
        <div style={{fontSize:13,color:C.chL, fontWeight:500, marginBottom: 20}}>Choose how you want to send this item to the kitchen.</div>
        <div style={{background:"#0C1020", padding: 14, borderRadius:12, border:"1px solid "+C.bdrL, marginBottom: 16}}><div style={{fontSize:11, fontWeight:800, color:C.chM, marginBottom:4}}>YOUR ITEM:</div><div style={{fontWeight:800, color:C.ch, fontSize:15}}>{pendingItem.product} <span style={{color:C.olDk}}>({pendingItem.qty} {pendingItem.unit})</span></div></div>
        <Btn variant="primary" full onClick={onNewBatch}>+ Send as NEW Independent Batch</Btn>
        <div style={{textAlign:"center", margin:"16px 0", fontSize:12, fontWeight:700, color:C.chL, textTransform:"uppercase", letterSpacing:"0.1em"}}>— OR MERGE WITH ACTIVE BATCH —</div>
        <div className="custom-scrollbar" style={{display:"flex", flexDirection:"column", gap:8, marginBottom:24, overflowY:"auto", flex:1, maxHeight: 250}}>
          {activeBatches.length === 0 ? <div style={{textAlign:"center", padding:"20px", color:C.chL, fontSize:13, fontWeight:600, border:"2px dashed "+C.bdr, borderRadius:12}}>No other items are currently cooking.</div> : (
            activeBatches.map(b => (
              <button key={b.batchId} onClick={() => onMerge(b.batchId)} className="hover-lift" style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", border:"2px solid "+C.amBgD, background:C.amBg, borderRadius:12, cursor:"pointer", textAlign:"left"}}>
                <div><div style={{fontSize:14, fontWeight:800, color:C.amDk, marginBottom:4}}>{b.product}</div><div style={{fontSize:12, color:C.amDk, opacity:0.8, fontWeight:600}}>{b.items.length} order(s) currently in this batch</div></div><div style={{fontSize:18}}>🔗</div>
              </button>
            ))
          )}
        </div>
        <div style={{display:"flex", gap:10, paddingTop: 16, borderTop: "1px solid #1A2640"}}><Btn full onClick={onCancel}>Cancel</Btn></div>
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:C.w,zIndex:99999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"opacity 0.5s ease"}}>
      <div className="animate-fade-up" style={{display:"flex",flexDirection:"column",alignItems:"center",animationDelay:"0.2s"}}>
        <div style={{width: 160, height: 160, borderRadius: "50%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, margin: "0 auto 24px", boxShadow: "0 4px 16px rgba(26,26,26,0.15)"}}>🍽️</div>
        <div style={{fontSize:24,fontWeight:900,color:C.ch,letterSpacing:"-0.03em"}}>The Food Company</div>
        <div style={{fontSize:12,color:C.chL,letterSpacing:"0.2em",textTransform:"uppercase",fontWeight:700,marginTop:6}}>Operations Hub</div>
        <div style={{marginTop:40, width:40, height:4, background:C.bdrL, borderRadius:4, overflow:"hidden"}}>
          <div style={{width:"100%",height:"100%",background:C.ol,animation:"fadeIn 1.5s infinite alternate"}}/>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onSignIn }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      await onSignIn();
    } catch (e) {
      setError("Sign-in failed. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="animate-fade-in" style={{ minHeight:"100vh", background:"linear-gradient(160deg, #060810 0%, #090D18 60%, #0B1020 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif" }}>
      <div className="animate-fade-up" style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:"#1A1A1A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, margin:"0 auto 24px", boxShadow:"0 4px 24px rgba(211,17,24,0.2)" }}>🍽️</div>
          <div style={{ fontSize:26, fontWeight:900, color:C.ch, letterSpacing:"-0.03em", marginBottom:8 }}>The Food Company</div>
          <div style={{ fontSize:13, color:C.chL, fontWeight:500 }}>Operations Hub — Sign in to continue</div>
        </div>

        <div style={{ background:C.w, borderRadius:20, padding:"32px 28px", border:"1px solid "+C.bdrL, boxShadow:C.shM }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.chM, marginBottom:20, textAlign:"center" }}>Sign in with your Google account</div>

          <button
            onClick={handleClick}
            disabled={loading}
            style={{ width:"100%", padding:"14px 20px", background:"linear-gradient(135deg, #D31118, #8A0B10)", border:"none", borderRadius:12, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, boxShadow:"0 4px 16px rgba(211,17,24,0.35)", opacity:loading?0.7:1, transition:"all 0.2s" }}
          >
            <div style={{ width:24, height:24, borderRadius:"50%", background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:"#D31118", flexShrink:0 }}>G</div>
            <span style={{ fontSize:15, fontWeight:800, color:"#FFFFFF", letterSpacing:"0.01em" }}>{loading ? "Signing in..." : "Continue with Google"}</span>
          </button>

          {error && (
            <div className="animate-fade-in" style={{ marginTop:16, fontSize:12, color:C.rd, fontWeight:700, textAlign:"center", background:C.rdBg, padding:"10px 14px", borderRadius:8 }}>{error}</div>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:32, fontSize:11, color:"#2A3450", fontWeight:600 }}>
          Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur
          <div style={{ fontSize:10, marginTop:6, fontWeight:500, opacity:0.7 }}>© 2026 Made by Banuja Disanayaka</div>
        </div>
      </div>
    </div>
  );
}

function RequestAccessScreen({ authUser, onSubmit, onSignOut }) {
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hov, setHov] = useState(null);
  const isMobile = useIsMobile();

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
    <div className="animate-fade-in custom-scrollbar" style={{ minHeight:"100vh", background:"linear-gradient(160deg, #060810 0%, #090D18 60%, #0B1020 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:540 }}>
        <div className="animate-fade-up" style={{ background:C.w, borderRadius:16, padding:"20px 24px", border:"1px solid "+C.bdrL, boxShadow:C.sh, marginBottom:28, display:"flex", alignItems:"center", gap:16 }}>
          {authUser.photoURL ? (
            <img src={authUser.photoURL} alt="" style={{ width:48, height:48, borderRadius:"50%", border:"2px solid "+C.ol, flexShrink:0 }} />
          ) : (
            <div style={{ width:48, height:48, borderRadius:"50%", background:C.ol, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:"#fff", flexShrink:0 }}>
              {authUser.displayName?.[0] || "?"}
            </div>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.ch, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{authUser.displayName || "Unknown"}</div>
            <div style={{ fontSize:12, color:C.chL, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{authUser.email}</div>
          </div>
          <button onClick={onSignOut} style={{ background:"none", border:"1px solid "+C.bdrL, color:C.chL, padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit" }}>Sign Out</button>
        </div>

        <div className="animate-fade-up" style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:20, fontWeight:900, color:C.ch, letterSpacing:"-0.02em", marginBottom:8 }}>Request Access</div>
          <div style={{ fontSize:13, color:C.chL, fontWeight:500 }}>Select one or more roles you need access to. Your request will be reviewed by the owner.</div>
        </div>

        {submitted ? (
          <div className="animate-fade-up" style={{ background:"rgba(9,115,83,0.15)", border:"1px solid rgba(9,115,83,0.4)", borderRadius:16, padding:"32px 24px", textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:16 }}>✓</div>
            <div style={{ fontSize:18, fontWeight:900, color:"#4ADE80", marginBottom:8 }}>Request Sent!</div>
            <div style={{ fontSize:13, color:C.chM, fontWeight:500 }}>Your request for <strong style={{ color:C.ch }}>{selectedRoles.map(r => ROLES[r]?.label).join(", ")}</strong> access has been submitted. You'll be notified when it's approved.</div>
          </div>
        ) : (
          <>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12, marginBottom:24 }}>
              {Object.entries(ROLES).map(([k, r], i) => {
                const isSelected = selectedRoles.includes(k);
                const isHov = hov === k;
                return (
                  <div key={k} onClick={() => toggleRole(k)} onMouseEnter={() => setHov(k)} onMouseLeave={() => setHov(null)}
                    className="animate-fade-up hover-lift"
                    style={{ animationDelay:`${i*0.05}s`, gridColumn:(!isMobile && i===4)?"1 / -1":"auto", background:isSelected?r.bg:C.w, border:"2px solid "+(isSelected?r.color:isHov?r.color:C.bdrL), borderTop:"3px solid "+r.color, borderRadius:16, padding:"20px 22px", cursor:"pointer", boxShadow:isSelected||isHov?C.shM:C.sh, display:"flex", flexDirection:"column", gap:10, alignItems:"flex-start", transition:"all 0.2s" }}>
                    <div style={{ width:40, height:40, background:r.bg, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:r.color, transition:"transform 0.2s", transform:isHov||isSelected?"scale(1.1)":"scale(1)" }}>{r.icon}</div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:C.ch, marginBottom:3 }}>{r.label}</div>
                      <div style={{ fontSize:12, color:C.chL, lineHeight:1.5, fontWeight:500 }}>{r.desc}</div>
                    </div>
                    {isSelected && <div style={{ fontSize:11, color:r.color, fontWeight:800, marginTop:"auto", paddingTop:6 }}>✓ Selected</div>}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleRequest}
              disabled={selectedRoles.length === 0 || submitting}
              style={{ width:"100%", padding:"15px", background:selectedRoles.length>0?"linear-gradient(135deg, #D31118, #8A0B10)":"#1E2A44", border:"none", borderRadius:12, color:selectedRoles.length>0?"#fff":C.chL, fontSize:15, fontWeight:800, cursor:selectedRoles.length>0&&!submitting?"pointer":"not-allowed", boxShadow:selectedRoles.length>0?"0 4px 16px rgba(211,17,24,0.35)":"none", transition:"all 0.2s", opacity:submitting?0.7:1 }}
            >
              {submitting ? "Sending Request..." : selectedRoles.length > 0 ? `Request Access (${selectedRoles.length} role${selectedRoles.length>1?"s":""})` : "Select Roles Above"}
            </button>
          </>
        )}

        <div style={{ textAlign:"center", marginTop:28, fontSize:11, color:"#2A3450", fontWeight:600 }}>Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur</div>
      </div>
    </div>
  );
}

function PendingScreen({ request, authUser, onSignOut }) {
  return (
    <div className="animate-fade-in" style={{ minHeight:"100vh", background:"linear-gradient(160deg, #060810 0%, #090D18 60%, #0B1020 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif" }}>
      <div className="animate-fade-up" style={{ width:"100%", maxWidth:420 }}>
        <div style={{ background:C.w, borderRadius:16, padding:"20px 24px", border:"1px solid "+C.bdrL, boxShadow:C.sh, marginBottom:24, display:"flex", alignItems:"center", gap:16 }}>
          {authUser.photoURL ? (
            <img src={authUser.photoURL} alt="" style={{ width:44, height:44, borderRadius:"50%", border:"2px solid "+C.bdrL, flexShrink:0 }} />
          ) : (
            <div style={{ width:44, height:44, borderRadius:"50%", background:C.bdrL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:C.chM, flexShrink:0 }}>
              {authUser.displayName?.[0] || "?"}
            </div>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.ch, marginBottom:2 }}>{authUser.displayName}</div>
            <div style={{ fontSize:11, color:C.chL }}>{authUser.email}</div>
          </div>
          <button onClick={onSignOut} style={{ background:"none", border:"1px solid "+C.bdrL, color:C.chL, padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit" }}>Sign Out</button>
        </div>

        <div style={{ background:C.amBg, border:"1px solid "+C.amBgD, borderRadius:20, padding:"40px 32px", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:20 }}>⏳</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.ch, letterSpacing:"-0.02em", marginBottom:12 }}>Awaiting Approval</div>
          <div style={{ fontSize:13, color:C.chM, fontWeight:500, lineHeight:1.6, marginBottom:20 }}>
            Your request for <strong style={{ color:C.am }}>{(request.requestedRoles || [request.requestedRole]).map(r => ROLES[r]?.label || r).join(", ")}</strong> access has been submitted. The owner will review and approve your request.
          </div>
          <div style={{ background:C.w, borderRadius:12, padding:"12px 16px", border:"1px solid "+C.bdrL, display:"inline-flex", alignItems:"center", gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:C.am, display:"inline-block", animation:"pulseSoft 2s infinite" }} />
            <span style={{ fontSize:12, color:C.chM, fontWeight:700 }}>Pending review</span>
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:24, fontSize:11, color:"#2A3450", fontWeight:600 }}>Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur</div>
      </div>
    </div>
  );
}

function ControlPanel({ requests, authorizedUsers, onApprove, onReject, onRemoveUser, onBack, authUser, onSignOut }) {
  const [tab, setTab] = useState("requests");
  const isMobile = useIsMobile();
  const pendingRequests = requests.filter(r => r.status === "pending");

  return (
    <div className="animate-fade-in" style={{ minHeight:"100vh", background:"linear-gradient(160deg, #060810 0%, #090D18 60%, #0B1020 100%)", display:"flex", flexDirection:"column", fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background:"rgba(9,11,16,0.95)", borderBottom:"1px solid "+C.bdrL, padding:"16px 24px", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:C.off, border:"1px solid "+C.bdrL, color:C.chM, padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit" }}>← Back</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:900, color:C.ch }}>Control Panel</div>
          <div style={{ fontSize:11, color:C.chL }}>Owner: {authUser.email}</div>
        </div>
        <button onClick={onSignOut} style={{ background:"none", border:"1px solid "+C.bdrL, color:C.chL, padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit" }}>Sign Out</button>
      </div>

      <div style={{ display:"flex", background:"#0A0C14", borderBottom:"1px solid "+C.bdrL, flexShrink:0 }}>
        {[{ key:"requests", label:`Pending Requests ${pendingRequests.length > 0 ? "("+pendingRequests.length+")" : ""}` }, { key:"users", label:`Manage Users (${authorizedUsers.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:"14px 16px", background:"none", border:"none", borderBottom:"3px solid "+(tab===t.key?C.ol:"transparent"), color:tab===t.key?C.ol:C.chL, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>{t.label}</button>
        ))}
      </div>

      <div className="custom-scrollbar" style={{ flex:1, overflowY:"auto", padding: isMobile ? 20 : 32 }}>
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
  const [hov,setHov]=useState(null); const isMobile = useIsMobile();
  const keys = availableRoles || Object.keys(ROLES);
  return(
    <div className="animate-fade-in custom-scrollbar" style={{minHeight:"100vh",background:"linear-gradient(160deg, #060810 0%, #090D18 60%, #0B1020 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:540}}>
        {authUser && (
          <div className="animate-fade-up" style={{ background:C.w, borderRadius:14, padding:"14px 18px", border:"1px solid "+C.bdrL, boxShadow:C.sh, marginBottom:28, display:"flex", alignItems:"center", gap:12 }}>
            {authUser.photoURL ? (
              <img src={authUser.photoURL} alt="" style={{ width:40, height:40, borderRadius:"50%", border:"2px solid "+(isOwner?C.ol:C.bdrL), flexShrink:0 }} />
            ) : (
              <div style={{ width:40, height:40, borderRadius:"50%", background:isOwner?C.ol:C.bdrL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#fff", flexShrink:0 }}>
                {authUser.displayName?.[0] || "?"}
              </div>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.ch, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{authUser.displayName || "User"}</div>
              <div style={{ fontSize:11, color:isOwner?C.ol:C.chL, fontWeight:isOwner?800:500 }}>{isOwner?"Owner":"Authorized User"}</div>
            </div>
            {isOwner && (
              <button onClick={onControlPanel} style={{ background:C.olBg, border:"1px solid "+C.olBgD, color:C.olDk, padding:"8px 14px", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", flexShrink:0, fontFamily:"inherit", position:"relative" }}>
                Control Panel
                {pendingCount > 0 && <span style={{ position:"absolute", top:-6, right:-6, background:C.rd, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #090D18" }}>{pendingCount}</span>}
              </button>
            )}
            <button onClick={onSignOut} style={{ background:"none", border:"1px solid "+C.bdrL, color:C.chL, padding:"6px 10px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:"inherit" }}>Sign Out</button>
          </div>
        )}
        <div className="animate-fade-up" style={{textAlign:"center",marginBottom:32}}>
          <div style={{width: 64, height: 64, borderRadius: "50%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px", boxShadow: "0 4px 16px rgba(26,26,26,0.15)"}}>🍽️</div>
          <div style={{fontSize:22,fontWeight:900,color:C.ch,letterSpacing:"-0.02em",lineHeight:1}}>Welcome back.</div><div style={{fontSize:14,color:"#8896B3",fontWeight:500,marginTop:8}}>Select your operational role to continue</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",gap:14}}>
          {keys.map((k,i)=>{
            const r=ROLES[k]; if(!r) return null; const isHov=hov===k;
            return(
              <div key={k} onClick={()=>onSelect(k)} onMouseEnter={()=>setHov(k)} onMouseLeave={()=>setHov(null)} className="animate-fade-up hover-lift" style={{animationDelay: `${i * 0.05}s`, gridColumn:(!isMobile && i===4) ? "1 / -1" : "auto", background:C.w,border:"2px solid "+(isHov?r.color:C.bdrL),borderTop:"3px solid "+r.color,borderRadius:16,padding:"22px 24px",cursor:"pointer",boxShadow:isHov?C.shM:C.sh,display:"flex",flexDirection:"column",gap:12,alignItems:"flex-start"}}>
                <div style={{width:44,height:44,background:r.bg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:r.color, transition:"transform 0.2s", transform:isHov?"scale(1.1)":"scale(1)"}}>{r.icon}</div>
                <div><div style={{fontSize:16,fontWeight:800,color:C.ch,marginBottom:4,letterSpacing:"-0.01em"}}>{r.label}</div><div style={{fontSize:12,color:C.chL,lineHeight:1.5, fontWeight:500}}>{r.desc}</div></div>
                <div style={{fontSize:11, color:"#097353", display:"flex", alignItems:"center", gap:6, fontWeight:700, marginTop:"auto", paddingTop:8, background:"rgba(9,115,83,0.15)", padding:"6px 10px", borderRadius:6, width:"fit-content"}}>✓ Tap to enter</div>
              </div>
            );
          })}
        </div>
        <div className="animate-fade-up" style={{textAlign:"center",marginTop:40,fontSize:12,color:"#2A3450", fontWeight:600, animationDelay:"0.4s"}}>Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur<div style={{fontSize: 10, marginTop: 8, fontWeight: 500, opacity: 0.7}}>© 2026 Made by Banuja Disanayaka</div></div>
      </div>
    </div>
  );
}


function NewOrderModal({onClose,onSubmit,notify}){
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
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0, 0, 0, 0.85)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20,fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif"}}>
      <datalist id="recipe-database">
        {RECIPE_DB.map(r => <option key={r.recipe_id} value={r.recipe_name} label={r.item_code ? `${r.recipe_name} · ${r.item_code}` : r.recipe_name} />)}
        {ITEMS_DB.filter(i => {const u=i.name.trim().toUpperCase(); return !RECIPE_DB.some(r=>r.recipe_name&&r.recipe_name.toUpperCase().trim()===u);}).map(i => <option key={i.item_code+"_"+i.name} value={i.name} label={`${i.name} · ${i.item_code}`} />)}
      </datalist>
      <div className="animate-fade-up" style={{background:"#0F1422",borderRadius:isMobile?"28px 28px 0 0":24,width:"100%",maxWidth:720,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column",boxShadow:C.shM}}>
        <div style={{padding:"20px 30px",borderBottom:"1px solid #1A2640",flexShrink:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:20,fontWeight:900,color:C.ch,letterSpacing:"-0.02em"}}>Draft Purchase Order</div><div style={{fontSize:13,color:C.chL,marginTop:4, fontWeight:500}}>Configure details and build your item list below.</div></div><button onClick={onClose} className="hover-lift" style={{background:C.off,border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:16,color:C.chM,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div></div>
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
        <div style={{padding:"20px 30px",borderTop:"1px solid #1A2640",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0, background:"#0A0E1A", borderRadius:isMobile?"0":"0 0 24px 24px"}}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <div style={{background: stagedItems.length > 0 ? C.ch : C.bdrL, color: C.w, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:800, transition:"background 0.3s"}}>
              {stagedItems.length} item{stagedItems.length !== 1 ? "s" : ""}
            </div>
            {stagedItems.length === 0 && <span style={{fontSize:11, color:C.chL, fontWeight:600}}>Add items above</span>}
          </div>
          <div style={{display:"flex",gap:12}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={submitFinalOrder} variant="primary">Submit Order</Btn></div>
        </div>
      </div>
    </div>
  );
}

function EditOrderModal({order, onClose, onSave, notify}){
  const isMobile = useIsMobile(); const [epName, setEpName] = useState(order.poName || ""); const [epDate, setEpDate] = useState(order.orderDate || ""); const [edDate, setEdDate] = useState(order.deliveryDate || ""); const [items, setItems] = useState([...order.items]); const [editId, setEditId] = useState(null); const [ep, setEp] = useState(""); const [eq, setEq] = useState(""); const [eu, setEu] = useState(""); const [np, setNp] = useState(""); const [nq, setNq] = useState(""); const [nu, setNu] = useState("kg");
  function handleSaveInline(){ if(!ep.trim()) return; setItems(prev => prev.map(i => i.id === editId ? {...i, product: ep.trim(), qty: eq, unit: eu} : i)); setEditId(null); } function handleAddNew(e){ e.preventDefault(); if(!np.trim()) { notify("Please enter a product name", "error"); return; } setItems(prev => [{id: "item_added_"+Date.now(), product: np.trim(), qty: nq, unit: nu, status: "pending", packedQty: "", notes: ""}, ...prev]); setNp(""); setNq(""); } function handleRemove(id){ setItems(prev => prev.filter(i => i.id !== id)); } function submit(){ if(items.length === 0){ notify("Order must have at least 1 item. Delete the order instead.", "error"); return; } onSave(order.id, items, {poName: epName, orderDate: epDate, deliveryDate: edDate}); }

  const inputStyle = {padding:"10px 14px",border:"1px solid #1E2A44",borderRadius:10,fontSize:13,color:"#EEF2FF",outline:"none",background:"#111828",width:"100%",boxSizing:"border-box",transition: "border-color 0.2s, box-shadow 0.2s"};

  return(
    <div className="animate-fade-in" style={{position:"fixed",inset:0,background:"rgba(0, 0, 0, 0.85)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:20,fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif"}}>
      <datalist id="recipe-database">
        {RECIPE_DB.map(r => <option key={r.recipe_id} value={r.recipe_name} label={r.item_code ? `${r.recipe_name} · ${r.item_code}` : r.recipe_name} />)}
        {ITEMS_DB.filter(i => {const u=i.name.trim().toUpperCase(); return !RECIPE_DB.some(r=>r.recipe_name&&r.recipe_name.toUpperCase().trim()===u);}).map(i => <option key={i.item_code+"_"+i.name} value={i.name} label={`${i.name} · ${i.item_code}`} />)}
      </datalist>
      <div className="animate-fade-up" style={{background:"#0F1422",borderRadius:isMobile?"28px 28px 0 0":24,width:"100%",maxWidth:720,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column",boxShadow:C.shM}}>
        <div style={{padding:"24px 30px 20px",borderBottom:"1px solid #1A2640",flexShrink:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:20,fontWeight:900,color:C.ch,letterSpacing:"-0.02em"}}>Edit Live Order</div><div style={{fontSize:13,color:C.chL,marginTop:4, fontWeight:500}}>Modify quantities, dates, or remove items.</div></div><button onClick={onClose} className="hover-lift" style={{background:C.off,border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:16,color:C.chM,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div></div>
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
        <div style={{padding:"20px 30px",borderTop:"1px solid #1A2640",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0, background:"#0A0E1A", borderRadius:isMobile?"0":"0 0 24px 24px"}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={submit} variant="primary">✓ Update Live Order</Btn></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ORDER CARD & VIEWS 
═══════════════════════════════════════════════════════════════ */
function OrderCard({order, active, onClick, onDelete, index}){
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
      className={`animate-fade-up hover-lift ${isComplete&&!active?'celebration-card':''}`}
      style={{
        animationDelay:`${index*0.05}s`,
        padding:"14px 16px",borderRadius:14,marginBottom:8,cursor:"pointer",
        background:active?"#141928":"#090C16",
        border:`1.5px solid ${active?rc:C.bdrL}`,
        borderLeft:`4px solid ${active?rc:C.bdrL}`,
        boxShadow:active?"0 8px 28px rgba(0,0,0,0.6),"+rc+"20 -2px 0 0 inset":C.sh,
        transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)"
      }}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,position:"relative"}}>
        <div style={{fontWeight:800,color:C.ch,fontSize:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>
          {order.poName||order.restaurant+" Order"}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8}}>
          {hasIssue&&<span style={{width:7,height:7,borderRadius:"50%",background:"#D31118",animation:"pulseSoft 2s infinite",display:"inline-block"}}/>}
          <span style={{fontSize:13,fontWeight:900,color:pct===100?"#097353":rc}}>{pct}%</span>
        </div>
      </div>

      <div style={{marginBottom:8}}>
        <span style={{fontSize:10,fontWeight:900,color:rc,background:rc+"18",borderRadius:6,padding:"3px 9px",letterSpacing:"0.04em"}}>{order.restaurant}</span>
      </div>

      <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:4,marginBottom:6,overflow:"hidden"}}>
        <div style={{height:4,width:pct+"%",background:pct===100?"#097353":rc,borderRadius:4,transition:"width 0.7s cubic-bezier(0.16,1,0.3,1)",boxShadow:pct===100?"0 0 8px rgba(9,115,83,0.5)":"none"}}/>
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
        <div onClick={e=>{e.stopPropagation();}} style={{paddingTop:10,borderTop:"1px solid #0D1828"}}>
          {!showDel?(
            <button onClick={()=>setShowDel(true)} style={{fontSize:11,color:"#2A3450",background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:600,fontFamily:"inherit"}}>Remove order</button>
          ):(
            <div className="animate-fade-in" style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:11,color:C.rd,fontWeight:700}}>Delete this order?</span>
              <button onClick={()=>{onDelete(order.id);setShowDel(false);}} style={{fontSize:11,color:"#fff",background:C.rd,border:"none",cursor:"pointer",fontWeight:800,padding:"4px 10px",borderRadius:6,fontFamily:"inherit"}}>Yes</button>
              <button onClick={()=>setShowDel(false)} style={{fontSize:11,color:C.chM,background:"#1A2A44",border:"none",cursor:"pointer",fontWeight:700,padding:"4px 10px",borderRadius:6,fontFamily:"inherit"}}>No</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PackingRow({item, orderId, orders, onUpdate, notify, isFirst}){
  const isMobile = useIsMobile();
  const [showEdit, setShowEdit] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [qty, setQty] = useState(item.packedQty || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [showMergeModal, setShowMergeModal] = useState(false);

  function commit(status, extra={}){
    let dQty=qty;
    if(status==='packed'&&!qty&&item.qty){dQty=item.qty;setQty(item.qty);}
    onUpdate(orderId, item.id, {status, packedQty:dQty, notes, updatedAt:Date.now(), ...extra});
    setShowEdit(false); 
    setShowMobileActions(false);
  }
  function handleSendToProduction(){ setShowMergeModal(true); setShowMobileActions(false); }
  function handleShort(){
    if(!qty&&item.qty){ setShowEdit(true); notify("Enter the SENT quantity first, then mark as Short.","error"); setShowMobileActions(false); return; }
    commit('short');
  }
  const getActiveBatches=()=>{
    const b={};
    orders.forEach(o=>o.items.forEach(it=>{ if(it.status==="production"){ const bId=it.batchId||it.id; if(!b[bId]) b[bId]={batchId:bId,product:it.product,items:[]}; b[bId].items.push(it); } }));
    return Object.values(b);
  };

  const borderClass = {
    production:"border-cooking", prod_done:"border-prod-done", packed:"border-packed",
    delivered:"border-delivered", short:"border-short", oos:"border-oos"
  }[item.status] || "border-pending";

  const bgClass = {
    production:"packing-card-cooking", prod_done:"packing-card-prod-done",
    packed:"packing-card-packed", delivered:"packing-card-delivered"
  }[item.status] || "packing-card";

  const SC = {
    pending:{label:"Pending",c:"#8896B3"}, production:{label:"Cooking",c:"#FBB040"},
    prod_done:{label:"Ready to Pack",c:"#4ADE80"}, packed:{label:"Packed ✓",c:"#F87171"},
    delivered:{label:"Delivered 🚀",c:"#EEF2FF"}, short:{label:"Short ⚠",c:"#FBB040"},
    oos:{label:"Out of Stock",c:"#FCA5A5"}
  };
  const cur = SC[item.status] || SC.pending;

  return(
    <>
      {showMergeModal&&<MergeModal pendingItem={item} activeBatches={getActiveBatches()} onMerge={bId=>{commit('production',{batchId:bId});setShowMergeModal(false);}} onNewBatch={()=>{commit('production',{batchId:"b_"+Date.now()+Math.random()});setShowMergeModal(false);}} onCancel={()=>setShowMergeModal(false)}/>}

      <div className="animate-fade-up" style={{position:"relative",overflow:"hidden",borderRadius:12,marginBottom:10,border:"1px solid #0E1828",boxShadow:"0 3px 14px rgba(0,0,0,0.45)"}}>
        
        <div className={`${bgClass} ${borderClass}`} style={{position:"relative",zIndex:2,borderRadius:12,width:"100%"}}>
          <div style={{padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:item.status!=='delivered'?10:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:"#EEF2FF",fontSize:14,fontWeight:800,lineHeight:1.25,marginBottom:4,letterSpacing:"-0.01em"}}>{item.product}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <div style={{fontSize:11,color:item.status==='short'?"#B86F06":"#5A6A8A",fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>
                    {item.status==='short'?`Sent ${item.packedQty||0} / Req ${item.qty} ${item.unit}`:`${item.qty} ${item.unit}`}
                  </div>
                  {(()=>{const code=findItemCode(item.product); return code?<span style={{fontSize:10,fontWeight:900,color:"#D31118",background:"rgba(211,17,24,0.12)",border:"1px solid rgba(211,17,24,0.3)",borderRadius:5,padding:"2px 7px",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em"}}># {code}</span>:null;})()}
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:800,padding:"5px 11px",borderRadius:20,color:cur.c,background:cur.c+"18",border:"1px solid "+cur.c+"35",whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.04em"}}>{cur.label}</span>
            </div>

            {showEdit&&item.status!=='delivered'&&(
              <div className="animate-fade-in" style={{display:"flex",gap:8,marginBottom:12,flexDirection:isMobile?"column":"row",background:"#080C18",padding:12,borderRadius:10,border:"1px solid #0E1828"}}>
                <input value={qty} onChange={e=>setQty(e.target.value)} placeholder="Qty sent" style={{width:isMobile?"100%":"90px",padding:"8px 10px",border:"1px solid #1E2A44",borderRadius:7,fontSize:12,outline:"none",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}/>
                <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Note (optional)" style={{flex:1,padding:"8px 10px",border:"1px solid #1E2A44",borderRadius:7,fontSize:12,outline:"none",fontWeight:500}}/>
                <button onClick={()=>setShowEdit(false)} style={{padding:"8px 14px",background:"#1A2A44",border:"none",borderRadius:7,fontSize:11,fontWeight:800,color:"#B8C4E0",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>Done</button>
              </div>
            )}

            {item.status==='delivered'?(
              <div style={{display:"flex",gap:10,alignItems:"center",background:"#0A0E18",padding:"9px 12px",borderRadius:9}}>
                <span style={{color:"#EEF2FF",fontWeight:800,fontSize:12,flex:1}}>🚀 Dispatched</span>
                <button onClick={()=>commit('packed')} style={{padding:"6px 13px",background:"#1A2A44",border:"none",borderRadius:7,fontSize:11,fontWeight:800,color:"#8896B3",cursor:"pointer",fontFamily:"inherit"}}>Undo</button>
              </div>
            ):item.status==='packed'?(
              <div style={{display:"flex",gap:8}}>
                <button className="dispatch-btn" onClick={()=>commit('delivered')}>🚀 Confirm Dispatch</button>
                <button onClick={()=>commit('pending')} style={{padding:"11px 14px",background:"#1A2A44",border:"none",borderRadius:10,fontSize:11,fontWeight:800,color:"#8896B3",cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>Reset</button>
              </div>
            ):item.status==='short'||item.status==='oos'?(
              <button onClick={()=>commit('pending')} style={{width:"100%",padding:"10px",background:"#1A2A44",border:"none",borderRadius:10,fontSize:12,fontWeight:800,color:"#8896B3",cursor:"pointer",fontFamily:"inherit"}}>↻ Reset to Pending</button>
            ):(
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <button className="pack-btn" onClick={()=>commit('packed')} style={{flex:isMobile?1:"auto",minWidth:isMobile?0:90}}>✓ Pack</button>
                {!isMobile ? (
                  <div style={{display:"flex",gap:6,flex:1}}>
                    {item.status!=='production'&&item.status!=='prod_done'&&(
                      <button onClick={handleSendToProduction} style={{border:"1px solid rgba(184,111,6,0.3)",background:"rgba(184,111,6,0.08)",color:"#B86F06",padding:"8px",borderRadius:8,fontSize:11,fontWeight:800,flex:1,cursor:"pointer",fontFamily:"inherit"}}>◐ Prod</button>
                    )}
                    <button onClick={handleShort} style={{border:"1px solid rgba(232,146,10,0.3)",background:"rgba(232,146,10,0.07)",color:"#E8920A",padding:"8px",borderRadius:8,fontSize:11,fontWeight:800,flex:1,cursor:"pointer",fontFamily:"inherit"}}>⚠ Short</button>
                    <button onClick={()=>commit('oos')} style={{border:"1px solid rgba(220,38,38,0.3)",background:"rgba(220,38,38,0.07)",color:"#DC2626",padding:"8px",borderRadius:8,fontSize:11,fontWeight:800,flex:1,cursor:"pointer",fontFamily:"inherit"}}>✕ OOS</button>
                  </div>
                ) : (
                  <button onClick={()=>setShowMobileActions(!showMobileActions)} style={{background:"#1A2A44", border:"none", color:"#B8C4E0", padding:"13px 14px", borderRadius:10, fontSize:11, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:4}}>
                    {showMobileActions ? "✕" : "⋯ More"}
                  </button>
                )}
                <button onClick={()=>setShowEdit(!showEdit)} style={{border:"none",background:"#0E1828",color:"#5A6A8A",padding:"8px 10px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>✎</button>
              </div>
            )}

            {isMobile && showMobileActions && item.status !== 'delivered' && item.status !== 'packed' && item.status !== 'short' && item.status !== 'oos' && (
              <div className="animate-fade-in" style={{display:"flex",gap:6,marginTop:12,paddingTop:12,borderTop:"1px solid #1E2A44"}}>
                {item.status!=='production'&&item.status!=='prod_done'&&(
                  <button onClick={handleSendToProduction} style={{border:"1px solid rgba(184,111,6,0.3)",background:"rgba(184,111,6,0.08)",color:"#B86F06",padding:"10px",borderRadius:8,fontSize:11,fontWeight:800,flex:1,cursor:"pointer",fontFamily:"inherit"}}>◐ Prod</button>
                )}
                <button onClick={handleShort} style={{border:"1px solid rgba(232,146,10,0.3)",background:"rgba(232,146,10,0.07)",color:"#E8920A",padding:"10px",borderRadius:8,fontSize:11,fontWeight:800,flex:1,cursor:"pointer",fontFamily:"inherit"}}>⚠ Short</button>
                <button onClick={()=>commit('oos')} style={{border:"1px solid rgba(220,38,38,0.3)",background:"rgba(220,38,38,0.07)",color:"#DC2626",padding:"10px",borderRadius:8,fontSize:11,fontWeight:800,flex:1,cursor:"pointer",fontFamily:"inherit"}}>✕ OOS</button>
              </div>
            )}

          </div>
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
  return(
    <div className="animate-fade-in custom-scrollbar">
      <div className="glass-header">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:26,fontWeight:900,color:C.ch,letterSpacing:"-0.03em",marginBottom:6}}>{order.poName || "Packing View"} — <span style={{color:rc}}>{order.restaurant}</span></div>
            <div style={{fontSize:13,color:C.chL, fontWeight:500}}>PO Date: {order.orderDate} {order.deliveryDate ? `· Deliver By: ${order.deliveryDate}` : ""} · {order.items.length} items</div>
          </div>
          <Btn variant="success" onClick={() => window.open(`https://wa.me/?text=${generateWhatsAppMessage(order)}`, "_blank")}>📲 WhatsApp</Btn>
        </div>
      </div>
      <StatRow s={s}/>
      {order.items.map((item, index)=><PackingRow key={item.id} item={item} orderId={order.id} orders={orders} onUpdate={onUpdate} notify={notify} isFirst={index===0}/>)}
    </div>
  );
}

function OrderBatchCard({ batch, idx, onBatchUpdate }) {
  const totalQty = batch.items.reduce((sum, it) => sum + (parseFloat(it.qty) || 0), 0);
  const batchUnit = batch.items[0]?.unit || "kg";
  return(
    <div className="animate-fade-up queue-card" style={{animationDelay:`${idx*0.05}s`}}>
      <div style={{padding:"20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            {batch.items.length > 1 && <div style={{fontSize:10,fontWeight:900,color:C.am,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>⚡ Master Batch</div>}
            <div style={{color:C.ch,fontSize:17,fontWeight:900}}>{batch.displayProduct}</div>
          </div>
          {totalQty > 0 && (
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:32, fontWeight:900, color:C.amDk, lineHeight:1}}>{totalQty}</div>
              <div style={{fontSize:10, color:C.am, fontWeight:800, textTransform:"uppercase"}}>{batchUnit} total</div>
            </div>
          )}
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:6, marginBottom:16}}>
          {batch.items.map((sub, i) => (<div key={i} style={{display:"flex",gap:8,flexWrap:"wrap", alignItems:"center"}}><span style={{fontSize:11,color:sub.restaurant==="Vins"?C.ol:C.am,background:sub.restaurant==="Vins"?C.ol+"1A":C.am+"1A",borderRadius:6,padding:"4px 10px",fontWeight:800}}>{sub.restaurant}</span><span style={{fontSize:11,color:C.chM,background:C.beige,borderRadius:6,padding:"4px 10px",fontWeight:800}}>{sub.poName || "Standard PO"}</span>{sub.qty&&<span style={{fontSize:11,color:C.am,fontFamily:"monospace",fontWeight:800}}>Qty: {sub.qty} {sub.unit}</span>}{sub.notes&&<span style={{fontSize:11,color:C.chM,fontStyle:"italic"}}>({sub.notes})</span>}</div>))}
        </div>
        <div style={{marginBottom:16}}><RecipeCard name={batch.displayProduct}/></div>
        
        <div style={{display:"flex", flexDirection:"column", gap:8, marginTop:16, paddingTop:16, borderTop:"1px solid "+C.bdrL}}>
          <button onClick={() => onBatchUpdate(batch, "prod_done")} className="hover-lift" style={{width:"100%", padding:"14px", background:"#097353", color:"#FFFFFF", border:"none", borderRadius:10, fontSize:14, fontWeight:800, cursor:"pointer", letterSpacing:"0.01em", boxShadow:"0 4px 12px rgba(9,115,83,0.3)"}}>✓ Batch Complete — Mark as Done</button>
          <Btn full size="sm" variant="ghost" onClick={() => onBatchUpdate(batch, "pending")}>↩ Undo Batch</Btn>
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
        <div style={{fontSize:26,fontWeight:900,color:C.ch,letterSpacing:"-0.03em",marginBottom:6}}>Master Production Queue</div>
        <div style={{fontSize:13,color:C.chL, fontWeight:500}}>{relevantDPs.length} daily plan(s) · {totalBatches} active order batch(es) cooking</div>
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
        <div className="animate-fade-up" style={{textAlign:"center",padding:"80px 0",color:C.chXL}}>
          <div style={{fontSize:48,marginBottom:16}}>✓</div>
          <div style={{fontSize:16,fontWeight:700,color:C.chL}}>Kitchen queue is clear</div>
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
        <div style={{fontSize:26,fontWeight:900,color:C.ch,letterSpacing:"-0.03em",marginBottom:6}}>{order.poName || "Live Order Tracker"}</div>
        <div style={{fontSize:13,color:C.chL, fontWeight:500}}>PO Date: {order.orderDate} {order.deliveryDate ? `· Deliver By: ${order.deliveryDate}` : ""}</div>
      </div>
      
      {pct === 100 && (
        <div className="animate-fade-up" style={{background:"linear-gradient(135deg, #097353, #0D8A5E)",borderRadius:14, padding:"18px 20px",marginBottom:20, textAlign:"center",boxShadow:"0 8px 24px rgba(9,115,83,0.3)"}}>
          <div style={{fontSize:28, marginBottom:6}}>🎉</div>
          <div style={{color:"#FFFFFF", fontSize:16, fontWeight:900, marginBottom:4}}>Order Complete!</div>
          <div style={{color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:600}}>All {s.total} items are packed and ready.</div>
        </div>
      )}

      <div className="animate-fade-up" style={{background:C.w, borderRadius:16, padding:"24px 30px", border:"1px solid "+C.bdrL, boxShadow:C.sh, marginBottom:24, display:"flex", alignItems:"center", gap:20}}>
        <ProgressRing radius={ringRadius} stroke={isMobile ? 10 : 8} progress={pct} color={pct === 100 ? "#097353" : C.ol} />
        <div>
          <div style={{fontSize:10, color:C.chL, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:800, marginBottom:4}}>Fulfillment</div>
          <div style={{fontSize: isMobile ? 40 : 32, color: pct===100 ? "#097353" : C.ch, fontWeight:900, lineHeight:1, letterSpacing:"-0.03em"}}>{pct}%</div>
          <div style={{fontSize:11, color:C.chL, marginTop:6, fontWeight:600}}>{s.packed + s.delivered} of {s.total} items</div>
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
  return(
    <div className="animate-fade-in custom-scrollbar">
      <div className="glass-header"><div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}><div><div style={{fontSize:26,fontWeight:900,color:C.ch,letterSpacing:"-0.03em",marginBottom:6}}>{order.poName || "Order Overview"} — <span style={{color:rc}}>{order.restaurant}</span></div><div style={{fontSize:13,color:C.chL, fontWeight:500}}>PO Date: {order.orderDate} {order.deliveryDate ? `· Deliver By: ${order.deliveryDate}` : ""} · {order.items.length} line items</div></div><div style={{display:"flex", gap:10}}><Btn variant="success" onClick={() => window.open(`https://wa.me/?text=${generateWhatsAppMessage(order)}`, "_blank")}>📲 WhatsApp</Btn><Btn variant="amber" onClick={()=>onEditOrder(order)}>✏️ Edit</Btn></div></div></div>
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
  const totals={total:0,packed:0,delivered:0,short:0,oos:0,prod:0,prod_done:0,pending:0}; 
  orders.forEach(o=>{const s=oStats(o);Object.keys(totals).forEach(k=>{totals[k]+=(s[k]||0);});});
  
  if(orders.length === 0) return (
    <div className="animate-fade-up" style={{textAlign:"center", padding:"60px 20px", background:C.w, borderRadius:16, border:"1px solid "+C.bdrL}}>
      <div style={{fontSize:56, marginBottom:16}}>📋</div>
      <div style={{fontSize:18, fontWeight:900, color:C.ch, marginBottom:8}}>No orders yet</div>
      <div style={{fontSize:13, color:C.chL, fontWeight:500, maxWidth:280, margin:"0 auto 24px"}}>Tap the + Create Order button in the sidebar to add your first order.</div>
      <div style={{fontSize:12, color:C.chL, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8}}><span style={{fontSize:16}}>←</span> Start from the sidebar</div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div style={{marginBottom:24}}><AdminDonutChart packed={totals.packed + totals.delivered} pending={totals.prod + totals.prod_done + totals.pending} issues={totals.short + totals.oos} /></div>
      <StatRow s={totals}/>
      <SectionLabel text="Recent Orders"/>
      {orders.slice(0,5).map((o, idx)=>{ const s=oStats(o); const rc=o.restaurant==="Vins"?C.ol:C.am; const pct=s.total?Math.round(((s.packed + s.delivered)/s.total)*100):0; return( <div key={o.id} className={`animate-fade-up hover-lift ${pct===100?'celebration-card':''}`} style={{animationDelay:`${idx*0.05}s`, background:C.w,borderRadius:14,border:"1px solid "+C.bdrL,padding:"16px 20px",marginBottom:10,boxShadow:C.sh}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:12,fontWeight:900,color:rc,background:rc+"1A",borderRadius:6,padding:"4px 10px"}}>{o.restaurant}</span><span style={{fontSize:12,color:C.chL, fontWeight:600}}>{o.poName || o.orderDate}</span></div><span style={{fontSize:14,fontWeight:800,color:pct===100?C.ol:C.ch}}>{pct}%</span></div><div style={{height:6,background:C.bdrL,borderRadius:99,overflow:"hidden"}}><div style={{height:6,width:pct+"%",background:C.ol,borderRadius:99, transition:"width 0.8s cubic-bezier(0.16, 1, 0.3, 1)"}}/></div></div> ); })}
    </div>
  );
}

function DailyProductionsTab({ weekDays, selectedWeek, weekDPs, hasDrafts, onShiftWeek, onCreateDP, onUpdateDP, onDeleteDP, onActivateWeek }) {
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
          <button onClick={() => onShiftWeek(-1)} className="hover-lift" style={{padding:"6px 12px",background:"#111828",border:"1px solid #1E2A44",borderRadius:7,fontSize:11,color:C.chL,fontWeight:700,cursor:"pointer"}}>◀ Prev</button>
          <button onClick={() => onShiftWeek(1)} className="hover-lift" style={{padding:"6px 12px",background:C.olBg,border:"1px solid "+C.olBgD,borderRadius:7,fontSize:11,color:C.ol,fontWeight:800,cursor:"pointer"}}>Next ▶</button>
        </div>
      </div>

      {weekDays.map(day => {
        if (!day.dp) {
          return (
            <div key={day.date} style={{background:"#141928",border:"2px dashed #1E2A44",borderRadius:10,padding:14,textAlign:"center",color:C.chXL,fontSize:12,fontWeight:700,marginBottom:8}}>
              {day.dayOfWeek} {day.displayDate} — No production planned &nbsp; 
              <button onClick={() => setEditingDay(day)} className="hover-lift" style={{background:"none",border:"none",color:C.ol,fontWeight:800,cursor:"pointer"}}>+ Create</button>
            </div>
          );
        }
        
        return (
          <div key={day.date} style={{background:"#0A0C14",border:"1px solid #1E2A44",borderRadius:14,padding:16,margin:"12px 0",fontSize:12}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:"1.5px",textTransform:"uppercase",color:C.chM,marginBottom:12,paddingBottom:10,borderBottom:"1px solid "+C.bdrL, display:"flex", alignItems:"center", gap:8}}>
              {day.dayOfWeek} · {day.displayDate}
              <span style={{ fontSize:9, fontWeight:900, padding:"2px 6px", borderRadius:6, background: day.dp.status === 'active' ? "rgba(22, 163, 74, 0.15)" : "rgba(136, 150, 179, 0.15)", color: day.dp.status === 'active' ? "#4ADE80" : "#8896B3" }}>
                {day.dp.status.toUpperCase()}
              </span>
            </div>
            {day.dp.items.map(item => (
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+C.bdrL,fontSize:11}}>
                <div>
                  <div style={{fontWeight:800,color:C.ch, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
                    {item.product}
                    {item.status === 'prod_done' && <span style={{background: "rgba(22, 163, 74, 0.15)", color: "#4ADE80", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(22, 163, 74, 0.3)" }}>✓ DONE</span>}
                    {item.isExtra && <span style={{background: "rgba(184, 111, 6, 0.15)", color: "#E8920A", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(184, 111, 6, 0.3)" }}>+ EXTRA</span>}
                  </div>
                  {item.recipeName && <div style={{fontSize:10,color:C.ol,fontWeight:700,marginTop:2}}>📖 Recipe matched</div>}
                  {!item.recipeName && <div style={{fontSize:10,color:C.chL,marginTop:2}}>Custom item</div>}
                  {item.notes && <div style={{fontSize:10,color:C.chL,marginTop:2, fontStyle:"italic"}}>📝 {item.notes}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <div style={{fontFamily:"monospace",fontWeight:700,color:C.am,fontSize:10}}>Plan: {item.kgQty} kg {item.packetQty > 0 ? `| ${item.packetQty} pkts` : ''}</div>
                  {item.status === 'prod_done' && (
                    <div style={{fontFamily:"monospace",fontWeight:700,color:"#4ADE80",fontSize:10}}>
                      Act: {item.actualKgQty ?? item.kgQty} kg {item.actualPacketQty > 0 || item.packetQty > 0 ? `| ${item.actualPacketQty ?? item.packetQty} pkts` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div style={{marginTop:10,paddingTop:10,display:"flex",gap:8}}>
              <button onClick={() => setEditingDay(day)} className="hover-lift" style={{flex:1,padding:8,background:C.amBg,border:"1px solid "+C.amBgD,borderRadius:8,fontSize:11,fontWeight:800,color:C.am,cursor:"pointer"}}>✎ Edit Day</button>
              <button onClick={() => { if(window.confirm("Delete this day's plan?")) onDeleteDP(day.dp.id); }} className="hover-lift" style={{flex:1,padding:8,background:C.rdBg,border:"1px solid "+C.rdBg,borderRadius:8,fontSize:11,fontWeight:800,color:C.rd,cursor:"pointer"}}>🗑 Remove</button>
            </div>
          </div>
        );
      })}

      {weekDPs.length > 0 && (
        <div style={{display:"flex",gap:10,marginTop:16,paddingTop:16,borderTop:"1px solid #1E2A44"}}>
          <div style={{flex:1,padding:12,background:"#111828",border:"1px solid #1E2A44",borderRadius:9,fontSize:12,fontWeight:800,color:hasDrafts ? C.chL : "#097353",textAlign:"center"}}>
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
            <div style={{ fontSize:26, fontWeight:900, color:C.ch, letterSpacing:"-0.03em", marginBottom:4 }}>
              {adminTab === "orders" ? "Dashboard" : "Daily Productions"}
            </div>
            <div style={{ fontSize:13, color:C.chL, fontWeight:500 }}>
              {adminTab === "orders" ? `${orders.length} active orders` : `Planning week`}
            </div>
          </div>
          <div style={{ display:"flex", background:"#0C1020", borderRadius:10, border:"1px solid "+C.bdrL, padding:4 }}>
            {[{key:"orders",label:"Orders"},{key:"daily",label:"📋 Productions"}].map(tab => (
              <button key={tab.key} onClick={() => setAdminTab(tab.key)}
                style={{ padding:"8px 16px", border:"none",
                  background: adminTab===tab.key ? (tab.key==="daily" ? C.olBg : C.w) : "transparent",
                  borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                  color: adminTab===tab.key ? (tab.key==="daily" ? C.olDk : C.ch) : C.chL,
                  boxShadow: adminTab===tab.key ? C.sh : "none", transition:"all 0.2s"
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
  const [phase,setPhase]=useState("select"); const [role,setRole]=useState(null);

  const [orders,setOrders]=useState([]);
  const [dailyProductions, setDailyProductions] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

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
    const unsubRecord = onSnapshot(doc(db, "authorized_users", authUser.email), (snap) => {
      setUserRecord(snap.exists() ? snap.data() : null);
      setUserRecordLoading(false);
    });

    const q = query(collection(db, "access_requests"), where("email", "==", authUser.email), where("status", "==", "pending"));
    const unsubReq = onSnapshot(q, (snap) => {
      setAccessRequest(snap.empty ? null : snap.docs[0].data());
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
    catch(e) { notify("Sign-in failed. Please try again.", "error"); }
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

  function selectRole(r){ setRole(r); setPhase("app"); }

  if (splashState === "visible" || splashState === "fading") return ( <><style>{GLOBAL_STYLES}</style><div style={{ opacity: splashState === "fading" ? 0 : 1, transition: "opacity 0.5s ease" }}><SplashScreen /></div></> );

  // Auth loading
  if (authLoading) return (<><style>{GLOBAL_STYLES}</style><SplashScreen /></>);

  // Not logged in
  if (!authUser) return (<><style>{GLOBAL_STYLES}</style><LoginScreen onSignIn={handleGoogleSignIn} /></>);

  // Loading user's Firestore record
  if (userRecordLoading) return (<><style>{GLOBAL_STYLES}</style><SplashScreen /></>);

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
      if (accessRequest) {
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
        if (!activeOrder) return( <div className="animate-fade-in" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:10}}><div style={{fontSize:48,color:C.chXL, animation:"fadeUp 1s ease infinite alternate"}}>👈</div><div style={{fontSize:16,fontWeight:800,color:C.ch}}>Select an order</div></div> );
        return <PackingView order={activeOrder} onUpdate={updateItem} orders={orders} notify={notify}/>;
      }
      
      if (role === "vins" || role === "manja") {
        if (!activeOrder) return( <div className="animate-fade-in" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:10}}><div style={{fontSize:48,color:C.chXL, animation:"fadeUp 1s ease infinite alternate"}}>{viewOrders.length===0?"📋":"👈"}</div><div style={{fontSize:16,fontWeight:800,color:C.ch}}>{viewOrders.length===0?"No orders yet":"Select an order"}</div></div> );
        return <OrderingView order={activeOrder}/>;
      }
    };

    AppContent = (
      <div className="animate-fade-in" style={{height:"100vh",display:"flex",flexDirection:"column",background:C.beige,fontFamily:"'Plus Jakarta Sans', 'Segoe UI',system-ui,sans-serif",overflow:"hidden"}}>
        {toast&&<Toast msg={toast.msg} type={toast.type}/>}
        {showModal&&<NewOrderModal onClose={()=>setShowModal(false)} onSubmit={handleNewOrder} notify={notify}/>}
        {editingOrder&&<EditOrderModal order={editingOrder} onClose={()=>setEditingOrder(null)} onSave={saveOrderEdit} notify={notify}/>}

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",background:"rgba(9, 11, 16, 0.95)",borderBottom:"1px solid #1E2A44",boxShadow:"0 1px 0 #1A2235",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",flexShrink:0,zIndex:60}}>
          <div style={{display:"flex",alignItems:"center",gap:isMobile ? 12 : 16}}>
            {isMobile && ( <button onClick={() => setSidebarOpen(true)} style={{background:"none", border:"none", fontSize:24, cursor:"pointer", padding:0, color: C.ch, marginRight: 4}}>☰</button> )} 
            <div style={{width: 40, height: 40, borderRadius: "50%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 16px rgba(26,26,26,0.15)"}}>🍽️</div> 
            <div>
              <div style={{fontSize:isMobile ? 14 : 15,fontWeight:900,color:"#EEF2FF",letterSpacing:"-0.01em",lineHeight:1}}>Order Tracking</div>
              <div style={{display:"flex", alignItems:"center", gap:6, marginTop:4}}>
                <span style={{display:"inline-block", width: isMobile ? 8 : 6, height: isMobile ? 8 : 6, background: C.ol, borderRadius:"50%", animation:"pulseSoft 2s infinite"}}/>
                {!isMobile && <span style={{fontSize:10, color:C.ol, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:800}}>Live</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{position:"relative"}}>
              <span style={{fontSize:isMobile ? 11 : 12,fontWeight:800,color:roleConfig.color,background:roleConfig.bg,border:"1px solid "+roleConfig.color+"40",borderRadius:20,padding:isMobile ? "6px 10px" : "6px 14px",letterSpacing:"0.02em", whiteSpace: "nowrap", boxShadow:C.sh}}>{roleConfig.icon} {!isMobile && roleConfig.label}</span>
              {totalIssues > 0 && (
                <span style={{position:"absolute", top:-6, right:-6, background:"#D31118", color:"#FFFFFF", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #0E1018", animation:"pulseSoft 2s infinite"}}>{totalIssues}</span>
              )}
            </div>
            <Btn size="sm" variant="dark" onClick={()=>{setPhase("select");setRole(null);setActiveId(null);}}>Roles</Btn>
          </div>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden", position: "relative"}}>
          {isMobile && sidebarOpen && ( <div className="animate-fade-in" onClick={() => setSidebarOpen(false)} style={{position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter:"blur(2px)", zIndex: 40}} /> )}
          
          <div className="custom-scrollbar" style={{ width: 280, borderRight:"1px solid #131D30", background:"#0A0C14", padding:16, overflowY:"auto", flexShrink:0, display:"flex", flexDirection:"column", gap:6, position: isMobile ? "absolute" : "relative", zIndex: 50, height: "100%", left: 0, top: 0, transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none", transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: isMobile && sidebarOpen ? C.shM : "none" }}>
            {role==="admin"&&( <div style={{marginBottom:10}}><button className="hover-lift" onClick={()=>{setShowModal(true); if(isMobile) setSidebarOpen(false);}} style={{width:"100%",padding:"14px 0",border:"none",borderRadius:12,background:"linear-gradient(135deg, #D31118, #8A0B10)",color:"#FFFFFF",fontSize:14,cursor:"pointer",fontWeight:800,letterSpacing:"0.02em",boxShadow:"0 4px 16px rgba(211,17,24,0.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:8, animation:"pulseSoft 3s infinite"}}><span style={{fontSize:18}}>+</span> Create Order</button></div> )}
            {role==="production"&&( <div style={{padding:"14px 16px",background:C.amBg,borderRadius:12,border:"1px solid "+C.amBgD,marginBottom:10}}><div style={{fontSize:11,fontWeight:900,color:C.amDk,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Production Mode</div><div style={{fontSize:12,color:C.chM,lineHeight:1.4, fontWeight:500}}>Showing all items flagged for production.</div></div> )}
            <div style={{fontSize:10,fontWeight:900,color:C.chL,textTransform:"uppercase",letterSpacing:"0.14em",padding:"10px 4px 6px"}}>Orders {viewOrders.length>0?`(${viewOrders.length})`:""}</div>
            
            {loadingInitial ? (
              <div style={{padding:"10px 0"}}><div className="skeleton-box" style={{height:80, marginBottom:10}}></div><div className="skeleton-box" style={{height:80}}></div></div>
            ) : viewOrders.length===0 ? <div style={{fontSize:13,color:C.chXL,textAlign:"center",padding:"32px 0", fontWeight:600}}>No orders found</div> : viewOrders.map((o, i)=>( <OrderCard key={o.id} index={i} order={o} active={activeId===o.id} onClick={()=>{setActiveId(o.id); if(isMobile) setSidebarOpen(false);}} onDelete={role==="admin"?deleteOrder:null} /> ))}
            
            <div style={{marginTop: "auto", paddingTop: 20, textAlign: "center", fontSize: 10, color: "#2A3450", fontWeight: 500}}>© 2026 Made by Banuja Disanayaka</div>
          </div>
          
          <div className="custom-scrollbar" style={{flex:1,overflowY:"auto",padding:isMobile ? "20px" : "32px 40px",background:C.off, width: "100%", position:"relative"}}>{renderMain()}</div>
        </div>
      </div>
    );
  }

  return ( <><style>{GLOBAL_STYLES}</style>{AppContent}</> );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TFCOrderSystem />
    </ErrorBoundary>
  );
}