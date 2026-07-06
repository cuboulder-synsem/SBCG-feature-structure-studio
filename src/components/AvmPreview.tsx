import type { ReactNode } from "react";
import type { FeatureStructure, FSValue } from "../core/model";

interface AvmPreviewProps {
  structure: FeatureStructure;
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
  highlightedFeatureId?: string;
  onSelectFeature?: (featureId: string) => void;
  depth?: number;
}

export function AvmPreview({
  structure,
  activeIndex,
  onSelectIndex,
  highlightedFeatureId,
  onSelectFeature
}: AvmPreviewProps) {
  return (
    <div className="avm-preview" aria-label="AVM preview">
      <AvmStructurePreview
        structure={structure}
        activeIndex={activeIndex}
        onSelectIndex={onSelectIndex}
        highlightedFeatureId={highlightedFeatureId}
        onSelectFeature={onSelectFeature}
      />
    </div>
  );
}

export function AvmStructurePreview({
  structure,
  activeIndex,
  onSelectIndex,
  highlightedFeatureId,
  onSelectFeature,
  depth = 0
}: AvmPreviewProps) {
  const bracketDepth = Math.min(depth, 4);
  const structurePreview = (
    <div className={`preview-structure preview-depth-${bracketDepth}`} data-depth={depth}>
      <span className={`bracket left bracket-depth-${bracketDepth}`} aria-hidden="true" />
      <div className="preview-content">
        {structure.type && <div className="preview-type">{structure.type}</div>}
        {structure.features.map((feature) => (
          <div
            className={
              feature.id === highlightedFeatureId
                ? "preview-row feature-linked-active"
                : "preview-row"
            }
            data-preview-feature-id={feature.id}
            data-preview-feature-name={feature.name}
            key={feature.id}
            role={onSelectFeature ? "button" : undefined}
            tabIndex={onSelectFeature ? 0 : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onSelectFeature?.(feature.id);
            }}
            onKeyDown={(event) => {
              if (!onSelectFeature || (event.key !== "Enter" && event.key !== " ")) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              onSelectFeature(feature.id);
            }}
          >
            <span className="preview-feature">{feature.name}</span>
            <PreviewValue
              value={feature.value}
              activeIndex={activeIndex}
              onSelectIndex={onSelectIndex}
              highlightedFeatureId={highlightedFeatureId}
              onSelectFeature={onSelectFeature}
              depth={depth}
            />
          </div>
        ))}
      </div>
      <span className={`bracket right bracket-depth-${bracketDepth}`} aria-hidden="true" />
    </div>
  );

  if (!structure.tag) {
    return structurePreview;
  }

  return (
    <div className="preview-tagged-structure">
      <TagBadge tag={structure.tag} activeIndex={activeIndex} onSelectIndex={onSelectIndex} />
      {structurePreview}
    </div>
  );
}

interface PreviewValueProps {
  value: FSValue;
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
  highlightedFeatureId?: string;
  onSelectFeature?: (featureId: string) => void;
  depth: number;
}

