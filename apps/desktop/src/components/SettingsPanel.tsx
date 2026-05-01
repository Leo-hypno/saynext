import {
  Download,
  ExternalLink,
  FileDown,
  FileUp,
  Monitor,
  Moon,
  RefreshCw,
  RotateCcw,
  Sun,
  X
} from "lucide-react";
import { useRef } from "react";
import type { AutostartStatus } from "../lib/autostart";
import type { UpdateInfo, UpdateProgress, UpdateStatus } from "../lib/updater";
import type { ThemeMode, UiCopy } from "../types";

type SettingsPanelProps = {
  autostartStatus: AutostartStatus;
  themeMode: ThemeMode;
  updateError: string | null;
  updateInfo: UpdateInfo | null;
  updateProgress: UpdateProgress | null;
  updateStatus: UpdateStatus;
  onAutostartToggle: (enabled: boolean) => void;
  onClose: () => void;
  onCustomPromptsExport: () => void;
  onCustomPromptsImport: (file: File) => void;
  onResetWindowPosition: () => void;
  onThemeModeChange: (mode: ThemeMode) => void;
  onUpdateCheck: () => void;
  onUpdateInstall: () => void;
  platformName: string;
  shortcutLabel: string;
  uiCopy: UiCopy;
};

export function SettingsPanel({
  autostartStatus,
  themeMode,
  updateError,
  updateInfo,
  updateProgress,
  updateStatus,
  onAutostartToggle,
  onClose,
  onCustomPromptsExport,
  onCustomPromptsImport,
  onResetWindowPosition,
  onThemeModeChange,
  onUpdateCheck,
  onUpdateInstall,
  platformName,
  shortcutLabel,
  uiCopy
}: SettingsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
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
            <p className="eyebrow">{uiCopy.settingsEyebrow}</p>
            <h2>{uiCopy.settingsTitle}</h2>
          </div>
          <button className="iconButton" onClick={onClose} title={uiCopy.settingsClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="settingsGroup">
          <div className="settingRow themeSetting">
            <div>
              <strong>{uiCopy.settingsThemeTitle}</strong>
              <p>{uiCopy.settingsThemeDescription}</p>
            </div>
            <div className="segmentedControl" role="group" aria-label={uiCopy.settingsThemeTitle}>
              <button
                className={themeMode === "system" ? "active" : ""}
                onClick={() => onThemeModeChange("system")}
                title={uiCopy.settingsThemeSystem}
                type="button"
              >
                <Monitor size={14} />
                {uiCopy.settingsThemeSystem}
              </button>
              <button
                className={themeMode === "light" ? "active" : ""}
                onClick={() => onThemeModeChange("light")}
                title={uiCopy.settingsThemeLight}
                type="button"
              >
                <Sun size={14} />
                {uiCopy.settingsThemeLight}
              </button>
              <button
                className={themeMode === "dark" ? "active" : ""}
                onClick={() => onThemeModeChange("dark")}
                title={uiCopy.settingsThemeDark}
                type="button"
              >
                <Moon size={14} />
                {uiCopy.settingsThemeDark}
              </button>
            </div>
          </div>

          <div className="settingRow">
            <div>
              <strong>{uiCopy.settingsShortcutTitle}</strong>
              <p>{uiCopy.settingsShortcutDescription(platformName)}</p>
            </div>
            <kbd>{shortcutLabel}</kbd>
          </div>

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

          <div className="settingRow promptDataRow">
            <div>
              <strong>{uiCopy.settingsPromptDataTitle}</strong>
              <p>{uiCopy.settingsPromptDataDescription}</p>
            </div>
            <div className="settingActions">
              <button className="compactButton" onClick={onCustomPromptsExport} type="button">
                <FileDown size={15} />
                {uiCopy.settingsExportButton}
              </button>
              <button
                className="compactButton"
                onClick={() => importInputRef.current?.click()}
                type="button"
              >
                <FileUp size={15} />
                {uiCopy.settingsImportButton}
              </button>
              <input
                ref={importInputRef}
                accept="application/json,.json"
                className="srOnly"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    onCustomPromptsImport(file);
                  }
                }}
                type="file"
              />
            </div>
          </div>
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
