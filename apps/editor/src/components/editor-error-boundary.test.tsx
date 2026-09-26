import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { EditorCrashScreen } from "./editor-error-boundary";

describe("EditorCrashScreen", () => {
  it("renders an alert with the failure reason and a reload action", () => {
    const html = renderToStaticMarkup(
      <EditorCrashScreen
        message="boom in scene build"
        onReload={() => undefined}
      />,
    );
    expect(html).toContain("编辑器遇到了意外问题");
    expect(html).toContain("boom in scene build");
    expect(html).toContain("重新加载编辑器");
    expect(html).toContain('data-testid="crash-report-bug"');
    expect(html).toContain("Report bug");
    expect(html).toContain("Recover Unsaved Work");
  });

  it("offers a clean reload when the build is the thing that is stale", () => {
    // #493: a fresh visit could not open the editor because the app chunk
    // named in the document no longer existed. An ordinary reload can serve
    // that same document again, so the screen must say what is wrong and
    // offer the reload that discards this build's cached copies.
    const html = renderToStaticMarkup(
      <EditorCrashScreen
        message="Failed to fetch dynamically imported module: /assets/App-L9bGmgOj.js"
        staleBuild
        onReload={() => undefined}
        onRecover={() => undefined}
      />,
    );
    expect(html).toContain("运行的是旧版编辑器");
    expect(html).toContain("使用干净副本重新加载");
    expect(html).toContain("crash-reload-clean");
  });

  it("keeps the ordinary crash wording for an ordinary crash", () => {
    const html = renderToStaticMarkup(
      <EditorCrashScreen message="boom" onReload={() => undefined} />,
    );
    expect(html).toContain("编辑器遇到了意外问题");
    expect(html).not.toContain("crash-reload-clean");
  });

  it("does not call a temporary module failure an old version", () => {
    const html = renderToStaticMarkup(
      <EditorCrashScreen
        message="A required editor file was temporarily unavailable: /assets/App-current.js"
        moduleLoadFailure
        onReload={() => undefined}
        onRecover={() => undefined}
      />,
    );
    expect(html).toContain("编辑器未能完成加载");
    expect(html).toContain("暂时不可用");
    expect(html).toContain("重试");
    expect(html).toContain("使用干净副本重新加载");
    expect(html).not.toContain("运行的是旧版编辑器");
    expect(html).toContain('data-kind="load"');
  });
});
