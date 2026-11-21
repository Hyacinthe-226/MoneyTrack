(function () {
  const I18n = window.MoneyTrackI18n;
  const colors = ["#4c6fe8", "#18a878", "#ee8974", "#8e72df", "#e7b44f", "#45a9ba", "#e077a2", "#98a4b8"];
  const categoryIcons = { food: "pie", transport: "arrows", communication: "globe", health: "shield", education: "chart", leisure: "award", shopping: "wallet", otherExpense: "arrows", salary: "arrow-down", business: "chart", services: "award", otherIncome: "arrow-down" };
  const amountFrames = new WeakMap();
  const $ = id => document.getElementById(id);

  function amount(value) {
    return new Intl.NumberFormat(I18n.language === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
  }
  function dateLabel(value, options) {
    const date = new Date(value + "T12:00:00");
    return new Intl.DateTimeFormat(I18n.language === "fr" ? "fr-FR" : "en-US", options || { day: "numeric", month: "short", year: "numeric" }).format(date);
  }
  function categoryLabel(key) { return I18n.categoryName(key); }
  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function formatAmount(value) { return amount(value); }
  function shortDate(value) { return dateLabel(value, { day: "numeric", month: "short" }); }
  function animateAmount(element, value) {
    const target = Math.round(value);
    const previousFrame = amountFrames.get(element);
    if (previousFrame) cancelAnimationFrame(previousFrame);
    const startValue = Number(element.dataset.amountValue || 0);
    const startedAt = performance.now();
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280;
    element.dataset.amountValue = String(target);
    if (!duration) {
      element.textContent = amount(target);
      return;
    }
    const step = now => {
      const progress = Math.min(1, (now - startedAt) / duration);
      element.textContent = amount(startValue + (target - startValue) * progress);
      if (progress < 1) amountFrames.set(element, requestAnimationFrame(step));
      else amountFrames.delete(element);
    };
    amountFrames.set(element, requestAnimationFrame(step));
  }

  function updateCategoryOptions(selected) {
    const type = document.querySelector('input[name="transaction-type"]:checked').value;
    const select = $("transaction-category");
    select.innerHTML = I18n.categories(type).map(item =>
      `<option value="${item.key}"${item.key === selected ? " selected" : ""}>${esc(item.label)}</option>`).join("");
  }

  function updateFilterOptions() {
    const select = $("category-filter");
    const current = select.value;
    const categories = [...I18n.categories("expense"), ...I18n.categories("income")];
    select.innerHTML = `<option value="all">${esc(I18n.t("allCategories"))}</option>` +
      categories.map(item => `<option value="${item.key}">${esc(item.label)}</option>`).join("");
    if (categories.some(item => item.key === current)) select.value = current;
  }

  function openModal(transaction) {
    const form = $("transaction-form");
    form.reset();
    $("form-error").textContent = "";
    $("amount-error").textContent = "";
    $("transaction-id").value = transaction ? transaction.id : "";
    if (transaction) {
      document.querySelector(`input[name="transaction-type"][value="${transaction.type}"]`).checked = true;
      $("transaction-amount").value = transaction.amount;
      $("transaction-description").value = transaction.description;
      $("transaction-date").value = transaction.date;
    } else {
      const today = new Date();
      $("transaction-date").value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    updateCategoryOptions(transaction ? transaction.category : undefined);
    $("modal-title").textContent = I18n.t(transaction ? "editTransaction" : "newTransaction");
    $("transaction-modal").hidden = false;
    $("transaction-amount").focus();
  }

  function closeModal() {
    $("transaction-modal").hidden = true;
    $("transaction-form").reset();
    $("form-error").textContent = "";
    $("amount-error").textContent = "";
  }

  function filteredTransactions() {
    const type = $("type-filter").value;
    const category = $("category-filter").value;
    return window.MoneyTrack.state.transactions.filter(item =>
      (type === "all" || item.type === type) && (category === "all" || item.category === category))
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  }

  function transactionMarkup(item, full) {
    const income = item.type === "income";
    const description = item.description.trim() || categoryLabel(item.category);
    const symbol = I18n.icon(income ? "arrow-down" : (categoryIcons[item.category] || "arrow-up"));
    if (!full) {
      return `<div class="recent-row"><div class="transaction-main"><span class="transaction-symbol ${income ? "income" : "expense"}">${symbol}</span><div><div class="transaction-description">${esc(description)}</div><div class="transaction-date-small">${shortDate(item.date)}</div></div></div><span class="category-pill">${esc(categoryLabel(item.category))}</span><span class="transaction-amount ${income ? "income" : "expense"}">${income ? "+" : "−"}${amount(item.amount)}</span></div>`;
    }
    return `<tr><td><div class="transaction-main"><span class="transaction-symbol ${income ? "income" : "expense"}">${symbol}</span><div><div class="transaction-description">${esc(description)}</div><div class="transaction-date-small">${esc(income ? I18n.t("incomeShort") : I18n.t("expenseShort"))}</div></div></div></td><td><span class="category-pill">${esc(categoryLabel(item.category))}</span></td><td><span class="transaction-date-small">${dateLabel(item.date)}</span></td><td><span class="transaction-amount ${income ? "income" : "expense"}">${income ? "+" : "−"}${amount(item.amount)}</span></td><td class="action-cell"><button class="row-action" type="button" data-edit="${esc(item.id)}" aria-label="${esc(I18n.t("editTransaction"))}">${I18n.icon("edit")}</button><button class="row-action delete" type="button" data-delete="${esc(item.id)}" aria-label="${esc(I18n.t("deleteConfirm"))}">${I18n.icon("trash")}</button></td></tr>`;
  }

  function render() {
    updateFilterOptions();
    const filtered = filteredTransactions();
    $("transactions-list").innerHTML = filtered.map(item => transactionMarkup(item, true)).join("");
    const empty = $("transactions-empty");
    const table = document.querySelector(".transactions-table");
    const noAll = window.MoneyTrack.state.transactions.length === 0;
    empty.hidden = false;
    if (noAll) {
      $("transactions-list").innerHTML = "";
      $("transactions-empty").querySelector("strong").textContent = I18n.t("noTransactions");
      $("transactions-empty").querySelector("p").textContent = I18n.t("emptyTransactionHint");
      $("transactions-empty").querySelector("button").hidden = false;
      table.hidden = true;
    } else if (filtered.length === 0) {
      $("transactions-list").innerHTML = "";
      $("transactions-empty").querySelector("strong").textContent = I18n.t("noFilteredResults");
      $("transactions-empty").querySelector("p").textContent = "";
      $("transactions-empty").querySelector("button").hidden = true;
      table.hidden = true;
    } else {
      empty.hidden = true;
      table.hidden = false;
    }
    $("transaction-count").textContent = I18n.t("transactionCount").replace("{count}", String(filtered.length));
    const recent = window.MoneyTrack.state.transactions.slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt).slice(0, 5);
    $("recent-list").innerHTML = recent.length ? recent.map(item => transactionMarkup(item, false)).join("") :
      `<div class="recent-empty">${esc(I18n.t("noTransactions"))}</div>`;
  }

  function init() {
    $("add-transaction-button").addEventListener("click", () => openModal());
    document.querySelectorAll("[data-open-modal]").forEach(button => button.addEventListener("click", () => openModal()));
    $("close-modal-button").addEventListener("click", closeModal);
    $("cancel-modal-button").addEventListener("click", closeModal);
    $("transaction-modal").addEventListener("click", event => { if (event.target === $("transaction-modal")) closeModal(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("transaction-modal").hidden) closeModal(); });
    document.querySelectorAll('input[name="transaction-type"]').forEach(input =>
      input.addEventListener("change", () => updateCategoryOptions()));
    $("type-filter").addEventListener("change", render);
    $("category-filter").addEventListener("change", render);
    $("transaction-form").addEventListener("submit", async event => {
      event.preventDefault();
      if ($("transaction-form").dataset.saving === "true") return;
      $("form-error").textContent = "";
      $("amount-error").textContent = "";
      const value = Number($("transaction-amount").value);
      const date = $("transaction-date").value;
      if (!Number.isSafeInteger(value) || value <= 0) {
        $("amount-error").textContent = I18n.t("invalidAmount");
        $("transaction-amount").focus();
        return;
      }
      if (!date || Number.isNaN(new Date(date + "T12:00:00").getTime())) {
        $("form-error").textContent = I18n.t("invalidDate");
        return;
      }
      const id = $("transaction-id").value || (window.crypto && crypto.randomUUID ? crypto.randomUUID() :
        `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const previous = window.MoneyTrack.state.transactions.find(item => item.id === id);
      const transaction = {
        id, type: document.querySelector('input[name="transaction-type"]:checked').value,
        amount: value, description: $("transaction-description").value.trim(),
        category: $("transaction-category").value, date,
        createdAt: previous ? previous.createdAt : Date.now(), updatedAt: Date.now()
      };
      const form = $("transaction-form");
      const submitButton = form.querySelector('button[type="submit"]');
      form.dataset.saving = "true";
      submitButton.disabled = true;
      try {
        await window.MoneyTrackDB.save(transaction);
        await window.MoneyTrackDB.queueOutbox({ id: `save-${transaction.id}`, action: "save", transaction });
        if (navigator.onLine) { try { await window.MoneyTrackDB.flushOutbox(); } catch (error) { console.warn("MoneyTrack sync is pending.", error); } }
        window.MoneyTrack.state.transactions = await window.MoneyTrackDB.getAll();
        closeModal();
        window.MoneyTrack.renderAll();
        window.MoneyTrack.showToast(I18n.t(previous ? "updated" : "added"), "success");
      } catch (error) {
        console.error("MoneyTrack could not save a transaction.", error);
        $("form-error").textContent = I18n.t("saveError");
      } finally {
        form.dataset.saving = "false";
        submitButton.disabled = false;
      }
    });
    $("transactions-list").addEventListener("click", async event => {
      const editButton = event.target.closest("[data-edit]");
      const deleteButton = event.target.closest("[data-delete]");
      if (editButton) {
        const item = window.MoneyTrack.state.transactions.find(transaction => transaction.id === editButton.dataset.edit);
        if (item) openModal(item);
      }
      if (deleteButton) {
        const item = window.MoneyTrack.state.transactions.find(transaction => transaction.id === deleteButton.dataset.delete);
        if (!item || !window.confirm(I18n.t("deleteConfirm"))) return;
        try {
          await window.MoneyTrackDB.remove(item.id);
          await window.MoneyTrackDB.queueOutbox({ id: `delete-${item.id}`, action: "delete", transaction: { id: item.id } });
          if (navigator.onLine) { try { await window.MoneyTrackDB.flushOutbox(); } catch (error) { console.warn("MoneyTrack sync is pending.", error); } }
          window.MoneyTrack.state.transactions = await window.MoneyTrackDB.getAll();
          window.MoneyTrack.renderAll();
          window.MoneyTrack.showToast(I18n.t("deleted"), "success");
        } catch (error) {
          console.error("MoneyTrack could not delete a transaction.", error);
          window.MoneyTrack.showToast(I18n.t("deleteError"), "error");
        }
      }
    });
  }

  window.MoneyTrackTransactions = { init, render, openModal, formatAmount, animateAmount, shortDate, categoryLabel, colors };
})();
