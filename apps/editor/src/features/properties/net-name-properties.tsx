export interface NetNamePropertiesProps {
  annotationId: string;
  authoredScope: "local" | "global";
  editableScope: boolean;
  effectiveScope: "local" | "global";
  preferredSpelling?: string;
  spellings: readonly string[];
  onScopeChange: (scope: "local" | "global") => void;
}

/** Owner-scoped authoring plus read-only revision-scoped export projection. */
export function NetNameProperties({
  annotationId,
  authoredScope,
  editableScope,
  effectiveScope,
  preferredSpelling,
  spellings,
  onScopeChange,
}: NetNamePropertiesProps) {
  return (
    <section
      className="property-section net-name-properties"
      aria-label="网络标识"
    >
      <div className="property-section-heading">网络标识</div>
      <label>
        Label scope
        <select
          key={`${annotationId}-${authoredScope}`}
          aria-label="网络标签作用域"
          value={authoredScope}
          disabled={!editableScope}
          onChange={(event) =>
            onScopeChange(event.currentTarget.value as "local" | "global")
          }
        >
          <option value="local">Cell 内局部</option>
          <option value="global">跨 Cell 全局</option>
        </select>
      </label>
      <dl className="component-readonly-fields">
        <div>
          <dt>有效作用域</dt>
          <dd>
            {effectiveScope === "global" ? (
              <span className="net-scope-badge" data-scope="global">
                Global
              </span>
            ) : (
              "Local"
            )}
          </dd>
        </div>
        <div>
          <dt>首选导出拼写</dt>
          <dd>{preferredSpelling ?? "Unnamed"}</dd>
        </div>
        {spellings.length > 1 ? (
          <div className="net-spelling-variants">
            <dt>拼写变体</dt>
            <dd>{spellings.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
      <small>
        Scope edits this Label claim only. Wire membership and source provenance
        are unchanged.
      </small>
    </section>
  );
}
