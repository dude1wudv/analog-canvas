import { useRef } from "react";

import { ANNOTATION_CATEGORY } from "../component-insert/annotation-preview-symbols";
import type { InsertLaunch } from "../component-insert/insert-launch";
import { SymbolArtwork } from "../component-insert/symbol-artwork";
import { componentCatalog } from "../component-insert/symbol-catalog";
import { quickPlaceRequest } from "./shapes-panel";
import { ToolIcon } from "./tool-icon";

/** Compact access to the Library's annotation catalog and placement command. */
export function AnnotationMenu({
  styleProfileId,
  onStartInsert,
}: {
  styleProfileId: string;
  onStartInsert: (launch: InsertLaunch) => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const symbols =
    componentCatalog(styleProfileId, "").find(
      (group) => group.category === ANNOTATION_CATEGORY,
    )?.symbols ?? [];

  return (
    <details
      ref={menuRef}
      className="command-menu annotation-menu"
      name="editor-command-menu"
      data-testid="annotation-menu"
    >
      <summary className="draw-tool" aria-label="标注" title="标注">
        <ToolIcon name="rectangle" />
        <span>标注</span>
      </summary>
      <div
        className="command-popover annotation-palette"
        role="group"
        aria-label="标注工具"
      >
        {symbols.map((symbol) => (
          <button
            key={symbol.id}
            type="button"
            aria-label={`放置${symbol.name}`}
            title={symbol.name}
            data-testid={`annotation-shortcut-${symbol.id}`}
            onClick={() => {
              const request = quickPlaceRequest(styleProfileId, symbol.id);
              if (!request) return;
              if (menuRef.current) menuRef.current.open = false;
              onStartInsert({ kind: "quick", request });
            }}
          >
            <SymbolArtwork
              symbol={symbol}
              className="annotation-palette-art"
              paddingRatio={0.04}
            />
          </button>
        ))}
      </div>
    </details>
  );
}
