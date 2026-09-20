import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@icm/model";
import {
  serializeProject,
  parseProject,
  CURRENT_PROJECT_FILE_VERSION,
} from "@icm/project-protocol";
import { convertBackup } from "./convert-project-format.mjs";

describe("offline Gallery file conversion", () => {
  const row = (id, name) => ({
    id,
    name,
    project_text: JSON.stringify(createEmptyProject(id, name)),
    schema_version: 58,
    svg_text: '<svg data-original="yes"/>',
    created_at: "2026-01-01",
    owner_user_id: "author",
    status: "recycled",
  });
  it("upgrades each historical state separately and preserves all other raw columns and likes", () => {
    const backup = {
      format: "analog-canvas-gallery-backup-v2",
      tables: {
        galleryEntries: [row("circuit", "Current")],
        galleryEntryVersions: [
          { ...row("history", "Old"), entry_id: "circuit", version_no: 4 },
        ],
        galleryLikes: [
          { entry_id: "circuit", user_id: "visitor", liked_at: "then" },
        ],
      },
    };
    const original = structuredClone(backup);
    const { output, report } = convertBackup(backup);
    expect(report).toMatchObject({ checked: 2, converted: 2, failures: [] });
    expect(backup).toEqual(original);
    for (const table of ["galleryEntries", "galleryEntryVersions"]) {
      const before = original.tables[table][0],
        after = output.tables[table][0];
      expect(after).toEqual({
        ...before,
        project_text: serializeProject(parseProject(before.project_text)),
        schema_version: CURRENT_PROJECT_FILE_VERSION,
      });
      expect(parseProject(after.project_text).name).toBe(before.name);
    }
    expect(output.tables.galleryLikes).toEqual(original.tables.galleryLikes);
  });
  it("keeps every original and withholds a migration bundle if any record is unreadable", () => {
    const backup = {
      format: "analog-canvas-gallery-backup-v2",
      tables: {
        galleryEntries: [
          row("ok", "Good"),
          { ...row("bad", "Broken"), project_text: "{" },
        ],
        galleryEntryVersions: [],
        galleryLikes: [],
      },
    };
    const original = structuredClone(backup);
    const { output, report } = convertBackup(backup);
    expect(output).toBeNull();
    expect(report.failures).toMatchObject([
      { table: "galleryEntries", id: "bad" },
    ]);
    expect(backup).toEqual(original);
  });
});

describe("bounded Gallery migration preparation", () => {
  it("keeps exact originals and rejects any private-project scope", async () => {
    const { prepareGalleryFormatMigration } =
      await import("./prepare-gallery-format-migration.mjs");
    const original = JSON.stringify(createEmptyProject("source", "Source"));
    const backup = {
      format: "analog-canvas-gallery-backup-v2",
      tables: {
        galleryEntries: [
          { id: "one", project_text: original, schema_version: 58 },
        ],
        galleryEntryVersions: [],
        galleryLikes: [],
      },
    };
    const result = prepareGalleryFormatMigration(backup);
    expect(result.requests).toEqual([
      {
        table: "galleryEntries",
        id: "one",
        originalProjectText: original,
        projectText: serializeProject(parseProject(original)),
      },
    ]);
    expect(prepareGalleryFormatMigration(result.expected).requests).toEqual([]);
    expect(() =>
      prepareGalleryFormatMigration({
        ...backup,
        tables: { ...backup.tables, cloudProjects: [] },
      }),
    ).toThrow("Gallery-only");
  });
});
