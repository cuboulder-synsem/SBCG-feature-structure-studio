import { describe, expect, it } from "vitest";
import { examples, templates } from "../src/templates";
import type { FeatureStructure, FSValue } from "../src/core/model";
import { exportLangSciAvm } from "../src/core/exportLangSciAvm";
import { getArgStItems, getFrameParticipantLinks } from "../src/core/semanticLinks";

describe("starter templates", () => {
  it("offers only sign-type starters in the Template dropdown", () => {
    expect(templates.map((template) => template.id)).toEqual([
      "sign",
      "lexeme",
      "word",
      "phrase",
      "construct"
    ]);
  });

  it("moves richer lexical presets into the Example dropdown", () => {
    expect(examples.map((example) => example.id)).toEqual([
      "verb-lexeme",
      "transitive-verb-word",
      "passive-word",
      "hit-hitting-frame"
    ]);
  });

  it("orders the verb-lexeme example as FORM, SYN, ARG-ST, then SEM", () => {
    const template = examples.find((candidate) => candidate.id === "verb-lexeme");

    expect(template?.structure.features.map((feature) => feature.name)).toEqual([
      "FORM",
      "SYN",
      "ARG-ST",
      "SEM"
    ]);
  });

  it("stores an explicit type on every nested feature structure in templates", () => {
    [...templates, ...examples].forEach((template) => {
      expect(template.structure.type, template.name).toBeTruthy();
      expectTemplateStructureIsTyped(template.structure);
    });
  });

  it("keeps reusable templates separate from filled examples", () => {
    expect(templates.some((candidate) => candidate.id === "hit-hitting-frame")).toBe(false);
    expect(examples.some((candidate) => candidate.id === "hit-hitting-frame")).toBe(true);
    expect(templates.some((candidate) => candidate.id === "verb-lexeme")).toBe(false);
    expect(examples.some((candidate) => candidate.id === "verb-lexeme")).toBe(true);
  });

  it("uses Sag sign geometry for the five starter templates", () => {
    expect(featureNamesForTemplate("sign")).toEqual(["PHON", "FORM", "SYN", "SEM", "CNTXT"]);
    expect(featureNamesForTemplate("lexeme")).toEqual([
      "FORM",
      "SYN",
      "ARG-ST",
      "SEM"
    ]);
    expect(featureNamesForTemplate("word")).toEqual([
      "FORM",
      "SYN",
      "ARG-ST",
      "SEM"
    ]);
    expect(featureNamesForTemplate("phrase")).toEqual(["FORM", "SYN", "SEM"]);
    expect(featureNamesForTemplate("construct")).toEqual(["MTR", "DTRS"]);
  });

  it("shows PHON and CNTXT only on the sign starter AVM", () => {
    expect(featureNamesForTemplate("sign")).toEqual(
      expect.arrayContaining(["PHON", "CNTXT"])
    );
    ["lexeme", "word", "phrase"].forEach((templateId) => {
      expect(featureNamesForTemplate(templateId)).not.toContain("PHON");
      expect(featureNamesForTemplate(templateId)).not.toContain("CNTXT");
    });
  });

  it("keeps example AVMs on the current non-sign feature geometry", () => {
    examples.forEach((example) => {
      expect(example.structure.features.map((feature) => feature.name), example.name).toEqual([
        "FORM",
        "SYN",
        "ARG-ST",
        "SEM"
      ]);
      expect(collectFeatureNames(example.structure), example.name).not.toContain("PHON");
      expect(findEmptyFeatureStructures(example.structure), example.name).toEqual([]);
    });
  });

  it("includes a HIT example with frame-role indices linked to bare ARG-ST NPs", () => {
    const template = examples.find((candidate) => candidate.id === "hit-hitting-frame");

    expect(template).toBeDefined();
    if (!template) {
      throw new Error("Expected HIT hitting-frame example");
    }

    const argStItems = getArgStItems(template.structure);
    const participants = getFrameParticipantLinks(template.structure);
    const latex = exportLangSciAvm(template.structure);

    expect(latex).toContain("FORM & < hit >");
    expect(argStItems.map((item) => item.label)).toEqual(["NP", "NP"]);
    expect(argStItems.map((item) => item.indexId)).toEqual(["i", "j"]);
    expect(participants.map((participant) => [participant.role, participant.indexId])).toEqual([
      ["HITTER", "i"],
      ["HITTEE", "j"]
    ]);
    expect(latex).toContain("ARG-ST & < NP\\ind{i}, NP\\ind{j} >");
    expect(latex).toContain("HITTER & \\ind{i}");
    expect(latex).toContain("HITTEE & \\ind{j}");
  });

  it("uses typed CAT objects instead of HEAD features in templates", () => {
    [...templates, ...examples].forEach((template) => {
      expect(collectFeatureNames(template.structure), template.name).not.toContain("HEAD");
    });

    const verbLexeme = examples.find((candidate) => candidate.id === "verb-lexeme");
    expect(findNestedFeatureStructureType(verbLexeme?.structure, "CAT")).toBe("verb");
  });

  it("keeps template VAL features as SYN-level lists", () => {
    [...templates, ...examples].forEach((template) => {
      collectFeatureValues(template.structure, "VAL").forEach((value) => {
        expect(value.kind, template.name).toBe("list");
      });
    });
  });
});

