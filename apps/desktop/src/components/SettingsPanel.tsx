import { RotateCcw, X } from "lucide-react";
import type { AutostartStatus } from "../lib/autostart";

type SettingsPanelProps = {
  autoHideAfterCopy: boolean;
  autostartStatus: AutostartStatus;
  onAutoHideAfterCopyChange: (enabled: boolean) => void;
  onAutostartToggle: (enabled: boolean) => void;
  onClose: () => void;
  onResetWindowPosition: () => void;
};

export function SettingsPanel({
  autoHideAfterCopy,
  autostartStatus,
  onAutoHideAfterCopyChange,
  onAutostartToggle,
  onClose,
  onResetWindowPosition
}: SettingsPanelProps) {
  const autostartUnavailable = autostartStatus === "checking" || autostartStatus === "unavailable";
  const autostartEnabled = autostartStatus === "enabled";

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
          <div className="settingRow">
            <div>
              <strong>GitHub repository</strong>
              <p>公開倉庫建立後，這裡會放正式連結。</p>
            </div>
          </div>
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
