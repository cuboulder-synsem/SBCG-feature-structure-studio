import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  Circle,
  CornerDownRight,
  GripVertical,
  Link2,
  ListPlus,
  MoreHorizontal,
  Plus,
  Trash2
} from "lucide-react";
import {
  createFeatureEntry,
  createIndexRefValue,
  createListValue,
  createTagReferenceForValue,
  createTagRefValue,
  defaultValueForKind,
  orderFeaturesCanonically,
  type FeatureEntry,
  type FeatureStructure,
  type FSValue,
  type TagDefinition,
  type ValueKind
} from "../core/model";
import {
  createDefaultListItemForFeature,
  createFeatureEntryFromSpec,
  createValueForFeature,
  getFeatureSpecForType,
  getFeatureValueSpec,
  getMissingFeatureSuggestions,
  getSbcgTypeSpec,
  retargetFeatureStructureType,
  typeRegistry,
  type SbcgFeatureSpec,
  type FeatureSuggestion
} from "../core/sbcgProfile";
import {
  getArgStItems,
  getFrameParticipantLinks,
  getNextIndexId,
  linkFrameParticipantToArgSt,
  setFrameParticipantIndex,
  type ArgStItem,
  type FrameParticipantLink
} from "../core/semanticLinks";

const valueKinds: ValueKind[] = [
  "atomic",
  "type",
  "list",
  "feature-structure",
  "index-ref",
  "underspecified"
];
const frameElementOptionValue = "__frame_element__";
const customFeatureOptionValue = "__custom_feature__";
type FeatureDropPosition = "before" | "after";

interface FeatureStructureEditorProps {
  structure: FeatureStructure;
  onChange: (structure: FeatureStructure) => void;
  availableIndexes: string[];
  availableTags?: TagDefinition[];
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
  compact?: boolean;
  rootStructure?: FeatureStructure;
  onRootChange?: (structure: FeatureStructure) => void;
}

