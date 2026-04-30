import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";

export type UpdateInfo = {
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
};

export type UpdateProgress = {
  downloaded: number;
  total?: number;
};

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "notAvailable"
  | "downloading"
  | "restarting"
  | "error";

export async function checkForUpdate() {
  return check();
}

export function toUpdateInfo(update: Update): UpdateInfo {
  return {
    body: update.body,
    currentVersion: update.currentVersion,
    date: update.date,
    version: update.version
  };
}

export async function installUpdate(
  update: Update,
  onProgress: (progress: UpdateProgress) => void
) {
  let downloaded = 0;
  let total: number | undefined;

  await update.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === "Started") {
      downloaded = 0;
      total = event.data.contentLength;
      onProgress({ downloaded, total });
      return;
    }

    if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      onProgress({ downloaded, total });
      return;
    }

    onProgress({ downloaded: total ?? downloaded, total });
  });

  await relaunch();
}
