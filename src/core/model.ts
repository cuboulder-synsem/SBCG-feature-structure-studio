export type ValueKind =
  | "atomic"
  | "type"
  | "list"
  | "feature-structure"
  | "index-ref"
  | "tag-ref"
  | "underspecified";

interface BaseValue {
  kind: ValueKind;
  indexId?: string;
  tag?: string;
}

export interface AtomicValue extends BaseValue {
  kind: "atomic";
  value: string;
}

export interface TypeValue extends BaseValue {
  kind: "type";
  label: string;
}

export interface ListValue extends BaseValue {
  kind: "list";
  items: FSValue[];
}

export interface FeatureStructureValue extends BaseValue {
  kind: "feature-structure";
  structure: FeatureStructure;
}

export interface IndexRefValue extends BaseValue {
  kind: "index-ref";
  indexId: string;
}

export interface TagRefValue extends BaseValue {
  kind: "tag-ref";
  tag: string;
}

export interface UnderspecifiedValue extends BaseValue {
  kind: "underspecified";
}

export type FSValue =
  | AtomicValue
  | TypeValue
  | ListValue
  | FeatureStructureValue
  | IndexRefValue
  | TagRefValue
  | UnderspecifiedValue;

export interface FeatureStructure {
  id: string;
  type?: string;
  features: FeatureEntry[];
}

export interface FeatureEntry {
  id: string;
  name: string;
  value: FSValue;
}

export interface IndexRegistry {
  [indexId: string]: FSValue;
}

export interface TagDefinition {
  tag: string;
  valueKind: ValueKind;
}

export const canonicalMajorFeatureOrder = ["PHON", "FORM", "SYN", "ARG-ST", "SEM", "CNTXT"] as const;

const canonicalMajorFeatureRanks = new Map<string, number>(
  canonicalMajorFeatureOrder.map((featureName, index) => [featureName, index])
);

export const createId = (prefix = "id"): string =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

export function createAtomicValue(value = ""): AtomicValue {
  return { kind: "atomic", value };
}

export function createTypeValue(label = "type"): TypeValue {
  return { kind: "type", label };
}

export function createListValue(items: FSValue[] = []): ListValue {
  return { kind: "list", items };
}

export function createNestedFeatureStructureValue(
  structure = createFeatureStructure()
): FeatureStructureValue {
  return { kind: "feature-structure", structure };
}

export function createIndexRefValue(indexId: string): IndexRefValue {
  return { kind: "index-ref", indexId };
}

export function createTagRefValue(tag: string): TagRefValue {
  return { kind: "tag-ref", tag };
}

export function createTagReferenceForValue(
  currentValue: FSValue,
  tagDefinition: TagDefinition
): FSValue {
  const reference = createTagRefValue(tagDefinition.tag);
  if (currentValue.kind === "list" && tagDefinition.valueKind !== "list") {
    return {
      ...currentValue,
      tag: undefined,
      indexId: undefined,
      items: [reference]
    };
  }
  return reference;
}

export function createUnderspecifiedValue(): UnderspecifiedValue {
  return { kind: "underspecified" };
}

export function createFeatureEntry(name = "FEATURE", value: FSValue = createUnderspecifiedValue()): FeatureEntry {
  return {
    id: createId("feature"),
    name,
    value
  };
}

export function createFeatureStructure(
  type = "object",
  features: FeatureEntry[] = []
): FeatureStructure {
  return {
    id: createId("fs"),
    type,
    features: orderFeaturesCanonically(features)
  };
}

export function createInitialSign(): FeatureStructure {
  return createFeatureStructure("sign", [
    createFeatureEntry("PHON", createListValue([createAtomicValue("")])),
    createFeatureEntry("SYN", createNestedFeatureStructureValue(createFeatureStructure("syn-obj"))),
    createFeatureEntry("ARG-ST", createListValue([])),
    createFeatureEntry("SEM", createNestedFeatureStructureValue(createFeatureStructure("sem-obj")))
  ]);
}

export function assignIndexToValue<T extends FSValue>(
  registry: IndexRegistry,
  indexId: string,
  value: T
): T {
  const indexed = { ...value, indexId } as T;
  registry[indexId] = indexed;
  return indexed;
}

export function assignTagToValue<T extends FSValue>(tag: string, value: T): T {
  return { ...value, tag } as T;
}

