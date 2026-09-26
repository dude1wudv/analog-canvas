import type { SearchResult } from "@icm/derived";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectSearchDialog } from "./project-search-dialog";

describe("ProjectSearchDialog", () => {
  it("renders the concrete caller path for a reused child Cell result", () => {
    const result: SearchResult = {
      locator: {
        documentId: "child",
        hierarchyPath: [
          {
            parentDocumentId: "top",
            instanceId: "XBIAS2",
            childDocumentId: "child",
          },
        ],
        kind: "instance",
        objectId: "RCHILD",
      },
      label: "RCHILD",
      field: "instance-id",
      matchType: "exact",
    };
    const markup = renderToStaticMarkup(
      <ProjectSearchDialog
        open
        query="rchild"
        results={[result]}
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(markup).toContain("经由 XBIAS2");
    expect(markup).toContain(
      'data-testid="project-search-result-RCHILD-XBIAS2"',
    );
  });
});
