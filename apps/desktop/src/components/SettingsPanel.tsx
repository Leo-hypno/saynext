import { Download, ExternalLink, RefreshCw, RotateCcw, X } from "lucide-react";
import type { AutostartStatus } from "../lib/autostart";
import type { UpdateInfo, UpdateProgress, UpdateStatus } from "../lib/updater";
import type { UiCopy } from "../types";

type SettingsPanelProps = {
  autoHideAfterCopy: boolean;
  autostartStatus: AutostartStatus;
  updateError: string | null;
  updateInfo: UpdateInfo | null;
  updateProgress: UpdateProgress | null;
  updateStatus: UpdateStatus;
  onAutoHideAfterCopyChange: (enabled: boolean) => void;
  onAutostartToggle: (enabled: boolean) => void;
  onClose: () => void;
  onResetWindowPosition: () => void;
  onUpdateCheck: () => void;
  onUpdateInstall: () => void;
  platformName: string;
  shortcutLabel: string;
  uiCopy: UiCopy;
};

export function SettingsPanel({
  autoHideAfterCopy,
  autostartStatus,
  updateError,
  updateInfo,
  updateProgress,
  updateStatus,
  onAutoHideAfterCopyChange,
  onAutostartToggle,
  onClose,
  onResetWindowPosition,
  onUpdateCheck,
  onUpdateInstall,
  platformName,
  shortcutLabel,
  uiCopy
}: SettingsPanelProps) {
  const autostartUnavailable = autostartStatus === "checking" || autostartStatus === "unavailable";
  const autostartEnabled = autostartStatus === "enabled";
  const updateBusy =
    updateStatus === "checking" ||
    updateStatus === "downloading" ||
    updateStatus === "restarting";
  const updatePercent =
    updateProgress?.total && updateProgress.total > 0
      ? Math.min(100, Math.round((updateProgress.downloaded / updateProgress.total) * 100))
      : null;

  return (
    <div className="settingsOverlay" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        aria-label={uiCopy.settingsTitle}
        className="settingsPanel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="settingsHeader">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>{uiCopy.settingsTitle}</h2>
          </div>
          <button className="iconButton" onClick={onClose} title={uiCopy.settingsClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="settingsGroup">
          <div className="settingRow">
            <div>
              <strong>{uiCopy.settingsShortcutTitle}</strong>
              <p>{uiCopy.settingsShortcutDescription(platformName)}</p>
            </div>
            <kbd>{shortcutLabel}</kbd>
          </div>

          <label className="settingRow">
            <div>
              <strong>{uiCopy.settingsAutoHideTitle}</strong>
              <p>{uiCopy.settingsAutoHideDescription}</p>
            </div>
            <input
              checked={autoHideAfterCopy}
              onChange={(event) => onAutoHideAfterCopyChange(event.target.checked)}
              type="checkbox"
            />
          </label>

          <label className="settingRow">
            <div>
              <strong>{uiCopy.settingsAutostartTitle}</strong>
              <p>{autostartCopy(autostartStatus, uiCopy)}</p>
            </div>
            <input
              checked={autostartEnabled}
              disabled={autostartUnavailable}
              onChange={(event) => onAutostartToggle(event.target.checked)}
              type="checkbox"
            />
          </label>

          <button className="settingRow settingButton" onClick={onResetWindowPosition} type="button">
            <div>
              <strong>{uiCopy.settingsWindowResetTitle}</strong>
              <p>{uiCopy.settingsWindowResetDescription}</p>
            </div>
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="settingsGroup">
          <div className="settingRow updateRow">
            <div>
              <strong>{uiCopy.settingsUpdateTitle}</strong>
              <p>{updateCopy(updateStatus, updateInfo, updatePercent, updateError, uiCopy)}</p>
            </div>
            {updateStatus === "available" ? (
              <button className="compactButton primary" onClick={onUpdateInstall} type="button">
                <Download size={15} />
                {uiCopy.settingsUpdateButtonInstall}
              </button>
            ) : (
              <button
                className="compactButton"
                disabled={updateBusy}
                onClick={onUpdateCheck}
                type="button"
              >
                <RefreshCw className={updateBusy ? "spin" : undefined} size={15} />
                {uiCopy.settingsUpdateButtonCheck}
              </button>
            )}
          </div>

          <a
            className="settingRow settingButton"
            href="https://github.com/Leo-hypno/saynext"
            rel="noreferrer"
            target="_blank"
          >
            <div>
              <strong>{uiCopy.settingsGithubTitle}</strong>
              <p>{uiCopy.settingsGithubDescription}</p>
            </div>
            <ExternalLink size={18} />
          </a>
          <p className="settingsNote">{uiCopy.settingsNote}</p>
        </div>
      </section>
    </div>
  );
}

function autostartCopy(status: AutostartStatus, uiCopy: UiCopy) {
  if (status === "checking") return uiCopy.settingsAutostartChecking;
  if (status === "unavailable") return uiCopy.settingsAutostartUnavailable;
  return uiCopy.settingsAutostartDescription;
}

function updateCopy(
  status: UpdateStatus,
  updateInfo: UpdateInfo | null,
  updatePercent: number | null,
  error: string | null,
  uiCopy: UiCopy
) {
  if (status === "checking") return uiCopy.settingsUpdateChecking;
  if (status === "available" && updateInfo) {
    return uiCopy.settingsUpdateAvailable(updateInfo.version, updateInfo.currentVersion);
  }
  if (status === "notAvailable") return uiCopy.settingsUpdateNotAvailable;
  if (status === "downloading") {
    return updatePercent === null
      ? uiCopy.settingsUpdateDownloading
      : uiCopy.settingsUpdateDownloadingPercent(updatePercent);
  }
  if (status === "restarting") return uiCopy.settingsUpdateRestarting;
  if (status === "error") return error ?? uiCopy.settingsUpdateError;
  return uiCopy.settingsUpdateDescription;
}
