import { useLayoutEffect, useRef } from "react";
import type { RecoveryState } from "../document/recovery-coordinator";

export interface RecoveryFailureBannerProps {
  state: RecoveryState;
  onDownload(): void;
  onDismiss(): void;
}

export interface RecoveryAvailableBannerProps {
  projectName: string;
  updatedAt: string;
  onRestore(): void;
  onDownload(): void;
  onDismiss(): void;
}

/** Follow the actual toolbar, including wrapped controls and project tabs. */
function useRecoveryBannerPosition() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const chrome = document.querySelector(".app-chrome");
    if (!chrome) return;
    const update = () => {
      if (ref.current)
        ref.current.style.top = `${chrome.getBoundingClientRect().bottom + 8}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(chrome);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return ref;
}

function failureMessage(state: RecoveryState): string {
  switch (state) {
    case "quota-exceeded":
      return "此网站的浏览器存储空间已满，无法保存新的恢复副本。";
    case "unavailable":
      return "浏览器存储不可用，无法保存恢复副本。";
    default:
      return "无法保存最新的恢复副本。";
  }
}

/**
 * Persistent, dismissible warning that recovery writes are failing, with a
 * direct download so the user can secure the current Project immediately.
 */
export function RecoveryFailureBanner({
  state,
  onDownload,
  onDismiss,
}: RecoveryFailureBannerProps) {
  const ref = useRecoveryBannerPosition();
  return (
    <aside
      ref={ref}
      className="recovery-banner recovery-banner-warning"
      data-testid="recovery-failure-banner"
      role="alert"
      aria-label="恢复存储出现问题"
    >
      <p>{failureMessage(state)}请下载项目以保护当前工作。</p>
      <div className="recovery-banner-actions">
        <button type="button" onClick={onDownload}>
          下载备份
        </button>
        <button type="button" onClick={onDismiss} aria-label="关闭警告">
          关闭
        </button>
      </div>
    </aside>
  );
}

/** Non-modal startup offer for a newer, explicitly unsaved working copy. */
export function RecoveryAvailableBanner({
  projectName,
  updatedAt,
  onRestore,
  onDownload,
  onDismiss,
}: RecoveryAvailableBannerProps) {
  const ref = useRecoveryBannerPosition();
  return (
    <aside
      ref={ref}
      className="recovery-banner"
      data-testid="startup-recovery-banner"
      aria-label="存在未保存的恢复数据"
    >
      <p>
        <strong>{projectName}</strong> 的未保存内容已从{" "}
        <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString()}</time>
        的副本中恢复。
      </p>
      <div className="recovery-banner-actions">
        <button type="button" onClick={onRestore}>
          恢复
        </button>
        <button type="button" onClick={onDownload}>
          下载备份
        </button>
        <button type="button" onClick={onDismiss}>
          忽略
        </button>
      </div>
    </aside>
  );
}

/** Concise statusbar label derived from coordinator recovery state. */
export function recoveryStateLabel(state: RecoveryState): string | null {
  switch (state) {
    case "idle":
    case "pending":
    case "stored":
      return null;
    case "quota-exceeded":
      return "恢复存储已满，请立即下载";
    case "unavailable":
      return "恢复存储不可用，请立即下载";
    case "failed":
      return "恢复失败，请立即下载";
  }
}
