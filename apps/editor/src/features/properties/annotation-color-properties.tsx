import type { Annotation } from "@icm/model";

import { ColorOverrideControl } from "./color-override-control";
import { PropertyDisclosure } from "./property-disclosure";

export function AnnotationColorProperties({
  annotation,
  inheritedColor,
  onChange,
}: {
  annotation: Annotation;
  inheritedColor: string;
  onChange: (textColor: string | undefined) => void;
}) {
  return (
    <section
      className="property-section annotation-text-properties"
      aria-label="文本属性"
    >
      <PropertyDisclosure title="文本外观" ariaLabel="文本外观">
        <ColorOverrideControl
          label="文本颜色"
          value={annotation.textColor}
          fallback={inheritedColor}
          autoTitle="使用继承的文本颜色"
          disabled={annotation.locked}
          onChange={onChange}
        />
        <small>自动使用继承的文本颜色。</small>
      </PropertyDisclosure>
    </section>
  );
}
