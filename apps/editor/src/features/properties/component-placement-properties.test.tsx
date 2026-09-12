import { createEmptyDocument } from "@icm/model";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ComponentPlacementProperties } from "./component-placement-properties";

describe("component placement properties", () => {
  it("renders placement transforms, amplifier actions, and discard state", () => {
    const document = createEmptyDocument("cell", "Cell");
    const instance: (typeof document.instances)[number] = {
      id: "A1",
      symbolId: "diff-amp",
      placement: {
        position: { x: 10, y: 20 },
        rotation: 0,
        mirror: "none",
      },
    };
    const markup = renderToStaticMarkup(
      <ComponentPlacementProperties
        instance={instance}
        x="10"
        y="20"
        rotation="0"
        draftChanged
        onXChange={vi.fn()}
        onYChange={vi.fn()}
        onRotate={vi.fn()}
        onMirror={vi.fn()}
        onReturnToTray={vi.fn()}
        onSwapOutputs={vi.fn()}
        onSwapInputs={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(markup).toContain('aria-label="元件位置"');
    expect(markup).toContain('open=""');
    expect(markup).toContain('aria-label="元件几何属性"');
    expect(markup).toContain("交换 + / − 输出");
    expect(markup).not.toContain("放回待放置区");
    expect(markup).toContain("放弃更改");
  });

  it("offers return to tray only for a netlist-imported instance", () => {
    const document = createEmptyDocument("cell", "Cell");
    const instance: (typeof document.instances)[number] = {
      id: "M1",
      symbolId: "nmos",
      placement: {
        position: { x: 10, y: 20 },
        rotation: 0,
        mirror: "none",
      },
      importProvenance: {
        kind: "model",
        sourceMasterName: "nmos",
        sourceTarget: "model:nmos",
      },
    };
    const markup = renderToStaticMarkup(
      <ComponentPlacementProperties
        instance={instance}
        x="10"
        y="20"
        rotation="0"
        draftChanged={false}
        onXChange={vi.fn()}
        onYChange={vi.fn()}
        onRotate={vi.fn()}
        onMirror={vi.fn()}
        onReturnToTray={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(markup).toContain("导入源依据");
    expect(markup).toContain("放回待放置区");
  });
});
