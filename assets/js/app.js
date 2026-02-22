const STORAGE_KEY = "approvehub_demo_state_v1";

const $app = document.getElementById("app");
const $search = document.getElementById("searchInput");

const $btnNewJob = document.getElementById("btnNewJob");
const $btnCompany = document.getElementById("btnCompany");

const $modal = document.getElementById("modal");
const $modalTitle = document.getElementById("modalTitle");
const $modalBody = document.getElementById("modalBody");
const $modalFoot = document.getElementById("modalFoot");
const $modalClose = document.getElementById("modalClose");
const $modalBackdrop = document.getElementById("modalBackdrop");

function uid(prefix="id"){ return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`; }
function money(n){ return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0)); }

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return seedState();
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedState(){
  const demo = {
    company: {
      name: "My Construction Ltd",
      vatNumber: "GB123456789",
      companyReg: "12345678",
      utr: "12345 67890",
      ni: "(020) 1234 5678",
      address: "123 Oak Street, Central City",
      billingAddress: "123 Oak Street, Central City",
      phone: "(020) 1234 5678",
    },
    settings: {
      vatRate: 0.20
    },
    jobs: [
      { id: uid("job"), name:"Hilltop Apartments", location:"Central City", status:"open", invoices: demoInvoices() },
      { id: uid("job"), name:"Oakwood Office Park", location:"Oakwood", status:"open", invoices: demoInvoices() },
      { id: uid("job"), name:"Lakeside Shopping Center", location:"Riverside", status:"open", invoices: demoInvoices() },
      { id: uid("job"), name:"Downtown Tower", location:"Metroville", status:"open", invoices: demoInvoices() },
      { id: uid("job"), name:"Greenfield Housing", location:"Greenfield", status:"open", invoices: demoInvoices() },
      { id: uid("job"), name:"Seaview Condos", location:"Coastal Town", status:"completed", invoices: demoInvoices() }
    ]
  };
  return demo;

  function demoInvoices(){
    // 28 placeholders like your screenshot (invoice tiles)
    const invoices = [];
    for(let i=1;i<=28;i++){
      invoices.push({
        id: uid("inv"),
        number: i,
        supplier: i===1 ? "Smithson Brickwork" : i===2 ? "Turner Electric Ltd" : i===3 ? "Plant Hire Solutions" : `Supplier ${i}`,
        amount: i===1 ? 8000 : i===2 ? 3500 : i===3 ? 1200 : 0,
        ref: `INV-${String(100000 + i)}`,
        paidByClient: i<=3, // demo
        notes: ""
      });
    }
    return invoices;
  }
}

let state = loadState();

// ----------------- Routing -----------------
function parseRoute(){
  const hash = (location.hash || "#/jobs").replace("#", "");
  const parts = hash.split("/").filter(Boolean);
  // routes:
  // /jobs
  // /company
  // /job/:id
  // /job/:id/invoice/:invId
  return parts;
}

function navigate(path){
  location.hash = path.startsWith("#") ? path : `#${path}`;
}

window.addEventListener("hashchange", render);
$search.addEventListener("input", render);

$btnCompany.addEventListener("click", ()=> navigate("/company"));
$btnNewJob.addEventListener("click", openNewJobModal);

$modalClose.addEventListener("click", closeModal);
$modalBackdrop.addEventListener("click", closeModal);

// ----------------- Render -----------------
function render(){
  const parts = parseRoute();

  if(parts[0] === "company") return renderCompany();
  if(parts[0] === "job" && parts[1] && parts[2] === "invoice" && parts[3]) {
    return renderInvoiceDetail(parts[1], parts[3]);
  }
  if(parts[0] === "job" && parts[1]) return renderJobDetail(parts[1]);

  return renderJobs();
}

