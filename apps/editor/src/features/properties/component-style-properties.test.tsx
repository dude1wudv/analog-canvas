import { createEmptyDocument } from "@icm/model";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ComponentStyleProperties,
  hexToRgb,
  rgbToHex,
} from "./component-style-properties";

describe("component style properties", () => {
  it("offers the four common line colors plus custom RGB, without component fill", () => {
    const document = createEmptyDocument("cell", "Cell");
    const instance: (typeof document.instances)[number] = {
      id: "R1",
      symbolId: "resistor",
      placement: {
        position: { x: 10, y: 20 },
        rotation: 0,
        mirror: "none",
      },
      styleOverride: {
        foreground: "#dc2626",
        background: "#ffffff",
      },
    };
    const markup = renderToStaticMarkup(
      <ComponentStyleProperties
        instance={instance}
        defaultForeground="#000000"
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain("外观");
    const appearance = markup.match(
      /<details[^>]*aria-label="元件外观"[^>]*>/u,
    )?.[0];
    expect(appearance).toBeDefined();
    expect(appearance).not.toContain('open=""');
    expect(markup).toContain("<legend>直线</legend>");
    expect(markup).toContain("<legend>背景</legend>");
    expect(markup).not.toContain("Line / foreground");
    expect(markup).not.toContain("Background / fill");
    expect(markup).toContain('aria-label="直线自定义 RGB"');
    expect(markup).toContain('aria-label="背景颜色选择器"');
    expect(
      markup.match(/<details class="component-rgb-details">/gu),
    ).toHaveLength(1);
    expect(markup.match(/<summary>RGB<\/summary>/gu)).toHaveLength(1);
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("灰色 · #6b7280");
    expect(markup).not.toContain("Violet");
    expect(markup).toContain("颜色仅应用于此元件。");
  });

  it("converts custom RGB values to canonical six-digit hex", () => {
    expect(rgbToHex({ r: 12, g: 128, b: 255 })).toBe("#0c80ff");
    expect(rgbToHex({ r: -10, g: 128.4, b: 999 })).toBe("#0080ff");
    expect(hexToRgb("#0c80ff")).toEqual({ r: 12, g: 128, b: 255 });
    expect(hexToRgb("#abc")).toEqual({ r: 170, g: 187, b: 204 });
  });
});
