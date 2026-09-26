import { useEffect, useRef } from "react";

import type {
  BrowserRecoveryGeneration,
  BrowserRecoverySource,
} from "../document/browser-recovery-contract";
import type { RecoverySessionSummary } from "../document/recovery-coordinator";

export interface RecentRecoveryDialogProps {
  sessions: RecoverySessionSummary[];
  onRestore(workingCopyId: string, generation: BrowserRecoveryGeneration): void;
  onDownloadBackup(
    workingCopyId: string,
    generation: BrowserRecoveryGeneration,
  ): void;
  onDeleteSession(workingCopyId: string): void;
  onClose(): void;
}

type ReviewStatus = "valid" | "corrupt" | "unsupported-schema" | "absent";

function reviewStatus(
  summary: RecoverySessionSummary,
  generation: BrowserRecoveryGeneration,
): ReviewStatus {
  const record = generation === "latest" ? summary.latest : summary.previous;
  if (record === null) return "absent";
  return record.review;
}

function reviewLabel(status: ReviewStatus): string {
  switch (status) {
    case "valid":
      return "Restorable";
    case "corrupt":
      return "Damaged";
    case "unsupported-schema":
      return "Newer Project schema";
    case "absent":
      return "None";
  }
}

function generationLine(
  summary: RecoverySessionSummary,
  generation: BrowserRecoveryGeneration,
): string {
  const record = generation === "latest" ? summary.latest : summary.previous;
  const label = reviewLabel(reviewStatus(summary, generation));
  if (
    record !== null &&
    record.review === "valid" &&
    record.revision !== null
  ) {
    return `${label} · revision ${record.revision}`;
  }
  return label;
}

const SOURCE_LABELS: Record<BrowserRecoverySource, string> = {
  new: "新建项目",
  "opened-file": "已打开文件",
  "spice-import": "SPICE 导入",
  "cloud-project": "云项目",
  recovered: "较早的恢复记录",
};

/**
 * Pick the generation Restore installs: the newest valid one. A damaged
 * latest offers the previous generation; an incompatible schema is never
 * installable, only downloadable.
 */
export function restorableGeneration(
  summary: RecoverySessionSummary,
): BrowserRecoveryGeneration | null {
  if (reviewStatus(summary, "latest") === "valid") return "latest";
  if (reviewStatus(summary, "previous") === "valid") return "previous";
  return null;
}

export function downloadableGeneration(
  summary: RecoverySessionSummary,
): BrowserRecoveryGeneration | null {
  const latest = reviewStatus(summary, "latest");
  if (latest === "valid" || latest === "unsupported-schema") return "latest";
  const previous = reviewStatus(summary, "previous");
  if (previous === "valid" || previous === "unsupported-schema") {
    return "previous";
  }
  return null;
}

export function RecentRecoveryDialog({
  sessions,
  onRestore,
  onDownloadBackup,
  onDeleteSession,
  onClose,
}: RecentRecoveryDialogProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="help-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-recovery-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <header className="help-dialog-header">
          <div>
            <p className="help-kicker">浏览器安全副本</p>
            <h2 id="recent-recovery-title">恢复最近工作</h2>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="关闭最近工作恢复"
          >
            关闭
          </button>
        </header>
        <div className="help-dialog-content">
          <p>
            这些副本仅保存在此浏览器中，不是正式的项目存档。请保存到云端或下载备份以长期保存。
          </p>
          <ul className="recovery-session-list">
            {sessions.map((session) => {
              const restorable = restorableGeneration(session);
              const downloadable = downloadableGeneration(session);
              const latestStatus = reviewStatus(session, "latest");
              const previousStatus = reviewStatus(session, "previous");
              return (
                <li
                  key={session.workingCopyId}
                  className="recovery-session-card"
                  data-testid="recovery-session-card"
                >
                  <div className="recovery-session-heading">
                    <strong>{session.projectName}</strong>
                    <span className="recovery-session-meta">
                      {SOURCE_LABELS[session.source]} ·{" "}
                      {new Date(session.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <dl className="recovery-generation-list">
                    <div>
                      <dt>最新副本</dt>
                      <dd>{generationLine(session, "latest")}</dd>
                    </div>
                    <div>
                      <dt>上一份副本</dt>
                      <dd>{generationLine(session, "previous")}</dd>
                    </div>
                  </dl>
                  {restorable === null ? (
                    <p className="recovery-session-note">
                      {latestStatus === "unsupported-schema" ||
                      previousStatus === "unsupported-schema"
                        ? "This copy uses a newer Project schema and cannot be restored here, but you can download it."
                        : "This copy is damaged and cannot be restored."}
                    </p>
                  ) : null}
                  <div className="recovery-session-actions">
                    <button
                      type="button"
                      disabled={restorable === null}
                      onClick={() => {
                        if (restorable !== null) {
                          onRestore(session.workingCopyId, restorable);
                        }
                      }}
                      aria-label={
                        restorable === "previous"
                          ? `Restore previous copy of ${session.projectName}`
                          : `Restore ${session.projectName}`
                      }
                    >
                      恢复
                      {restorable === "previous" ? "上一份副本" : ""}
                    </button>
                    <button
                      type="button"
                      disabled={downloadable === null}
                      onClick={() => {
                        if (downloadable !== null) {
                          onDownloadBackup(session.workingCopyId, downloadable);
                        }
                      }}
                      aria-label={`下载 ${session.projectName} 的备份`}
                    >
                      下载备份
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.workingCopyId)}
                      aria-label={`删除 ${session.projectName} 的恢复副本`}
                    >
                      删除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
