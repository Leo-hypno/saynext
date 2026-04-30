import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export async function copyText(text: string) {
  try {
    await invoke("plugin:clipboard-manager|write_text", { text });
    return true;
  } catch {
    await navigator.clipboard.writeText(text);
    return true;
  }
}

export async function hidePalette() {
  try {
    await getCurrentWindow().hide();
  } catch {
    // Web preview mode has no native window to hide.
  }
}
