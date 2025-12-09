// 締め日を1〜31まで生成
function setupClosingDayOptions() {
  const select = document.getElementById("closingDay");
  for (let i = 1; i <= 31; i++) {
    const op = document.createElement("option");
    op.value = i;
    op.textContent = i + "日";
    select.appendChild(op);
  }

  // すでに保存済みなら選択状態に反映＋非表示
  const savedDay = localStorage.getItem("closingDay");
  if (savedDay) {
    select.value = savedDay;
    document.querySelector(".settings").style.display = "none";
  }
}

setupClosingDayOptions();
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
function saveClosingDay() {
  const day = document.getElementById("closingDay").value;
  if (!day) {
    alert("締め日を選択してください");
    return;
  }
  localStorage.setItem("closingDay", day);
  alert("締め日を保存しました！");

  // 非表示にする
  document.getElementById("closingDay").parentElement.style.display = "none";
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
function saveClosingDay() {
  const select = document.getElementById("closingDay");
  const day = select.value;

  if (!day) {
    alert("締め日を選択してください");
    return;
  }

  localStorage.setItem("closingDay", day);
  alert("締め日を保存しました！");

  // 一度設定したら締め日UIを非表示にする
  document.querySelector(".settings").style.display = "none";
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
