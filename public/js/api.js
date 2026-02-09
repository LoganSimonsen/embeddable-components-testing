// public/js/auth/api.js
export async function apiGetUsers() {
  const resp = await fetch("/api/easypost-embeddables/users", {
    headers: { Accept: "application/json" },
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(
      data?.error?.message || `Failed to load users (${resp.status})`,
    );
  }

  // IMPORTANT: return arrays, not counts
  return data;
}

export async function apiCreateSession(user_id) {
  const resp = await fetch("/api/easypost-embeddables/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  });
  const data = await resp.json();
  if (!resp.ok)
    throw new Error(data?.error?.message || "Failed to create session");
  return data; // expects { session_id: "..." }
}
