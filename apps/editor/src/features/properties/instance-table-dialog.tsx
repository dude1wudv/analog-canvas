import {
  buildProjectInstanceIndex,
  type ProjectConnectivityIndex,
  type ProjectInstanceRow,
} from "@icm/derived";
import {
  planBatchProperty,
  planReferenceRenumber,
  type ProjectStructureEdit,
} from "@icm/edit-engine";
import type { CircuitProject } from "@icm/model";
import { useMemo, useState } from "react";

export interface InstanceTableDialogProps {
  open: boolean;
  project: CircuitProject;
  connectivityIndex: ProjectConnectivityIndex;
  activeDocumentId: string;
  onClose(): void;
  onOpenInstance(documentId: string, instanceId: string): void;
  onApply(transactionId: string, edits: ProjectStructureEdit[]): boolean;
}

function rowKey(row: ProjectInstanceRow): string {
  return `${row.documentId}\u0000${row.instanceId}`;
}

function referenceIssueLabel(row: ProjectInstanceRow): string {
  return row.referenceIssues
    .map((issue) => {
      if (issue.code === "DUPLICATE_REFERENCE") {
        return `Duplicate with ${issue.otherInstanceId ?? "another instance"}`;
      }
      if (issue.code === "WRONG_REFERENCE_PREFIX") {
        return "Wrong reference prefix";
      }
      return "Reference required";
    })
    .join("; ");
}

/**
 * Explicit project table for inspector-grade review and controlled batch
 * writes. It is intentionally separate from the canvas Properties dock, so
 * selection and ordinary single-instance editing retain their current flow.
 */