export function FeatureStructureEditor({
  structure,
  onChange,
  availableIndexes,
  availableTags = [],
  activeIndex,
  onSelectIndex,
  compact = false,
  rootStructure: rootStructureProp,
  onRootChange: onRootChangeProp
}: FeatureStructureEditorProps) {
  const rootStructure = rootStructureProp ?? structure;
  const onRootChange = onRootChangeProp ?? onChange;
  const draggedFeatureIdRef = useRef<string | null>(null);
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);
  const [dragOverFeature, setDragOverFeature] = useState<{
    featureId: string;
    position: FeatureDropPosition;
  } | null>(null);
  const typeSpec = getSbcgTypeSpec(structure.type);
  const missingFeatureSuggestions = getMissingFeatureSuggestions(structure);
  const typeOptionsId = `${structure.id}-type-options`;
  const argStItems = getArgStItems(rootStructure);
  const frameParticipantLinks = getFrameParticipantLinks(rootStructure);
  const participantByFeatureId = new Map(
    frameParticipantLinks.map((participant) => [participant.featureId, participant])
  );
  const nextIndexId = getNextIndexId(rootStructure);
  const canAddFrameElement = isFrameLikeType(structure.type);
  const addFeatureFromSpec = (suggestion: FeatureSuggestion) =>
    onChange({
      ...structure,
      features: orderFeaturesCanonically([
        ...structure.features,
        createFeatureEntryFromSpec(suggestion)
      ])
    });
  const addCustomFeature = () =>
    onChange({
      ...structure,
      features: orderFeaturesCanonically([
        ...structure.features,
        createFeatureEntry("FEATURE")
      ])
    });
  const addFrameElement = () =>
    onChange({
      ...structure,
      features: orderFeaturesCanonically([
        ...structure.features,
        createFeatureEntry(
          getNextFrameElementName(structure.features),
          createIndexRefValue(nextIndexId)
        )
      ])
    });
  const updateFeature = (featureId: string, next: FeatureEntry, canonicalizeOrder = false) => {
    const features = structure.features.map((feature) => (feature.id === featureId ? next : feature));
    onChange({
      ...structure,
      features: canonicalizeOrder ? orderFeaturesCanonically(features) : features
    });
  };
  const startFeatureDrag = (featureId: string, event: DragEvent<HTMLButtonElement>) => {
    draggedFeatureIdRef.current = featureId;
    setDraggedFeatureId(featureId);
    const dataTransfer = event.dataTransfer;
    if (dataTransfer) {
      dataTransfer.effectAllowed = "move";
      dataTransfer.setData("text/plain", featureId);
    }
  };
  const updateFeatureDragTarget = (featureId: string, event: DragEvent<HTMLDivElement>) => {
    if (!draggedFeatureIdRef.current || draggedFeatureIdRef.current === featureId) {
      return;
    }
    event.preventDefault();
    const dataTransfer = event.dataTransfer;
    if (dataTransfer) {
      dataTransfer.dropEffect = "move";
    }
    setDragOverFeature({
      featureId,
      position: getFeatureDropPosition(event)
    });
  };
  const dropFeatureOnTarget = (featureId: string, event: DragEvent<HTMLDivElement>) => {
    const sourceFeatureId = draggedFeatureIdRef.current;
    if (!sourceFeatureId || sourceFeatureId === featureId) {
      clearFeatureDrag();
      return;
    }

    event.preventDefault();
    onChange({
      ...structure,
      features: reorderFeatureEntries(
        structure.features,
        sourceFeatureId,
        featureId,
        getFeatureDropPosition(event)
      )
    });
    clearFeatureDrag();
  };
  const clearFeatureDrag = () => {
    draggedFeatureIdRef.current = null;
    setDraggedFeatureId(null);
    setDragOverFeature(null);
  };

  return (
    <section className={compact ? "fs-editor compact" : "fs-editor"}>
      <div className="fs-type-row">
        <label>
          Type
          <input
            value={structure.type ?? ""}
            placeholder="untyped"
            list={typeOptionsId}
            onChange={(event) =>
              onChange(retargetFeatureStructureType(structure, event.target.value))
            }
          />
          <datalist id={typeOptionsId}>
            {Object.keys(typeRegistry).map((typeName) => (
              <option key={typeName} value={typeName} />
            ))}
          </datalist>
        </label>
        {typeSpec ? (
          <LicensedFeaturePicker
            suggestions={missingFeatureSuggestions}
            onAdd={addFeatureFromSpec}
            onAddCustom={addCustomFeature}
            onAddFrameElement={canAddFrameElement ? addFrameElement : undefined}
          />
        ) : (
          <button
            className="icon-text-button"
            type="button"
            title="Add feature"
            onClick={() =>
              onChange({
                ...structure,
                features: orderFeaturesCanonically([
                  ...structure.features,
                  createFeatureEntry("FEATURE")
                ])
              })
            }
          >
            <Plus size={16} />
            Add feature
          </button>
        )}
      </div>

      <div className="feature-list">
        {structure.features.map((feature) => {
          const featureSpec = getFeatureSpecForType(structure.type, feature.name);
          const frameParticipant = participantByFeatureId.get(feature.id);
          const dragPosition =
            dragOverFeature?.featureId === feature.id ? dragOverFeature.position : undefined;
          return (
            <div
              className={[
                "feature-row",
                draggedFeatureId === feature.id ? "dragging" : "",
                dragPosition ? `drag-over-${dragPosition}` : ""
              ]
                .filter(Boolean)
                .join(" ")}
              data-feature-name={feature.name}
              key={feature.id}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  return;
                }
                setDragOverFeature((current) =>
                  current?.featureId === feature.id ? null : current
                );
              }}
              onDragOver={(event) => updateFeatureDragTarget(feature.id, event)}
              onDrop={(event) => dropFeatureOnTarget(feature.id, event)}
            >
            <button
              className="icon-button feature-drag-handle"
              draggable
              type="button"
              aria-label={`Drag ${feature.name} to reorder`}
              title={`Drag ${feature.name}`}
              onDragEnd={clearFeatureDrag}
              onDragStart={(event) => startFeatureDrag(feature.id, event)}
            >
              <GripVertical size={16} />
            </button>
            <input
              className="feature-name-input"
              aria-label="Feature name"
              value={feature.name}
              onChange={(event) => {
                const name = event.target.value.toUpperCase();
                const renamedFeatureSpec = getFeatureSpecForType(structure.type, name);
                updateFeature(feature.id, {
                  ...feature,
                  name,
                  value: shouldInferValueForRenamedFeature(feature.value)
                    ? renamedFeatureSpec
                      ? createFeatureEntryFromSpec(renamedFeatureSpec).value
                      : createValueForFeature(name)
                    : feature.value
                }, true);
              }}
            />
            <div className="feature-value-cell">
              <ValueEditor
                featureName={feature.name}
                featureSpec={featureSpec}
                value={feature.value}
                onChange={(value) => updateFeature(feature.id, { ...feature, value })}
                availableIndexes={availableIndexes}
                availableTags={availableTags}
                activeIndex={activeIndex}
                onSelectIndex={onSelectIndex}
                rootStructure={rootStructure}
                onRootChange={onRootChange}
              />
              {frameParticipant && argStItems.length > 0 && (
                <InlineFrameLinkControls
                  participant={frameParticipant}
                  argStItems={argStItems}
                  nextIndexId={nextIndexId}
                  onSetParticipantIndex={(participant, indexId) => {
                    onRootChange(
                      setFrameParticipantIndex(rootStructure, participant.featureId, indexId)
                    );
                    if (indexId.trim()) {
                      onSelectIndex(indexId.trim());
                    }
                  }}
                  onLink={(participant, argStItem, indexId) => {
                    onRootChange(
                      linkFrameParticipantToArgSt(
                        rootStructure,
                        participant.featureId,
                        argStItem.itemIndex,
                        indexId
                      )
                    );
                    onSelectIndex(indexId);
                  }}
                />
              )}
            </div>
            <button
              className="icon-button danger feature-delete-button"
              type="button"
              title={`Delete ${feature.name}`}
              onClick={() =>
                onChange({
                  ...structure,
                  features: structure.features.filter((candidate) => candidate.id !== feature.id)
                })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
          );
        })}
      </div>
    </section>
  );
}

