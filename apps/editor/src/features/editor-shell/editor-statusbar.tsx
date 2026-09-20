import type { WireCornerOrder, WireRoutingMode } from "@icm/edit-engine";

import type { EditorTool } from "../../interaction/interaction-state";
import { ToolIcon } from "./tool-icon";

function toolLabel(
  tool: EditorTool,
  vddRailMode: boolean,
  pendingSymbolId: string | null,
): string {
  if (vddRailMode) return "Drawing Power Rail";
  if (pendingSymbolId) return `Placing ${pendingSymbolId}`;
  if (tool === "pointer") return "Select";
  if (tool === "construction-line") return "Line";
  return tool.charAt(0).toUpperCase() + tool.slice(1);
}

function issuesBadge(issues: {
  errorCount: number;
  warningCount: number;
  checkStatus?: import("../../app/project-check").ProjectCheckStatus;
}): {
  severity: "error" | "warning" | "none";
  label: string;
  title: string;
} {
  if (issues.checkStatus && issues.checkStatus !== "current") {
    return {
      severity: "none",
      label:
        issues.checkStatus === "stale"
          ? "Check out of date"
          : issues.checkStatus === "failed"
            ? "Check failed"
            : issues.checkStatus === "checking"
              ? "Checking…"
              : "尚未检查",
      title: "打开问题列表——使用“检查并保存”开始检查",
    };
  }
  const plural = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;
  if (issues.errorCount > 0) {
    return {
      severity: "error",
      label:
        issues.warningCount > 0
          ? `${plural(issues.errorCount, "error")}, ${plural(issues.warningCount, "warning")}`
          : plural(issues.errorCount, "error"),
      title: "需要处理——打开问题列表",
    };
  }
  if (issues.warningCount > 0) {
    return {
      severity: "warning",
      label: plural(issues.warningCount, "warning"),
      title: "查看检查结果——打开问题列表",
    };
  }
  return {
    severity: "none",
    label: "未发现问题",
    title: "打开问题列表",
  };
}

