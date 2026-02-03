import { animate } from "motion";

const scanBtn = document.getElementById("scanBtn");
const scoreCard = document.getElementById("scoreCard");
const issuesSection = document.getElementById("issuesSection");
const issuesList = document.getElementById("issuesList");
const issueCountNum = document.getElementById("issueCountNum");

const filterBtn = document.getElementById("filterBtn");
const filterBtnLabel = document.getElementById("filterBtnLabel");
const filterMenu = document.getElementById("filterMenu");

const tsBtn = document.getElementById("tsBtn");
const tsMenu = document.getElementById("tsMenu");
const typeList = document.getElementById("typeList");
const sevList = document.getElementById("sevList");

const exportBtn = document.getElementById("exportBtn");

let lastReport = null;
let scope = "all"; // 'all' | 'fixable'
let typeFilter = ""; // "" means Any
let severityFilter = ""; // "" means Any

// --- events
scanBtn.addEventListener("click", runScan);

// All/Fixable dropdown
filterBtn.addEventListener("click", () => toggleMenu(filterMenu, filterBtn));
filterMenu.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-value]");
  if (!li) return;
  scope = li.getAttribute("data-value");
  for (const el of filterMenu.querySelectorAll("li"))
    el.setAttribute("aria-selected", el === li ? "true" : "false");
  filterBtnLabel.textContent = scope === "fixable" ? "Fixable" : "All";
  refreshList();
  closeMenu(filterMenu, filterBtn);
});

// Type/Severity combined menu
tsBtn.addEventListener("click", () => toggleMenu(tsMenu, tsBtn));

typeList.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-value]");
  if (!li) return;
  typeFilter = li.getAttribute("data-value"); // may be ""
  markSelected(typeList, li);
  refreshList();
});

sevList.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-value]");
  if (!li) return;
  severityFilter = li.getAttribute("data-value"); // "", high, medium, low
  markSelected(sevList, li);
  refreshList();
});

// global click to close menus
document.addEventListener("click", (e) => {
  if (!filterBtn.contains(e.target) && !filterMenu.contains(e.target))
    closeMenu(filterMenu, filterBtn);
  if (!tsBtn.contains(e.target) && !tsMenu.contains(e.target))
    closeMenu(tsMenu, tsBtn);
});

exportBtn.addEventListener("click", () => lastReport && exportPDF(lastReport));

// --- scan
async function runScan() {
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning…";
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) throw new Error("No active tab.");
    if (!/^https?:\/\//i.test(tab.url || ""))
      throw new Error("Open a normal http(s) page and try again.");

    let report;
    try {
      report = await chrome.tabs.sendMessage(tab.id, { type: "VERTEX_SCAN" });
      if (!report || report.error)
        throw new Error(report?.error || "Scan failed.");
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      report = await chrome.tabs.sendMessage(tab.id, { type: "VERTEX_SCAN" });
      if (!report || report.error)
        throw new Error(report?.error || "Scan failed after injection.");
    }

    lastReport = stampIds(report);
    buildTypeMenu(lastReport.issues); // fills Type list sorted A→Z
    renderScore(lastReport);
    refreshList();

    animate(0, lastReport.issues.length, {
      duration: 1,
      onUpdate: (latest) => (issueCountNum.textContent = Math.round(latest)),
    });
  } catch (e) {
    renderError(e);
  } finally {
    scanBtn.disabled = false;
    scanBtn.innerHTML = `<span class="play">▶</span> Scan this Page`;
  }
}

// --- menus helpers
function toggleMenu(menu, btn) {
  const open = !menu.classList.contains("open");
  closeMenu(filterMenu, filterBtn);
  closeMenu(tsMenu, tsBtn);
  if (open) {
    menu.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
  }
}
function closeMenu(menu, btn) {
  menu.classList.remove("open");
  btn.setAttribute("aria-expanded", "false");
}
function markSelected(list, li) {
  for (const el of list.querySelectorAll("li"))
    el.setAttribute("aria-selected", el === li ? "true" : "false");
}

// Build Type list (Any + alphabetical types)
function buildTypeMenu(items) {
  const set = new Set();
  for (const it of items) {
    const t = (it.type || "").trim();
    if (t) set.add(t);
  }
  const sorted = Array.from(set).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );
  typeList.innerHTML =
    `<li role="option" data-value="" aria-selected="${
      typeFilter === ""
    }"><span class="radio"></span>Any</li>` +
    sorted
      .map(
        (t) =>
          `<li role="option" data-value="${escapeAttr(t)}" aria-selected="${
            typeFilter.toLowerCase() === t.toLowerCase()
          }"><span class="radio"></span>${escapeHTML(t)}</li>`
      )
      .join("");
}

// --- filtering + render
function refreshList() {
  if (!lastReport) return;
  const filtered = applyFilters(lastReport.issues);
  renderIssues(filtered);
}

function applyFilters(items) {
  let out = items;
  if (scope === "fixable") out = out.filter((i) => i.fixable);
  if (typeFilter)
    out = out.filter(
      (i) => (i.type || "").toLowerCase() === typeFilter.toLowerCase()
    );
  if (severityFilter)
    out = out.filter(
      (i) => (i.severity || "").toLowerCase() === severityFilter.toLowerCase()
    );
  return out;
}

