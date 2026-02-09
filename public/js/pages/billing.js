export function mount(root, { open, log }) {
  root.innerHTML = `
    <h2 style="margin:0 0 8px 0;">Billing</h2>
    <p style="margin:0 0 14px 0; color:#64748b;">
      View and manage wallet/billing settings (decentralized billing only).
    </p>
    <button class="btn btn-primary" id="btnOpen">Open Manage Billing</button>
  `;

  const btn = root.querySelector("#btnOpen");
  btn.addEventListener("click", async () => {
    try {
      await open();
    } catch (e) {
      log("❌ Failed to open billing:", e.message);
    }
  });

  return () => btn.removeEventListener("click", open);
}
