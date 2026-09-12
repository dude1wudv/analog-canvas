import {
  createContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import type { ArtifactRef } from "@icm/simulation-service/contract";
import {
  SimulationFileTree,
  type SimulationFolderTreeProps,
} from "./simulation-file-tree";
import {
  useWorkspaceInteractions,
  type WorkspaceMenuItem,
} from "./workspace-interactions";
import {
  formatSimulationArtifactPreview,
  type SimulationArtifactContent,
} from "./simulation-artifact-files";

export const CodeDocumentActions = createContext<HTMLElement | null>(null);

export interface SimulationCodeFile {
  path: string;
  kind: "authored" | "generated" | "prepared";
  dirty?: boolean;
  draft?: boolean;
}
export interface SimulationExplorerArtifactGroup {
  key: "prepare" | "run";
  label: string;
  description: string;
  artifacts: readonly ArtifactRef[];
}
export type SimulationExplorerSelection =
  | { kind: "source"; folderId: string; path: string }
  | { kind: "artifact"; groupKey: "prepare" | "run"; artifact: ArtifactRef };
export interface SimulationCodeWorkspaceProps {
  workspaceKey: string;
  files: readonly SimulationCodeFile[];
  entryPath: string;
  configPath: string;
  activePath: string;
  onSelectFile(path: string, folderId?: string): void;
  onNewFile?(folderId?: string): void;
  onCopyFile?(path: string, folderId?: string): void;
  onExportFile?(path: string, folderId?: string): void;
  onFileAction?(
    action: "rename" | "delete" | "entry" | "discard",
    path: string,
    folderId?: string,
  ): void;
  artifactGroups?: readonly SimulationExplorerArtifactGroup[];
  artifactPreview?: SimulationArtifactContent | undefined;
  artifactBusy?: string | undefined;
  onSelectArtifact?(artifact: ArtifactRef): void;
  onCloseArtifact?(): void;
  onDownloadArtifact?(artifact: ArtifactRef): void;
  onDownloadSelection?(
    selection: readonly SimulationExplorerSelection[],
    archive?: boolean,
  ): void;
  folders?:
    Omit<SimulationFolderTreeProps, "renderFiles" | "onNewFile"> | undefined;
  additionalActions?: WorkspaceMenuItem[];
  children: ReactNode;
  actions: ReactNode;
  toolbarEnd?: ReactNode;
  status?: ReactNode;
  console: ReactNode;
  results: ReactNode;
  outputActions?: ReactNode;
  outputPane: "console" | "plot" | "operating-point" | "compare";
  onSelectOutputPane(pane: SimulationCodeWorkspaceProps["outputPane"]): void;
  maximized?: boolean;
  onToggleMaximize?(): void;
}

/** Approved Code layout only; Project, drafts and Run ownership remain in their controllers. */
export function SimulationCodeWorkspace(props: SimulationCodeWorkspaceProps) {
  const [documentActions, setDocumentActions] = useState<HTMLDivElement | null>(
    null,
  );
  const ui = useWorkspaceInteractions();
  const filesId = useId();
  const defaults = () =>
    props.files
      .filter((f) => f.kind === "generated" || f.path === props.entryPath)
      .map((f) => f.path);
  const [filesOpen, setFilesOpen] = useState(Boolean(props.folders));
  const [views, setViews] = useState<Record<string, string[]>>({});
  const opened = views[props.workspaceKey] ?? defaults();
  const setOpened = (update: string[] | ((paths: string[]) => string[])) =>
    setViews((current) => ({
      ...current,
      [props.workspaceKey]:
        typeof update === "function"
          ? update(current[props.workspaceKey] ?? defaults())
          : update,
    }));
  const [filesWidth, setFilesWidth] = useState(() => {
    try {
      return Math.max(
        110,
        Math.min(
          420,
          Number(localStorage.getItem("icm.code.files-width")) || 240,
        ),
      );
    } catch {
      return 240;
    }
  });
  const [resultsHeight, setResultsHeight] = useState(38);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (props.activePath)
      setOpened((paths) =>
        paths.includes(props.activePath) ? paths : [...paths, props.activePath],
      );
  }, [props.activePath, props.workspaceKey]);
  useEffect(() => {
    if (ui.edit) setFilesOpen(true);
  }, [ui.edit]);
  useEffect(() => {
    try {
      localStorage.setItem("icm.code.files-width", String(filesWidth));
    } catch {
      /* Optional layout preference. */
    }
  }, [filesWidth]);
  const tabs = opened.filter((path) =>
    props.files.some((file) => file.path === path),
  );
  const openFile = (path: string, folderId?: string) => {
    if (!folderId || folderId === props.folders?.activeId)
      setOpened((paths) => (paths.includes(path) ? paths : [...paths, path]));
    props.onCloseArtifact?.();
    props.onSelectFile(path, folderId);
    ui.closeMenu();
  };
  const closeFile = (path: string) => {
    const next = tabs.filter((item) => item !== path);
    setOpened(next);
    if (props.activePath === path) props.onSelectFile(next.at(-1) ?? "");
  };
  return (
    <section
      className={`simulation-code-workspace${props.maximized ? " is-maximized" : ""}`}
      aria-label="仿真代码工作区"
      onKeyDown={(event) => {
        if (event.defaultPrevented) return;
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget
            .querySelector<HTMLButtonElement>("[data-workspace-save]")
            ?.click();
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "w"
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (props.activePath) closeFile(props.activePath);
        }
      }}
    >
      <header className="simulation-code-toolbar simulation-taskbar">
        <button
          type="button"
          aria-expanded={filesOpen}
          aria-controls={filesId}
          onClick={() => setFilesOpen(!filesOpen)}
        >
          资源管理器
        </button>
        <div className="simulation-code-actions">{props.actions}</div>
        <div className="simulation-code-more">
          <button
            type="button"
            aria-label="更多代码操作"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              ui.menu(
                rect.left,
                rect.bottom,
                [
                  {
                    label: "高级配置",
                    run: () => openFile(props.configPath),
                  },
                  {
                    label: "复制当前文件",
                    disabled: !props.activePath,
                    run: () => props.onCopyFile?.(props.activePath),
                  },
                  {
                    label: "导出当前文件…",
                    disabled: !props.activePath,
                    run: () => props.onExportFile?.(props.activePath),
                  },
                  {
                    label: "关闭所有编辑器",
                    run: () => {
                      setOpened([]);
                      props.onSelectFile("");
                    },
                  },
                  ...(props.additionalActions ?? []),
                ],
                "代码操作",
              );
            }}
          >
            ···
          </button>
        </div>
        {props.toolbarEnd}
      </header>
      <div className="simulation-code-source-area">
        {filesOpen ? (
          <aside
            id={filesId}
            className="simulation-code-files"
            style={{ width: filesWidth }}
            aria-label="仿真文件"
          >
            <SimulationFileTree {...props} onSelectFile={openFile} />
          </aside>
        ) : null}
        {filesOpen ? (
          <div
            className="workspace-files-resizer"
            role="separator"
            tabIndex={0}
            aria-label="调整仿真文件区大小"
            aria-orientation="vertical"
            aria-valuemin={110}
            aria-valuemax={420}
            aria-valuenow={filesWidth}
            onDoubleClick={() => setFilesWidth(240)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                event.stopPropagation();
                setFilesWidth((width) =>
                  Math.max(
                    110,
                    Math.min(
                      420,
                      width + (event.key === "ArrowRight" ? 10 : -10),
                    ),
                  ),
                );
              }
            }}
            onPointerDown={(event) => {
              const handle = event.currentTarget;
              const bounds = handle.parentElement!.getBoundingClientRect();
              const maximum = Math.max(110, Math.min(420, bounds.width - 180));
              handle.setPointerCapture(event.pointerId);
              const move = (e: PointerEvent) =>
                setFilesWidth(
                  Math.max(110, Math.min(maximum, e.clientX - bounds.left)),
                );
              const end = () => {
                handle.removeEventListener("pointermove", move);
                handle.removeEventListener("pointerup", end);
                handle.removeEventListener("pointercancel", end);
                handle.removeEventListener("lostpointercapture", end);
              };
              handle.addEventListener("pointermove", move);
              handle.addEventListener("pointerup", end);
              handle.addEventListener("pointercancel", end);
              handle.addEventListener("lostpointercapture", end);
            }}
          />
        ) : null}
        <div className="simulation-code-document">
          <div className="simulation-code-document-header">
            <div
              className="simulation-code-tabs"
              role="tablist"
              aria-label="已打开的仿真文件"
            >
              {props.artifactPreview ? (
                <div className="simulation-code-tab simulation-artifact-tab">
                  <button type="button" role="tab" aria-selected="true">
                    {props.artifactPreview.artifact.name}
                    <span> tmp</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Close ${props.artifactPreview.artifact.name}`}
                    onClick={props.onCloseArtifact}
                  >
                    ×
                  </button>
                </div>
              ) : null}
              {tabs.map((path) => {
                const file = props.files.find((f) => f.path === path)!;
                return (
                  <div className="simulation-code-tab" key={path}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={
                        !props.artifactPreview && props.activePath === path
                      }
                      onClick={() => {
                        props.onCloseArtifact?.();
                        props.onSelectFile(path);
                      }}
                      title={path}
                    >
                      {path === props.configPath
                        ? "配置"
                        : path.split("/").at(-1)}
                      {file.kind === "generated" ? " ◇" : ""}
                      {file.dirty ? " ●" : file.draft ? " ◌" : ""}
                    </button>
                    {
                      <button
                        type="button"
                        aria-label={`Close ${path}`}
                        onClick={() => closeFile(path)}
                      >
                        ×
                      </button>
                    }
                  </div>
                );
              })}
            </div>
            <div
              className="simulation-code-document-actions"
              hidden={!props.activePath || Boolean(props.artifactPreview)}
              ref={setDocumentActions}
            />
          </div>
          <div className="simulation-code-document-content">
            <div
              hidden={!props.activePath || Boolean(props.artifactPreview)}
              className="workspace-editor-content"
            >
              <CodeDocumentActions.Provider value={documentActions}>
                {props.children}
              </CodeDocumentActions.Provider>
            </div>
            {props.artifactPreview ? (
              <section
                className="simulation-artifact-editor"
                aria-label="文件预览"
              >
                <header>
                  <span>
                    只读 · tmp
                    {props.artifactPreview.truncated ? " · 前 64 KB" : ""}
                  </span>
                  <button
                    type="button"
                    disabled={props.artifactBusy !== undefined}
                    onClick={() =>
                      props.onDownloadArtifact?.(
                        props.artifactPreview!.artifact,
                      )
                    }
                  >
                    下载
                  </button>
                </header>
                <pre>
                  {formatSimulationArtifactPreview(props.artifactPreview)}
                </pre>
              </section>
            ) : !props.activePath ? (
              <p className="workspace-empty-editor">
                请选择要编辑的文件。关闭标签页不会删除文件。
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div
        className="simulation-code-output-resizer"
        role="separator"
        aria-label="调整代码结果区大小"
        aria-orientation="horizontal"
        tabIndex={0}
        aria-valuemin={15}
        aria-valuemax={75}
        aria-valuenow={resultsHeight}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            setResultsHeight((height) =>
              Math.max(
                15,
                Math.min(75, height + (event.key === "ArrowUp" ? 5 : -5)),
              ),
            );
          }
        }}
        onPointerDown={(event) => {
          const handle = event.currentTarget,
            container = handle.parentElement!,
            bounds = container.getBoundingClientRect();
          handle.setPointerCapture(event.pointerId);
          const move = (pointer: PointerEvent) =>
            setResultsHeight(
              Math.max(
                15,
                Math.min(
                  75,
                  ((bounds.bottom - pointer.clientY) / bounds.height) * 100,
                ),
              ),
            );
          const end = () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", end);
            handle.removeEventListener("pointercancel", end);
            handle.removeEventListener("lostpointercapture", end);
          };
          handle.addEventListener("pointermove", move);
          handle.addEventListener("pointerup", end);
          handle.addEventListener("pointercancel", end);
          handle.addEventListener("lostpointercapture", end);
        }}
      />
      <section
        className="simulation-code-output"
        style={{
          flexBasis: props.maximized
            ? "auto"
            : collapsed
              ? "32px"
              : `${resultsHeight}%`,
        }}
        aria-label="代码输出"
      >
        <header className="simulation-code-output-tabs">
          <div role="tablist" aria-label="代码输出视图">
            {(["console", "plot", "operating-point", "compare"] as const).map(
              (pane) => (
                <button
                  key={pane}
                  type="button"
                  role="tab"
                  aria-selected={pane === props.outputPane}
                  aria-label={
                    pane === "operating-point" ? "工作点" : undefined
                  }
                  onClick={() => {
                    props.onSelectOutputPane(pane);
                    setCollapsed(false);
                  }}
                >
                  {
                    {
                      console: "控制台",
                      plot: "绘图",
                      "operating-point": "OP",
                      compare: "比较",
                    }[pane]
                  }
                </button>
              ),
            )}
          </div>
          <span className="simulation-code-output-spacer" />
          {props.outputActions}
          <button
            type="button"
            aria-label={
              collapsed ? "展开代码输出" : "折叠代码输出"
            }
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "⌃" : "⌄"}
          </button>
          {props.onToggleMaximize ? (
            <button
              type="button"
              aria-label={
                props.maximized ? "还原结果区" : "最大化结果区"
              }
              onClick={() => {
                setCollapsed(false);
                props.onToggleMaximize?.();
              }}
            >
              {props.maximized ? "⧉" : "□"}
            </button>
          ) : null}
        </header>
        {!collapsed ? (
          <div className="simulation-code-output-content" role="tabpanel">
            {props.outputPane === "console" ? props.console : props.results}
          </div>
        ) : null}
      </section>
      {props.status ? (
        <footer className="simulation-code-status">{props.status}</footer>
      ) : null}
    </section>
  );
}
