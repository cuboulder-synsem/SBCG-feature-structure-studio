import {
  Clipboard,
  Download,
  FileInput,
  FileText,
  GitFork,
  LayoutPanelTop,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { AvmPreview } from "../components/AvmPreview";
import { FeatureStructureEditor } from "../components/FeatureStructureEditor";
import { TagLegend } from "../components/TagLegend";
import { TreeEditor, TreePreview } from "../components/TreeEditor";
import { exportLangSciAvm } from "../core/exportLangSciAvm";
import { exportLangSciTree } from "../core/exportLangSciTree";
import { downloadElementAsPng } from "../core/exportPng";
import { exportJson, importJson } from "../core/importExportJson";
import {
  collectIndexIds,
  collectTagDefinitions,
  createInitialSign,
  type FeatureStructure
} from "../core/model";
import { createInitialTree, type TreeNode } from "../core/treeModel";
import { examples, templates, type TemplateDefinition } from "../templates";

type Mode = "avm" | "tree";

const defaultTreeEditorPercent = 55;
const minTreeEditorPercent = 35;
const maxTreeEditorPercent = 70;
const defaultTreePreviewZoom = 0.85;
const minTreePreviewZoom = 0.45;
const maxTreePreviewZoom = 1.6;
const treePreviewZoomStep = 0.1;

export function App() {
  const [mode, setMode] = useState<Mode>("avm");
  const [structure, setStructure] = useState<FeatureStructure>(() => createInitialSign());
  const [tree, setTree] = useState<TreeNode>(() => createInitialTree());
  const [activeIndex, setActiveIndex] = useState<string>();
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>();
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string>();
  const [showTreeNodeLabels, setShowTreeNodeLabels] = useState(true);
  const [treeEditorPercent, setTreeEditorPercent] = useState(defaultTreeEditorPercent);
  const [isResizingTree, setIsResizingTree] = useState(false);
  const [treePreviewZoom, setTreePreviewZoom] = useState(defaultTreePreviewZoom);
  const [importBuffer, setImportBuffer] = useState("");
  const [message, setMessage] = useState("Ready");
  const paperViewRef = useRef<HTMLDivElement>(null);
  const treeGridRef = useRef<HTMLElement>(null);

  const availableIndexes = useMemo(() => collectIndexIds(structure), [structure]);
  const availableTags = useMemo(() => collectTagDefinitions(structure), [structure]);
  const latex = useMemo(() => exportLangSciAvm(structure), [structure]);
  const avmJson = useMemo(() => exportJson(structure), [structure]);
  const treeLatex = useMemo(() => exportLangSciTree(tree), [tree]);
  const treeJson = useMemo(() => exportJson(tree), [tree]);
  const highlightedFeatureId = hoveredFeatureId ?? selectedFeatureId;
  const treeGridStyle = {
    "--tree-editor-fr": `${treeEditorPercent}fr`,
    "--tree-preview-fr": `${100 - treeEditorPercent}fr`
  } as CSSProperties & Record<string, string>;
  const treeZoomPercent = Math.round(treePreviewZoom * 100);

  const selectFeatureFromPaperView = (featureId: string) => {
    setSelectedFeatureId(featureId);
    scrollEditorFeatureIntoView(featureId);
  };

  const clearFeatureFocus = () => {
    setSelectedFeatureId(undefined);
    setHoveredFeatureId(undefined);
  };

  const setTreeEditorPercentClamped = (nextPercent: number) => {
    setTreeEditorPercent(clamp(nextPercent, minTreeEditorPercent, maxTreeEditorPercent));
  };

  const updateTreeSplitFromClientX = (clientX: number) => {
    const rect = treeGridRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) {
      return;
    }
    setTreeEditorPercentClamped(((clientX - rect.left) / rect.width) * 100);
  };

  const startTreeResize = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsResizingTree(true);
    updateTreeSplitFromClientX(event.clientX);
  };

  const handleTreeResizeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setTreeEditorPercentClamped(treeEditorPercent - 4);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setTreeEditorPercentClamped(treeEditorPercent + 4);
    }
  };

  const adjustTreePreviewZoom = (delta: number) => {
    setTreePreviewZoom((currentZoom) =>
      roundZoom(clamp(currentZoom + delta, minTreePreviewZoom, maxTreePreviewZoom))
    );
  };

  const loadStructureDefinition = (
    definitionId: string,
    definitions: TemplateDefinition[],
    label: "template" | "example"
  ) => {
    const definition = definitions.find((candidate) => candidate.id === definitionId);
    if (!definition) {
      return;
    }
    setStructure(structuredClone(definition.structure));
    setMode("avm");
    setActiveIndex(undefined);
    clearFeatureFocus();
    setMessage(`Loaded ${label} ${definition.name}`);
  };

  const loadTemplate = (templateId: string) =>
    loadStructureDefinition(templateId, templates, "template");

  const loadExample = (exampleId: string) =>
    loadStructureDefinition(exampleId, examples, "example");

  const importCurrentJson = () => {
    try {
      if (mode === "tree") {
        setTree(importJson<TreeNode>(importBuffer));
      } else {
        setStructure(importJson<FeatureStructure>(importBuffer));
      }
      clearFeatureFocus();
      setMessage("Opened project");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const downloadPaperViewPng = async () => {
    const paperView = paperViewRef.current?.querySelector<HTMLElement>(".avm-preview");
    if (!paperView) {
      setMessage("Paper View is not ready");
      return;
    }

    try {
      await downloadElementAsPng(paperView, {
        filename: "feature-structure-paper-view.png"
      });
      setMessage("Downloaded Paper View PNG");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not export PNG");
    }
  };

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <h1>Feature Structure Studio</h1>
          <p>Local HPSG/SBCG feature-structure authoring with LaTeX as output.</p>
        </div>
        <div className="mode-toggle" role="tablist" aria-label="Studio mode">
          <button
            className={mode === "avm" ? "active" : ""}
            type="button"
            title="AVM mode"
            onClick={() => setMode("avm")}
          >
            <LayoutPanelTop size={16} />
            AVM
          </button>
          <button
            className={mode === "tree" ? "active" : ""}
            type="button"
            title="Tree mode"
            onClick={() => setMode("tree")}
          >
            <GitFork size={16} />
            Tree
          </button>
        </div>
      </header>

      <section className="toolbar-band">
        <label>
          Template
          <select defaultValue="" onChange={(event) => loadTemplate(event.target.value)}>
            <option value="" disabled>
              Load template
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Example
          <select defaultValue="" onChange={(event) => loadExample(event.target.value)}>
            <option value="" disabled>
              Load example
            </option>
            {examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="icon-text-button"
          type="button"
          title="Reset AVM"
          onClick={() => {
            setStructure(createInitialSign());
            clearFeatureFocus();
            setMessage("Reset AVM");
          }}
        >
          <RotateCcw size={16} />
          Reset AVM
        </button>
        <button
          className="icon-text-button"
          type="button"
          title="Reset Tree"
          onClick={() => {
            setTree(createInitialTree());
            clearFeatureFocus();
            setMessage("Reset tree");
          }}
        >
          <RotateCcw size={16} />
          Reset Tree
        </button>
        <span className="status-line">{message}</span>
      </section>

      {mode === "avm" ? (
        <>
          <AvmUtilityBand
            json={avmJson}
            latex={latex}
            importBuffer={importBuffer}
            setImportBuffer={setImportBuffer}
            importCurrentJson={importCurrentJson}
            setMessage={setMessage}
          />
          <section className="workspace-grid avm-workspace-grid">
            <div className="workspace-column editor-column">
              <h2>Editor</h2>
              <FeatureStructureEditor
                structure={structure}
                onChange={setStructure}
                availableIndexes={availableIndexes}
                availableTags={availableTags}
                activeIndex={activeIndex}
                onSelectIndex={setActiveIndex}
                highlightedFeatureId={highlightedFeatureId}
                onSelectFeature={setSelectedFeatureId}
                onHoverFeature={setHoveredFeatureId}
              />
            </div>

            <div className="workspace-column preview-column paper-preview-column">
              <div className="column-title-row">
                <h2>Paper View</h2>
                <button
                  className="icon-text-button"
                  type="button"
                  title="Download Paper View PNG"
                  onClick={() => void downloadPaperViewPng()}
                >
                  <Download size={16} />
                  PNG
                </button>
              </div>
              <div ref={paperViewRef}>
                <AvmPreview
                  structure={structure}
                  activeIndex={activeIndex}
                  onSelectIndex={setActiveIndex}
                  highlightedFeatureId={highlightedFeatureId}
                  onSelectFeature={selectFeatureFromPaperView}
                />
              </div>
              <TagLegend tags={availableTags} />
            </div>
          </section>
        </>
      ) : (
        <>
          <TreeUtilityBand
            treeLatex={treeLatex}
            treeJson={treeJson}
            importBuffer={importBuffer}
            setImportBuffer={setImportBuffer}
            importCurrentJson={importCurrentJson}
            setMessage={setMessage}
          />
          <section
            className={isResizingTree ? "workspace-grid tree-grid is-resizing" : "workspace-grid tree-grid"}
            ref={treeGridRef}
            style={treeGridStyle}
          >
            <div className="workspace-column editor-column">
              <h2>Tree Editor</h2>
              <TreeEditor
                node={tree}
                onChange={setTree}
                activeIndex={activeIndex}
                onSelectIndex={setActiveIndex}
                highlightedFeatureId={highlightedFeatureId}
                onSelectFeature={setSelectedFeatureId}
                onHoverFeature={setHoveredFeatureId}
              />
            </div>
            <div
              className="workspace-resize-handle"
              role="separator"
              aria-label="Resize editor and preview"
              aria-orientation="vertical"
              aria-valuemin={minTreeEditorPercent}
              aria-valuemax={maxTreeEditorPercent}
              aria-valuenow={treeEditorPercent}
              tabIndex={0}
              title="Resize editor and preview"
              onPointerDown={startTreeResize}
              onPointerMove={(event) => {
                if (isResizingTree) {
                  updateTreeSplitFromClientX(event.clientX);
                }
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture?.(event.pointerId);
                setIsResizingTree(false);
              }}
              onPointerCancel={() => setIsResizingTree(false)}
              onKeyDown={handleTreeResizeKey}
            />
            <div className="workspace-column preview-column paper-preview-column">
              <div className="column-title-row">
                <h2>Tree Preview</h2>
                <div className="tree-preview-toolbar">
                  <label className="tree-preview-options">
                    <input
                      type="checkbox"
                      aria-label="Show shorthand tree labels"
                      checked={showTreeNodeLabels}
                      onChange={(event) => setShowTreeNodeLabels(event.target.checked)}
                    />
                    Labels
                  </label>
                  <div className="tree-zoom-controls" aria-label="Tree preview zoom controls">
                    <button
                      className="icon-button"
                      type="button"
                      title="Zoom out tree preview"
                      aria-label="Zoom out tree preview"
                      onClick={() => adjustTreePreviewZoom(-treePreviewZoomStep)}
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="tree-zoom-readout">{treeZoomPercent}%</span>
                    <button
                      className="icon-button"
                      type="button"
                      title="Zoom in tree preview"
                      aria-label="Zoom in tree preview"
                      onClick={() => adjustTreePreviewZoom(treePreviewZoomStep)}
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      title="Reset tree preview zoom"
                      aria-label="Reset tree preview zoom"
                      onClick={() => setTreePreviewZoom(defaultTreePreviewZoom)}
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="tree-preview">
                <div
                  className="tree-preview-zoom-layer"
                  style={{ transform: `scale(${treePreviewZoom})` }}
                >
                  <TreePreview
                    node={tree}
                    activeIndex={activeIndex}
                    onSelectIndex={setActiveIndex}
                    highlightedFeatureId={highlightedFeatureId}
                    onSelectFeature={selectFeatureFromPaperView}
                    showNodeLabels={showTreeNodeLabels}
                  />
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function AvmUtilityBand({
  json,
  latex,
  importBuffer,
  setImportBuffer,
  importCurrentJson,
  setMessage
}: {
  json: string;
  latex: string;
  importBuffer: string;
  setImportBuffer: (value: string) => void;
  importCurrentJson: () => void;
  setMessage: (value: string) => void;
}) {
  const [openPanel, setOpenPanel] = useState<"latex" | "open-json">();
  const togglePanel = (panel: "latex" | "open-json") => {
    setOpenPanel((currentPanel) => (currentPanel === panel ? undefined : panel));
  };

  return (
    <section className="avm-utility-band" aria-label="AVM import and export">
      <div className="utility-actions">
        <button
          className={openPanel === "latex" ? "icon-text-button active" : "icon-text-button"}
          type="button"
          title="Show AVM LaTeX"
          onClick={() => togglePanel("latex")}
        >
          <FileText size={16} />
          LaTeX
        </button>
        <button
          className="icon-text-button"
          type="button"
          title="Save AVM JSON"
          onClick={() => {
            downloadText("feature-structure.json", json);
            setMessage("Saved AVM JSON");
          }}
        >
          <Download size={16} />
          Save JSON
        </button>
        <button
          className={openPanel === "open-json" ? "icon-text-button active" : "icon-text-button"}
          type="button"
          title="Open AVM JSON"
          onClick={() => togglePanel("open-json")}
        >
          <FileInput size={16} />
          Open JSON
        </button>
      </div>
      {openPanel === "latex" && (
        <div className="avm-utility-panel" aria-label="AVM LaTeX output">
          <button
            className="icon-text-button compact-detail-action"
            type="button"
            title="Copy AVM LaTeX"
            onClick={async () => {
              const copied = await copyTextToClipboard(latex);
              setMessage(copied ? "Copied AVM LaTeX" : "AVM LaTeX shown; clipboard unavailable");
            }}
          >
            <Clipboard size={16} />
            Copy LaTeX
          </button>
          <textarea readOnly value={latex} />
        </div>
      )}
      {openPanel === "open-json" && (
        <div className="avm-utility-panel" aria-label="Open AVM JSON">
          <textarea
            value={importBuffer}
            placeholder="Paste a saved FeatureStructure JSON project here"
            onChange={(event) => setImportBuffer(event.target.value)}
          />
          <button
            className="icon-text-button"
            type="button"
            title="Open AVM JSON"
            onClick={importCurrentJson}
          >
            <FileInput size={16} />
            Open AVM JSON
          </button>
        </div>
      )}
    </section>
  );
}

function TreeUtilityBand({
  treeLatex,
  treeJson,
  importBuffer,
  setImportBuffer,
  importCurrentJson,
  setMessage
}: {
  treeLatex: string;
  treeJson: string;
  importBuffer: string;
  setImportBuffer: (value: string) => void;
  importCurrentJson: () => void;
  setMessage: (value: string) => void;
}) {
  const [openPanel, setOpenPanel] = useState<"latex" | "open-json">();
  const togglePanel = (panel: "latex" | "open-json") => {
    setOpenPanel((currentPanel) => (currentPanel === panel ? undefined : panel));
  };

  return (
    <section className="tree-utility-band" aria-label="Tree import and export">
      <div className="utility-actions">
        <button
          className={openPanel === "latex" ? "icon-text-button active" : "icon-text-button"}
          type="button"
          title="Show Tree LaTeX"
          onClick={() => togglePanel("latex")}
        >
          <FileText size={16} />
          LaTeX
        </button>
        <button
          className="icon-text-button"
          type="button"
          title="Save Tree JSON"
          onClick={() => {
            downloadText("tree-with-avms.json", treeJson);
            setMessage("Saved Tree JSON");
          }}
        >
          <Download size={16} />
          Save JSON
        </button>
        <button
          className={openPanel === "open-json" ? "icon-text-button active" : "icon-text-button"}
          type="button"
          title="Open Tree JSON"
          onClick={() => togglePanel("open-json")}
        >
          <FileInput size={16} />
          Open JSON
        </button>
      </div>
      {openPanel === "latex" && (
        <div className="tree-utility-panel" aria-label="Tree LaTeX output">
          <button
            className="icon-text-button compact-detail-action"
            type="button"
            title="Copy Tree LaTeX"
            onClick={async () => {
              const copied = await copyTextToClipboard(treeLatex);
              setMessage(copied ? "Copied Tree LaTeX" : "Tree LaTeX shown; clipboard unavailable");
            }}
          >
            <Clipboard size={16} />
            Copy LaTeX
          </button>
          <textarea readOnly value={treeLatex} />
        </div>
      )}
      {openPanel === "open-json" && (
        <div className="tree-utility-panel" aria-label="Open Tree JSON">
          <textarea
            value={importBuffer}
            placeholder="Paste a saved TreeNode JSON project here"
            onChange={(event) => setImportBuffer(event.target.value)}
          />
          <button
            className="icon-text-button"
            type="button"
            title="Open Tree JSON"
            onClick={importCurrentJson}
          >
            <FileInput size={16} />
            Open Tree JSON
          </button>
        </div>
      )}
    </section>
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand?.("copy") ?? false;
  textarea.remove();
  return copied;
}

function scrollEditorFeatureIntoView(featureId: string) {
  const row = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-feature-id]")).find(
    (candidate) => candidate.dataset.editorFeatureId === featureId
  );
  row?.scrollIntoView?.({
    block: "center",
    behavior: "smooth"
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundZoom(value: number): number {
  return Math.round(value * 100) / 100;
}
