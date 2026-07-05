import type { FeatureStructure, FSValue } from "./model";

export interface ExportOptions {
  indentSize?: number;
}

export function exportLangSciAvm(structure: FeatureStructure, options: ExportOptions = {}): string {
  const indentSize = options.indentSize ?? 2;
  return `\\avm{\n${renderStructure(structure, 0, indentSize)}\n}`;
}

function renderStructure(structure: FeatureStructure, level: number, indentSize: number): string {
  const indent = " ".repeat(level * indentSize);
  const inner = " ".repeat((level + 1) * indentSize);
  const lines = [`${indent}[`];

  if (structure.type) {
    lines.push(`${inner}${escapeLatex(structure.type)}`);
  }

  structure.features.forEach((feature, index) => {
    const renderedValue = renderValue(feature.value, level + 1, indentSize);
    const suffix = index === structure.features.length - 1 ? "" : " \\\\";
    lines.push(`${inner}${escapeLatex(feature.name)} & ${renderedValue}${suffix}`);
  });

  lines.push(`${indent}]`);
  return lines.join("\n");
}

function renderValue(value: FSValue, level: number, indentSize: number): string {
  const rendered = renderValueBody(value, level, indentSize);
  if (value.kind === "tag-ref") {
    return rendered;
  }
  const tagged = value.tag ? `${renderTag(value.tag)}${rendered}` : rendered;
  if (value.kind !== "index-ref" && value.indexId) {
    return `${tagged}\\ind{${escapeLatex(value.indexId)}}`;
  }
  return tagged;
}

function renderValueBody(value: FSValue, level: number, indentSize: number): string {
  switch (value.kind) {
    case "atomic":
      return escapeLatex(value.value);
    case "type":
      return escapeLatex(value.label);
    case "list":
      return value.items.length === 0
        ? "< >"
        : `< ${value.items.map((item) => renderValue(item, level, indentSize)).join(", ")} >`;
    case "feature-structure":
      return `\n${renderStructure(value.structure, level, indentSize)}`;
    case "index-ref":
      return `\\ind{${escapeLatex(value.indexId)}}`;
    case "tag-ref":
      return renderTag(value.tag);
    case "underspecified":
      return "\\_";
  }
}

function renderTag(tag: string): string {
  if (/^[0-9]+$/.test(tag)) {
    return `\\boxed{${escapeLatex(tag)}}`;
  }
  return `\\boxed{\\mathit{${escapeLatex(tag)}}}`;
}

function escapeLatex(input: string): string {
  return input
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}");
}
