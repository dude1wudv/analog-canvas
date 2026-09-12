import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReplaceGuardDialog } from "./replace-guard-dialog";

describe("ReplaceGuardDialog", () => {
  it("states the consequence and distinguishes Cloud Save from file export", () => {
    const html = renderToStaticMarkup(
      <ReplaceGuardDialog
        intent="Open OTA.icproj.json"
        saving={false}
        onCancel={vi.fn()}
        onSaveAndContinue={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(html).toContain("有未保存的更改");
    expect(html).toContain("会丢弃最新编辑");
    expect(html).toContain("云项目中（最多 3");
    expect(html).toContain("导出项目文件");
    expect(html).toContain(".icproj.json");
    expect(html).toContain("保存到云端并继续");
    expect(html).toContain("不保存并继续");
    expect(html).toContain("留在此处");
    expect(html).not.toContain("Browser recovery");
  });

  it("disables every decision while Cloud Save is in progress", () => {
    const html = renderToStaticMarkup(
      <ReplaceGuardDialog
        intent="Create a new Project"
        saving={true}
        onCancel={vi.fn()}
        onSaveAndContinue={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(html).toContain("正在保存到云端…");
    expect(html).toContain("disabled");
  });
});
