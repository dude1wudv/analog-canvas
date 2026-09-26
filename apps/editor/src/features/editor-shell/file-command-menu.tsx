import {
  lazy,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

const ImageSpiceDialog = lazy(() =>
  import("../image-spice/image-spice-dialog").then((module) => ({
    default: module.ImageSpiceDialog,
  })),
);
const AiSettingsDialog = lazy(() =>
  import("../image-spice/ai-settings-dialog").then((module) => ({
    default: module.AiSettingsDialog,
  })),
);
import type { AiConfiguration } from "../image-spice/ai-configuration";

import {
  CLOUD_PROJECT_LIMIT,
  type CloudProjectSummary,
} from "./cloud-projects";
const InlineConfirm = lazy(() =>
  import("../../components/inline-confirm").then((module) => ({
    default: module.InlineConfirm,
  })),
);

export interface FileCommandMenuProps {
  cloudProjects: readonly CloudProjectSummary[];
  activeCloudProjectId: string | null;
  canRevert: boolean;
  hasRecoverySessions: boolean;
  checkAndSave: { enabled: boolean; execute: () => void };
  projectInputRef: RefObject<HTMLInputElement | null>;
  onNewProject: () => void;
  onSave: () => void;
  onRefreshCloudProjects: () => void;
  onOpenCloudProject: (project: CloudProjectSummary) => void;
  onDeleteCloudProject: (project: CloudProjectSummary) => void | Promise<void>;
  onImportProject: (file: File | null) => void;
  onImportSpice: (
    files: FileList | null,
    namingProfile?: "native" | "cadence-bang",
  ) => void;
  onExportProject: () => void;
  onExportSvg: () => void;
  onExportRaster: (format: "png" | "pdf") => void;
  onRevert: () => void;
  onOpenRecovery: () => void;
}

function CommandSubmenu({
  id,
  title,
  open,
  onToggle,
  onClose,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const menu = options.current?.closest<HTMLElement>(".file-command-popover");
    if (!open || !menu || getComputedStyle(menu).overflowY !== "auto") return;
    const bottom = options.current!.getBoundingClientRect().bottom;
    menu.scrollTop += Math.max(0, bottom - menu.getBoundingClientRect().bottom);
  }, [open]);
  return (
    <div
      className="export-submenu"
      onKeyDown={(event) => {
        if (open && event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) onToggle();
            requestAnimationFrame(() =>
              trigger.current?.parentElement
                ?.querySelector<HTMLElement>(
                  ".export-submenu-options button, .export-submenu-options .file-import",
                )
                ?.focus(),
            );
          }
        }}
      >
        {title}
        <span aria-hidden="true">›</span>
      </button>
      <div
        ref={options}
        className="export-submenu-options"
        id={id}
        role="group"
        aria-label={title}
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}