export function EditorStatusbar({
  visitStats,
  status,
  tool,
  vddRailMode,
  pendingSymbolId,
  wireOptionsOpen,
  wireRoutingMode,
  wireCornerOrder,
  recoveryLabel,
  zoomPercent,
  gridVisible,
  issues,
  selectionFilterSummary,
  onOpenSelectionFilter,
  onToggleWireOptions,
  onWireRoutingModeChange,
  onWireCornerOrderChange,
  onOpenAnalytics,
  onToggleGrid,
  onZoomOut,
  onZoomIn,
  onFitView,
}: {
  visitStats?: { pv: number; uv: number } | null | undefined;
  status: string;
  tool: EditorTool;
  vddRailMode: boolean;
  pendingSymbolId: string | null;
  wireOptionsOpen: boolean;
  wireRoutingMode: WireRoutingMode;
  wireCornerOrder: WireCornerOrder;
  recoveryLabel: string | null;
  zoomPercent: number;
  /** Whether the canvas paints its background grid dots. */
  gridVisible: boolean;
  selectionFilterSummary: string | null;
  issues?: {
    errorCount: number;
    warningCount: number;
    checkStatus?: import("../../app/project-check").ProjectCheckStatus;
    onOpen: () => void;
  };
  onToggleWireOptions: () => void;
  onWireRoutingModeChange: (mode: WireRoutingMode) => void;
  onWireCornerOrderChange: (order: WireCornerOrder) => void;
  onOpenAnalytics: () => void;
  onToggleGrid: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitView: () => void;
  onOpenSelectionFilter: () => void;
}) {
  return (
    <footer className="app-statusbar">
      <div className="statusbar-left">
        <p className="editor-status" data-testid="status" aria-live="polite">
          {status}
        </p>
        <span className="statusbar-tool" data-testid="statusbar-tool">
          {toolLabel(tool, vddRailMode, pendingSymbolId)}
        </span>
        {selectionFilterSummary ? (
          <button
            type="button"
            className="statusbar-tool"
            data-testid="selection-filter-status"
            onClick={onOpenSelectionFilter}
            title="打开选择筛选器（Ctrl+F）"
          >
            {selectionFilterSummary}
          </button>
        ) : null}
        {tool === "wire" ? (
          <button
            type="button"
            className="statusbar-tool"
            onClick={onToggleWireOptions}
            aria-expanded={wireOptionsOpen}
          >
            {wireRoutingMode === "orthogonal" ? "Orthogonal" : "45°"} · F3
          </button>
        ) : null}
        {tool === "wire" && wireOptionsOpen ? (
          <span className="wire-options" data-testid="wire-options">
            <label>
              Route
              <select
                value={wireRoutingMode}
                onChange={(event) =>
                  onWireRoutingModeChange(
                    event.currentTarget.value as WireRoutingMode,
                  )
                }
              >
                <option value="orthogonal">正交</option>
                <option value="octilinear">45° octilinear</option>
                <option value="free">任意角度</option>
              </select>
            </label>
            <label>
              Corner
              <select
                value={wireCornerOrder}
                onChange={(event) =>
                  onWireCornerOrderChange(
                    event.currentTarget.value as WireCornerOrder,
                  )
                }
              >
                <option value="auto">自动</option>
                <option value="horizontal-first">优先水平</option>
                <option value="vertical-first">优先垂直</option>
                <option value="diagonal-first">优先对角</option>
                <option value="orthogonal-first">优先正交</option>
              </select>
            </label>
          </span>
        ) : null}
        {recoveryLabel ? (
          <output
            className="statusbar-recovery"
            data-testid="recovery-state"
            aria-label="浏览器恢复状态"
          >
            {recoveryLabel}
          </output>
        ) : null}
        {issues
          ? (() => {
              const badge = issuesBadge(issues);
              return (
                <button
                  type="button"
                  className="statusbar-issues"
                  data-testid="statusbar-issues"
                  data-check-status={issues.checkStatus ?? "current"}
                  data-severity={badge.severity}
                  title={badge.title}
                  aria-label={`${badge.label}. ${badge.title}`}
                  onClick={issues.onOpen}
                >
                  {badge.label}
                </button>
              );
            })()
          : null}
      </div>
      {visitStats ? (
        <a
          className="statusbar-analytics"
          href="/analytics"
          data-testid="statusbar-analytics"
          title="打开访客统计"
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
            onOpenAnalytics();
          }}
        >
          {visitStats.uv.toLocaleString()} visitors ·{" "}
          {visitStats.pv.toLocaleString()} views
        </a>
      ) : null}
      <div className="statusbar-view-controls">
        {/* One click away, unlike the canvas.showGrid setting. The label
            collapses to the icon in half-width windows. */}
        <button
          type="button"
          className="statusbar-grid-toggle"
          data-testid="statusbar-grid-toggle"
          aria-label="Grid"
          aria-pressed={gridVisible}
          title={
            gridVisible
              ? "Grid On — click to hide the background grid"
              : "Grid Off — click to show the background grid"
          }
          onClick={onToggleGrid}
        >
          <ToolIcon name="grid" />
          <span className="statusbar-grid-label">
            {gridVisible ? "网格开启" : "网格关闭"}
          </span>
        </button>
        <div className="canvas-controls" aria-label="画布视图控件">
          <button
            type="button"
            aria-label="缩小"
            title="缩小"
            onClick={onZoomOut}
          >
            <ToolIcon name="zoom-out" />
          </button>
          <output aria-label="当前缩放比例">{zoomPercent}%</output>
          <button
            type="button"
            aria-label="放大"
            title="放大"
            onClick={onZoomIn}
          >
            <ToolIcon name="zoom-in" />
          </button>
          <button
            type="button"
            aria-label="适合窗口"
            title="适合窗口（Home）"
            onClick={onFitView}
          >
            <ToolIcon name="fit" />
          </button>
        </div>
      </div>
    </footer>
  );
}
