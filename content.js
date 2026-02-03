// Content script: runs in every page. Listens for scan + highlight commands.

const HIGHLIGHT_ID = "__vertex_a11y_highlight__";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "VERTEX_SCAN") {
        const report = scanPage();
        sendResponse(report);
      } else if (msg.type === "VERTEX_HIGHLIGHT") {
        highlightAtPath(msg.path);
        sendResponse({ ok: true });
      } else if (msg.type === "VERTEX_TRY_FOCUS") {
        const node = getNodeByPath(msg.path);
        if (node) node.focus?.();
        sendResponse({ ok: true });
      }
    } catch (e) {
      sendResponse({ error: e.message || String(e) });
    }
  })();
  return true; // keep channel open (async)
});

/** ==================== SCANNER ===================== **/

function scanPage() {
  const issues = [];
  let checked = 0,
    passed = 0;

  // 1) Alt text on images
  const imgs = Array.from(document.images || []);
  checked += imgs.length || 1; // avoid divide-by-zero
  for (const img of imgs) {
    const hidden = isAriaHidden(img);
    const hasAlt =
      img.hasAttribute("alt") &&
      String(img.getAttribute("alt")).trim().length > 0;
    if (!hidden && !hasAlt) {
      issues.push(
        issue(
          "Images",
          "high",
          "Image missing alt text. Add a concise description of what the image conveys.",
          outerHTMLSnippet(img),
          `Add an alt: <img src="${
            (img.getAttribute("src") || "").split("?")[0]
          }" alt="describe image">`,
          pathOf(img),
          true
        )
      );
    } else {
      passed++;
    }
  }

  // 2) Color contrast (sample text elements)
  const textNodes = textElementsSample();
  checked += textNodes.length || 1;
  for (const el of textNodes) {
    const visible = isVisible(el);
    if (!visible) continue;
    const { color, bg, ratio, large } = contrastInfo(el);
    if (!color || !bg || isNaN(ratio)) continue;
    const min = large ? 3.0 : 4.5;
    if (ratio < min) {
      issues.push(
        issue(
          "Contrast",
          "high",
          `Text contrast ${ratio.toFixed(2)}:1 is below ${min}:1.`,
          textSnippet(el),
          "Increase contrast by darkening text color or lightening background to meet WCAG ratios.",
          pathOf(el),
          false
        )
      );
    } else {
      passed++;
    }
  }

  // 3) Keyboard accessibility (focusability of interactive-like elements)
  const clickCandidates = keyboardCandidates();
  checked += clickCandidates.length || 1;
  for (const el of clickCandidates) {
    if (isFocusable(el) || isNativeInteractive(el)) {
      passed++;
      continue;
    }
    issues.push(
      issue(
        "Keyboard",
        "medium",
        "Element appears interactive but is not focusable via keyboard (missing semantic tag or tabindex).",
        outerHTMLSnippet(el),
        "Use a <button> or add role='button' and tabindex='0' plus keyboard handlers.",
        pathOf(el),
        true
      )
    );
  }

  // 4) Semantic HTML & Landmarks
  const landmarks = ["main", "nav", "header", "footer"];
  checked += landmarks.length;
  for (const tag of landmarks) {
    const exists = !!document.querySelector(tag);
    if (!exists) {
      issues.push(
        issue(
          "Semantic",
          "low",
          `Missing landmark <${tag}>.`,
          "",
          `Add a <${tag}> landmark to improve screen reader navigation.`,
          null,
          false
        )
      );
    } else {
      passed++;
    }
  }

  // Headings order check (simple monotonic)
  const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  if (headings.length) {
    checked++;
    let ok = true,
      last = 0;
    for (const h of headings) {
      const lvl = Number(h.tagName[1]);
      if (last && lvl > last + 1) {
        ok = false;
        break;
      }
      last = lvl;
    }
    if (!ok) {
      issues.push(
        issue(
          "Semantic",
          "low",
          "Heading levels skip order (e.g., H2 directly to H4).",
          "",
          "Use headings without skipping levels to preserve structure.",
          null,
          false
        )
      );
    } else passed++;
  }

  // 5) Form labels
  const inputs = Array.from(document.querySelectorAll("input,textarea,select"));
  const inputsVisible = inputs.filter(
    (el) => (el.type || "") !== "hidden" && isVisible(el)
  );
  checked += inputsVisible.length || 1;
  for (const el of inputsVisible) {
    const ok = hasAccessibleLabel(el);
    if (!ok) {
      issues.push(
        issue(
          "Forms",
          "high",
          "Form control is missing an associated label.",
          outerHTMLSnippet(el),
          "Add <label for='id'>…</label> or aria-label / aria-labelledby.",
          pathOf(el),
          true
        )
      );
    } else passed++;
  }

  // 6) Media captions
  const videos = Array.from(document.querySelectorAll("video"));
  checked += videos.length || 1;
  for (const v of videos) {
    const hasTrack = !!v.querySelector(
      "track[kind='captions'], track[kind='subtitles']"
    );
    if (!hasTrack) {
      issues.push(
        issue(
          "Media",
          "high",
          "Video is missing captions/subtitles.",
          outerHTMLSnippet(v),
          `<track kind="captions" srclang="en" src="captions.vtt" label="English">`,
          pathOf(v),
          false
        )
      );
    } else passed++;
  }

  // 7) Zoom / viewport
  checked++;
  const metaV = document.querySelector('meta[name="viewport"]');
  const zoomBlocked =
    metaV &&
    /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0+)?(\b|,|;)/i.test(
      metaV.content || ""
    );
  if (zoomBlocked) {
    issues.push(
      issue(
        "Zoom",
        "high",
        "Viewport prevents zoom (user-scalable=no or maximum-scale=1).",
        metaV.outerHTML,
        "Remove user-scalable=no and allow scaling so users can zoom up to 200%.",
        null,
        false
      )
    );
  } else {
    passed++;
  }

  // Score
  const score = Math.max(0, Math.min(100, (passed / checked) * 100));

  return { checked, passed, score, issues };
}

