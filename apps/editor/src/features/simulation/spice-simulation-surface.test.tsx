import { createEmptyProject, createSimulationFolder } from "@icm/model";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrowserSimulationSession } from "./browser-simulation-session";
import { SpiceSimulationSurface } from "./spice-simulation-surface";

function render(
  saved: boolean,
  broken = false,
  projectSaveState?: "saving" | "clean" | "failed",
) {
  const project = createEmptyProject("code", "Code");
  if (saved) {
    const folder = createSimulationFolder({
      id: "s",
      name: "RC",
      profileId: "local",
      documentId: project.topDocumentId,
    });
    if (broken)
      folder.input.files.find((f) => f.path === folder.input.configPath)!.text =
        "{";
    project.simulationFolders = [folder];
  }
  return renderToStaticMarkup(
    <SpiceSimulationSurface
      open
      maximized={false}
      project={project}
      activeDocumentId={project.topDocumentId}
      selectedFolderId={saved ? "s" : null}
      onSelectFolderId={() => {}}
      session={
        new BrowserSimulationSession({
          getProject: () => project,
          getProjectSessionId: () => "session",
        })
      }
      onToggleMaximized={() => {}}
      onMinimize={() => {}}
      onExit={() => {}}
      onSaveFolder={() => ({ status: "applied" })}
      onDeleteFolder={() => true}
      onHistoryBoundary={() => {}}
      projectSaveState={projectSaveState}
    />,
  );
}
describe("source workspace default cutover", () => {
  it("projects the Project save lifecycle instead of claiming a buffer flush saved to cloud", () => {
    expect(render(true, false, "saving")).toContain("Saving…");
    expect(render(true, false, "saving")).toContain('aria-busy="true"');
    expect(render(true, false, "clean")).toContain(">✓ Saved</button>");
    expect(render(true, false, "clean")).toContain('data-save-state="saved"');
    expect(render(true, false, "failed")).toContain("Retry save");
  });
  it("offers creation without restoring the retired Settings form", () => {
    const markup = render(false);
    expect(markup).toContain("Set up");
    expect(markup).not.toContain("Create experiment");
    expect(markup).not.toContain('aria-label="Analyses settings"');
    expect(markup).not.toContain('aria-label="Setup settings"');
  });
  it("places Console and Results under Code with generated and authored tabs only", () => {
    const markup = render(true);
    expect(markup).toContain('aria-label="仿真代码工作区"');
    expect(markup).toContain('aria-label="打开仿真文件"');
    expect(markup).toContain("circuit.spice");
    expect(markup).toContain("run.cir");
    expect(markup).not.toContain("experiment.json");
    expect(markup).toContain('aria-label="仿真文件夹"');
    expect(markup).not.toContain('aria-label="Simulation setup"');
    expect(markup).not.toContain("Prepare deck");
    expect(markup.indexOf('aria-label="代码输出"')).toBeGreaterThan(
      markup.indexOf('aria-label="打开仿真文件"'),
    );
    expect(markup).toContain("Maximize results");
  });
  it("retains the editor for invalid authored configuration rather than crashing or restoring a second form", () => {
    const markup = render(true, true);
    expect(markup).toContain('aria-label="仿真代码工作区"');
    expect(markup).toContain("run.cir");
    expect(markup).not.toContain('aria-label="Measurements settings"');
  });
});
