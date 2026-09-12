import type { ComponentProps, RefObject } from "react";

import { AccountMenu } from "../components/account";
import { BugReportLink } from "../components/bug-report-link";
import { DrawingToolbar } from "../features/editor-shell/drawing-toolbar";
import { EditorTestTelemetry } from "../features/editor-shell/editor-test-telemetry";
import type { ReleaseChannel } from "../document/release-channel";
import { FileCommandMenu } from "../features/editor-shell/file-command-menu";
import { ToolIcon } from "../features/editor-shell/tool-icon";
import { HierarchyToolbar } from "../features/hierarchy/hierarchy-toolbar";
import type { EdgeAlignmentMode } from "../features/selection/align-selection";
import { dismissOpenCommandMenus } from "./editor-runtime-helpers";

interface CommandAction {
  enabled: boolean;
  execute: () => void;
}

interface ResetAction {
  label: string;
  enabled: boolean;
  execute: () => void;
}

interface AlignmentAction extends CommandAction {
  mode: EdgeAlignmentMode;
  label: string;
}

export interface EditorAppChromeProps {
  projectName: string;
  projectSchemaVersion: number;
  projectNameDraft: string | null;
  hasUnsavedWork: boolean;
  documentName: string;
  onProjectNameDraftChange: (value: string) => void;
  onProjectNameCommit: () => void;
  onProjectNameCancel: () => void;
  onOpenGallery: () => void;
  fileCommands: ComponentProps<typeof FileCommandMenu>;
  searchOpen: boolean;
  onManageCells: () => void;
  onNewTestbench: () => void;
  placeProjectCell: CommandAction;
  selectionFilterOpen: boolean;
  onOpenSelectionFilter: () => void;
  onOpenSearch: () => void;
  undo: CommandAction;
  redo: CommandAction;
  deleteSelection: CommandAction;
  resets: readonly ResetAction[];
  rotate: CommandAction;
  mirrorLeftRight: CommandAction;
  mirrorTopBottom: CommandAction;
  alignmentActions: readonly AlignmentAction[];
  instanceTableOpen: boolean;
  netlistPreflightOpen: boolean;
  checkAndSave: CommandAction;
  onOpenInstanceTable: () => void;
  onOpenNetlistPreflight: () => void;
  agentAction: { label: string; execute: () => void } | null;
  simulationAction?: () => void;
  simulationState?: "closed" | "open" | "maximized" | "minimized";
  publishGalleryOpen: boolean;
  onPublishGallery: () => void;
  helpButtonRef: RefObject<HTMLButtonElement | null>;
  helpOpen: boolean;
  onOpenHelp: () => void;
  drawingToolbar: ComponentProps<typeof DrawingToolbar>;
  hierarchyToolbar: ComponentProps<typeof HierarchyToolbar>;
  telemetry: ComponentProps<typeof EditorTestTelemetry>;
  /** Which channel serves this build; Preview is identified without a warning. */
  releaseChannel: ReleaseChannel;
}

export function ReleaseChannelBadge({
  releaseChannel,
}: {
  releaseChannel: ReleaseChannel;
}) {
  return releaseChannel === "preview" ? (
    <span className="app-channel-badge" data-testid="release-channel-badge">
      预览
    </span>
  ) : null;
}

