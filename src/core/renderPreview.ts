import type { FeatureStructure, FSValue } from "./model";

export function renderPreviewText(structure: FeatureStructure): string {
  return renderStructure(structure, 0);
}

function renderStructure(structure: FeatureStructure, level: number): string {
  const indent = "  ".repeat(level);
  const lines = [`${indent}[${structure.type ? ` ${structure.type}` : ""}`];
  structure.features.forEach((feature) => {
    lines.push(`${indent}  ${feature.name} ${renderValue(feature.value, level + 1)}`);
  });
  lines.push(`${indent}]`);
  return lines.join("\n");
}

function renderValue(value: FSValue, level: number): string {
  const index = value.indexId ? subscript(value.indexId) : "";
  const tag = value.tag ? `[${value.tag}]` : "";
  switch (value.kind) {
    case "atomic":
      return `${tag}${value.value}${index}`;
    case "type":
      return `${tag}${value.label}${index}`;
    case "list":
      return `${tag}< ${value.items.map((item) => renderValue(item, level)).join(", ")} >${index}`;
    case "feature-structure":
      return `${tag}\n${renderStructure(value.structure, level)}${index}`;
    case "index-ref":
      return `${tag}#${value.indexId}`;
    case "tag-ref":
      return `[${value.tag}]`;
    case "underspecified":
      return `${tag}_${index}`;
  }
}

function subscript(value: string): string {
  const digits: Record<string, string> = {
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9"
  };
  return value
    .split("")
    .map((char) => digits[char] ?? char)
    .join("");
}
