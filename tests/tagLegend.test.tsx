import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TagLegend } from "../src/components/TagLegend";

describe("TagLegend", () => {
  it("documents tag meanings in a collapsed paper-view legend", () => {
    const markup = renderToStaticMarkup(
      <TagLegend
        tags={[
          { tag: "1", valueKind: "type" },
          { tag: "L", valueKind: "list" }
        ]}
      />
    );

    expect(markup).toContain("tag-legend");
    expect(markup).toContain("Tags");
    expect(markup).toContain("preview-tag-number");
    expect(markup).toContain("preview-tag-letter");
    expect(markup).toContain("typed object");
    expect(markup).toContain("list");
  });

  it("stays out of the UI when no tags are defined", () => {
    expect(renderToStaticMarkup(<TagLegend tags={[]} />)).toBe("");
  });
});
