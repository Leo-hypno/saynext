import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { customCategoryId } from "../lib/promptView";
import type { Category, CustomPromptDraft, RescuePrompt, UiCopy } from "../types";

type CustomPromptDialogProps = {
  categories: Category[];
  editingPrompt: RescuePrompt | null;
  uiCopy: UiCopy;
  onClose: () => void;
  onSave: (draft: CustomPromptDraft) => void;
};

const emptyDraft: CustomPromptDraft = {
  category: customCategoryId,
  tags: "",
  text: "",
  title: ""
};

export function CustomPromptDialog({
  categories,
  editingPrompt,
  uiCopy,
  onClose,
  onSave
}: CustomPromptDialogProps) {
  const [draft, setDraft] = useState<CustomPromptDraft>(emptyDraft);

  useEffect(() => {
    setDraft(
      editingPrompt
        ? {
            category: editingPrompt.category || customCategoryId,
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
        aria-label={editingPrompt ? uiCopy.editCustomPrompt : uiCopy.newCustomPrompt}
        className="settingsPanel customPromptPanel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="settingsHeader">
          <div>
            <p className="eyebrow">{uiCopy.myPromptsEyebrow}</p>
            <h2>{editingPrompt ? uiCopy.editCustomPrompt : uiCopy.newCustomPrompt}</h2>
          </div>
          <button className="iconButton" onClick={onClose} title={uiCopy.close} type="button">
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
            <span>{uiCopy.labelTitle}</span>
            <input
              autoFocus
              maxLength={32}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder={uiCopy.placeholderTitle}
              value={draft.title}
            />
          </label>

          <label>
            <span>{uiCopy.labelContent}</span>
            <textarea
              onChange={(event) => setDraft({ ...draft, text: event.target.value })}
              placeholder={uiCopy.placeholderContent}
              rows={6}
              value={draft.text}
            />
          </label>

          <label>
            <span>{uiCopy.labelPlacement}</span>
            <select
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              value={draft.category}
            >
              <option value={customCategoryId}>{uiCopy.categoryCustom}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{uiCopy.labelTags}</span>
            <input
              onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
              placeholder={uiCopy.placeholderTags}
              value={draft.tags}
            />
          </label>

          <div className="dialogActions">
            <button className="compactButton" onClick={onClose} type="button">
              {uiCopy.cancel}
            </button>
            <button className="compactButton primary" disabled={!canSave} type="submit">
              <Save size={15} />
              {uiCopy.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
