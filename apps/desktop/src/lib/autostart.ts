import { invoke } from "@tauri-apps/api/core";

export type AutostartStatus = "checking" | "enabled" | "disabled" | "unavailable";

export async function getAutostartStatus(): Promise<AutostartStatus> {
  try {
    const enabled = await invoke<boolean>("plugin:autostart|is_enabled");
    return enabled ? "enabled" : "disabled";
  } catch {
    return "unavailable";
  }
}

export async function setAutostartEnabled(enabled: boolean) {
  await invoke(`plugin:autostart|${enabled ? "enable" : "disable"}`);
}
