import type { ComponentType } from "react";

import { REFRESH_RESTORE_STORAGE_KEY } from "../document/use-project-file-lifecycle";

export interface ChunkLoadFallbackProps {
  onClose?: () => void;
  onCancel?: () => void;
}

export function refreshWithRestore(): void {
  try {
    // The recovery coordinator flushes on pagehide, so the snapshot survives
    // this reload; the flag lets the refreshed page restore it automatically.
    window.sessionStorage.setItem(REFRESH_RESTORE_STORAGE_KEY, "true");
  } catch {
    // Without sessionStorage the reload still recovers via the manual banner.
  }
  window.location.reload();
}

/**
 * Stands in for a lazily loaded dialog or panel whose chunk failed to load —
 * typically a tab that stayed open across a redeploy (its content-hashed
 * chunk names no longer exist on the server) or an offline PWA opening a
 * surface it never cached. The failure must stay scoped to the dialog: the
 * schematic keeps running, and the remedy is a refresh that restores the
 * current work, not the whole-editor crash screen.
 */
export function createChunkLoadFallback(
  variant: "dialog" | "inline",
  error: unknown,
): ComponentType<ChunkLoadFallbackProps> {
  const detail = error instanceof Error ? error.message : String(error);
  if (variant === "inline") {
    return function ChunkLoadFallbackSection() {
      return (
        <section
          className="chunk-load-fallback-inline"
          role="alert"
          data-testid="section-chunk-load-fallback"
        >
          <p>
            无法加载此面板。应用可能在打开本页面后更新；请刷新以加载新版本，当前电路会自动恢复。
          </p>
          <button type="button" onClick={refreshWithRestore}>
            刷新应用
          </button>
        </section>
      );
    };
  }
  return function ChunkLoadFallbackDialog({
    onClose,
    onCancel,
  }: ChunkLoadFallbackProps) {
    const close = onClose ?? onCancel;
    return (
      <div
        className="insert-dialog-backdrop"
        role="presentation"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) close?.();
        }}
      >
        <section
          className="editor-action-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="chunk-load-fallback-title"
          data-testid="dialog-chunk-load-fallback"
        >
          <header className="editor-action-dialog-header">
            <p>对话框不可用</p>
            <h2 id="chunk-load-fallback-title">无法加载此对话框</h2>
          </header>
          <div className="editor-action-dialog-body">
            <p>
              应用可能在打开本页面后更新，或浏览器已离线。当前电路不受影响。刷新以加载新版本，当前工作会自动恢复。
            </p>
            <p>
              <code>{detail}</code>
            </p>
          </div>
          <footer className="editor-action-dialog-actions">
            {close ? (
              <button type="button" onClick={() => close()}>
                关闭
              </button>
            ) : null}
            <button
              type="button"
              className="primary"
              onClick={refreshWithRestore}
            >
              刷新应用
            </button>
          </footer>
        </section>
      </div>
    );
  };
}

/**
 * Dismissible banner for a failed on-demand chunk outside any dialog —
 * an export command whose module vanished under a redeploy. Same remedy as
 * every chunk failure: refresh, with the current circuit restored.
 */
export function ChunkLoadBanner({
  feature,
  onDismiss,
}: {
  feature: string;
  onDismiss: () => void;
}) {
  return (
    <aside
      className="recovery-banner recovery-banner-warning"
      data-testid="chunk-load-banner"
      role="alert"
      aria-label="功能加载失败"
    >
      <p>
        {feature}{" "}
        无法加载。应用已在打开本页面后更新。请刷新以加载新版本，当前电路会自动恢复。
      </p>
      <div>
        <button type="button" onClick={refreshWithRestore}>
          刷新应用
        </button>
        <button type="button" onClick={onDismiss}>
          暂不
        </button>
      </div>
    </aside>
  );
}
