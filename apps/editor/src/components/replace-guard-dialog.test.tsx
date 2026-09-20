import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReplaceGuardDialog } from "./replace-guard-dialog";

describe("ReplaceGuardDialog", () => {
  it("states the consequence and distinguishes Cloud Save from file export", () => {
    const html = renderToStaticMarkup(
      <ReplaceGuardDialog
        intent="Open OTA.icproj.json"
        cloudProjectLimit={7}
        saving={false}
        onCancel={vi.fn()}
        onSaveAndContinue={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(html).toContain("有未保存的更改");
    expect(html).toContain("会丢弃最新编辑");
    // The copy states whatever limit it is handed, never a number of its own.
    expect(html).toContain("Cloud Projects (up to 7).");
    expect(html).toContain("Export Project File");
    expect(html).toContain("downloads <code>.icproj.json</code>");
    expect(html).toContain("保存到云端并继续");
    expect(html).toContain("不保存并继续");
    expect(html).toContain("留在此处");
    expect(html).not.toContain("Browser recovery");
  });

  it("disables every decision while Cloud Save is in progress", () => {
    const html = renderToStaticMarkup(
      <ReplaceGuardDialog
        intent="Create a new Project"
        cloudProjectLimit={7}
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
