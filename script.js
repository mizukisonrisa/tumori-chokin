// ---------- utils ----------
const STORAGE_ENTRIES_KEY = "entries";
const STORAGE_CLOSING_KEY = "closingDay";

// safe get element helper
function $id(id) {
  return document.getElementById(id);
}

// ---------- 締め日（select）生成・保存 ----------
function setupClosingDayOptions() {
  const select = $id("closingDay");
  if (!select) return;

  // 初期化（重複生成防止）
  select.innerHTML = '<option value="">選択してください</option>';

  for (let i = 1; i <= 31; i++) {
    const op = document.createElement("option");
    op.value = i;
    op.textContent = i + "日";
    select.appendChild(op);
  }

  const savedDay = localStorage.getItem(STORAGE_CLOSING_KEY);
  if (savedDay) {
    select.value = savedDay;
    const s = document.querySelector(".settings");
    if (s) s.style.display = "none";
  } else {
    // 初回は表示（既に visible ならそのまま）
    const s = document.querySelector(".settings");
    if (s) s.style.display = "";
  }
}

function saveClosingDay() {
  const select = $id("closingDay");
  if (!select) return;
  const day = select.value;
  if (!day) {
    alert("締め日を選択してください");
    return;
  }
  localStorage.setItem(STORAGE_CLOSING_KEY, day);
  alert("締め日を保存しました！");
  const s = document.querySelector(".settings");
  if (s) s.style.display = "none";
}

// ---------- データ保存読み込み ----------
function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ENTRIES_KEY) || "[]");
  } catch (e) {
    console.error("loadEntries parse error", e);
    return [];
  }
}
function saveEntries(entries) {
  localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
}

// ---------- レコード追加 ----------
function addEntry() {
  const date = $id("dateInput") ? $id("dateInput").value : "";
  const amountRaw = $id("amountInput") ? $id("amountInput").value : "";
  const note = $id("noteInput") ? $id("noteInput").value : "";

  // normalize amount: accept "¥1,000" or "1000"
  const amountStr = String(amountRaw).replace(/[¥,\s]/g, "");
  const amount = amountStr === "" ? NaN : Number(amountStr);

  if (!date || isNaN(amount) || amount <= 0) {
    alert("日付と正しい金額を入力してください");
    return;
  }

  const entry = { date, amount: Math.floor(amount), note: note || "" };
  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);

  // clear inputs (keep date as today if you like)
  $id("amountInput").value = "";
  $id("noteInput").value = "";

  // show history tab and refresh
  showTab("history");
  render();
}

// ---------- 表示処理（履歴・月合計） ----------
function formatYen(n) {
  return "¥" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function computePeriodRange(today, closingDayNumber) {
  // returns {start: Date, end: Date} inclusive
  // if closingDayNumber is invalid, use calendar month
  if (!closingDayNumber || closingDayNumber < 1 || closingDayNumber > 31) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  const c = closingDayNumber;
  const day = today.getDate();
  let start, end;
  if (day > c) {
    // period: (this month's c+1) .. (next month's c)
    start = new Date(today.getFullYear(), today.getMonth(), c + 1, 0, 0, 0);
    end = new Date(today.getFullYear(), today.getMonth() + 1, c, 23, 59, 59);
  } else {
    // period: (prev month's c+1) .. (this month's c)
    start = new Date(today.getFullYear(), today.getMonth() - 1, c + 1, 0, 0, 0);
    end = new Date(today.getFullYear(), today.getMonth(), c, 23, 59, 59);
  }
  return { start, end };
}

function render() {
  const entries = loadEntries();
  const historyList = $id("historyList");
  const monthlyList = $id("monthlyList");
  const monthlyTotalSpan = $id("monthlyTotal");

  if (!historyList || !monthlyList || !monthlyTotalSpan) return;

  historyList.innerHTML = "";
  monthlyList.innerHTML = "";

  const today = new Date();
  const closingDayNumber = Number(localStorage.getItem(STORAGE_CLOSING_KEY) || 31);
  const period = computePeriodRange(today, closingDayNumber);

  // monthly sum for current period
  let monthlySum = 0;

  // render history (all entries, newest first)
  const sorted = entries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(e => {
    const d = new Date(e.date);
    const li = document.createElement("li");
    li.innerHTML = `${e.date}　${formatYen(e.amount)}<br><small>${e.note || ""}</small>`;
    historyList.appendChild(li);

    if (d >= period.start && d <= period.end) {
      monthlySum += e.amount;
    }
  });

  monthlyTotalSpan.innerText = formatYen(monthlySum);

  // build monthlyTotals map for graph/list (group by YYYY-MM)
  const monthlyMap = {};
  entries.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + Number(e.amount || 0);
  });

  // render monthlyList (sorted desc)
  const keys = Object.keys(monthlyMap).sort((a, b) => b.localeCompare(a));
  keys.forEach(k => {
    const li = document.createElement("li");
    li.textContent = `${k}：${formatYen(monthlyMap[k])}`;
    monthlyList.appendChild(li);
  });

  // render chart (if canvas exists)
  renderChart(keys.reverse(), keys.map(k => monthlyMap[k])); // reverse to chronological
}

// ---------- chart ----------
let chartInstance = null;
function renderChart(labels = [], values = []) {
  const canvas = $id("chartCanvas");
  if (!canvas) return;

  // if no data, show empty
  if (!labels || labels.length === 0) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // destroy existing chart if exists
  if (chartInstance) {
    try { chartInstance.destroy(); } catch (e) {}
    chartInstance = null;
  }

  chartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "つもり貯金",
        data: values,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

// ---------- タブ ----------
function showTab(tab) {
  const tabs = ["history", "monthly", "chart"];
  tabs.forEach(t => {
    const el = $id("tab-" + t);
    if (el) el.classList.add("hidden");
  });
  const target = $id("tab-" + tab);
  if (target) target.classList.remove("hidden");

  // render chart when switching to chart tab
  if (tab === "chart") {
    // prepare data
    const entries = loadEntries();
    const monthlyMap = {};
    entries.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + Number(e.amount || 0);
    });
    const labels = Object.keys(monthlyMap).sort();
    const values = labels.map(l => monthlyMap[l]);
    renderChart(labels, values);
  }
}

// ---------- 初期化 ----------
document.addEventListener("DOMContentLoaded", () => {
  setupClosingDayOptions();

  // ensure amount input uses numeric keyboard on mobile
  const amountEl = $id("amountInput");
  if (amountEl) {
    amountEl.setAttribute("inputmode", "numeric");
    amountEl.setAttribute("pattern", "[0-9]*");
    // remove currency characters when focusing
    amountEl.addEventListener("focus", () => {
      amountEl.value = String(amountEl.value).replace(/[¥,]/g, "");
    });
  }

  // wire up buttons if needed (in case index.html uses IDs instead of inline onclick)
  const addBtn = document.querySelector(".form button");
  if (addBtn) addBtn.addEventListener("click", (e) => { e.preventDefault(); addEntry(); });

  // make sure tabs show correctly
  showTab("history");

  // initial render
  render();
});
