import {
  createAtomicValue,
  createFeatureEntry,
  createFeatureStructure,
  createIndexRefValue,
  createListValue,
  createNestedFeatureStructureValue,
  createTypeValue,
  createUnderspecifiedValue,
  getCanonicalFeatureRank,
  orderFeaturesCanonically,
  type FeatureEntry,
  type FeatureStructure,
  type FSValue
} from "./model";

export type ValueShape =
  | "atomic"
  | "type"
  | "list"
  | "set"
  | "feature-structure"
  | "index-ref"
  | "underspecified";

export type RegistryValueKind =
  | "typed-object"
  | "atomic"
  | "list"
  | "set"
  | "index-ref"
  | "underspecified";

export interface FeatureValueSpec {
  kind: RegistryValueKind;
  valueType: string;
  type?: string;
  itemType?: string;
  values?: string[];
}

export interface SbcgFeatureSpec {
  name: string;
  valueType: string;
  shape: ValueShape;
  description: string;
  atomicValues?: string[];
  defaultIncluded?: boolean;
}

export interface SbcgTypeSpec {
  type: string;
  parents?: string[];
  features: SbcgFeatureSpec[];
  description: string;
}

export interface FeatureSuggestion extends SbcgFeatureSpec {
  inheritedFrom: string;
}

const typeAliases: Record<string, string> = {
  object: "object",
  sign: "sign",
  "lex-sign": "lex-sign",
  "lexical-sign": "lex-sign",
  lexeme: "lexeme",
  "verb-lexeme": "verb-lexeme",
  word: "word",
  "passive-word": "passive-word",
  phrase: "phrase",
  expression: "expression",
  construct: "construct",
  cxt: "construct",
  "syn-obj": "syn-obj",
  "syntax-object": "syn-obj",
  syntax: "syn-obj",
  valence: "valence",
  "sem-obj": "sem-obj",
  "semantic-object": "sem-obj",
  semantics: "sem-obj",
  "context-obj": "context-obj",
  context: "context-obj",
  "contextual-index": "contextual-index",
  cat: "category",
  category: "category",
  verbal: "verbal",
  verb: "verb",
  complementizer: "complementizer",
  comp: "complementizer",
  noun: "noun",
  nominal: "nominal",
  prep: "prep",
  preposition: "prep",
  adj: "adj",
  adjective: "adj",
  adv: "adv",
  adverb: "adv",
  "hitting-frame": "hitting-frame"
};

const featureAliases: Record<string, string> = {
  SYNTAX: "SYN",
  SEMANTICS: "SEM",
  CONTEXT: "CNTXT",
  INDEX: "INDEX",
  IND: "INDEX",
  CATEGORY: "CAT",
  VALENCE: "VAL",
  MARKING: "MRKG",
  "ARGUMENT-STRUCTURE": "ARG-ST",
  ARGUMENTSTRUCTURE: "ARG-ST",
  "ARGUMENT STRUCTURE": "ARG-ST",
  "PHONOLOGY": "PHON",
  "FORM": "FORM"
};

const atomicDomains: Record<string, string[]> = {
  boolean: ["+", "-"],
  case: ["nom", "acc", "gen"],
  mark: ["unmk", "def", "det", "than", "as", "of"],
  vform: ["fin", "base", "inf", "ger"]
};