function renderJobs(){
  const q = ($search.value || "").trim().toLowerCase();
  const filtered = state.jobs.filter(j => {
    const hay = `${j.name} ${j.location} ${j.status}`.toLowerCase();
    return hay.includes(q);
  });

  const tabsHtml = `
    <div class="tabs">
      ${tabBtn("all","All Jobs")}
      ${tabBtn("open","Open Jobs")}
      ${tabBtn("archived","Archived")}
    </div>
  `;

  // default "all" tab; simple but easy
  const activeTab = getTab();
  const jobs = filtered.filter(j => activeTab==="all" ? true : (activeTab==="open" ? j.status==="open" : j.status==="archived"));

  const cards = jobs.map(jobCard).join("");

  const completed = state.jobs.filter(j=>j.status==="completed").map(j => `
    <div class="card" style="grid-column: span 12;">
      <div class="row">
        <div>
          <div class="title">${escapeHtml(j.name)} <span class="badge green">✓ Completed</span></div>
          <div class="meta">${escapeHtml(j.location)}</div>
        </div>
        <a class="btn" href="#/job/${j.id}">Open</a>
      </div>
    </div>
  `).join("");

  $app.innerHTML = `
    <div class="h1">Your Jobs</div>
    <p class="sub">Create jobs, track invoices, and approve releases. This is a front-end demo (no real payments).</p>
    ${tabsHtml}

    <div class="grid">
      ${cards || `<div class="panel" style="grid-column:span 12;">No jobs found.</div>`}
    </div>

    <div class="section-title">Completed Projects</div>
    <div class="grid">
      ${completed || `<div class="panel" style="grid-column:span 12;">No completed projects yet.</div>`}
    </div>
  `;

  // tab listeners
  document.querySelectorAll("[data-tab]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setTab(btn.getAttribute("data-tab"));
      render();
    });
  });
}

function jobCard(job){
  const {approved, pending, pct} = approvalStats(job);
  return `
    <div class="card">
      <div class="title">
        <span>${escapeHtml(job.name)}</span>
        <span class="small">›</span>
      </div>
      <div class="meta">${escapeHtml(job.location)}</div>

      <div class="row">
        <span class="badge green">✓ ${approved} Approved</span>
        <span class="badge amber">⏳ ${pending} Pending</span>
      </div>

      <div class="progress" aria-label="Progress">
        <div style="width:${pct}%"></div>
      </div>

      <div style="margin-top:12px;">
        <a class="btn block primary" href="#/job/${job.id}">Open job</a>
      </div>
    </div>
  `;
}

function renderJobDetail(jobId){
  const job = state.jobs.find(j=>j.id===jobId);
  if(!job){ $app.innerHTML = `<div class="panel">Job not found.</div>`; return; }

  const tiles = job.invoices.map(inv => `
    <div class="tile" data-inv="${inv.id}">
      <div class="num">${inv.number}</div>
      <div class="label">${inv.amount ? money(inv.amount) : "Fill out invoice"}</div>
    </div>
  `).join("");

  $app.innerHTML = `
    <div class="small"><a href="#/jobs">← Your Jobs</a> <span class="small">›</span> ${escapeHtml(job.name)}</div>
    <div class="h1">${escapeHtml(job.name)} <span class="badge green">${approvalStats(job).approved} Approved</span></div>
    <p class="sub">${escapeHtml(job.location)} • Click an invoice tile to view the summary.</p>

    <div class="panel">
      <div class="invoice-grid">${tiles}</div>
      <div style="margin-top:16px; text-align:center;">
        <button class="btn primary" id="btnAddInvoice">+ Add Invoice</button>
      </div>
    </div>

    <div class="section-title">Job actions</div>
    <div class="panel">
      <div class="footer-actions">
        <button class="btn" id="btnArchive">${job.status==="archived" ? "Unarchive" : "Archive job"}</button>
        <button class="btn" id="btnComplete">Mark completed</button>
        <button class="btn" id="btnDelete" style="border-color:#fecaca;">Delete job</button>
      </div>
      <p class="small" style="margin-top:10px;">
        This demo saves in your browser only. Real approvals/releases would be handled by your escrow/PBA partner in V2.
      </p>
    </div>
  `;

  document.querySelectorAll("[data-inv]").forEach(tile=>{
    tile.addEventListener("click", ()=>{
      const invId = tile.getAttribute("data-inv");
      navigate(`/job/${job.id}/invoice/${invId}`);
    });
  });

  document.getElementById("btnAddInvoice").addEventListener("click", ()=> openAddInvoiceModal(job.id));
  document.getElementById("btnArchive").addEventListener("click", ()=> toggleArchive(job.id));
  document.getElementById("btnComplete").addEventListener("click", ()=> markCompleted(job.id));
  document.getElementById("btnDelete").addEventListener("click", ()=> deleteJob(job.id));
}