function featureNamesForTemplate(templateId: string): string[] {
  const template = templates.find((candidate) => candidate.id === templateId);
  if (!template) {
    throw new Error(`Expected ${templateId} template`);
  }
  return template.structure.features.map((feature) => feature.name);
}

function expectTemplateStructureIsTyped(structure: FeatureStructure): void {
  structure.features.forEach((feature) => expectTemplateValueIsTyped(feature.value));
}

function expectTemplateValueIsTyped(value: FSValue): void {
  if (value.kind === "feature-structure") {
    expect(value.structure.type).toBeTruthy();
    expectTemplateStructureIsTyped(value.structure);
  }

  if (value.kind === "list") {
    value.items.forEach((item) => expectTemplateValueIsTyped(item));
  }
}

function collectFeatureNames(structure: FeatureStructure, names: string[] = []): string[] {
  structure.features.forEach((feature) => {
    names.push(feature.name);
    if (feature.value.kind === "feature-structure") {
      collectFeatureNames(feature.value.structure, names);
    }
    if (feature.value.kind === "list") {
      feature.value.items.forEach((item) => {
        if (item.kind === "feature-structure") {
          collectFeatureNames(item.structure, names);
        }
      });
    }
  });
  return names;
}

function findEmptyFeatureStructures(
  structure: FeatureStructure,
  path = structure.type ?? structure.id,
  emptyPaths: string[] = []
): string[] {
  if (structure.features.length === 0) {
    emptyPaths.push(path);
  }

  structure.features.forEach((feature) => {
    if (feature.value.kind === "feature-structure") {
      findEmptyFeatureStructures(
        feature.value.structure,
        `${path}.${feature.name}:${feature.value.structure.type ?? feature.value.structure.id}`,
        emptyPaths
      );
    }
    if (feature.value.kind === "list") {
      feature.value.items.forEach((item, index) => {
        if (item.kind === "feature-structure") {
          findEmptyFeatureStructures(
            item.structure,
            `${path}.${feature.name}[${index}]:${item.structure.type ?? item.structure.id}`,
            emptyPaths
          );
        }
      });
    }
  });

  return emptyPaths;
}

function findNestedFeatureStructureType(
  structure: FeatureStructure | undefined,
  featureName: string
): string | undefined {
  if (!structure) {
    return undefined;
  }

  for (const feature of structure.features) {
    if (feature.name === featureName && feature.value.kind === "feature-structure") {
      return feature.value.structure.type;
    }
    if (feature.value.kind === "feature-structure") {
      const nested = findNestedFeatureStructureType(feature.value.structure, featureName);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

function collectFeatureValues(
  structure: FeatureStructure,
  featureName: string,
  values: FSValue[] = []
): FSValue[] {
  structure.features.forEach((feature) => {
    if (feature.name === featureName) {
      values.push(feature.value);
    }
    if (feature.value.kind === "feature-structure") {
      collectFeatureValues(feature.value.structure, featureName, values);
    }
    if (feature.value.kind === "list") {
      feature.value.items.forEach((item) => {
        if (item.kind === "feature-structure") {
          collectFeatureValues(item.structure, featureName, values);
        }
      });
    }
  });
  return values;
}
