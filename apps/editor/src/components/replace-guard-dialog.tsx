import { useEffect, useRef } from "react";

export interface ReplaceGuardDialogProps {
  /** What is about to replace the dirty work, e.g. "Open amp.icproj.json". */
  intent: string;
  saving: boolean;
  onCancel(): void;
  onSaveAndContinue(): void;
  onDiscard(): void;
}

/**
 * Outgoing dirty-work protection. Recovery is a safety copy, not permission to
 * discard the foreground Project, so every dirty replacement pauses here.
 * Defaults to Stay; Escape stays. Cloud Save must succeed before the
 * replacement is allowed to continue.
 */
export function ReplaceGuardDialog({
  intent,
  saving,
  onCancel,
  onSaveAndContinue,
  onDiscard,
}: ReplaceGuardDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => cancelRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div
      className="help-backdrop"
      onPointerDown={(event) => {
        if (!saving && event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="replace-guard-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-guard-title"
        onKeyDown={(event) => {
          if (!saving && event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      >
        <div className="replace-guard-lede">
          <span className="replace-guard-glyph" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="20" height="20">
              <path
                d="M10 3.2 18 17H2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <line
                x1="10"
                y1="8.4"
                x2="10"
                y2="12.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="10" cy="14.6" r="0.9" fill="currentColor" />
            </svg>
          </span>
          <div className="replace-guard-copy">
            <h2 id="replace-guard-title">有未保存的更改</h2>
            <p>
              继续<strong>{intent}</strong>会丢弃最新编辑。
            </p>
            <p className="replace-guard-hint">
              “保存”会将此项目保存在云项目中（最多 3
              个）。若希望保存为文件，请使用
              <strong>文件 → 导出项目文件…</strong>下载{" "}
              <code>.icproj.json</code>。
            </p>
          </div>
        </div>
        <div className="replace-guard-actions">
          <button
            type="button"
            className="replace-guard-discard"
            onClick={onDiscard}
            disabled={saving}
          >
            不保存并继续
          </button>
          <button
            type="button"
            className="replace-guard-stay"
            ref={cancelRef}
            onClick={onCancel}
            disabled={saving}
          >
            留在此处
          </button>
          <button
            type="button"
            className="replace-guard-save"
            onClick={onSaveAndContinue}
            disabled={saving}
          >
            {saving ? "正在保存到云端…" : "保存到云端并继续"}
          </button>
        </div>
      </section>
    </div>
  );
}