function renderInvoiceDetail(jobId, invId){
  const job = state.jobs.find(j=>j.id===jobId);
  if(!job){ $app.innerHTML = `<div class="panel">Job not found.</div>`; return; }
  const inv = job.invoices.find(i=>i.id===invId);
  if(!inv){ $app.innerHTML = `<div class="panel">Invoice not found.</div>`; return; }

  // Totals
  const paid = job.invoices.filter(i=>i.paidByClient && i.amount>0);
  const totalToPayees = paid.reduce((s,i)=>s+Number(i.amount||0),0);

  // This matches your screenshot logic:
  // Client Payment (Before VAT) is editable.
  // Leftover = clientPayment - totalToPayees (this is "your company pot")
  // VAT on your company pot = leftover - leftover/(1+vatRate)
  const vatRate = Number(state.settings.vatRate ?? 0.2);
  const clientPayment = Number(inv.clientPaymentBeforeVat ?? 15290); // per-invoice demo input
  const leftoverInclVat = Math.max(0, clientPayment - totalToPayees);
  const feeNet = leftoverInclVat / (1 + vatRate);
  const feeVat = leftoverInclVat - feeNet;

  const baselineTotal = clientPayment * (1 + vatRate);
  const actualTotal = clientPayment + feeVat;
  const saving = Math.max(0, baselineTotal - actualTotal);

  $app.innerHTML = `
    <div class="small">
      <a href="#/jobs">← Your Jobs</a> <span class="small">›</span>
      <a href="#/job/${job.id}">${escapeHtml(job.name)}</a> <span class="small">›</span>
      Invoice #${inv.number}
    </div>

    <div class="h1">${escapeHtml(job.name)}</div>

    <div class="split">
      <div class="panel">
        <div class="kpi">
          <div class="label">Client Payment (Before VAT)</div>
          <div class="big">${money(clientPayment)}</div>
          <div class="small" style="margin-top:10px;">
            Edit amount (demo):
          </div>
          <input class="input" id="clientPayInput" type="number" step="0.01" value="${clientPayment}">
        </div>

        <div style="margin-top:14px;">
          <table class="table">
            <tr><td>Leftover payment for your company</td><td>${money(leftoverInclVat)}</td></tr>
            <tr><td>Total to subcontractors & suppliers</td><td>${money(totalToPayees)}</td></tr>
            <tr><td>Total to your company (incl. VAT)</td><td>${money(leftoverInclVat)}</td></tr>
            <tr><td class="small">Incl. ${Math.round(vatRate*100)}% VAT on your fee</td><td>${money(feeVat)}</td></tr>
          </table>

          <div class="row" style="margin-top:12px;">
            <div class="small">VAT note: Savings vary. VAT depends on supplier VAT status & project type.</div>
            <select class="select" id="vatRateSelect" style="max-width:160px;">
              <option value="0.2" ${vatRate===0.2?"selected":""}>20% VAT</option>
              <option value="0.0" ${vatRate===0?"selected":""}>0% VAT</option>
              <option value="0.05" ${vatRate===0.05?"selected":""}>5% VAT</option>
            </select>
          </div>
        </div>

        <div class="footer-actions">
          <button class="btn primary" id="btnShareLeft">Share With Customer</button>
          <button class="btn" id="btnBack">Back to job</button>
        </div>
      </div>

      <div>
        <div class="panel">
          <div class="section-title" style="margin-top:0;">Invoices Paid by Client</div>
          ${paid.length ? paid.map(row => `
            <div style="padding:10px 0; border-bottom:1px solid rgba(229,231,235,.9);">
              <div class="row">
                <div>
                  <div style="font-weight:900;">${escapeHtml(row.supplier)}</div>
                  <div class="small">${escapeHtml(row.ref)}</div>
                </div>
                <div style="text-align:right;">
                  <span class="badge green">Paid by client</span>
                  <div style="font-weight:900; margin-top:6px;">${money(row.amount)}</div>
                </div>
              </div>
            </div>
          `).join("") : `<div class="small">No paid invoices yet.</div>`}

          <div class="row" style="margin-top:12px;">
            <div class="badge">Total</div>
            <div style="font-weight:900;">${money(totalToPayees)}</div>
          </div>
        </div>

        <div class="panel" style="margin-top:14px;">
          <div class="section-title" style="margin-top:0;">Summary</div>

          <div class="kpi">
            <div class="label">Total cost saving (demo)</div>
            <div class="big">${money(saving)}</div>
            <div class="small" style="margin-top:8px;">
              Paying your total: <b>${money(actualTotal)}</b><br/>
              vs paying ${Math.round(vatRate*100)}% VAT on ${money(clientPayment)}: <b>${money(baselineTotal)}</b>
            </div>
          </div>

          <div class="footer-actions">
            <button class="btn primary" id="btnShareRight">Share With Customer</button>
          </div>

          <p class="small" style="margin-top:10px;">
            This is a demo calculator. Not tax advice. Real VAT depends on project + supplier VAT status.
          </p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnBack").addEventListener("click", ()=> navigate(`/job/${job.id}`));

  const onShare = ()=> {
    const text =
`ApproveHub Summary — ${job.name}
Client payment (before VAT): ${money(clientPayment)}
Paid to subcontractors/suppliers: ${money(totalToPayees)}
Your company pot (incl VAT): ${money(leftoverInclVat)}
VAT on your fee: ${money(feeVat)}
Total paid: ${money(actualTotal)}
Demo saving vs VAT on full amount: ${money(saving)}

Note: VAT depends on project and each supplier’s VAT status. Savings vary. Not tax advice.`;

    openShareModal(text);
  };

  document.getElementById("btnShareLeft").addEventListener("click", onShare);
  document.getElementById("btnShareRight").addEventListener("click", onShare);

  document.getElementById("clientPayInput").addEventListener("input", (e)=>{
    inv.clientPaymentBeforeVat = Number(e.target.value || 0);
    saveState();
    render();
  });

  document.getElementById("vatRateSelect").addEventListener("change",(e)=>{
    state.settings.vatRate = Number(e.target.value);
    saveState();
    render();
  });
}

function renderCompany(){
  const c = state.company || {};
  $app.innerHTML = `
    <div class="small"><a href="#/jobs">← Your Jobs</a></div>
    <div class="h1">Company Details</div>
    <p class="sub">Saved in your browser (demo). In a real app this would be per account.</p>

    <div class="panel">
      <div class="grid">
        <div class="card" style="grid-column:span 12;">
          <div class="grid">
            <div style="grid-column:span 6;">
              <label class="small">Company Name</label>
              <input class="input" id="c_name" value="${escapeAttr(c.name||"")}" />
            </div>
            <div style="grid-column:span 6;">
              <label class="small">VAT Number</label>
              <input class="input" id="c_vat" value="${escapeAttr(c.vatNumber||"")}" />
            </div>
            <div style="grid-column:span 6;">
              <label class="small">Company Reg. Number</label>
              <input class="input" id="c_reg" value="${escapeAttr(c.companyReg||"")}" />
            </div>
            <div style="grid-column:span 6;">
              <label class="small">UTR Number</label>
              <input class="input" id="c_utr" value="${escapeAttr(c.utr||"")}" />
            </div>
            <div style="grid-column:span 6;">
              <label class="small">Company Address</label>
              <input class="input" id="c_addr" value="${escapeAttr(c.address||"")}" />
            </div>
            <div style="grid-column:span 6;">
              <label class="small">Billing Address</label>
              <input class="input" id="c_bill" value="${escapeAttr(c.billingAddress||"")}" />
            </div>
            <div style="grid-column:span 6;">
              <label class="small">Phone Number</label>
              <input class="input" id="c_phone" value="${escapeAttr(c.phone||"")}" />
            </div>
          </div>

          <div class="footer-actions" style="margin-top:14px;">
            <button class="btn primary" id="btnSaveCompany">Save Changes</button>
            <button class="btn" id="btnCancelCompany">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnSaveCompany").addEventListener("click", ()=>{
    state.company = {
      ...state.company,
      name: val("c_name"),
      vatNumber: val("c_vat"),
      companyReg: val("c_reg"),
      utr: val("c_utr"),
      address: val("c_addr"),
      billingAddress: val("c_bill"),
      phone: val("c_phone"),
    };
    saveState();
    openModal("Saved", `<p>Company details saved in this browser.</p>`, [
      {label:"Back to jobs", primary:true, onClick: ()=>{ closeModal(); navigate("/jobs"); }}
    ]);
  });

  document.getElementById("btnCancelCompany").addEventListener("click", ()=> navigate("/jobs"));
}

