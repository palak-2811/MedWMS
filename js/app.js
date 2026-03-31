"use strict";

/* ================================================================
   MedWMS — Core Application Module (app.js)
   
   ADVANCED JS CONCEPTS USED:
   - ES6 Classes (OrderStore)
   - Private class fields (#)
   - Proxy-based reactive wrapper
   - CustomEvent dispatching
   - Tagged template literals (html``)
   - Destructuring, spread, optional chaining, nullish coalescing
   - Debounce utility
   - Cross-tab sync via Storage events
   - Dark mode toggle with localStorage persistence
   ================================================================ */

/* ================================================================
   SECTION 1: CONSTANTS & CONFIG
   ================================================================ */

const GST_RATE = 18;
const STORAGE_KEY = "wms_orders";
const THEME_KEY = "wms_theme";
const STATUSES = Object.freeze(["Placed", "Packed", "Dispatched", "Delivered"]);

const STATUS_COLORS = Object.freeze({
  Placed:     "#f59e0b",
  Packed:     "#3b82f6",
  Dispatched: "#8b5cf6",
  Delivered:  "#10b981"
});

/** Demo seed data — 5 pre-loaded orders */
const SEED_ORDERS = Object.freeze([
  {
    orderId: "WMO-A1001", retailer: "MediPlus Pharmacy", contact: "9876543210",
    date: "01/02/2026",
    items: [
      { medicine: "Paracetamol 500mg", qty: 500, unitPrice: 4.50, amount: 2250.00 },
      { medicine: "Amoxicillin 250mg", qty: 200, unitPrice: 8.00, amount: 1600.00 },
      { medicine: "Cetirizine 10mg",   qty: 300, unitPrice: 3.50, amount: 1050.00 }
    ],
    subtotal: 4900.00, gstRate: 18, gstAmount: 882.00, total: 5782.00,
    status: "Delivered", signature: null
  },
  {
    orderId: "WMO-A1002", retailer: "CureAll Medical Store", contact: "9123456780",
    date: "04/02/2026",
    items: [
      { medicine: "Metformin 500mg",   qty: 400, unitPrice: 6.00,  amount: 2400.00 },
      { medicine: "Atorvastatin 10mg", qty: 150, unitPrice: 12.00, amount: 1800.00 }
    ],
    subtotal: 4200.00, gstRate: 18, gstAmount: 756.00, total: 4956.00,
    status: "Dispatched", signature: null
  },
  {
    orderId: "WMO-A1003", retailer: "HealthFirst Pharma", contact: "9988776655",
    date: "07/02/2026",
    items: [
      { medicine: "Azithromycin 500mg", qty: 100, unitPrice: 22.00, amount: 2200.00 },
      { medicine: "Pantoprazole 40mg",  qty: 250, unitPrice: 7.50,  amount: 1875.00 },
      { medicine: "Ibuprofen 400mg",    qty: 200, unitPrice: 5.00,  amount: 1000.00 }
    ],
    subtotal: 5075.00, gstRate: 18, gstAmount: 913.50, total: 5988.50,
    status: "Packed", signature: null
  },
  {
    orderId: "WMO-A1004", retailer: "QuickMeds Distributors", contact: "9345678901",
    date: "09/02/2026",
    items: [
      { medicine: "Metronidazole 400mg", qty: 300, unitPrice: 5.50, amount: 1650.00 }
    ],
    subtotal: 1650.00, gstRate: 18, gstAmount: 297.00, total: 1947.00,
    status: "Placed", signature: null
  },
  {
    orderId: "WMO-A1005", retailer: "Apollo Pharmacy Annex", contact: "9876001234",
    date: "10/02/2026",
    items: [
      { medicine: "Montelukast 10mg",  qty: 200, unitPrice: 9.00,  amount: 1800.00 },
      { medicine: "Rabeprazole 20mg",  qty: 180, unitPrice: 10.50, amount: 1890.00 }
    ],
    subtotal: 3690.00, gstRate: 18, gstAmount: 664.20, total: 4354.20,
    status: "Placed", signature: null
  }
]);

/* ================================================================
   SECTION 2: TAGGED TEMPLATE LITERAL — Safe HTML builder
   Escapes interpolated values to prevent XSS.
   ================================================================ */

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Tagged template literal for safe HTML construction.
 * Usage: html`<div>${userInput}</div>` — userInput is auto-escaped.
 * To insert raw HTML, wrap in { __html: '<b>bold</b>' }
 */
