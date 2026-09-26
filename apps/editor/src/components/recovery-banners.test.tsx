import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  RecoveryAvailableBanner,
  recoveryStateLabel,
} from "./recovery-banners";

describe("recovery banners", () => {
  it("keeps normal recovery writes silent and exposes only failures", () => {
    expect(recoveryStateLabel("idle")).toBeNull();
    expect(recoveryStateLabel("pending")).toBeNull();
    expect(recoveryStateLabel("stored")).toBeNull();
    expect(recoveryStateLabel("failed")).toContain("恢复失败");
  });

  it("offers non-modal restore, backup, and ignore actions", () => {
    const html = renderToStaticMarkup(
      <RecoveryAvailableBanner
        projectName="OTA"
        updatedAt="2026-08-28T08:30:00.000Z"
        onRestore={vi.fn()}
        onDownload={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(html).toContain("startup-recovery-banner");
    expect(html).toContain("OTA");
    expect(html).toContain("恢复");
    expect(html).toContain("下载备份");
    expect(html).toContain("忽略");
    expect(html).not.toContain('role="dialog"');
  });
});
