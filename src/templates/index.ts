import hitHittingFrame from "../../templates/hit-hitting-frame.json";
import passiveWord from "../../templates/passive-word.json";
import transitiveVerbWord from "../../templates/transitive-verb-word.json";
import verbLexeme from "../../templates/verb-lexeme.json";
import { createStarterFeatureStructure } from "../core/starterStructures";
import type { FeatureStructure } from "../core/model";

export interface TemplateDefinition {
  id: string;
  name: string;
  structure: FeatureStructure;
}

const starterTemplateTypes = ["sign", "lexeme", "word", "phrase", "construct"] as const;

export const templates: TemplateDefinition[] = starterTemplateTypes.map((type) => ({
  id: type,
  name: type,
  structure: createStarterFeatureStructure(type)
}));

export const examples: TemplateDefinition[] = [
  { id: "verb-lexeme", name: "verb-lexeme", structure: verbLexeme as FeatureStructure },
  {
    id: "transitive-verb-word",
    name: "transitive-verb-word",
    structure: transitiveVerbWord as FeatureStructure
  },
  { id: "passive-word", name: "passive-word", structure: passiveWord as FeatureStructure },
  {
    id: "hit-hitting-frame",
    name: "hit-hitting-frame",
    structure: hitHittingFrame as FeatureStructure
  }
];
