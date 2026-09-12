import type { SchematicDocument } from "@icm/model";

import { ToolIcon } from "../editor-shell/tool-icon";
import { PropertyDisclosure } from "./property-disclosure";

type Instance = SchematicDocument["instances"][number];

export function ComponentPlacementProperties({
  instance,
  x,
  y,
  rotation,
  draftChanged,
  onXChange,
  onYChange,
  onRotate,
  onMirror,
  onReturnToTray,
  onSwapOutputs,
  onSwapContactStyle,
  onSwapInputs,
  onDiscard,
  geometryControls = true,
}: {
  instance: Instance;
  x: string;
  y: string;
  rotation: string;
  draftChanged: boolean;
  onXChange: (value: string) => void;
  onYChange: (value: string) => void;
  onRotate: () => void;
  onMirror: (direction: "left-right" | "top-bottom") => void;
  onReturnToTray: () => void;
  onSwapOutputs?: () => void;
  onSwapContactStyle?: { label: string; run: () => void };
  onSwapInputs?: () => void;
  onDiscard: () => void;
  /** The composed dock edits coordinates and orientation as property code. */
  geometryControls?: boolean;
}) {
  return (
    <>
      {instance.importProvenance ? (
        <div className="property-card" aria-label="导入源依据">
          <div className="property-section-heading">导入源依据</div>
          <small>
            {instance.importProvenance.kind}:{" "}
            {instance.importProvenance.sourceTarget}
          </small>
        </div>
      ) : null}
      {instance.placement ? (
        <PropertyDisclosure
          title={geometryControls ? "位置" : "操作"}
          className="property-placement-card"
          ariaLabel={geometryControls ? "元件位置" : "元件操作"}
          defaultOpen
        >
          {geometryControls ? (
            <div
              className="component-geometry-row property-placement-controls"
              aria-label="元件几何属性"
            >
              <label className="property-coordinate-field">
                <span>X</span>
                <input
                  aria-label="元件 X 坐标"
                  inputMode="decimal"
                  value={x}
                  onChange={(event) => onXChange(event.currentTarget.value)}
                />
              </label>
              <label className="property-coordinate-field">
                <span>Y</span>
                <input
                  aria-label="元件 Y 坐标"
                  inputMode="decimal"
                  value={y}
                  onChange={(event) => onYChange(event.currentTarget.value)}
                />
              </label>
              <button
                type="button"
                className="property-placement-icon-button"
                aria-label={`Rotate component clockwise 90 degrees; current rotation ${rotation} degrees; shortcut R`}
                title={`Rotate 90° clockwise · current ${rotation}° (R)`}
                onClick={onRotate}
              >
                <ToolIcon name="rotate" />
              </button>
              <button
                type="button"
                className="property-placement-icon-button"
                aria-label="左右镜像元件，Shift+R"
                title="左右镜像（Shift+R）"
                onClick={() => onMirror("left-right")}
              >
                <ToolIcon name="mirror-horizontal" />
              </button>
              <button
                type="button"
                className="property-placement-icon-button"
                aria-label="上下镜像元件，Ctrl+R"
                title="上下镜像（Ctrl+R）"
                onClick={() => onMirror("top-bottom")}
              >
                <ToolIcon name="mirror-vertical" />
              </button>
            </div>
          ) : null}
          {instance.importProvenance ? (
            <button
              type="button"
              className="property-return-to-tray"
              aria-label="将元件放回待放置区"
              onClick={onReturnToTray}
            >
              放回待放置区
            </button>
          ) : null}
          {onSwapContactStyle ? (
            <div className="component-mirror-row" aria-label="开关绘图">
              <button
                type="button"
                data-testid="swap-switch-contact-style"
                aria-label={onSwapContactStyle.label}
                title={onSwapContactStyle.label}
                onClick={onSwapContactStyle.run}
              >
                {onSwapContactStyle.label}
              </button>
            </div>
          ) : null}
          {onSwapOutputs || onSwapInputs ? (
            <div
              className="component-mirror-row property-amplifier-actions"
              aria-label="放大器放置操作"
            >
              {onSwapOutputs ? (
                <button
                  type="button"
                  data-testid="swap-differential-outputs"
                  aria-label="交换 + 与 - 输出"
                  title="交换 + 与 - 输出"
                  onClick={onSwapOutputs}
                >
                  交换 + / − 输出
                </button>
              ) : null}
              {onSwapInputs ? (
                <button
                  type="button"
                  data-testid="swap-differential-inputs"
                  aria-label="交换 + 与 - 输入"
                  title="交换 + / - 输入（Ctrl+R）"
                  onClick={onSwapInputs}
                >
                  交换 + / − 输入
                </button>
              ) : null}
            </div>
          ) : null}
        </PropertyDisclosure>
      ) : null}
      {draftChanged ? (
        <button type="button" className="property-discard" onClick={onDiscard}>
          放弃更改
        </button>
      ) : null}
    </>
  );
}
