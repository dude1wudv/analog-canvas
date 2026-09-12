import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FileCommandMenu } from "./file-command-menu";
import { CLOUD_PROJECT_LIMIT } from "./cloud-projects";

describe("FileCommandMenu", () => {
  it("presents one Cloud Save protocol and explicit local interchange", () => {
    const markup = renderToStaticMarkup(
      <FileCommandMenu
        projectStoreLabel="云项目"
        projectStoreItemLabel="云项目"
        cloudProjects={[
          {
            id: "cloud-1",
            name: "Saved Circuit",
            updatedAt: "2026-08-28T10:00:00.000Z",
            revision: 3,
            schemaVersion: 28,
          },
        ]}
        activeCloudProjectId={null}
        canRevert
        hasRecoverySessions
        projectInputRef={createRef<HTMLInputElement>()}
        onNewProject={vi.fn()}
        onSave={vi.fn()}
        onRefreshCloudProjects={vi.fn()}
        onOpenCloudProject={vi.fn()}
        onDeleteCloudProject={vi.fn()}
        onRefresh={vi.fn()}
        onImportProject={vi.fn()}
        onImportSpice={vi.fn()}
        onExportProject={vi.fn()}
        onExportSvg={vi.fn()}
        onExportRaster={vi.fn()}
        onExportNetlist={vi.fn()}
        onRevert={vi.fn()}
        onOpenRecovery={vi.fn()}
      />,
    );

    expect(markup).not.toContain("Save as Cloud Copy");
    expect(markup).toContain(`云项目 (1/${CLOUD_PROJECT_LIMIT})`);
    expect(markup).toContain("Saved Circuit");
    expect(markup).toContain('class="cloud-project-time"');
    expect(markup).toContain("cloud-project-cloud-1");
    expect(markup).toContain("导入项目文件…");
    expect(markup).toContain("导入 SPICE…");
    expect(markup).toContain("从电路图识别 SPICE…");
    expect(markup).toContain("导入 Cadence SPICE（`!` 全局网络）…");
    expect(markup).toContain('data-testid="cadence-spice-files"');
    expect(markup).toContain("导出项目文件…");
    expect(markup).not.toContain("Download Backup");
    expect(markup).not.toContain("Previous Project");
    expect(markup).not.toContain("cloud snapshot");
  });

  it("identifies the isolated Preview Project store", () => {
    const markup = renderToStaticMarkup(
      <FileCommandMenu
        projectStoreLabel="预览项目"
        projectStoreItemLabel="预览项目"
        cloudProjects={[]}
        activeCloudProjectId={null}
        canRevert={false}
        hasRecoverySessions={false}
        projectInputRef={createRef<HTMLInputElement>()}
        onNewProject={vi.fn()}
        onSave={vi.fn()}
        onRefreshCloudProjects={vi.fn()}
        onOpenCloudProject={vi.fn()}
        onDeleteCloudProject={vi.fn()}
        onRefresh={vi.fn()}
        onImportProject={vi.fn()}
        onImportSpice={vi.fn()}
        onExportProject={vi.fn()}
        onExportSvg={vi.fn()}
        onExportRaster={vi.fn()}
        onExportNetlist={vi.fn()}
        onRevert={vi.fn()}
        onOpenRecovery={vi.fn()}
      />,
    );

    expect(markup).toContain(`预览项目 (0/${CLOUD_PROJECT_LIMIT})`);
  });
});
