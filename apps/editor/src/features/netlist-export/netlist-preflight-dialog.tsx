import {
  createDesignNetlistExport,
  unfinishedDrawingDiagnostics,
} from "@icm/netlist";
import type { Diagnostic } from "@icm/derived";
import type {
  NetlistDiagnostic,
  NetlistFormat,
  NetlistNamingProfile,
} from "@icm/netlist";
import type { CircuitProject } from "@icm/model";
import { useMemo, useState } from "react";

/** Presentation-only composition of structural analysis and current ERC. */
export function NetlistPreflightDialog({
  open,
  project,
  electricalDiagnostics,
  onClose,
  onNavigate,
  onNavigateElectrical,
  onExport,
  format,
  rootDocumentId,
}: {
  open: boolean;
  project: CircuitProject;
  format: NetlistFormat;
  rootDocumentId?: string | undefined;
  electricalDiagnostics: readonly Diagnostic[];
  onClose(): void;
  onNavigate(diagnostic: NetlistDiagnostic): void;
  onNavigateElectrical(diagnostic: Diagnostic): void;
  onExport(namingProfile: NetlistNamingProfile): void;
}) {
  const [namingProfile, setNamingProfile] =
    useState<NetlistNamingProfile>("native");
  const result = useMemo(
    () =>
      createDesignNetlistExport(project, {
        format,
        namingProfile,
        ...(rootDocumentId ? { rootDocumentId } : {}),
      }),
    [format, namingProfile, project, rootDocumentId],
  );
  // The same finding repeated once per object says nothing many times over;
  // count it instead. Seven identical lines was most of what the report said.
  const groupedFindings = useMemo(() => {
    const groups = new Map<
      string,
      {
        code: string;
        message: string;
        count: number;
        sample: NetlistDiagnostic;
      }
    >();
    for (const diagnostic of result.diagnostics) {
      const key = `${diagnostic.code}\u0000${diagnostic.message}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else {
        groups.set(key, {
          code: diagnostic.code,
          message: diagnostic.message,
          count: 1,
          sample: diagnostic,
        });
      }
    }
    return [...groups.values()];
  }, [result.diagnostics]);
  const preview = result.status === "ready" ? result.file.text : null;
  if (!open) return null;
  const errors = result.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  // A drawing with a node only one pin reaches prints, but handing that out
  // as a netlist would pass off an unfinished schematic as a finished one.
  const unfinished = unfinishedDrawingDiagnostics(result.diagnostics);
  const exportable = result.status === "ready" && unfinished.length === 0;
  const blocking = unfinished.length > 0 ? unfinished.length : errors.length;
  const readiness = !exportable
    ? `${blocking} 项阻止导出的问题`
    : electricalDiagnostics.length > 0
      ? "结构已就绪；请检查电气问题"
      : "可以导出";
  const hasDiagnostics =
    result.diagnostics.length > 0 || electricalDiagnostics.length > 0;
  return (
    <div
      className="insert-dialog-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="netlist-preflight-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="netlist-preflight-title"
      >
        <header className="netlist-preflight-header">
          <div>
            <p>标准设计网表分析</p>
            <h2 id="netlist-preflight-title">检查报告</h2>
          </div>
        </header>
        <section className="netlist-preflight-summary" aria-label="就绪状态">
          <h3>{readiness}</h3>
          {exportable && result.status === "ready" ? (
            <p>
              内部 Cell：{result.cellCount}；外部接口：
              {result.externalMasterCount}。
            </p>
          ) : (
            <p>复制网表前请先解决结构问题。</p>
          )}
        </section>
        <div
          className="netlist-preflight-body"
          data-has-preview={exportable ? "true" : "false"}
          data-has-diagnostics={hasDiagnostics ? "true" : "false"}
        >
          {exportable && result.status === "ready" ? (
            <section
              className="netlist-preflight-export"
              aria-label="结构化网表"
            >
              <div className="netlist-preflight-export-controls">
                <label>
                  命名方案
                  <select
                    aria-label="网表命名方案"
                    value={namingProfile}
                    onChange={(event) =>
                      setNamingProfile(
                        event.currentTarget.value as NetlistNamingProfile,
                      )
                    }
                  >
                    <option value="native">原生声明</option>
                    <option value="cadence-bang">Cadence `!` 全局网络</option>
                  </select>
                </label>
                <button type="button" onClick={() => onExport(namingProfile)}>
                  复制 {format === "spice" ? "SPICE" : "Spectre"} 网表
                </button>
              </div>
              <pre
                className="netlist-preview"
                data-testid="netlist-preview"
                aria-label="结构化网表预览"
              >
                {preview}
              </pre>
            </section>
          ) : null}
          {hasDiagnostics ? (
            <aside
              className="netlist-preflight-diagnostics"
              aria-label="网表诊断"
            >
              {result.diagnostics.length > 0 ? (
                <section aria-label="预检结果">
                  <h3>检查结果</h3>
                  <ul className="preflight-findings">
                    {groupedFindings.map((group) => (
                      <li key={`${group.code}-${group.message}`}>
                        <button
                          type="button"
                          data-severity={group.sample.severity}
                          onClick={() => onNavigate(group.sample)}
                        >
                          <strong>{group.code}</strong>
                          <span>
                            {group.message}
                            {group.count > 1 ? ` (×${group.count})` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {electricalDiagnostics.length > 0 ? (
                <section aria-label="电气检查结果">
                  <h3>电气检查（{electricalDiagnostics.length}）</h3>
                  <p>
                    这些问题与 ERC
                    和画廊检查使用相同的当前版本连通性评估。保存是独立操作，尚未完成的工作也可以保存。
                  </p>
                  <ul className="preflight-findings">
                    {electricalDiagnostics.map((diagnostic) => (
                      <li key={diagnostic.id}>
                        <button
                          type="button"
                          data-severity={diagnostic.severity}
                          onClick={() => onNavigateElectrical(diagnostic)}
                        >
                          <strong>{diagnostic.code}</strong>
                          <span>{diagnostic.message}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          ) : null}
        </div>
        <footer className="netlist-preflight-actions">
          <button
            type="button"
            data-testid="check-report-close"
            onClick={onClose}
          >
            关闭
          </button>
        </footer>
      </section>
    </div>
  );
}
