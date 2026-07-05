import type { TagDefinition, ValueKind } from "../core/model";

export function TagLegend({ tags }: { tags: TagDefinition[] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <details className="tag-legend">
      <summary>Tags</summary>
      <dl>
        {tags.map((definition) => (
          <div className="tag-legend-row" key={definition.tag}>
            <dt>
              <span className={`preview-tag ${tagClass(definition.tag)}`}>{definition.tag}</span>
            </dt>
            <dd>{labelForValueKind(definition.valueKind)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function tagClass(tag: string): string {
  return /^[0-9]+$/.test(tag) ? "preview-tag-number" : "preview-tag-letter";
}

function labelForValueKind(kind: ValueKind): string {
  if (kind === "type") {
    return "typed object";
  }
  if (kind === "feature-structure") {
    return "feature structure";
  }
  if (kind === "index-ref") {
    return "semantic index";
  }
  return kind;
}
