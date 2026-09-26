import { useEffect, useRef, useState } from "react";
import type { CircuitProject } from "@icm/model";
import {
  branchGalleryVersion,
  galleryVersionBranchUrl,
  loadGalleryVersionProject,
} from "./gallery-version-project";
import { VersionHistoryComparison } from "./version-history-comparison";

import { announceGalleryChange } from "../gallery-client";

/**
 * Version history of one gallery entry, for reviewers and the entry's
 * owner: every update snapshotted the previous state; Restore adopts a
 * version after snapshotting the current one, so restores are themselves
 * reversible. Access remains restricted to owners and reviewers.
 */

export interface GalleryEntryVersion {
  versionId: string;
  versionNo: number;
  name: string;
  author: string;
  tags: string[];
  createdAt: string;
}

export async function loadEntryVersions(
  entryId: string,
  fetchLike: typeof fetch = fetch,
): Promise<GalleryEntryVersion[] | null> {
  try {
    const response = await fetchLike(`/api/gallery/${entryId}/versions`, {
      credentials: "same-origin",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      versions?: GalleryEntryVersion[];
    };
    return payload.versions ?? [];
  } catch {
    return null;
  }
}

async function restoreVersion(
  entryId: string,
  versionId: string,
  fetchLike: typeof fetch = fetch,
): Promise<{ previewRevision?: string } | null> {
  try {
    const response = await fetchLike(
      `/api/gallery/${entryId}/versions/${versionId}/restore`,
      { method: "POST", credentials: "same-origin" },
    );
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as {
      previewRevision?: unknown;
    } | null;
    const previewRevision =
      typeof payload?.previewRevision === "string" &&
      payload.previewRevision.length > 0
        ? payload.previewRevision
        : undefined;
    const restored = {
      ...(previewRevision === undefined ? {} : { previewRevision }),
    };
    announceGalleryChange({ entryId, ...restored });
    return restored;
  } catch {
    return null;
  }
}

/** Storage-specific operations keep one history UI for public and private work. */
export interface VersionHistorySource {
  currentLabel: string;
  loadVersions(): Promise<GalleryEntryVersion[] | null>;
  loadProject(versionId?: string): Promise<CircuitProject>;
  previewUrl(versionId: string): string;
  restore(versionId: string): Promise<void>;
  branch(project: CircuitProject): Promise<boolean>;
}

export interface VersionHistoryDialogProps {
  source?: VersionHistorySource;
  entryId: string;
  entryName: string;
  onRestored(result: { previewRevision?: string }): void;
  onClose(): void;
  onBranch?(project: CircuitProject): Promise<boolean>;
}

export function VersionHistoryDialog({
  entryId,
  entryName,
  onRestored,
  onClose,
  onBranch,
  source,
}: VersionHistoryDialogProps) {
  const modal = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const [versions, setVersions] = useState<GalleryEntryVersion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [comparison, setComparison] = useState<{
    versionNo: number;
    before: CircuitProject;
    after: CircuitProject;
  } | null>(null);
  useEffect(() => {
    const dialog = modal.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  useEffect(() => {
    const request = ++generation.current;
    setVersions(null);
    setComparison(null);
    setError(null);
    void (
      source
        ? source.loadVersions().catch(() => null)
        : loadEntryVersions(entryId)
    ).then((loaded) => {
      if (request !== generation.current) return;
      setVersions(loaded);
      if (!loaded)
        setError("Could not load history. Sign in as the owner or try again.");
    });
    return () => {
      generation.current += 1;
    };
  }, [entryId, retry, source]);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    const request = generation.current;
    try {
      await action();
    } catch (error) {
      if (request === generation.current)
        setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  async function compare(version: GalleryEntryVersion) {
    const request = generation.current;
    const [before, after] = await Promise.all([
      source
        ? source.loadProject(version.versionId)
        : loadGalleryVersionProject(entryId, version.versionId),
      source ? source.loadProject() : loadGalleryVersionProject(entryId),
    ]);
    if (request === generation.current)
      setComparison({ versionNo: version.versionNo, before, after });
  }
  async function branch(version: GalleryEntryVersion) {
    const request = generation.current;
    const project = await (source
      ? source.loadProject(version.versionId)
      : loadGalleryVersionProject(entryId, version.versionId));
    if (request !== generation.current) return;
    await (source?.branch ?? onBranch)?.(
      branchGalleryVersion(project, version.versionNo),
    );
  }
  async function restore(versionId: string) {
    const request = generation.current;
    const result = source
      ? await source.restore(versionId).then(() => ({}))
      : await restoreVersion(entryId, versionId);
    if (request !== generation.current) return;
    if (result) onRestored(result);
    else
      throw new Error(
        "Could not restore this version. It may no longer be available.",
      );
  }

  return (
    <dialog
      ref={modal}
      aria-labelledby="version-history-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="version-history-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={`version-history-dialog${comparison ? " is-comparing" : ""}`}
        data-testid="version-history-dialog"
      >
        <header className="version-history-header">
          <p>
            最近 3 个历史版本 · {source ? "当前草稿" : "当前发布作品"}单独保留
          </p>
          <h2 id="version-history-title">版本历史 — {entryName}</h2>
          <button
            type="button"
            className="version-history-dismiss"
            aria-label="关闭版本历史"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {versions === null && !error ? (
          <p className="version-history-note">正在加载历史记录…</p>
        ) : versions?.length === 0 ? (
          <p className="version-history-note" data-testid="version-empty">
            暂无较早的版本——首次更新后才会产生历史记录。
          </p>
        ) : (
          <div className="version-list">
            {versions?.map((version) => (
              <article
                key={version.versionId}
                className="version-row"
                data-testid={`version-${version.versionNo}`}
              >
                <img
                  src={
                    source
                      ? source.previewUrl(version.versionId)
                      : `/api/gallery/${entryId}/versions/${version.versionId}/preview.svg`
                  }
                  alt={`版本 ${version.versionNo} 预览`}
                  loading="lazy"
                />
                <div className="version-copy">
                  <b>
                    v{version.versionNo} · {version.name}
                  </b>
                  <small>
                    {version.author ? `${version.author} · ` : ""}
                    {new Date(version.createdAt).toLocaleString()}
                    {version.tags.length > 0
                      ? ` · ${version.tags.join(", ")}`
                      : ""}
                  </small>
                </div>
                <div className="version-row-actions">
                  <button
                    type="button"
                    disabled={busy}
                    data-testid={`version-compare-${version.versionNo}`}
                    onClick={() => void run(() => compare(version))}
                  >
                    比较
                  </button>
                  {onBranch || source ? (
                    <button
                      type="button"
                      disabled={busy}
                      data-testid={`version-branch-${version.versionNo}`}
                      onClick={() => void run(() => branch(version))}
                    >
                      创建分支
                    </button>
                  ) : (
                    <a
                      data-testid={`version-branch-${version.versionNo}`}
                      href={galleryVersionBranchUrl(
                        entryId,
                        version.versionId,
                        version.versionNo,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      创建分支 ↗
                    </a>
                  )}
                  <button
                    type="button"
                    className="version-history-primary"
                    data-testid={`version-restore-${version.versionNo}`}
                    disabled={busy}
                    onClick={() => void run(() => restore(version.versionId))}
                  >
                    恢复
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {comparison ? (
          <section aria-label={`比较版本 ${comparison.versionNo}`}>
            <h3>
              v{comparison.versionNo} → {source?.currentLabel ?? "当前发布作品"}
            </h3>
            <VersionHistoryComparison
              key={comparison.versionNo}
              before={comparison.before}
              after={comparison.after}
            />
          </section>
        ) : null}
        {error ? (
          <p role="alert" className="version-history-error">
            {error}{" "}
            {versions === null ? (
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                重试
              </button>
            ) : null}
          </p>
        ) : null}
        <div className="version-history-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            关闭
          </button>
        </div>
      </section>
    </dialog>
  );
}