function PreviewValue({
  value,
  activeIndex,
  onSelectIndex,
  highlightedFeatureId,
  onSelectFeature,
  depth
}: PreviewValueProps) {
  const subscriptMarker = value.indexId ? (
    <SubscriptIndex
      indexId={value.indexId}
      activeIndex={activeIndex}
      onSelectIndex={onSelectIndex}
    />
  ) : null;

  if (value.kind === "atomic") {
    return renderTaggedValue(value.tag, activeIndex, onSelectIndex,
      <span className="preview-value">
        {value.value}
        {subscriptMarker}
      </span>
    );
  }

  if (value.kind === "type") {
    return renderTaggedValue(value.tag, activeIndex, onSelectIndex,
      <span className="preview-value preview-type-value">
        {value.label || "type"}
        {subscriptMarker}
      </span>
    );
  }

  if (value.kind === "underspecified") {
    return renderTaggedValue(value.tag, activeIndex, onSelectIndex,
      <span className="preview-value">
        _
        {subscriptMarker}
      </span>
    );
  }

  if (value.kind === "index-ref") {
    return renderTaggedValue(value.tag, activeIndex, onSelectIndex,
      <span className="preview-value">
        <IndexValue
          indexId={value.indexId}
          activeIndex={activeIndex}
          onSelectIndex={onSelectIndex}
        />
      </span>
    );
  }

  if (value.kind === "tag-ref") {
    return (
      <TagBadge tag={value.tag} activeIndex={activeIndex} onSelectIndex={onSelectIndex} />
    );
  }

  if (value.kind === "list") {
    const listIsTall = containsTallListItem(value.items);

    if (!listIsTall) {
      return renderTaggedValue(value.tag, activeIndex, onSelectIndex,
        <span className="preview-list preview-list-compact">
          <span>〈</span>
          {value.items.length > 0 && <span> </span>}
          {value.items.map((item, index) => (
            <span className="preview-list-item" key={`${index}-${item.kind}`}>
              <PreviewValue
                value={item}
                activeIndex={activeIndex}
                onSelectIndex={onSelectIndex}
                highlightedFeatureId={highlightedFeatureId}
                onSelectFeature={onSelectFeature}
                depth={depth}
              />
              {index < value.items.length - 1 && <span>, </span>}
            </span>
          ))}
          {value.items.length > 0 && <span> </span>}
          <span>〉</span>
          {subscriptMarker}
        </span>
      );
    }

    return renderTaggedValue(value.tag, activeIndex, onSelectIndex,
      <span className="preview-list preview-list-bracketed">
        <PreviewListFence side="left" />
        <span className="preview-list-content">
          {value.items.length === 0 && <span className="preview-list-empty" aria-hidden="true" />}
          {value.items.map((item, index) => (
            <span className="preview-list-item" key={`${index}-${item.kind}`}>
              <PreviewValue
                value={item}
                activeIndex={activeIndex}
                onSelectIndex={onSelectIndex}
                highlightedFeatureId={highlightedFeatureId}
                onSelectFeature={onSelectFeature}
                depth={depth}
              />
              {index < value.items.length - 1 && <span>, </span>}
            </span>
          ))}
        </span>
        <PreviewListFence side="right" />
        {subscriptMarker}
      </span>
    );
  }

  return renderTaggedValue(value.tag, activeIndex, onSelectIndex,
    <span className="preview-nested">
      <AvmStructurePreview
        structure={value.structure}
        activeIndex={activeIndex}
        onSelectIndex={onSelectIndex}
        highlightedFeatureId={highlightedFeatureId}
        onSelectFeature={onSelectFeature}
        depth={depth + 1}
      />
      {subscriptMarker}
    </span>
  );
}

function renderTaggedValue(
  tag: string | undefined,
  activeIndex: string | undefined,
  onSelectIndex: (indexId: string) => void,
  value: ReactNode
) {
  if (!tag) {
    return value;
  }

  return (
    <span className="preview-tagged-value">
      <TagBadge tag={tag} activeIndex={activeIndex} onSelectIndex={onSelectIndex} />
      {value}
    </span>
  );
}

function containsTallListItem(items: FSValue[]): boolean {
  return items.some((item) => {
    if (item.kind === "feature-structure") {
      return true;
    }
    if (item.kind === "list") {
      return containsTallListItem(item.items);
    }
    return false;
  });
}

function PreviewListFence({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={`preview-list-fence preview-list-fence-${side}`}
      aria-hidden="true"
    />
  );
}

function TagBadge({
  tag,
  activeIndex,
  onSelectIndex
}: {
  tag: string;
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
}) {
  const activeTag = `tag:${tag}`;
  const tagShapeClass = isNumericTag(tag) ? "preview-tag-number" : "preview-tag-letter";

  return (
    <button
      className={
        activeIndex === activeTag
          ? `preview-tag ${tagShapeClass} active`
          : `preview-tag ${tagShapeClass}`
      }
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelectIndex(activeTag);
      }}
      title={`Highlight tag ${tag}`}
    >
      {tag}
    </button>
  );
}

function isNumericTag(tag: string): boolean {
  return /^[0-9]+$/.test(tag);
}

function IndexValue({
  indexId,
  activeIndex,
  onSelectIndex
}: {
  indexId: string;
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
}) {
  return (
    <button
      className={indexId === activeIndex ? "preview-index-value active" : "preview-index-value"}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelectIndex(indexId);
      }}
      title={`Highlight index ${indexId}`}
    >
      {indexId}
    </button>
  );
}

function SubscriptIndex({
  indexId,
  activeIndex,
  onSelectIndex
}: {
  indexId: string;
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
}) {
  return (
    <button
      className={
        indexId === activeIndex ? "preview-index-subscript active" : "preview-index-subscript"
      }
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelectIndex(indexId);
      }}
      title={`Highlight index ${indexId}`}
    >
      <sub>{indexId}</sub>
    </button>
  );
}
