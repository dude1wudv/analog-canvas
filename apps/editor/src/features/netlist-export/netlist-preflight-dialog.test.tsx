import type { Diagnostic } from "@icm/derived";
import { createEmptyProject } from "@icm/model";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NetlistPreflightDialog } from "./netlist-preflight-dialog";

describe("NetlistPreflightDialog", () => {
  it("shows current electrical readiness separately from structural analysis", () => {
    const project = createEmptyProject("project", "Project", "main");
    project.documents[0]!.netlist = undefined;
    const electrical: Diagnostic = {
      id: "erc:unconnected:main:M1:D",
      domain: "erc",
      code: "ERC_UNCONNECTED_PIN",
      severity: "warning",
      confidence: "high",
      gateEligible: false,
      message: "Pin M1.D is the only endpoint on its Net",
      primary: {
        documentId: "main",
        hierarchyPath: [],
        kind: "terminal",
        objectId: "M1:D",
      },
      related: [],
      parameters: { instanceId: "M1", pinName: "D" },
    };

    const markup = renderToStaticMarkup(
      <NetlistPreflightDialog
        open
        project={project}
        format="spice"
        electricalDiagnostics={[electrical]}
        onClose={() => undefined}
        onNavigate={() => undefined}
        onNavigateElectrical={() => undefined}
        onExport={() => undefined}
      />,
    );

    expect(markup).toContain("电气检查（1）");
    expect(markup).toContain("ERC_UNCONNECTED_PIN");
    expect(markup).toContain("相同的当前版本连通性评估");
    expect(markup).toContain('aria-label="就绪状态"');
    expect(markup).toContain('aria-label="网表诊断"');
    expect(markup).toContain('data-has-preview="false"');
    expect(markup).toContain('data-has-diagnostics="true"');
  });

  it("withholds the netlist while a wire is unfinished", () => {
    // A node only one pin reaches means the drawing is unfinished, so the
    // report says so and the copy is not offered.
    const project = createEmptyProject("project", "Project", "main");
    const document = project.documents[0]!;
    document.instances.push({
      id: "R1",
      symbolId: "resistor",
      reference: "R1",
      netlist: {
        binding: { kind: "primitive", deviceClass: "resistor" },
        parameters: { value: "10k" },
      },
      placement: { position: { x: 0, y: 0 }, rotation: 0, mirror: "none" },
    });
    document.nets.push(
      { id: "net-a", terminals: [{ instanceId: "R1", pinName: "1" }] },
      { id: "net-b", terminals: [{ instanceId: "R1", pinName: "2" }] },
    );

    const markup = renderToStaticMarkup(
      <NetlistPreflightDialog
        open
        project={project}
        format="spice"
        electricalDiagnostics={[]}
        onClose={() => undefined}
        onNavigate={() => undefined}
        onNavigateElectrical={() => undefined}
        onExport={() => undefined}
      />,
    );

    expect(markup).toContain("2 项阻止导出的问题");
    expect(markup).toContain("is a dead end: only R1.1 reaches it");
    expect(markup).toContain("复制网表前请先解决结构问题。");
    expect(markup).not.toContain("Copy SPICE netlist");
    expect(markup).toContain('data-has-preview="false"');
  });

  it("offers an explicit non-persisted Cadence bang export profile", () => {
    const project = createEmptyProject("project", "Project", "main");
    const markup = renderToStaticMarkup(
      <NetlistPreflightDialog
        open
        project={project}
        format="spectre"
        electricalDiagnostics={[]}
        onClose={() => undefined}
        onNavigate={() => undefined}
        onNavigateElectrical={() => undefined}
        onExport={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="网表命名方案"');
    expect(markup).not.toContain('aria-label="Netlist export format"');
    expect(markup).toContain('value="cadence-bang"');
    expect(markup).toContain("Cadence `!` 全局网络");
    expect(markup).toContain("复制 Spectre 网表");
  });
});
