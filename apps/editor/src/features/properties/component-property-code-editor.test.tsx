import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ComponentPropertyCodeEditor } from "./component-property-code-editor";

describe("ComponentPropertyCodeEditor", () => {
  it("keeps a readable loading fallback for the lazily loaded code surface", () => {
    const markup = renderToStaticMarkup(
      <ComponentPropertyCodeEditor
        instance={{
          id: "R1",
          symbolId: "resistor",
          reference: "R1",
          placement: {
            position: { x: 360, y: 240 },
            rotation: 0,
            mirror: "none",
          },
        }}
        revision={1}
        displayName="RL"
        referenceVisible
        valueVisible={false}
        onApply={vi.fn(() => ({ ok: true as const }))}
      />,
    );
    expect(markup).toContain('aria-label="正在加载画布属性代码"');
    expect(markup).toContain("&quot;coordinate&quot;");
    expect(markup).toContain("&quot;name&quot;: &quot;RL&quot;");
    expect(markup).not.toContain("Apply code");
    expect(markup).not.toContain("Component properties");
    expect(markup).toContain('aria-label="默认值"');
    expect(markup).not.toContain("Need help?");
    expect(markup).not.toContain("<legend>Line</legend>");
    expect(markup).not.toContain('aria-label="Line presets"');
    expect(markup).not.toContain('aria-label="Line custom RGB"');
    expect(markup).not.toContain("Background");
    expect(markup).not.toContain("Live");
    expect(markup).toContain('aria-label="复制 JSON"');
    expect(markup).toContain('title="复制 JSON"');
    expect(markup.indexOf('aria-label="复制 JSON"')).toBeLessThan(
      markup.indexOf('aria-label="正在加载画布属性代码"'),
    );
    expect(markup).not.toContain('inputMode="decimal"');
    expect(markup).not.toContain("mirror-horizontal");
  });
});
