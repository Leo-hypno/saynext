import { Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  hasDuplicateCustomCategoryName,
  maxCustomCategoryNameLength,
  normalizeCustomCategoryName
} from "../lib/customCategories";
import type { CustomCategory, UiCopy } from "../types";

type CustomCategoryDialogProps = {
  categories: CustomCategory[];
  editingCategory: CustomCategory | null;
  locale: string;
  uiCopy: UiCopy;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function CustomCategoryDialog({
  categories,
  editingCategory,
  locale,
  uiCopy,
  onClose,
  onSave
}: CustomCategoryDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(editingCategory?.name ?? "");
  }, [editingCategory]);

  const trimmedName = normalizeCustomCategoryName(name);
  const duplicateName = useMemo(
    () =>
      hasDuplicateCustomCategoryName(categories, locale, trimmedName, editingCategory?.id ?? null),
    [categories, editingCategory?.id, locale, trimmedName]
  );
  const errorText =
    trimmedName.length === 0
      ? uiCopy.errorCategoryRequired
      : duplicateName
        ? uiCopy.errorCategoryDuplicate
        : null;
  const canSave =
    trimmedName.length > 0 &&
    trimmedName.length <= maxCustomCategoryNameLength &&
    !duplicateName;

  return (
    <div className="settingsOverlay" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        aria-label={editingCategory ? uiCopy.editCustomCategory : uiCopy.newCustomCategory}
        className="settingsPanel categoryPanel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="settingsHeader">
          <div>
            <p className="eyebrow">{uiCopy.manageCustomCategories}</p>
            <h2>{editingCategory ? uiCopy.editCustomCategory : uiCopy.newCustomCategory}</h2>
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
              onSave(trimmedName);
            }
          }}
        >
          <label>
            <span>{uiCopy.labelCategoryName}</span>
            <input
              autoFocus
              maxLength={maxCustomCategoryNameLength}
              onChange={(event) => setName(event.target.value)}
              placeholder={uiCopy.placeholderCategoryName}
              value={name}
            />
          </label>

          {errorText ? <p className="fieldError">{errorText}</p> : null}

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
