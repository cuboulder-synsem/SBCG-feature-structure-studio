import { exportLangSciAvm } from "./exportLangSciAvm";
import type { TreeNode } from "./treeModel";

export interface TreeExportOptions {
  indentSize?: number;
}

export function exportLangSciTree(tree: TreeNode, options: TreeExportOptions = {}): string {
  const indentSize = options.indentSize ?? 2;
  return ["\\begin{forest}", renderTreeNode(tree, 0, indentSize), "\\end{forest}"].join("\n");
}

function renderTreeNode(node: TreeNode, level: number, indentSize: number): string {
  const indent = " ".repeat(level * indentSize);
  const label = renderTreeNodeLabel(node, level, indentSize);

  if (node.children.length === 0) {
    return `${indent}[${label}]`;
  }

  return [
    `${indent}[${label}`,
    ...node.children.map((child) => renderTreeNode(child, level + 1, indentSize)),
    `${indent}]`
  ].join("\n");
}

function renderTreeNodeLabel(node: TreeNode, level: number, indentSize: number): string {
  const label = escapeLatex(node.label || "XP");
  if (!node.avm) {
    return label;
  }

  const avmIndent = " ".repeat((level + 1) * indentSize);
  const avm = exportLangSciAvm(node.avm)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `${avmIndent}${line}`))
    .join("\n");

  return `{${label}\\\\\n${avmIndent}${avm}}`;
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
