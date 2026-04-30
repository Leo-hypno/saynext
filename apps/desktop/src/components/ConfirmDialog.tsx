import { Trash2, X } from "lucide-react";

type ConfirmDialogProps = {
  body: string;
  cancelLabel: string;
  confirmEyebrow: string;
  confirmLabel: string;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  body,
  cancelLabel,
  confirmEyebrow,
  confirmLabel,
  title,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <div className="settingsOverlay" role="presentation" onClick={onCancel}>
      <section
        aria-modal="true"
        aria-label={title}
        className="settingsPanel confirmPanel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="settingsHeader">
          <div>
            <p className="eyebrow">{confirmEyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button className="iconButton" onClick={onCancel} title={cancelLabel} type="button">
            <X size={18} />
          </button>
        </header>
        <div className="confirmBody">
          <p>{body}</p>
          <div className="dialogActions">
            <button className="compactButton" onClick={onCancel} type="button">
              {cancelLabel}
            </button>
            <button className="compactButton danger" onClick={onConfirm} type="button">
              <Trash2 size={15} />
              {confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