function html(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const val = values[i] ?? "";
    const safe = (val && typeof val === "object" && val.__html)
      ? val.__html
      : escapeHTML(val);
    return result + str + safe;
  }, "");
}

/* ================================================================
   SECTION 3: DEBOUNCE UTILITY
   ================================================================ */

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ================================================================
   SECTION 4: ES6 CLASS — OrderStore
   Uses private fields (#) and encapsulated methods.
   ================================================================ */

class OrderStore {
  #key;
  #seedKey;
  #listeners = [];

  constructor(storageKey = STORAGE_KEY) {
    this.#key = storageKey;
    this.#seedKey = storageKey + "_seeded";
    this.#ensureSeeded();
  }

  /** Get all orders as an array */
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.#key) || "[]");
    } catch {
      return [];
    }
  }

  /** Persist the full orders array */
  save(orders) {
    localStorage.setItem(this.#key, JSON.stringify(orders));
    this.#dispatch("save");
  }

  /** Find a single order by ID (case-insensitive) */
  findById(orderId) {
    return this.getAll().find(
      o => o.orderId === orderId?.toUpperCase()
    ) ?? null;
  }

  /** Add a new order (newest first) */
  add(order) {
    const orders = this.getAll();
    orders.unshift({ ...order });
    this.save(orders);
    this.#dispatch("add", order);
  }

  /** Update order status */
  updateStatus(orderId, newStatus) {
    const orders = this.getAll();
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return false;
    order.status = newStatus;
    this.save(orders);
    this.#dispatch("statusChange", { orderId, newStatus });
    return true;
  }

  /** Delete an order */
  delete(orderId) {
    const orders = this.getAll().filter(o => o.orderId !== orderId);
    this.save(orders);
    this.#dispatch("delete", orderId);
  }

  /** Get computed statistics — uses destructuring & reduce */
  getStats() {
    const orders = this.getAll();
    return {
      total:     orders.length,
      pending:   orders.filter(o => ["Placed", "Packed"].includes(o.status)).length,
      delivered: orders.filter(o => o.status === "Delivered").length,
      dispatched: orders.filter(o => o.status === "Dispatched").length,
      revenue:   orders.reduce((sum, { total }) => sum + total, 0),
      avgOrder:  orders.length ? orders.reduce((s, { total }) => s + total, 0) / orders.length : 0
    };
  }

  /** Get status distribution for charts */
  getStatusDistribution() {
    const orders = this.getAll();
    return STATUSES.map(status => ({
      label: status,
      value: orders.filter(o => o.status === status).length,
      color: STATUS_COLORS[status]
    }));
  }

  /** Get revenue per retailer for bar chart */
  getRevenueByRetailer() {
    const orders = this.getAll();
    const map = new Map();
    orders.forEach(({ retailer, total }) => {
      map.set(retailer, (map.get(retailer) ?? 0) + total);
    });
    return [...map.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }

  /** Register a change listener */
  onChange(fn) {
    this.#listeners.push(fn);
    return () => {
      this.#listeners = this.#listeners.filter(f => f !== fn);
    };
  }

  /* ---- Private methods ---- */

  #dispatch(action, detail = null) {
    document.dispatchEvent(new CustomEvent("orderUpdated", {
      detail: { action, ...( detail && typeof detail === "object" ? detail : { data: detail }) }
    }));
    this.#listeners.forEach(fn => fn(action, detail));
  }

  #ensureSeeded() {
    if (!localStorage.getItem(this.#seedKey)) {
      localStorage.setItem(this.#key, JSON.stringify([...SEED_ORDERS]));
      localStorage.setItem(this.#seedKey, "1");
    }
  }
}

/* ================================================================
   SECTION 5: PROXY-BASED REACTIVE WRAPPER
   Wraps OrderStore so any mutation method auto-refreshes UI.
   ================================================================ */

const rawStore = new OrderStore();

const store = new Proxy(rawStore, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value !== "function") return value;

    return (...args) => {
      const result = value.apply(target, args);

      // After mutation methods, refresh visible UI
      const mutators = new Set(["add", "updateStatus", "delete", "save"]);
      if (mutators.has(prop)) {
        requestAnimationFrame(() => {
          // Refresh dashboard if visible
          if (document.getElementById("adminOrdersBody")) {
            renderAdminStats();
            renderAdminTable(store.getAll());
            if (typeof renderCharts === "function") renderCharts();
          }
        });
      }
      return result;
    };
  }
});

