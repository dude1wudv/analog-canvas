import { expect, test } from "@playwright/test";
import { createEmptyProject } from "@icm/model";
import {
  serializeProject,
  CURRENT_PROJECT_FILE_VERSION,
} from "@icm/project-protocol";
import { withProjectComponentDefinitions } from "@icm/symbols";

test("edits a complete instance in portable Project Code, pastes it into another canvas, and undoes once", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const project = withProjectComponentDefinitions(
    createEmptyProject("portable-browser", "Portable browser"),
  );
  const document = project.documents[0]!;
  document.instances.push({
    id: "R1",
    symbolId: "resistor",
    reference: "R1",
    placement: { position: { x: 200, y: 200 }, rotation: 0, mirror: "none" },
    netlist: { parameters: { value: "1k" } },
  });
  document.annotations.push({
    id: "name-R1",
    kind: "instance-label",
    binding: { kind: "instance-reference", instanceId: "R1" },
    anchor: {
      kind: "object",
      objectId: "R1",
      localOffset: { x: 25, y: 0 },
      fallbackPosition: { x: 225, y: 200 },
    },
    alignment: "middle",
    rotation: 0,
    locked: false,
  });
  await page.goto("/editor?new=1");
  await page.getByTestId("project-file").setInputFiles({
    name: "portable.icproj.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeProject(project)),
  });
  await page.getByTestId("project-code-toggle").click();
  const editor = page.getByRole("textbox", {
    name: "Project code",
    exact: true,
  });
  await editor.focus();
  await editor.press("ControlOrMeta+a");
  await editor.press("ControlOrMeta+c");
  const source = JSON.parse(
    await page.evaluate(() => navigator.clipboard.readText()),
  );
  expect(source.schemaVersion).toBe(CURRENT_PROJECT_FILE_VERSION);
  const device = source.documents[0].instances[0];
  expect(device).toMatchObject({
    type: "resistor",
    name: "R1",
    coordinate: [200, 200],
    parameters: { value: "1k" },
    labels: [{ bind: "name" }],
  });
  expect(source.documents[0].annotations).toEqual([]);
  device.name = "R7";
  device.coordinate = [300, 250];
  device.parameters.value = "2k";
  await editor.fill(JSON.stringify(source, null, 2));
  await editor.press("ControlOrMeta+Enter");
  await expect(
    page.locator('[data-layer="annotations"] [data-object-id="name-R1"]'),
  ).toContainText("R7");
  await expect(
    page.locator('[data-layer="symbols"] [data-object-id="R1"] > g').first(),
  ).toHaveAttribute("transform", /translate\(300(?:,| )250\)/);
  await editor.focus();
  await editor.press("ControlOrMeta+a");
  await editor.press("ControlOrMeta+c");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const other = await context.newPage();
  await other.goto("/editor?new=1");
  await other.getByTestId("project-code-toggle").click();
  const destination = other.getByRole("textbox", {
    name: "Project code",
    exact: true,
  });
  await destination.fill(copied);
  await destination.press("ControlOrMeta+Enter");
  await expect(
    other.locator('[data-layer="annotations"] [data-object-id="name-R1"]'),
  ).toContainText("R7");
  await expect(
    other.locator('[data-layer="symbols"] [data-object-id="R1"] > g').first(),
  ).toHaveAttribute("transform", /translate\(300(?:,| )250\)/);
  await page.getByTestId("draw-tool-undo").click();
  await expect(
    page.locator('[data-layer="annotations"] [data-object-id="name-R1"]'),
  ).toContainText("R1");
  await other.close();
});
