// 締め日選択肢生成＋保存済み反映
function setupClosingDayOptions() {
  const select = document.getElementById("closingDay");
  for (let i = 1; i <= 31; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i + "日";
    select.appendChild(option);
  }

  const savedDay = localStorage.getItem("closingDay");
  if (savedDay) {
    select.value = savedDay;
    document.querySelector(".settings").style.display = "none";
  }
}

function saveClosingDay() {
  const select = document.getElementById("closingDay");
  const day = select.value;

  if (!day) {
    alert("締め日を選択してください");
    return;
  }

  localStorage.setItem("closingDay", day);
  alert("締め日を保存しました！");
  document.querySelector(".settings").style.display = "none";
}

function loadEntries() {
  return JSON.parse(localStorage.getItem("entries") || "[]");
}

function saveEntries(entries) {
  localStorage.setItem("entries", JSON.stringify(entries));
}

function addEntry() {
  const date = document.getElementById("date").value;
  const amount = document.getElementById("amount").value;
  const note = document.getElementById("note").value;

  if (!date || !amount) {
    alert("日付と金額は必須です");
    return;
  }

  const entry = { date, amount: Number(amount), note };
  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
  render();
}

function render() {
  const entries = loadEntries();
  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = "";

  let monthlySum = 0;
  const closingDay = Number(localStorage.getItem("closingDay") || 31);
  const today = new Date();

  // 締め日を考慮した「今月」の範囲を計算
  let start, end;
  if (today.getDate() > closingDay) {
    // 締め日を過ぎている → 今月締め期間は「今月の締め日翌日〜来月締め日」
    start = new Date(today.getFullYear(), today.getMonth(), closingDay + 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, closingDay);
  } else {
    // 締め日前 → 前月締め日翌日〜今月締め日
    start = new Date(today.getFullYear(), today.getMonth() - 1, closingDay + 1);
    end = new Date(today.getFullYear(), today.getMonth(), closingDay);
  }

  entries.forEach(e => {
    const d = new Date(e.date);
    if (d >= start && d <= end) monthlySum += e.amount;

    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `${e.date}｜¥${e.amount.toLocaleString()}<br>${e.note || ""}`;
    historyDiv.appendChild(div);
  });

  document.getElementById("monthlyTotal").innerText =
    `今月の合計：¥${monthlySum.toLocaleString()}`;
}

setupClosingDayOptions();
function showTab(tab) {
  document.getElementById("tab-history").classList.add("hidden");
  document.getElementById("tab-monthly").classList.add("hidden");
  document.getElementById("tab-chart").classList.add("hidden");

  document.getElementById("tab-" + tab).classList.remove("hidden");
}
