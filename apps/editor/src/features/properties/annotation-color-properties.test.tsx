import { createEmptyDocument } from "@icm/model";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AnnotationColorProperties } from "./annotation-color-properties";

describe("annotation color properties", () => {
  it("previews an instance label's inherited component ink while Auto", () => {
    const document = createEmptyDocument("cell", "Cell");
    const annotation: (typeof document.annotations)[number] = {
      id: "instance-label-R1",
      kind: "instance-label",
      content: { runs: [{ kind: "text", value: "R1" }] },
      anchor: {
        kind: "object",
        objectId: "R1",
        localOffset: { x: 0, y: -20 },
        fallbackPosition: { x: 0, y: -20 },
      },
      alignment: "middle",
      rotation: 0,
      locked: false,
    };
    const markup = renderToStaticMarkup(
      <AnnotationColorProperties
        annotation={annotation}
        inheritedColor="#dc2626"
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="文本属性"');
    const appearance = markup.match(
      /<details[^>]*aria-label="文本外观"[^>]*>/u,
    )?.[0];
    expect(appearance).toBeDefined();
    expect(appearance).not.toContain('open=""');
    expect(markup).toContain('aria-label="文本颜色十六进制值">自动');
    expect(markup).toContain(
      'aria-label="文本颜色选择器" type="color" value="#dc2626"',
    );
    expect(markup).toContain("自动使用继承的文本颜色。");
  });

  it("shows the annotation-owned override instead of inherited ink", () => {
    const document = createEmptyDocument("cell", "Cell");
    const annotation: (typeof document.annotations)[number] = {
      id: "value",
      kind: "instance-value",
      content: { runs: [{ kind: "text", value: "10k" }] },
      anchor: { kind: "free", position: { x: 0, y: 0 } },
      alignment: "middle",
      rotation: 0,
      locked: false,
      textColor: "#2563eb",
    };
    const markup = renderToStaticMarkup(
      <AnnotationColorProperties
        annotation={annotation}
        inheritedColor="#dc2626"
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="文本颜色十六进制值">#2563eb');
    expect(markup).toContain(
      'aria-label="文本颜色选择器" type="color" value="#2563eb"',
    );
  });
});