export const sbcgTypes: Record<string, SbcgTypeSpec> = {
  object: {
    type: "object",
    description: "Root type for typed feature structures without a more specific grammar type.",
    features: []
  },
  sign: {
    type: "sign",
    description: "Sag Section 3 sign with phonology, form, syntax, semantics, and context.",
    features: [
      feature("PHON", "phon-obj", "list", "Phonological object; left as a list placeholder in the MVP."),
      feature("FORM", "morph-obj", "list", "Morphological object; represented as a list of forms/stems."),
      feature("SYN", "syn-obj", "feature-structure", "Syntax object."),
      feature("SEM", "sem-obj", "feature-structure", "Semantic object."),
      feature("CNTXT", "context-obj", "feature-structure", "Contextual information.")
    ]
  },
  "lex-sign": {
    type: "lex-sign",
    parents: ["sign"],
    description: "Lexical sign; adds ARG-ST to the general sign geometry.",
    features: [
      feature("ARG-ST", "list(expression)", "list", "Potential syntactico-semantic arguments.")
    ]
  },
  lexeme: {
    type: "lexeme",
    parents: ["lex-sign"],
    description: "Listed lexical sign before inflectional/postinflectional constructional licensing.",
    features: []
  },
  "verb-lexeme": {
    type: "verb-lexeme",
    parents: ["lexeme"],
    description: "Verb lexeme subtype for lexical entries whose category is verbal.",
    features: []
  },
  expression: {
    type: "expression",
    parents: ["sign"],
    description: "Expression sign; supertype of overt and covert expressions.",
    features: []
  },
  phrase: {
    type: "phrase",
    parents: ["expression"],
    description: "Phrasal overt expression; phrases do not introduce ARG-ST.",
    features: []
  },
  word: {
    type: "word",
    parents: ["expression", "lex-sign"],
    description: "Word inherits both expression and lexical-sign properties.",
    features: []
  },
  "passive-word": {
    type: "passive-word",
    parents: ["word"],
    description: "Passive word template subtype for passive lexical entries.",
    features: []
  },
  "syn-obj": {
    type: "syn-obj",
    description: "Sag Section 3 syntax object with category, valence, and marking.",
    features: [
      feature("CAT", "category", "feature-structure", "Complex grammatical category."),
      feature("VAL", "list(expression)", "list", "Locally unsaturated valents."),
      feature("MRKG", "mark", "atomic", "Marking value such as unmk, def, det, than, as, or of."),
      feature("GAP", "list(expression)", "list", "Nonlocal syntax gap list.", {
        defaultIncluded: false
      }),
      feature("WH", "set(expression)", "set", "Nonlocal wh/exclamative set.", {
        defaultIncluded: false
      }),
      feature("REL", "set(expression)", "set", "Nonlocal relative set.", {
        defaultIncluded: false
      })
    ]
  },
  valence: {
    type: "valence",
    description: "Valence object containing specifier/subject and complement requirements.",
    features: [
      feature("SPR", "list(expression)", "list", "Specifier requirements."),
      feature("SUBJ", "list(expression)", "list", "Subject requirements."),
      feature("COMPS", "list(expression)", "list", "Complement requirements.")
    ]
  },
  "sem-obj": {
    type: "sem-obj",
    description: "Flat semantic object in the MRS/frame-semantics style used by Sag.",
    features: [
      feature("INDEX", "index", "atomic", "Referential or situational index."),
      feature("LTOP", "label", "atomic", "Local top label."),
      feature("FRAMES", "list(frame)", "list", "Predications/frames contributing meaning.")
    ]
  },
  "context-obj": {
    type: "context-obj",
    description: "Context object for discourse indices and background propositions.",
    features: [
      feature("C-INDS", "contextual-index", "feature-structure", "Speaker, addressee, utterance location, and similar indices."),
      feature("BCKGRND", "list(proposition)", "list", "Background contextual propositions.")
    ]
  },
  "contextual-index": {
    type: "contextual-index",
    description: "Contextual index bundle.",
    features: [
      feature("SPKR", "index", "atomic", "Speaker index."),
      feature("ADDR", "index", "atomic", "Addressee index."),
      feature("UTT-LOC", "index", "atomic", "Utterance-location index.")
    ]
  },
  construct: {
    type: "construct",
    description: "Local tree licensed by a combinatoric construction.",
    features: [
      feature("MTR", "sign", "feature-structure", "Mother sign."),
      feature("DTRS", "nelist(sign)", "list", "Nonempty list of daughter signs; left empty until supplied."),
      feature("CXT-CONTENT", "list(frame)", "list", "Constructional semantic contribution.", {
        defaultIncluded: false
      })
    ]
  },
  category: {
    type: "category",
    description: "Complex category with selection, external argument, and lexical identifier.",
    features: [
      feature("SELECT", "sign-or-none", "underspecified", "Selected sign or none."),
      feature("XARG", "sign-or-none", "underspecified", "Externally visible argument or none."),
      feature("LID", "list(frame)", "list", "Lexical identifier frame list.")
    ]
  },
  verbal: {
    type: "verbal",
    parents: ["category"],
    description: "Verbal category supertype.",
    features: [
      feature("VF", "vform", "atomic", "Verb form."),
      feature("IC", "boolean", "atomic", "Independent-clause boolean.")
    ]
  },
  verb: {
    type: "verb",
    parents: ["verbal"],
    description: "Verb category.",
    features: [
      feature("AUX", "boolean", "atomic", "Auxiliary boolean."),
      feature("INV", "boolean", "atomic", "Inversion boolean.")
    ]
  },
  complementizer: {
    type: "complementizer",
    parents: ["verbal"],
    description: "Complementizer category.",
    features: []
  },
  nonverbal: {
    type: "nonverbal",
    parents: ["category"],
    description: "Nonverbal category supertype.",
    features: []
  },
  nominal: {
    type: "nominal",
    parents: ["nonverbal"],
    description: "Nominal category supertype.",
    features: []
  },
  noun: {
    type: "noun",
    parents: ["nominal"],
    description: "Noun category with English CASE.",
    features: [feature("CASE", "case", "atomic", "English case value.")]
  },
  prep: {
    type: "prep",
    parents: ["nominal"],
    description: "Preposition category.",
    features: []
  },
  adj: {
    type: "adj",
    parents: ["nonverbal"],
    description: "Adjective category.",
    features: []
  },
  adv: {
    type: "adv",
    parents: ["nonverbal"],
    description: "Adverb category.",
    features: []
  },
  frame: {
    type: "frame",
    description: "Semantic frame; Section 3 examples normally include a label.",
    features: [feature("LABEL", "label", "atomic", "Frame label.")]
  },
  "hitting-frame": {
    type: "hitting-frame",
    parents: ["frame"],
    description: "Local example frame for the verb hit, with hitter and hittee participant indices.",
    features: [
      feature("HITTER", "index", "index-ref", "Participant index for the hitter."),
      feature("HITTEE", "index", "index-ref", "Participant index for the hittee.")
    ]
  },
  "quantifier-frame": {
    type: "quantifier-frame",
    parents: ["frame"],
    description: "Generalized quantifier frame geometry illustrated in Section 3.",
    features: [
      feature("BV", "index", "atomic", "Bound variable."),
      feature("RESTR", "label", "atomic", "Restriction label."),
      feature("SCOPE", "label", "atomic", "Scope label.")
    ]
  },
  "situation-frame": {
    type: "situation-frame",
    parents: ["frame"],
    description: "Event/situation frame geometry illustrated in Section 3.",
    features: [feature("SIT", "index", "atomic", "Situational index.")]
  },
  "naming-frame": {
    type: "naming-frame",
    parents: ["frame"],
    description: "Background naming frame used for proper nouns in Section 3.",
    features: [
      feature("ENTITY", "index", "atomic", "Named entity."),
      feature("NAME", "morph-obj", "list", "Name form.")
    ]
  }
};

