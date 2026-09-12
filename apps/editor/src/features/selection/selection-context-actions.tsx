import type { Ref } from "react";
import type { MosBulkResolution } from "@icm/derived";

import { ColorOverrideControl } from "../properties/color-override-control";
import { ToolIcon } from "../editor-shell/tool-icon";

import { DisplayToggle } from "../component-insert/display-toggle";

export function MosBulkConnectionSection({
  connection,
  explicitRouteVisible,
  canDraw,
  onDraw,
}: {
  connection: {
    terminal: string;
    netName: string | null;
    status: MosBulkResolution["status"];
  } | null;
  explicitRouteVisible: boolean;
  canDraw: boolean;
  onDraw: () => void;
}) {
  if (connection === null) return null;
  const { terminal, netName, status } = connection;
  const label = netName ?? (status === "no-connect" ? "No Connect" : "未连接");
  const origin = {
    explicit: "显式连接",
    "cell-default": "Cell 默认值",
    "instance-override": "实例覆盖值",
    "supply-default": "电源默认值",
    "no-connect": "有意保持未连接",
    unresolved: "请为体端选择网络",
  }[status];
  const description = `${terminal} → ${label} · ${origin}${
    explicitRouteVisible ? " · Dashed bulk route shown" : ""
  }`;
  return (
    <section
      className="mos-bulk-bar"
      aria-label="MOS 体端连接"
      data-state={status}
    >
      <h2>体端</h2>
      <span
        className="mos-bulk-status"
        title={description}
        aria-label={description}
      >
        {label}
      </span>
      <button
        type="button"
        className="bulk-draw-action"
        data-testid="draw-bulk-connection"
        aria-label="绘制体端连接"
        disabled={!canDraw}
        title={
          canDraw
            ? `在画布上从 ${terminal} 绘制连接`
            : "请先将元件放到画布上，再绘制体端连接"
        }
        onClick={onDraw}
      >
        <ToolIcon name="wire" />
        {status === "unresolved" ? "连接" : "绘制"}
      </button>
    </section>
  );
}

export type RoutingGuidanceView = "focused" | "all" | "hidden";

export function RoutingGuidanceSection({
  total,
  displayed,
  view,
  onViewChange,
}: {
  total: number;
  displayed: number;
  view: RoutingGuidanceView;
  onViewChange: (view: RoutingGuidanceView) => void;
}) {
  if (total === 0) return null;
  return (
    <section className="context-actions" aria-label="布线指引">
      <h2>导入的布线指引</h2>
      <div className="component-mirror-row">
        {(
          [
            ["focused", "已聚焦"],
            ["all", "All"],
            ["hidden", "隐藏"],
          ] as const
        ).map(([candidate, label]) => (
          <button
            type="button"
            aria-pressed={view === candidate}
            key={candidate}
            onClick={() => onViewChange(candidate)}
          >
            {label}
          </button>
        ))}
      </div>
      <small>
        {displayed} shown / {total} derived. Guidance exists only for imported
        Nets.
      </small>
    </section>
  );
}

export function GroupDisplayToggles({
  active,
  referencesVisible,
  valuesVisible,
  valuesAvailable,
  onReferencesVisibleChange,
  onValuesVisibleChange,
}: {
  active: boolean;
  referencesVisible: boolean;
  valuesVisible: boolean;
  valuesAvailable: boolean;
  onReferencesVisibleChange: (visible: boolean) => void;
  onValuesVisibleChange: (visible: boolean) => void;
}) {
  if (!active) return null;
  return (
    <section className="property-section" aria-label="分组显示开关">
      <div className="property-section-heading">画布标签</div>
      <div className="display-toggle-row">
        <DisplayToggle
          label="视觉注释"
          checked={referencesVisible}
          onChange={onReferencesVisibleChange}
        />
        <DisplayToggle
          label="值"
          checked={valuesVisible}
          disabled={!valuesAvailable}
          help={valuesAvailable ? undefined : "请先填写器件参数"}
          onChange={onValuesVisibleChange}
        />
      </div>
    </section>
  );
}

