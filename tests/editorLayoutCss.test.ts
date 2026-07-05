import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("feature editor responsive layout CSS", () => {
  const css = readFileSync("src/styles.css", "utf8");

  it("uses container queries so nested feature cards can stack before they overflow", () => {
    expect(css).toContain("container-type: inline-size");
    expect(css).toContain("@container");
    expect(css).toContain(".feature-row");
    expect(css).toContain(".feature-delete-button");
  });

  it("keeps the paper view available while the editor column scrolls", () => {
    const paperColumnRule = css.match(/\.paper-preview-column\s*\{[^}]+\}/)?.[0] ?? "";

    expect(paperColumnRule).toContain("position: sticky");
    expect(paperColumnRule).toContain("top:");
    expect(paperColumnRule).toContain("max-height: calc(100vh");
    expect(paperColumnRule).toContain("overflow: auto");
  });
});
