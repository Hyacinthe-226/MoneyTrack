(function () {
  const I18n = window.MoneyTrackI18n;
  let chart;
  const palette = window.MoneyTrackTransactions.colors;
  const $ = id => document.getElementById(id);
  const all = () => window.MoneyTrack.state.transactions;
  const total = list => list.reduce((sum, item) => sum + item.amount, 0);

  function drawChart(expenses) {
    const totals = new Map();
    expenses.forEach(item => totals.set(item.category, (totals.get(item.category) || 0) + item.amount));
    const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const empty = entries.length === 0;
    $("dashboard-chart-empty").hidden = !empty;
    $("dashboard-legend").innerHTML = entries.slice(0, 5).map(([key], i) =>
      `<span class="legend-item"><span class="legend-dot" style="background:${palette[i % palette.length]}"></span>${window.MoneyTrackTransactions.categoryLabel(key)}</span>`).join("");
    const data = { labels: entries.map(([key]) => window.MoneyTrackTransactions.categoryLabel(key)),
      datasets: [{ data: entries.map(([, value]) => value), backgroundColor: entries.map((_, i) => palette[i % palette.length]), borderWidth: 0, hoverOffset: 4 }] };
    if (chart) {
      chart.data = data;
      chart.update();
    } else if (window.Chart) {
      chart = new Chart($("dashboard-chart"), { type: "doughnut", data, options: {
        responsive: true, maintainAspectRatio: false, cutout: "70%",
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: context =>
          ` ${context.label}: ${window.MoneyTrackTransactions.formatAmount(context.raw)}` } } },
        animation: { duration: 450 }
      } });
    }
  }

  function updateTrend() {
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const current = total(all().filter(item => item.type === "expense" && new Date(item.date + "T12:00:00") >= currentStart));
    const previous = total(all().filter(item => {
      const date = new Date(item.date + "T12:00:00");
      return item.type === "expense" && date >= previousStart && date < currentStart;
    }));
    const label = $("expense-trend-label");
    if (!previous) {
      label.textContent = current ? I18n.t("noComparison") : I18n.t("expenseTrend");
      return;
    }
    const change = Math.round(((current - previous) / previous) * 100);
    label.textContent = `${Math.abs(change)}% ${I18n.t(change > 0 ? "trendUp" : "trendDown")}`;
  }

  function render() {
    const transactions = all();
    const incomes = transactions.filter(item => item.type === "income");
    const expenses = transactions.filter(item => item.type === "expense");
    $("dashboard-balance").textContent = window.MoneyTrackTransactions.formatAmount(total(incomes) - total(expenses));
    $("dashboard-income").textContent = window.MoneyTrackTransactions.formatAmount(total(incomes));
    $("dashboard-expenses").textContent = window.MoneyTrackTransactions.formatAmount(total(expenses));
    updateTrend();
    drawChart(expenses);
    const now = new Date();
    $("today-date").textContent = new Intl.DateTimeFormat(I18n.language === "fr" ? "fr-FR" : "en-US", { weekday: "short", day: "numeric", month: "short" }).format(now);
  }

  window.MoneyTrackDashboard = { render };
})();
