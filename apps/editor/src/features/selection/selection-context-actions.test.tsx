import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  EndpointActionsSection,
  MosBulkConnectionSection,
  RouteActionsSection,
  RoutingGuidanceSection,
} from "./selection-context-actions";

describe("selection context actions", () => {
  it.each([
    ["unresolved", null, "未连接", "请为体端选择网络"],
    ["no-connect", null, "No Connect", "有意保持未连接"],
    ["cell-default", "VDD", "VDD", "Cell 默认值"],
    ["supply-default", "0", "0", "电源默认值"],
    ["instance-override", "VB", "VB", "实例覆盖值"],
    ["explicit", "VSS", "VSS", "显式连接"],
  ] as const)(
    "explains %s bulk state without repeating unresolved text",
    (status, netName, label, origin) => {
      const markup = renderToStaticMarkup(
        <MosBulkConnectionSection
          connection={{ terminal: "M1.B", netName, status }}
          explicitRouteVisible={status === "explicit"}
          canDraw
          onDraw={vi.fn()}
        />,
      );
      expect(markup).toContain(`>${label}</span>`);
      expect(markup).toContain(origin);
      expect(markup).toContain('aria-label="绘制体端连接"');
      expect(markup).not.toContain("→ unresolved");
      if (status === "explicit")
        expect(markup).toContain("Dashed bulk route shown");
    },
  );

  it("keeps unplaced bulk routing disabled and hides the bar for non-MOS selections", () => {
    const props = {
      explicitRouteVisible: false,
      canDraw: false,
      onDraw: vi.fn(),
    };
    expect(
      renderToStaticMarkup(
        <MosBulkConnectionSection connection={null} {...props} />,
      ),
    ).toBe("");
    const markup = renderToStaticMarkup(
      <MosBulkConnectionSection
        connection={{ terminal: "M1.B", netName: null, status: "unresolved" }}
        {...props}
      />,
    );
    expect(markup).toContain('disabled=""');
    expect(markup).toContain("请先将元件放到画布上");
  });

  it("renders route label and highlight actions", () => {
    const markup = renderToStaticMarkup(
      <RouteActionsSection
        active
        netLabelInputRef={createRef<HTMLInputElement>()}
        netLabel="OUT"
        color={undefined}
        arrow="middle"
        defaultColor="#000"
        highlightActive
        onNetLabelChange={vi.fn()}
        onColorChange={vi.fn()}
        onArrowChange={vi.fn()}
        onDeleteNetLabel={vi.fn()}
        onAddCurrentArrow={vi.fn()}
        onToggleHighlight={vi.fn()}
        onDeleteWire={vi.fn()}
      />,
    );
    expect(markup).toContain('aria-label="电气网络标签"');
    expect(markup).toContain('value="OUT"');
    expect(markup).toContain('aria-label="导线颜色选择器"');
    expect(markup).toContain('value="#000000"');
    expect(markup).toContain('aria-label="导线颜色自定义 RGB"');
    expect(markup).toContain("灰色 · #6b7280");
    expect(markup).not.toContain("Violet");
    expect(markup).toContain("使用文档前景色");
    expect(markup).toContain('aria-label="导线方向箭头"');
    expect(markup).toContain('<option value="middle" selected="">');
    expect(markup).toContain("箭头位于末端");
    expect(markup).toContain("Add current arrow");
    expect(markup).toContain("清除网络高亮（H）");
  });

  it("blocks No Connect while a terminal remains connected", () => {
    const markup = renderToStaticMarkup(
      <EndpointActionsSection
        kind="terminal"
        noConnect={false}
        endpointNetId="net-1"
        onDisconnect={vi.fn()}
        onDeleteConnection={vi.fn()}
        onToggleNoConnect={vi.fn()}
        onDeleteJunction={vi.fn()}
      />,
    );
    expect(markup).toContain("标记 No Connect");
    expect(markup).toContain("disabled");
    expect(markup).toContain("标记为 No Connect 前，请先断开此端点");
  });

  it("publishes focused imported guidance counts", () => {
    const markup = renderToStaticMarkup(
      <RoutingGuidanceSection
        total={7}
        displayed={2}
        view="focused"
        onViewChange={vi.fn()}
      />,
    );
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("2 shown / 7 derived");
  });
});
