const KEY = "ep_demo_session_v1";

let state = {
  activeUserId: "",
  activeUserLabel: "",
  mode: "centralized", // centralized | decentralized
  allowed: {
    carriers: true,
    billing: false,
    paymentlogs: false,
    reports: false,
  },
  dark: false,
};

export function loadState() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { ...state };
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
    return { ...state };
  } catch {
    return { ...state };
  }
}

export function saveState(next) {
  state = { ...state, ...next };
  sessionStorage.setItem(KEY, JSON.stringify(state));
  return { ...state };
}

export function clearState() {
  state = {
    activeUserId: "",
    activeUserLabel: "",
    mode: "centralized",
    allowed: {
      carriers: true,
      billing: false,
      paymentlogs: false,
      reports: false,
    },
    dark: false,
  };
  sessionStorage.removeItem(KEY);
  return { ...state };
}

export function getState() {
  return { ...state };
}

export function computeAllowed(mode) {
  const decentralized = mode === "decentralized";
  return {
    carriers: true,
    billing: decentralized,
    paymentlogs: decentralized,
    reports: decentralized,
  };
}