// ----------------- Actions -----------------
function openNewJobModal(){
  openModal("New Job", `
    <div style="display:grid; gap:10px;">
      <div>
        <label class="small">Job name</label>
        <input class="input" id="newJobName" placeholder="e.g. Oakwood Office Park" />
      </div>
      <div>
        <label class="small">Location</label>
        <input class="input" id="newJobLoc" placeholder="e.g. Croydon" />
      </div>
    </div>
  `, [
    {label:"Cancel", onClick: closeModal},
    {label:"Create job", primary:true, onClick: ()=>{
      const name = (document.getElementById("newJobName").value||"").trim();
      const loc = (document.getElementById("newJobLoc").value||"").trim();
      if(!name){ alert("Please enter a job name."); return; }
      state.jobs.unshift({ id: uid("job"), name, location: loc || "—", status:"open", invoices: seedState().jobs[0].invoices });
      saveState();
      closeModal();
      navigate("/jobs");
      render();
    }}
  ]);
}

function openAddInvoiceModal(jobId){
  const job = state.jobs.find(j=>j.id===jobId);
  if(!job) return;

  openModal("Add Invoice", `
    <div style="display:grid; gap:10px;">
      <div>
        <label class="small">Supplier name</label>
        <input class="input" id="invSupplier" placeholder="e.g. Turner Electric Ltd" />
      </div>
      <div>
        <label class="small">Amount</label>
        <input class="input" id="invAmount" type="number" step="0.01" placeholder="e.g. 1200" />
      </div>
      <div class="row" style="justify-content:flex-start;">
        <input id="invPaid" type="checkbox" />
        <label for="invPaid" class="small">Marked as “Paid by client”</label>
      </div>
    </div>
  `, [
    {label:"Cancel", onClick: closeModal},
    {label:"Add", primary:true, onClick: ()=>{
      const supplier = (document.getElementById("invSupplier").value||"").trim() || "New supplier";
      const amount = Number(document.getElementById("invAmount").value||0);
      const paidByClient = !!document.getElementById("invPaid").checked;

      const nextNumber = Math.max(...job.invoices.map(i=>i.number)) + 1;
      job.invoices.push({
        id: uid("inv"),
        number: nextNumber,
        supplier,
        amount,
        ref:`INV-${String(100000+nextNumber)}`,
        paidByClient,
        notes:""
      });
      saveState();
      closeModal();
      render();
    }}
  ]);
}

