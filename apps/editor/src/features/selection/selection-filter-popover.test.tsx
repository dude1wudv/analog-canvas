import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SelectionFilterPopover } from "./selection-filter-popover";
import { DEFAULT_SELECTION_FILTER } from "./selection-filter";

describe("SelectionFilterPopover", () => {
  it("exposes grouped current selection classes and presets", () => {
    const markup = renderToStaticMarkup(
      <SelectionFilterPopover
        open
        filter={DEFAULT_SELECTION_FILTER}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(markup).toContain('data-testid="selection-filter-popover"');
    expect(markup).toContain("选择筛选器");
    expect(markup).toContain("实例");
    expect(markup).toContain("导线");
    expect(markup).toContain("网络 / 电源名称");
    expect(markup).toContain("说明文本 / 标注框");
    expect(markup).toContain(">全部<");
    expect(markup).toContain(">无<");
    expect(markup).toContain(">默认<");
  });

  it("renders nothing while closed", () => {
    expect(
      renderToStaticMarkup(
        <SelectionFilterPopover
          open={false}
          filter={DEFAULT_SELECTION_FILTER}
          onChange={vi.fn()}
          onClose={vi.fn()}
        />,
      ),
    ).toBe("");
  });
});