export function FileCommandMenu({
  cloudProjects,
  activeCloudProjectId,
  onOpenCloudProject,
  onDeleteCloudProject,
  canRevert,
  hasRecoverySessions,
  checkAndSave,
  projectInputRef,
  onNewProject,
  onSave,
  onRefreshCloudProjects,
  onImportProject,
  onImportSpice,
  onExportProject,
  onExportSvg,
  onExportRaster,
  onRevert,
  onOpenRecovery,
}: FileCommandMenuProps) {
  const [imageSpiceOpen, setImageSpiceOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiConfigurations, setAiConfigurations] = useState<AiConfiguration[]>(
    [],
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<"import" | "export" | null>(
    null,
  );
  const cloudProjectList = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!deletingId) return;
    const list = cloudProjectList.current;
    const decision = list?.querySelector<HTMLElement>(
      ".inline-confirm[data-expanded]",
    );
    const row = decision?.closest<HTMLElement>(".cloud-project-command");
    if (!list || !row) return;
    const listBounds = list.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    if (rowBounds.bottom > listBounds.bottom)
      list.scrollTop += rowBounds.bottom - listBounds.bottom;
    else if (rowBounds.top < listBounds.top)
      list.scrollTop += rowBounds.top - listBounds.top;
  }, [deletingId]);
  const activateFileLabel = (
    event: ReactKeyboardEvent<HTMLLabelElement>,
  ): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.currentTarget.querySelector("input")?.click();
  };
  return (
    <>
      <Suspense fallback={null}>
        {imageSpiceOpen && (
          <ImageSpiceDialog
            configurations={aiConfigurations}
            onOpenSettings={() => setAiSettingsOpen(true)}
            onClose={() => setImageSpiceOpen(false)}
            onImport={(file) => {
              const transfer = new DataTransfer();
              transfer.items.add(file);
              onImportSpice(transfer.files);
            }}
          />
        )}
        {aiSettingsOpen && (
          <AiSettingsDialog
            configurations={aiConfigurations}
            onChange={setAiConfigurations}
            onClose={() => setAiSettingsOpen(false)}
          />
        )}
      </Suspense>
      <details
        className="command-menu"
        name="editor-command-menu"
        onToggle={(event) => {
          if (event.currentTarget.open) onRefreshCloudProjects();
          else setOpenSubmenu(null);
        }}
      >
        <summary>文件</summary>
        <div
          className="command-popover file-command-popover"
          data-inline-confirm-menu
        >
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              setAiSettingsOpen(true);
            }}
          >
            AI 接口设置…
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              setImageSpiceOpen(true);
            }}
          >
            从电路图识别 SPICE…
          </button>
          <button type="button" onClick={onNewProject}>
            新建项目
          </button>
          <button
            type="button"
            data-testid="save-cloud-project"
            onClick={onSave}
          >
            保存
          </button>
          <button
            type="button"
            data-testid="check-and-save"
            disabled={!checkAndSave.enabled}
            onClick={checkAndSave.execute}
            title="检查 ERC 和视觉问题，并保存此云项目"
          >
            检查并保存
          </button>
          <span className="command-group-label" id="file-cloud-projects-label">
            云项目 ({cloudProjects.length}/{CLOUD_PROJECT_LIMIT})
          </span>
          <div
            ref={cloudProjectList}
            className="cloud-project-list"
            role="region"
            aria-labelledby="file-cloud-projects-label"
            tabIndex={cloudProjects.length ? 0 : undefined}
            data-testid="file-cloud-project-list"
          >
            {cloudProjects.map((project) => (
              <div className="cloud-project-command" key={project.id}>
                <button
                  type="button"
                  className="cloud-project-open"
                  data-testid={`cloud-project-${project.id}`}
                  title={`打开修订版 ${project.revision}`}
                  disabled={project.id === activeCloudProjectId}
                  onClick={() => onOpenCloudProject(project)}
                >
                  <span className="cloud-project-name">{project.name}</span>
                  <time
                    className="cloud-project-time"
                    dateTime={project.updatedAt}
                  >
                    {new Date(project.updatedAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                </button>
                <Suspense fallback={<button disabled>删除</button>}>
                  <InlineConfirm
                    aria-label={`删除云项目 ${project.name}`}
                    title="删除此云项目"
                    disabled={project.id === activeCloudProjectId}
                    open={deletingId === project.id}
                    onOpenChange={(open) => {
                      if (open) setOpenSubmenu(null);
                      setDeletingId((current) =>
                        open
                          ? project.id
                          : current === project.id
                            ? null
                            : current,
                      );
                    }}
                    onConfirm={() => onDeleteCloudProject(project)}
                  >
                    删除
                  </InlineConfirm>
                </Suspense>
              </div>
            ))}
          </div>
          <div>
            <CommandSubmenu
              id="file-import-options"
              title="导入"
              open={openSubmenu === "import"}
              onToggle={() => {
                setDeletingId(null);
                setOpenSubmenu((current) =>
                  current === "import" ? null : "import",
                );
              }}
              onClose={() => setOpenSubmenu(null)}
            >
              <label
                className="file-import"
                tabIndex={0}
                onKeyDown={activateFileLabel}
              >
                项目文件…
                <input
                  ref={projectInputRef}
                  data-testid="project-file"
                  type="file"
                  accept=".json,.icproj.json,application/json"
                  onChange={(event) =>
                    onImportProject(event.currentTarget.files?.[0] ?? null)
                  }
                />
              </label>
              <label
                className="file-import"
                tabIndex={0}
                onKeyDown={activateFileLabel}
              >
                SPICE / SCS 文件…
                <input
                  data-testid="spice-files"
                  type="file"
                  accept=".spi,.cir,.sp,.scs,.inc,.lib"
                  multiple
                  onChange={(event) => onImportSpice(event.currentTarget.files)}
                />
              </label>
              <label
                className="file-import"
                tabIndex={0}
                onKeyDown={activateFileLabel}
              >
                Cadence SPICE（`!` 全局节点）…
                <input
                  data-testid="cadence-spice-files"
                  type="file"
                  accept=".spi,.cir,.sp,.scs,.inc,.lib"
                  multiple
                  onChange={(event) =>
                    onImportSpice(event.currentTarget.files, "cadence-bang")
                  }
                />
              </label>
            </CommandSubmenu>
          </div>
          <div>
            <CommandSubmenu
              id="file-export-options"
              title="导出"
              open={openSubmenu === "export"}
              onToggle={() => {
                setDeletingId(null);
                setOpenSubmenu((current) =>
                  current === "export" ? null : "export",
                );
              }}
              onClose={() => setOpenSubmenu(null)}
            >
              <button
                type="button"
                aria-label="导出项目文件…"
                onClick={onExportProject}
              >
                项目文件…
              </button>
              <button type="button" aria-label="导出 SVG" onClick={onExportSvg}>
                图纸为 SVG
              </button>
              <button
                type="button"
                aria-label="导出 PNG"
                onClick={() => onExportRaster("png")}
              >
                图纸为 PNG
              </button>
              <button
                type="button"
                aria-label="导出 PDF"
                onClick={() => onExportRaster("pdf")}
              >
                图纸为 PDF
              </button>
            </CommandSubmenu>
          </div>
          {canRevert ? (
            <button type="button" onClick={onRevert}>
              恢复到上次保存
            </button>
          ) : null}
          {hasRecoverySessions ? (
            <button type="button" onClick={onOpenRecovery}>
              恢复未保存的内容…
            </button>
          ) : null}
        </div>
      </details>
    </>
  );
}