export function InstanceTableDialog({
  open,
  project,
  connectivityIndex,
  activeDocumentId,
  onClose,
  onOpenInstance,
  onApply,
}: InstanceTableDialogProps) {
  const [scope, setScope] = useState<"active" | "project">("active");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [fieldKind, setFieldKind] = useState<
    "parameter" | "model-target" | "reference-renumber"
  >("parameter");
  const [parameterName, setParameterName] = useState("l");
  const [value, setValue] = useState("");
  const [renumberPolicy, setRenumberPolicy] = useState<
    "fill-gaps" | "continuous"
  >("fill-gaps");
  const [startAt, setStartAt] = useState("1");

  const index = useMemo(
    () =>
      buildProjectInstanceIndex(project, {
        connectivityIndex,
      }),
    [connectivityIndex, project],
  );
  const rows = index
    .search(query)
    .filter(
      (row) => scope === "project" || row.documentId === activeDocumentId,
    );
  const targets = index.rows
    .filter((row) => selected.has(rowKey(row)))
    .map((row) => ({ documentId: row.documentId, instanceId: row.instanceId }));
  const propertyPreview = planBatchProperty(
    project,
    targets,
    fieldKind === "parameter"
      ? { kind: "parameter", name: parameterName.trim() }
      : { kind: "model-target" },
    value,
  );
  const parsedStartAt = Number(startAt);
  const referencePreview = planReferenceRenumber(project, targets, {
    policy: renumberPolicy,
    startAt:
      Number.isSafeInteger(parsedStartAt) && parsedStartAt > 0
        ? parsedStartAt
        : 1,
  });
  const edits =
    fieldKind === "reference-renumber"
      ? referencePreview.edits
      : propertyPreview.edits;
  const applicableCount =
    fieldKind === "reference-renumber"
      ? referencePreview.reassigned.length
      : propertyPreview.applicable.length;
  const allVisibleSelected =
    rows.length > 0 && rows.every((row) => selected.has(rowKey(row)));

  if (!open) return null;
  const toggleRow = (row: ProjectInstanceRow): void => {
    const key = rowKey(row);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleVisible = (): void => {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of rows) {
        const key = rowKey(row);
        if (allVisibleSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  return (
    <div
      className="search-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="instance-table-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="instance-table-title"
      >
        <header>
          <div>
            <p className="help-kicker">项目编辑</p>
            <h2 id="instance-table-title">实例表</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭实例表">
            关闭
          </button>
        </header>
        <div className="instance-table-controls">
          <label>
            Scope
            <select
              aria-label="实例表范围"
              value={scope}
              onChange={(event) =>
                setScope(event.currentTarget.value as "active" | "project")
              }
            >
              <option value="active">当前 Cell</option>
              <option value="project">项目</option>
            </select>
          </label>
          <label>
            搜索
            <input
              aria-label="搜索实例"
              value={query}
              placeholder="位号、符号、模型…"
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
          <button
            type="button"
            onClick={toggleVisible}
            disabled={rows.length === 0}
          >
            {allVisibleSelected ? "Clear visible" : "Select visible"}
          </button>
        </div>
        <div className="instance-table-scroll">
          <table>
            <thead>
              <tr>
                <th aria-label="选择" />
                <th>ID</th>
                <th>网表位号</th>
                <th>主单元</th>
                <th>符号</th>
                <th>Cell</th>
                <th>调用方</th>
                <th>目标</th>
                <th>参数</th>
                <th>检查</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.reference ?? row.instanceId}`}
                      checked={selected.has(rowKey(row))}
                      onChange={() => toggleRow(row)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="instance-table-link"
                      onClick={() =>
                        onOpenInstance(row.documentId, row.instanceId)
                      }
                    >
                      {row.instanceId}
                    </button>
                  </td>
                  <td>{row.reference ?? "—"}</td>
                  <td>{row.masterName ?? "—"}</td>
                  <td>{row.symbolId}</td>
                  <td>{row.documentName}</td>
                  <td>
                    {row.callerPaths.length === 0
                      ? "Top"
                      : `${row.callerPaths.length} definition use${row.callerPaths.length === 1 ? "" : "s"}`}
                  </td>
                  <td>{row.binding?.kind ?? "—"}</td>
                  <td>
                    {Object.entries(row.parameters)
                      .map(([name, parameter]) => `${name}=${parameter}`)
                      .join(", ") || "—"}
                  </td>
                  <td>{referenceIssueLabel(row) || "OK"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p>此作用域内没有匹配的实例。</p> : null}
        </div>
        <footer className="instance-table-batch" aria-label="批量属性编辑器">
          <label>
            Field
            <select
              aria-label="批量字段"
              value={fieldKind}
              onChange={(event) =>
                setFieldKind(
                  event.currentTarget.value as
                    "parameter" | "model-target" | "reference-renumber",
                )
              }
            >
              <option value="parameter">网表参数</option>
              <option value="model-target">模型目标</option>
              <option value="reference-renumber">位号重编号</option>
            </select>
          </label>
          {fieldKind === "parameter" ? (
            <label>
              名称
              <input
                aria-label="参数名称"
                value={parameterName}
                onChange={(event) =>
                  setParameterName(event.currentTarget.value)
                }
              />
            </label>
          ) : null}
          {fieldKind === "reference-renumber" ? (
            <>
              <label>
                Policy
                <select
                  aria-label="位号重编号策略"
                  value={renumberPolicy}
                  onChange={(event) =>
                    setRenumberPolicy(
                      event.currentTarget.value as "fill-gaps" | "continuous",
                    )
                  }
                >
                  <option value="fill-gaps">填补空缺 / 修复</option>
                  <option value="continuous">连续</option>
                </select>
              </label>
              <label>
                Start at
                <input
                  aria-label="位号起始序号"
                  inputMode="numeric"
                  value={startAt}
                  onChange={(event) => setStartAt(event.currentTarget.value)}
                />
              </label>
            </>
          ) : (
            <label>
              值
              <input
                aria-label="批量值"
                value={value}
                placeholder={
                  fieldKind === "parameter"
                    ? "Empty clears"
                    : "Empty clears target"
                }
                onChange={(event) => setValue(event.currentTarget.value)}
              />
            </label>
          )}
          <span aria-live="polite">
            {fieldKind === "reference-renumber"
              ? `${referencePreview.reassigned.length} reassign · ${referencePreview.preserved.length} preserved · ${referencePreview.skipped.length} skipped`
              : `${propertyPreview.applicable.length} ready · ${propertyPreview.unchanged.length} unchanged · ${propertyPreview.incompatible.length} incompatible · ${propertyPreview.blocked.length} blocked`}
          </span>
          <button
            type="button"
            className="primary"
            disabled={edits.length === 0}
            onClick={() => {
              const transactionId =
                fieldKind === "reference-renumber"
                  ? "batch-instance-renumber"
                  : "batch-instance-property";
              if (onApply(transactionId, [...edits])) {
                setSelected(new Set());
              }
            }}
          >
            Apply to {applicableCount}
          </button>
        </footer>
      </section>
    </div>
  );
}
