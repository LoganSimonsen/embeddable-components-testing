export function mount(root, { open, log }) {
  root.innerHTML = `
    <h2 style="margin:0 0 8px 0;">Carrier Accounts</h2>
    <p style="margin:0 0 14px 0; color:#64748b;">
      Manage carrier connections and configurations for the current user context.
    </p>
    <button class="btn btn-primary" id="btnOpen">Open Manage Carriers</button>
  `;

  const btn = root.querySelector("#btnOpen");
  btn.addEventListener("click", async () => {
    try {
      await open();
    } catch (e) {
      log("❌ Failed to open carriers:", e.message);
    }
  });

  return () => btn.removeEventListener("click", open);
}