function reorderFeatureEntries(
  features: FeatureEntry[],
  sourceFeatureId: string,
  targetFeatureId: string,
  position: FeatureDropPosition
): FeatureEntry[] {
  const sourceIndex = features.findIndex((feature) => feature.id === sourceFeatureId);
  const targetIndex = features.findIndex((feature) => feature.id === targetFeatureId);

  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex === targetIndex
  ) {
    return features;
  }

  const nextFeatures = [...features];
  const [movingFeature] = nextFeatures.splice(sourceIndex, 1);
  let insertionIndex = targetIndex + (position === "after" ? 1 : 0);
  if (sourceIndex < insertionIndex) {
    insertionIndex -= 1;
  }
  nextFeatures.splice(insertionIndex, 0, movingFeature);
  return nextFeatures;
}

function getFeatureDropPosition(event: DragEvent<HTMLDivElement>): FeatureDropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.height <= 0) {
    return "before";
  }
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function LicensedFeaturePicker({
  suggestions,
  onAdd,
  onAddCustom,
  onAddFrameElement
}: {
  suggestions: FeatureSuggestion[];
  onAdd: (suggestion: FeatureSuggestion) => void;
  onAddCustom: () => void;
  onAddFrameElement?: () => void;
}) {
  const hasFrameElementAction = Boolean(onAddFrameElement);

  return (
    <label className="licensed-feature-picker">
      Add Feature
      <select
        aria-label="Add licensed feature"
        value=""
        onChange={(event) => {
          if (event.target.value === frameElementOptionValue) {
            onAddFrameElement?.();
            return;
          }
          if (event.target.value === customFeatureOptionValue) {
            onAddCustom();
            return;
          }

          const suggestion = suggestions.find(
            (candidate) => candidate.name === event.target.value
          );
          if (suggestion) {
            onAdd(suggestion);
          }
        }}
      >
        <option value="">
          {suggestions.length > 0
            ? "Add licensed feature"
            : "Add feature"}
        </option>
        {suggestions.map((suggestion) => (
          <option key={suggestion.name} value={suggestion.name}>
            {suggestion.name} : {suggestion.valueType}
          </option>
        ))}
        {hasFrameElementAction && (
          <option value={frameElementOptionValue}>Add frame element</option>
        )}
        <option value={customFeatureOptionValue}>Custom feature</option>
      </select>
    </label>
  );
}

