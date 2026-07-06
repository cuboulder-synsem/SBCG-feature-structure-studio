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

  it("draws tree branches as converging lines with gaps around AVMs", () => {
    const treeChildrenRule = css.match(/\.tree-paper-children\s*\{[^}]+\}/)?.[0] ?? "";
    const branchSvgRule = css.match(/\.tree-branch-lines\s*\{[^}]+\}/)?.[0] ?? "";
    const branchLineRule = css.match(/\.tree-branch-lines line\s*\{[^}]+\}/)?.[0] ?? "";

    expect(treeChildrenRule).toContain("--tree-branch-gap:");
    expect(treeChildrenRule).toContain("--tree-branch-line-height:");
    expect(branchSvgRule).toContain("top: var(--tree-branch-gap)");
    expect(branchSvgRule).toContain("height: var(--tree-branch-line-height)");
    expect(branchLineRule).toContain("vector-effect: non-scaling-stroke");
  });

  it("supports resizable tree columns and a zoomable preview canvas", () => {
    const treeGridRule = css.match(/\.tree-grid\s*\{[^}]+\}/)?.[0] ?? "";
    const resizeHandleRule = css.match(/\.workspace-resize-handle\s*\{[^}]+\}/)?.[0] ?? "";
    const zoomLayerRule = css.match(/\.tree-preview-zoom-layer\s*\{[^}]+\}/)?.[0] ?? "";

    expect(treeGridRule).toContain("var(--tree-editor-fr");
    expect(treeGridRule).toContain("var(--tree-preview-fr");
    expect(resizeHandleRule).toContain("cursor: col-resize");
    expect(zoomLayerRule).toContain("transform-origin: top center");
    expect(zoomLayerRule).toContain("width: max-content");
  });
});
