// 締め日を1〜31まで自動生成
function setupClosingDayOptions() {
  const select = document.getElementById("closingDay");
  for (let i = 1; i <= 31; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i + "日";
    select.appendChild(option);
  }
}

setupClosingDayOptions();
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
  const currentMonth = new Date().getMonth();

  entries.forEach(e => {
    const d = new Date(e.date);
    if (d.getMonth() === currentMonth) monthlySum += e.amount;

    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `${e.date}｜¥${e.amount.toLocaleString()}<br>${e.note || ""}`;
    historyDiv.appendChild(div);
  });

  document.getElementById("monthlyTotal").innerText =
    `今月の合計：¥${monthlySum.toLocaleString()}`;
}

render();
