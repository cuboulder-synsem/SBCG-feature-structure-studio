import {
  collectIndexIds,
  collectTagDefinitions,
  createId,
  type FeatureStructure,
  type TagDefinition
} from "./model";
import { createStarterFeatureStructure } from "./starterStructures";

export interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
  avm?: FeatureStructure;
}

export function createTreeNode(
  label = "XP",
  children: TreeNode[] = [],
  avm?: FeatureStructure
): TreeNode {
  return {
    id: createId("tree"),
    label,
    children,
    avm
  };
}

export function createInitialTree(): TreeNode {
  return createTreeNode(
    "S",
    [
      createTreeNode("NP", [], createInitialTreeAvm()),
      createTreeNode("VP", [], createInitialTreeAvm())
    ],
    createInitialTreeAvm()
  );
}

export function createInitialTreeAvm(): FeatureStructure {
  return createStarterFeatureStructure("phrase");
}

export function collectTreeIndexIds(node: TreeNode): string[] {
  const ids = new Set<string>();
  visitTree(node, (treeNode) => {
    if (treeNode.avm) {
      collectIndexIds(treeNode.avm).forEach((indexId) => ids.add(indexId));
    }
  });
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function collectTreeTagDefinitions(node: TreeNode): TagDefinition[] {
  const definitions = new Map<string, TagDefinition>();
  visitTree(node, (treeNode) => {
    if (!treeNode.avm) {
      return;
    }
    collectTagDefinitions(treeNode.avm).forEach((definition) => {
      if (!definitions.has(definition.tag)) {
        definitions.set(definition.tag, definition);
      }
    });
  });
  return [...definitions.values()];
}

function visitTree(node: TreeNode, visit: (node: TreeNode) => void) {
  visit(node);
  node.children.forEach((child) => visitTree(child, visit));
}