function isFrameLikeType(type?: string, seenTypes = new Set<string>()): boolean {
  const typeSpec = getSbcgTypeSpec(type);
  if (!typeSpec || seenTypes.has(typeSpec.type)) {
    return false;
  }
  if (typeSpec.type === "frame") {
    return true;
  }

  seenTypes.add(typeSpec.type);
  return (typeSpec.parents ?? []).some((parentType) => isFrameLikeType(parentType, seenTypes));
}

function getNextFrameElementName(features: FeatureEntry[]): string {
  const existingNames = new Set(features.map((feature) => feature.name.toUpperCase()));
  if (!existingNames.has("ROLE")) {
    return "ROLE";
  }

  let counter = 2;
  while (existingNames.has(`ROLE-${counter}`)) {
    counter += 1;
  }
  return `ROLE-${counter}`;
}

function InlineFrameLinkControls({
  participant,
  argStItems,
  nextIndexId,
  onSetParticipantIndex,
  onLink
}: {
  participant: FrameParticipantLink;
  argStItems: ArgStItem[];
  nextIndexId: string;
  onSetParticipantIndex: (participant: FrameParticipantLink, indexId: string) => void;
  onLink: (participant: FrameParticipantLink, argStItem: ArgStItem, indexId: string) => void;
}) {
  const currentIndex = participant.indexId ?? "";
  const effectiveIndex = currentIndex || nextIndexId;

  return (
    <div className="inline-frame-link-controls" aria-label={`${participant.role} argument link`}>
      <span className="inline-frame-link-title">
        <Link2 size={14} />
        <span>{participant.frameType ?? `frame ${participant.frameIndex + 1}`}</span>
      </span>
      <label>
        Index
        <input
          aria-label={`Index for ${participant.role}`}
          value={currentIndex}
          placeholder={nextIndexId}
          onChange={(event) => onSetParticipantIndex(participant, event.target.value)}
        />
      </label>
      <label>
        ARG-ST
        <select
          aria-label={`Map ${participant.role} to ARG-ST`}
          value=""
          onChange={(event) => {
            const selectedItem = argStItems.find(
              (item) => item.itemIndex === Number(event.target.value)
            );
            if (selectedItem) {
              onLink(participant, selectedItem, effectiveIndex);
            }
          }}
        >
          <option value="">Map to argument</option>
          {argStItems.map((item) => (
            <option key={item.itemIndex} value={item.itemIndex}>
              {item.itemIndex + 1}. {item.label}
              {item.indexId ? ` #${item.indexId}` : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function FeatureSuggestions({
  suggestions,
  onAdd
}: {
  suggestions: FeatureSuggestion[];
  onAdd: (suggestion: FeatureSuggestion) => void;
}) {
  return (
    <div className="feature-suggestions" aria-label="SBCG feature suggestions">
      {suggestions.map((suggestion) => (
        <button
          className="suggestion-chip"
          key={suggestion.name}
          type="button"
          title={suggestion.description}
          onClick={() => onAdd(suggestion)}
        >
          <Plus size={14} />
          <span>{suggestion.name}</span>
          <small>{suggestion.valueType}</small>
        </button>
      ))}
    </div>
  );
}

interface ValueEditorProps {
  value: FSValue;
  onChange: (value: FSValue) => void;
  availableIndexes: string[];
  availableTags: TagDefinition[];
  activeIndex?: string;
  onSelectIndex: (indexId: string) => void;
  featureName?: string;
  featureSpec?: SbcgFeatureSpec;
  rootStructure: FeatureStructure;
  onRootChange: (structure: FeatureStructure) => void;
}

function ValueEditor({
  value,
  onChange,
  availableIndexes,
  availableTags,
  activeIndex,
  onSelectIndex,
  featureName,
  featureSpec,
  rootStructure,
  onRootChange
}: ValueEditorProps) {
  const indexedClass = value.indexId && value.indexId === activeIndex ? " index-active" : "";
  const taggedClass = value.tag && `tag:${value.tag}` === activeIndex ? " tag-active" : "";

  return (
    <div className={`value-editor${indexedClass}${taggedClass}`}>
      <div className="value-toolbar">
        <select
          aria-label="Value type"
          value={value.kind}
          onChange={(event) =>
            onChange(createValueForSelectedKind(event.target.value as ValueKind, value, availableTags))
          }
        >
          {getVisibleValueKinds(value.kind).map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
        {value.kind !== "index-ref" && value.kind !== "tag-ref" && (
          <label className="index-input">
            <Circle size={14} />
            <input
              value={value.indexId ?? ""}
              placeholder="#"
              onFocus={() => value.indexId && onSelectIndex(value.indexId)}
              onChange={(event) =>
                onChange({
                  ...value,
                  indexId: event.target.value || undefined
                })
              }
            />
          </label>
        )}
        <ValueActionsMenu
          value={value}
          availableTags={availableTags}
          onChange={onChange}
          onSelectIndex={onSelectIndex}
        />
      </div>
      <ValueBodyEditor
        featureName={featureName}
        featureSpec={featureSpec}
        value={value}
        onChange={onChange}
        availableIndexes={availableIndexes}
        availableTags={availableTags}
        activeIndex={activeIndex}
        onSelectIndex={onSelectIndex}
        rootStructure={rootStructure}
        onRootChange={onRootChange}
      />
    </div>
  );
}

function createValueForSelectedKind(
  kind: ValueKind,
  currentValue: FSValue,
  availableTags: TagDefinition[]
): FSValue {
  const currentTag = currentValue.tag;
  if (kind === "tag-ref") {
    return createTagRefValue(currentTag || availableTags[0]?.tag || "1");
  }

  const nextValue = defaultValueForKind(kind);
  if (currentTag) {
    return { ...nextValue, tag: currentTag } as FSValue;
  }
  return nextValue;
}

function getVisibleValueKinds(currentKind: ValueKind): ValueKind[] {
  if (currentKind === "tag-ref") {
    return [...valueKinds, "tag-ref"];
  }
  return valueKinds;
}

function ValueActionsMenu({
  value,
  availableTags,
  onChange,
  onSelectIndex
}: {
  value: FSValue;
  availableTags: TagDefinition[];
  onChange: (value: FSValue) => void;
  onSelectIndex: (indexId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const currentTag = value.tag ?? "";

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const setTag = (nextTag: string) => {
    const normalizedTag = nextTag.trim();
    if (value.kind === "tag-ref") {
      onChange(createTagRefValue(normalizedTag));
    } else {
      onChange({
        ...value,
        tag: normalizedTag || undefined
      });
    }
    if (normalizedTag) {
      onSelectIndex(`tag:${normalizedTag}`);
    }
  };

  return (
    <details className="value-actions-menu" open={isOpen} ref={menuRef}>
      <summary
        className="icon-button value-actions-summary"
        aria-label="Value actions"
        title="Value actions"
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((currentIsOpen) => !currentIsOpen);
        }}
      >
        <MoreHorizontal size={16} />
      </summary>
      <div className="value-actions-panel">
        <label>
          Tag
          <input
            value={currentTag}
            placeholder="1 or L"
            onChange={(event) => setTag(event.target.value)}
          />
        </label>
        {availableTags.length > 0 && (
          <label>
            Tag reference
            <select
              aria-label="Tag reference"
              value={value.kind === "tag-ref" ? value.tag : ""}
              onChange={(event) => {
                const tagDefinition = availableTags.find(
                  (candidate) => candidate.tag === event.target.value
                );
                if (tagDefinition) {
                  onChange(createTagReferenceForValue(value, tagDefinition));
                  onSelectIndex(`tag:${tagDefinition.tag}`);
                  setIsOpen(false);
                }
              }}
            >
              <option value="">Use existing tag</option>
              {availableTags.map((tagDefinition) => (
                <option key={tagDefinition.tag} value={tagDefinition.tag}>
                  {tagDefinition.tag} ({tagDefinition.valueKind})
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="icon-text-button subtle"
          type="button"
          disabled={!currentTag}
          onClick={() => {
            setTag("");
            setIsOpen(false);
          }}
        >
          Clear tag
        </button>
      </div>
    </details>
  );
}

function ValueBodyEditor(props: ValueEditorProps) {
  const { value, onChange, availableIndexes, availableTags, activeIndex, onSelectIndex } = props;

  if (value.kind === "atomic") {
    const valueSpec = props.featureSpec ? getFeatureValueSpec(props.featureSpec) : undefined;
    if (valueSpec?.kind === "atomic" && valueSpec.values?.length) {
      return (
        <select
          aria-label={`${props.featureName ?? "Atomic"} value`}
          className="value-input"
          value={value.value}
          onChange={(event) => onChange({ ...value, value: event.target.value })}
        >
          <option value="">Choose value</option>
          {valueSpec.values.map((atomicValue) => (
            <option key={atomicValue} value={atomicValue}>
              {atomicValue}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="value-input"
        value={value.value}
        placeholder="walks"
        onChange={(event) => onChange({ ...value, value: event.target.value })}
      />
    );
  }

  if (value.kind === "type") {
    return (
      <input
        className="value-input italic"
        value={value.label}
        placeholder="NP"
        onChange={(event) => onChange({ ...value, label: event.target.value })}
      />
    );
  }

  if (value.kind === "index-ref") {
    return (
      <button
        className={value.indexId === activeIndex ? "index-pill active" : "index-pill"}
        type="button"
        onClick={() => onSelectIndex(value.indexId)}
      >
        #{value.indexId}
      </button>
    );
  }

  if (value.kind === "tag-ref") {
    return (
      <button
        className={`tag-pill${`tag:${value.tag}` === activeIndex ? " active" : ""}`}
        type="button"
        onClick={() => onSelectIndex(`tag:${value.tag}`)}
      >
        {value.tag}
      </button>
    );
  }

  if (value.kind === "underspecified") {
    return <span className="underspecified">_</span>;
  }

  if (value.kind === "list") {
    return (
      <div className="list-editor">
        <div className="list-items">
          {value.items.length === 0 && <span className="empty-list">&lt; &gt;</span>}
          {value.items.map((item, index) => (
            <div className="list-item" key={`${index}-${item.kind}`}>
              <CornerDownRight size={14} />
              <ValueEditor
                value={item}
                onChange={(nextItem) =>
                  onChange({
                    ...value,
                    items: value.items.map((candidate, itemIndex) =>
                      itemIndex === index ? nextItem : candidate
                    )
                  })
                }
                availableIndexes={availableIndexes}
                availableTags={availableTags}
                activeIndex={activeIndex}
                onSelectIndex={onSelectIndex}
                rootStructure={props.rootStructure}
                onRootChange={props.onRootChange}
              />
              <button
                className="icon-button danger list-item-delete-button"
                type="button"
                title="Remove list item"
                onClick={() =>
                  onChange({
                    ...value,
                    items: value.items.filter((_, itemIndex) => itemIndex !== index)
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="icon-text-button subtle"
          type="button"
          title="Add list item"
          onClick={() =>
            onChange({
              ...value,
              items: [...value.items, createDefaultListItemForFeature(props.featureSpec)]
            })
          }
        >
          <ListPlus size={16} />
          Add item
        </button>
      </div>
    );
  }

  return (
    <FeatureStructureEditor
      structure={value.structure}
      onChange={(structure) => onChange({ ...value, structure })}
      availableIndexes={availableIndexes}
      availableTags={availableTags}
      activeIndex={activeIndex}
      onSelectIndex={onSelectIndex}
      rootStructure={props.rootStructure}
      onRootChange={props.onRootChange}
      compact
    />
  );
}

export function makeListValueFrom(value: FSValue): FSValue {
  return createListValue([value]);
}

function shouldInferValueForRenamedFeature(value: FSValue): boolean {
  if (value.kind === "underspecified") {
    return true;
  }
  if (value.kind === "atomic") {
    return value.value.length === 0;
  }
  if (value.kind === "type") {
    return value.label.length === 0 || value.label === "type";
  }
  if (value.kind === "list") {
    return value.items.length === 0;
  }
  if (value.kind === "feature-structure") {
    return !value.structure.type && value.structure.features.length === 0;
  }
  return false;
}
