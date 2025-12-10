// ---------- utils ----------
const STORAGE_ENTRIES_KEY = "entries";
const STORAGE_CLOSING_KEY = "closingDay";
function $id(id){ return document.getElementById(id); }

// ---------- setup ----------
function setupClosingDayOptions(){
  const select = $id("closingDay");
  if(!select) return;
  select.innerHTML = '<option value="">選択してください</option>';
  for(let i=1;i<=31;i++){
    const op = document.createElement("option");
    op.value = i;
    op.textContent = i + "日";
    select.appendChild(op);
  }
  const saved = localStorage.getItem(STORAGE_CLOSING_KEY);
  const s = document.querySelector(".settings");
  if(saved){
    select.value = saved;
    if(s) s.style.display = "none";
  } else {
    if(s) s.style.display = "";
  }
}
function saveClosingDay(){
  const select = $id("closingDay");
  if(!select) return;
  const day = select.value;
  if(!day){ alert("締め日を選択してください"); return; }
  localStorage.setItem(STORAGE_CLOSING_KEY, day);
  alert("締め日を保存しました！");
  const s = document.querySelector(".settings");
  if(s) s.style.display = "none";
}

// ---------- storage ----------
function loadEntries(){
  try { return JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || "[]"); }
  catch(e){ console.error(e); return []; }
}
function saveEntries(entries){ localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries)); }

// ---------- add entry ----------
function addEntry(){
  const dateEl = $id("dateInput");
  const amountEl = $id("amountInput");
  const noteEl = $id("noteInput");
  const date = dateEl ? dateEl.value : "";
  const raw = amountEl ? String(amountEl.value).replace(/[¥,\s]/g,"") : "";
  const amount = raw === "" ? NaN : Number(raw);
  const note = noteEl ? noteEl.value : "";

  if(!date || isNaN(amount) || amount <= 0){
    alert("日付と正しい金額を入力してください");
    return;
  }

  const entry = { date, amount: Math.floor(amount), note };
  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);

  // clear amount and note (keep date)
  if(amountEl) amountEl.value = "";
  if(noteEl) noteEl.value = "";

  // show history and refresh
  showTab("history");
  render();
}

// ---------- rendering ----------
function formatYen(n){ return "¥" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g,","); }

function computePeriodRange(today, closingDayNumber){
  if(!closingDayNumber || closingDayNumber < 1 || closingDayNumber > 31){
    const start = new Date(today.getFullYear(), today.getMonth(), 1,0,0,0);
    const end   = new Date(today.getFullYear(), today.getMonth()+1, 0,23,59,59);
    return { start, end };
  }
  const c = closingDayNumber;
  let start, end;
  if(today.getDate() > c){
    start = new Date(today.getFullYear(), today.getMonth(), c+1,0,0,0);
    end   = new Date(today.getFullYear(), today.getMonth()+1, c,23,59,59);
  } else {
    start = new Date(today.getFullYear(), today.getMonth()-1, c+1,0,0,0);
    end   = new Date(today.getFullYear(), today.getMonth(), c,23,59,59);
  }
  return { start, end };
}

function render(){
  const entries = loadEntries();
  const historyList = $id("historyList");
  const monthlyList = $id("monthlyList");
  const monthlyTotalSpan = $id("monthlyTotal");
  if(!historyList || !monthlyList || !monthlyTotalSpan) return;

  historyList.innerHTML = "";
  monthlyList.innerHTML = "";

  const today = new Date();
  const closingDayNumber = Number(localStorage.getItem(STORAGE_CLOSING_KEY) || 31);
  const period = computePeriodRange(today, closingDayNumber);

  let monthlySum = 0;

  const sorted = entries.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  sorted.forEach(e=>{
    const d = new Date(e.date);
    const li = document.createElement("li");
    li.innerHTML = `${e.date}　${formatYen(e.amount)}<br><small>${e.note || ""}</small>`;
    historyList.appendChild(li);
    if(d >= period.start && d <= period.end) monthlySum += Number(e.amount||0);
  });

  monthlyTotalSpan.innerText = formatYen(monthlySum);

  // monthly summary
  const monthlyMap = {};
  entries.forEach(e=>{
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + Number(e.amount||0);
  });
  const keys = Object.keys(monthlyMap).sort((a,b)=> b.localeCompare(a));
  keys.forEach(k=>{
    const li = document.createElement("li");
    li.textContent = `${k}：${formatYen(monthlyMap[k])}`;
    monthlyList.appendChild(li);
  });
}

// ---------- chart ----------
let chartInstance = null;
function renderChart(labels=[], values=[]){
  const canvas = $id("chartCanvas");
  if(!canvas) return;
  if(!labels || labels.length===0){
    const ctx = canvas.getContext("2d"); ctx.clearRect(0,0,canvas.width,canvas.height); return;
  }
  if(chartInstance){ try{ chartInstance.destroy(); }catch(e){} chartInstance = null; }
  chartInstance = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ label: "つもり貯金", data: values }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
  });
}

// ---------- tabs ----------
function showTab(tab){
  const tabs = ["history","monthly","chart"];
  tabs.forEach(t=>{
    const el = $id("tab-"+t);
    if(el) el.classList.add("hidden");
  });
  const target = $id("tab-"+tab);
  if(target) target.classList.remove("hidden");

  if(tab==="chart"){
    const entries = loadEntries();
    const monthlyMap = {};
    entries.forEach(e=>{
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + Number(e.amount||0);
    });
    const labels = Object.keys(monthlyMap).sort();
    const values = labels.map(l=> monthlyMap[l]);
    renderChart(labels, values);
  }
}

// ---------- CSV export ----------
function exportCSV(){
  const entries = loadEntries();
  let csv = "date,amount,note\n";
  entries.forEach(e=> csv += `${e.date},${e.amount},${(e.note||"").replace(/\\n/g," ")}\\n`);
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "tsumori.csv"; a.click();
}

// ---------- init ----------
document.addEventListener("DOMContentLoaded", ()=>{
  setupClosingDayOptions();

  // set default date to today if empty
  const dateEl = $id("dateInput");
  if(dateEl && !dateEl.value){
    const t = new Date();
    const iso = t.toISOString().slice(0,10);
    dateEl.value = iso;
  }

  // amount input mobile tweaks
  const amountEl = $id("amountInput");
  if(amountEl){
    amountEl.setAttribute("inputmode","numeric");
    amountEl.setAttribute("pattern","[0-9]*");
    amountEl.addEventListener("focus", ()=> { amountEl.value = String(amountEl.value).replace(/[¥,]/g,""); });
    amountEl.addEventListener("input", ()=> {
      const v = String(amountEl.value).replace(/[¥,]/g,"");
      if(v === "") return;
      if(!isNaN(v)){
        amountEl.value = v.replace(/\B(?=(\d{3})+(?!\d))/g,",");
      }
    });
  }

  // wire up form button if inline wasn't used
  const addBtn = document.querySelector(".form button");
  if(addBtn){ addBtn.addEventListener("click", (e)=>{ e.preventDefault(); addEntry(); }); }

  // show history by default
  showTab("history");
  render();
});
