import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EditorHelpDialog } from "./editor-help-dialog";

describe("EditorHelpDialog", () => {
  it("identifies the editor, package version, and project resources", () => {
    // About was a second entry saying what Help already frames, so its
    // content lives here as a section rather than in its own dialog.
    const markup = renderToStaticMarkup(
      <EditorHelpDialog closeButtonRef={{ current: null }} onClose={vi.fn()} />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("关于 Analog Canvas");
    expect(markup).toContain("版本 <strong>0.2.0</strong>");
    expect(markup).toContain(
      'href="https://github.com/dude1wudv/analog-canvas"',
    );
    expect(markup).toContain(
      'href="https://github.com/dude1wudv/analog-canvas/commits/main"',
    );
    expect(markup).toContain('href="https://www.tokenzhang.com"');
    expect(markup).toContain(">更新记录</a>");
    expect(markup).toContain(">所有者</a>");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
  });

  it("presents the focused shortcut set as scannable grouped rows", () => {
    const markup = renderToStaticMarkup(
      <EditorHelpDialog closeButtonRef={{ current: null }} onClose={vi.fn()} />,
    );
    const shortcuts = markup.slice(
      markup.indexOf('id="help-shortcuts"'),
      markup.indexOf('id="help-data"'),
    );

    expect(shortcuts).toContain("创建");
    expect(shortcuts).toContain("编辑");
    expect(shortcuts).toContain("工作区");
    expect(shortcuts.match(/class="help-shortcut-item"/gu)).toHaveLength(12);
    for (const key of ["I", "P", "W", "T", "Q", "U", "C", "R", "F"]) {
      expect(shortcuts).toContain(`>${key}</kbd>`);
    }
    expect(shortcuts).toContain("左右镜像");
    expect(shortcuts).toContain("上下镜像");
    expect(shortcuts).not.toContain("File and history");
    expect(shortcuts).not.toContain("Select all placed components");
  });

  it("describes explicit Cell authoring without a rectangle conversion", () => {
    const markup = renderToStaticMarkup(
      <EditorHelpDialog closeButtonRef={{ current: null }} onClose={vi.fn()} />,
    );

    expect(markup).toContain("管理 Cell…");
    expect(markup).toContain("放置 Cell");
    expect(markup).toContain("选中层次化模块");
    expect(markup).not.toContain("Select a rectangle");
    expect(markup).not.toContain("convert it into a hierarchical block");
    expect(markup).toContain("<strong>放置 Cell</strong>");
    expect(markup).toContain("<kbd>Shift+E</kbd>");
  });

  it("keeps prose separated from inline emphasis and shortcut keys", () => {
    const markup = renderToStaticMarkup(
      <EditorHelpDialog closeButtonRef={{ current: null }} onClose={vi.fn()} />,
    );

    for (const boundary of [
      "<strong>文件 / 保存</strong>更新正式云项目",
      "文件 / 刷新应用</strong>",
      "从<strong>绘制</strong>中选择绘图工具",
      "<strong>元件库</strong>",
      "导线（或按 <kbd>W</kbd>",
      "删除</kbd> 或 <kbd>Backspace</kbd>",
      "点击完成放置，按",
      "<strong>放置 Cell</strong>",
      "<kbd>Shift+E</kbd>",
    ]) {
      expect(markup).toContain(boundary);
    }
  });
});