/* ================================================================
   SECTION 6: BUSINESS LOGIC
   ================================================================ */

/** Generate a unique Order ID: WMO-XXXXXX */
function generateOrderId() {
  const ts   = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `WMO-${ts}${rand}`;
}

/** Calculate billing totals */
function calculateBill(items, gstRate = GST_RATE) {
  const subtotal  = items.reduce((sum, { amount }) => sum + amount, 0);
  const gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
  const total     = parseFloat((subtotal + gstAmount).toFixed(2));
  return { subtotal, gstAmount, total };
}

/** Today as DD/MM/YYYY */
function todayFormatted() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Format as Indian Rupees: ₹12,500.50 */
function inr(amount) {
  return "₹" + parseFloat(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* ================================================================
   SECTION 7: UI UTILITIES
   ================================================================ */

/** Show toast notification */
function showToast(msg, icon = "✅") {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

/** Safely set textContent */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? "—";
}

/** Mark the current page's nav item as active */
function markNav() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-item").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === page);
  });
}

/** Return badge HTML for a given status */
function statusBadge(status) {
  const cls = `badge badge-${status.toLowerCase()}`;
  return `<span class="${cls}">${status}</span>`;
}

/** Update topbar date */
function setTopbarDate() {
  document.querySelectorAll(".topbar-date").forEach(el => {
    el.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "short", year: "numeric", month: "short", day: "numeric"
    });
  });
}