issuesList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");
  const issue = lastReport?.issues?.find((i) => i.id === id);
  if (!issue) return;

  if (action === "reveal") {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab.");
      if (!/^https?:\/\//i.test(tab.url || ""))
        throw new Error("Action blocked on this page.");
      await chrome.tabs.sendMessage(tab.id, {
        type: "VERTEX_HIGHLIGHT",
        path: issue.path || null,
      });
    } catch (err) {
      renderError(err);
    }
    return;
  }

  if (action === "ai-explain") {
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "Explaining…";
    
    const card = btn.closest(".issue");
    const exp = card?.querySelector(".explain-slot");
    
    // Add timeout to prevent infinite freeze
    const timeout = setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalText;
      if (exp) {
        exp.innerHTML = `<div class="muted" style="margin-top:6px;color:#ff6b6b;">Request timed out. Please try again.</div>`;
      }
    }, 15000); // 15 second timeout
    
    try {
      console.log("Sending AI_EXPLAIN request:", issue);
      const res = await chrome.runtime.sendMessage({
        type: "AI_EXPLAIN",
        item: issue,
      });
      
      clearTimeout(timeout); // Clear timeout if we get a response
      
      console.log("AI_EXPLAIN response:", res);
      
      if (!res?.ok) throw new Error(res?.error || "AI failed.");
      
      issue.explain = res.details || "";
      
      if (exp) {
        exp.innerHTML = renderExplainHTML(issue.explain);
      } else {
        refreshList();
      }
    } catch (err) {
      clearTimeout(timeout);
      console.error("AI explain error:", err);
      if (exp) {
        exp.innerHTML = `<div class="muted" style="margin-top:6px;color:#ff6b6b;">Error: ${escapeHTML(err.message)}</div>`;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
});

// --- renderers
function renderScore(r) {
  const pct = Math.round(r.score);
  const tier =
    pct >= 90 ? "AAA" : pct >= 80 ? "AA" : pct >= 70 ? "A" : "Needs Work";
  const badgeClass =
    tier == "AAA"
      ? "badge-aaa"
      : tier == "AA"
      ? "badge-aa"
      : tier == "A"
      ? "badge-a"
      : "badge-needs-work";

  scoreCard.classList.remove("hidden");
  scoreCard.innerHTML = `
    <div class="score">
      <div>
        <div id="score"><span id="score-num">${Math.round(
          r.score
        )}</span><span>%</span></div>
        <div class="muted">Estimated compliance</div>
      </div>
      <div class="badge-tier ${badgeClass}" aria-label="Tier">${tier}</div>
    </div>
    <div id="pass-ratio" class="muted">
      <div>
        <span id="passed-num">${r.passed}</span>
        <span>/ ${r.checked} checks passed</span>
      </div>
      <div id="progress-bar-container">
        <div id="progress-background" class="progress-bar"></div>
        <div id="progress-foreground" class="progress-bar"</div>
    </div>
      
    </div>`;
  issuesSection.classList.remove("hidden");

  const score = document.getElementById("score-num");

  animate(0, r.score, {
    duration: 1,
    onUpdate: (latest) => (score.innerHTML = Math.round(latest)),
  });

  const passedNum = document.getElementById("passed-num");

  animate(0, r.passed, {
    duration: 1,
    onUpdate: (latest) => (passedNum.innerHTML = Math.round(latest)),
  });

  const progressBar = document.getElementById("progress-foreground");
  const backgroundColor =
    tier == "AAA"
      ? "#40e014ff"
      : tier == "AA"
      ? "#31d07f"
      : tier == "A"
      ? "#ffb347"
      : "#ff6b6b";

  animate(
    progressBar,
    {
      scaleX: [0, r.score * 0.01],
      backgroundColor: ["#1c1d20", backgroundColor],
      ease: "linear",
      duration: 1,
    },
    { type: "spring", bounce: 0 }
  );
}

function renderIssues(items) {
  issuesList.innerHTML = "";
  for (const it of items) {
    const el = document.createElement("div");
    el.className = "issue";

    let previewHTML = "";
    if ((it.type || "").toLowerCase() === "images") {
      const src = extractSrc(it.snippet) || extractSrc(it.tip);
      if (src)
        previewHTML = `<div class="preview"><img src="${escapeAttr(
          src
        )}" alt=""></div>`;
    }

    el.innerHTML = `
      <div class="head">
        <div class="type">${escapeHTML(it.type || "Issue")}</div>
        <div class="sev ${escapeHTML(
          (it.severity || "low").toLowerCase()
        )}">${escapeHTML(it.severity || "low")}</div>
      </div>
      <div class="muted" style="margin-top:4px">${escapeHTML(
        it.message || ""
      )}</div>
      ${it.snippet ? `<pre class="code">${escapeHTML(it.snippet)}</pre>` : ""}
      ${
        it.tip
          ? `<div style="margin-top:6px">💡 <strong>Fix:</strong> ${escapeHTML(
              it.tip
            )}</div>`
          : ""
      }
      ${previewHTML}
      <div class="actions">
        <button class="btn" data-action="reveal" data-id="${
          it.id
        }">Reveal on page</button>
        <button class="btn ghost" data-action="ai-explain" data-id="${
          it.id
        }">Explain</button>
      </div>
      <div class="explain-slot" style="margin-top:8px">${
        it.explain ? renderExplainHTML(it.explain) : ""
      }</div>
    `;
    issuesList.appendChild(el);
  }
}