export const typeRegistry = sbcgTypes;

const featureSpecsByName: Record<string, SbcgFeatureSpec> = {};
Object.values(sbcgTypes).forEach((typeSpec) => {
  typeSpec.features.forEach((featureSpec) => {
    featureSpecsByName[featureSpec.name] = featureSpec;
  });
});

function feature(
  name: string,
  valueType: string,
  shape: ValueShape,
  description: string,
  options: Pick<SbcgFeatureSpec, "defaultIncluded"> = {}
): SbcgFeatureSpec {
  return {
    name,
    valueType,
    shape,
    description,
    atomicValues: atomicDomains[valueType],
    ...options
  };
}

export function normalizeSbcgType(type?: string): string | undefined {
  if (!type) {
    return undefined;
  }
  const normalized = type.trim().toLowerCase();
  return typeAliases[normalized] ?? normalized;
}

export function getSbcgTypeSpec(type?: string): SbcgTypeSpec | undefined {
  const normalized = normalizeSbcgType(type);
  return normalized ? sbcgTypes[normalized] : undefined;
}

export function getFeatureSuggestionsForType(type?: string): FeatureSuggestion[] {
  const normalized = normalizeSbcgType(type);
  if (!normalized || !sbcgTypes[normalized]) {
    return [];
  }
  return collectFeatures(normalized);
}

export function getFeatureSpecForType(
  type: string | undefined,
  featureName: string
): FeatureSuggestion | undefined {
  const normalizedFeature = normalizeFeatureName(featureName);
  return getFeatureSuggestionsForType(type).find(
    (suggestion) => suggestion.name === normalizedFeature
  );
}

