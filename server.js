// server.js (ESM)
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// ---- config ----
const PORT = Number(process.env.PORT || 5001);
const EASYPOST_API_KEY = (process.env.EASYPOST_API_KEY || "").trim();
const ORIGIN_HOST = (process.env.ORIGIN_HOST || "").trim();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- demo fallback data (used if API fails or returns empty) ----
const DEMO_REFERRAL_CUSTOMERS = [
  {
    id: "user_691914eabdf8499e9c29a49303da267a",
    object: "User",
    parent_id: null,
    name: "Demo Shipper #1",
    phone_number: "8018675309",
    verified: true,
    created_at: "2025-09-09T17:19:12Z",
    default_carbon_offset: false,
    has_elevate_access: false,
    balance: "0.00000",
    price_per_shipment: "0.00000",
    recharge_amount: null,
    secondary_recharge_amount: null,
    recharge_threshold: null,
    has_billing_method: null,
    cc_fee_rate: "0.0375",
    default_insurance_amount: null,
    insurance_fee_rate: "0.01",
    insurance_fee_minimum: "1.00",
    email: "user@user.com",
    children: [],
  },
];

// ---- middleware ----
app.use(express.json({ limit: "1mb" }));
app.disable("x-powered-by");

// ---- helper ----
function requireEnv() {
  const missing = [];
  if (!EASYPOST_API_KEY) missing.push("EASYPOST_API_KEY");
  if (!ORIGIN_HOST) missing.push("ORIGIN_HOST");
  if (missing.length) {
    const err = new Error(`Missing required env var(s): ${missing.join(", ")}`);
    err.status = 500;
    throw err;
  }
}

function isBareHost(host) {
  return (
    host && !host.includes("://") && !host.includes("/") && !host.includes(" ")
  );
}

async function easypostFetch(url, { method = "GET", body } = {}) {
  requireEnv();

  if (!isBareHost(ORIGIN_HOST)) {
    const err = new Error(
      `Invalid ORIGIN_HOST="${ORIGIN_HOST}". Use bare host only (e.g. "localhost", "example.com").`,
    );
    err.status = 500;
    throw err;
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization:
      "Basic " + Buffer.from(`${EASYPOST_API_KEY}:`).toString("base64"),
  };

  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `EasyPost request failed (${resp.status})`;
    const err = new Error(msg);
    err.status = resp.status;
    err.easypost = data;
    throw err;
  }

  return data;
}

// ---- API routes (define BEFORE static + catch-all) ----
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    origin_host: ORIGIN_HOST || null,
    has_api_key: Boolean(EASYPOST_API_KEY),
  });
});

app.post("/api/easypost-embeddables/session", async (req, res) => {
  try {
    requireEnv();
    const user_id = String(req.body?.user_id || "").trim();
    if (!user_id) {
      return res.status(400).json({ error: { message: "Missing user_id" } });
    }

    const data = await easypostFetch(
      "https://api.easypost.com/v2/embeddables/session",
      {
        method: "POST",
        body: { user_id, origin_host: ORIGIN_HOST },
      },
    );

    return res.json(data);
  } catch (err) {
    return res.status(Number(err.status || 500)).json({
      error: { message: err.message, easypost: err.easypost },
    });
  }
});

app.get("/api/easypost-embeddables/child-users", async (req, res) => {
  try {
    const data = await easypostFetch(
      "https://api.easypost.com/v2/users/children",
    );
    res.json({ children: data?.children || [] });
  } catch (err) {
    return res.status(Number(err.status || 500)).json({
      error: { message: err.message, easypost: err.easypost },
    });
  }
});

app.get("/api/easypost-embeddables/referral-customers", async (req, res) => {
  try {
    const data = await easypostFetch(
      "https://api.easypost.com/v2/users/referral_customers",
    );
    res.json({ referral_customers: data?.referral_customers || [] });
    console.log("REFERRAL RAW:", JSON.stringify(data, null, 2));
  } catch (err) {
    return res.status(Number(err.status || 500)).json({
      error: { message: err.message, easypost: err.easypost },
    });
  }
});

app.get("/api/easypost-embeddables/users", async (req, res) => {
  let children = [];
  let referral_customers = [];
  const warnings = [];

  // ---- Child users ----
  try {
    const childResp = await easypostFetch(
      "https://api.easypost.com/v2/users/children",
    );
    children = childResp?.children || [];
  } catch (err) {
    warnings.push({
      type: "child_users_error",
      message: err.message,
    });
  }

  // ---- Referral customers ----
  try {
    const referralResp = await easypostFetch(
      "https://api.easypost.com/v2/users/referral_customers",
    );

    referral_customers = referralResp?.referral_customers || [];

    // ✅ fallback if API returns empty but this is a demo
    if (referral_customers.length === 0) {
      referral_customers = DEMO_REFERRAL_CUSTOMERS;
      warnings.push({
        type: "referral_fallback",
        message: "Using demo referral customers",
      });
    }
  } catch (err) {
    referral_customers = DEMO_REFERRAL_CUSTOMERS;
    warnings.push({
      type: "referral_fallback",
      message: "Referral customers API failed; using demo data",
    });
  }

  res.json({
    children,
    referral_customers,
    warnings,
  });
});

// ---- static site ----
app.use(express.static(path.join(__dirname, "public")));

// ---- SPA fallback (serves your app for non-api routes) ----
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---- start ----
const server = app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`   ORIGIN_HOST=${ORIGIN_HOST || "(missing)"}`);
});

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
    process.exit(1);
  }
  console.error("❌ Server error:", err);
  process.exit(1);
});