function toggleArchive(jobId){
  const job = state.jobs.find(j=>j.id===jobId);
  if(!job) return;
  job.status = (job.status==="archived") ? "open" : "archived";
  saveState();
  render();
}
function markCompleted(jobId){
  const job = state.jobs.find(j=>j.id===jobId);
  if(!job) return;
  job.status = "completed";
  saveState();
  navigate("/jobs");
  render();
}
function deleteJob(jobId){
  if(!confirm("Delete this job?")) return;
  state.jobs = state.jobs.filter(j=>j.id!==jobId);
  saveState();
  navigate("/jobs");
  render();
}

// ----------------- Share -----------------
function openShareModal(text){
  openModal("Share with customer", `
    <p class="small">Copy the summary below, or share/print it.</p>
    <textarea class="input" id="shareText" style="min-height:160px; font-family:inherit;">${escapeHtml(text)}</textarea>
  `, [
    {label:"Copy", primary:true, onClick: async ()=>{
      try{
        await navigator.clipboard.writeText(document.getElementById("shareText").value);
        alert("Copied.");
      }catch(e){
        alert("Could not copy. Select the text and copy manually.");
      }
    }},
    {label:"Share", onClick: async ()=>{
      const v = document.getElementById("shareText").value;
      if(navigator.share){
        try{ await navigator.share({title:"ApproveHub Summary", text:v}); }
        catch(e){}
      }else{
        alert("Sharing not supported on this device. Use Copy instead.");
      }
    }},
    {label:"Print", onClick: ()=>{
      const v = document.getElementById("shareText").value;
      const w = window.open("", "_blank");
      w.document.write(`<pre style="font-family:Inter,Arial,sans-serif; white-space:pre-wrap; padding:24px;">${escapeHtml(v)}</pre>`);
      w.document.close();
      w.focus();
      w.print();
    }},
    {label:"Close", onClick: closeModal},
  ]);
}

// ----------------- Modal helpers -----------------
function openModal(title, bodyHtml, buttons=[]){
  $modalTitle.textContent = title;
  $modalBody.innerHTML = bodyHtml;
  $modalFoot.innerHTML = buttons.map((b, idx)=>`
    <button class="btn ${b.primary ? "primary":""}" data-modal-btn="${idx}">${b.label}</button>
  `).join("");
  $modal.classList.remove("hidden");

  document.querySelectorAll("[data-modal-btn]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.getAttribute("data-modal-btn"));
      buttons[idx]?.onClick?.();
    });
  });
}
function closeModal(){ $modal.classList.add("hidden"); }

// ----------------- Tabs (simple) -----------------
function getTab(){ return sessionStorage.getItem("approvehub_tab") || "all"; }
function setTab(v){ sessionStorage.setItem("approvehub_tab", v); }
function tabBtn(val, label){
  const active = getTab()===val ? "active" : "";
  return `<button class="tab ${active}" data-tab="${val}">${label}</button>`;
}

// ----------------- Utils -----------------
function approvalStats(job){
  const paid = job.invoices.filter(i=>i.paidByClient && i.amount>0).length;
  const total = job.invoices.length;
  const pending = Math.max(0, total - paid);
  const pct = total ? Math.round((paid/total)*100) : 0;
  return {approved: paid, pending, pct};
}
function val(id){ return (document.getElementById(id).value || "").trim(); }
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){ return escapeHtml(str).replaceAll("\n"," "); }

// boot
render();
