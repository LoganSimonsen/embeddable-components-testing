import { apiGetUsers } from "./api.js";
import { saveState, computeAllowed, clearState } from "./state.js";

const userSelect = document.getElementById("userSelect");
const modeHelp = document.getElementById("modeHelp");
const btnContinue = document.getElementById("btnContinue");
const btnRefresh = document.getElementById("btnRefresh");
const logEl = document.getElementById("log");

function log(...args) {
  logEl.textContent +=
    "\n" +
    args
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2)))
      .join(" ");
}

let usersCache = { mode: "centralized", children: [], referral_customers: [] };

function buildUserOptions() {
  // If referral customers exist => decentralized => use referral customers list
  const referral = Array.isArray(usersCache.referral_customers)
    ? usersCache.referral_customers
    : [];
  const children = Array.isArray(usersCache.children)
    ? usersCache.children
    : [];

  const decentralized = referral.length > 0;
  const list = decentralized ? referral : children;

  userSelect.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = list.length ? "Select a user…" : "No users found";
  userSelect.appendChild(first);

  for (const u of list) {
    const opt = document.createElement("option");
    opt.value = u.id;
    const label = u.name ? `${u.name} — ${u.id}` : u.id;
    opt.textContent = label;
    userSelect.appendChild(opt);
  }

  userSelect.disabled = list.length === 0;
  btnContinue.disabled = true;

  modeHelp.textContent = decentralized
    ? "Decentralized billing detected (ReferralCustomers). Billing, Payment Logs, Reports enabled."
    : "Centralized billing detected (Child Users). Only Carrier Accounts enabled.";
}

async function loadUsers() {
  userSelect.disabled = true;
  userSelect.innerHTML = `<option value="">Loading…</option>`;
  btnContinue.disabled = true;

  try {
    const data = await apiGetUsers();

    usersCache = {
      children: Array.isArray(data.children) ? data.children : [],
      referral_customers: Array.isArray(data.referral_customers)
        ? data.referral_customers
        : [],
    };

    const referral = Array.isArray(data.referral_customers)
      ? data.referral_customers
      : [];
    const mode = referral.length > 0 ? "decentralized" : "centralized";

    log("✅ Loaded users.", {
      children: data.children?.length,
      referral_customers: referral.length,
      mode,
    });

    buildUserOptions();
  } catch (e) {
    log("❌ Failed to load users:", e.message);
    userSelect.innerHTML = `<option value="">Failed to load</option>`;
    userSelect.disabled = true;
    modeHelp.textContent = "Failed to load users.";
  }
}

userSelect.addEventListener("change", () => {
  btnContinue.disabled = !userSelect.value;
});

btnRefresh.addEventListener("click", async () => {
  await loadUsers();
});

document.getElementById("btnUseManual").addEventListener("click", () => {
  const manual = document.getElementById("manualUserId").value.trim();
  if (!manual) return log("❌ Manual user_id is empty.");

  // For manual, we can’t infer mode perfectly; keep current detected mode.
  userSelect.value = "";
  userSelect.disabled = true;

  const referral = Array.isArray(usersCache.referral_customers)
    ? usersCache.referral_customers
    : [];
  const mode = referral.length > 0 ? "decentralized" : "centralized";

  saveState({
    activeUserId: manual,
    activeUserLabel: manual,
    mode,
    allowed: computeAllowed(mode),
  });

  window.location.href = "/dashboard.html";
});

btnContinue.addEventListener("click", () => {
  const id = userSelect.value;
  if (!id) return;

  // Determine mode + allowed from actual data
  const referral = Array.isArray(usersCache.referral_customers)
    ? usersCache.referral_customers
    : [];
  const children = Array.isArray(usersCache.children)
    ? usersCache.children
    : [];

  const mode = referral.length > 0 ? "decentralized" : "centralized";
  const list = mode === "decentralized" ? referral : children;
  const found = list.find((u) => u.id === id);

  saveState({
    activeUserId: id,
    activeUserLabel: found?.name ? `${found.name} (${id})` : id,
    mode,
    allowed: computeAllowed(mode),
  });

  window.location.href = "/dashboard.html";
});

// On load: clear any previous session (demo convenience)
clearState();
loadUsers();
