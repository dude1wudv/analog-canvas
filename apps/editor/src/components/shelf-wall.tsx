import { useCallback, useEffect, useState } from "react";
import { TilePreview } from "./tile-preview";

import {
  CLOUD_PROJECT_LIMIT,
  cloudProjectPreviewUrl,
  deleteCloudProject,
  listCloudProjects,
  type CloudProjectSummary,
} from "../features/editor-shell/cloud-projects";
import { Masonry } from "./masonry";

/**
 * "My shelf": a member's own saved circuits as a wall rather than a list of
 * names in a menu. Every tile is private — the worker scopes both the listing
 * and each thumbnail to the signed-in account — so the shelf is a personal
 * corner of the same server the community gallery lives on.
 */

export type ShelfState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "unreachable"; message: string }
  | { status: "ready"; projects: readonly CloudProjectSummary[] };

export async function loadShelf(
  fetchLike: typeof fetch = fetch,
): Promise<ShelfState> {
  const outcome = await listCloudProjects(fetchLike);
  if (outcome.status === "listed") {
    return { status: "ready", projects: outcome.projects };
  }
  if (outcome.status === "signed-out") return { status: "signed-out" };
  return { status: "unreachable", message: outcome.message };
}

/** Opening a shelf tile hands the id to the editor, which loads the Project. */
export function shelfProjectHref(projectId: string): string {
  return `/editor?project=${encodeURIComponent(projectId)}`;
}

function formatUpdatedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ShelfWall() {
  const [state, setState] = useState<ShelfState>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    void loadShelf().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refresh(), [refresh]);

  async function removeProject(project: CloudProjectSummary): Promise<void> {
    const confirmed = window.confirm(
      `Delete “${project.name}” from your shelf? This cannot be undone.`,
    );
    if (!confirmed) return;
    setBusyId(project.id);
    const outcome = await deleteCloudProject(project.id);
    setBusyId(null);
    if (outcome.status === "deleted") {
      setState({ status: "ready", projects: outcome.projects });
    }
  }

  if (state.status === "loading") {
    return (
      <p className="gallery-status" data-testid="shelf-loading">
        Loading your shelf…
      </p>
    );
  }

  if (state.status === "signed-out") {
    return (
      <p className="gallery-status" data-testid="shelf-signed-out">
        登录后即可使用自己的收藏架。保存在这里的电路仅你的账户可见，直到你将其发布到画廊。
      </p>
    );
  }

  if (state.status === "unreachable") {
    return (
      <p className="gallery-status" data-testid="shelf-unreachable">
        无法访问收藏架：{state.message}
      </p>
    );
  }

  if (state.projects.length === 0) {
    return (
      <p className="gallery-status" data-testid="shelf-empty">
        收藏架为空。请打开<a href="/editor">编辑器</a>绘制内容，然后使用“文件 →
        保存”将其保存在这里。
      </p>
    );
  }

  return (
    <section className="gallery-wall" data-testid="shelf-wall">
      <p className="shelf-count" data-testid="shelf-count">
        已保存 {state.projects.length} / {CLOUD_PROJECT_LIMIT} 个 · 仅你可见
      </p>
      <Masonry
        aria-label="收藏架上的电路"
        items={state.projects.map((project) => ({
          key: project.id,
          node: (
            <div className="gallery-tile-wrap">
              <a
                className="gallery-tile"
                href={shelfProjectHref(project.id)}
                data-testid={`shelf-tile-${project.id}`}
              >
                <TilePreview
                  key={`${project.id}-${project.revision}`}
                  src={cloudProjectPreviewUrl(project.id, project.revision)}
                  alt={`Preview of ${project.name}`}
                />
                <span className="gallery-tile-copy">
                  <span className="gallery-tile-name">{project.name}</span>
                  <span className="gallery-tile-meta">
                    <time dateTime={project.updatedAt}>
                      {formatUpdatedAt(project.updatedAt)}
                    </time>
                    {" · "}
                    <span className="shelf-tile-revision">
                      revision {project.revision}
                    </span>
                  </span>
                </span>
              </a>
              <button
                type="button"
                className="shelf-tile-delete"
                data-testid={`shelf-delete-${project.id}`}
                aria-label={`Delete ${project.name} from your shelf`}
                disabled={busyId === project.id}
                onClick={() => void removeProject(project)}
              >
                删除
              </button>
            </div>
          ),
        }))}
      />
    </section>
  );
}
