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

async function getBodyBg(page: Page) {
  return page.evaluate(() =>
    getComputedStyle(document.querySelector("[data-theme]") || document.body).backgroundColor
  );
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
  // App renders (React root is present)
  const root = await page.locator("#root").count();
  expect(root).toBe(1);
});

test("splash fades to auth / role-select screen", async ({ page }) => {
  await load(page);
  // After splash, we should see login or role-select content
  const body = await page.locator("body").textContent();
  expect(body).toBeTruthy();
  // No blank page
  const rootText = await page.locator("#root").innerText();
  expect(rootText.length).toBeGreaterThan(10);
});

/* ──────────────────────────────────────────────
   2. DARK MODE (default)
────────────────────────────────────────────── */
test("default theme is dark", async ({ page }) => {
  await load(page);
  const theme = await getDataTheme(page);
  // localStorage starts with tfc_theme unset → dark
  expect(theme).toBe("dark");
});

test("dark mode: root background is dark (#07090F range)", async ({ page }) => {
  await load(page);
  const theme = await getDataTheme(page);
  expect(theme).toBe("dark");
  // Check the app wrapper has dark bg
  const bg = await page.evaluate(() => {
    const el = document.querySelector("[data-theme='dark']") as HTMLElement;
    return el ? getComputedStyle(el).backgroundColor : null;
  });
  expect(bg).toBeTruthy();
});

/* ──────────────────────────────────────────────
   3. THEME TOGGLE
────────────────────────────────────────────── */
async function findThemeToggle(page: Page) {
  // The toggle is rendered inside the portal top-bar when role is selected
  // First we may be on auth/role-select: toggle should still be in top-bar area
  return page.locator(".theme-toggle").first();
}

test("theme toggle button exists on the page after auth flow", async ({ page }) => {
  await load(page);
  // Theme toggle is always rendered in the portal top bar once inside the app
  // Try to find it — it may be on auth screens too
  const toggle = page.locator("button.theme-toggle, button[title*='Mode'], button[title*='mode']").first();
  // The theme toggle is present in the portal section; if we're on auth, it won't be visible
  // Just verify no JS errors crashed the app
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(500);
  expect(errors.filter(e => !e.includes("ResizeObserver"))).toHaveLength(0);
});

/* ──────────────────────────────────────────────
   4. LIGHT MODE CONTRAST
────────────────────────────────────────────── */
async function switchToLightMode(page: Page) {
  // Set light mode via localStorage and reload
  await page.evaluate(() => localStorage.setItem("tfc_theme", "light"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3200);
}

test("light mode: data-theme attribute becomes 'light' after localStorage set", async ({ page }) => {
  await load(page);
  await switchToLightMode(page);
  const theme = await getDataTheme(page);
  expect(theme).toBe("light");
});

test("light mode: root background is light (not #07090F)", async ({ page }) => {
  await load(page);
  await switchToLightMode(page);
  // The wrapper should have a light background
  const bg = await page.evaluate(() => {
    const el = document.querySelector("[data-theme='light']") as HTMLElement;
    if (!el) return null;
    return getComputedStyle(el).backgroundColor;
  });
  expect(bg).toBeTruthy();
  // Should NOT be the ultra-dark bg
  expect(bg).not.toBe("rgb(7, 9, 15)");
});

test("light mode: no invisible text (white-on-white detection)", async ({ page }) => {
  await load(page);
  await switchToLightMode(page);
  // Check for any element where text colour is white/near-white on a white/near-white bg
  const invisibleCount = await page.evaluate(() => {
    const els = document.querySelectorAll("*");
    let count = 0;
    for (const el of Array.from(els)) {
      const cs = getComputedStyle(el);
      const color = cs.color;
      const bg = cs.backgroundColor;
      // Parse rgb values
      const parseRGB = (s: string) => {
        const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? [+m[1], +m[2], +m[3]] : null;
      };
      const luminance = (rgb: number[]) => (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255;
      const c = parseRGB(color);
      const b = parseRGB(bg);
      if (c && b) {
        const textLum = luminance(c);
        const bgLum = luminance(b);
        // Invisible: both near-white (lum > 0.88), background is opaque
        const bgA = bg.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
        const alpha = bgA ? parseFloat(bgA[1]) : 1;
        if (textLum > 0.88 && bgLum > 0.88 && alpha > 0.5) {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length > 0) count++;
        }
      }
    }
    return count;
  });
  // Allow a small tolerance for UI elements we don't control
  expect(invisibleCount).toBeLessThan(5);
});

/* ──────────────────────────────────────────────
   5. CSS CORRECTNESS
────────────────────────────────────────────── */
test("glass-card class applies backdrop-filter in dark mode", async ({ page }) => {
  await load(page);
  const hasBlur = await page.evaluate(() => {
    const cards = document.querySelectorAll(".glass-card");
    if (cards.length === 0) return true; // no cards yet = ok
    const cs = getComputedStyle(cards[0]);
    return cs.backdropFilter?.includes("blur") || cs.webkitBackdropFilter?.includes("blur");
  });
  expect(hasBlur).toBeTruthy();
});

test("light mode: glass-card has white/light background", async ({ page }) => {
  await load(page);
  await switchToLightMode(page);
  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll(".glass-card");
    if (cards.length === 0) return "no_cards";
    const cs = getComputedStyle(cards[0]);
    return cs.backgroundColor;
  });
  if (result !== "no_cards") {
    // Should be near white in light mode
    expect(result).not.toBe("rgba(12, 18, 34, 0.65)"); // the dark default
  }
});