/** Persistent command chrome above the document workspace. */
export function EditorAppChrome({
  projectName,
  projectSchemaVersion,
  projectNameDraft,
  hasUnsavedWork,
  documentName,
  onProjectNameDraftChange,
  onProjectNameCommit,
  onProjectNameCancel,
  onOpenGallery,
  fileCommands,
  searchOpen,
  onManageCells,
  onNewTestbench,
  placeProjectCell,
  selectionFilterOpen,
  onOpenSelectionFilter,
  onOpenSearch,
  undo,
  redo,
  deleteSelection,
  resets,
  rotate,
  mirrorLeftRight,
  mirrorTopBottom,
  alignmentActions,
  instanceTableOpen,
  netlistPreflightOpen,
  checkAndSave,
  onOpenInstanceTable,
  onOpenNetlistPreflight,
  agentAction,
  simulationAction,
  simulationState = "closed",
  publishGalleryOpen,
  onPublishGallery,
  helpButtonRef,
  helpOpen,
  onOpenHelp,
  drawingToolbar,
  hierarchyToolbar,
  telemetry,
  releaseChannel,
}: EditorAppChromeProps) {
  const displayedProjectName = projectNameDraft ?? projectName;
  return (
    <header className="app-chrome">
      <div className="app-chrome-main">
        <div className="app-brand">
          <a
            className="gallery-home-link"
            href="/"
            aria-label="返回画廊"
            title="返回画廊"
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              onOpenGallery();
            }}
          >
            <span className="app-brand-mark" aria-hidden="true" />
            <h1 title="Analog Canvas">Analog Canvas</h1>
          </a>
          <div className="app-brand-copy">
            <p title={`${projectName} / ${documentName}`}>
              <input
                className="app-project-name"
                aria-label="电路名称"
                data-testid="project-name-input"
                value={displayedProjectName}
                size={Math.max(displayedProjectName.length, 6)}
                onChange={(event) =>
                  onProjectNameDraftChange(event.currentTarget.value)
                }
                onBlur={onProjectNameCommit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") onProjectNameCancel();
                }}
              />{" "}
              {hasUnsavedWork ? (
                <span
                  className="project-unsaved-indicator"
                  data-testid="project-unsaved-indicator"
                  aria-label="有未保存的更改"
                  title="有未保存的更改"
                >
                  ●
                </span>
              ) : null}{" "}
              / <span data-testid="active-document-name">{documentName}</span>
            </p>
          </div>
        </div>
        <nav
          className="app-command-surface"
          aria-label="编辑器命令"
          onClick={(event) => {
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest(".command-popover button")
            ) {
              dismissOpenCommandMenus();
            }
          }}
        >
          <div className="menubar-row">
            <FileCommandMenu {...fileCommands} />
            <details className="command-menu" name="editor-command-menu">
              <summary>编辑</summary>
              <div className="command-popover">
                <button
                  type="button"
                  data-testid="edit-manage-cells"
                  onClick={onManageCells}
                >
                  管理 Cell…
                </button>
                <button type="button" onClick={onNewTestbench}>
                  新建 Testbench Cell…
                </button>
                <button
                  type="button"
                  onClick={placeProjectCell.execute}
                  disabled={!placeProjectCell.enabled}
                >
                  从此项目放置 Cell…
                </button>
                <button
                  type="button"
                  data-testid="selection-filter-button"
                  aria-haspopup="dialog"
                  aria-expanded={selectionFilterOpen}
                  onClick={onOpenSelectionFilter}
                >
                  选择筛选器…（Ctrl+F）
                </button>
                <button
                  type="button"
                  data-testid="project-search-button"
                  aria-haspopup="dialog"
                  aria-expanded={searchOpen}
                  onClick={onOpenSearch}
                >
                  搜索原理图…（Ctrl+Shift+F）
                </button>
                <button
                  type="button"
                  onClick={undo.execute}
                  disabled={!undo.enabled}
                >
                  撤销
                </button>
                <button
                  type="button"
                  onClick={redo.execute}
                  disabled={!redo.enabled}
                >
                  重做
                </button>
                <button
                  type="button"
                  onClick={deleteSelection.execute}
                  disabled={!deleteSelection.enabled}
                >
                  删除
                </button>
                {resets.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.execute}
                    disabled={!action.enabled}
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={rotate.execute}
                  disabled={!rotate.enabled}
                >
                  <ToolIcon name="rotate" />
                  旋转
                </button>
                <button
                  type="button"
                  onClick={mirrorLeftRight.execute}
                  disabled={!mirrorLeftRight.enabled}
                >
                  左右镜像（Shift+R）
                </button>
                <button
                  type="button"
                  onClick={mirrorTopBottom.execute}
                  disabled={!mirrorTopBottom.enabled}
                >
                  上下镜像（Ctrl+R）
                </button>
                {alignmentActions.length > 0 ? (
                  <>
                    <span className="command-group-label">对齐</span>
                    {alignmentActions.map((action) => (
                      <button
                        key={action.mode}
                        type="button"
                        onClick={action.execute}
                        disabled={!action.enabled}
                      >
                        {action.label}
                      </button>
                    ))}
                  </>
                ) : null}
              </div>
            </details>
            <details className="command-menu" name="editor-command-menu">
              <summary>网表</summary>
              <div className="command-popover">
                <span className="command-group-label">编辑</span>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={instanceTableOpen}
                  onClick={onOpenInstanceTable}
                >
                  实例表…
                </button>
                <span className="command-group-label">检查</span>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={netlistPreflightOpen}
                  onClick={onOpenNetlistPreflight}
                >
                  检查报告…
                </button>
                <button
                  type="button"
                  data-testid="check-and-save"
                  disabled={!checkAndSave.enabled}
                  onClick={checkAndSave.execute}
                  title={`运行 ERC 与视觉检查，并保存此${fileCommands.projectStoreItemLabel}`}
                >
                  <span className="toolbar-check-glyph" aria-hidden="true" />
                  检查并保存
                </button>
              </div>
            </details>
            {simulationAction ? (
              <button
                type="button"
                data-testid="open-analog-simulation"
                aria-label="模拟仿真"
                aria-pressed={
                  simulationState === "open" || simulationState === "maximized"
                }
                onClick={simulationAction}
              >
                {simulationState === "minimized" ? "仿真 · 已最小化" : "仿真"}
              </button>
            ) : null}
            {agentAction ? (
              <details className="command-menu" name="editor-command-menu">
                <summary>Agent</summary>
                <div className="command-popover">
                  <button type="button" onClick={agentAction.execute}>
                    {agentAction.label}
                  </button>
                </div>
              </details>
            ) : null}
            {/* Publishing is the primary narrow-window action. Keeping it
                immediately after the compact menus makes it visible before
                the command row needs horizontal scrolling. */}
            <button
              type="button"
              data-testid="publish-gallery-button"
              aria-haspopup="dialog"
              aria-expanded={publishGalleryOpen}
              title="发布到画廊"
              onClick={onPublishGallery}
            >
              发布<span className="publish-label-long">到画廊</span>
            </button>
          </div>
        </nav>
        <div className="app-chrome-actions">
          <ReleaseChannelBadge releaseChannel={releaseChannel} />
          {releaseChannel === "preview" ? (
            <AccountMenu showGalleryLinks={false} />
          ) : null}
          <BugReportLink
            testId="editor-report-bug"
            surface="Editor"
            projectSchemaVersion={projectSchemaVersion}
          />
          <button
            type="button"
            className="menubar-help"
            ref={helpButtonRef}
            aria-haspopup="dialog"
            aria-expanded={helpOpen}
            aria-controls="editor-help-dialog"
            onClick={onOpenHelp}
          >
            帮助
          </button>
          <div className="tokenzhang-credit">
            <span className="tokenzhang-credit-kicker">出品方</span>
            <a
              className="tokenzhang-link"
              href="https://tokenzhang.com"
              target="_blank"
              rel="noreferrer"
              aria-label="TokenZhang"
              title="TokenZhang"
            >
              <img
                className="tokenzhang-link-icon"
                src="/tokenzhang-favicon.png"
                alt=""
                width={12}
                height={12}
              />
              <span className="tokenzhang-link-label">TokenZhang</span>
            </a>
          </div>
        </div>
      </div>
      <DrawingToolbar {...drawingToolbar} />
      <HierarchyToolbar {...hierarchyToolbar} />
      <EditorTestTelemetry {...telemetry} />
    </header>
  );
}
