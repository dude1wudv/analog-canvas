import {
  diagnosticPresentationGroup,
  hasBlockingVisualDiagnostics,
} from "@icm/derived";
import type {
  Diagnostic,
  DiagnosticSeverity,
  GlobalNetTraceHop,
  HierarchyNetTrace,
  HierarchyNetTraceHop,
  LiveDiagnosticSnapshot,
  VisualDiagnostic,
} from "@icm/derived";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SpiceDiagnostic } from "@icm/spice";

import type { EditorTool } from "../../interaction/interaction-state";

export interface SelectionInspectorSnapshot {
  selected: string;
  internalRouteCount: number;
  revision: number;
  sourceStatus: string;
  documentCount: number;
  activeDocumentId: string;
  activeInstanceCount: number;
  projectInstanceCount: number;
  netCount: number;
  tool: EditorTool;
  flightlineCount: number;
  crossingCount: number;
  annotationCount: number;
  status: string;
}

export interface VisualDiagnosticSummary {
  all: readonly VisualDiagnostic[];
  structural: readonly VisualDiagnostic[];
  observations: readonly VisualDiagnostic[];
  blockingCount: number;
}

export interface SelectionInspectorDetailsProps {
  snapshot: SelectionInspectorSnapshot;
  importReport: SpiceImportReport | null;
}

export interface SpiceImportReport {
  entryPath: string;
  diagnostics: readonly SpiceDiagnostic[];
}

export function summarizeVisualDiagnostics(
  diagnostics: readonly VisualDiagnostic[],
): VisualDiagnosticSummary {
  return {
    all: diagnostics,
    structural: diagnostics.filter(
      (diagnostic) => diagnostic.category === "structural",
    ),
    observations: diagnostics.filter(
      (diagnostic) => diagnostic.category === "observation",
    ),
    blockingCount: diagnostics.filter((diagnostic) =>
      hasBlockingVisualDiagnostics([diagnostic]),
    ).length,
  };
}

