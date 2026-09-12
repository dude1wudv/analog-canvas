import type { ProjectStructureEdit } from "@icm/edit-engine";
import { createEmptyDocument, createEmptyProject } from "@icm/model";
import { builtInSymbols, createProjectSymbolResolver } from "@icm/symbols";
import { describe, expect, it, vi } from "vitest";

import { createProjectStructureCommands } from "./project-structure-commands";

function dependencies() {
  const project = createEmptyProject("project", "Project");
  const commitStructure = vi.fn<
    (
      transactionId: string,
      edits: ProjectStructureEdit[],
      activeDocumentId?: string,
    ) => boolean
  >(() => true);
  return {
    project,
    activeDocument: project.documents[0]!,
    resolver: createProjectSymbolResolver(project, builtInSymbols),
    commitStructure,
    setStatus: vi.fn(),
    onCellCreated: vi.fn(),
    nextSequence: vi.fn(() => 1),
    createDocumentId: vi.fn(() => "document-child"),
  };
}

describe("Project structure commands", () => {
  it("creates a trimmed Cell with inherited presentation and activates it", () => {
    const input = dependencies();
    input.activeDocument.presentation.grid = 25;
    const commands = createProjectStructureCommands(input);

    commands.createCell("  Child  ");

    const [transactionId, edits, activeDocumentId] =
      input.commitStructure.mock.calls[0]!;
    expect(transactionId).toBe("create-cell");
    expect(activeDocumentId).toBe("document-child");
    expect(edits).toMatchObject([
      {
        kind: "add_document",
        document: {
          id: "document-child",
          name: "Child",
          presentation: { grid: 25 },
          netlist: { name: "Child" },
        },
      },
    ]);
    expect(input.onCellCreated).toHaveBeenCalledOnce();
    expect(input.setStatus).toHaveBeenCalledWith("Created Cell Child");
  });

  it("deletes a Cell through the project structure boundary", () => {
    const input = dependencies();
    const child = createEmptyDocument("document-child", "Child");
    input.project.documents.push(child);
    const commands = createProjectStructureCommands(input);

    expect(commands.deleteCell(child.id)).toBe(true);

    expect(input.commitStructure).toHaveBeenCalledWith(
      "delete-cell",
      expect.arrayContaining([
        expect.objectContaining({
          kind: "remove_document",
          documentId: child.id,
        }),
      ]),
      input.project.topDocumentId,
    );
    expect(input.setStatus).toHaveBeenCalledWith("Deleted Cell Child");
  });

  it("normalizes formal parameters before committing their structural edit", () => {
    const input = dependencies();
    const child = createEmptyDocument("document-child", "Child");
    input.project.documents.push(child);
    const commands = createProjectStructureCommands(input);

    commands.setCellFormalParameters(
      [
        { name: "  gain  ", defaultValue: "  10  " },
        { name: "bias", defaultValue: "   " },
      ],
      child.id,
    );

    expect(input.commitStructure).toHaveBeenCalledWith(
      "set-cell-formal-parameters",
      expect.arrayContaining([
        {
          kind: "transact_document",
          documentId: child.id,
          expectedRevision: 0,
          edits: [
            {
              kind: "set_cell_formal_parameters",
              formalParameters: [
                { name: "gain", defaultValue: "10" },
                { name: "bias" },
              ],
            },
          ],
        },
      ]),
    );
  });

  it("rejects off-grid Cell symbol dimensions before planning", () => {
    const input = dependencies();
    const commands = createProjectStructureCommands(input);

    commands.setCellSymbolBodySize(input.activeDocument, 95, 100);

    expect(input.commitStructure).not.toHaveBeenCalled();
    expect(input.setStatus).toHaveBeenCalledWith(
      "Cell 符号尺寸必须使用正的 10 单位网格值",
    );
  });

  it("owns Cell Pin annotation edits and structural deletion", () => {
    const input = dependencies();
    input.activeDocument.instances.push({
      id: "P1",
      symbolId: "port",
      placement: null,
    });
    input.activeDocument.nets.push({
      id: "net-in",
      terminals: [{ instanceId: "P1", pinName: "P" }],
    });
    input.activeDocument.netlist!.terminals.push({
      id: "terminal-in",
      name: "IN",
      netId: "net-in",
      direction: "input",
      interfaceInstanceIds: ["P1"],
    });
    const annotation = {
      id: "pin-label",
      kind: "instance-label" as const,
      binding: {
        kind: "cell-terminal-name" as const,
        terminalId: "terminal-in",
      },
      anchor: {
        kind: "object" as const,
        objectId: "P1",
        localOffset: { x: 0, y: 0 },
        fallbackPosition: { x: 0, y: 0 },
      },
      alignment: "middle" as const,
      rotation: 0 as const,
      locked: false,
    };
    input.activeDocument.annotations.push(annotation);
    const commands = createProjectStructureCommands(input);

    expect(commands.editCellTerminalAnnotation(annotation, "VIN")).toBe(true);
    expect(input.commitStructure).toHaveBeenCalledWith(
      "edit-cell-pin-label",
      expect.any(Array),
    );

    input.commitStructure.mockClear();
    expect(commands.deleteCellTerminal("terminal-in", "P1")).toBe(true);
    expect(input.commitStructure).toHaveBeenCalledWith(
      "delete-cell-pin",
      expect.arrayContaining([
        expect.objectContaining({ kind: "transact_document" }),
      ]),
    );
    expect(input.setStatus).toHaveBeenCalledWith("Deleted Cell Pin IN");
  });
});
