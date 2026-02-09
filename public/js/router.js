import { loadState, getState, clearState, saveState } from "./state.js";
import {
  destroyEmbeddables,
  initEmbeddables,
  openComponent,
  updateTheme,
} from "./embeddables.js";

import { mount as mountCarriers } from "./pages/carriers.js";
import { mount as mountBilling } from "./pages/billing.js";
import { mount as mountPaymentLogs } from "./pages/paymentlogs.js";
import { mount as mountReports } from "./pages/reports.js";

const pageRoot = document.getElementById("pageRoot");
const pageTitle = document.getElementById("pageTitle");
const logEl = document.getElementById("log");

const activeUserLabel = document.getElementById("activeUserLabel");
const modeText = document.getElementById("modeText");

const navBilling = document.getElementById("navBilling");
const navPaymentLogs = document.getElementById("navPaymentLogs");
const navReports = document.getElementById("navReports");

function log(...args) {
  logEl.textContent +=
    "\n" +
    args
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2)))
      .join(" ");
}

const routes = {
  carriers: {
    title: "Carrier Accounts",
    mount: mountCarriers,
    component: "manage-carriers",
  },
  billing: {
    title: "Billing",
    mount: mountBilling,
    component: "manage-billing",
  },
  paymentlogs: {
    title: "Payment Logs",
    mount: mountPaymentLogs,
    component: "manage-payment-logs",
  },
  reports: {
    title: "Reports",
    mount: mountReports,
    component: "manage-reports",
  },
};

let currentUnmount = null;

function setActiveNav(route) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.setAttribute(
      "aria-current",
      btn.dataset.route === route ? "page" : "false",
    );
  });
}

function applyModeGating() {
  const { allowed, mode } = getState();
  modeText.textContent =
    mode === "decentralized"
      ? "Decentralized billing (ReferralCustomers)"
      : "Centralized billing (Child Users)";

  navBilling.disabled = !allowed.billing;
  navPaymentLogs.disabled = !allowed.paymentlogs;
  navReports.disabled = !allowed.reports;
}

async function render(routeKey) {
  const route = routes[routeKey] || routes.carriers;

  // Gating: if not allowed, force carriers
  const { allowed } = getState();
  if (routeKey !== "carriers" && !allowed[routeKey]) {
    routeKey = "carriers";
  }

  const r = routes[routeKey];
  pageTitle.textContent = r.title;
  setActiveNav(routeKey);

  // Clean up
  if (typeof currentUnmount === "function") {
    try {
      currentUnmount();
    } catch {}
  }
  pageRoot.innerHTML = "";

  // Mount new page
  currentUnmount = r.mount(pageRoot, {
    open: async () => {
      // Always ensure SDK is initialized before open (lazy init)
      await initEmbeddables();
      await openComponent(r.component);
    },
    log,
  });
}

function wireNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.route;
      await render(key);
      history.replaceState({}, "", `#${key}`);
    });
  });

  document.getElementById("btnSwitchUser").addEventListener("click", () => {
    destroyEmbeddables();
    clearState();
    window.location.href = "/index.html";
  });

  document
    .getElementById("btnToggleTheme")
    .addEventListener("click", async () => {
      const s = getState();
      saveState({ dark: !s.dark });
      await updateTheme();
      log("🎨 Theme toggled. dark =", getState().dark);
    });
}

function ensureSession() {
  const s = loadState();
  if (!s.activeUserId) {
    window.location.href = "/index.html";
    return false;
  }
  activeUserLabel.textContent = s.activeUserLabel || s.activeUserId;
  applyModeGating();
  return true;
}

window.addEventListener("hashchange", async () => {
  const key = (location.hash || "#carriers").slice(1);
  await render(key);
});

wireNav();

if (ensureSession()) {
  const initial = (location.hash || "#carriers").slice(1);
  render(initial).catch((e) => log("❌ Render error:", e.message));
}
