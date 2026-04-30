import { Download, ExternalLink, RefreshCw, RotateCcw, X } from "lucide-react";
import type { AutostartStatus } from "../lib/autostart";
import type { UpdateInfo, UpdateProgress, UpdateStatus } from "../lib/updater";

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
  onUpdateInstall
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
        aria-label="SayNext settings"
        className="settingsPanel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="settingsHeader">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>偏好設定</h2>
          </div>
          <button className="iconButton" onClick={onClose} title="關閉偏好設定" type="button">
            <X size={18} />
          </button>
        </header>

        <div className="settingsGroup">
          <div className="settingRow">
            <div>
              <strong>快捷鍵</strong>
              <p>從任何 App 叫出 SayNext。</p>
            </div>
            <kbd>Cmd/Ctrl + Shift + H</kbd>
          </div>

          <label className="settingRow">
            <div>
              <strong>複製後自動收起</strong>
              <p>點選句型後，自動回到原本工作流程。</p>
            </div>
            <input
              checked={autoHideAfterCopy}
              onChange={(event) => onAutoHideAfterCopyChange(event.target.checked)}
              type="checkbox"
            />
          </label>

          <label className="settingRow">
            <div>
              <strong>開機自動啟動</strong>
              <p>{autostartCopy(autostartStatus)}</p>
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
              <strong>重設視窗位置</strong>
              <p>把 SayNext 移回螢幕中央。</p>
            </div>
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="settingsGroup">
          <div className="settingRow updateRow">
            <div>
              <strong>軟體更新</strong>
              <p>{updateCopy(updateStatus, updateInfo, updatePercent, updateError)}</p>
            </div>
            {updateStatus === "available" ? (
              <button className="compactButton primary" onClick={onUpdateInstall} type="button">
                <Download size={15} />
                更新
              </button>
            ) : (
              <button
                className="compactButton"
                disabled={updateBusy}
                onClick={onUpdateCheck}
                type="button"
              >
                <RefreshCw className={updateBusy ? "spin" : undefined} size={15} />
                檢查
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
              <strong>GitHub repository</strong>
              <p>查看原始碼、下載版本與回報問題。</p>
            </div>
            <ExternalLink size={18} />
          </a>
          <p className="settingsNote">
            SayNext is open-source, offline-first, and built for people who do not know what
            to ask AI next.
          </p>
        </div>
      </section>
    </div>
  );
}

function autostartCopy(status: AutostartStatus) {
  if (status === "checking") return "正在檢查目前狀態。";
  if (status === "unavailable") return "Web preview 不支援，桌面版可使用。";
  return "登入系統後自動常駐在 menu bar / tray。";
}

function updateCopy(
  status: UpdateStatus,
  updateInfo: UpdateInfo | null,
  updatePercent: number | null,
  error: string | null
) {
  if (status === "checking") return "正在檢查 GitHub 上是否有新版本。";
  if (status === "available" && updateInfo) {
    return `找到 ${updateInfo.version}，目前版本是 ${updateInfo.currentVersion}。`;
  }
  if (status === "notAvailable") return "目前已經是最新版本。";
  if (status === "downloading") {
    return updatePercent === null
      ? "正在下載並安裝更新。"
      : `正在下載並安裝更新：${updatePercent}%。`;
  }
  if (status === "restarting") return "更新完成，正在重新啟動 SayNext。";
  if (status === "error") return error ?? "更新檢查失敗，請稍後再試。";
  return "從 GitHub Release 檢查新版並自動安裝。";
}
