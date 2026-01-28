/**
 * Demo server for EasyPost Embeddables
 *
 * Run:
 *   EASYPOST_API_KEY=... ORIGIN_HOST=localhost PORT=5000 node server.js
 *
 * Notes:
 * - origin_host must be a bare host (no protocol, no subdomains per your guide)
 * - user_id should be the EasyPost User ID of the sub-account
 */

import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

// For local dev, allow your frontend origin.
// If you serve the static HTML from the same server, you can remove cors().
app.use(cors());

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY;
if (!EASYPOST_API_KEY) {
  console.error("Missing EASYPOST_API_KEY env var");
  process.exit(1);
}

// IMPORTANT: For local dev, this is typically "localhost".
// In production, this should be your real domain in bare-host format (example.com).
const ORIGIN_HOST = process.env.ORIGIN_HOST || "localhost";
const PORT = process.env.PORT || 5000;

/**
 * POST /api/easypost-embeddables/session
 * Body: { user_id: "user_..." }
 *
 * Returns: { session_id: "..." , ... }
 */
app.post("/api/easypost-embeddables/session", async (req, res) => {
  try {
    const { user_id } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ error: "Missing required field: user_id" });
    }

    const payload = {
      user_id,
      origin_host: ORIGIN_HOST,
    };

    const response = await fetch(
      "https://api.easypost.com/v2/embeddables/session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Basic Auth: username = API key, password empty
          Authorization:
            "Basic " + Buffer.from(`${EASYPOST_API_KEY}:`).toString("base64"),
        },
        body: JSON.stringify(payload),
      },
    );

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "EasyPost embeddables session request failed",
        status: response.status,
        details: data,
      });
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err?.message || err) });
  }
});

/**
 * Optional: serve the static demo UI from the same server.
 * Put index.html in a "public" folder.
 */
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Demo server running on http://localhost:${PORT}`);
  console.log(`ORIGIN_HOST=${ORIGIN_HOST}`);
});
