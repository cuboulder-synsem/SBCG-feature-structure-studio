import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/app/App";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Feature Structure Studio app", () => {
  it("offers a PNG download button for the paper view", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Download Paper View PNG");
    expect(markup).toContain("paper-preview-column");
    expect(markup).toContain("PNG");
  });

  it("keeps AVM utilities above the editor with only core top-level actions", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    const utilityBand = host.querySelector<HTMLElement>(".avm-utility-band");
    const avmGrid = host.querySelector<HTMLElement>(".avm-workspace-grid");
    const topLevelActions = [
      ...host.querySelectorAll<HTMLButtonElement>(".avm-utility-band > .utility-actions > button")
    ].map((button) => button.textContent?.trim());

    expect(utilityBand).not.toBeNull();
    expect(avmGrid).not.toBeNull();
    expect(
      utilityBand && avmGrid
        ? utilityBand.compareDocumentPosition(avmGrid) & Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).toBeTruthy();
    expect(host.querySelector(".avm-workspace-grid .export-column")).toBeNull();
    expect(host.querySelector(".avm-workspace-grid .paper-preview-column")).not.toBeNull();
    expect(topLevelActions).toEqual(["LaTeX", "Save JSON", "Open JSON"]);
    expect(host.querySelector('button[title="Copy AVM LaTeX"]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("reveals AVM LaTeX output from the compact top utility bar", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    const latexButton = host.querySelector<HTMLButtonElement>('button[title="Show AVM LaTeX"]');

    expect(host.querySelector(".avm-utility-panel")).toBeNull();

    await act(async () => {
      latexButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const latexPanel = host.querySelector<HTMLElement>(".avm-utility-panel");
    const copyLatex = latexPanel?.querySelector<HTMLButtonElement>('button[title="Copy AVM LaTeX"]');

    expect(latexPanel?.querySelector("textarea")?.value).toContain("\\avm{");

    await act(async () => {
      copyLatex?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("\\avm{"));
    expect(host.textContent).toContain("Copied AVM LaTeX");

    await act(async () => {
      root.unmount();
    });
    host.remove();
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("separates reusable templates from filled examples", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Load template");
    expect(markup).toContain("Load example");
    expect(markup).toContain("hit-hitting-frame");
  });

  it("keeps Tree utilities above the editor with only core top-level actions", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    const treeModeButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Tree")
    );
    expect(treeModeButton).toBeDefined();

    await act(async () => {
      treeModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const utilityBand = host.querySelector<HTMLElement>(".tree-utility-band");
    const treeGrid = host.querySelector<HTMLElement>(".tree-grid");
    const topLevelActions = [
      ...host.querySelectorAll<HTMLButtonElement>(".tree-utility-band > .utility-actions > button")
    ].map((button) => button.textContent?.trim());

    expect(utilityBand).not.toBeNull();
    expect(treeGrid).not.toBeNull();
    expect(
      utilityBand && treeGrid
        ? utilityBand.compareDocumentPosition(treeGrid) & Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).toBeTruthy();
    expect(host.querySelector(".tree-grid .export-column")).toBeNull();
    expect(host.querySelector(".tree-grid .paper-preview-column")).not.toBeNull();
    expect(topLevelActions).toEqual(["LaTeX", "Save JSON", "Open JSON"]);
    expect(host.querySelector('button[title="Copy Tree LaTeX"]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("reveals Tree LaTeX output from the compact top utility bar", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    const treeModeButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Tree")
    );
    await act(async () => {
      treeModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const latexButton = host.querySelector<HTMLButtonElement>('button[title="Show Tree LaTeX"]');

    expect(host.querySelector(".tree-utility-panel")).toBeNull();

    await act(async () => {
      latexButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const latexPanel = host.querySelector<HTMLElement>(".tree-utility-panel");
    const copyLatex = latexPanel?.querySelector<HTMLButtonElement>('button[title="Copy Tree LaTeX"]');

    expect(latexPanel?.querySelector("textarea")?.value).toContain("\\begin{forest}");

    await act(async () => {
      copyLatex?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("\\begin{forest}"));
    expect(host.textContent).toContain("Copied Tree LaTeX");

    await act(async () => {
      root.unmount();
    });
    host.remove();
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("shows shorthand tree labels by default and can hide them in preview", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    const treeModeButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Tree")
    );
    await act(async () => {
      treeModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const labelToggle = host.querySelector<HTMLInputElement>(
      'input[aria-label="Show shorthand tree labels"]'
    );

    expect(labelToggle?.checked).toBe(true);
    expect(host.querySelectorAll(".tree-preview .tree-node-label")).toHaveLength(3);

    await act(async () => {
      labelToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(labelToggle?.checked).toBe(false);
    expect(host.querySelectorAll(".tree-preview .tree-node-label")).toHaveLength(0);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("lets Tree mode resize the editor and preview boundary", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    const treeModeButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Tree")
    );
    await act(async () => {
      treeModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const separator = host.querySelector<HTMLElement>(
      '[aria-label="Resize editor and preview"]'
    );
    const treeGrid = host.querySelector<HTMLElement>(".tree-grid");

    expect(separator).not.toBeNull();
    expect(separator?.getAttribute("aria-valuenow")).toBe("55");
    expect(treeGrid?.style.getPropertyValue("--tree-editor-fr")).toBe("55fr");

    await act(async () => {
      separator?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });

    expect(separator?.getAttribute("aria-valuenow")).toBe("59");
    expect(treeGrid?.style.getPropertyValue("--tree-editor-fr")).toBe("59fr");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("zooms the tree preview canvas in and out", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    const treeModeButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Tree")
    );
    await act(async () => {
      treeModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const zoomLayer = host.querySelector<HTMLElement>(".tree-preview-zoom-layer");
    const zoomIn = host.querySelector<HTMLButtonElement>('button[title="Zoom in tree preview"]');
    const zoomOut = host.querySelector<HTMLButtonElement>('button[title="Zoom out tree preview"]');
    const resetZoom = host.querySelector<HTMLButtonElement>('button[title="Reset tree preview zoom"]');

    expect(zoomLayer?.style.transform).toBe("scale(0.85)");
    expect(host.textContent).toContain("85%");

    await act(async () => {
      zoomIn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(zoomLayer?.style.transform).toBe("scale(0.95)");
    expect(host.textContent).toContain("95%");

    await act(async () => {
      zoomOut?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(zoomLayer?.style.transform).toBe("scale(0.85)");

    await act(async () => {
      zoomIn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      resetZoom?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(zoomLayer?.style.transform).toBe("scale(0.85)");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("links paper-view feature rows with the corresponding editor rows", async () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    const previewSyn = host.querySelector<HTMLElement>('[data-preview-feature-name="SYN"]');
    const editorSyn = host.querySelector<HTMLElement>('[data-editor-feature-name="SYN"]');
    const previewSem = host.querySelector<HTMLElement>('[data-preview-feature-name="SEM"]');
    const editorSem = host.querySelector<HTMLElement>('[data-editor-feature-name="SEM"]');

    expect(previewSyn).not.toBeNull();
    expect(editorSyn).not.toBeNull();
    expect(previewSem).not.toBeNull();
    expect(editorSem).not.toBeNull();

    await act(async () => {
      previewSyn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(scrollIntoView).toHaveBeenCalled();
    expect(editorSyn?.className).toContain("feature-linked-active");
    expect(previewSyn?.className).toContain("feature-linked-active");

    await act(async () => {
      editorSem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(previewSem?.className).toContain("feature-linked-active");

    await act(async () => {
      root.unmount();
    });
    host.remove();
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("gives icon-only app buttons a hover title in both modes", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<App />);
    });

    expect(iconOnlyButtonsWithoutTitles(host)).toEqual([]);

    const treeModeButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Tree")
    );
    await act(async () => {
      treeModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(iconOnlyButtonsWithoutTitles(host)).toEqual([]);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});

function iconOnlyButtonsWithoutTitles(host: HTMLElement): string[] {
  return [...host.querySelectorAll<HTMLButtonElement>("button")]
    .filter((button) => button.textContent?.trim() === "")
    .filter((button) => !button.getAttribute("title")?.trim())
    .map((button) => button.textContent?.trim() || button.getAttribute("aria-label") || button.className);
}
