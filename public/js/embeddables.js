import { apiCreateSession } from "./api.js";
import { getState } from "./state.js";

let embeddables = null;
let boundUserId = "";
let embeddablesInstanceCounter = 0;
let currentInstanceId = null;

function truncateSessionId(sessionId = "") {
  const value = String(sessionId || "");
  if (!value) return "(missing)";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export function isReady() {
  return Boolean(embeddables);
}

export function getBoundUserId() {
  return boundUserId;
}

function getAppearance() {
  const { dark } = getState();
  return {
    tokens: dark
      ? {
          "font.family": "calibri, sans-serif",
          "color.neutral.000": "#1f2937",
          "color.neutral.900": "#ffffff",
        }
      : {
          "font.family": "calibri, sans-serif",
          "color.neutral.000": "#ffffff",
        },
    modalZIndex: "123456",
  };
}

export async function initEmbeddables() {
  const { activeUserId } = getState();
  if (!activeUserId) throw new Error("No active user selected");

  console.log("[embeddables.init] requested", {
    timestamp: new Date().toISOString(),
    activeUserId,
    boundUserId: boundUserId || null,
    hasExistingInstance: Boolean(embeddables),
    currentInstanceId,
  });

  if (!window.EasyPostEmbeddables?.init) {
    throw new Error("EasyPostEmbeddables SDK not loaded yet");
  }

  // If already initialized for a different user, destroy first
  if (embeddables && boundUserId && boundUserId !== activeUserId) {
    console.log("[embeddables.init] destroying stale instance", {
      timestamp: new Date().toISOString(),
      currentInstanceId,
      boundUserId,
      nextUserId: activeUserId,
    });
    destroyEmbeddables();
  }

  if (embeddables && boundUserId === activeUserId) {
    console.log("[embeddables.init] reusing existing instance", {
      timestamp: new Date().toISOString(),
      currentInstanceId,
      activeUserId,
    });
    return embeddables;
  }

  const fetchSessionId = async () => {
    const { activeUserId: uid } = getState();
    console.log("[embeddables.fetchSessionId] called", {
      timestamp: new Date().toISOString(),
      user_id: uid || null,
      hostname: window.location.hostname || null,
    });
    const { session_id } = await apiCreateSession(uid);
    console.log("[embeddables.fetchSessionId] returned", {
      timestamp: new Date().toISOString(),
      session_id: truncateSessionId(session_id),
    });
    return session_id;
  };

  currentInstanceId = `emb-${++embeddablesInstanceCounter}`;
  embeddables = window.EasyPostEmbeddables.init({
    fetchSessionId,
    fonts: [
      {
        cssSrc:
          "https://fonts.googleapis.com/css2?family=Zen+Dots&display=swap",
      },
    ],
    appearance: getAppearance(),
  });

  boundUserId = activeUserId;
  console.log("[embeddables.init] created new instance", {
    timestamp: new Date().toISOString(),
    currentInstanceId,
    boundUserId,
  });
  return embeddables;
}

export async function updateTheme() {
  if (!embeddables?.update) return;
  await embeddables.update({ appearance: getAppearance() });
}

export function destroyEmbeddables() {
  try {
    console.log("[embeddables.destroy] destroying instance", {
      timestamp: new Date().toISOString(),
      currentInstanceId,
      boundUserId: boundUserId || null,
    });
    embeddables?.destroy?.();
  } catch {}
  embeddables = null;
  boundUserId = "";
  currentInstanceId = null;
}

export async function openComponent(type) {
  const { activeUserId } = getState();
  if (!activeUserId) throw new Error("No active user selected");

  console.log("[embeddables.open] requested", {
    timestamp: new Date().toISOString(),
    type,
    activeUserId,
    boundUserId: boundUserId || null,
    currentInstanceId,
  });

  await initEmbeddables();

  // Safety: ensure we didn't change users without re-init
  if (boundUserId !== activeUserId) {
    throw new Error("Active user changed; please re-initialize session");
  }

  console.log("[embeddables.open] opening component", {
    timestamp: new Date().toISOString(),
    type,
    activeUserId,
    currentInstanceId,
  });
  await embeddables.open(type);
}