export function getFeatureValueSpec(spec: SbcgFeatureSpec): FeatureValueSpec {
  const valueType = spec.valueType;
  const normalizedValueType = normalizeValueType(valueType);

  if (spec.shape === "feature-structure") {
    return {
      kind: "typed-object",
      valueType,
      type: normalizedValueType
    };
  }

  if (spec.shape === "list" || spec.shape === "set") {
    return {
      kind: spec.shape,
      valueType,
      itemType: normalizedValueType
    };
  }

  if (spec.shape === "atomic" || spec.shape === "type") {
    return {
      kind: "atomic",
      valueType,
      values: spec.atomicValues
    };
  }

  if (spec.shape === "index-ref") {
    return {
      kind: "index-ref",
      valueType
    };
  }

  return {
    kind: "underspecified",
    valueType
  };
}

export function getMissingFeatureSuggestions(structure: FeatureStructure): FeatureSuggestion[] {
  const existing = new Set(structure.features.map((featureEntry) => featureEntry.name.toUpperCase()));
  return orderFeatureSuggestionsCanonically(
    getFeatureSuggestionsForType(structure.type).filter(
      (suggestion) => !existing.has(suggestion.name)
    )
  );
}

export function applySbcgProfile(structure: FeatureStructure): FeatureStructure {
  const missingFeatures = getMissingFeatureSuggestions(structure)
    .filter(isDefaultIncludedFeature)
    .map((suggestion) => createFeatureEntryFromSpec(suggestion));
  return {
    ...structure,
    type: normalizeSbcgType(structure.type) ?? structure.type,
    features: orderFeaturesCanonically([...structure.features, ...missingFeatures])
  };
}

export function retargetFeatureStructureType(
  structure: FeatureStructure,
  nextType?: string
): FeatureStructure {
  const normalizedType = normalizeSbcgType(nextType);
  const typedStructure: FeatureStructure = {
    ...structure,
    type: normalizedType || undefined
  };
  const licensedFeatures = getFeatureSuggestionsForType(normalizedType);

  if (!normalizedType || !getSbcgTypeSpec(normalizedType)) {
    return typedStructure;
  }

  return {
    ...typedStructure,
    features: mergeFeaturesIntoLicensedDomain(structure.features, licensedFeatures)
  };
}

export function createFeatureEntryFromSpec(spec: SbcgFeatureSpec): FeatureEntry {
  return createFeatureEntry(spec.name, createValueForFeature(spec.name, spec.valueType, spec.shape));
}

export function createDefaultListItemForFeature(spec?: SbcgFeatureSpec): FSValue {
  if (!spec) {
    return createTypeValue("NP");
  }

  const valueSpec = getFeatureValueSpec(spec);
  if ((valueSpec.kind === "list" || valueSpec.kind === "set") && valueSpec.itemType === "frame") {
    return createNestedFeatureStructureValue(applySbcgProfile(createFeatureStructure("frame")));
  }

  return createTypeValue("NP");
}

export function createValueForFeature(
  featureName: string,
  explicitValueType?: string,
  explicitShape?: ValueShape
): FSValue {
  const normalizedFeature = normalizeFeatureName(featureName);
  const registrySpec = featureSpecsByName[normalizedFeature];
  const valueType = explicitValueType ?? registrySpec?.valueType;
  const shape = explicitShape ?? registrySpec?.shape ?? inferShapeFromFeature(normalizedFeature, valueType);

  if (shape === "list" || shape === "set") {
    return createListValue([]);
  }
  if (shape === "type") {
    return createTypeValue("");
  }
  if (shape === "atomic") {
    return createAtomicValue("");
  }
  if (shape === "index-ref") {
    return createIndexRefValue("");
  }
  if (shape === "feature-structure") {
    const nestedType = normalizeValueType(valueType);
    const nested = applySbcgProfile(createFeatureStructure(nestedType));
    return createNestedFeatureStructureValue(nested);
  }
  return createUnderspecifiedValue();
}

function collectFeatures(type: string, seenTypes = new Set<string>()): FeatureSuggestion[] {
  if (seenTypes.has(type)) {
    return [];
  }
  seenTypes.add(type);

  const spec = sbcgTypes[type];
  if (!spec) {
    return [];
  }

  const inherited = (spec.parents ?? []).flatMap((parent) => collectFeatures(parent, seenTypes));
  const own = spec.features.map((featureSpec) => ({
    ...featureSpec,
    inheritedFrom: spec.type
  }));
  return dedupeByFeatureName([...inherited, ...own]);
}

function dedupeByFeatureName(features: FeatureSuggestion[]): FeatureSuggestion[] {
  const seen = new Set<string>();
  return features.filter((featureSpec) => {
    if (seen.has(featureSpec.name)) {
      return false;
    }
    seen.add(featureSpec.name);
    return true;
  });
}

