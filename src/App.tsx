import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

// ⚠️ Automatically imports your newly uploaded JSON database!
import recipeData from "./TFC_Recipes_Database.json";
const RECIPE_DB = recipeData || [];

/* ═══════════════════════════════════════════════════════════════
   PREMIUM CSS ANIMATIONS (The "Wow" Factor)
═══════════════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pulseSoft {
    0% { box-shadow: 0 0 0 0 rgba(211, 17, 24, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(211, 17, 24, 0); }
    100% { box-shadow: 0 0 0 0 rgba(211, 17, 24, 0); }
  }
  .animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
  .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(26,26,26,0.12); }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #D9D3C8; border-radius: 10px; }
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
  measurementId: "G-Y7FGTNSZZL",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ═══════════════════════════════════════════════════════════════
   HELPERS & HOOKS
═══════════════════════════════════════════════════════════════ */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

// Updated to use the new 'recipe_name' key from your JSON
function findRecipe(name) {
  if (!name) return null;
  const exactMatch = RECIPE_DB.find(
    (r) =>
      r.recipe_name &&
      r.recipe_name.toUpperCase().trim() === name.toUpperCase().trim()
  );
  return exactMatch ? { ...exactMatch, matchScore: 1 } : null;
}

// Updated Offline Bulk Scanner to use the new JSON format
function findRecipeFuzzyBulk(lineText) {
  const cleanLine = lineText
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .trim();
  let bestMatch = null;
  let bestScore = 0;

  for (const r of RECIPE_DB) {
    if (!r.recipe_name) continue;
    const words = r.recipe_name.split(" ").filter((w) => w.length > 2);
    let matchCount = 0;
    words.forEach((w) => {
      if (cleanLine.includes(w)) matchCount++;
    });
    const score = matchCount / words.length;
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = r.recipe_name;
    }
  }
  return bestMatch;
}

function oStats(o) {
  const i = o.items;
  return {
    total: i.length,
    packed: i.filter((x) => x.status === "packed").length,
    short: i.filter((x) => x.status === "short").length,
    oos: i.filter((x) => x.status === "oos").length,
    prod: i.filter((x) => x.status === "production").length,
    pending: i.filter((x) => x.status === "pending").length,
  };
}

function fmtDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ═══════════════════════════════════════════════════════════════
   CONFIG & PALETTE
═══════════════════════════════════════════════════════════════ */
const PWD = "tfc@123";
const UNITS = [
  "kg",
  "g",
  "pkt",
  "nos",
  "btl",
  "ctn",
  "ltr",
  "tray",
  "box",
  "pc",
  "reel",
  "can",
  "portion",
];

const C = {
  w: "#FFFFFF",
  off: "#FAFAF7",
  beige: "#F4EFE5",
  beigeD: "#EBE3D4",
  ch: "#1A1A1A",
  chM: "#3D3D3D",
  chL: "#757575",
  chXL: "#BBBBBB",
  bdr: "#D9D3C8",
  bdrL: "#EDE8DE",
  ol: "#D31118",
  olDk: "#A50D12",
  olBg: "#FBE8E8",
  olBgD: "#F4C1C3", // Official TFC Red Theme
  am: "#B56B22",
  amDk: "#7E4A10",
  amBg: "#FBF0E0",
  amBgD: "#F0D8B0",
  rd: "#8A3828",
  rdBg: "#FAEAE6",
  sh: "0 1px 4px rgba(26,26,26,0.06),0 2px 12px rgba(26,26,26,0.04)",
  shM: "0 8px 30px rgba(26,26,26,0.08),0 2px 10px rgba(26,26,26,0.04)",
};

const ROLES = {
  admin: {
    label: "Admin",
    icon: "⚙",
    color: C.ch,
    accent: C.ol,
    bg: C.beige,
    pwd: true,
    desc: "Create and manage all orders",
  },
  packing: {
    label: "Packing",
    icon: "◻",
    color: C.ol,
    accent: C.ol,
    bg: C.olBg,
    pwd: true,
    desc: "Update item status per order",
  },
  production: {
    label: "Production",
    icon: "◈",
    color: C.am,
    accent: C.am,
    bg: C.amBg,
    pwd: true,
    desc: "Production queue with recipes",
  },
  vins: {
    label: "Vins Kitchen",
    icon: "V",
    color: C.chM,
    accent: C.chM,
    bg: C.beige,
    pwd: false,
    desc: "Live status of your orders",
  },
  manja: {
    label: "Manja Kitchen",
    icon: "M",
    color: C.amDk,
    accent: C.amDk,
    bg: C.amBg,
    pwd: false,
    desc: "Live status of your orders",
  },
};

const SC = {
  pending: { label: "Pending", c: C.chL, bg: C.beige, bdr: C.bdr },
  packed: { label: "Packed ✓", c: C.ol, bg: C.olBg, bdr: "#ECA9AB" },
  short: { label: "Short ⚠", c: C.am, bg: C.amBg, bdr: "#D4A86A" },
  oos: { label: "Out of Stock", c: C.rd, bg: C.rdBg, bdr: "#C09080" },
  production: { label: "In Production", c: C.amDk, bg: C.amBg, bdr: "#D4A86A" },
};

/* ═══════════════════════════════════════════════════════════════
   MICRO COMPONENTS
═══════════════════════════════════════════════════════════════ */
function Badge({ status }) {
  const s = SC[status] || SC.pending;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 11px",
        borderRadius: 20,
        color: s.c,
        background: s.bg,
        border: "1px solid " + s.bdr,
        whiteSpace: "nowrap",
        flexShrink: 0,
        letterSpacing: "0.04em",
      }}
    >
      {s.label}
    </span>
  );
}

function Pill({ count, label, color }) {
  if (!count) return null;
  return (
    <span
      style={{
        fontSize: 10,
        color,
        background: color + "1A",
        border: "1px solid " + color + "50",
        borderRadius: 20,
        padding: "2px 8px",
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {count} {label}
    </span>
  );
}

function Toast({ msg, type }) {
  return (
    <div
      className="animate-fade-up"
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 320,
        background: type === "error" ? C.rdBg : C.w,
        border: "1px solid " + (type === "error" ? C.rd : C.ol) + "70",
        borderRadius: 12,
        padding: "14px 20px",
        color: type === "error" ? C.rd : C.ch,
        fontSize: 13,
        boxShadow: C.shM,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: type === "error" ? C.rd : C.ol,
          color: C.w,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {type === "error" ? "✕" : "✓"}
      </div>
      {msg}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.bdrL, margin: "20px 0" }} />;
}

function SectionLabel({ text }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        color: C.chL,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        marginBottom: 12,
      }}
    >
      {text}
    </div>
  );
}