function renderExplainHTML(md) {
  if (!md) return "";
  
  // Don't escape HTML - let markdown render naturally
  // Just clean up the formatting
  let formatted = md
    .replace(/^- /gm, "• ") // Convert markdown bullets to actual bullets
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
    .replace(/`(.*?)`/g, "<code>$1</code>") // Inline code
    .replace(/\n/g, "<br>"); // Line breaks
  
  return `<div class="ai-explain" style="margin-top:8px;padding:10px;background:#0a0b0f;border:1px solid #1b1d23;border-radius:10px;"><strong style="color:#7cc7ff;">AI Explanation:</strong><br><br>${formatted}</div>`;
}

function renderError(err) {
  scoreCard.classList.remove("hidden");
  scoreCard.innerHTML = `
    <div style="color:#ff7675;font-weight:700">Error</div>
    <div class="muted">${escapeHTML(
      err?.message || "Something went wrong."
    )}</div>
  `;
}

// --- Export PDF (unchanged behavior)
function exportPDF(report) {
  const items = applyFilters(report.issues);
  const now = new Date().toLocaleString();

  const style = `
  <style>
    body{font:14px/1.5 -apple-system,Segoe UI,Inter,Roboto,Arial;padding:24px;color:#111}
    h1{margin:0 0 6px;font-size:22px}
    .muted{color:#555}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-weight:700;margin-left:8px}
    .a{background:#222;color:#fff}.aa{background:#0e7a4f;color:#eafff2}.aaa{background:#09522e;color:#caffdb}
    .issue{border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0}
    .head{display:flex;justify-content:space-between;align-items:center}
    .sev{font-weight:700;text-transform:uppercase;font-size:11px}
    .sev.high{color:#c0392b}.sev.medium{color:#d35400}.sev.low{color:#2e8b57}
    pre{background:#f6f7f9;border:1px solid #e2e5ea;border-radius:8px;padding:8px;overflow:auto}
    img{max-width:100%;border-radius:8px}
    .preview{border:1px solid #eee;border-radius:10px;padding:6px;margin-top:8px}
    @media print {.no-print{display:none}}
  </style>`;

  const pct = Math.round(report.score);
  const tier =
    pct >= 90 ? "AAA" : pct >= 50 ? "AA" : pct >= 30 ? "A" : "Needs Work";
  const tierClass = pct >= 90 ? "aaa" : pct >= 50 ? "aa" : "a";

  const issueHTML = items
    .map((it) => {
      const imgSrc =
        (it.type || "").toLowerCase() === "images"
          ? extractSrc(it.snippet) || extractSrc(it.tip)
          : "";
      return `
      <div class="issue">
        <div class="head">
          <div><strong>${escapeHTML(it.type || "Issue")}</strong></div>
          <div class="sev ${escapeHTML(
            (it.severity || "low").toLowerCase()
          )}">${escapeHTML(it.severity || "low")}</div>
        </div>
        <div class="muted">${escapeHTML(it.message || "")}</div>
        ${it.snippet ? `<pre>${escapeHTML(it.snippet)}</pre>` : ""}
        ${
          it.tip ? `<div><strong>Fix:</strong> ${escapeHTML(it.tip)}</div>` : ""
        }
        ${
          imgSrc
            ? `<div class="preview"><img src="${escapeAttr(
                imgSrc
              )}" alt=""></div>`
            : ""
        }
        ${
          it.explain
            ? `<div class="muted" style="margin-top:6px">${escapeHTML(
                it.explain
              )
                .replace(/^-\s+/gm, "• ")
                .replace(/\n/g, "<br>")}</div>`
            : ""
        }
      </div>`;
    })
    .join("");

  const html = `
  <!doctype html><html><head><meta charset="utf-8">${style}</head>
  <body>
    <div class="no-print" style="text-align:right"><button onclick="window.print()">Print / Save PDF</button></div>
    <h1>Vertex A11y report <span class="badge ${tierClass}">${tier}</span></h1>
    <div class="muted">Generated: ${escapeHTML(now)}</div>
    <p><strong>${pct}%</strong> compliance — ${report.passed}/${
    report.checked
  } checks passed — ${items.length} issues (current view)</p>
    ${issueHTML}
    <script>window.print()<\/script>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url });
}

// --- helpers
function stampIds(r) {
  let i = 0;
  for (const it of r.issues) if (!it.id) it.id = `i${++i}`;
  return r;
}
function escapeHTML(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}
function extractSrc(str) {
  if (!str) return null;
  const m =
    String(str).match(/src\s*=\s*"([^"]+)"/i) ||
    String(str).match(/src\s*=\s*'([^']+)'/i);
  return m ? m[1] : null;
}