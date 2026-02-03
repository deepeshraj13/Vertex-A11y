(()=>{var n=document.getElementById("scanBtn"),c=document.getElementById("scoreCard"),u=document.getElementById("issuesSection"),i=document.getElementById("issuesList"),v=document.getElementById("issueCount"),o=document.getElementById("sortSelect"),d=null;n.addEventListener("click",async()=>{n.disabled=!0,n.textContent="Scanning\u2026";try{let[t]=await chrome.tabs.query({active:!0,currentWindow:!0}),e=await chrome.tabs.sendMessage(t.id,{type:"VERTEX_SCAN"});d=e,p(e),l(e.issues)}catch(t){m(t)}finally{n.disabled=!1,n.innerHTML='<span class="play">\u25B6</span> Scan this Page'}});o.addEventListener("change",()=>{if(!d)return;let t=[...d.issues],e=o.value;e==="type"&&t.sort((s,a)=>s.type.localeCompare(a.type)),e==="severity"&&t.sort((s,a)=>r(a.severity)-r(s.severity)),e==="fixable"&&t.sort((s,a)=>Number(a.fixable)-Number(s.fixable)),l(t)});function r(t){return t==="high"?3:t==="medium"?2:1}function p(t){let e=t.score>=95?"AAA":t.score>=85?"AA":t.score>=70?"A":"Needs Work",s=t.score>=95?"badge-aaa":t.score>=85?"badge-aa":t.score>=70?"badge-a":"badge-needs-work";c.classList.remove("hidden"),c.innerHTML=`
    <div class="score">
      <div>
        <div style="font-size:28px;font-weight:800">${Math.round(t.score)}%</div>
        <div class="muted">Estimated compliance</div>
      </div>
      <div class="badge-tier ${s}" aria-label="Tier">${e}</div>
    </div>
    <div class="muted" style="margin-top:6px">${t.passed}/${t.checked} checks passed</div>
  `,u.classList.remove("hidden")}function l(t){i.innerHTML="",v.textContent=`${t.length} issue${t.length!==1?"s":""}`;for(let e of t){let s=document.createElement("div");s.className="issue",s.innerHTML=`
      <div class="head">
        <div class="type">${e.type}</div>
        <div class="sev ${e.severity}">${e.severity}</div>
      </div>
      <div class="muted" style="margin-top:4px">${e.message}</div>
      ${e.snippet?`<pre class="code">${y(e.snippet)}</pre>`:""}
      ${e.tip?`<div style="margin-top:6px">\u{1F4A1} <strong>Fix:</strong> ${e.tip}</div>`:""}
      <div class="actions">
        ${e.path?`<button class="btn" data-act="reveal" data-path="${e.path}">Reveal on page</button>`:""}
        ${e.fixable?`<button class="btn" data-act="focus" data-path="${e.path}">Try focus</button>`:""}
      </div>
    `,i.appendChild(s)}i.querySelectorAll("button[data-act='reveal']").forEach(e=>{e.addEventListener("click",async()=>{let[s]=await chrome.tabs.query({active:!0,currentWindow:!0});await chrome.tabs.sendMessage(s.id,{type:"VERTEX_HIGHLIGHT",path:e.dataset.path})})}),i.querySelectorAll("button[data-act='focus']").forEach(e=>{e.addEventListener("click",async()=>{let[s]=await chrome.tabs.query({active:!0,currentWindow:!0});await chrome.tabs.sendMessage(s.id,{type:"VERTEX_TRY_FOCUS",path:e.dataset.path})})})}function m(t){c.classList.remove("hidden"),c.innerHTML=`<div style="color:#ff7675;font-weight:700">Error</div>
    <div class="muted">${t?.message||"Could not scan this page."}</div>`}function y(t){return t.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}})();
