(function () {
  const I18n = window.MoneyTrackI18n;
  const $ = id => document.getElementById(id);
  let toastTimer;

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type || ""}`;
    toast.textContent = message;
    $("toast-region").appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function renderAll() {
    window.MoneyTrackTransactions.render();
    window.MoneyTrackDashboard.render();
    window.MoneyTrackStatistics.render();
  }

  function setTab(name) {
    document.querySelectorAll(".view").forEach(view => {
      const active = view.id === `view-${name}`;
      view.hidden = !active;
      view.classList.toggle("active", active);
    });
    document.querySelectorAll("[data-tab]").forEach(button => button.classList.toggle("active", button.dataset.tab === name));
  }

  function updateConnection() {
    const online = navigator.onLine;
    $("connection-status").classList.toggle("offline", !online);
    $("connection-label").textContent = I18n.t(online ? "online" : "offline");
  }

  async function start() {
    I18n.apply();
    $("language-select").value = I18n.language;
    document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => setTab(button.dataset.tab)));
    document.querySelectorAll("[data-go-tab]").forEach(button => button.addEventListener("click", () => setTab(button.dataset.goTab)));
    $("language-select").addEventListener("change", event => {
      I18n.setLanguage(event.target.value);
      I18n.apply();
      renderAll();
    });
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("online", () => showToast(I18n.language === "fr" ? "Connexion Internet rétablie." : "Internet connection restored.", "success"));
    window.addEventListener("offline", () => showToast(I18n.language === "fr" ? "Mode hors ligne. Vos données restent disponibles." : "Offline mode. Your data is still available.", "success"));
    updateConnection();
    window.MoneyTrackTransactions.init();
    window.MoneyTrackStatistics.init();
    window.MoneyTrack = { state: { transactions: [] }, renderAll, showToast };
    try {
      window.MoneyTrack.state.transactions = await window.MoneyTrackDB.getAll();
      renderAll();
    } catch (error) {
      console.error("MoneyTrack could not initialize its local database.", error);
      showToast(I18n.language === "fr"
        ? "Le stockage local est indisponible. Essayez un navigateur récent en HTTP local ou HTTPS."
        : "Local storage is unavailable. Try a modern browser over localhost HTTP or HTTPS.", "error");
      renderAll();
    }
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      try {
        await navigator.serviceWorker.register("./service-worker.js");
      } catch (error) {
        console.error("MoneyTrack could not register its offline service worker.", error);
        showToast(I18n.language === "fr" ? "Le cache hors ligne n'a pas pu être activé." : "The offline cache could not be enabled.", "error");
      }
    }
  }

  window.MoneyTrack = { state: { transactions: [] }, renderAll, showToast };
  window.addEventListener("DOMContentLoaded", () => {
    if (toastTimer) window.clearTimeout(toastTimer);
    start();
  }, { once: true });
})();
