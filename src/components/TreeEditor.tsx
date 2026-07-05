import { GitBranchPlus, Link2, Trash2, Unlink } from "lucide-react";
import {
  createInitialSign,
  collectIndexIds,
  collectTagDefinitions,
  type FeatureStructure
} from "../core/model";
import { createTreeNode, type TreeNode } from "../core/treeModel";
import { FeatureStructureEditor } from "./FeatureStructureEditor";

interface TreeEditorProps {
  node: TreeNode;
  onChange: (node: TreeNode) => void;
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
  onDelete?: () => void;
}

export function TreeEditor({
  node,
  onChange,
  activeIndex,
  onSelectIndex,
  onDelete
}: TreeEditorProps) {
  const childIndexes = node.avm ? collectIndexIds(node.avm) : [];
  const childTags = node.avm ? collectTagDefinitions(node.avm) : [];

  return (
    <div className="tree-editor-node">
      <div className="tree-editor-header">
        <input
          value={node.label}
          aria-label="Tree node label"
          onChange={(event) => onChange({ ...node, label: event.target.value })}
        />
        <button
          className="icon-button"
          type="button"
          title="Add child node"
          onClick={() => onChange({ ...node, children: [...node.children, createTreeNode("XP")] })}
        >
          <GitBranchPlus size={16} />
        </button>
        <button
          className="icon-button"
          type="button"
          title={node.avm ? "Remove AVM" : "Attach AVM"}
          onClick={() => onChange({ ...node, avm: node.avm ? undefined : createInitialSign() })}
        >
          {node.avm ? <Unlink size={16} /> : <Link2 size={16} />}
        </button>
        {onDelete && (
          <button className="icon-button danger" type="button" title="Delete node" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {node.avm && (
        <div className="tree-avm-editor">
          <FeatureStructureEditor
            structure={node.avm}
            onChange={(avm: FeatureStructure) => onChange({ ...node, avm })}
            availableIndexes={childIndexes}
            availableTags={childTags}
            activeIndex={activeIndex}
            onSelectIndex={onSelectIndex}
            compact
          />
        </div>
      )}

      {node.children.length > 0 && (
        <div className="tree-children-editor">
          {node.children.map((child, index) => (
            <TreeEditor
              key={child.id}
              node={child}
              onChange={(nextChild) =>
                onChange({
                  ...node,
                  children: node.children.map((candidate, childIndex) =>
                    childIndex === index ? nextChild : candidate
                  )
                })
              }
              activeIndex={activeIndex}
              onSelectIndex={onSelectIndex}
              onDelete={() =>
                onChange({
                  ...node,
                  children: node.children.filter((_, childIndex) => childIndex !== index)
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreePreview({ node }: { node: TreeNode }) {
  return (
    <div className="tree-preview-node">
      <div className="tree-preview-label">
        {node.label}
        {node.avm && <span className="tree-avm-badge">AVM</span>}
      </div>
      {node.children.length > 0 && (
        <div className="tree-preview-children">
          {node.children.map((child) => (
            <TreePreview key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
