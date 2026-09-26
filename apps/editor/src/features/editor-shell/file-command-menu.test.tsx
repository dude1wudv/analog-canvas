import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FileCommandMenu } from "./file-command-menu";
import { CLOUD_PROJECT_LIMIT } from "./cloud-projects";

describe("FileCommandMenu", () => {
  it("presents one Cloud Save protocol and explicit local interchange", () => {
    const markup = renderToStaticMarkup(
      <FileCommandMenu
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
        checkAndSave={{ enabled: true, execute: vi.fn() }}
        projectInputRef={createRef<HTMLInputElement>()}
        onNewProject={vi.fn()}
        onSave={vi.fn()}
        onRefreshCloudProjects={vi.fn()}
        onOpenCloudProject={vi.fn()}
        onDeleteCloudProject={vi.fn()}
        onImportProject={vi.fn()}
        onImportSpice={vi.fn()}
        onExportProject={vi.fn()}
        onExportSvg={vi.fn()}
        onExportRaster={vi.fn()}
        onRevert={vi.fn()}
        onOpenRecovery={vi.fn()}
      />,
    );

    expect(markup).not.toContain("Save as Cloud Copy");
    expect(markup).toContain(`云项目 (1/${CLOUD_PROJECT_LIMIT})`);
    expect(markup).toContain('data-testid="file-cloud-project-list"');
    expect(markup).toContain('aria-labelledby="file-cloud-projects-label"');
    expect(markup).toContain("Saved Circuit");
    expect(markup).toContain('class="cloud-project-time"');
    expect(markup).toContain("cloud-project-cloud-1");
    expect(markup).toContain(">导入<");
    expect(markup).toContain("项目文件…");
    expect(markup).toContain("SPICE / SCS 文件…");
    expect(markup).toContain("Cadence SPICE（`!` 全局节点）…");
    expect(markup).toContain('data-testid="cadence-spice-files"');
    expect(markup).toContain(">导出<");
    expect(markup).toContain("图纸为 SVG");
    expect(markup).toContain("恢复未保存的内容…");
    expect(markup).not.toContain("Refresh app");
    expect(markup).not.toContain("Copy SPICE netlist");
    expect(markup).not.toContain("Copy Spectre netlist");
    expect(markup).not.toContain("Download Backup");
    expect(markup).not.toContain("Previous Project");
    expect(markup).not.toContain("cloud snapshot");
  });
});
