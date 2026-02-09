export function mount(root, { open, log }) {
  root.innerHTML = `
    <h2 style="margin:0 0 8px 0;">Payment Logs</h2>
    <p style="margin:0 0 14px 0; color:#64748b;">
      View transactions and payment activity for the current user wallet.
    </p>
    <button class="btn btn-primary" id="btnOpen">Open Payment Logs</button>
  `;

  const btn = root.querySelector("#btnOpen");
  btn.addEventListener("click", async () => {
    try {
      await open();
    } catch (e) {
      log("❌ Failed to open payment logs:", e.message);
    }
  });

  return () => btn.removeEventListener("click", open);
}