export function RouteActionsSection({
  active,
  netLabelInputRef,
  netLabel,
  color,
  arrow,
  defaultColor,
  highlightActive,
  onNetLabelChange,
  onColorChange,
  onArrowChange,
  onDeleteNetLabel,
  onAddCurrentArrow,
  onToggleHighlight,
  onDeleteWire,
}: {
  active: boolean;
  netLabelInputRef: Ref<HTMLInputElement>;
  netLabel: string;
  color: string | undefined;
  arrow: "middle" | "end" | undefined;
  defaultColor: string;
  highlightActive: boolean;
  onNetLabelChange: (value: string) => void;
  onColorChange: (value: string | undefined) => void;
  onArrowChange: (value: "middle" | "end" | undefined) => void;
  onDeleteNetLabel: () => void;
  onAddCurrentArrow: () => void;
  onToggleHighlight: () => void;
  onDeleteWire: () => void;
}) {
  if (!active) return null;
  return (
    <section className="context-actions" aria-label="线路操作">
      <h2>电气线路</h2>
      <label>
        电气网络标签
        <input
          ref={netLabelInputRef}
          aria-label="电气网络标签"
          value={netLabel}
          onChange={(event) => onNetLabelChange(event.currentTarget.value)}
        />
      </label>
      <button type="button" onClick={onDeleteNetLabel}>
        Delete Net label
      </button>
      <ColorOverrideControl
        label="导线颜色"
        value={color}
        fallback={defaultColor}
        onChange={onColorChange}
      />
      <label>
        Direction arrow
        <select
          aria-label="导线方向箭头"
          value={arrow ?? "none"}
          onChange={(event) =>
            onArrowChange(
              event.currentTarget.value === "none"
                ? undefined
                : (event.currentTarget.value as "middle" | "end"),
            )
          }
        >
          <option value="none">无箭头</option>
          <option value="middle">箭头位于中点</option>
          <option value="end">箭头位于末端</option>
        </select>
      </label>
      <button type="button" onClick={onAddCurrentArrow}>
        Add current arrow
      </button>
      <button type="button" onClick={onToggleHighlight}>
        {highlightActive ? "清除网络高亮（H）" : "高亮网络（H）"}
      </button>
      <button type="button" onClick={onDeleteWire}>
        Delete wire
      </button>
    </section>
  );
}

export function EndpointActionsSection({
  kind,
  noConnect,
  endpointNetId,
  onDisconnect,
  onDeleteConnection,
  onToggleNoConnect,
  onDeleteJunction,
}: {
  kind: "terminal" | "junction" | null;
  noConnect: boolean;
  endpointNetId: string | null;
  onDisconnect: () => void;
  onDeleteConnection: () => void;
  onToggleNoConnect: () => void;
  onDeleteJunction: () => void;
}) {
  if (kind === "junction")
    return (
      <section className="context-actions" aria-label="连接点操作">
        <h2>连接点</h2>
        <button type="button" onClick={onDeleteJunction}>
          Delete junction and attached wires
        </button>
      </section>
    );
  if (kind !== "terminal") return null;
  return (
    <section className="context-actions" aria-label="端点操作">
      <h2>端点</h2>
      <button type="button" onClick={onDisconnect}>
        Disconnect endpoint
      </button>
      <button type="button" onClick={onDeleteConnection}>
        Delete connection
      </button>
      <button
        type="button"
        onClick={onToggleNoConnect}
        disabled={!noConnect && endpointNetId !== null}
      >
        {noConnect ? "清除 No Connect" : "标记 No Connect"}
      </button>
      {!noConnect && endpointNetId ? (
        <small>标记为 No Connect 前，请先断开此端点。</small>
      ) : null}
    </section>
  );
}

export function AnnotationActionsSection({
  kind,
  highlightActive,
  onReverseCurrentArrow,
  onDeleteCurrentArrow,
  onToggleHighlight,
}: {
  kind: "current-arrow" | "net-label" | null;
  highlightActive: boolean;
  onReverseCurrentArrow: () => void;
  onDeleteCurrentArrow: () => void;
  onToggleHighlight: () => void;
}) {
  if (kind === "current-arrow")
    return (
      <section className="context-actions" aria-label="电流箭头操作">
        <h2>电流箭头</h2>
        <button type="button" onClick={onReverseCurrentArrow}>
          Reverse direction (X)
        </button>
        <small>拖动可沿导线滑动，或移动其标签。</small>
        <button type="button" onClick={onDeleteCurrentArrow}>
          Delete current arrow
        </button>
      </section>
    );
  if (kind !== "net-label") return null;
  return (
    <section className="context-actions" aria-label="注释操作">
      <h2>注释</h2>
      <button type="button" onClick={onToggleHighlight}>
        {highlightActive ? "清除网络高亮（H）" : "高亮网络（H）"}
      </button>
    </section>
  );
}
