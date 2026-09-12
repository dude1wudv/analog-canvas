import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  createAiConfiguration,
  parseModelNames,
  validateAiConfiguration,
  type AiConfiguration,
} from "./ai-configuration";
import { testAiConnection } from "./image-spice";
import "./image-spice.css";

export function AiSettingsDialog({
  configurations,
  onChange,
  onClose,
}: {
  configurations: AiConfiguration[];
  onChange: (configurations: AiConfiguration[]) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<AbortController | null>(null);
  const [selected, setSelected] = useState(configurations[0]?.id ?? "");
  const [draft, setDraft] = useState<AiConfiguration>(
    configurations[0] ?? createAiConfiguration(),
  );
  const [modelsText, setModelsText] = useState(draft.models.join("\n"));
  const [testModel, setTestModel] = useState(draft.models[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      pending.current?.abort();
      element?.close();
    };
  }, []);

  function edit(patch: Partial<AiConfiguration>) {
    setDraft({ ...draft, ...patch });
    setNotice("");
    setError("");
  }
  function choose(value: AiConfiguration, id = value.id) {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setSelected(id);
    setDraft(value);
    setModelsText(value.models.join("\n"));
    setTestModel(value.models[0] ?? "");
    setNotice("");
    setError("");
  }
  const models = parseModelNames(modelsText);
  const currentTestModel = models.includes(testModel)
    ? testModel
    : (models[0] ?? "");
  function configured(): AiConfiguration {
    const value = {
      ...draft,
      name: draft.name.trim(),
      baseUrl: draft.baseUrl.trim(),
      apiKey: draft.apiKey.trim(),
      models,
    };
    validateAiConfiguration(value);
    return value;
  }
  function save() {
    try {
      const value = configured();
      if (!selected && configurations.length >= 20)
        throw new Error("最多配置 20 组接口。");
      onChange(
        selected
          ? configurations.map((item) => (item.id === selected ? value : item))
          : [...configurations, value],
      );
      setSelected(value.id);
      setNotice("配置已应用到当前页面，可以返回图片识别使用。");
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "配置无效。");
    }
  }
  async function test() {
    let value: AiConfiguration;
    try {
      value = configured();
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    const timer = window.setTimeout(() => controller.abort("timeout"), 30_000);
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await testAiConnection({
        ...value,
        model: currentTestModel,
        signal: controller.signal,
      });
      if (pending.current === controller)
        setNotice(
          `连接成功 · ${currentTestModel} · ${result.latencyMs} ms · 支持图片请求`,
        );
    } catch (failure) {
      if (pending.current === controller) setError((failure as Error).message);
    } finally {
      window.clearTimeout(timer);
      if (pending.current === controller) {
        setBusy(false);
        pending.current = null;
      }
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="image-spice-dialog ai-settings-dialog"
      aria-labelledby="ai-settings-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header>
        <div>
          <span className="ai-eyebrow">ANALOG CANVAS / AI</span>
          <h2 id="ai-settings-title">AI 接口设置</h2>
          <p>管理视觉模型、密钥与连接，随时切换识图配置。</p>
        </div>
        <button type="button" onClick={onClose}>
          完成
        </button>
      </header>
      <div className="ai-settings-layout">
        <nav aria-label="已配置接口" className="ai-provider-list">
          {configurations.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected === item.id}
              disabled={busy}
              onClick={() => choose(item)}
            >
              <strong>{item.name}</strong>
              <small>
                {item.models.length} 个模型 ·{" "}
                {item.protocol === "responses" ? "Responses" : "Chat"} · Key
                已配置
              </small>
            </button>
          ))}
          <button
            type="button"
            disabled={busy || configurations.length >= 20}
            onClick={() => choose(createAiConfiguration(), "")}
          >
            ＋ 添加接口 / Key
          </button>
          <p className="image-spice-note">
            同一个接口可添加多组
            Key；每组可配置多个模型。不会自动轮换或重试计费请求。
          </p>
        </nav>
        <section aria-label="接口配置">
          <label>
            配置名称
            <input
              value={draft.name}
              maxLength={80}
              disabled={busy}
              onChange={(event) => edit({ name: event.target.value })}
            />
          </label>
          <label>
            API 地址
            <input
              type="url"
              placeholder="https://your-api.example/v1"
              value={draft.baseUrl}
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => edit({ baseUrl: event.target.value })}
            />
          </label>
          <label>
            API 协议
            <select
              value={draft.protocol}
              disabled={busy}
              onChange={(event) =>
                edit({
                  protocol: event.target.value as AiConfiguration["protocol"],
                })
              }
            >
              <option value="chat-completions">Chat Completions</option>
              <option value="responses">Responses API</option>
            </select>
          </label>
          <label>
            API Key
            <input
              type="password"
              value={draft.apiKey}
              disabled={busy}
              autoComplete="off"
              onChange={(event) => edit({ apiKey: event.target.value })}
            />
          </label>
          <label>
            思考强度
            <select
              value={draft.reasoningEffort}
              disabled={busy}
              onChange={(event) =>
                edit({
                  reasoningEffort: event.target
                    .value as AiConfiguration["reasoningEffort"],
                })
              }
            >
              <option value="low">low（更快）</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="max">max（最强）</option>
            </select>
          </label>
          <label>
            模型列表（每行一个 ID）
            <textarea
              value={modelsText}
              rows={4}
              disabled={busy}
              spellCheck={false}
              placeholder="vision-model-1&#10;vision-model-2"
              onChange={(event) => {
                setModelsText(event.target.value);
                setNotice("");
                setError("");
              }}
            />
          </label>
          <div className="ai-test-row">
            <label>
              测试模型
              <select
                value={currentTestModel}
                disabled={busy || !models.length}
                onChange={(event) => {
                  setTestModel(event.target.value);
                  setNotice("");
                }}
              >
                {models.map((model) => (
                  <option key={model}>{model}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !models.length}
              onClick={() => void test()}
            >
              {busy ? "测试中…" : "测试连通性"}
            </button>
            {busy && (
              <button
                type="button"
                onClick={() => pending.current?.abort("cancel")}
              >
                取消测试
              </button>
            )}
          </div>
          <p className="image-spice-note">
            测试会通过所选协议向模型发送一张微小图片，可能产生少量 API
            费用。接口需支持 HTTPS、图片输入和浏览器 CORS。
          </p>
          <div className="image-spice-actions">
            <button
              type="button"
              className="ai-primary"
              disabled={busy}
              onClick={save}
            >
              应用配置
            </button>
            {selected && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onChange(
                    configurations.filter((item) => item.id !== selected),
                  );
                  choose(createAiConfiguration(), "");
                }}
              >
                删除此配置
              </button>
            )}
          </div>
          {notice && (
            <p role="status" className="ai-success">
              {notice}
            </p>
          )}
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
      <footer>
        <p className="image-spice-note">
          所有 Key
          只保留在当前页面内存，刷新或离开页面后清除；不会写入项目或上传本站。关闭设置窗口后仍可在本页识图使用。
        </p>
      </footer>
    </dialog>,
    document.body,
  );
}