/** ==================== HELPERS ===================== **/

function issue(type, severity, message, snippet, tip, path, fixable) {
  return {
    id: cryptoRandom(),
    type,
    severity,
    message,
    snippet,
    tip,
    path,
    fixable: !!fixable,
  };
}
function cryptoRandom() {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  } catch {
    return String(Math.random()).slice(2);
  }
}

function isAriaHidden(el) {
  const v = el.getAttribute("aria-hidden");
  return v === "true";
}

function isVisible(el) {
  if (!el) return false;
  try {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      rect.width > 0 &&
      rect.height > 0
    );
  } catch {
    return false;
  }
}

function hasAccessibleLabel(el) {
  if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`))
    return true;
  if (el.closest("label")) return true;
  if (el.getAttribute("aria-label")) return true;
  const aria = el.getAttribute("aria-labelledby");
  if (aria && aria.split(/\s+/).some((id) => document.getElementById(id)))
    return true;
  return false;
}

function isNativeInteractive(el) {
  return ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"].includes(
    el.tagName
  );
}

function isFocusable(el) {
  if (el.tabIndex >= 0) return true;
  // heuristic: links with href are focusable
  if (el.tagName === "A" && el.hasAttribute("href")) return true;
  return false;
}

function keyboardCandidates() {
  const all = Array.from(document.querySelectorAll("div,span,li,svg"));
  return all
    .filter((el) => {
      if (!el || !el.parentElement) return false;
      try {
        const cs = getComputedStyle(el);
        const looksClickable =
          cs.cursor === "pointer" ||
          el.getAttribute("role") === "button" ||
          el.hasAttribute("onclick");
        return looksClickable && isVisible(el);
      } catch {
        return false;
      }
    })
    .slice(0, 200); // cap for performance
}

/** Contrast calculations */
function textElementsSample() {
  // Grab a reasonable sample of text-bearing elements
  const nodes = Array.from(
    document.querySelectorAll("p,li,span,small,button,a,div,h1,h2,h3,h4,h5,h6")
  );
  return nodes
    .filter((n) => {
      const t = (n.innerText || "").trim();
      return t.length >= 6 && isVisible(n);
    })
    .slice(0, 400);
}

function contrastInfo(el) {
  const cs = getComputedStyle(el);
  const color = parseColor(cs.color);
  const bg = parseEffectiveBackground(el);
  const ratio = color && bg ? contrastRatio(color, bg) : NaN;
  const fontPx = parseFloat(cs.fontSize) || 14;
  const weight = parseInt(cs.fontWeight, 10) || 400;
  const large = fontPx >= 24 || (fontPx >= 18.66 && weight >= 700);
  return { color, bg, ratio, large };
}

function parseColor(str) {
  if (!str) return null;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = str;
    const v = ctx.fillStyle; // normalized
    // v like: #rrggbb or rgba(r,g,b,a)
    if (v.startsWith("#")) {
      const r = parseInt(v.slice(1, 3), 16),
        g = parseInt(v.slice(3, 5), 16),
        b = parseInt(v.slice(5, 7), 16);
      return { r, g, b, a: 1 };
    }
    const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  } catch {
    return null;
  }
}

function parseEffectiveBackground(el) {
  let node = el;
  while (node) {
    try {
      const cs = getComputedStyle(node);
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0.01) return { r: bg.r, g: bg.g, b: bg.b, a: 1 };
      node = node.parentElement;
    } catch {
      break;
    }
  }
  return { r: 255, g: 255, b: 255, a: 1 }; // fallback white
}

function relLum({ r, g, b }) {
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(c1, c2) {
  const L1 = relLum(c1) + 0.05,
    L2 = relLum(c2) + 0.05;
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return hi / lo;
}

function textSnippet(el) {
  const t = (el.innerText || "").trim().slice(0, 160);
  return t.length ? t : outerHTMLSnippet(el);
}

function outerHTMLSnippet(el) {
  const html = el.outerHTML || "";
  return html.length > 260 ? html.slice(0, 260) + "…" : html;
}

/** Selector path */
function pathOf(el) {
  if (!el || !el.parentElement) return null;
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 10) {
    let sel = node.tagName.toLowerCase();
    if (node.id) {
      sel += `#${CSS.escape(node.id)}`;
      parts.unshift(sel);
      break;
    }
    // Add null check for parentElement
    if (!node.parentElement) break;
    
    const siblings = Array.from(node.parentElement.children).filter(
      (n) => n.tagName === node.tagName
    );
    if (siblings.length > 1) {
      const idx = siblings.indexOf(node) + 1;
      sel += `:nth-of-type(${idx})`;
    }
    parts.unshift(sel);
    node = node.parentElement;
  }
  return parts.join(" > ");
}
function getNodeByPath(path) {
  if (!path) return null;
  try {
    return document.querySelector(path);
  } catch {
    return null;
  }
}

/** Highlight */
function highlightAtPath(path) {
  clearHighlight();
  const el = getNodeByPath(path);
  if (!el) return;
  const box = document.createElement("div");
  box.id = HIGHLIGHT_ID;
  const r = el.getBoundingClientRect();
  Object.assign(box.style, {
    position: "fixed",
    left: r.left - 4 + "px",
    top: r.top - 4 + "px",
    width: r.width + 8 + "px",
    height: r.height + 8 + "px",
    border: "2px solid #e74c3c",
    borderRadius: "10px",
    boxShadow: "0 0 0 200vmax rgba(231,76,60,.08) inset",
    pointerEvents: "none",
    zIndex: 2147483647,
  });
  document.body.appendChild(box);
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(clearHighlight, 2200);
}
function clearHighlight() {
  document.getElementById(HIGHLIGHT_ID)?.remove();
}