import { useState } from "react";
import {
  parseWaveformRange,
  zoomWaveformRange,
  type WaveformController,
  type WaveformRange,
} from "./waveform-view";

export function WaveformTools({
  controller: c,
  plotKey,
  x,
  y,
  xUnit,
  yUnit,
  logarithmicX = false,
  onOpen,
}: {
  controller: WaveformController;
  plotKey: string;
  x: WaveformRange;
  y: WaveformRange;
  xUnit: string;
  yUnit: string;
  logarithmicX?: boolean;
  onOpen?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const fit = (axis: "xy" | "x" | "y") =>
    c.commit({
      x: axis === "y" ? x : undefined,
      y: { ...c.view.y, [plotKey]: axis === "x" ? y : undefined },
    });
  const zoom = (factor: number) =>
    c.commit({
      x: c.state.axes === "y" ? x : zoomWaveformRange(x, factor, logarithmicX),
      y:
        c.state.axes === "x"
          ? { ...c.view.y, [plotKey]: y }
          : { ...c.view.y, [plotKey]: zoomWaveformRange(y, factor) },
    });
  return (
    <div
      className={`ac-plot-toolbar waveform-tools${editing ? " expanded" : ""}`}
      aria-label="绘图工具"
      tabIndex={0}
    >
      <span className="waveform-tools-hint" aria-hidden="true">
        工具
      </span>
      <div className="waveform-tool-actions">
        <button
          type="button"
          aria-label="上一视图"
          disabled={c.state.index === 0}
          onClick={() => c.travel(-1)}
        >
          ↶
        </button>
        <button
          type="button"
          aria-label="下一视图"
          disabled={c.state.index === c.state.history.length - 1}
          onClick={() => c.travel(1)}
        >
          ↷
        </button>
        <div role="group" aria-label="受控坐标轴">
          {(["xy", "x", "y"] as const).map((axis) => (
            <button
              type="button"
              key={axis}
              aria-label={`控制 ${axis.toUpperCase()} 轴`}
              aria-pressed={c.state.axes === axis}
              onClick={() => c.set("axes", axis)}
            >
              {axis.toUpperCase()}
            </button>
          ))}
        </div>
        <div role="group" aria-label="缩放与适应">
          <button type="button" aria-label="缩小" onClick={() => zoom(1.7)}>
            −
          </button>
          <button type="button" aria-label="放大" onClick={() => zoom(0.6)}>
            +
          </button>
          <button
            type="button"
            aria-label="适合绘图区"
            onClick={() => fit("xy")}
          >
            适合
          </button>
          <button type="button" aria-label="适合 X 轴" onClick={() => fit("x")}>
            适合 X 轴
          </button>
          <button type="button" aria-label="适合 Y 轴" onClick={() => fit("y")}>
            适合 Y 轴
          </button>
          <button
            type="button"
            aria-expanded={editing}
            onClick={() => setEditing(!editing)}
          >
            范围
          </button>
        </div>
        <div role="group" aria-label="当前标记">
          {(["A", "B"] as const).map((marker) => (
            <button
              key={marker}
              type="button"
              aria-label={`Place marker ${marker}`}
              aria-pressed={c.state.activeMarker === marker}
              onClick={() => c.set("activeMarker", marker)}
            >
              {marker}
            </button>
          ))}
          <button
            type="button"
            aria-label="清除标记"
            disabled={
              c.state.markers.A === undefined && c.state.markers.B === undefined
            }
            onClick={() => c.set("markers", {})}
          >
            ×│
          </button>
        </div>
        {onOpen && (
          <button type="button" aria-label="打开绘图" onClick={onOpen}>
            ⛶
          </button>
        )}
      </div>
      {editing && (
        <WaveformRangeEditor
          x={x}
          y={y}
          xUnit={xUnit}
          yUnit={yUnit}
          xAuto={c.view.x === undefined}
          yAuto={c.view.y[plotKey] === undefined}
          logarithmicX={logarithmicX}
          onCancel={() => setEditing(false)}
          onApply={(nextX, nextY) => {
            c.commit({ x: nextX, y: { ...c.view.y, [plotKey]: nextY } });
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function WaveformRangeEditor({
  x,
  y,
  xAuto,
  yAuto,
  xUnit,
  yUnit,
  logarithmicX,
  onApply,
  onCancel,
}: {
  x: WaveformRange;
  y: WaveformRange;
  xAuto: boolean;
  yAuto: boolean;
  xUnit: string;
  yUnit: string;
  logarithmicX: boolean;
  onApply(x: WaveformRange | undefined, y: WaveformRange | undefined): void;
  onCancel(): void;
}) {
  const [autoX, setAutoX] = useState(xAuto),
    [autoY, setAutoY] = useState(yAuto);
  const [bounds, setBounds] = useState({
    x0: String(x[0]),
    x1: String(x[1]),
    y0: String(y[0]),
    y1: String(y[1]),
  });
  const [error, setError] = useState("");
  return (
    <form
      className="waveform-range-editor"
      aria-label="坐标轴范围"
      onSubmit={(event) => {
        event.preventDefault();
        const nextX = autoX
          ? undefined
          : parseWaveformRange(bounds.x0, bounds.x1, logarithmicX);
        const nextY = autoY
          ? undefined
          : parseWaveformRange(bounds.y0, bounds.y1);
        if (typeof nextX === "string" || typeof nextY === "string") {
          setError(typeof nextX === "string" ? `X: ${nextX}` : `Y: ${nextY}`);
          return;
        }
        onApply(nextX, nextY);
      }}
    >
      <div className="waveform-range-grid">
        {(["x", "y"] as const).map((axis) => (
          <fieldset key={axis}>
            <legend>
              {axis.toUpperCase()} ({axis === "x" ? xUnit : yUnit})
            </legend>
            <label className="waveform-range-auto">
              <input
                type="checkbox"
                aria-label={`Auto ${axis.toUpperCase()}`}
                checked={axis === "x" ? autoX : autoY}
                onChange={(event) =>
                  (axis === "x" ? setAutoX : setAutoY)(event.target.checked)
                }
              />
              自动
            </label>
            {([0, 1] as const).map((index) => (
              <label key={index}>
                <span>{index === 0 ? "Min" : "Max"}</span>
                <input
                  aria-label={`${axis.toUpperCase()} ${index === 0 ? "minimum" : "maximum"}`}
                  value={bounds[`${axis}${index}`]}
                  disabled={axis === "x" ? autoX : autoY}
                  onChange={(event) =>
                    setBounds({
                      ...bounds,
                      [`${axis}${index}`]: event.target.value,
                    })
                  }
                />
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="waveform-range-actions">
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button type="submit">应用范围</button>
      </div>
    </form>
  );
}

export function WaveformMeasurements({
  a,
  b,
  unit,
  rows,
  time = false,
}: {
  a: number | undefined;
  b: number | undefined;
  unit: string;
  rows: readonly { label: string; unit: string; a?: number; b?: number }[];
  time?: boolean;
}) {
  if (a === undefined && b === undefined) return null;
  const format = (value: number | undefined) =>
    value === undefined ? "—" : Number(value.toPrecision(8)).toString();
  return (
    <div className="ac-cursor-readout" role="status" aria-label="标记测量值">
      <strong>
        A: {format(a)} {unit} · B: {format(b)} {unit}
        {a !== undefined && b !== undefined && (
          <>
            {" "}
            · ΔX: {format(b - a)} {unit}
            {time && b !== a && (
              <> · 1/|Δt|: {format(1 / Math.abs(b - a))} Hz</>
            )}
          </>
        )}
      </strong>
      {rows.map((row) => (
        <span key={row.label}>
          {row.label}: A {format(row.a)} · B {format(row.b)}
          {row.a !== undefined && row.b !== undefined && (
            <> · ΔY {format(row.b - row.a)}</>
          )}{" "}
          {row.unit}
        </span>
      ))}
    </div>
  );
}
