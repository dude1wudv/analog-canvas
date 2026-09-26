import { applyLabelSubscriptCase } from "../text-editing/label-subscript-case";
import {
  lazy,
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SchematicDocument } from "@icm/model";
import type { PropertyJsonEditorAdapter } from "../properties/component-property-json-editor";

import {
  documentSettingsCodeValue,
  defaultDocumentSettingsCode,
  formatDocumentSettingsCode,
  parseDocumentSettingsCode,
  serializeDocumentSettingsCode,
  type CanvasPreferenceCodeValue,
  type DocumentSettingsCodeValue,
} from "./document-settings-code";
import {
  documentSettingsCodeChanges,
  documentSettingsCodeSpans,
} from "./document-settings-code-assists";

const PropertyJsonEditor = lazy(
  () => import("../properties/component-property-json-editor"),
);

export interface DocumentSettingsSectionProps {
  document: SchematicDocument;
  canvas: CanvasPreferenceCodeValue;
  onApply(
    value: DocumentSettingsCodeValue,
    current: DocumentSettingsCodeValue,
    applyLabels: typeof applyLabelSubscriptCase,
  ): { ok: true } | { ok: false; message: string };
}

/** One plain JSON surface for every Document-wide and editor preference. */
export function DocumentSettingsSection({
  document,
  canvas,
  onApply,
}: DocumentSettingsSectionProps) {
  const baseline = useMemo(
    () => formatDocumentSettingsCode(document, canvas),
    [canvas, document],
  );
  const previousBaseline = useRef(baseline);
  const appliedCode = useRef<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [draft, setDraft] = useState(baseline);
  const [message, setMessage] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const adapter = useMemo<PropertyJsonEditorAdapter>(
    () => ({
      parse: (source) => parseDocumentSettingsCode(source, document),
      spans: (source) => documentSettingsCodeSpans(source, document),
      changes: (source, values) =>
        documentSettingsCodeChanges(source, document, values),
    }),
    [document],
  );

  useLayoutEffect(() => {
    const ownEdit = appliedCode.current;
    appliedCode.current = null;
    if (previousBaseline.current === baseline && ownEdit === null) return;
    previousBaseline.current = baseline;
    if (ownEdit !== baseline) setDraft(baseline);
    if (ownEdit === null) setHistoryKey((key) => key + 1);
    setMessage(null);
    setRejected(false);
  }, [baseline]);

  const parsed = useMemo(
    () => parseDocumentSettingsCode(draft, document),
    [document, draft],
  );
  const status =
    message ??
    (parsed.ok ? null : `${parsed.message} · 画布将保留上次有效的修改`);

  function change(source: string): void {
    setDraft(source);
    setMessage(null);
    setRejected(false);
    const next = parseDocumentSettingsCode(source, document);
    if (!next.ok) return;
    const normalized = serializeDocumentSettingsCode(next.value);
    if (normalized === baseline) return;
    const result = onApply(
      next.value,
      documentSettingsCodeValue(document, canvas),
      applyLabelSubscriptCase,
    );
    if (!result.ok) {
      setMessage(result.message);
      setRejected(true);
      return;
    }
    appliedCode.current = normalized;
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage("已复制属性 JSON");
    } catch {
      setMessage("剪贴板不可用；请选择代码并手动复制");
    }
  }

  return (
    <section
      className="component-property-code-editor document-settings-code-editor"
      aria-label="文档设置"
      data-testid="document-settings-code-editor"
    >
      <header>
        <strong>属性代码</strong>
        <div className="component-property-header-actions">
          <button
            type="button"
            className="component-property-help"
            onClick={() =>
              change(defaultDocumentSettingsCode(document, canvas))
            }
          >
            恢复默认值
          </button>
          {(!parsed.ok || rejected) && (
            <button
              type="button"
              className="component-property-copy"
              aria-label="放弃属性草稿"
              title="放弃无效的属性草稿"
              onClick={() => {
                setDraft(baseline);
                setMessage(null);
                setRejected(false);
              }}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
          <button
            type="button"
            className="component-property-copy"
            aria-label="复制属性 JSON"
            title="复制属性 JSON"
            onClick={() => void copy()}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <rect x="7" y="7" width="10" height="10" rx="1.5" />
              <path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7" />
            </svg>
          </button>
        </div>
      </header>
      <Suspense
        fallback={
          <textarea
            aria-label="正在加载属性代码"
            value={draft}
            readOnly
            rows={20}
          />
        }
      >
        <PropertyJsonEditor
          value={draft}
          historyKey={historyKey}
          adapter={adapter}
          defaultForeground="#000000"
          ariaLabel="可编辑的属性代码"
          onChange={change}
        />
      </Suspense>
      {status ? (
        <div className="component-property-code-status" aria-live="polite">
          <span>{status}</span>
        </div>
      ) : null}
    </section>
  );
}
