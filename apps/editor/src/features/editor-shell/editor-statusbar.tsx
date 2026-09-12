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
  gridDotsVisible,
  annotationGrid,
  drawAngleMode,
  wheelBehavior,
  zoomPercent,
  issues,
  selectionFilterSummary,
  onOpenSelectionFilter,
  onToggleWireOptions,
  onWireRoutingModeChange,
  onWireCornerOrderChange,
  onToggleGridDots,
  onOpenAnalytics,
  onAnnotationGridChange,
  onDrawAngleModeChange,
  onWheelBehaviorChange,
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
  gridDotsVisible: boolean;
  annotationGrid: 1 | 5 | 10;
  drawAngleMode: "free" | "45" | "orthogonal";
  wheelBehavior: "auto" | "zoom" | "pan";
  zoomPercent: number;
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
  onToggleGridDots: () => void;
  onOpenAnalytics: () => void;
  onAnnotationGridChange: (pitch: 1 | 5 | 10) => void;
  onDrawAngleModeChange: (mode: "free" | "45" | "orthogonal") => void;
  onWheelBehaviorChange: (behavior: "auto" | "zoom" | "pan") => void;
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
      <div className="canvas-controls" aria-label="画布视图控件">
        <button
          type="button"
          aria-label={
            gridDotsVisible ? "Hide background dots" : "Show background dots"
          }
          aria-pressed={gridDotsVisible}
          title={
            gridDotsVisible ? "Hide background dots" : "Show background dots"
          }
          onClick={onToggleGridDots}
        >
          <ToolIcon name="grid" />
        </button>
        <select
          aria-label="注释网格"
          data-testid="annotation-grid-select"
          title="文本和绘图注释的放置间距。器件、导线和连接点始终位于 10 单位网格上。"
          value={annotationGrid}
          onChange={(event) =>
            onAnnotationGridChange(
              Number(event.currentTarget.value) as 1 | 5 | 10,
            )
          }
        >
          <option value="10">±10</option>
          <option value="5">±5</option>
          <option value="1">±1</option>
        </select>
        <select
          aria-label="绘制角度"
          data-testid="draw-angle-select"
          title="箭头和直线工具的角度锁定。绘制时按 Shift 始终锁定为 45 度角；导线始终保持正交。"
          value={drawAngleMode}
          onChange={(event) =>
            onDrawAngleModeChange(
              event.currentTarget.value as "free" | "45" | "orthogonal",
            )
          }
        >
          <option value="free">自由</option>
          <option value="45">45°</option>
          <option value="orthogonal">正交</option>
        </select>
        <select
          aria-label="鼠标滚轮"
          data-testid="wheel-behavior-select"
          title="设置普通滚动的行为。自动模式会识别设备：鼠标滚轮缩放，触控板滚动平移。如果识别错误，请明确选择一种模式。双指捏合和 Cmd+滚动始终执行缩放。"
          value={wheelBehavior}
          onChange={(event) =>
            onWheelBehaviorChange(
              event.currentTarget.value as "auto" | "zoom" | "pan",
            )
          }
        >
          <option value="auto">滚轮：自动</option>
          <option value="zoom">滚轮：缩放</option>
          <option value="pan">滚轮：平移</option>
        </select>
        <button
          type="button"
          aria-label="缩小"
          title="缩小"
          onClick={onZoomOut}
        >
          <ToolIcon name="zoom-out" />
        </button>
        <output aria-label="当前缩放比例">{zoomPercent}%</output>
        <button type="button" aria-label="放大" title="放大" onClick={onZoomIn}>
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
    </footer>
  );
}
