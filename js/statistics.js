(function () {
  const I18n = window.MoneyTrackI18n;
  const palette = window.MoneyTrackTransactions.colors;
  let donutChart;
  let comparisonChart;
  const $ = id => document.getElementById(id);
  const sum = list => list.reduce((total, item) => total + item.amount, 0);

  function periodDates(period) {
    const today = new Date();
    if (period === "week") {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - weekday);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return [start, end];
    }
    return [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)];
  }

  function transactionsForPeriod() {
    const [start, end] = periodDates($("statistics-period").value);
    return window.MoneyTrack.state.transactions.filter(item => {
      const date = new Date(item.date + "T12:00:00");
      return date >= start && date < end;
    });
  }

  function renderDonut(expenses) {
    const totals = new Map();
    expenses.forEach(item => totals.set(item.category, (totals.get(item.category) || 0) + item.amount));
    const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    $("statistics-donut-empty").hidden = entries.length > 0;
    $("statistics-legend").innerHTML = entries.map(([key], index) =>
      `<span class="legend-item"><span class="legend-dot" style="background:${palette[index % palette.length]}"></span>${window.MoneyTrackTransactions.categoryLabel(key)}</span>`).join("");
    if (entries.length) {
      $("stats-top-category").textContent = window.MoneyTrackTransactions.categoryLabel(entries[0][0]);
      $("stats-top-amount").textContent = window.MoneyTrackTransactions.formatAmount(entries[0][1]);
    } else {
      $("stats-top-category").textContent = I18n.t("noData");
      $("stats-top-amount").textContent = "";
    }
    const data = { labels: entries.map(([key]) => window.MoneyTrackTransactions.categoryLabel(key)),
      datasets: [{ data: entries.map(([, amount]) => amount), backgroundColor: entries.map((_, index) => palette[index % palette.length]), borderWidth: 0, hoverOffset: 4 }] };
    if (donutChart) { donutChart.data = data; donutChart.update(); }
    else if (window.Chart) donutChart = new Chart($("statistics-donut"), { type: "doughnut", data, options: {
      responsive: true, maintainAspectRatio: false, cutout: "68%",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: context =>
        ` ${context.label}: ${window.MoneyTrackTransactions.formatAmount(context.raw)}` } } },
      animation: { duration: 450 }
    } });
  }

  function renderComparison(entries) {
    const incomes = sum(entries.filter(item => item.type === "income"));
    const expenses = sum(entries.filter(item => item.type === "expense"));
    $("stats-income").textContent = window.MoneyTrackTransactions.formatAmount(incomes);
    $("stats-expenses").textContent = window.MoneyTrackTransactions.formatAmount(expenses);
    const empty = entries.length === 0;
    $("statistics-comparison-empty").hidden = !empty;
    const data = { labels: [I18n.t("chartIncome"), I18n.t("chartExpenses")], datasets: [{
      data: [incomes, expenses], backgroundColor: ["#17a979", "#e46d65"], borderRadius: 8, maxBarThickness: 64
    }] };
    if (comparisonChart) { comparisonChart.data = data; comparisonChart.update(); }
    else if (window.Chart) comparisonChart = new Chart($("statistics-comparison"), { type: "bar", data, options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => ` ${window.MoneyTrackTransactions.formatAmount(context.raw)}` } } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: "#7e899e", font: { family: "DM Sans", size: 10 } } },
        y: { beginAtZero: true, border: { display: false, dash: [3, 4] }, grid: { color: "#eef1f6" },
          ticks: { color: "#9aa3b2", font: { family: "DM Sans", size: 9 }, callback: value => new Intl.NumberFormat(I18n.language === "fr" ? "fr-FR" : "en-US", { notation: "compact" }).format(value) } } },
      animation: { duration: 450 }
    } });
  }

  function render() {
    const entries = transactionsForPeriod();
    renderDonut(entries.filter(item => item.type === "expense"));
    renderComparison(entries);
  }

  function init() { $("statistics-period").addEventListener("change", render); }
  window.MoneyTrackStatistics = { init, render };
})();
