import { ChevronDown, ChevronRight, GitBranchPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  type FeatureStructure,
  type TagDefinition
} from "../core/model";
import {
  collectTreeIndexIds,
  collectTreeTagDefinitions,
  createInitialTreeAvm,
  createTreeNode,
  type TreeNode
} from "../core/treeModel";
import { AvmStructurePreview } from "./AvmPreview";
import { FeatureStructureEditor } from "./FeatureStructureEditor";

interface TreeEditorProps {
  node: TreeNode;
  onChange: (node: TreeNode) => void;
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
  highlightedFeatureId?: string;
  onSelectFeature?: (featureId: string) => void;
  onHoverFeature?: (featureId?: string) => void;
  onDelete?: () => void;
  availableIndexes?: string[];
  availableTags?: TagDefinition[];
}

export function TreeEditor({
  node,
  onChange,
  activeIndex,
  onSelectIndex,
  highlightedFeatureId,
  onSelectFeature,
  onHoverFeature,
  onDelete,
  availableIndexes,
  availableTags
}: TreeEditorProps) {
  const treeIndexes = availableIndexes ?? collectTreeIndexIds(node);
  const treeTags = availableTags ?? collectTreeTagDefinitions(node);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const nodeLabel = node.label || "XP";
  const nodeCollapseLabel = `${isCollapsed ? "Expand" : "Collapse"} node ${nodeLabel}`;
  const avmTag = node.avm?.tag ?? "";
  const avmTagIsActive = avmTag ? activeIndex === `tag:${avmTag}` : false;
  const updateAvmTag = (tag: string) => {
    if (!node.avm) {
      return;
    }
    const normalizedTag = tag.trim();
    onChange({
      ...node,
      avm: {
        ...node.avm,
        tag: normalizedTag || undefined
      }
    });
    if (normalizedTag) {
      onSelectIndex(`tag:${normalizedTag}`);
    }
  };

  return (
    <div className="tree-editor-node">
      <div className="tree-editor-header">
        <button
          className="icon-button tree-node-collapse-button"
          type="button"
          title={nodeCollapseLabel}
          aria-label={nodeCollapseLabel}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <input
          value={node.label}
          aria-label="Tree node label"
          onChange={(event) => onChange({ ...node, label: event.target.value })}
        />
        {node.avm && (
          <label
            className={avmTagIsActive ? "tree-avm-tag-field active" : "tree-avm-tag-field"}
            title={`Tag ${nodeLabel} AVM`}
          >
            <span>Tag</span>
            <input
              value={avmTag}
              aria-label={`AVM tag for ${nodeLabel}`}
              placeholder="A"
              onChange={(event) => updateAvmTag(event.target.value)}
              onFocus={() => {
                if (node.avm?.tag) {
                  onSelectIndex(`tag:${node.avm.tag}`);
                }
              }}
            />
          </label>
        )}
        <button
          className="icon-button"
          type="button"
          title="Add child node"
          onClick={() =>
            onChange({
              ...node,
              children: [...node.children, createTreeNode("XP", [], createInitialTreeAvm())]
            })
          }
        >
          <GitBranchPlus size={16} />
        </button>
        {onDelete && (
          <button className="icon-button danger" type="button" title="Delete node" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {isCollapsed ? (
        <span className="tree-node-collapsed-summary">{nodeLabel} node collapsed</span>
      ) : node.avm ? (
        <div className="tree-avm-editor">
          <FeatureStructureEditor
            structure={node.avm}
            onChange={(avm: FeatureStructure) => onChange({ ...node, avm })}
            availableIndexes={treeIndexes}
            availableTags={treeTags}
            activeIndex={activeIndex}
            onSelectIndex={onSelectIndex}
            highlightedFeatureId={highlightedFeatureId}
            onSelectFeature={onSelectFeature}
            onHoverFeature={onHoverFeature}
            compact
          />
        </div>
      ) : null}

      {!isCollapsed && node.children.length > 0 && (
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
              highlightedFeatureId={highlightedFeatureId}
              onSelectFeature={onSelectFeature}
              onHoverFeature={onHoverFeature}
              availableIndexes={treeIndexes}
              availableTags={treeTags}
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

interface TreePreviewProps {
  node: TreeNode;
  activeIndex?: string;
  onSelectIndex?: (indexId: string) => void;
  highlightedFeatureId?: string;
  onSelectFeature?: (featureId: string) => void;
  showNodeLabels?: boolean;
}

export function TreePreview({
  node,
  activeIndex,
  onSelectIndex = () => undefined,
  highlightedFeatureId,
  onSelectFeature,
  showNodeLabels = true
}: TreePreviewProps) {
  const shouldShowLabel = showNodeLabels || !node.avm;

  return (
    <div className="tree-paper-node">
      {shouldShowLabel && <div className="tree-node-label">{node.label || "XP"}</div>}
      {node.avm && (
        <div className="tree-node-avm">
          <AvmStructurePreview
            structure={node.avm}
            activeIndex={activeIndex}
            onSelectIndex={onSelectIndex}
            highlightedFeatureId={highlightedFeatureId}
            onSelectFeature={onSelectFeature}
          />
        </div>
      )}
      {node.children.length > 0 && (
        <div
          className="tree-paper-children"
          style={{
            gridTemplateColumns: `repeat(${node.children.length}, minmax(max-content, 1fr))`
          }}
        >
          <svg
            className="tree-branch-lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {node.children.map((child, index) => (
              <line
                key={child.id}
                x1="50"
                y1="0"
                x2={getChildBranchAnchorX(index, node.children.length)}
                y2="100"
              />
            ))}
          </svg>
          {node.children.map((child, index) => (
            <div className="tree-child-slot" key={child.id}>
              <TreePreview
                node={child}
                activeIndex={activeIndex}
                onSelectIndex={onSelectIndex}
                highlightedFeatureId={highlightedFeatureId}
                onSelectFeature={onSelectFeature}
                showNodeLabels={showNodeLabels}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getChildBranchAnchorX(index: number, childCount: number): number {
  return Number((((index + 0.5) / childCount) * 100).toFixed(4));
}
