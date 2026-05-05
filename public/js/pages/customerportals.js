import { apiCreateCustomerPortalLink } from "../api.js";
import { getState } from "../state.js";

const MANAGEMENT_TARGETS = [
  "account_settings",
  "wallet",
  "carriers",
  "reports",
  "branding",
  "analytics",
  "insurance",
];

function collectOnboardingFields(root) {
  const fields = {};
  root.querySelectorAll("[data-onboarding-field]").forEach((input) => {
    fields[input.dataset.onboardingField] = input.value.trim();
  });
  return fields;
}

function setResult(root, message, tone = "ok", link = "") {
  const statusEl = root.querySelector("#portalStatus");
  const linkEl = root.querySelector("#portalLink");

  statusEl.hidden = false;
  statusEl.dataset.tone = tone;
  statusEl.textContent = message;

  if (link) {
    linkEl.hidden = false;
    linkEl.href = link;
    linkEl.textContent = link;
  } else {
    linkEl.hidden = true;
    linkEl.removeAttribute("href");
    linkEl.textContent = "";
  }
}

export function mount(root, { log }) {
  const { activeUserId, activeUserLabel, mode } = getState();
  const hashQuery = (location.hash.split("?")[1] || "").trim();
  const portalState = new URLSearchParams(hashQuery).get("portal");
  const portalMessage =
    portalState === "refresh"
      ? "The previous portal session was expired, reused, or invalid. Generate a fresh link below."
      : portalState === "return"
        ? "The user returned from the Customer Portal. Use webhooks or API polling if you need to confirm completion."
        : "";

  root.innerHTML = `
    <div class="stack">
      <p class="lede">
        Launch one-time EasyPost Customer Portal sessions for the selected sub account. These links expire quickly and should open in a new tab.
      </p>

      <div class="status" data-tone="warn">
        Active user: <strong>${activeUserLabel || activeUserId}</strong><br />
        Mode: <strong>${mode}</strong><br />
        Portal links are one-time use and expire after five minutes.
      </div>

      ${portalMessage ? `<div class="status" data-tone="ok">${portalMessage}</div>` : ""}

      <div class="grid grid-2">
        <section class="card">
          <h2>Onboarding Portal</h2>
          <p>Prefill optional account details, then create an <code>account_onboarding</code> session.</p>

          <div class="field-grid" style="margin-top:16px;">
            <label class="field">
              <span class="label">Name</span>
              <input class="input" data-onboarding-field="name" />
            </label>
            <label class="field">
              <span class="label">Email</span>
              <input class="input" data-onboarding-field="email" type="email" />
            </label>
            <label class="field">
              <span class="label">Phone</span>
              <input class="input" data-onboarding-field="phone" />
            </label>
            <label class="field">
              <span class="label">Street 1</span>
              <input class="input" data-onboarding-field="street1" />
            </label>
            <label class="field">
              <span class="label">Street 2</span>
              <input class="input" data-onboarding-field="street2" />
            </label>
            <label class="field">
              <span class="label">City</span>
              <input class="input" data-onboarding-field="city" />
            </label>
            <label class="field">
              <span class="label">State</span>
              <input class="input" data-onboarding-field="state" />
            </label>
            <label class="field">
              <span class="label">ZIP</span>
              <input class="input" data-onboarding-field="zip" />
            </label>
            <label class="field">
              <span class="label">Country</span>
              <input class="input" data-onboarding-field="country" value="US" />
            </label>
          </div>

          <div class="row" style="margin-top:16px;">
            <button class="btn btn-primary" id="btnCreateOnboarding" type="button">
              Open Onboarding Portal
            </button>
          </div>
        </section>

        <section class="card">
          <h2>Management Portal</h2>
          <p>Create an <code>account_management</code> session and send the user into a specific portal section.</p>

          <label class="field" style="margin-top:16px;">
            <span class="label">Target</span>
            <select class="select" id="managementTarget">
              ${MANAGEMENT_TARGETS.map(
                (target) =>
                  `<option value="${target}">${target}</option>`,
              ).join("")}
            </select>
          </label>

          <div class="row" style="margin-top:16px;">
            <button class="btn btn-primary" id="btnCreateManagement" type="button">
              Open Management Portal
            </button>
          </div>
        </section>
      </div>

      <div id="portalStatus" class="status" hidden></div>
      <a id="portalLink" class="status linkbox" hidden target="_blank" rel="noopener noreferrer"></a>
    </div>
  `;

  const onboardingBtn = root.querySelector("#btnCreateOnboarding");
  const managementBtn = root.querySelector("#btnCreateManagement");
  const targetEl = root.querySelector("#managementTarget");

  async function createPortal(payload) {
    onboardingBtn.disabled = true;
    managementBtn.disabled = true;

    try {
      const data = await apiCreateCustomerPortalLink({
        user_id: activeUserId,
        ...payload,
      });

      const link = String(data?.link || "").trim();
      const expiresAt = data?.expires_at || "unknown";

      if (!link) {
        throw new Error("EasyPost did not return a portal link");
      }

      window.open(link, "_blank", "noopener,noreferrer");
      setResult(
        root,
        `Portal session created. Expires at ${expiresAt}. If your browser blocks the popup, use the link below.`,
        "ok",
        link,
      );
      log("✅ Customer portal link created.", {
        session_type: payload.session_type,
        target: payload.target || null,
        expires_at: expiresAt,
      });
    } catch (error) {
      setResult(root, `Failed to create portal session: ${error.message}`, "warn");
      log("❌ Failed to create customer portal link:", error.message);
    } finally {
      onboardingBtn.disabled = false;
      managementBtn.disabled = false;
    }
  }

  async function handleOnboardingClick() {
    await createPortal({
      session_type: "account_onboarding",
      fields: collectOnboardingFields(root),
    });
  }

  async function handleManagementClick() {
    await createPortal({
      session_type: "account_management",
      target: targetEl.value,
    });
  }

  onboardingBtn.addEventListener("click", handleOnboardingClick);
  managementBtn.addEventListener("click", handleManagementClick);

  return () => {
    onboardingBtn.removeEventListener("click", handleOnboardingClick);
    managementBtn.removeEventListener("click", handleManagementClick);
  };
}
