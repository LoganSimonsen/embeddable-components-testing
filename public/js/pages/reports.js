export function mount(root, { open, log }) {
  root.innerHTML = `
    <h2 style="margin:0 0 8px 0;">Reports</h2>
    <p style="margin:0 0 14px 0; color:#64748b;">
      Access reporting for labels, spend, and activity (if available).
    </p>
    <button class="btn btn-primary" id="btnOpen">Open Reports</button>
  `;

  const btn = root.querySelector("#btnOpen");
  btn.addEventListener("click", async () => {
    try {
      await open();
    } catch (e) {
      log("❌ Failed to open reports:", e.message);
    }
  });

  return () => btn.removeEventListener("click", open);
}
