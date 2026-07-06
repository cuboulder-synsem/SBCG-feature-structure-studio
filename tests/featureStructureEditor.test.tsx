import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeatureStructureEditor } from "../src/components/FeatureStructureEditor";
import {
  collectIndexIds,
  createIndexRefValue,
  createFeatureEntry,
  createFeatureStructure,
  createListValue,
  createNestedFeatureStructureValue,
  createTypeValue
} from "../src/core/model";
import {
  createFeatureEntryFromSpec,
  getFeatureSpecForType,
  getMissingFeatureSuggestions,
  typeRegistry
} from "../src/core/sbcgProfile";
import { examples } from "../src/templates";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("FeatureStructureEditor type-driven controls", () => {
  it("uses the type registry to offer only licensed features for a typed object", () => {
    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={createFeatureStructure("verb")}
        onChange={() => undefined}
        availableIndexes={[]}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).toContain("Add licensed feature");
    expect(markup).toContain("VF");
    expect(markup).toContain("AUX");
    expect(markup).toContain("Custom feature");
    expect(markup).not.toContain("Infer SBCG");
  });

  it("does not render a manual Infer SBCG button", () => {
    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={createFeatureStructure("sign")}
        onChange={() => undefined}
        availableIndexes={[]}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).not.toContain("Infer SBCG");
    expect(markup).not.toContain("Infer appropriate SBCG features");
  });

  it("offers every missing licensed feature for every registered typed object", () => {
    Object.keys(typeRegistry).forEach((typeName) => {
      const structure = createFeatureStructure(typeName);
      const expectedFeatures = getMissingFeatureSuggestions(structure).map(
        (suggestion) => suggestion.name
      );
      const markup = renderToStaticMarkup(
        <FeatureStructureEditor
          structure={structure}
          onChange={() => undefined}
          availableIndexes={[]}
          onSelectIndex={() => undefined}
        />
      );

      if (expectedFeatures.length === 0) {
        expect(markup, typeName).not.toContain("All features added");
        expect(markup, typeName).toContain("Custom feature");
        return;
      }

      expect(markup, typeName).toContain("Add licensed feature");
      expect(markup, typeName).toContain("Custom feature");
      expectedFeatures.forEach((featureName) => {
        expect(markup, `${typeName}.${featureName}`).toContain(featureName);
      });
    });
  });

  it("renders atomic enumerations from the registry as value dropdowns", () => {
    const vfSpec = getFeatureSpecForType("verb", "VF");
    if (!vfSpec) {
      throw new Error("Expected VF spec");
    }
    const structure = createFeatureStructure("verb", [createFeatureEntryFromSpec(vfSpec)]);

    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={structure}
        onChange={() => undefined}
        availableIndexes={[]}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).toContain('aria-label="VF value"');
    expect(markup).toContain("fin");
    expect(markup).toContain("base");
    expect(markup).toContain("ger");
  });

  it("places frame-to-ARG-ST controls inline on SEM frame participants", () => {
    const example = examples.find((candidate) => candidate.id === "hit-hitting-frame");
    if (!example) {
      throw new Error("Expected HIT example");
    }

    const structure = structuredClone(example.structure);
    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={structure}
        onChange={() => undefined}
        availableIndexes={collectIndexIds(structure)}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).not.toContain("Frame links");
    expect(markup).toContain('aria-label="Map HITTER to ARG-ST"');
    expect(markup).toContain('aria-label="Map HITTEE to ARG-ST"');
    expect(markup).toContain('aria-label="Index for HITTER"');
    expect(markup).toContain('aria-label="Index for HITTEE"');
  });

  it("allows frame structures inside FRAMES lists to add open frame elements from Add Feature", () => {
    const example = examples.find((candidate) => candidate.id === "hit-hitting-frame");
    if (!example) {
      throw new Error("Expected HIT example");
    }

    const structure = structuredClone(example.structure);
    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={structure}
        onChange={() => undefined}
        availableIndexes={collectIndexIds(structure)}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).toContain('value="__frame_element__"');
    expect(markup).toContain("Add frame element");
    expect(markup).not.toContain('title="Add frame element"');
  });

  it("marks destructive row actions as corner controls so zoomed editors can stack cleanly", () => {
    const example = examples.find((candidate) => candidate.id === "hit-hitting-frame");
    if (!example) {
      throw new Error("Expected HIT example");
    }

    const structure = structuredClone(example.structure);
    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={structure}
        onChange={() => undefined}
        availableIndexes={collectIndexIds(structure)}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).toContain("feature-delete-button");
    expect(markup).toContain("list-item-delete-button");
  });

  it("does not expose manual feature-order controls", () => {
    const structure = createFeatureStructure("sign", [
      createFeatureEntry("SYN", createTypeValue("syn-obj")),
      createFeatureEntry("SEM", createTypeValue("sem-obj"))
    ]);
    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={structure}
        onChange={() => undefined}
        availableIndexes={[]}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).not.toContain("order-controls");
    expect(markup).not.toContain("Move SYN up");
    expect(markup).not.toContain("Move SEM down");
    expect(markup).not.toContain("Order of SYN");
    expect(markup).toContain("feature-drag-handle");
  });

  it("lets users drag feature rows to reorder them", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const structure = createFeatureStructure("sign", [
      createFeatureEntry("SYN", createTypeValue("syn-obj")),
      createFeatureEntry("SEM", createTypeValue("sem-obj"))
    ]);
    let nextStructure = structure;

    await act(async () => {
      root.render(
        <FeatureStructureEditor
          structure={structure}
          onChange={(next) => {
            nextStructure = next;
          }}
          availableIndexes={[]}
          onSelectIndex={() => undefined}
        />
      );
    });

    const rows = host.querySelectorAll<HTMLElement>(".feature-row");
    const handles = host.querySelectorAll<HTMLElement>(".feature-drag-handle");

    expect([...rows].map((row) => row.dataset.featureName)).toEqual(["SYN", "SEM"]);
    expect(handles).toHaveLength(2);

    await act(async () => {
      handles[1].dispatchEvent(new Event("dragstart", { bubbles: true }));
    });
    await act(async () => {
      rows[0].dispatchEvent(new Event("dragover", { bubbles: true }));
      rows[0].dispatchEvent(new Event("drop", { bubbles: true }));
    });

    expect(nextStructure.features.map((feature) => feature.name)).toEqual(["SEM", "SYN"]);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("keeps HPSG tag controls inside a compact value actions menu", () => {
    const structure = createFeatureStructure("lexeme", [
      createFeatureEntry("ARG-ST", createTypeValue("NP"))
    ]);
    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={structure}
        onChange={() => undefined}
        availableIndexes={[]}
        availableTags={[{ tag: "L", valueKind: "list" }]}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).toContain("Value actions");
    expect(markup).toContain("Tag");
    expect(markup).toContain("Tag reference");
    expect(markup).not.toContain("Reuse index");
  });

  it("lets the compact value actions menu collapse after opening", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const structure = createFeatureStructure("lexeme", [
      createFeatureEntry("ARG-ST", createTypeValue("NP"))
    ]);

    await act(async () => {
      root.render(
        <FeatureStructureEditor
          structure={structure}
          onChange={() => undefined}
          availableIndexes={[]}
          availableTags={[{ tag: "L", valueKind: "list" }]}
          onSelectIndex={() => undefined}
        />
      );
    });

    const menu = host.querySelector<HTMLDetailsElement>(".value-actions-menu");
    const summary = host.querySelector<HTMLElement>(".value-actions-summary");

    expect(menu).not.toBeNull();
    expect(summary).not.toBeNull();
    expect(menu?.open).toBe(false);

    await act(async () => {
      summary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu?.open).toBe(true);

    await act(async () => {
      summary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu?.open).toBe(false);

    await act(async () => {
      summary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu?.open).toBe(true);

    await act(async () => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(menu?.open).toBe(false);

    await act(async () => {
      summary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu?.open).toBe(true);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(menu?.open).toBe(false);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("offers collapse controls for structured features in the first two layers", () => {
    const structure = createFeatureStructure("sign", [
      createFeatureEntry(
        "SYN",
        createNestedFeatureStructureValue(
          createFeatureStructure("syn-obj", [
            createFeatureEntry(
              "CAT",
              createNestedFeatureStructureValue(createFeatureStructure("verb"))
            )
          ])
        )
      ),
      createFeatureEntry(
        "SEM",
        createNestedFeatureStructureValue(
          createFeatureStructure("sem-obj", [
            createFeatureEntry(
              "FRAMES",
              createListValue([
                createNestedFeatureStructureValue(
                  createFeatureStructure("hitting-frame", [
                    createFeatureEntry("HITTER", createIndexRefValue("i"))
                  ])
                )
              ])
            )
          ])
        )
      )
    ]);

    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={structure}
        onChange={() => undefined}
        availableIndexes={collectIndexIds(structure)}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).toContain('aria-label="Collapse SYN"');
    expect(markup).toContain('aria-label="Collapse SEM"');
    expect(markup).toContain('aria-label="Collapse CAT"');
    expect(markup).toContain('aria-label="Collapse FRAMES"');
    expect(markup).not.toContain('aria-label="Collapse HITTER"');
  });

  it("collapses and expands top-layer structured feature rows", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const structure = createFeatureStructure("sign", [
      createFeatureEntry(
        "SYN",
        createNestedFeatureStructureValue(
          createFeatureStructure("syn-obj", [
            createFeatureEntry("CAT", createTypeValue("verb"))
          ])
        )
      )
    ]);

    await act(async () => {
      root.render(
        <FeatureStructureEditor
          structure={structure}
          onChange={() => undefined}
          availableIndexes={collectIndexIds(structure)}
          onSelectIndex={() => undefined}
        />
      );
    });

    const collapseSyn = host.querySelector<HTMLButtonElement>('button[aria-label="Collapse SYN"]');
    expect(collapseSyn).not.toBeNull();
    expect(host.querySelector('[data-editor-feature-name="CAT"]')).not.toBeNull();

    await act(async () => {
      collapseSyn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.querySelector('button[aria-label="Expand SYN"]')).not.toBeNull();
    expect(host.querySelector('[data-editor-feature-name="CAT"]')).toBeNull();
    expect(host.textContent).toContain("syn-obj collapsed");

    await act(async () => {
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Expand SYN"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.querySelector('button[aria-label="Collapse SYN"]')).not.toBeNull();
    expect(host.querySelector('[data-editor-feature-name="CAT"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("gives icon-only editor buttons a hover title", () => {
    const example = examples.find((candidate) => candidate.id === "hit-hitting-frame");
    if (!example) {
      throw new Error("Expected HIT example");
    }
    const structure = structuredClone(example.structure);

    const markup = renderToStaticMarkup(
      <FeatureStructureEditor
        structure={structure}
        onChange={() => undefined}
        availableIndexes={collectIndexIds(structure)}
        onSelectIndex={() => undefined}
      />
    );
    const host = document.createElement("div");
    host.innerHTML = markup;
    const untitledButtons = [...host.querySelectorAll<HTMLButtonElement>("button")]
      .filter((button) => button.textContent?.trim() === "")
      .filter((button) => !button.getAttribute("title")?.trim())
      .map((button) => button.textContent?.trim() || button.getAttribute("aria-label") || button.className);

    expect(untitledButtons).toEqual([]);
  });
});
