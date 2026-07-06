import { describe, expect, it } from "vitest";
import {
  assignIndexToValue,
  assignTagToValue,
  collectTagDefinitions,
  collectTagIds,
  createAtomicValue,
  createFeatureEntry,
  createFeatureStructure,
  createInitialSign,
  createIndexRefValue,
  createListValue,
  createNestedFeatureStructureValue,
  createTagReferenceForValue,
  createTagRefValue,
  createTypeValue,
  orderFeaturesCanonically,
  type IndexRegistry
} from "../src/core/model";
import { exportLangSciAvm } from "../src/core/exportLangSciAvm";
import { exportJson, importJson } from "../src/core/importExportJson";
import { createTreeNode } from "../src/core/treeModel";

describe("Feature Structure Studio core model", () => {
  it("creates an initial sign with only sign-licensed major features", () => {
    const sign = createInitialSign();

    expect(sign.type).toBe("sign");
    expect(sign.features.map((feature) => feature.name)).toEqual([
      "PHON",
      "FORM",
      "SYN",
      "SEM",
      "CNTXT"
    ]);
    const syn = sign.features.find((feature) => feature.name === "SYN");

    expect(syn?.value.kind).toBe("feature-structure");
    if (syn?.value.kind !== "feature-structure") {
      throw new Error("Expected SYN to be a feature structure");
    }
    expect(syn.value.structure.features.map((feature) => feature.name)).toEqual([
      "CAT",
      "VAL",
      "MRKG"
    ]);
  });

  it("creates a feature structure with editable feature entries", () => {
    const fs = createFeatureStructure("sign", [
      createFeatureEntry("PHON", createListValue([createAtomicValue("walks")]))
    ]);

    expect(fs.type).toBe("sign");
    expect(fs.features).toHaveLength(1);
    expect(fs.features[0].name).toBe("PHON");
  });

  it("represents nested feature structures", () => {
    const fs = createFeatureStructure("sign", [
      createFeatureEntry(
        "SYN",
        createNestedFeatureStructureValue(
          createFeatureStructure(undefined, [
            createFeatureEntry("CAT", createTypeValue("verb"))
          ])
        )
      )
    ]);

    expect(fs.features[0].value.kind).toBe("feature-structure");
  });

  it("represents list values and empty lists", () => {
    const argSt = createListValue([createTypeValue("NP"), createTypeValue("NP")]);
    const empty = createListValue([]);

    expect(argSt.items).toHaveLength(2);
    expect(empty.items).toHaveLength(0);
  });

  it("assigns and reuses an index through the registry", () => {
    const registry: IndexRegistry = {};
    const np = createTypeValue("NP");
    const indexed = assignIndexToValue(registry, "1", np);
    const ref = createIndexRefValue("1");

    expect(indexed.indexId).toBe("1");
    expect(ref.indexId).toBe("1");
    expect(registry["1"]).toEqual(indexed);
  });

  it("assigns HPSG tags separately from semantic indices", () => {
    const list = assignTagToValue("L", createListValue([{ ...createTypeValue("NP"), indexId: "i" }]));
    const ref = createTagRefValue("L");
    const fs = createFeatureStructure("lexeme", [
      createFeatureEntry("ARG-ST", list),
      createFeatureEntry("VAL", ref)
    ]);

    expect(list.tag).toBe("L");
    expect(list.items[0].indexId).toBe("i");
    expect(ref.tag).toBe("L");
    expect(collectTagIds(fs)).toEqual(["L"]);
  });

  it("classifies tag references by the object originally carrying the tag", () => {
    const taggedArgument = { ...createTypeValue("NP"), tag: "1" };
    const taggedList = assignTagToValue("L", createListValue([taggedArgument]));
    const fs = createFeatureStructure("lexeme", [
      createFeatureEntry("ARG-ST", taggedList)
    ]);

    expect(collectTagDefinitions(fs)).toEqual([
      { tag: "L", valueKind: "list" },
      { tag: "1", valueKind: "type" }
    ]);
  });

  it("lets HPSG tags identify whole feature structures", () => {
    const taggedStructure = { ...createFeatureStructure("phrase"), tag: "A" };
    const referenceTarget = createNestedFeatureStructureValue(createFeatureStructure("phrase"));

    expect(collectTagIds(taggedStructure)).toEqual(["A"]);
    expect(collectTagDefinitions(taggedStructure)).toEqual([
      { tag: "A", valueKind: "feature-structure" }
    ]);
    expect(
      createTagReferenceForValue(referenceTarget, { tag: "A", valueKind: "feature-structure" })
    ).toEqual(createTagRefValue("A"));
  });

  it("keeps list brackets when a list feature references an argument tag", () => {
    const argumentTag = { tag: "1", valueKind: "type" } as const;
    const listTag = { tag: "L", valueKind: "list" } as const;

    const argumentReference = createTagReferenceForValue(createListValue([]), argumentTag);
    const listReference = createTagReferenceForValue(createListValue([]), listTag);

    expect(argumentReference.kind).toBe("list");
    if (argumentReference.kind !== "list") {
      throw new Error("Expected argument tag reference to stay inside a list");
    }
    expect(argumentReference.items).toEqual([createTagRefValue("1")]);
    expect(listReference).toEqual(createTagRefValue("L"));
  });

  it("exports systematic langsci-avm LaTeX", () => {
    const indexedNp = assignIndexToValue({}, "1", createTypeValue("NP"));
    const fs = createFeatureStructure("sign", [
      createFeatureEntry("PHON", createListValue([createAtomicValue("walks")])),
      createFeatureEntry(
        "SYN",
        createNestedFeatureStructureValue(
          createFeatureStructure(undefined, [
            createFeatureEntry(
              "VAL",
              createNestedFeatureStructureValue(
                createFeatureStructure(undefined, [
                  createFeatureEntry("SUBJ", createListValue([indexedNp])),
                  createFeatureEntry("COMPS", createListValue([]))
                ])
              )
            )
          ])
        )
      ),
      createFeatureEntry("ARG-ST", createListValue([createIndexRefValue("1")]))
    ]);

    expect(exportLangSciAvm(fs)).toContain("\\avm{");
    expect(exportLangSciAvm(fs)).toContain("NP\\ind{1}");
    expect(exportLangSciAvm(fs)).toContain("COMPS & < >");
  });

  it("exports HPSG tags before the tagged object and bare tag references without list brackets", () => {
    const fs = createFeatureStructure("lexeme", [
      createFeatureEntry("ARG-ST", assignTagToValue("L", createListValue([createTypeValue("NP")]))),
      createFeatureEntry("VAL", createTagRefValue("L"))
    ]);
    const latex = exportLangSciAvm(fs);

    expect(latex).toContain("ARG-ST & \\boxed{\\mathit{L}}< NP >");
    expect(latex).toContain("VAL & \\boxed{\\mathit{L}}");
    expect(latex).not.toContain("VAL & < \\boxed{L} >");
  });

  it("round-trips feature structures through JSON", () => {
    const fs = createFeatureStructure("lexeme", [
      createFeatureEntry("SEM", { kind: "underspecified" })
    ]);

    expect(importJson(exportJson(fs))).toEqual(fs);
  });

  it("creates a tree node with an attached AVM", () => {
    const avm = createFeatureStructure("word", [
      createFeatureEntry("SYN", createTypeValue("verb"))
    ]);
    const node = createTreeNode("VP", [createTreeNode("V", [], avm)]);

    expect(node.children[0].avm?.type).toBe("word");
  });

  it("can apply the canonical major-feature order while preserving other features", () => {
    const sem = createFeatureEntry("SEM");
    const custom = createFeatureEntry("FRAME");
    const phon = createFeatureEntry("PHON");
    const argSt = createFeatureEntry("ARG-ST");
    const syn = createFeatureEntry("SYN");
    const cntxt = createFeatureEntry("CNTXT");
    const fs = createFeatureStructure("sign", [sem, custom, phon, argSt, syn, cntxt]);

    expect(orderFeaturesCanonically(fs.features).map((feature) => feature.name)).toEqual([
      "PHON",
      "SYN",
      "ARG-ST",
      "SEM",
      "CNTXT",
      "FRAME"
    ]);
  });
});
