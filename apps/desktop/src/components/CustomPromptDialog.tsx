import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CustomPromptDraft, RescuePrompt } from "../types";

type CustomPromptDialogProps = {
  editingPrompt: RescuePrompt | null;
  onClose: () => void;
  onSave: (draft: CustomPromptDraft) => void;
};

const emptyDraft: CustomPromptDraft = {
  tags: "",
  text: "",
  title: ""
};

export function CustomPromptDialog({
  editingPrompt,
  onClose,
  onSave
}: CustomPromptDialogProps) {
  const [draft, setDraft] = useState<CustomPromptDraft>(emptyDraft);

  useEffect(() => {
    setDraft(
      editingPrompt
        ? {
            tags: editingPrompt.tags.join(", "),
            text: editingPrompt.text,
            title: editingPrompt.title
          }
        : emptyDraft
    );
  }, [editingPrompt]);

  const canSave = draft.title.trim().length > 0 && draft.text.trim().length > 0;

  return (
    <div className="settingsOverlay" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        aria-label="自訂句子"
        className="settingsPanel customPromptPanel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="settingsHeader">
          <div>
            <p className="eyebrow">My Prompts</p>
            <h2>{editingPrompt ? "編輯句子" : "新增句子"}</h2>
          </div>
          <button className="iconButton" onClick={onClose} title="關閉" type="button">
            <X size={18} />
          </button>
        </header>

        <form
          className="customPromptForm"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) {
              onSave(draft);
            }
          }}
        >
          <label>
            <span>標題</span>
            <input
              autoFocus
              maxLength={32}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="例如：請先拆任務"
              value={draft.title}
            />
          </label>

          <label>
            <span>句子內容</span>
            <textarea
              onChange={(event) => setDraft({ ...draft, text: event.target.value })}
              placeholder="請先把這件事拆成 3 到 5 個步驟，並告訴我第一步要做什麼。"
              rows={6}
              value={draft.text}
            />
          </label>

          <label>
            <span>標籤</span>
            <input
              onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
              placeholder="planning, codex, writing"
              value={draft.tags}
            />
          </label>

          <div className="dialogActions">
            <button className="compactButton" onClick={onClose} type="button">
              取消
            </button>
            <button className="compactButton primary" disabled={!canSave} type="submit">
              <Save size={15} />
              儲存
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
