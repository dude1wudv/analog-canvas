import { lazy, Suspense } from "react";
import { resolveEndpointPoint, type MosBulkResolution } from "@icm/derived";
import type { WireSource } from "@icm/edit-engine";
import type { ItemPropertyIdentity } from "../properties/item-property-code";
import type { Annotation, SchematicDocument } from "@icm/model";
import type { SymbolResolver } from "@icm/symbols";
import type { RoutingGuidanceView } from "../../interaction/interaction-state";

import type { GroupPropertyCodeEditorProps } from "../properties/group-property-code-editor";
import type { RoutePropertyCodeValue } from "../properties/route-property-code";
import { ToolIcon } from "../editor-shell/tool-icon";

const GroupPropertyCodeEditor = lazy(() =>
  import("../properties/property-editors").then((module) => ({
    default: module.GroupPropertyCodeEditor,
  })),
);
const RoutePropertyCodeEditor = lazy(() =>
  import("../properties/property-editors").then((module) => ({
    default: module.RoutePropertyCodeEditor,
  })),
);
const LazyItemPropertySummary = lazy(() =>
  import("../properties/property-editors").then((module) => ({
    default: module.ItemPropertySummary,
  })),
);
function ItemPropertySummary(props: {
  item: ItemPropertyIdentity;
  color: string;
}) {
  return (
    <Suspense fallback={<p role="status">Loading properties…</p>}>
      <LazyItemPropertySummary {...props} />
    </Suspense>
  );
}

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

export function GroupPropertiesSection({
  active,
  ...properties
}: { active: boolean } & GroupPropertyCodeEditorProps) {
  if (!active) return null;
  return (
    <Suspense fallback={<p role="status">Loading properties…</p>}>
      <GroupPropertyCodeEditor key={properties.selectionKey} {...properties} />
    </Suspense>
  );
}

export function RouteActionsSection({
  active,
  document,
  route,
  resolver,
  netLabel,
  bulkOwnerLabel,
  defaultColor,
  highlightActive,
  onApply,
  onToggleHighlight,
  onDeleteWire,
}: {
  active: boolean;
  document: SchematicDocument;
  route: SchematicDocument["routes"][number] | null;
  resolver?: SymbolResolver;
  netLabel: Annotation | null;
  bulkOwnerLabel?: string | null;
  defaultColor: string;
  highlightActive: boolean;
  onApply: (value: RoutePropertyCodeValue) => { ok: boolean; message?: string };
  onToggleHighlight: () => void;
  onDeleteWire: () => void;
}) {
  if (!active || !route) return null;
  if (bulkOwnerLabel) {
    return (
      <section className="context-actions" aria-label="MOS bulk route actions">
        <h2>Bulk connection</h2>
        <ItemPropertySummary
          item={{
            type: "bulk-wire",
            name: route.id,
            coordinate: (() => {
              const point = resolver
                ? resolveEndpointPoint(document, resolver, route.start)
                : null;
              return point ? [point.x, point.y] : null;
            })(),
          }}
          color={defaultColor}
        />
        <p>
          Follows <strong>{bulkOwnerLabel}</strong> line color.
        </p>
        <button type="button" onClick={onDeleteWire}>
          Delete bulk connection
        </button>
      </section>
    );
  }
  return (
    <section className="context-actions" aria-label="Route actions">
      <Suspense fallback={<p role="status">Loading properties…</p>}>
        <RoutePropertyCodeEditor
          {...(resolver ? { resolver } : {})}
          key={route.id}
          document={document}
          route={route}
          netLabel={netLabel}
          defaultColor={defaultColor}
          onApply={onApply}
          actions={
            <div className="route-property-code-actions">
              <button type="button" onClick={onToggleHighlight}>
                {highlightActive
                  ? "Clear Net highlight (H)"
                  : "Highlight Net (H)"}
              </button>
              <button type="button" onClick={onDeleteWire}>
                Delete wire
              </button>
            </div>
          }
        />
      </Suspense>
    </section>
  );
}

export function EndpointActionsSection({
  item,
  color = "auto",
  kind,
  noConnect,
  endpointNetId,
  onDisconnect,
  onDeleteConnection,
  onToggleNoConnect,
  onDeleteJunction,
}: {
  item?: WireSource | null;
  color?: string;
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
        {item && (
          <ItemPropertySummary
            item={{
              type: "junction",
              name:
                item.endpoint.kind === "junction"
                  ? item.endpoint.junctionId
                  : "",
              coordinate: [
                item.connection.contactPoint.x,
                item.connection.contactPoint.y,
              ],
            }}
            color={color}
          />
        )}
        <button type="button" onClick={onDeleteJunction}>
          Delete junction and attached wires
        </button>
      </section>
    );
  if (kind !== "terminal") return null;
  return (
    <section className="context-actions" aria-label="端点操作">
      <h2>端点</h2>
      {item && (
        <ItemPropertySummary
          item={{
            type: "terminal",
            name:
              item.endpoint.kind === "terminal"
                ? `${item.endpoint.instanceId}.${item.endpoint.pinName}`
                : "",
            coordinate: [
              item.connection.contactPoint.x,
              item.connection.contactPoint.y,
            ],
          }}
          color={color}
        />
      )}
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
  onDeleteCurrentArrow,
  onToggleHighlight,
}: {
  kind: "current-arrow" | "net-label" | null;
  highlightActive: boolean;
  onDeleteCurrentArrow: () => void;
  onToggleHighlight: () => void;
}) {
  if (kind === "current-arrow")
    return (
      <section className="context-actions" aria-label="Current arrow actions">
        <h2>Current arrow</h2>
        <small>This legacy annotation can be removed from the drawing.</small>
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
