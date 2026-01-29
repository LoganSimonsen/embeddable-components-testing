import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Config ----
const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY || "";
const ORIGIN_HOST = process.env.ORIGIN_HOST || "localhost";
const PORT = Number(process.env.PORT || 5001);

if (!EASYPOST_API_KEY) {
  console.warn("⚠️  Missing EASYPOST_API_KEY env var.");
}

// Serve static files (expects index.html under ./public)
app.use(express.static(path.join(__dirname, "public")));

// Small helper for consistent error payloads
function sendError(res, status, code, message, details = undefined) {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

// ---- EasyPost: Create embeddables session ----
// Docs: POST https://api.easypost.com/v2/embeddables/session (from your guide)
app.post("/api/easypost-embeddables/session", async (req, res) => {
  try {
    if (!EASYPOST_API_KEY) {
      return sendError(
        res,
        500,
        "missing_api_key",
        "EASYPOST_API_KEY is not set",
      );
    }

    const { user_id } = req.body || {};
    if (!user_id) {
      return sendError(
        res,
        400,
        "missing_user_id",
        "Missing required field: user_id",
      );
    }

    const payload = {
      user_id,
      origin_host: ORIGIN_HOST,
    };

    const resp = await fetch(
      "https://api.easypost.com/v2/embeddables/session",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${EASYPOST_API_KEY}:`).toString("base64"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      return sendError(
        res,
        resp.status,
        "easypost_error",
        "EasyPost embeddables session request failed",
        data,
      );
    }

    return res.json(data);
  } catch (err) {
    console.error("Session endpoint error:", err);
    return sendError(
      res,
      500,
      "server_error",
      "Unexpected server error",
      String(err),
    );
  }
});

// ---- EasyPost: Retrieve ALL child users ----
// Docs: GET /v2/users/children with page_size + after_id; response { children: [...], has_more: bool } :contentReference[oaicite:1]{index=1}
async function fetchAllChildUsers() {
  const all = [];
  let after_id = undefined;
  const page_size = 100;

  for (let i = 0; i < 1000; i++) {
    const url = new URL("https://api.easypost.com/v2/users/children");
    url.searchParams.set("page_size", String(page_size));
    if (after_id) url.searchParams.set("after_id", after_id);

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${EASYPOST_API_KEY}:`).toString("base64"),
      },
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      const error = new Error("EasyPost child-users request failed");
      error.status = resp.status;
      error.details = data;
      throw error;
    }

    const children = Array.isArray(data?.children) ? data.children : [];
    all.push(...children);

    if (!data?.has_more || children.length === 0) break;

    // Pagination: use the last returned child's id as after_id :contentReference[oaicite:2]{index=2}
    after_id = children[children.length - 1]?.id;
    if (!after_id) break;
  }

  return all;
}

app.get("/api/easypost-embeddables/child-users", async (req, res) => {
  try {
    if (!EASYPOST_API_KEY) {
      return sendError(
        res,
        500,
        "missing_api_key",
        "EASYPOST_API_KEY is not set",
      );
    }

    const children = await fetchAllChildUsers();

    // Return a trimmed shape for the UI (keep full object server-side if you want)
    const items = children.map((u) => ({
      id: u.id,
      name: u.name || "",
      created_at: u.created_at || "",
      verified: u.verified,
    }));

    return res.json({
      count: items.length,
      children: items,
    });
  } catch (err) {
    console.error("Child users endpoint error:", err);
    const status = err?.status || 500;
    return sendError(
      res,
      status,
      "easypost_error",
      "Failed to retrieve child users",
      err?.details || String(err),
    );
  }
});

// Fallback: serve index.html for root
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`   ORIGIN_HOST=${ORIGIN_HOST}`);
});