function mergeFeaturesIntoLicensedDomain(
  existingFeatures: FeatureEntry[],
  licensedFeatures: FeatureSuggestion[]
): FeatureEntry[] {
  const existingByFeatureName = new Map<string, FeatureEntry>();
  existingFeatures.forEach((featureEntry) => {
    const normalizedName = normalizeFeatureName(featureEntry.name);
    if (!existingByFeatureName.has(normalizedName)) {
      existingByFeatureName.set(normalizedName, featureEntry);
    }
  });

  const consumedFeatureIds = new Set<string>();
  const domainFeatures = licensedFeatures.flatMap((licensedFeature) => {
    const existing = existingByFeatureName.get(licensedFeature.name);
    if (!existing) {
      return isDefaultIncludedFeature(licensedFeature)
        ? [createFeatureEntryFromSpec(licensedFeature)]
        : [];
    }

    consumedFeatureIds.add(existing.id);
    return [alignExistingFeatureWithSpec(existing, licensedFeature)];
  });
  const extraFeatures = existingFeatures.filter(
    (featureEntry) =>
      !consumedFeatureIds.has(featureEntry.id) &&
      !isKnownSchemaFeature(featureEntry.name)
  );

  return orderFeaturesCanonically([...domainFeatures, ...extraFeatures]);
}

function isDefaultIncludedFeature(featureSpec: SbcgFeatureSpec): boolean {
  return featureSpec.defaultIncluded ?? true;
}

function isKnownSchemaFeature(featureName: string): boolean {
  return Boolean(featureSpecsByName[normalizeFeatureName(featureName)]);
}

function alignExistingFeatureWithSpec(
  featureEntry: FeatureEntry,
  licensedFeature: FeatureSuggestion
): FeatureEntry {
  return {
    ...featureEntry,
    name: licensedFeature.name,
    value:
      featureEntry.value.kind === "underspecified"
        ? createValueForFeature(
            licensedFeature.name,
            licensedFeature.valueType,
            licensedFeature.shape
          )
        : featureEntry.value
  };
}

function orderFeatureSuggestionsCanonically(features: FeatureSuggestion[]): FeatureSuggestion[] {
  return features
    .map((featureSpec, originalIndex) => ({ featureSpec, originalIndex }))
    .sort((left, right) => {
      const leftRank = getCanonicalFeatureRank(left.featureSpec.name);
      const rightRank = getCanonicalFeatureRank(right.featureSpec.name);

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map(({ featureSpec }) => featureSpec);
}

function inferShapeFromFeature(featureName: string, valueType?: string): ValueShape {
  if (valueType?.startsWith("list(") || valueType?.startsWith("nelist(")) {
    return "list";
  }
  if (valueType?.startsWith("set(")) {
    return "set";
  }
  const normalizedValueType = normalizeValueType(valueType);
  if (normalizedValueType && sbcgTypes[normalizedValueType]) {
    return "feature-structure";
  }
  if (["PHON", "FORM", "ARG-ST", "GAP", "FRAMES", "STORE", "DTRS", "BCKGRND", "CXT-CONTENT", "LID", "WH", "REL", "NAME", "SPR", "SUBJ", "COMPS"].includes(featureName)) {
    return "list";
  }
  if (["SYN", "SEM", "CNTXT", "CAT", "VAL", "C-INDS", "MTR"].includes(featureName)) {
    return "feature-structure";
  }
  if (["MRKG", "VF", "IC", "AUX", "INV", "CASE"].includes(featureName)) {
    return "type";
  }
  if (["LTOP", "INDEX", "IND", "SPKR", "ADDR", "UTT-LOC", "LABEL", "BV", "RESTR", "SCOPE", "SIT", "ENTITY"].includes(featureName)) {
    return "atomic";
  }
  return "underspecified";
}

function normalizeFeatureName(featureName: string): string {
  const normalized = featureName.trim().toUpperCase();
  return featureAliases[normalized] ?? normalized;
}

function normalizeValueType(valueType?: string): string | undefined {
  if (!valueType) {
    return undefined;
  }
  const withoutContainer = valueType
    .replace(/^list\((.*)\)$/, "$1")
    .replace(/^nelist\((.*)\)$/, "$1")
    .replace(/^set\((.*)\)$/, "$1");
  return normalizeSbcgType(withoutContainer) ?? withoutContainer;
}
