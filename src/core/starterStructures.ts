import { applySbcgProfile } from "./sbcgProfile";
import { createFeatureStructure, type FeatureEntry, type FeatureStructure } from "./model";

const conciseStarterTypes = new Set(["lexeme", "word", "phrase"]);
const conciseOmittedFeatures = new Set(["PHON", "CNTXT"]);

export function createStarterFeatureStructure(type: string): FeatureStructure {
  const structure = applySbcgProfile(createFeatureStructure(type));
  if (!conciseStarterTypes.has(structure.type ?? "")) {
    return structure;
  }

  return {
    ...structure,
    features: structure.features.filter(shouldKeepConciseStarterFeature)
  };
}

function shouldKeepConciseStarterFeature(feature: FeatureEntry): boolean {
  return !conciseOmittedFeatures.has(feature.name);
}
