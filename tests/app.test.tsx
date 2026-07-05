import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("Feature Structure Studio app", () => {
  it("offers a PNG download button for the paper view", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Download Paper View PNG");
    expect(markup).toContain("paper-preview-column");
    expect(markup).toContain("PNG");
  });

  it("keeps AVM project controls in a compact advisor-friendly band", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("avm-workspace-grid");
    expect(markup).toContain("avm-utility-band");
    expect(markup).toContain("Copy LaTeX");
    expect(markup).toContain("Save Project");
    expect(markup).toContain("Open Project");
    expect(markup).toContain("Project JSON");
    expect(markup).not.toContain("export-column");
  });

  it("separates reusable templates from filled examples", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Load template");
    expect(markup).toContain("Load example");
    expect(markup).toContain("hit-hitting-frame");
  });
});
