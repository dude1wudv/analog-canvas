import { useEffect, useRef } from "react";

import {
  ALL_SELECTION_FILTER,
  DEFAULT_SELECTION_FILTER,
  NO_SELECTION_FILTER,
  type SelectionClass,
  type SelectionFilter,
} from "./selection-filter";

const GROUPS: readonly {
  title: string;
  items: readonly { kind: SelectionClass; label: string }[];
}[] = [
  {
    title: "电路",
    items: [
      { kind: "instance", label: "实例" },
      { kind: "route", label: "导线" },
      { kind: "junction", label: "连接点" },
      { kind: "terminal", label: "引脚" },
    ],
  },
  {
    title: "电气文本",
    items: [
      { kind: "instance-name", label: "实例名称" },
      { kind: "instance-value", label: "实例值" },
      { kind: "net-name", label: "网络 / 电源名称" },
      { kind: "pin-name", label: "引脚名称" },
      { kind: "route-marker", label: "线路标记" },
    ],
  },
  {
    title: "标注",
    items: [
      { kind: "drafting-text", label: "说明文本 / 标注框" },
      { kind: "drafting-line", label: "直线 / 箭头" },
      { kind: "drafting-shape", label: "图形" },
    ],
  },
] as const;

export function SelectionFilterPopover({
  open,
  filter,
  onChange,
  onClose,
}: {
  open: boolean;
  filter: SelectionFilter;
  onChange: (filter: SelectionFilter) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <aside
      ref={rootRef}
      className="selection-filter-popover"
      data-testid="selection-filter-popover"
      role="dialog"
      aria-modal="false"
      aria-labelledby="selection-filter-title"
    >
      <header>
        <div>
          <p className="selection-filter-kicker">选择</p>
          <h2 id="selection-filter-title">选择筛选器</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭选择筛选器">
          关闭
        </button>
      </header>
      <div className="selection-filter-presets" aria-label="筛选预设">
        <button type="button" onClick={() => onChange(ALL_SELECTION_FILTER)}>
          全部
        </button>
        <button type="button" onClick={() => onChange(NO_SELECTION_FILTER)}>
          无
        </button>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_SELECTION_FILTER)}
        >
          默认
        </button>
      </div>
      {GROUPS.map((group) => (
        <fieldset key={group.title}>
          <legend>{group.title}</legend>
          {group.items.map((item) => (
            <label key={item.kind}>
              <input
                type="checkbox"
                checked={filter[item.kind]}
                onChange={(event) =>
                  onChange({
                    ...filter,
                    [item.kind]: event.currentTarget.checked,
                  })
                }
              />
              <span>{item.label}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <small>
        Controls direct selection and editing. Drawing, simulation, visibility,
        connectivity, and wire follow during device moves stay unchanged.
      </small>
    </aside>
  );
}
