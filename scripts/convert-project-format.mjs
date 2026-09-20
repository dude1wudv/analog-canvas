/** Read-only/offline conversion; never talks to production or overwrites input. */
import { deepStrictEqual } from "node:assert";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  parseProject,
  serializeProject,
  CURRENT_PROJECT_FILE_VERSION,
  canonicalConnectionIndexes,
} from "@icm/project-protocol";
import {
  withProjectComponentDefinitions,
  createProjectSymbolResolver,
} from "@icm/symbols";
import { renderDocumentSvg } from "@icm/render-svg";
import { analyzeDesignNetlist } from "@icm/netlist";

export function convertProjectText(original) {
  const before = withProjectComponentDefinitions(parseProject(original));
  const text = serializeProject(before);
  const after = parseProject(text);
  // Compare the complete authored model, not a drawing-code hash. This includes
  // invisible instances, raw parameters, routes, labels and simulation settings.
  deepStrictEqual(
    canonicalConnectionIndexes(after),
    canonicalConnectionIndexes(before),
  );
  if (serializeProject(after) !== text)
    throw new Error("Conversion is not idempotent");
  const symbols = createProjectSymbolResolver(before, []);
  for (const document of before.documents) {
    const converted = after.documents.find((d) => d.id === document.id);
    if (
      renderDocumentSvg(document, symbols) !==
      renderDocumentSvg(converted, symbols)
    )
      throw new Error(`Drawing changed in ${document.id}`);
  }
  // A pre-existing incomplete/blocked netlist must stay identically incomplete;
  // conversion neither repairs nor invents electrical meaning.
  deepStrictEqual(analyzeDesignNetlist(after), analyzeDesignNetlist(before));
  const source = JSON.parse(original);
  const target = JSON.parse(text);
  return {
    text,
    statistics: {
      sourceSchemaVersion: source.schemaVersion,
      targetSchemaVersion: CURRENT_PROJECT_FILE_VERSION,
      // Compare the same full information (including captured component classes).
      // Also report original sizes: older files may not have embedded artwork.
      sourceLines: JSON.stringify(source, null, 2).split("\n").length,
      beforeLines: JSON.stringify(before, null, 2).split("\n").length,
      afterLines: text.trimEnd().split("\n").length,
      sourceBytes: Buffer.byteLength(JSON.stringify(source)),
      beforeBytes: Buffer.byteLength(JSON.stringify(before)),
      afterBytes: Buffer.byteLength(JSON.stringify(target)),
      documents: before.documents.length,
      instances: before.documents.reduce((n, d) => n + d.instances.length, 0),
    },
  };
}

export function convertBackup(backup, onRow = () => {}) {
  if (
    ![
      "analog-canvas-gallery-schema-backup-v1",
      "analog-canvas-gallery-backup-v2",
    ].includes(backup.format) ||
    !backup.tables
  )
    throw new Error("Unrecognized Gallery backup");
  const output = structuredClone(backup);
  const report = {
    targetSchemaVersion: CURRENT_PROJECT_FILE_VERSION,
    checked: 0,
    converted: 0,
    failures: [],
    entries: [],
  };
  for (const [table, rows] of Object.entries(output.tables)) {
    if (!Array.isArray(rows)) throw new Error(`Invalid table ${table}`);
    if (
      !["galleryEntries", "galleryEntryVersions", "cloudProjects"].includes(
        table,
      )
    )
      continue;
    for (const row of rows) {
      report.checked++;
      try {
        const result = convertProjectText(row.project_text);
        row.project_text = result.text;
        row.schema_version = CURRENT_PROJECT_FILE_VERSION;
        report.converted++;
        report.entries.push({ table, id: row.id, ...result.statistics });
      } catch (error) {
        report.failures.push({ table, id: row.id, message: error.message });
      }
      onRow(report);
    }
  }
  return { output: report.failures.length ? null : output, report };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [inputArg, outputArg] = process.argv.slice(2);
  if (!inputArg || !outputArg)
    throw new Error(
      "Usage: node scripts/convert-project-format.mjs INPUT_JSON NEW_OUTPUT_DIRECTORY (build packages first)",
    );
  const input = resolve(inputArg),
    destination = resolve(outputArg);
  if (existsSync(destination))
    throw new Error(
      "Output directory already exists; refusing to overwrite a backup or prior report",
    );
  const text = readFileSync(input, "utf8"),
    parsed = JSON.parse(text);
  mkdirSync(destination, { recursive: true, mode: 0o700 });
  if (parsed.tables) {
    const { output, report } = convertBackup(parsed, (report) => {
      if (report.checked % 50 === 0)
        console.log(
          `Checked ${report.checked}; failures ${report.failures.length}`,
        );
    });
    writeFileSync(
      join(destination, "conversion-report.json"),
      JSON.stringify(report, null, 2) + "\n",
      { mode: 0o600 },
    );
    if (output)
      writeFileSync(
        join(destination, "converted-backup.json"),
        JSON.stringify(output) + "\n",
        { mode: 0o600 },
      );
    console.log(
      JSON.stringify({
        checked: report.checked,
        converted: report.converted,
        failures: report.failures.length,
        destination,
      }),
    );
    if (!output) process.exitCode = 1;
  } else {
    const result = convertProjectText(text);
    writeFileSync(join(destination, "project.icproj.json"), result.text, {
      mode: 0o600,
    });
    writeFileSync(
      join(destination, "conversion-report.json"),
      JSON.stringify(result.statistics, null, 2) + "\n",
      { mode: 0o600 },
    );
    console.log(JSON.stringify(result.statistics));
  }
}
