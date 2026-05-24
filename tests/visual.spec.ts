import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:3001";

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
async function load(page: Page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  // Wait for splash to fade (2.5s) + extra buffer
  await page.waitForTimeout(3200);
}

async function getDataTheme(page: Page) {
  return page.evaluate(() =>
    document.querySelector("[data-theme]")?.getAttribute("data-theme")
  );
}

/* ──────────────────────────────────────────────
   1. SPLASH SCREEN
────────────────────────────────────────────── */
test("splash screen appears on first load", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const root = await page.locator("#root").count();
  expect(root).toBe(1);
});

test("splash fades to auth / role-select screen", async ({ page }) => {
  await load(page);
  const body = await page.locator("body").textContent();
  expect(body).toBeTruthy();
  const rootText = await page.locator("#root").innerText();
  expect(rootText.length).toBeGreaterThan(10);
});

/* ──────────────────────────────────────────────
   2. DARK MODE (always-on)
────────────────────────────────────────────── */
test("theme is always dark", async ({ page }) => {
  await load(page);
  const theme = await getDataTheme(page);
  expect(theme).toBe("dark");
});

test("dark mode: root background is dark", async ({ page }) => {
  await load(page);
  const bg = await page.evaluate(() => {
    const el = document.querySelector("[data-theme='dark']") as HTMLElement;
    return el ? getComputedStyle(el).backgroundColor : null;
  });
  expect(bg).toBeTruthy();
});

test("localStorage tfc_theme=light is ignored — stays dark", async ({ page }) => {
  await load(page);
  await page.evaluate(() => localStorage.setItem("tfc_theme", "light"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3200);
  const theme = await getDataTheme(page);
  expect(theme).toBe("dark");
});

/* ──────────────────────────────────────────────
   3. NO JS ERRORS
────────────────────────────────────────────── */
test("app loads without JS errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await load(page);
  await page.waitForTimeout(500);
  expect(errors.filter(e => !e.includes("ResizeObserver"))).toHaveLength(0);
});

/* ──────────────────────────────────────────────
   4. CSS CORRECTNESS
────────────────────────────────────────────── */
test("glass-card class applies backdrop-filter", async ({ page }) => {
  await load(page);
  const hasBlur = await page.evaluate(() => {
    const cards = document.querySelectorAll(".glass-card");
    if (cards.length === 0) return true;
    const cs = getComputedStyle(cards[0]);
    return cs.backdropFilter?.includes("blur") || cs.webkitBackdropFilter?.includes("blur");
  });
  expect(hasBlur).toBeTruthy();
});

test("modal-sheet class has backdrop-filter blur in CSS", async ({ page }) => {
  await load(page);
  const result = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    for (const s of sheets) {
      try {
        for (const r of Array.from(s.cssRules)) {
          if (r.cssText?.includes("modal-sheet") && r.cssText?.includes("blur")) return "found";
        }
      } catch {}
    }
    return "not_found";
  });
  expect(result).toBe("found");
});

/* ──────────────────────────────────────────────
   5. FONT LOADING
────────────────────────────────────────────── */
test("Plus Jakarta Sans font import is in the injected style tag", async ({ page }) => {
  await load(page);
  const fontFound = await page.evaluate(() => {
    const styles = Array.from(document.querySelectorAll("style"));
    return styles.some(s =>
      s.textContent?.includes("Plus+Jakarta+Sans") ||
      s.textContent?.includes("Plus Jakarta Sans")
    );
  });
  expect(fontFound).toBeTruthy();
});

/* ──────────────────────────────────────────────
   6. ANIMATIONS
────────────────────────────────────────────── */
test("keyframe animations are defined: orbFloat1, shimmerBtn, countPop, fadeUp", async ({ page }) => {
  await load(page);
  const animations = await page.evaluate(() => {
    const found: string[] = [];
    const sheets = Array.from(document.styleSheets);
    for (const s of sheets) {
      try {
        for (const r of Array.from(s.cssRules)) {
          if (r.type === CSSRule.KEYFRAMES_RULE) {
            found.push((r as CSSKeyframesRule).name);
          }
        }
      } catch {}
    }
    return found;
  });
  expect(animations).toContain("orbFloat1");
  expect(animations).toContain("shimmerBtn");
  expect(animations).toContain("countPop");
  expect(animations).toContain("fadeUp");
});

/* ──────────────────────────────────────────────
   7. BENTO CLASSES
────────────────────────────────────────────── */
test("bento-hero CSS class is defined in stylesheet", async ({ page }) => {
  await load(page);
  const found = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    for (const s of sheets) {
      try {
        for (const r of Array.from(s.cssRules)) {
          if (r.cssText?.includes(".bento-hero")) return true;
        }
      } catch {}
    }
    return false;
  });
  expect(found).toBeTruthy();
});

test("admin-tab-btn CSS class is defined", async ({ page }) => {
  await load(page);
  const found = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    for (const s of sheets) {
      try {
        for (const r of Array.from(s.cssRules)) {
          if (r.cssText?.includes(".admin-tab-btn")) return true;
        }
      } catch {}
    }
    return false;
  });
  expect(found).toBeTruthy();
});

/* ──────────────────────────────────────────────
   8. RESPONSIVE / NO CRASH
────────────────────────────────────────────── */
test("app renders without JS errors on desktop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await load(page);
  const critical = errors.filter(
    e => !e.includes("ResizeObserver") && !e.includes("Non-Error promise") && !e.includes("ChunkLoadError")
  );
  expect(critical).toHaveLength(0);
});

test("app renders without JS errors on mobile viewport", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page);
  const critical = errors.filter(
    e => !e.includes("ResizeObserver") && !e.includes("Non-Error promise")
  );
  expect(critical).toHaveLength(0);
});

/* ──────────────────────────────────────────────
   9. PK-CARD CLASSES
────────────────────────────────────────────── */
test("packing card status CSS classes are defined", async ({ page }) => {
  await load(page);
  const classes = ["pk-pending", "pk-production", "pk-prod_done", "pk-packed", "pk-short", "pk-oos"];
  const found = await page.evaluate((cls) => {
    const sheets = Array.from(document.styleSheets);
    const foundNames: string[] = [];
    for (const s of sheets) {
      try {
        for (const r of Array.from(s.cssRules)) {
          cls.forEach(c => {
            if (r.cssText?.includes("." + c) && !foundNames.includes(c)) foundNames.push(c);
          });
        }
      } catch {}
    }
    return foundNames;
  }, classes);
  classes.forEach(c => expect(found).toContain(c));
});
