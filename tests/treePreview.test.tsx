import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { TreeEditor, TreePreview } from "../src/components/TreeEditor";
import {
  createFeatureEntry,
  createFeatureStructure,
  createTypeValue
} from "../src/core/model";
import { createInitialTree, createTreeNode } from "../src/core/treeModel";

describe("Tree paper preview", () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  it("starts with S over NP and VP signs", () => {
    const tree = createInitialTree();

    expect(tree.label).toBe("S");
    expect(tree.avm?.type).toBe("phrase");
    expect(tree.children.map((child) => child.label)).toEqual(["NP", "VP"]);
    expect(tree.children.map((child) => child.avm?.type)).toEqual(["phrase", "phrase"]);
    [tree, ...tree.children].forEach((node) => {
      expect(node.avm?.features.map((feature) => feature.name)).toEqual(["FORM", "SYN", "SEM"]);
    });
  });

  it("renders attached AVMs as tree nodes connected by branch lines", () => {
    const mother = createFeatureStructure("sign", [
      createFeatureEntry("SYN", createTypeValue("phrase"))
    ]);
    const daughter = createFeatureStructure("word", [
      createFeatureEntry("SYN", createTypeValue("verb"))
    ]);
    const tree = createTreeNode("S", [createTreeNode("V", [], daughter)], mother);

    const markup = renderToStaticMarkup(
      <TreePreview node={tree} onSelectIndex={() => undefined} />
    );

    expect(markup).toContain("tree-paper-node");
    expect(markup).toContain("tree-node-avm");
    expect(markup).toContain("preview-structure");
    expect(markup).toContain("tree-branch-lines");
    expect(markup).toContain("sign");
    expect(markup).toContain("word");
    expect(markup).not.toContain("tree-avm-badge");
  });

  it("converges daughter branch lines to the mother's centered bottom anchor", () => {
    const markup = renderToStaticMarkup(
      <TreePreview node={createInitialTree()} onSelectIndex={() => undefined} />
    );

    expect(markup).toContain('class="tree-branch-lines"');
    expect(markup).toContain('<line x1="50" y1="0" x2="25" y2="100"');
    expect(markup).toContain('<line x1="50" y1="0" x2="75" y2="100"');
  });

  it("renders shorthand node labels above AVMs by default and can hide them", () => {
    const tree = createInitialTree();

    const shown = renderToStaticMarkup(
      <TreePreview node={tree} onSelectIndex={() => undefined} />
    );
    const hidden = renderToStaticMarkup(
      <TreePreview node={tree} showNodeLabels={false} onSelectIndex={() => undefined} />
    );

    expect(shown).toContain("tree-node-label");
    expect(shown).toContain(">S<");
    expect(shown).toContain(">NP<");
    expect(shown).toContain(">VP<");
    expect(shown.indexOf(">S<")).toBeLessThan(shown.indexOf("preview-structure"));
    expect(hidden).not.toContain("tree-node-label");
    expect(hidden).toContain("preview-structure");
  });

  it("highlights the selected feature inside node-attached AVMs", () => {
    const syn = createFeatureEntry("SYN", createTypeValue("phrase"));
    const tree = createTreeNode("S", [], createFeatureStructure("sign", [syn]));

    const markup = renderToStaticMarkup(
      <TreePreview
        node={tree}
        highlightedFeatureId={syn.id}
        onSelectFeature={() => undefined}
        onSelectIndex={() => undefined}
      />
    );

    expect(markup).toContain(`data-preview-feature-id="${syn.id}"`);
    expect(markup).toContain("feature-linked-active");
  });

  it("makes tags from one node available to feature editors on other nodes", () => {
    const taggedMother = createFeatureStructure("sign", [
      createFeatureEntry("FORM", { ...createTypeValue("NP"), tag: "A" })
    ]);
    const child = createFeatureStructure("word", [
      createFeatureEntry("SYN", createTypeValue("verb"))
    ]);
    const tree = createTreeNode("S", [createTreeNode("V", [], child)], taggedMother);

    const markup = renderToStaticMarkup(
      <TreeEditor
        node={tree}
        onChange={() => undefined}
        onSelectIndex={() => undefined}
      />
    );

    const tagReferenceOptions = markup.match(/<option value="A">/g) ?? [];

    expect(tagReferenceOptions).toHaveLength(2);
  });

  it("makes whole node AVM tags editable and available as feature-structure references", () => {
    const taggedMother = {
      ...createFeatureStructure("sign", [
        createFeatureEntry("FORM", createTypeValue("phrase"))
      ]),
      tag: "A"
    };
    const child = createFeatureStructure("word", [
      createFeatureEntry("SYN", createTypeValue("verb"))
    ]);
    const tree = createTreeNode("S", [createTreeNode("VP", [], child)], taggedMother);

    const markup = renderToStaticMarkup(
      <TreeEditor
        node={tree}
        onChange={() => undefined}
        onSelectIndex={() => undefined}
      />
    );

    const tagReferenceOptions = markup.match(/<option value="A">A \(feature-structure\)<\/option>/g) ?? [];

    expect(markup).toContain('aria-label="AVM tag for S"');
    expect(tagReferenceOptions).toHaveLength(2);
  });

  it("keeps node AVMs attached and exposes collapsible sign features in the tree editor", () => {
    const markup = renderToStaticMarkup(
      <TreeEditor
        node={createInitialTree()}
        onChange={() => undefined}
        onSelectIndex={() => undefined}
      />
    );
    const collapseSynButtons = markup.match(/aria-label="Collapse SYN"/g) ?? [];

    expect(markup).not.toContain("Remove AVM");
    expect(markup).not.toContain("Attach AVM");
    expect(collapseSynButtons).toHaveLength(3);
  });

  it("collapses and expands whole tree editor nodes", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <TreeEditor
          node={createInitialTree()}
          onChange={() => undefined}
          onSelectIndex={() => undefined}
        />
      );
    });

    expect(host.querySelectorAll('button[aria-label^="Collapse node"]')).toHaveLength(3);
    expect(host.querySelector('input[value="NP"]')).not.toBeNull();

    const collapseRoot = host.querySelector<HTMLButtonElement>('button[aria-label="Collapse node S"]');
    await act(async () => {
      collapseRoot?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.querySelector('button[aria-label="Expand node S"]')).not.toBeNull();
    expect(host.querySelector('input[value="NP"]')).toBeNull();
    expect(host.textContent).toContain("S node collapsed");

    await act(async () => {
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Expand node S"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.querySelector('button[aria-label="Collapse node S"]')).not.toBeNull();
    expect(host.querySelector('input[value="NP"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("adds new child nodes with phrase AVMs already attached", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let tree = createInitialTree();

    await act(async () => {
      root.render(
        <TreeEditor
          node={tree}
          onChange={(nextTree) => {
            tree = nextTree;
          }}
          onSelectIndex={() => undefined}
        />
      );
    });

    const addChild = host.querySelector<HTMLButtonElement>('button[title="Add child node"]');

    await act(async () => {
      addChild?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(tree.children).toHaveLength(3);
    expect(tree.children[2].label).toBe("XP");
    expect(tree.children[2].avm?.type).toBe("phrase");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