export function cloneValue(value: FSValue): FSValue {
  return structuredClone(value) as FSValue;
}

export function defaultValueForKind(kind: ValueKind): FSValue {
  switch (kind) {
    case "atomic":
      return createAtomicValue("");
    case "type":
      return createTypeValue("type");
    case "list":
      return createListValue([]);
    case "feature-structure":
      return createNestedFeatureStructureValue(createFeatureStructure());
    case "index-ref":
      return createIndexRefValue("1");
    case "tag-ref":
      return createTagRefValue("1");
    case "underspecified":
      return createUnderspecifiedValue();
  }
}

export function collectIndexIdsFromValue(value: FSValue, ids = new Set<string>()): Set<string> {
  if (value.indexId) {
    ids.add(value.indexId);
  }

  if (value.kind === "list") {
    value.items.forEach((item) => collectIndexIdsFromValue(item, ids));
  }

  if (value.kind === "feature-structure") {
    value.structure.features.forEach((feature) => collectIndexIdsFromValue(feature.value, ids));
  }

  return ids;
}

export function collectIndexIds(structure: FeatureStructure): string[] {
  const ids = new Set<string>();
  structure.features.forEach((feature) => collectIndexIdsFromValue(feature.value, ids));
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function collectTagIdsFromValue(value: FSValue, ids = new Set<string>()): Set<string> {
  if (value.tag) {
    ids.add(value.tag);
  }

  if (value.kind === "list") {
    value.items.forEach((item) => collectTagIdsFromValue(item, ids));
  }

  if (value.kind === "feature-structure") {
    value.structure.features.forEach((feature) => collectTagIdsFromValue(feature.value, ids));
  }

  return ids;
}

export function collectTagIds(structure: FeatureStructure): string[] {
  const ids = new Set<string>();
  structure.features.forEach((feature) => collectTagIdsFromValue(feature.value, ids));
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function collectTagDefinitionsFromValue(
  value: FSValue,
  definitions = new Map<string, TagDefinition>()
): Map<string, TagDefinition> {
  if (value.kind !== "tag-ref" && value.tag && !definitions.has(value.tag)) {
    definitions.set(value.tag, {
      tag: value.tag,
      valueKind: value.kind
    });
  }

  if (value.kind === "list") {
    value.items.forEach((item) => collectTagDefinitionsFromValue(item, definitions));
  }

  if (value.kind === "feature-structure") {
    value.structure.features.forEach((feature) =>
      collectTagDefinitionsFromValue(feature.value, definitions)
    );
  }

  return definitions;
}

export function collectTagDefinitions(structure: FeatureStructure): TagDefinition[] {
  const definitions = new Map<string, TagDefinition>();
  structure.features.forEach((feature) => collectTagDefinitionsFromValue(feature.value, definitions));
  return [...definitions.values()];
}

export function orderFeaturesCanonically(features: FeatureEntry[]): FeatureEntry[] {
  return features
    .map((feature, originalIndex) => ({ feature, originalIndex }))
    .sort((left, right) => {
      const leftRank = getCanonicalFeatureRank(left.feature.name);
      const rightRank = getCanonicalFeatureRank(right.feature.name);

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map(({ feature }) => feature);
}

export function orderStructureFeaturesCanonically(structure: FeatureStructure): FeatureStructure {
  return {
    ...structure,
    features: orderFeaturesCanonically(structure.features)
  };
}

export function getCanonicalFeatureRank(featureName: string): number {
  return canonicalMajorFeatureRanks.get(normalizeCanonicalFeatureName(featureName)) ?? Number.MAX_SAFE_INTEGER;
}

export function compareFeatureNamesCanonically(left: string, right: string): number {
  const leftRank = getCanonicalFeatureRank(left);
  const rightRank = getCanonicalFeatureRank(right);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  return left.localeCompare(right);
}

function normalizeCanonicalFeatureName(featureName: string): string {
  const normalized = featureName.trim().toUpperCase();
  if (["SYNTAX"].includes(normalized)) {
    return "SYN";
  }
  if (["SEMANTICS"].includes(normalized)) {
    return "SEM";
  }
  if (["CONTEXT"].includes(normalized)) {
    return "CNTXT";
  }
  if (["ARGUMENT-STRUCTURE", "ARGUMENTSTRUCTURE", "ARGUMENT STRUCTURE"].includes(normalized)) {
    return "ARG-ST";
  }
  return normalized;
}
