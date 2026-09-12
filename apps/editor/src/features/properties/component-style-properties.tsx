import type { SchematicDocument } from "@icm/model";

import { ColorOverrideControl } from "./color-override-control";
import { PropertyDisclosure } from "./property-disclosure";

type Instance = SchematicDocument["instances"][number];
type InstanceStyleOverride = NonNullable<Instance["styleOverride"]>;

export { hexToRgb, rgbToHex } from "./color-override-control";

export function ComponentStyleProperties({
  instance,
  defaultForeground,
  onChange,
}: {
  instance: Instance;
  defaultForeground: string;
  onChange: (styleOverride: InstanceStyleOverride | null) => void;
}) {
  const update = (value: string | undefined): void => {
    // Component backgrounds were briefly authorable. Keep the model reader
    // backward compatible, but do not carry that retired paint forward when
    // the user next edits the component's appearance.
    const next: InstanceStyleOverride | null = value
      ? { foreground: value }
      : null;
    onChange(next);
  };

  return (
    <PropertyDisclosure
      title="外观"
      ariaLabel="元件外观"
      className="component-appearance-card"
    >
      <small>线条颜色仅应用于此元件。</small>
      <ColorOverrideControl
        label="线条"
        value={instance.styleOverride?.foreground}
        fallback={defaultForeground}
        onChange={update}
      />
    </PropertyDisclosure>
  );
}
