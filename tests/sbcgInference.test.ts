import { describe, expect, it } from "vitest";
import {
  applySbcgProfile,
  createDefaultListItemForFeature,
  createFeatureEntryFromSpec,
  createValueForFeature,
  getFeatureSpecForType,
  getFeatureValueSpec,
  getMissingFeatureSuggestions,
  retargetFeatureStructureType
} from "../src/core/sbcgProfile";
import { createAtomicValue, createFeatureEntry, createFeatureStructure } from "../src/core/model";

describe("SBCG formalism inference", () => {
  it("expands a word with inherited sign and lexical-sign features", () => {
    const word = applySbcgProfile(createFeatureStructure("word"));
    const featureNames = word.features.map((feature) => feature.name);

    expect(featureNames).toEqual([
      "PHON",
      "FORM",
      "SYN",
      "ARG-ST",
      "SEM",
      "CNTXT"
    ]);
  });

  it("infers syntax-object feature geometry from SYN", () => {
    const synValue = createValueForFeature("SYN");

    expect(synValue.kind).toBe("feature-structure");
    if (synValue.kind !== "feature-structure") {
      throw new Error("Expected SYN to infer a feature structure");
    }
    expect(synValue.structure.type).toBe("syn-obj");
    expect(synValue.structure.features.map((feature) => feature.name)).toEqual([
      "CAT",
      "VAL",
      "MRKG"
    ]);
  });

  it("keeps nonlocal syntax features licensed but optional on syn-obj", () => {
    const synObj = createFeatureStructure("syn-obj", [
      createFeatureEntry("CAT", createValueForFeature("CAT")),
      createFeatureEntry("VAL", createValueForFeature("VAL")),
      createFeatureEntry("MRKG", createAtomicValue("unmk"))
    ]);

    expect(getMissingFeatureSuggestions(synObj).map((suggestion) => suggestion.name)).toEqual([
      "GAP",
      "WH",
      "REL"
    ]);
  });

  it("accepts Sag's longer feature names as aliases", () => {
    const syntaxValue = createValueForFeature("SYNTAX");
    const semanticsValue = createValueForFeature("SEMANTICS");
    const contextValue = createValueForFeature("CONTEXT");

    expect(syntaxValue.kind).toBe("feature-structure");
    expect(semanticsValue.kind).toBe("feature-structure");
    expect(contextValue.kind).toBe("feature-structure");
    if (
      syntaxValue.kind !== "feature-structure" ||
      semanticsValue.kind !== "feature-structure" ||
      contextValue.kind !== "feature-structure"
    ) {
      throw new Error("Expected aliases to infer feature structures");
    }
    expect(syntaxValue.structure.type).toBe("syn-obj");
    expect(semanticsValue.structure.type).toBe("sem-obj");
    expect(contextValue.structure.type).toBe("context-obj");
  });

  it("infers frame geometries illustrated in Section 3", () => {
    const quantifierFrame = applySbcgProfile(createFeatureStructure("quantifier-frame"));
    const namingFrame = applySbcgProfile(createFeatureStructure("naming-frame"));

    expect(quantifierFrame.features.map((feature) => feature.name)).toEqual([
      "LABEL",
      "BV",
      "RESTR",
      "SCOPE"
    ]);
    expect(namingFrame.features.map((feature) => feature.name)).toEqual([
      "LABEL",
      "ENTITY",
      "NAME"
    ]);
  });

  it("infers semantic-object feature geometry from SEM", () => {
    const semValue = createValueForFeature("SEM");

    expect(semValue.kind).toBe("feature-structure");
    if (semValue.kind !== "feature-structure") {
      throw new Error("Expected SEM to infer a feature structure");
    }
    expect(semValue.structure.type).toBe("sem-obj");
    expect(semValue.structure.features.map((feature) => feature.name)).toEqual([
      "INDEX",
      "LTOP",
      "FRAMES"
    ]);
  });

  it("infers context-object feature geometry from CNTXT", () => {
    const contextValue = createValueForFeature("CNTXT");

    expect(contextValue.kind).toBe("feature-structure");
    if (contextValue.kind !== "feature-structure") {
      throw new Error("Expected CNTXT to infer a feature structure");
    }
    expect(contextValue.structure.type).toBe("context-obj");
    expect(contextValue.structure.features.map((feature) => feature.name)).toEqual([
      "C-INDS",
      "BCKGRND"
    ]);
  });

  it("infers contextual-index feature geometry from C-INDS", () => {
    const contextualIndexValue = createValueForFeature("C-INDS");

    expect(contextualIndexValue.kind).toBe("feature-structure");
    if (contextualIndexValue.kind !== "feature-structure") {
      throw new Error("Expected C-INDS to infer a feature structure");
    }
    expect(contextualIndexValue.structure.type).toBe("contextual-index");
    expect(contextualIndexValue.structure.features.map((feature) => feature.name)).toEqual([
      "SPKR",
      "ADDR",
      "UTT-LOC"
    ]);
  });

  it("does not invent NP values for argument or valence lists", () => {
    const argSt = createValueForFeature("ARG-ST");
    const val = createValueForFeature("VAL");

    expect(argSt).toEqual({ kind: "list", items: [] });
    expect(val).toEqual({ kind: "list", items: [] });
  });

  it("infers inherited category features for verb", () => {
    const verb = applySbcgProfile(createFeatureStructure("verb"));

    expect(verb.features.map((feature) => feature.name)).toEqual([
      "SELECT",
      "XARG",
      "LID",
      "VF",
      "IC",
      "AUX",
      "INV"
    ]);
  });

  it("retargets a category object to verb and adds the licensed verb domain", () => {
    const category = createFeatureStructure("category", [
      createFeatureEntry("VF"),
      createFeatureEntry("CUSTOM", createAtomicValue("kept"))
    ]);

    const verb = retargetFeatureStructureType(category, "verb");

    expect(verb.type).toBe("verb");
    expect(verb.features.map((feature) => feature.name)).toEqual([
      "SELECT",
      "XARG",
      "LID",
      "VF",
      "IC",
      "AUX",
      "INV",
      "CUSTOM"
    ]);

    const vf = verb.features.find((feature) => feature.name === "VF");
    const custom = verb.features.find((feature) => feature.name === "CUSTOM");

    expect(vf?.value.kind).toBe("atomic");
    expect(custom?.value).toEqual(createAtomicValue("kept"));
  });

  it("retargets CAT values without keeping stale features from the previous category subtype", () => {
    const verbCategory = retargetFeatureStructureType(
      createFeatureStructure("category", [
        createFeatureEntry("CUSTOM", createAtomicValue("kept"))
      ]),
      "verb"
    );

    const nounCategory = retargetFeatureStructureType(verbCategory, "noun");

    expect(nounCategory.type).toBe("noun");
    expect(nounCategory.features.map((feature) => feature.name)).toEqual([
      "SELECT",
      "XARG",
      "LID",
      "CASE",
      "CUSTOM"
    ]);
    expect(nounCategory.features.some((feature) => feature.name === "AUX")).toBe(false);
    expect(nounCategory.features.some((feature) => feature.name === "INV")).toBe(false);
    expect(nounCategory.features.some((feature) => feature.name === "VF")).toBe(false);
    expect(nounCategory.features.some((feature) => feature.name === "IC")).toBe(false);
    expect(nounCategory.features.find((feature) => feature.name === "CUSTOM")?.value).toEqual(
      createAtomicValue("kept")
    );
  });

  it("returns missing feature suggestions without duplicating existing features", () => {
    const partial = createFeatureStructure("sign", [
      createFeatureEntry("SYN", createValueForFeature("SYN"))
    ]);

    expect(getMissingFeatureSuggestions(partial).map((suggestion) => suggestion.name)).toEqual([
      "PHON",
      "FORM",
      "SEM",
      "CNTXT"
    ]);
  });

  it("orders missing word features with ARG-ST before SEM and CNTXT", () => {
    const partial = createFeatureStructure("word", [
      createFeatureEntry("SYN", createValueForFeature("SYN"))
    ]);

    expect(getMissingFeatureSuggestions(partial).map((suggestion) => suggestion.name)).toEqual([
      "PHON",
      "FORM",
      "ARG-ST",
      "SEM",
      "CNTXT"
    ]);
  });

  it("orders major features canonically as they are inferred", () => {
    const sign = applySbcgProfile(
      createFeatureStructure("sign", [
        createFeatureEntry("SEM"),
        createFeatureEntry("PHON"),
        createFeatureEntry("SYN")
      ])
    );

    expect(sign.features.map((feature) => feature.name)).toEqual([
      "PHON",
      "FORM",
      "SYN",
      "SEM",
      "CNTXT"
    ]);
  });

  it("exposes typed-object and atomic value specs from the registry", () => {
    const catSpec = getFeatureSpecForType("syn-obj", "CAT");
    const vfSpec = getFeatureSpecForType("verb", "VF");

    expect(catSpec).toBeDefined();
    expect(vfSpec).toBeDefined();
    if (!catSpec || !vfSpec) {
      throw new Error("Expected registry feature specs");
    }

    expect(getFeatureValueSpec(catSpec)).toMatchObject({
      kind: "typed-object",
      type: "category"
    });
    expect(getFeatureValueSpec(vfSpec)).toMatchObject({
      kind: "atomic",
      valueType: "vform",
      values: ["fin", "base", "inf", "ger"]
    });
  });

  it("creates typed feature structures from licensed feature specs", () => {
    const catSpec = getFeatureSpecForType("syn-obj", "CAT");
    if (!catSpec) {
      throw new Error("Expected CAT spec");
    }

    const entry = createFeatureEntryFromSpec(catSpec);

    expect(entry.value.kind).toBe("feature-structure");
    if (entry.value.kind !== "feature-structure") {
      throw new Error("Expected CAT to create a typed feature structure");
    }
    expect(entry.value.structure.type).toBe("category");
  });

  it("creates VAL as a list from the licensed syn-obj feature spec", () => {
    const valSpec = getFeatureSpecForType("syn-obj", "VAL");
    if (!valSpec) {
      throw new Error("Expected VAL spec");
    }

    expect(getFeatureValueSpec(valSpec)).toMatchObject({
      kind: "list",
      itemType: "expression"
    });

    const entry = createFeatureEntryFromSpec(valSpec);

    expect(entry.value).toEqual({ kind: "list", items: [] });
  });

  it("creates frame feature structures as default items for FRAMES", () => {
    const framesSpec = getFeatureSpecForType("sem-obj", "FRAMES");
    if (!framesSpec) {
      throw new Error("Expected FRAMES spec");
    }

    const item = createDefaultListItemForFeature(framesSpec);

    expect(item.kind).toBe("feature-structure");
    if (item.kind !== "feature-structure") {
      throw new Error("Expected FRAMES item to be a feature structure");
    }
    expect(item.structure.type).toBe("frame");
    expect(item.structure.features.map((feature) => feature.name)).toEqual(["LABEL"]);
  });

  it("licenses hitting-frame participant features as index values", () => {
    const hittingFrame = applySbcgProfile(createFeatureStructure("hitting-frame"));

    expect(hittingFrame.features.map((feature) => feature.name)).toEqual([
      "LABEL",
      "HITTER",
      "HITTEE"
    ]);
    expect(hittingFrame.features.find((feature) => feature.name === "HITTER")?.value.kind).toBe(
      "index-ref"
    );
    expect(hittingFrame.features.find((feature) => feature.name === "HITTEE")?.value.kind).toBe(
      "index-ref"
    );
  });
});