function StatCard({ label, val, color }) {
  return (
    <div
      className="hover-lift animate-fade-up"
      style={{
        background: C.w,
        borderRadius: 12,
        padding: "16px 6px",
        textAlign: "center",
        border: "1px solid " + C.bdrL,
        boxShadow: C.sh,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color,
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {val}
      </div>
      <div
        style={{
          fontSize: 9,
          color: C.chL,
          marginTop: 6,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function StatRow({ s }) {
  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 60 }}>
        <StatCard label="Total" val={s.total} color={C.chM} />
      </div>
      <div style={{ flex: "1 1 auto", minWidth: 60 }}>
        <StatCard label="Packed" val={s.packed} color={C.ol} />
      </div>
      <div style={{ flex: "1 1 auto", minWidth: 60 }}>
        <StatCard label="Short" val={s.short} color={C.am} />
      </div>
      <div style={{ flex: "1 1 auto", minWidth: 60 }}>
        <StatCard label="OOS" val={s.oos} color={C.rd} />
      </div>
      <div style={{ flex: "1 1 auto", minWidth: 60 }}>
        <StatCard label="Prod" val={s.prod} color={C.amDk} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ULTIMATE RECIPE CARD (Reads Stage Labels & Steps natively!)
═══════════════════════════════════════════════════════════════ */
function RecipeCard({ name }) {
  const r = findRecipe(name);
  const [showSteps, setShowSteps] = useState(false);

  if (!r)
    return (
      <div
        className="animate-fade-in"
        style={{
          padding: "12px 14px",
          background: C.beige,
          borderRadius: 10,
          border: "1px dashed " + C.bdr,
        }}
      >
        <SectionLabel text="Recipe" />
        <div style={{ fontSize: 12, color: C.chL, fontWeight: 500 }}>
          No exact recipe match found. Item must be spelled exactly as in DB.
        </div>
      </div>
    );

  return (
    <div
      className="animate-fade-in"
      style={{
        padding: "16px",
        background: C.w,
        borderRadius: 12,
        border: "1px solid " + C.bdrL,
        boxShadow: C.sh,
      }}
    >
      <SectionLabel text="Recipe Match" />
      <div
        style={{ color: C.ch, fontSize: 14, fontWeight: 800, marginBottom: 4 }}
      >
        {r.recipe_name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: C.chL,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {r.section && (
          <span
            style={{
              background: C.beige,
              padding: "4px 8px",
              borderRadius: 6,
              fontWeight: 700,
            }}
          >
            {r.section}
          </span>
        )}
        {r.portion && (
          <span
            style={{
              background: C.beige,
              padding: "4px 8px",
              borderRadius: 6,
              fontWeight: 700,
            }}
          >
            {r.portion}
          </span>
        )}
        <span style={{ color: C.ol, marginLeft: "auto", fontWeight: 900 }}>
          100% Match ✓
        </span>
      </div>

      {/* Structured Ingredients List */}
      <div
        style={{
          background: C.off,
          borderRadius: 8,
          padding: "12px 14px",
          border: "1px solid " + C.bdr,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: C.chL,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {r.qty_column_label || "INGREDIENTS"}
        </div>
        {r.ingredients &&
          r.ingredients.map((ing, i) => {
            // Support for "stage_label" grouping in the JSON!
            if (ing.type === "stage_label" || !ing.qty) {
              return (
                <div
                  key={i}
                  style={{
                    marginTop: 12,
                    marginBottom: 6,
                    paddingBottom: 4,
                    borderBottom: "2px solid " + C.bdrL,
                    color: C.olDk,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.05em",
                  }}
                >
                  {ing.item}
                </div>
              );
            }
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  fontSize: 12,
                  borderBottom:
                    i === r.ingredients.length - 1
                      ? "none"
                      : "1px solid " + C.bdrL,
                  paddingBottom: i === r.ingredients.length - 1 ? 0 : 8,
                  marginBottom: i === r.ingredients.length - 1 ? 0 : 8,
                }}
              >
                <span style={{ color: C.chM, fontWeight: 600 }}>
                  {ing.item}
                </span>
                <span
                  style={{
                    color: C.olDk,
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                    fontWeight: 800,
                  }}
                >
                  {ing.qty}
                </span>
              </div>
            );
          })}
      </div>

      {/* Interactive Preparation Steps */}
      {r.steps && r.steps.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="hover-lift"
            style={{
              background: showSteps ? C.ch : C.olBg,
              border: "none",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              color: showSteps ? C.w : C.olDk,
              cursor: "pointer",
              width: "100%",
              transition: "all 0.2s",
            }}
          >
            {showSteps ? "Hide Preparation Steps" : "View Preparation Steps"}
          </button>
          {showSteps && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {r.steps.map((step) => (
                <div
                  key={step.step_no}
                  style={{
                    fontSize: 12,
                    color: C.chM,
                    lineHeight: 1.5,
                    background: C.off,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid " + C.bdrL,
                  }}
                >
                  <strong
                    style={{ color: C.olDk, display: "block", marginBottom: 4 }}
                  >
                    Step {step.step_no}
                  </strong>
                  {step.instruction}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Operational Notes */}
      {r.notes && r.notes.length > 0 && (
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: C.chL,
            fontStyle: "italic",
            padding: "10px 14px",
            background: C.beige,
            borderRadius: 8,
          }}
        >
          {r.notes.map((note, idx) => (
            <div key={idx} style={{ marginBottom: 4 }}>
              * {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "ghost",
  disabled = false,
  full = false,
  size = "md",
  type = "button",
}) {
  const [hov, setHov] = useState(false);
  const pad = size === "sm" ? "8px 16px" : "12px 24px";
  const fs = size === "sm" ? 12 : 14;
  let bg, color, border;
  if (variant === "primary") {
    bg = hov ? C.olDk : C.ol;
    color = C.w;
    border = "none";
  } else if (variant === "amber") {
    bg = hov ? C.amDk : C.am;
    color = C.w;
    border = "none";
  } else if (variant === "danger") {
    bg = hov ? C.rd : C.rdBg;
    color = C.rd;
    border = "1px solid " + C.rd + "60";
  } else {
    bg = hov ? C.beige : "transparent";
    color = C.chM;
    border = "1px solid " + C.bdr;
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: pad,
        border,
        borderRadius: 10,
        background: bg,
        color,
        fontSize: fs,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        width: full ? "100%" : "auto",
        opacity: disabled ? 0.5 : 1,
        letterSpacing: "0.01em",
        transform: hov && !disabled ? "translateY(-2px)" : "none",
        boxShadow: hov && !disabled ? C.sh : "none",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCREENS
═══════════════════════════════════════════════════════════════ */

function SplashScreen() {
  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        background: C.w,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.5s ease",
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animationDelay: "0.2s",
        }}
      >
        {/* Grabs your uploaded logo.jpg from the public folder */}
        <img
          src="/logo.jpg"
          alt="TFC Logo"
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            boxShadow: C.shM,
            marginBottom: 24,
            objectFit: "cover",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: C.ch,
            letterSpacing: "-0.03em",
          }}
        >
          The Food Company
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.chL,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginTop: 6,
          }}
        >
          Operations Hub
        </div>
        <div
          style={{
            marginTop: 40,
            width: 40,
            height: 4,
            background: C.bdrL,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: C.ol,
              animation: "fadeIn 1.5s infinite alternate",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function RoleSelectScreen({ onSelect }) {
  const [hov, setHov] = useState(null);
  const isMobile = useIsMobile();
  const keys = Object.keys(ROLES);
  return (
    <div
      className="animate-fade-in custom-scrollbar"
      style={{
        minHeight: "100vh",
        background: C.beige,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        fontFamily: "'Inter', 'Segoe UI',system-ui,sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 540 }}>
        <div
          className="animate-fade-up"
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <img
            src="/logo.jpg"
            alt="TFC"
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              boxShadow: C.sh,
              margin: "0 auto 20px",
              display: "block",
              objectFit: "cover",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: C.ch,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Welcome back.
          </div>
          <div
            style={{
              fontSize: 14,
              color: C.chL,
              fontWeight: 500,
              marginTop: 8,
            }}
          >
            Select your operational role to continue
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 14,
          }}
        >
          {keys.map((k, i) => {
            const r = ROLES[k];
            const isHov = hov === k;
            return (
              <div
                key={k}
                onClick={() => onSelect(k)}
                onMouseEnter={() => setHov(k)}
                onMouseLeave={() => setHov(null)}
                className="animate-fade-up hover-lift"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  gridColumn: !isMobile && i === 4 ? "1 / -1" : "auto",
                  background: C.w,
                  border: "2px solid " + (isHov ? r.color : C.w),
                  borderRadius: 16,
                  padding: "22px 24px",
                  cursor: "pointer",
                  boxShadow: isHov ? C.shM : C.sh,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: r.bg,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 900,
                    color: r.color,
                    transition: "transform 0.2s",
                    transform: isHov ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  {r.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: C.ch,
                      marginBottom: 4,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {r.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.chL,
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    {r.desc}
                  </div>
                </div>
                {r.pwd && (
                  <div
                    style={{
                      fontSize: 11,
                      color: C.chXL,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 600,
                      marginTop: "auto",
                      paddingTop: 8,
                    }}
                  >
                    <span>🔒</span>Requires Access Code
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div
          className="animate-fade-up"
          style={{
            textAlign: "center",
            marginTop: 40,
            fontSize: 12,
            color: C.chXL,
            fontWeight: 600,
            animationDelay: "0.4s",
          }}
        >
          Ocean Flair Group Sdn Bhd · TTDI, Kuala Lumpur
        </div>
      </div>
    </div>
  );
}

function PasswordScreen({ role, onSuccess, onBack }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const r = ROLES[role];
  function tryLogin() {
    if (pwd === PWD) {
      onSuccess();
    } else {
      setErr("Incorrect access code.");
      setPwd("");
    }
  }
  function handleKey(e) {
    if (e.key === "Enter") tryLogin();
  }
  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: "100vh",
        background: C.beige,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter', 'Segoe UI',system-ui,sans-serif",
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          background: C.w,
          borderRadius: 24,
          padding: "48px 40px",
          width: "100%",
          maxWidth: 400,
          boxShadow: C.shM,
          border: "1px solid " + C.bdrL,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: r.bg,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 26,
              fontWeight: 900,
              color: r.color,
            }}
          >
            {r.icon}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: C.ch,
              letterSpacing: "-0.02em",
            }}
          >
            {r.label}
          </div>
          <div
            style={{
              fontSize: 14,
              color: C.chL,
              marginTop: 6,
              fontWeight: 500,
            }}
          >
            Enter your access code to proceed
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <input
            value={pwd}
            onChange={(e) => {
              setPwd(e.target.value);
              setErr("");
            }}
            onKeyDown={handleKey}
            type="password"
            placeholder="••••••••"
            autoFocus
            style={{
              padding: "16px 20px",
              border: "2px solid " + (err ? C.rd : C.bdr),
              borderRadius: 12,
              fontSize: 18,
              color: C.ch,
              outline: "none",
              background: C.off,
              width: "100%",
              boxSizing: "border-box",
              letterSpacing: "0.2em",
              textAlign: "center",
              transition: "border-color 0.2s",
            }}
          />
          {err && (
            <div
              className="animate-fade-in"
              style={{
                fontSize: 12,
                color: C.rd,
                marginTop: 8,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {err}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Btn onClick={tryLogin} variant="primary" full>
            Authorize Access
          </Btn>
          <Btn onClick={onBack} full>
            Cancel
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEW ORDER MODAL WITH OFFLINE WHATSAPP LIST IMPORTER
═══════════════════════════════════════════════════════════════ */
function NewOrderModal({ onClose, onSubmit, notify }) {
  const isMobile = useIsMobile();
  const [rest, setRest] = useState("Vins");
  const [stagedItems, setStagedItems] = useState([]);

  const [prod, setProd] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [err, setErr] = useState("");

  const [inputMode, setInputMode] = useState("manual"); // "manual" | "bulk"
  const [bulkText, setBulkText] = useState("");

  function handleAddItem(e) {
    e.preventDefault();
    if (!prod.trim()) {
      setErr("Please enter a product name.");
      return;
    }
    setStagedItems((prev) => [
      {
        id: "stg_" + Date.now() + Math.random(),
        product: prod.trim(),
        qty: qty,
        unit: unit,
      },
      ...prev,
    ]);
    setProd("");
    setQty("");
    setErr("");
  }

  function removeItem(id) {
    setStagedItems((prev) => prev.filter((i) => i.id !== id));
  }

  function submitFinalOrder() {
    if (stagedItems.length === 0) {
      setErr("Please add at least one item before submitting.");
      return;
    }
    onSubmit(rest, stagedItems);
  }

  function handleBulkTextParse() {
    if (!bulkText.trim()) {
      setErr("Please paste some text first.");
      return;
    }
    setErr("");
    const lines = bulkText.split("\n");
    let addedCount = 0;
    const newItems = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      const numMatch = line.match(/(\d+(?:\.\d+)?)/);
      const rowQty = numMatch ? numMatch[1] : "";

      let rowUnit = "kg";
      const upperLine = line.toUpperCase();
      if (upperLine.includes("PKT") || upperLine.includes("PACKET"))
        rowUnit = "pkt";
      else if (upperLine.includes("BTL") || upperLine.includes("BOTTLE"))
        rowUnit = "btl";
      else if (
        upperLine.includes("NOS") ||
        upperLine.includes("PCS") ||
        upperLine.includes("PC")
      )
        rowUnit = "nos";
      else if (upperLine.includes("G") && !upperLine.includes("KG"))
        rowUnit = "g";

      const matchedCatalogName = findRecipeFuzzyBulk(line);

      if (matchedCatalogName) {
        newItems.push({
          id: "bulk_" + Date.now() + "_" + Math.random(),
          product: matchedCatalogName,
          qty: rowQty,
          unit: rowUnit,
        });
        addedCount++;
      } else {
        const cleanName = line
          .replace(/[-\d]/g, "")
          .replace(/\b(pkt|packet|nos|kg|g|btl|bottle)\b/gi, "")
          .trim();
        newItems.push({
          id: "bulk_" + Date.now() + "_" + Math.random(),
          product: cleanName || line,
          qty: rowQty,
          unit: rowUnit,
        });
        addedCount++;
      }
    });

    if (newItems.length > 0) {
      setStagedItems((prev) => [...newItems, ...prev]);
      setBulkText("");
      setInputMode("manual");
      notify(`✓ Processed ${addedCount} WhatsApp lines!`);
    } else {
      setErr("Could not process layout structure.");
    }
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,26,26,0.70)",
        backdropFilter: "blur(4px)",
        zIndex: 999,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 20,
        fontFamily: "'Inter', 'Segoe UI',system-ui,sans-serif",
      }}
    >
      <datalist id="recipe-database">
        {RECIPE_DB.map((r) => (
          <option key={r.recipe_id} value={r.recipe_name} />
        ))}
      </datalist>

      <div
        className="animate-fade-up"
        style={{
          background: C.w,
          borderRadius: isMobile ? "28px 28px 0 0" : 24,
          width: "100%",
          maxWidth: 720,
          maxHeight: isMobile ? "92vh" : "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: C.shM,
        }}
      >
        <div
          style={{
            padding: "24px 30px 20px",
            borderBottom: "1px solid " + C.bdrL,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: C.ch,
                  letterSpacing: "-0.02em",
                }}
              >
                Draft Purchase Order
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: C.chL,
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                Build your item list below, then submit to the cloud.
              </div>
            </div>
            <button
              onClick={onClose}
              className="hover-lift"
              style={{
                background: C.off,
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                fontSize: 16,
                color: C.chM,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div
          className="custom-scrollbar"
          style={{ overflowY: "auto", flex: 1, padding: "24px 30px" }}
        >
          <SectionLabel text="1. Operational Kitchen" />
          <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
            {["Vins", "Manja"].map((rn) => (
              <button
                key={rn}
                onClick={() => setRest(rn)}
                className="hover-lift"
                style={{
                  padding: "14px 20px",
                  borderRadius: 12,
                  border: "2px solid " + (rest === rn ? C.ol : C.bdrL),
                  background: rest === rn ? C.olBg : C.w,
                  color: rest === rn ? C.olDk : C.chL,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  flex: "1 1 auto",
                  transition: "all 0.2s",
                }}
              >
                {rn} Kitchen
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <SectionLabel text="2. Add Items to Order" />
            <div
              style={{
                display: "flex",
                background: C.off,
                borderRadius: 10,
                border: "1px solid " + C.bdrL,
                padding: 4,
              }}
            >
              <button
                onClick={() => setInputMode("manual")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: inputMode === "manual" ? C.w : "transparent",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: inputMode === "manual" ? C.ch : C.chL,
                  cursor: "pointer",
                  boxShadow: inputMode === "manual" ? C.sh : "none",
                  transition: "all 0.2s",
                }}
              >
                Manual Addition
              </button>
              <button
                onClick={() => setInputMode("bulk")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: inputMode === "bulk" ? C.w : "transparent",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: inputMode === "bulk" ? C.olDk : C.chL,
                  cursor: "pointer",
                  boxShadow: inputMode === "bulk" ? C.sh : "none",
                  transition: "all 0.2s",
                }}
              >
                Paste WhatsApp List
              </button>
            </div>
          </div>

          {inputMode === "manual" && (
            <form
              className="animate-fade-in"
              onSubmit={handleAddItem}
              style={{
                background: C.off,
                padding: 20,
                borderRadius: 16,
                border: "1px solid " + C.bdrL,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, width: "100%" }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.chM,
                      fontWeight: 800,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    Product (Type to search)
                  </div>
                  <input
                    list="recipe-database"
                    value={prod}
                    onChange={(e) => {
                      setProd(e.target.value);
                      setErr("");
                    }}
                    placeholder="e.g. Madras Spiced (Thighs/Wings)"
                    style={{
                      padding: "12px 16px",
                      border: "2px solid " + C.w,
                      borderRadius: 10,
                      fontSize: 14,
                      color: C.ch,
                      outline: "none",
                      background: C.w,
                      width: "100%",
                      boxSizing: "border-box",
                      boxShadow: C.sh,
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.ol)}
                    onBlur={(e) => (e.target.style.borderColor = C.w)}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  <div style={{ width: 80 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.chM,
                        fontWeight: 800,
                        marginBottom: 6,
                        textTransform: "uppercase",
                      }}
                    >
                      Qty
                    </div>
                    <input
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="—"
                      style={{
                        padding: "12px 8px",
                        border: "2px solid " + C.w,
                        borderRadius: 10,
                        fontSize: 14,
                        color: C.ch,
                        outline: "none",
                        background: C.w,
                        width: "100%",
                        boxSizing: "border-box",
                        textAlign: "center",
                        boxShadow: C.sh,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = C.ol)}
                      onBlur={(e) => (e.target.style.borderColor = C.w)}
                    />
                  </div>
                  <div style={{ width: 90 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.chM,
                        fontWeight: 800,
                        marginBottom: 6,
                        textTransform: "uppercase",
                      }}
                    >
                      Unit
                    </div>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      style={{
                        padding: "12px 10px",
                        border: "2px solid " + C.w,
                        borderRadius: 10,
                        fontSize: 14,
                        color: C.ch,
                        outline: "none",
                        background: C.w,
                        width: "100%",
                        cursor: "pointer",
                        height: 46,
                        boxShadow: C.sh,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = C.ol)}
                      onBlur={(e) => (e.target.style.borderColor = C.w)}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="hover-lift"
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "14px",
                  background: C.ch,
                  color: C.w,
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 14,
                  transition: "all 0.2s",
                }}
              >
                + Add Item to List
              </button>
            </form>
          )}

          {inputMode === "bulk" && (
            <div
              className="animate-fade-in"
              style={{
                background: C.olBg,
                padding: 20,
                borderRadius: 16,
                border: "1px solid " + C.olBgD,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: C.olDk,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Paste your structural text list cleanly. The offline system maps
                details instantly.
              </div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Lamb Striploin - 10pkt&#10;Rosemary Feta - 2 bottle&#10;Feta Cheese - 1pkt"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  height: 140,
                  padding: 16,
                  borderRadius: 10,
                  border: "2px solid " + C.olBgD,
                  outline: "none",
                  fontSize: 14,
                  resize: "none",
                  marginBottom: 12,
                  fontFamily: "monospace",
                }}
                onFocus={(e) => (e.target.style.borderColor = C.ol)}
                onBlur={(e) => (e.target.style.borderColor = C.olBgD)}
              />
              <button
                onClick={handleBulkTextParse}
                className="hover-lift"
                style={{
                  width: "100%",
                  padding: "14px",
                  background: C.ol,
                  color: C.w,
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 14,
                  transition: "all 0.2s",
                  boxShadow: C.sh,
                }}
              >
                ⚡ Run Instant Bulk Parse
              </button>
            </div>
          )}

          {err && (
            <div
              className="animate-fade-in"
              style={{
                marginBottom: 16,
                fontSize: 13,
                color: C.rd,
                fontWeight: 700,
                background: C.rdBg,
                padding: "10px 14px",
                borderRadius: 8,
              }}
            >
              {err}
            </div>
          )}

          <SectionLabel
            text={`3. Final Review (${stagedItems.length} items)`}
          />
          {stagedItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                border: "2px dashed " + C.bdrL,
                borderRadius: 16,
                color: C.chXL,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              No items added yet.
              <br />
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                Choose an input method above to build your order.
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stagedItems.map((item, i) => (
                <div
                  key={item.id}
                  className="animate-fade-up"
                  style={{
                    animationDelay: `${Math.min(i * 0.05, 0.5)}s`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    background: C.w,
                    border: "1px solid " + C.bdr,
                    borderRadius: 12,
                    boxShadow: C.sh,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: C.ch,
                        marginBottom: 4,
                      }}
                    >
                      {item.product}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.chL,
                        fontFamily: "monospace",
                        fontWeight: 600,
                      }}
                    >
                      Qty: {item.qty || "—"} {item.unit}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      background: C.rdBg,
                      border: "none",
                      color: C.rd,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "8px 12px",
                      borderRadius: 8,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.background = "#F4C1C3")
                    }
                    onMouseLeave={(e) => (e.target.style.background = C.rdBg)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "20px 30px",
            borderTop: "1px solid " + C.bdrL,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            background: C.off,
            borderRadius: isMobile ? "0" : "0 0 24px 24px",
          }}
        >
          <div style={{ fontSize: 13, color: C.chM, fontWeight: 700 }}>
            {stagedItems.length} valid items
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn onClick={submitFinalOrder} variant="primary">
              Submit Full Order
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ORDER CARD & VIEWS
═══════════════════════════════════════════════════════════════ */
function OrderCard({ order, active, onClick, onDelete, index }) {
  const s = oStats(order);
  const rc = order.restaurant === "Vins" ? C.ol : C.am;
  const pct = s.total ? Math.round((s.packed / s.total) * 100) : 0;
  const [showDel, setShowDel] = useState(false);
  return (
    <div
      onClick={onClick}
      className="animate-fade-up hover-lift"
      style={{
        animationDelay: `${index * 0.05}s`,
        padding: "16px",
        borderRadius: 14,
        marginBottom: 8,
        cursor: "pointer",
        background: active ? C.w : C.off,
        border: "2px solid " + (active ? rc : C.bdrL),
        boxShadow: active ? C.shM : "none",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: rc,
            background: rc + "1A",
            borderRadius: 6,
            padding: "4px 10px",
            letterSpacing: "0.03em",
          }}
        >
          {order.restaurant}
        </span>
        <span
          style={{
            fontSize: 11,
            color: C.chL,
            fontFamily: "monospace",
            fontWeight: 600,
          }}
        >
          {order.orderDate}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: C.bdrL,
          borderRadius: 99,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 4,
            width: pct + "%",
            background: C.ol,
            borderRadius: 99,
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: onDelete ? 10 : 0,
        }}
      >
        <Pill count={s.packed} label="packed" color={C.ol} />{" "}
        <Pill count={s.short} label="short" color={C.am} />{" "}
        <Pill count={s.oos} label="OOS" color={C.rd} />{" "}
        <Pill count={s.prod} label="prod" color={C.amDk} />{" "}
        <Pill count={s.pending} label="pending" color={C.chL} />
      </div>
      {onDelete && (
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{ paddingTop: 10, borderTop: "1px solid " + C.bdrL }}
        >
          {!showDel ? (
            <button
              onClick={() => setShowDel(true)}
              style={{
                fontSize: 11,
                color: C.chL,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontWeight: 600,
              }}
            >
              Remove order
            </button>
          ) : (
            <div
              className="animate-fade-in"
              style={{ display: "flex", gap: 12, alignItems: "center" }}
            >
              <span style={{ fontSize: 11, color: C.rd, fontWeight: 700 }}>
                Delete this order?
              </span>
              <button
                onClick={() => {
                  onDelete(order.id);
                  setShowDel(false);
                }}
                style={{
                  fontSize: 11,
                  color: C.w,
                  background: C.rd,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setShowDel(false)}
                style={{
                  fontSize: 11,
                  color: C.chM,
                  background: C.bdrL,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                No
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PackingRow({ item, onUpdate }) {
  const isMobile = useIsMobile();
  const [qty, setQty] = useState(item.packedQty || "");
  const [notes, setNotes] = useState(item.notes || "");
  function commit(status) {
    onUpdate({ status, packedQty: qty, notes, updatedAt: Date.now() });
  }
  const actions = [
    { s: "packed", label: "✓ Packed", c: C.ol },
    { s: "short", label: "⚠ Short", c: C.am },
    { s: "oos", label: "✕ OOS", c: C.rd },
    { s: "production", label: "◐ Prod", c: C.amDk },
    { s: "pending", label: "Reset", c: C.chL },
  ];
  const cur = SC[item.status] || SC.pending;
  return (
    <div
      className="animate-fade-up"
      style={{
        background: C.w,
        borderRadius: 14,
        marginBottom: 10,
        border: "1px solid " + C.bdrL,
        borderLeft: "4px solid " + cur.c,
        boxShadow: C.sh,
        overflow: "hidden",
        transition: "border-color 0.3s",
      }}
    >
      <div style={{ padding: "16px 18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: C.ch,
                fontSize: 15,
                fontWeight: 800,
                marginBottom: 4,
                lineHeight: 1.3,
              }}
            >
              {item.product}
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.chL,
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {item.qty ? `Ordered: ${item.qty} ${item.unit || ""}` : ""}
            </div>
          </div>
          <Badge status={item.status} />
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 14,
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Sending qty"
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid " + C.bdr,
              borderRadius: 8,
              fontSize: 13,
              color: C.ch,
              outline: "none",
              background: C.off,
              fontFamily: "monospace",
              width: "100%",
              boxSizing: "border-box",
              fontWeight: 600,
            }}
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes / remarks"
            style={{
              flex: 2,
              padding: "10px 14px",
              border: "1px solid " + C.bdr,
              borderRadius: 8,
              fontSize: 13,
              color: C.ch,
              outline: "none",
              background: C.off,
              width: "100%",
              boxSizing: "border-box",
              fontWeight: 500,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {actions.map((a) => {
            const on = item.status === a.s;
            return (
              <button
                key={a.s}
                onClick={() => commit(a.s)}
                className={!on ? "hover-lift" : ""}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid " + (on ? a.c : a.c + "40"),
                  background: on ? a.c + "22" : C.w,
                  color: on ? a.c : a.c + "AA",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: on ? 800 : 600,
                  flex: "1 1 auto",
                  transition: "all 0.2s",
                }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PackingView({ order, onUpdate }) {
  const s = oStats(order);
  const rc = order.restaurant === "Vins" ? C.ol : C.am;
  return (
    <div className="animate-fade-in custom-scrollbar">
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: C.ch,
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          Packing — <span style={{ color: rc }}>{order.restaurant}</span>
        </div>
        <div style={{ fontSize: 13, color: C.chL, fontWeight: 500 }}>
          PO Date: {order.orderDate} · {order.items.length} items to process
        </div>
      </div>
      <StatRow s={s} />
      {order.items.map((item) => (
        <PackingRow
          key={item.id}
          item={item}
          onUpdate={(u) => onUpdate(order.id, item.id, u)}
        />
      ))}
    </div>
  );
}

function ProductionView({ orders, onUpdate }) {
  const all = [];
  orders.forEach((o) =>
    o.items.forEach((it) => {
      if (it.status === "production")
        all.push({
          ...it,
          restaurant: o.restaurant,
          orderId: o.id,
          orderDate: o.orderDate,
        });
    })
  );
  return (
    <div className="animate-fade-in custom-scrollbar">
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: C.ch,
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          Production Queue
        </div>
        <div style={{ fontSize: 13, color: C.chL, fontWeight: 500 }}>
          {all.length === 0
            ? "All clear — no items in production"
            : all.length + " item(s) flagged for production"}
        </div>
      </div>
      {all.length === 0 ? (
        <div
          className="animate-fade-up"
          style={{ textAlign: "center", padding: "80px 0", color: C.chXL }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.chL }}>
            Production queue is clear
          </div>
        </div>
      ) : (
        all.map((item, idx) => {
          const rc = item.restaurant === "Vins" ? C.ol : C.am;
          return (
            <div
              key={item.orderId + "_" + item.id + "_" + idx}
              className="animate-fade-up"
              style={{
                animationDelay: `${idx * 0.05}s`,
                background: C.w,
                borderRadius: 16,
                border: "1px solid " + C.bdrL,
                borderLeft: "4px solid " + C.am,
                boxShadow: C.sh,
                marginBottom: 12,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "20px 24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: C.ch,
                        fontSize: 18,
                        fontWeight: 900,
                        marginBottom: 8,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {item.product}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: rc,
                          background: rc + "1A",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontWeight: 800,
                        }}
                      >
                        {item.restaurant}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: C.chL,
                          fontFamily: "monospace",
                          padding: "4px 0",
                          fontWeight: 600,
                        }}
                      >
                        PO: {item.orderDate}
                      </span>
                      {item.qty && (
                        <span
                          style={{
                            fontSize: 11,
                            color: C.am,
                            fontFamily: "monospace",
                            fontWeight: 800,
                          }}
                        >
                          Qty: {item.qty} {item.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: C.amDk,
                      background: C.amBg,
                      borderRadius: 20,
                      padding: "6px 14px",
                      border: "1px solid " + C.amBgD,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    In Production
                  </span>
                </div>
                {item.notes && (
                  <div
                    style={{
                      fontSize: 13,
                      color: C.chM,
                      fontStyle: "italic",
                      marginBottom: 16,
                      padding: "10px 14px",
                      background: C.beige,
                      borderRadius: 8,
                      borderLeft: "3px solid " + C.bdr,
                    }}
                  >
                    📝 {item.notes}
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <RecipeCard name={item.product} />
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      onUpdate(item.orderId, item.id, {
                        status: "packed",
                        updatedAt: Date.now(),
                      })
                    }
                  >
                    ✓ Done — Ready to Pack
                  </Btn>
                  <Btn
                    size="sm"
                    onClick={() =>
                      onUpdate(item.orderId, item.id, {
                        status: "pending",
                        updatedAt: Date.now(),
                      })
                    }
                  >
                    Return to Pending
                  </Btn>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function OrderingView({ order }) {
  const s = oStats(order);
  const rc = order.restaurant === "Vins" ? C.ol : C.am;
  return (
    <div className="animate-fade-in custom-scrollbar">
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: C.ch,
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          Your Order
        </div>
        <div style={{ fontSize: 13, color: C.chL, fontWeight: 500 }}>
          PO Date: {order.orderDate} · Live real-time updates
        </div>
      </div>
      <StatRow s={s} />
      {(s.short > 0 || s.oos > 0) && (
        <div
          className="animate-fade-up"
          style={{
            padding: "14px 18px",
            background: C.amBg,
            border: "1px solid " + C.amBgD,
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 13,
            color: C.amDk,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>⚠</span>{" "}
          <div>
            {s.short > 0 ? `${s.short} item(s) are short-stocked. ` : ""}
            {s.oos > 0 ? `${s.oos} item(s) are out of stock. ` : ""}TFC will
            contact you regarding alternatives.
          </div>
        </div>
      )}
      {order.items.map((item, idx) => (
        <div
          key={item.id}
          className="animate-fade-up"
          style={{
            animationDelay: `${idx * 0.02}s`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: "14px 18px",
            background: C.w,
            borderRadius: 12,
            marginBottom: 8,
            border: "1px solid " + C.bdrL,
            borderLeft: "4px solid " + (SC[item.status] || SC.pending).c,
            boxShadow: C.sh,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: C.ch,
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {item.product}
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.chL,
                fontFamily: "monospace",
                fontWeight: 500,
              }}
            >
              {item.qty ? `Ordered: ${item.qty} ${item.unit || ""}` : ""}
              {item.packedQty ? ` · Sending: ${item.packedQty}` : ""}
              {item.notes ? ` · ${item.notes}` : ""}
            </div>
          </div>
          <Badge status={item.status} />
        </div>
      ))}
    </div>
  );
}

function AdminOrderView({ order }) {
  const s = oStats(order);
  const rc = order.restaurant === "Vins" ? C.ol : C.am;
  return (
    <div className="animate-fade-in custom-scrollbar">
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: C.ch,
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          Order Overview — <span style={{ color: rc }}>{order.restaurant}</span>
        </div>
        <div style={{ fontSize: 13, color: C.chL, fontWeight: 500 }}>
          PO Date: {order.orderDate} · {order.items.length} line items
        </div>
      </div>
      <StatRow s={s} />
      {order.items.map((item, idx) => (
        <div
          key={item.id}
          className="animate-fade-up"
          style={{
            animationDelay: `${idx * 0.02}s`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: "14px 18px",
            background: C.w,
            borderRadius: 12,
            marginBottom: 8,
            border: "1px solid " + C.bdrL,
            borderLeft: "4px solid " + (SC[item.status] || SC.pending).c,
            boxShadow: C.sh,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: C.ch,
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {item.product}
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.chL,
                fontFamily: "monospace",
                fontWeight: 500,
              }}
            >
              {item.qty ? `${item.qty} ${item.unit || ""}` : "-"}
              {item.packedQty ? ` · Sending: ${item.packedQty}` : ""}
              {item.notes ? ` · ${item.notes}` : ""}
            </div>
          </div>
          <Badge status={item.status} />
        </div>
      ))}
    </div>
  );
}

function AdminDashboard({ orders }) {
  const totals = { total: 0, packed: 0, short: 0, oos: 0, prod: 0, pending: 0 };
  orders.forEach((o) => {
    const s = oStats(o);
    Object.keys(totals).forEach((k) => {
      totals[k] += s[k] || 0;
    });
  });
  return (
    <div className="animate-fade-in custom-scrollbar">
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: C.ch,
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          Dashboard
        </div>
        <div style={{ fontSize: 13, color: C.chL, fontWeight: 500 }}>
          {orders.length} active order{orders.length !== 1 ? "s" : ""} in system
        </div>
      </div>
      {orders.length > 0 && <StatRow s={totals} />}
      {orders.length === 0 ? (
        <div
          className="animate-fade-up"
          style={{ textAlign: "center", padding: "80px 0" }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ch }}>
            No orders yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.chL,
              marginTop: 6,
              fontWeight: 500,
            }}
          >
            Click "New Order" in the sidebar to begin
          </div>
        </div>
      ) : (
        <div>
          <SectionLabel text="Recent Orders" />
          {orders.slice(0, 5).map((o, idx) => {
            const s = oStats(o);
            const rc = o.restaurant === "Vins" ? C.ol : C.am;
            const pct = s.total ? Math.round((s.packed / s.total) * 100) : 0;
            return (
              <div
                key={o.id}
                className="animate-fade-up hover-lift"
                style={{
                  animationDelay: `${idx * 0.05}s`,
                  background: C.w,
                  borderRadius: 14,
                  border: "1px solid " + C.bdrL,
                  padding: "16px 20px",
                  marginBottom: 10,
                  boxShadow: C.sh,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: rc,
                        background: rc + "1A",
                        borderRadius: 6,
                        padding: "4px 10px",
                      }}
                    >
                      {o.restaurant}
                    </span>
                    <span
                      style={{ fontSize: 12, color: C.chL, fontWeight: 600 }}
                    >
                      {o.orderDate}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: pct === 100 ? C.ol : C.ch,
                    }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: C.bdrL,
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: 6,
                      width: pct + "%",
                      background: C.ol,
                      borderRadius: 99,
                      transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP WITH LIVE FIRESTORE SYNC & SPLASH SCREEN
═══════════════════════════════════════════════════════════════ */
export default function TFCOrderSystem() {
  const isMobile = useIsMobile();
  const [splashState, setSplashState] = useState("visible"); // visible, fading, hidden
  const [phase, setPhase] = useState("select");
  const [role, setRole] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Splash Screen Logic
  useEffect(() => {
    const timer1 = setTimeout(() => setSplashState("fading"), 2000);
    const timer2 = setTimeout(() => setSplashState("hidden"), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  function notify(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    const ordersCol = collection(db, "orders");
    const unsubscribe = onSnapshot(ordersCol, (snapshot) => {
      const liveOrders = snapshot.docs.map((doc) => doc.data());
      liveOrders.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(liveOrders);
    });
    return () => unsubscribe();
  }, []);

  async function updateItem(orderId, itemId, updates) {
    try {
      const orderToUpdate = orders.find((o) => o.id === orderId);
      if (!orderToUpdate) return;
      const updatedItems = orderToUpdate.items.map((i) =>
        i.id === itemId ? { ...i, ...updates } : i
      );
      await setDoc(doc(db, "orders", orderId), {
        ...orderToUpdate,
        items: updatedItems,
      });
    } catch (e) {
      notify("Failed to update status", "error");
    }
  }

  async function deleteOrder(orderId) {
    try {
      await deleteDoc(doc(db, "orders", orderId));
      if (activeId === orderId) setActiveId(null);
      notify("Order removed", "success");
    } catch (e) {
      notify("Failed to delete order", "error");
    }
  }

  async function handleNewOrder(restaurant, rows) {
    try {
      const newOrder = {
        id: "ord_" + Date.now(),
        restaurant,
        orderDate: fmtDate(),
        createdAt: Date.now(),
        items: rows.map((r, i) => ({
          id: "item_" + i + "_" + Date.now(),
          product: r.product.trim(),
          qty: r.qty,
          unit: r.unit,
          status: "pending",
          packedQty: "",
          notes: "",
        })),
      };
      await setDoc(doc(db, "orders", newOrder.id), newOrder);
      setActiveId(newOrder.id);
      setShowModal(false);
      notify(`${rows.length} items added for ${restaurant}`, "success");
    } catch (e) {
      notify("Failed to save order to cloud", "error");
    }
  }

  function selectRole(r) {
    setRole(r);
    setPhase(ROLES[r].pwd ? "password" : "app");
  }
  function onPasswordSuccess() {
    setPhase("app");
  }
  function onBack() {
    setPhase("select");
    setRole(null);
  }

  // Render Splash First
  if (splashState === "visible" || splashState === "fading") {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>
        <div
          style={{
            opacity: splashState === "fading" ? 0 : 1,
            transition: "opacity 0.5s ease",
          }}
        >
          <SplashScreen />
        </div>
      </>
    );
  }

  // App Routing
  let AppContent;
  if (phase === "select")
    AppContent = <RoleSelectScreen onSelect={selectRole} />;
  else if (phase === "password")
    AppContent = (
      <PasswordScreen
        role={role}
        onSuccess={onPasswordSuccess}
        onBack={onBack}
      />
    );
  else {
    const viewOrders =
      role === "vins"
        ? orders.filter((o) => o.restaurant === "Vins")
        : role === "manja"
        ? orders.filter((o) => o.restaurant === "Manja")
        : orders;
    const activeOrder = orders.find((o) => o.id === activeId) || null;
    const roleConfig = ROLES[role];

    const renderMain = () => {
      if (role === "production")
        return <ProductionView orders={orders} onUpdate={updateItem} />;
      if (!activeOrder) {
        if (role === "admin") return <AdminDashboard orders={orders} />;
        return (
          <div
            className="animate-fade-in"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60vh",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 48,
                color: C.chXL,
                animation: "fadeUp 1s ease infinite alternate",
              }}
            >
              {viewOrders.length === 0 ? "📋" : "👈"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ch }}>
              {viewOrders.length === 0 ? "No orders yet" : "Select an order"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.chL,
                textAlign: "center",
                padding: "0 20px",
                fontWeight: 500,
              }}
            >
              {viewOrders.length === 0
                ? role === "admin"
                  ? "Use the New Order button in the sidebar"
                  : "No orders have been placed yet"
                : "Choose an order from the sidebar to view details"}
            </div>
          </div>
        );
      }
      if (role === "packing")
        return <PackingView order={activeOrder} onUpdate={updateItem} />;
      if (role === "vins" || role === "manja")
        return <OrderingView order={activeOrder} />;
      return <AdminOrderView order={activeOrder} />;
    };

    AppContent = (
      <div
        className="animate-fade-in"
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: C.beige,
          fontFamily: "'Inter', 'Segoe UI',system-ui,sans-serif",
          overflow: "hidden",
        }}
      >
        {toast && <Toast msg={toast.msg} type={toast.type} />}
        {showModal && (
          <NewOrderModal
            onClose={() => setShowModal(false)}
            onSubmit={handleNewOrder}
            notify={notify}
          />
        )}

        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 24px",
            background: C.w,
            borderBottom: "1px solid " + C.bdrL,
            boxShadow: C.sh,
            flexShrink: 0,
            zIndex: 60,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 12 : 16,
            }}
          >
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  padding: 0,
                  color: C.ch,
                  marginRight: 4,
                }}
              >
                ☰
              </button>
            )}
            <img
              src="/logo.jpg"
              alt="TFC"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                boxShadow: C.sh,
                objectFit: "cover",
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div>
              <div
                style={{
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: 900,
                  color: C.ch,
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                }}
              >
                Order Tracking
              </div>
              {!isMobile && (
                <div
                  style={{
                    fontSize: 10,
                    color: C.ol,
                    marginTop: 4,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 800,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      background: C.ol,
                      borderRadius: "50%",
                      marginRight: 4,
                      animation: "pulseSoft 2s infinite",
                    }}
                  />
                  Cloud Sync Active
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 800,
                color: roleConfig.color,
                background: roleConfig.bg,
                border: "1px solid " + roleConfig.color + "40",
                borderRadius: 20,
                padding: isMobile ? "6px 10px" : "6px 14px",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                boxShadow: C.sh,
              }}
            >
              {roleConfig.icon} {!isMobile && roleConfig.label}
            </span>
            <Btn
              size="sm"
              onClick={() => {
                setPhase("select");
                setRole(null);
                setActiveId(null);
              }}
            >
              Switch
            </Btn>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {isMobile && sidebarOpen && (
            <div
              className="animate-fade-in"
              onClick={() => setSidebarOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(26,26,26,0.6)",
                backdropFilter: "blur(2px)",
                zIndex: 40,
              }}
            />
          )}

          {/* SIDEBAR */}
          <div
            className="custom-scrollbar"
            style={{
              width: 280,
              borderRight: "1px solid " + C.bdrL,
              background: C.off,
              padding: 16,
              overflowY: "auto",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              position: isMobile ? "absolute" : "relative",
              zIndex: 50,
              height: "100%",
              left: 0,
              top: 0,
              transform: isMobile
                ? sidebarOpen
                  ? "translateX(0)"
                  : "translateX(-100%)"
                : "none",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: isMobile && sidebarOpen ? C.shM : "none",
            }}
          >
            {role === "admin" && (
              <div style={{ marginBottom: 10 }}>
                <button
                  className="hover-lift"
                  onClick={() => {
                    setShowModal(true);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    border: "none",
                    borderRadius: 12,
                    background: C.ch,
                    color: C.w,
                    fontSize: 14,
                    cursor: "pointer",
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    boxShadow: C.shM,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    animation: "pulseSoft 3s infinite",
                  }}
                >
                  <span style={{ fontSize: 18 }}>+</span> Create Order
                </button>
              </div>
            )}
            {role === "production" && (
              <div
                style={{
                  padding: "14px 16px",
                  background: C.amBg,
                  borderRadius: 12,
                  border: "1px solid " + C.amBgD,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: C.amDk,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    marginBottom: 4,
                  }}
                >
                  Production Mode
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.chM,
                    lineHeight: 1.4,
                    fontWeight: 500,
                  }}
                >
                  Showing all items flagged for production.
                </div>
              </div>
            )}
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: C.chL,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                padding: "10px 4px 6px",
              }}
            >
              Orders {viewOrders.length > 0 ? `(${viewOrders.length})` : ""}
            </div>
            {viewOrders.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: C.chXL,
                  textAlign: "center",
                  padding: "32px 0",
                  fontWeight: 600,
                }}
              >
                No orders found
              </div>
            ) : (
              viewOrders.map((o, i) => (
                <OrderCard
                  key={o.id}
                  index={i}
                  order={o}
                  active={activeId === o.id}
                  onClick={() => {
                    setActiveId(o.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  onDelete={role === "admin" ? deleteOrder : null}
                />
              ))
            )}
          </div>

          <div
            className="custom-scrollbar"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? "20px" : "32px 40px",
              background: C.off,
              width: "100%",
            }}
          >
            {renderMain()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      {AppContent}
    </>
  );
}
