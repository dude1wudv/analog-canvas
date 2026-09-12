import { createEmptyDocument } from "@icm/model";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  CellSymbolLayoutProperties,
  FormalPortProperties,
} from "./component-structure-properties";

function cell() {
  const document = createEmptyDocument("cell", "Amplifier");
  document.netlist = {
    name: "Amplifier",
    terminals: [
      {
        id: "vin",
        name: "VIN",
        netId: "net-vin",
        direction: "input",
        interfaceInstanceIds: ["P1"],
      },
    ],
    formalParameters: [],
  };
  return document;
}

describe("component structure properties", () => {
  it("renders the formal Cell Pin contract", () => {
    const document = cell();
    const markup = renderToStaticMarkup(
      <FormalPortProperties
        terminal={document.netlist!.terminals[0]!}
        revision={document.revision}
        onRename={vi.fn()}
        onDirectionChange={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Cell Pin 名称"');
    expect(markup).toContain("VIN");
    expect(markup).toContain('value="input" selected=""');
  });

  it("renders definition-level symbol layout controls", () => {
    const markup = renderToStaticMarkup(
      <CellSymbolLayoutProperties
        cell={cell()}
        enabled
        onToggle={vi.fn()}
        onBodySizeChange={vi.fn()}
        onPortPlacementChange={vi.fn()}
      />,
    );

    expect(markup).toContain("Done editing canvas layout");
    expect(markup).toContain('aria-label="Cell symbol VIN pin side"');
  });
});
