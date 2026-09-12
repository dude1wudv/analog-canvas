import { useRef, useState, type ReactNode, type RefObject } from "react";
import { ImageSpiceDialog } from "../image-spice/image-spice-dialog";
import { AiSettingsDialog } from "../image-spice/ai-settings-dialog";
import type { AiConfiguration } from "../image-spice/ai-configuration";

import {
  CLOUD_PROJECT_LIMIT,
  type CloudProjectSummary,
} from "./cloud-projects";

export interface FileCommandMenuProps {
  projectStoreLabel: "云项目" | "预览项目";
  projectStoreItemLabel: "云项目" | "预览项目";
  cloudProjects: readonly CloudProjectSummary[];
  activeCloudProjectId: string | null;
  canRevert: boolean;
  hasRecoverySessions: boolean;
  projectInputRef: RefObject<HTMLInputElement | null>;
  onNewProject: () => void;
  onSave: () => void;
  onRefreshCloudProjects: () => void;
  onOpenCloudProject: (project: CloudProjectSummary) => void;
  onDeleteCloudProject: (project: CloudProjectSummary) => void;
  onRefresh: () => void;
  onImportProject: (file: File | null) => void;
  onImportSpice: (
    files: FileList | null,
    namingProfile?: "native" | "cadence-bang",
  ) => void;
  onExportProject: () => void;
  onExportSvg: () => void;
  onExportRaster: (format: "png" | "pdf") => void;
  onExportNetlist: (format: "spice" | "spectre") => void;
  onRevert: () => void;
  onOpenRecovery: () => void;
}

function ExportSubmenu({
  title,
  open,
  onToggle,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
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
        aria-controls={
          title === "Export netlist"
            ? "export-netlist-options"
            : "export-drawing-options"
        }
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
                ?.querySelector<HTMLButtonElement>(
                  ".export-submenu-options button",
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
        className="export-submenu-options"
        id={
          title === "Export netlist"
            ? "export-netlist-options"
            : "export-drawing-options"
        }
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
  projectStoreLabel,
  projectStoreItemLabel,
  cloudProjects,
  activeCloudProjectId,
  onOpenCloudProject,
  onDeleteCloudProject,
  canRevert,
  hasRecoverySessions,
  projectInputRef,
  onNewProject,
  onSave,
  onRefreshCloudProjects,
  onRefresh,
  onImportProject,
  onImportSpice,
  onExportProject,
  onExportSvg,
  onExportRaster,
  onExportNetlist,
  onRevert,
  onOpenRecovery,
}: FileCommandMenuProps) {
  const [imageSpiceOpen, setImageSpiceOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiConfigurations, setAiConfigurations] = useState<AiConfiguration[]>(
    [],
  );
  const [exportGroup, setExportGroup] = useState<"netlist" | "drawing" | null>(
    null,
  );
  return (
    <>
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
      <details
        className="command-menu"
        name="editor-command-menu"
        onToggle={(event) => {
          if (event.currentTarget.open) onRefreshCloudProjects();
          else setExportGroup(null);
        }}
      >
        <summary>文件</summary>
        <div className="command-popover">
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              setAiSettingsOpen(true);
            }}
          >
            AI 接口设置…
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
          <span className="command-group-label">
            {projectStoreLabel} ({cloudProjects.length}/{CLOUD_PROJECT_LIMIT})
          </span>
          {cloudProjects.map((project) => (
            <div className="cloud-project-command" key={project.id}>
              <button
                type="button"
                className="cloud-project-open"
                data-testid={`cloud-project-${project.id}`}
                title={`打开修订版本 ${project.revision}`}
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
              <button
                type="button"
                aria-label={`删除${projectStoreItemLabel} ${project.name}`}
                title={`删除此${projectStoreItemLabel}`}
                disabled={project.id === activeCloudProjectId}
                onClick={() => onDeleteCloudProject(project)}
              >
                删除
              </button>
            </div>
          ))}
          <label className="file-import">
            导入项目文件…
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
          <label className="file-import">
            导入 SPICE…
            <input
              data-testid="spice-files"
              type="file"
              accept=".spi,.cir,.sp,.inc,.lib"
              multiple
              onChange={(event) => onImportSpice(event.currentTarget.files)}
            />
          </label>
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              setImageSpiceOpen(true);
            }}
          >
            从电路图识别 SPICE…
          </button>
          <label className="file-import">
            导入 Cadence SPICE（`!` 全局网络）…
            <input
              data-testid="cadence-spice-files"
              type="file"
              accept=".spi,.cir,.sp,.inc,.lib"
              multiple
              onChange={(event) =>
                onImportSpice(event.currentTarget.files, "cadence-bang")
              }
            />
          </label>
          <button type="button" onClick={onExportProject}>
            导出项目文件…
          </button>
          <div>
            <ExportSubmenu
              title="导出网表"
              open={exportGroup === "netlist"}
              onToggle={() =>
                setExportGroup(exportGroup === "netlist" ? null : "netlist")
              }
              onClose={() => setExportGroup(null)}
            >
              <button
                type="button"
                aria-label="导出 SPICE 网表"
                onClick={() => onExportNetlist("spice")}
              >
                SPICE
              </button>
              <button
                type="button"
                aria-label="导出 Spectre 网表"
                onClick={() => onExportNetlist("spectre")}
              >
                Spectre
              </button>
            </ExportSubmenu>
            <ExportSubmenu
              title="导出图纸"
              open={exportGroup === "drawing"}
              onToggle={() =>
                setExportGroup(exportGroup === "drawing" ? null : "drawing")
              }
              onClose={() => setExportGroup(null)}
            >
              <button type="button" aria-label="导出 SVG" onClick={onExportSvg}>
                SVG
              </button>
              <button
                type="button"
                aria-label="导出 PNG"
                onClick={() => onExportRaster("png")}
              >
                PNG
              </button>
              <button
                type="button"
                aria-label="导出 PDF"
                onClick={() => onExportRaster("pdf")}
              >
                PDF
              </button>
            </ExportSubmenu>
          </div>
          <button type="button" onClick={onRefresh}>
            刷新应用
          </button>
          <button type="button" onClick={onRevert} disabled={!canRevert}>
            恢复到上次保存
          </button>
          {hasRecoverySessions ? (
            <button type="button" onClick={onOpenRecovery}>
              恢复本地工作…
            </button>
          ) : null}
        </div>
      </details>
    </>
  );
}
