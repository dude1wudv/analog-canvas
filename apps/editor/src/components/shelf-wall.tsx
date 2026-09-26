import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TilePreview } from "./tile-preview";
import { InlineConfirm } from "./inline-confirm";

import {
  CLOUD_PROJECT_LIMIT,
  cloudProjectPreviewUrl,
  deleteCloudProject,
  editShelfProject,
  openCloudProject,
  setShelfFavorite,
  listCloudProjects,
  saveCloudProject,
  type CloudProjectSummary,
} from "../features/editor-shell/cloud-projects";
import { parseProject } from "@icm/project-protocol";
import {
  VersionHistoryDialog,
  type VersionHistorySource,
} from "./version-history-dialog";
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
  const [history, setHistory] = useState<CloudProjectSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    project: CloudProjectSummary;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !menuButtonRef.current?.contains(event.target as Node)
      )
        setMenu(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);
  const showMenu = (project: CloudProjectSummary, x: number, y: number) => {
    setMenu({
      project,
      x: Math.max(8, Math.min(x, window.innerWidth - 220)),
      y: Math.max(8, Math.min(y, window.innerHeight - 290)),
    });
  };
  const replaceSummary = (project: CloudProjectSummary) =>
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            projects: [
              project,
              ...current.projects.filter((item) => item.id !== project.id),
            ],
          }
        : current,
    );

  const historySource = useMemo<VersionHistorySource | undefined>(() => {
    if (!history) return undefined;
    const endpoint = `/api/projects/${encodeURIComponent(history.id)}`;
    let revision = history.revision;
    return {
      currentLabel: "Current draft",
      async loadVersions() {
        const response = await fetch(`${endpoint}/versions`, {
          credentials: "same-origin",
        });
        if (!response.ok) return null;
        const result = await response.json();
        revision = result.revision;
        return result.versions;
      },
      async loadProject(versionId) {
        const response = await fetch(
          versionId
            ? `${endpoint}/versions/${encodeURIComponent(versionId)}/project`
            : endpoint,
          { credentials: "same-origin" },
        );
        if (!response.ok) throw new Error("Could not load this draft version.");
        const result = await response.json();
        return parseProject(
          versionId ? result.projectText : result.project.projectText,
        );
      },
      previewUrl: (versionId) =>
        `${endpoint}/versions/${encodeURIComponent(versionId)}/preview.svg`,
      async restore(versionId) {
        const response = await fetch(
          `${endpoint}/versions/${encodeURIComponent(versionId)}/restore`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: { "If-Match": `revision-${revision}` },
          },
        );
        if (!response.ok)
          throw new Error(
            response.status === 409
              ? "This draft changed elsewhere. Reopen history before restoring; no changes were overwritten."
              : "Could not restore this draft version. Try again.",
          );
      },
      async branch(project) {
        const result = await saveCloudProject(project, null);
        if (result.status !== "saved")
          throw new Error(
            `Could not create a Shelf branch (${result.status}).`,
          );
        replaceSummary(result.project);
        setHistory(null);
        return true;
      },
    };
  }, [history]);

  async function act(
    project: CloudProjectSummary,
    action: "duplicate" | "rename" | "export" | "favorite",
    renamed?: string,
  ) {
    setMenu(null);
    if (busyId) return;
    const name = renamed?.trim();
    if (action === "rename" && (!name || name === project.name)) {
      setRenaming(null);
      return;
    }
    setBusyId(project.id);
    setError(null);
    try {
      if (action === "favorite") {
        replaceSummary(await setShelfFavorite(project.id, !project.favorite));
      } else if (action === "export") {
        const loaded = await openCloudProject(project.id);
        if (loaded.status !== "opened")
          throw new Error("Could not load the Project for export. Try again.");
        const url = URL.createObjectURL(
          new Blob([loaded.project.projectText], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `${loaded.project.name.replace(/[\\/:*?"<>|]/gu, "_")}.icproj.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const result = await editShelfProject(
          project.id,
          action === "rename"
            ? { kind: "rename", name: name! }
            : { kind: "duplicate" },
        );
        if (result.status === "saved") {
          replaceSummary(result.project);
          setRenaming(null);
          if (action === "rename")
            requestAnimationFrame(() => menuButtonRef.current?.focus());
        } else
          throw new Error(
            result.status === "conflict"
              ? "This Project changed in another tab. Refresh your shelf and try again; no changes were overwritten."
              : result.status === "limit"
                ? `Your shelf has reached its ${CLOUD_PROJECT_LIMIT}-Project limit. Export or remove a Project before duplicating.`
                : result.status === "rejected" ||
                    result.status === "unreachable"
                  ? result.message
                  : `Could not ${action} this Project (${result.status}).`,
          );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not complete this action. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

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
    if (busyId) return;
    setBusyId(project.id);
    const outcome = await deleteCloudProject(project.id);
    setBusyId(null);
    if (outcome.status === "deleted") {
      setState({ status: "ready", projects: outcome.projects });
    } else {
      setError(outcome.message);
      throw new Error(outcome.message);
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
      {error ? (
        <p role="alert" className="shelf-action-error">
          {error}
        </p>
      ) : null}
      <p className="shelf-count" data-testid="shelf-count">
        已保存 {state.projects.length} / {CLOUD_PROJECT_LIMIT} 个 · 仅你可见
      </p>
      <Masonry
        aria-label="收藏架上的电路"
        items={[...state.projects]
          .sort(
            (a, b) =>
              Number(!!b.favorite) - Number(!!a.favorite) ||
              b.updatedAt.localeCompare(a.updatedAt) ||
              a.id.localeCompare(b.id),
          )
          .map((project) => ({
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
                    <span className="gallery-tile-name">
                      {project.favorite ? (
                        <span aria-label="Favorite">★ </span>
                      ) : null}
                      {project.name}
                    </span>
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
                  className="shelf-tile-actions"
                  aria-label={`Actions for ${project.name}`}
                  aria-haspopup="menu"
                  aria-expanded={menu?.project.id === project.id}
                  data-testid={`shelf-actions-${project.id}`}
                  disabled={busyId !== null}
                  onClick={(event) => {
                    menuButtonRef.current = event.currentTarget;
                    if (menu?.project.id === project.id) {
                      setMenu(null);
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    showMenu(project, rect.left, rect.bottom);
                  }}
                >
                  •••
                </button>
                {renaming?.id === project.id ? (
                  <form
                    className="shelf-rename-form"
                    autoComplete="off"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void act(project, "rename", renaming.name);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && busyId === null) {
                        event.preventDefault();
                        setRenaming(null);
                        menuButtonRef.current?.focus();
                      }
                    }}
                  >
                    <input
                      aria-label="Project name"
                      autoComplete="off"
                      autoFocus
                      maxLength={120}
                      value={renaming.name}
                      disabled={busyId !== null}
                      onChange={(event) =>
                        setRenaming({
                          id: project.id,
                          name: event.target.value,
                        })
                      }
                    />
                    <button
                      type="submit"
                      disabled={busyId !== null || !renaming.name.trim()}
                    >
                      Save name
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => {
                        setRenaming(null);
                        menuButtonRef.current?.focus();
                      }}
                    >
                      Keep it
                    </button>
                  </form>
                ) : null}
                <InlineConfirm
                  className="shelf-tile-delete"
                  data-testid={`shelf-delete-${project.id}`}
                  aria-label={`Delete ${project.name} from your shelf`}
                  disabled={busyId !== null}
                  onConfirm={() => removeProject(project)}
                >
                  删除
                </InlineConfirm>
              </div>
            ),
          }))}
      />
      {history && historySource ? (
        <VersionHistoryDialog
          entryId={history.id}
          entryName={history.name}
          source={historySource}
          onClose={() => setHistory(null)}
          onRestored={() => {
            setHistory(null);
            void refresh();
          }}
        />
      ) : null}
      {menu ? (
        <div
          className="shelf-context-menu"
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${menu.project.name}`}
          style={{ left: menu.x, top: menu.y }}
          onKeyDown={(event) => {
            const items = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                '[role="menuitem"]',
              ),
            ];
            const index = items.indexOf(document.activeElement as HTMLElement);
            const next =
              event.key === "ArrowDown"
                ? (index + 1) % items.length
                : event.key === "ArrowUp"
                  ? (index + items.length - 1) % items.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : null;
            if (next !== null) {
              event.preventDefault();
              items[next]?.focus();
            }
          }}
        >
          <a
            role="menuitem"
            href={shelfProjectHref(menu.project.id)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenu(null)}
          >
            Open in new tab
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setHistory(menu.project);
              setMenu(null);
            }}
          >
            Version history
          </button>
          <button
            role="menuitem"
            type="button"
            disabled={busyId !== null}
            onClick={() => void act(menu.project, "duplicate")}
          >
            Duplicate
          </button>
          <button
            role="menuitem"
            type="button"
            disabled={busyId !== null}
            onClick={() => {
              setRenaming({ id: menu.project.id, name: menu.project.name });
              setMenu(null);
            }}
          >
            Rename
          </button>
          <button
            role="menuitem"
            type="button"
            disabled={busyId !== null}
            onClick={() => void act(menu.project, "export")}
          >
            Export
          </button>
          <button
            role="menuitem"
            type="button"
            disabled={busyId !== null}
            onClick={() => void act(menu.project, "favorite")}
          >
            {menu.project.favorite ? "Remove favorite" : "Favorite"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