export function SelectionInspectorDetails({
  snapshot,
  importReport,
}: SelectionInspectorDetailsProps) {
  return (
    <>
      <dl className="inspector">
        <dt>已选择</dt>
        <dd>{snapshot.selected}</dd>
        <dt>内部线路</dt>
        <dd data-testid="selected-internal-route-count">
          {snapshot.internalRouteCount}
        </dd>
        <dt>修订版本</dt>
        <dd data-testid="revision">{snapshot.revision}</dd>
        <dt>源文件状态</dt>
        <dd data-testid="source-status">{snapshot.sourceStatus}</dd>
        <dt>文档</dt>
        <dd data-testid="document-count">{snapshot.documentCount}</dd>
        <dt>当前文档</dt>
        <dd data-testid="active-document-id">{snapshot.activeDocumentId}</dd>
        <dt>文档实例</dt>
        <dd data-testid="active-instance-count">
          {snapshot.activeInstanceCount}
        </dd>
        <dt>实例</dt>
        <dd data-testid="instance-count">{snapshot.projectInstanceCount}</dd>
        <dt>网络</dt>
        <dd data-testid="net-count">{snapshot.netCount}</dd>
        <dt>工具</dt>
        <dd data-testid="active-tool">{snapshot.tool}</dd>
        <dt>飞线</dt>
        <dd data-testid="flightline-count">{snapshot.flightlineCount}</dd>
        <dt>交叉点</dt>
        <dd data-testid="crossing-count">{snapshot.crossingCount}</dd>
        <dt>注释</dt>
        <dd data-testid="annotation-count">{snapshot.annotationCount}</dd>
        <dt>状态</dt>
        <dd aria-live="polite">{snapshot.status}</dd>
      </dl>
      <section aria-label="SPICE 导入报告" className="diagnostics">
        <h2>SPICE 导入报告</h2>
        <p data-testid="import-report-lifecycle">
          Historical messages captured while importing{" "}
          {importReport?.entryPath ?? "the current source"}; they are not
          current ERC results.
        </p>
        {!importReport || importReport.diagnostics.length === 0 ? (
          <p>没有导入消息</p>
        ) : null}
        <ul data-testid="import-report-diagnostics">
          {importReport?.diagnostics.map((diagnostic, index) => (
            <li
              key={`${diagnostic.code}-${index}`}
              data-severity={diagnostic.severity}
            >
              <strong>{diagnostic.code}</strong>: {diagnostic.message}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export interface ProjectDiagnosticsSectionProps {
  snapshot: LiveDiagnosticSnapshot | null;
  checkStatus?: import("../../app/project-check").ProjectCheckStatus;
  checkError?: string | null;
  documentLabel(documentId: string): string;
  onSelectDiagnostic(diagnostic: Diagnostic): void;
  /**
   * Increment to expand and reveal the issues section from outside — the
   * statusbar badge's click. The section stays user-collapsible afterwards.
   */
  focusRequestToken?: number;
  /** Reports the section's expanded state — the canvas review-mode gate. */
  onOpenStateChange?(open: boolean): void;
}

export interface NetTraceSectionProps {
  trace: HierarchyNetTrace;
  documentLabel(documentId: string): string;
  onNavigateHop(hop: HierarchyNetTraceHop | GlobalNetTraceHop): void;
}

type NetTraceHop = HierarchyNetTraceHop | GlobalNetTraceHop;

function netTraceHopDetail(hop: NetTraceHop): string {
  return hop.direction === "global"
    ? hop.foldedName
    : `${hop.frame.instanceId}.${hop.frame.parentPinName}`;
}

function netTraceHopAction(hop: NetTraceHop): string {
  if (hop.direction === "global") return "全局";
  return hop.direction === "down" ? "进入" : "返回";
}

/** Concrete hierarchy edges for the currently highlighted logical Net. */
export function NetTraceSection({
  trace,
  documentLabel,
  onNavigateHop,
}: NetTraceSectionProps) {
  return (
    <section
      aria-label="层次化网络追踪"
      className="diagnostics erc-diagnostics net-trace"
    >
      <h2>Hierarchy Net trace ({trace.highlights.length} Cells)</h2>
      <ul data-testid="net-trace-hops">
        {trace.hops.map((hop, index) => (
          <li
            key={`${hop.direction}-${hop.from.documentId}-${hop.from.netId}-${netTraceHopDetail(hop)}-${index}`}
          >
            <button
              type="button"
              data-testid={`net-trace-hop-${index}`}
              onClick={() => onNavigateHop(hop)}
            >
              <strong>{netTraceHopAction(hop)}</strong>:{" "}
              {netTraceHopDetail(hop)} → {documentLabel(hop.to.documentId)} /{" "}
              {hop.to.netId}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type DiagnosticSeverityFilter = "all" | DiagnosticSeverity;

const DIAGNOSTIC_SEVERITY_FILTERS: readonly DiagnosticSeverityFilter[] = [
  "all",
  "error",
  "warning",
  "info",
];

function DiagnosticFilters({
  diagnostics,
  severityFilter,
  onSeverityFilterChange,
}: {
  diagnostics: readonly Diagnostic[];
  severityFilter: DiagnosticSeverityFilter;
  onSeverityFilterChange(filter: DiagnosticSeverityFilter): void;
}) {
  const filters = DIAGNOSTIC_SEVERITY_FILTERS.filter(
    (filter) =>
      filter === "all" ||
      diagnostics.some((diagnostic) => diagnostic.severity === filter),
  );
  return (
    <div className="diagnostic-filters" aria-label="问题严重程度">
      {filters.map((filter) => {
        const count =
          filter === "all"
            ? diagnostics.length
            : diagnostics.filter((diagnostic) => diagnostic.severity === filter)
                .length;
        return (
          <button
            key={filter}
            type="button"
            data-testid={`diagnostic-severity-${filter}`}
            aria-pressed={severityFilter === filter}
            onClick={() => onSeverityFilterChange(filter)}
          >
            {filter === "all" ? "All" : filter} ({count})
          </button>
        );
      })}
    </div>
  );
}

/** Project-wide diagnostic workbench for compatible, locator-backed domains. */
export function ProjectDiagnosticsSection({
  snapshot,
  checkStatus = "current",
  checkError = null,
  documentLabel,
  onSelectDiagnostic,
  focusRequestToken = 0,
  onOpenStateChange,
}: ProjectDiagnosticsSectionProps) {
  const diagnostics = snapshot?.diagnostics ?? [];
  const [severityFilter, setSeverityFilter] =
    useState<DiagnosticSeverityFilter>("all");
  const [showObservations, setShowObservations] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(
    () =>
      focusRequestToken > 0 ||
      diagnostics.some(
        (diagnostic) =>
          diagnostic.severity === "error" &&
          diagnosticPresentationGroup(diagnostic) === "actionable",
      ),
  );
  const [handledFocusToken, setHandledFocusToken] = useState(focusRequestToken);
  const sectionRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    onOpenStateChange?.(sectionOpen);
  }, [onOpenStateChange, sectionOpen]);
  useEffect(() => {
    if (focusRequestToken <= handledFocusToken) return;
    setHandledFocusToken(focusRequestToken);
    setSectionOpen(true);
    sectionRef.current?.scrollIntoView({ block: "nearest" });
  }, [focusRequestToken, handledFocusToken]);
  const observationCount = diagnostics.filter(
    (diagnostic) => diagnosticPresentationGroup(diagnostic) === "observation",
  ).length;
  const availableDiagnostics = useMemo(
    () =>
      showObservations
        ? diagnostics
        : diagnostics.filter(
            (diagnostic) =>
              diagnosticPresentationGroup(diagnostic) === "actionable",
          ),
    [diagnostics, showObservations],
  );
  const visibleDiagnostics = useMemo(
    () =>
      availableDiagnostics.filter(
        (diagnostic) =>
          severityFilter === "all" || diagnostic.severity === severityFilter,
      ),
    [availableDiagnostics, severityFilter],
  );
  const hasBlockingIssue = availableDiagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  );
  const previousBlockingRef = useRef(hasBlockingIssue);
  useEffect(() => {
    // Preserve the pre-existing behavior: a blocking issue APPEARING opens
    // the section; the user can still collapse it afterwards.
    if (hasBlockingIssue && !previousBlockingRef.current) setSectionOpen(true);
    previousBlockingRef.current = hasBlockingIssue;
  }, [hasBlockingIssue]);
  return (
    <section aria-label="项目诊断" className="diagnostics erc-diagnostics">
      <details
        ref={sectionRef}
        open={sectionOpen || undefined}
        onToggle={(event) => setSectionOpen(event.currentTarget.open)}
      >
        <summary>
          <h2>
            问题{" "}
            {checkStatus === "unchecked" || checkStatus === "failed"
              ? ""
              : `(${availableDiagnostics.length})`}
          </h2>
          <span>{hasBlockingIssue ? "需要处理" : "查看"}</span>
        </summary>
        <div className="diagnostics-body">
          {checkStatus !== "current" ? (
            <p data-testid="diagnostic-check-state" role="status">
              {checkStatus === "stale"
                ? "上次检查已过期，请使用“检查并保存”重新检查。"
                : checkStatus === "failed"
                  ? `检查失败：${checkError ?? "未知错误"}。保存操作不受影响。`
                  : checkStatus === "checking"
                    ? "正在检查…"
                    : "尚未检查。请使用“检查并保存”检查 ERC 和视觉问题。"}
            </p>
          ) : null}
          {observationCount > 0 ? (
            <button
              type="button"
              data-testid="diagnostic-observations-toggle"
              aria-pressed={showObservations}
              onClick={() => setShowObservations((current) => !current)}
            >
              {showObservations ? "隐藏" : "显示"}非阻断性观察项（
              {observationCount}）
            </button>
          ) : null}
          <DiagnosticFilters
            diagnostics={availableDiagnostics}
            severityFilter={severityFilter}
            onSeverityFilterChange={setSeverityFilter}
          />
          {availableDiagnostics.length === 0 && checkStatus === "current" ? (
            <p data-testid="no-current-diagnostics">当前没有需要处理的诊断</p>
          ) : availableDiagnostics.length > 0 &&
            visibleDiagnostics.length === 0 ? (
            <p data-testid="no-matching-diagnostics">
              没有符合当前筛选条件的诊断
            </p>
          ) : null}
          <ul data-testid="project-diagnostics">
            {visibleDiagnostics.map((diagnostic) => (
              <li
                key={diagnostic.id}
                data-domain={diagnostic.domain}
                data-document-id={diagnostic.primary.documentId}
                data-severity={diagnostic.severity}
                data-confidence={diagnostic.confidence}
                data-presentation={diagnosticPresentationGroup(diagnostic)}
              >
                <button
                  type="button"
                  data-testid={`project-diagnostic-${diagnostic.id}`}
                  disabled={checkStatus !== "current"}
                  onClick={() => onSelectDiagnostic(diagnostic)}
                >
                  <strong>
                    {diagnostic.domain.toUpperCase()} / {diagnostic.code}
                  </strong>
                  : {diagnostic.message}
                  <small>
                    Cell: {documentLabel(diagnostic.primary.documentId)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
