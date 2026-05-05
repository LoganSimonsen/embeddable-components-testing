# EasyPost Embeddables Demo

This repository contains a minimal demo application showing how to integrate **EasyPost Embeddable Components** and **Customer Portals** into a third-party web application.

The demo allows integrators to launch EasyPost-hosted management UI (Billing, Carriers, Payment Logs, Reports) from their own app using the EasyPost Embeddables SDK, and also generate one-time Customer Portal links for sub-account onboarding and account management.

---

## ✨ What This Demo Shows

- Fetching a short-lived embeddable `session_id` from EasyPost
- Initializing the EasyPost Embeddables SDK
- Launching embeddable components in response to user actions
- Creating short-lived Customer Portal account links
- Applying basic theming via `appearance.tokens`
- Handling a real-world full-screen iframe embeddables experience

---

## 🧱 Architecture

Browser

└── Demo HTML page

└── EasyPostEmbeddables SDK

└── EasyPost-hosted iframe (Forge UI)

Server (Node / Express)

└── /api/easypost-embeddables/session

└── Calls EasyPost EmbeddableSessions API

└── /api/customer-portals/account-link

└── Calls EasyPost Customer Portal Account Link API

---

## 📦 Prerequisites

- Node.js 18+
- An EasyPost account with **Forge enabled**
- A valid EasyPost API key
- A sub-account `user_id` to test against

---

## 🚀 Getting Started

### 1. Clone the repo

```
git clone https://github.com/your-org/easypost-embeddables-demo.git
cd easypost-embeddables-demo
```

2. Install dependencies

```
npm install
```

4. Set environment variables

```
export EASYPOST_API_KEY="your_easypost_api_key"
export ORIGIN_HOST="localhost"
export PORT=5001
```

ORIGIN_HOST must match the domain serving the client page (no protocol, no port).

5. Start the server

```
npm run start
```

By default the demo runs at:

http://localhost:5001

🖥 Using the Demo

- Open the app in your browser (http://localhost:5001)
- Enter a valid sub-account user_id or select on from the dropdown menu
- Click Initialize SDK
- Open any embeddable:
  - Manage Billing (only works with decentralized forge accounts)
  - Manage Carriers
  - Payment Logs (only works with decentralized forge accounts)
  - Reports (only works with decentralized forge accounts)
- Open the `Customer Portals` screen to:
  - Create an `account_onboarding` session with optional prefilled fields
  - Create an `account_management` session targeting a specific portal section

Each embeddable launches inside an EasyPost-hosted iframe.

Customer Portals open in a new browser tab because their session URLs are one-time use and short-lived.

🎨 Theming Notes
Basic theming is applied using appearance.tokens

Fonts can be customized using the fonts option

The embeddable UI itself is hosted by EasyPost and rendered inside a full-screen iframe

Background/shell styling of the embeddable iframe is not currently configurable.

🔐 Security & CSP
If you use a Content Security Policy (CSP), ensure the following are allowed:

script-src https://embed.easypost.com;
frame-src https://embed.easypost.com;
style-src https://assets.embed.easypost.com;
font-src https://assets.embed.easypost.com https://js.stripe.com;
connect-src https://assets.embed.easypost.com;
📝 Notes
Session refreshing is handled automatically by EasyPost

The demo intentionally keeps logic minimal for clarity

Intended for internal demos, testing, and reference implementations
