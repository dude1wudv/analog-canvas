import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AiConfiguration } from "./ai-configuration";

import {
  MAX_SPICE_CHARACTERS,
  recognizeCircuitImage,
  validateImageFile,
  validateStructuralSpice,
  type StructuralSpiceReview,
} from "./image-spice";
import "./image-spice.css";

export interface ImageSpiceDialogProps {
  onClose: () => void;
  onImport: (file: File) => void;
  configurations: AiConfiguration[];
  onOpenSettings: () => void;
}

export function ImageSpiceDialog({
  onClose,
  onImport,
  configurations,
  onOpenSettings,
}: ImageSpiceDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const [configurationId, setConfigurationId] = useState(
    configurations[0]?.id ?? "",
  );
  const [model, setModel] = useState("");
  const configuration =
    configurations.find((item) => item.id === configurationId) ??
    configurations[0];
  const currentModel = configuration?.models.includes(model)
    ? model
    : (configuration?.models[0] ?? "");
  const [image, setImage] = useState<{ name: string; dataUrl: string } | null>(
    null,
  );
  const [spice, setSpice] = useState("");
  const [uncertainties, setUncertainties] = useState<string[]>([]);
  const [review, setReview] = useState<StructuralSpiceReview | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState<"image" | "recognize" | "check" | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      generation.current++;
      pending.current?.abort();
      element?.close();
    };
  }, []);

  function cancel() {
    generation.current++;
    pending.current?.abort();
    pending.current = null;
    setBusy(null);
  }

  async function chooseImage(file: File | undefined) {
    if (!file) return;
    cancel();
    const request = generation.current;
    setImage(null);
    setSpice("");
    setReview(null);
    setReviewed(false);
    setUncertainties([]);
    setError("");
    setBusy("image");
    try {
      validateImageFile(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("无法读取图片，请重新选择。"));
        reader.readAsDataURL(file);
      });
      const decoded = new Image();
      decoded.src = dataUrl;
      await decoded.decode();
      if (decoded.width * decoded.height > 40_000_000)
        throw new Error("图片分辨率过大，请裁剪到 4000 万像素以内。");
      if (request === generation.current)
        setImage({ name: file.name, dataUrl });
    } catch (failure) {
      if (request === generation.current)
        setError(failure instanceof Error ? failure.message : "无法读取图片。");
    } finally {
      if (request === generation.current) setBusy(null);
    }
  }

  async function recognize() {
    if (!image || busy || !configuration || !currentModel) return;
    const controller = new AbortController();
    pending.current = controller;
    const request = ++generation.current;
    const timeout = window.setTimeout(() => controller.abort(), 120_000);
    setBusy("recognize");
    setError("");
    setReview(null);
    setReviewed(false);
    // A new attempt cannot leave an old result available for accidental import.
    setSpice("");
    setUncertainties([]);
    try {
      const result = await recognizeCircuitImage({
        baseUrl: configuration.baseUrl,
        apiKey: configuration.apiKey,
        model: currentModel,
        imageDataUrl: image.dataUrl,
        signal: controller.signal,
      });
      if (request !== generation.current) return;
      setSpice(result.spice);
      setUncertainties(result.uncertainties);
      setBusy("check");
      const checked = await validateStructuralSpice(result.spice);
      if (request === generation.current) setReview(checked);
    } catch (failure) {
      if (request === generation.current)
        setError(
          failure instanceof Error ? failure.message : "识别失败，请重试。",
        );
    } finally {
      window.clearTimeout(timeout);
      if (request === generation.current) {
        setBusy(null);
        pending.current = null;
      }
    }
  }

  async function check() {
    const request = ++generation.current;
    setBusy("check");
    setReview(null);
    setReviewed(false);
    setError("");
    const checked = await validateStructuralSpice(spice);
    if (request === generation.current) {
      setReview(checked);
      setBusy(null);
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="image-spice-dialog"
      aria-labelledby="image-spice-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header>
        <div>
          <h2 id="image-spice-title">从电路图识别 SPICE</h2>
          <p>上传图片 → AI 识别 → 核对连接 → 导入工程</p>
        </div>
        <button type="button" aria-label="关闭图片识别" onClick={onClose}>
          关闭
        </button>
      </header>
      <div className="image-spice-columns">
        <section aria-label="图片与 AI 接口">
          <label>
            电路图（PNG / JPEG / WebP，最大 10 MiB）
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy !== null}
              onChange={(event) => {
                void chooseImage(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {image && (
            <figure>
              <img src={image.dataUrl} alt="待识别的电路图" />
              <figcaption>{image.name}</figcaption>
            </figure>
          )}
          <div className="ai-config-card">
            <label>
              使用的接口 / Key
              <select
                value={configuration?.id ?? ""}
                disabled={busy !== null || !configurations.length}
                onChange={(event) => {
                  setConfigurationId(event.target.value);
                  setModel("");
                }}
              >
                {!configurations.length && (
                  <option value="">请先添加 AI 配置</option>
                )}
                {configurations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              识别模型
              <select
                value={currentModel}
                disabled={busy !== null || !configuration}
                onChange={(event) => setModel(event.target.value)}
              >
                {(configuration?.models ?? []).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={onOpenSettings}
            >
              管理 AI 接口与模型…
            </button>
          </div>
          <p className="image-spice-note">
            图片将直接发送到所选接口。可先在 AI
            设置中测试模型连通性，再进行识别。
          </p>
          <div className="image-spice-actions">
            <button
              type="button"
              disabled={
                !image || !configuration || !currentModel || busy !== null
              }
              onClick={() => void recognize()}
            >
              识别电路图
            </button>
            {busy && (
              <button type="button" onClick={cancel}>
                取消
              </button>
            )}
          </div>
        </section>
        <section aria-label="识别结果">
          <label>
            结构 SPICE（可编辑）
            <textarea
              value={spice}
              rows={14}
              maxLength={MAX_SPICE_CHARACTERS}
              spellCheck={false}
              disabled={busy !== null}
              placeholder="识别后在这里核对和修正网表，也可粘贴结构 SPICE。"
              onChange={(event) => {
                setSpice(event.target.value);
                setReview(null);
                setReviewed(false);
              }}
            />
          </label>
          <div className="image-spice-actions">
            <button
              type="button"
              disabled={!spice.trim() || busy !== null}
              onClick={() => void check()}
            >
              检查 SPICE
            </button>
            <button
              type="button"
              disabled={!review?.canImport || busy !== null}
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([spice], { type: "text/plain;charset=utf-8" }),
                );
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "image.cir";
                anchor.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              下载 .cir
            </button>
          </div>
          {uncertainties.length > 0 && (
            <div className="image-spice-issues">
              <strong>AI 报告的不确定项（请逐项修正或核对）</strong>
              <ul>
                {uncertainties.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {review && (
            <div aria-live="polite">
              <p>
                {review.canImport
                  ? `结构可导入：${review.instanceCount} 个器件`
                  : "结构尚不可导入，请修正后重新检查。"}
              </p>
              {review.diagnostics.length > 0 && (
                <ul>
                  {review.diagnostics.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
              {review.connections.length > 0 && (
                <details open>
                  <summary>核对器件引脚 → 网络</summary>
                  <div className="image-spice-networks">
                    <table>
                      <thead>
                        <tr>
                          <th>器件</th>
                          <th>引脚 → 网络</th>
                        </tr>
                      </thead>
                      <tbody>
                        {review.connections.map((connection, index) => (
                          <tr key={index}>
                            <td>{connection.reference}</td>
                            <td>{connection.pins.join("； ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
          <p className="image-spice-note">
            检查仅确认结构能被导入，不能证明 AI
            与原图一致。第一版保留电气连接，器件进入 Placement
            Tray，不还原图中位置；模型占位不代表可仿真。
          </p>
          <label className="image-spice-confirm">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={!review?.canImport || busy !== null}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            我已对照原图核对连接和不确定项
          </label>
        </section>
      </div>
      <footer>
        <div role="status">
          {busy === "recognize"
            ? "正在识别，最多等待 2 分钟…"
            : busy === "image"
              ? "正在读取图片…"
              : busy === "check"
                ? "正在检查结构…"
                : ""}
        </div>
        {error && <p role="alert">{error}</p>}
        <button
          type="button"
          disabled={!review?.canImport || !reviewed || busy !== null}
          onClick={() => {
            onImport(new File([spice], "image.cir", { type: "text/plain" }));
            onClose();
          }}
        >
          通过 Import SPICE 建立工程
        </button>
      </footer>
    </dialog>,
    document.body,
  );
}