/** Add ripple effect to all buttons */
function initRipples() {
  document.addEventListener("click", e => {
    const btn = e.target.closest(".btn");
    if (!btn) return;

    const ripple = document.createElement("span");
    ripple.classList.add("ripple");
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top  = `${e.clientY - rect.top  - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
}

/* ================================================================
   SECTION 8: DARK MODE TOGGLE
   Persisted in localStorage. Toggles data-theme attribute.
   ================================================================ */

function initDarkMode() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  // Attach toggle listeners
  document.querySelectorAll(".theme-toggle").forEach(btn => {
    btn.addEventListener("click", toggleTheme);
    updateToggleIcon(btn);
  });
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const newTheme = isDark ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem(THEME_KEY, newTheme);

  document.querySelectorAll(".theme-toggle").forEach(updateToggleIcon);

  // Re-render canvas charts with new colors
  if (typeof renderCharts === "function") {
    setTimeout(renderCharts, 100);
  }
  if (typeof drawTrackerCanvas === "function") {
    const status = document.getElementById("trOrderId")?.textContent;
    if (status && status !== "—") {
      const order = store.findById(status);
      if (order) drawTrackerCanvas("trackerCanvas", order.status);
    }
  }

  showToast(`Switched to ${newTheme} mode`, newTheme === "dark" ? "🌙" : "☀️");
}

function updateToggleIcon(btn) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.textContent = isDark ? "☀️" : "🌙";
  btn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
}

/* ================================================================
   SECTION 9: FORM VALIDATION HELPERS
   ================================================================ */

function showFieldError(inputId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(inputId + "_err");
  if (input) input.classList.add("is-error");
  if (err) { err.textContent = msg; err.classList.add("show"); }
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(inputId + "_err");
  if (input) input.classList.remove("is-error");
  if (err) err.classList.remove("show");
}

function attachClearOnInput(ids) {
  ids.forEach(id => {
    document.getElementById(id)
      ?.addEventListener("input", () => clearFieldError(id));
  });
}

/* ================================================================
   SECTION 10: ADMIN DASHBOARD LOGIC
   With Drag & Drop (HTML5 DnD API)
   ================================================================ */

function initAdmin() {
  if (!document.getElementById("adminOrdersBody")) return;

  renderAdminStats();
  renderAdminTable(store.getAll());

  // Debounced search
  const searchEl = document.getElementById("adminSearch");
  const filterEl = document.getElementById("adminFilter");

  const applyFilter = debounce(() => {
    let orders = store.getAll();
    const q = searchEl?.value.trim().toLowerCase() ?? "";
    const f = filterEl?.value ?? "All";

    if (q) {
      orders = orders.filter(o =>
        o.orderId.toLowerCase().includes(q) ||
        o.retailer.toLowerCase().includes(q)
      );
    }
    if (f !== "All") {
      orders = orders.filter(o => o.status === f);
    }
    renderAdminTable(orders);
  }, 200);

  searchEl?.addEventListener("input", applyFilter);
  filterEl?.addEventListener("change", applyFilter);
}

function renderAdminStats() {
  const { total, pending, delivered, revenue } = store.getStats();

  // Use Web Animations API for count-up
  animateCounter("statTotal", total);
  animateCounter("statPending", pending);
  animateCounter("statDelivered", delivered);

  // Revenue uses text
  const revEl = document.getElementById("statRevenue");
  if (revEl) {
    animateValue(revEl, 0, revenue, 800, v => inr(v));
  }
}

/** Animate a counter from 0 to target using Web Animations API */
function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  const start = parseInt(el.textContent) || 0;
  if (start === target) { el.textContent = target; return; }

  const duration = 600;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/** Animate a value with custom formatter */
function animateValue(el, from, to, duration, formatter) {
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = formatter(current);

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function renderAdminTable(orders) {
  const tbody = document.getElementById("adminOrdersBody");
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr draggable="true" data-order-id="${o.orderId}">
      <td><span class="oid">${o.orderId}</span></td>
      <td>
        <div style="font-weight:600;font-size:0.88rem;">${escapeHTML(o.retailer)}</div>
        <div style="font-size:0.75rem;color:var(--text-4);">${o.contact}</div>
      </td>
      <td style="font-size:0.82rem;color:var(--text-3);">${o.date}</td>
      <td style="font-size:0.82rem;color:var(--text-3);">${o.items.length} item${o.items.length > 1 ? "s" : ""}</td>
      <td>
        <span style="font-family:var(--font-mono);font-weight:700;font-size:0.88rem;">${inr(o.total)}</span>
      </td>
      <td>
        <select class="status-select" data-order="${o.orderId}" onchange="handleStatusChange(this)">
          ${STATUSES.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td>
        <div class="flex gap-8">
          <a href="bill.html?id=${o.orderId}" class="btn btn-sm btn-ghost">🧾 Invoice</a>
          <button class="btn btn-sm btn-outline" onclick="openOrderDetail('${o.orderId}')">👁 View</button>
        </div>
      </td>
    </tr>
  `).join("");

  // Attach Drag & Drop handlers
  initDragAndDrop(tbody);
}

/** Called when admin changes a status dropdown */
function handleStatusChange(selectEl) {
  const orderId   = selectEl.getAttribute("data-order");
  const newStatus = selectEl.value;
  store.updateStatus(orderId, newStatus);
  renderAdminStats();
  if (typeof renderCharts === "function") renderCharts();
  showToast(`Order ${orderId} marked as "${newStatus}"`, "📦");
}

/** Open order detail modal — uses Web Animations API */
function openOrderDetail(orderId) {
  const order = store.findById(orderId);
  if (!order) return;

  const modal = document.getElementById("orderModal");
  const body  = document.getElementById("orderModalBody");

  body.innerHTML = `
    <div style="margin-bottom:14px;">
      <div class="flex justify-between items-center mb-12">
        <span class="oid">${order.orderId}</span>
        ${statusBadge(order.status)}
      </div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="di-label">Retailer / Pharmacy</div>
          <div class="di-value">${escapeHTML(order.retailer)}</div>
        </div>
        <div class="detail-item">
          <div class="di-label">Contact</div>
          <div class="di-value">${order.contact}</div>
        </div>
        <div class="detail-item">
          <div class="di-label">Order Date</div>
          <div class="di-value">${order.date}</div>
        </div>
        <div class="detail-item">
          <div class="di-label">GST Rate</div>
          <div class="di-value">${order.gstRate}%</div>
        </div>
      </div>
    </div>
    <hr class="divider">
    <div style="font-family:var(--font-ui);font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-3);margin-bottom:10px;">
      Medicine Items
    </div>
    <table class="data-table w-full mb-12">
      <thead>
        <tr>
          <th>#</th><th>Medicine</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item, i) => `
          <tr>
            <td style="color:var(--text-4);font-size:0.78rem;">${i + 1}</td>
            <td style="font-weight:500;">${escapeHTML(item.medicine)}</td>
            <td>${item.qty}</td>
            <td>${inr(item.unitPrice)}</td>
            <td style="text-align:right;font-family:var(--font-mono);font-weight:600;">${inr(item.amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="flex justify-end">
      <div style="min-width:220px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
        <div class="totals-row"><span class="tl">Subtotal</span><span class="tv">${inr(order.subtotal)}</span></div>
        <div class="totals-row"><span class="tl">GST (${order.gstRate}%)</span><span class="tv">${inr(order.gstAmount)}</span></div>
        <div class="totals-row grand"><span class="tl">Total</span><span class="tv">${inr(order.total)}</span></div>
      </div>
    </div>
  `;

  modal.classList.add("show");

  // Web Animations API — spring entrance
  const modalEl = modal.querySelector(".modal");
  if (modalEl) {
    modalEl.animate([
      { transform: "scale(0.9) translateY(-20px)", opacity: 0 },
      { transform: "scale(1) translateY(0)", opacity: 1 }
    ], {
      duration: 350,
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      fill: "forwards"
    });
  }
}

function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("show"));
}

/* ================================================================
   SECTION 11: DRAG & DROP API (Admin table rows)
   ================================================================ */

function initDragAndDrop(tbody) {
  const rows = tbody.querySelectorAll("tr[draggable]");

  rows.forEach(row => {
    row.addEventListener("dragstart", e => {
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", row.dataset.orderId);
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      tbody.querySelectorAll("tr").forEach(r => r.classList.remove("drag-over"));
    });

    row.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", e => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData("text/plain");
      const targetId  = row.dataset.orderId;
      if (draggedId === targetId) return;

      // Reorder in store
      const orders = store.getAll();
      const fromIdx = orders.findIndex(o => o.orderId === draggedId);
      const toIdx   = orders.findIndex(o => o.orderId === targetId);
      if (fromIdx === -1 || toIdx === -1) return;

      const [moved] = orders.splice(fromIdx, 1);
      orders.splice(toIdx, 0, moved);
      store.save(orders);

      renderAdminTable(orders);
      showToast("Order reordered", "↕️");
    });
  });
}

/* ================================================================
   SECTION 12: ORDER FORM LOGIC
   ================================================================ */

let itemRowCount = 0;

function initOrderForm() {
  const form = document.getElementById("orderForm");
  if (!form) return;

  const newId = generateOrderId();
  setText("previewOrderId", newId);
  const hiddenId = document.getElementById("hiddenOrderId");
  if (hiddenId) hiddenId.value = newId;

  attachClearOnInput(["retailerName", "retailerContact"]);

  addItemRow(); addItemRow(); addItemRow();

  document.getElementById("addRowBtn")
    ?.addEventListener("click", addItemRow);

  document.getElementById("gstRate")
    ?.addEventListener("change", recalcTotals);

  form.addEventListener("submit", handleOrderSubmit);
}

function addItemRow() {
  itemRowCount++;
  const id = itemRowCount;
  const tbody = document.getElementById("itemsBody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  tr.id = `item-row-${id}`;
  tr.innerHTML = `
    <td class="row-num">${tbody.rows.length + 1}</td>
    <td>
      <input type="text" class="form-control" id="med_${id}"
        placeholder="e.g. Paracetamol 500mg" autocomplete="off" />
    </td>
    <td>
      <input type="number" class="form-control" id="qty_${id}"
        placeholder="100" min="1" step="1"
        oninput="recalcRow(${id})" style="max-width:90px;" />
    </td>
    <td>
      <input type="number" class="form-control" id="price_${id}"
        placeholder="0.00" min="0" step="0.01"
        oninput="recalcRow(${id})" style="max-width:110px;" />
    </td>
    <td class="row-amount" id="amt_${id}">₹0.00</td>
    <td class="row-del">
      <button type="button" class="btn-del-row" onclick="removeItemRow(${id})" title="Remove row">✕</button>
    </td>
  `;
  tbody.appendChild(tr);

  // Animate new row in with Web Animations API
  tr.animate([
    { opacity: 0, transform: "translateX(-20px)" },
    { opacity: 1, transform: "translateX(0)" }
  ], { duration: 300, easing: "ease-out" });

  renumberRows();
}

function removeItemRow(id) {
  const tbody = document.getElementById("itemsBody");
  if (tbody?.rows.length <= 1) {
    showToast("At least one medicine item is required.", "⚠️");
    return;
  }
  const row = document.getElementById(`item-row-${id}`);
  if (row) {
    // Animate out then remove
    row.animate([
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: "translateX(20px)" }
    ], { duration: 200, easing: "ease-in" }).onfinish = () => {
      row.remove();
      renumberRows();
      recalcTotals();
    };
  }
}

function renumberRows() {
  const tbody = document.getElementById("itemsBody");
  if (!tbody) return;
  [...tbody.rows].forEach((tr, i) => {
    const numCell = tr.querySelector(".row-num");
    if (numCell) numCell.textContent = i + 1;
  });
}

function recalcRow(id) {
  const qty   = parseFloat(document.getElementById(`qty_${id}`)?.value) || 0;
  const price = parseFloat(document.getElementById(`price_${id}`)?.value) || 0;
  const amt   = qty * price;
  const amtEl = document.getElementById(`amt_${id}`);
  if (amtEl) amtEl.textContent = inr(amt);
  recalcTotals();
}

function recalcTotals() {
  const tbody = document.getElementById("itemsBody");
  if (!tbody) return;

  let subtotal = 0;
  [...tbody.rows].forEach(tr => {
    const id    = tr.id.replace("item-row-", "");
    const qty   = parseFloat(document.getElementById(`qty_${id}`)?.value)   || 0;
    const price = parseFloat(document.getElementById(`price_${id}`)?.value) || 0;
    subtotal += qty * price;
  });

  const gstRate = parseFloat(document.getElementById("gstRate")?.value ?? GST_RATE);
  const gstAmt  = (subtotal * gstRate) / 100;
  const total   = subtotal + gstAmt;

  setText("sumSubtotal", inr(subtotal));
  setText("sumGst",      inr(gstAmt));
  setText("sumTotal",    inr(total));
}

function handleOrderSubmit(e) {
  e.preventDefault();
  let valid = true;

  const retailerName = document.getElementById("retailerName")?.value.trim() ?? "";
  if (retailerName.length < 2) {
    showFieldError("retailerName", "Enter retailer / pharmacy name (min 2 chars).");
    valid = false;
  }

  const contact = document.getElementById("retailerContact")?.value.trim() ?? "";
  if (!/^\d{10}$/.test(contact)) {
    showFieldError("retailerContact", "Enter a valid 10-digit contact number.");
    valid = false;
  }

  const tbody = document.getElementById("itemsBody");
  let hasValidItem = false;
  let itemError = false;

  [...tbody.rows].forEach(tr => {
    const id    = tr.id.replace("item-row-", "");
    const med   = document.getElementById(`med_${id}`)?.value.trim() ?? "";
    const qty   = parseFloat(document.getElementById(`qty_${id}`)?.value);
    const price = parseFloat(document.getElementById(`price_${id}`)?.value);

    const medEl = document.getElementById(`med_${id}`);
    if (!med || med.length < 2) {
      medEl?.classList.add("is-error");
      itemError = true;
    } else {
      medEl?.classList.remove("is-error");
    }

    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      itemError = true;
    } else {
      hasValidItem = true;
    }
  });

  if (itemError || !hasValidItem) {
    showToast("Please fill in all medicine rows correctly.", "⚠️");
    valid = false;
  }

  if (!valid) return;

  // Build items array — using destructuring
  const items = [...tbody.rows].map(tr => {
    const id    = tr.id.replace("item-row-", "");
    const medicine  = document.getElementById(`med_${id}`).value.trim();
    const qty       = parseFloat(document.getElementById(`qty_${id}`).value);
    const unitPrice = parseFloat(document.getElementById(`price_${id}`).value);
    return { medicine, qty, unitPrice, amount: parseFloat((qty * unitPrice).toFixed(2)) };
  });

  const gstRate = parseFloat(document.getElementById("gstRate")?.value ?? GST_RATE);
  const { subtotal, gstAmount, total } = calculateBill(items, gstRate);
  const orderId = document.getElementById("hiddenOrderId")?.value || generateOrderId();

  // Get signature data if available
  const signatureData = typeof getSignatureData === "function" ? getSignatureData() : null;

  const order = {
    orderId, retailer: retailerName, contact, date: todayFormatted(),
    items, subtotal, gstRate, gstAmount, total,
    status: "Placed", signature: signatureData
  };

  store.add(order);
  sessionStorage.setItem("currentOrder", JSON.stringify(order));
  showToast(`Order ${orderId} placed successfully!`, "✅");

  setTimeout(() => { window.location.href = "bill.html?id=" + orderId; }, 1000);
}

/* ================================================================
   SECTION 13: BILL PAGE LOGIC
   ================================================================ */

function initBillPage() {
  if (!document.getElementById("invoiceWrap")) return;

  const params  = new URLSearchParams(window.location.search);
  const urlId   = params.get("id");
  const session = sessionStorage.getItem("currentOrder");

  let order = null;
  if (urlId) {
    order = store.findById(urlId);
  } else if (session) {
    try { order = JSON.parse(session); } catch {}
  }

  if (order) {
    renderInvoice(order);
  } else {
    showBillSelector();
  }

  document.getElementById("printBtn")
    ?.addEventListener("click", () => window.print());

  document.getElementById("newOrderBtn")
    ?.addEventListener("click", () => {
      sessionStorage.removeItem("currentOrder");
      window.location.href = "order.html";
    });
}

function renderInvoice(order) {
  const wrap = document.getElementById("invoiceWrap");
  if (!wrap) return;
  wrap.style.display = "block";

  const selector = document.getElementById("selectorSection");
  if (selector) selector.style.display = "none";

  setText("invOrderId",  order.orderId);
  setText("invDate",     order.date);
  setText("invRetailer", order.retailer);
  setText("invContact",  order.contact);
  setText("invGstRate",  order.gstRate + "%");

  const badgeEl = document.getElementById("invStatus");
  if (badgeEl) badgeEl.innerHTML = statusBadge(order.status);

  const tbody = document.getElementById("invItemsBody");
  if (tbody) {
    tbody.innerHTML = order.items.map((item, i) => `
      <tr>
        <td style="color:var(--text-4);font-size:0.78rem;">${i + 1}</td>
        <td style="font-weight:500;">${escapeHTML(item.medicine)}</td>
        <td style="font-family:var(--font-mono);">${item.qty}</td>
        <td style="font-family:var(--font-mono);">${inr(item.unitPrice)}</td>
        <td style="font-family:var(--font-mono);font-weight:600;">${inr(item.amount)}</td>
      </tr>
    `).join("");
  }

  setText("invSubtotal",  inr(order.subtotal));
  setText("invGstAmount", inr(order.gstAmount));
  setText("invTotal",     inr(order.total));

  // Render watermark
  if (typeof drawInvoiceWatermark === "function") {
    setTimeout(() => drawInvoiceWatermark("invoiceWatermarkCanvas", order.status), 200);
  }

  // Render signature if available
  const sigImg = document.getElementById("invoiceSignatureImg");
  if (sigImg && order.signature) {
    sigImg.src = order.signature;
    sigImg.style.display = "block";
    const sigBox = sigImg.closest(".sig-box");
    if (sigBox) sigBox.style.display = "block";
  }
}

function showBillSelector() {
  const selector = document.getElementById("selectorSection");
  const wrap     = document.getElementById("invoiceWrap");
  if (wrap)     wrap.style.display = "none";
  if (selector) selector.style.display = "block";

  const orders = store.getAll();
  const tbody  = document.getElementById("billSelectorBody");
  if (!tbody) return;

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span class="oid">${o.orderId}</span></td>
      <td>${escapeHTML(o.retailer)}</td>
      <td style="font-size:0.82rem;color:var(--text-3);">${o.date}</td>
      <td>${statusBadge(o.status)}</td>
      <td><span style="font-family:var(--font-mono);font-weight:700;">${inr(o.total)}</span></td>
      <td>
        <a href="bill.html?id=${o.orderId}" class="btn btn-sm btn-ghost">🧾 View Invoice</a>
      </td>
    </tr>
  `).join("");
}

/* ================================================================
   SECTION 14: TRACK PAGE LOGIC
   ================================================================ */

function initTrackPage() {
  if (!document.getElementById("trackSection")) return;

  renderRecentOrders();

  const searchBtn = document.getElementById("trackSearchBtn");
  const input     = document.getElementById("trackInput");

  searchBtn?.addEventListener("click", doTrack);
  input?.addEventListener("keydown", e => { if (e.key === "Enter") doTrack(); });

  // Auto-track from URL param
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id && input) {
    input.value = id;
    doTrack();
  }
}

function doTrack() {
  const input = document.getElementById("trackInput");
  const query = input?.value.trim() ?? "";

  const resultCard  = document.getElementById("trackResult");
  const notFound    = document.getElementById("trackNotFound");
  const placeholder = document.getElementById("trackPlaceholder");

  if (placeholder) placeholder.style.display = "none";
  if (resultCard)  resultCard.style.display   = "none";
  if (notFound)    notFound.style.display     = "none";

  if (!query) { showToast("Enter an Order ID to track.", "⚠️"); return; }

  const order = store.findById(query);

  if (!order) {
    if (notFound) notFound.style.display = "block";
    return;
  }

  setText("trOrderId",  order.orderId);
  setText("trRetailer", order.retailer);
  setText("trContact",  order.contact);
  setText("trDate",     order.date);
  setText("trItems",    order.items.length + " item(s)");
  setText("trTotal",    inr(order.total));

  const badgeEl = document.getElementById("trStatusBadge");
  if (badgeEl) badgeEl.innerHTML = statusBadge(order.status);

  // CSS tracker
  renderTracker(order.status);

  // Render items list
  const itemsList = document.getElementById("trItemsList");
  if (itemsList) {
    itemsList.innerHTML = order.items.map(item => `
      <div class="flex justify-between" style="padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
        <span>${escapeHTML(item.medicine)}</span>
        <span style="font-family:var(--font-mono);color:var(--text-3);">${item.qty} × ${inr(item.unitPrice)} = <strong>${inr(item.amount)}</strong></span>
      </div>
    `).join("");
  }

  if (resultCard) {
    resultCard.style.display = "block";
    // Animate in
    resultCard.animate([
      { opacity: 0, transform: "translateY(16px)" },
      { opacity: 1, transform: "translateY(0)" }
    ], { duration: 400, easing: "ease-out" });

    // Canvas tracker — draw AFTER parent is visible so getBoundingClientRect works
    requestAnimationFrame(() => {
      if (typeof drawTrackerCanvas === "function") {
        drawTrackerCanvas("trackerCanvas", order.status);
      }
    });
  }
}

function renderTracker(status) {
  const idx = STATUSES.indexOf(status);

  STATUSES.forEach((s, i) => {
    const step = document.getElementById("tstep-" + s.toLowerCase());
    if (!step) return;
    step.classList.remove("done", "active");
    if (i <= idx) step.classList.add("done");
    if (i === idx) step.classList.add("active");
  });

  const progress = document.getElementById("trackerProgress");
  if (progress) {
    const pct = idx === 0 ? 0 : idx === 1 ? 33 : idx === 2 ? 66 : 100;
    progress.style.width = `${pct}%`;
  }
}

function renderRecentOrders() {
  const tbody = document.getElementById("recentOrdersBody");
  if (!tbody) return;
  const recent = store.getAll().slice(0, 8);
  tbody.innerHTML = recent.map(o => `
    <tr>
      <td>
        <span class="oid" style="cursor:pointer;" onclick="autofillTrack('${o.orderId}')">${o.orderId}</span>
      </td>
      <td style="font-size:0.83rem;">${escapeHTML(o.retailer)}</td>
      <td>${statusBadge(o.status)}</td>
    </tr>
  `).join("");
}

function autofillTrack(orderId) {
  const input = document.getElementById("trackInput");
  if (input) {
    input.value = orderId;
    doTrack();
  }
}

/* ================================================================
   SECTION 15: CROSS-TAB SYNC (Storage events)
   ================================================================ */

function initCrossTabSync() {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;

    // Data changed in another tab — refresh current page
    if (document.getElementById("adminOrdersBody")) {
      renderAdminStats();
      renderAdminTable(store.getAll());
      if (typeof renderCharts === "function") renderCharts();
    }

    if (document.getElementById("recentOrdersBody")) {
      renderRecentOrders();
    }

    showToast("Data synced from another tab", "🔄");
  });
}

/* ================================================================
   SECTION 16: BOOTSTRAP — Run on every page
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Core init
  initDarkMode();
  markNav();
  setTopbarDate();
  initRipples();
  initCrossTabSync();

  // Page-specific init
  initAdmin();
  initOrderForm();
  initBillPage();
  initTrackPage();
});
