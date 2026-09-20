/** Produce bounded optimistic requests only after lossless offline verification. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { convertBackup } from "./convert-project-format.mjs";

export function prepareGalleryFormatMigration(backup) {
  if (
    backup.format !== "analog-canvas-gallery-backup-v2" ||
    Object.keys(backup.tables ?? {}).some(
      (k) =>
        !["galleryEntries", "galleryEntryVersions", "galleryLikes"].includes(k),
    )
  )
    throw new Error("A complete Gallery-only backup is required");
  const { output, report } = convertBackup(backup);
  if (!output)
    throw new Error(
      `Offline conversion failed: ${JSON.stringify(report.failures)}`,
    );
  const requests = [];
  for (const table of ["galleryEntries", "galleryEntryVersions"]) {
    if (!Array.isArray(backup.tables[table]))
      throw new Error(`Missing table ${table}`);
    const seen = new Set();
    backup.tables[table].forEach((row, index) => {
      if (seen.has(row.id)) throw new Error(`Duplicate ${table}/${row.id}`);
      seen.add(row.id);
      const converted = output.tables[table][index];
      if (
        row.project_text === converted.project_text &&
        row.schema_version === converted.schema_version
      )
        return;
      requests.push({
        table,
        id: row.id,
        originalProjectText: row.project_text,
        projectText: converted.project_text,
      });
    });
  }
  return { requests, expected: output, report };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [input, target] = process.argv.slice(2);
  if (!input || !target)
    throw new Error(
      "Usage: node scripts/prepare-gallery-format-migration.mjs GALLERY_BACKUP NEW_OUTPUT_DIRECTORY",
    );
  if (existsSync(target))
    throw new Error("Output already exists; preserve prior evidence");
  const { requests, expected, report } = prepareGalleryFormatMigration(
    JSON.parse(readFileSync(input, "utf8")),
  );
  mkdirSync(target, { recursive: true, mode: 0o700 });
  mkdirSync(join(target, "requests"), { mode: 0o700 });
  for (const [index, request] of requests.entries())
    writeFileSync(
      join(target, "requests", `${index}.json`),
      JSON.stringify(request),
      { mode: 0o600 },
    );
  writeFileSync(
    join(target, "expected-backup.json"),
    JSON.stringify(expected),
    { mode: 0o600 },
  );
  writeFileSync(
    join(target, "manifest.json"),
    JSON.stringify(
      {
        requests: requests.map(({ table, id }, index) => ({
          index,
          table,
          id,
        })),
        report,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      requests: requests.length,
      checked: report.checked,
      target,
    }),
  );
}
