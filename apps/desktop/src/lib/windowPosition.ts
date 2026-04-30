import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";

const positionStorageKey = "saynext.windowPosition";

type StoredPosition = {
  x: number;
  y: number;
};

export async function restoreWindowPosition() {
  try {
    const position = readStoredPosition();
    if (!position) return;

    await getCurrentWindow().setPosition(new PhysicalPosition(position.x, position.y));
  } catch {
    // Ignore invalid saved positions and web preview mode.
  }
}

export async function resetWindowPosition() {
  try {
    localStorage.removeItem(positionStorageKey);

    await getCurrentWindow().center();
  } catch {
    // Web preview mode cannot control the native window.
  }
}

export async function subscribeToWindowMoves() {
  try {
    return await getCurrentWindow().onMoved(({ payload }) => {
      localStorage.setItem(
        positionStorageKey,
        JSON.stringify({
          x: payload.x,
          y: payload.y
        })
      );
    });
  } catch {
    return () => {};
  }
}

function readStoredPosition(): StoredPosition | null {
  try {
    const value = JSON.parse(localStorage.getItem(positionStorageKey) ?? "null");
    if (
      value &&
      typeof value.x === "number" &&
      Number.isFinite(value.x) &&
      typeof value.y === "number" &&
      Number.isFinite(value.y)
    ) {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}