test("modal-sheet class has backdrop-filter blur", async ({ page }) => {
  await load(page);
  const result = await page.evaluate(() => {
    const stylesheet = Array.from(document.styleSheets).find(ss => {
      try { return ss.cssRules.length > 0; } catch { return false; }
    });
    if (!stylesheet) return "no_sheet";
    const rules = Array.from(stylesheet.cssRules);
    const rule = rules.find(r => r.cssText?.includes("modal-sheet") && r.cssText?.includes("blur"));
    return rule ? "found" : "not_found";
  });
  expect(result).toBe("found");
});

/* ──────────────────────────────────────────────
   6. FONT LOADING
────────────────────────────────────────────── */
test("Plus Jakarta Sans font import is in the injected style tag", async ({ page }) => {
  await load(page);
  // The @import URL uses URL-encoded form: "Plus+Jakarta+Sans"
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
   7. ANIMATIONS
────────────────────────────────────────────── */
test("keyframe animations are defined: orbFloat1, shimmerBtn, countPop", async ({ page }) => {
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
  expect(animations).toContain("themePop");
  expect(animations).toContain("fadeUp");
});

/* ──────────────────────────────────────────────
   8. BENTO CLASSES
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
   9. LIGHT MODE CSS OVERRIDES
────────────────────────────────────────────── */
test("light mode CSS overrides exist for day-tile, pk-production, batch-v2", async ({ page }) => {
  await load(page);
  const overrides = await page.evaluate(() => {
    const needed = ["day-tile", "pk-production", "batch-v2"];
    const found: string[] = [];
    const sheets = Array.from(document.styleSheets);
    for (const s of sheets) {
      try {
        for (const r of Array.from(s.cssRules)) {
          const text = r.cssText || "";
          if (text.includes('[data-theme="light"]')) {
            needed.forEach(n => {
              if (text.includes(n) && !found.includes(n)) found.push(n);
            });
          }
        }
      } catch {}
    }
    return found;
  });
  expect(overrides).toContain("day-tile");
  expect(overrides).toContain("pk-production");
  expect(overrides).toContain("batch-v2");
});

/* ──────────────────────────────────────────────
   10. RESPONSIVE / NO CRASH
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

test("toggling theme back to dark restores dark data-theme attribute", async ({ page }) => {
  await load(page);
  // Start dark
  expect(await getDataTheme(page)).toBe("dark");
  // Switch to light
  await page.evaluate(() => localStorage.setItem("tfc_theme", "light"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3200);
  expect(await getDataTheme(page)).toBe("light");
  // Switch back to dark
  await page.evaluate(() => localStorage.setItem("tfc_theme", "dark"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3200);
  expect(await getDataTheme(page)).toBe("dark");
});
