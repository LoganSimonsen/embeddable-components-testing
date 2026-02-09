import { apiCreateSession } from "./api.js";
import { getState } from "./state.js";

let embeddables = null;
let boundUserId = "";

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

  if (!window.EasyPostEmbeddables?.init) {
    throw new Error("EasyPostEmbeddables SDK not loaded yet");
  }

  // If already initialized for a different user, destroy first
  if (embeddables && boundUserId && boundUserId !== activeUserId) {
    destroyEmbeddables();
  }

  if (embeddables && boundUserId === activeUserId) {
    return embeddables;
  }

  const fetchSessionId = async () => {
    const { activeUserId: uid } = getState();
    const { session_id } = await apiCreateSession(uid);
    return session_id;
  };

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
  return embeddables;
}

export async function updateTheme() {
  if (!embeddables?.update) return;
  await embeddables.update({ appearance: getAppearance() });
}

export function destroyEmbeddables() {
  try {
    embeddables?.destroy?.();
  } catch {}
  embeddables = null;
  boundUserId = "";
}

export async function openComponent(type) {
  const { activeUserId } = getState();
  if (!activeUserId) throw new Error("No active user selected");

  await initEmbeddables();

  // Safety: ensure we didn't change users without re-init
  if (boundUserId !== activeUserId) {
    throw new Error("Active user changed; please re-initialize session");
  }

  await embeddables.open(type);
}
