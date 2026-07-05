import {
  Clipboard,
  Download,
  FileInput,
  FileJson,
  FileText,
  GitFork,
  LayoutPanelTop,
  RotateCcw
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { AvmPreview } from "../components/AvmPreview";
import { FeatureStructureEditor } from "../components/FeatureStructureEditor";
import { TagLegend } from "../components/TagLegend";
import { TreeEditor, TreePreview } from "../components/TreeEditor";
import { exportLangSciAvm } from "../core/exportLangSciAvm";
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

export function App() {
  const [mode, setMode] = useState<Mode>("avm");
  const [structure, setStructure] = useState<FeatureStructure>(() => createInitialSign());
  const [tree, setTree] = useState<TreeNode>(() => createInitialTree());
  const [activeIndex, setActiveIndex] = useState<string>();
  const [importBuffer, setImportBuffer] = useState("");
  const [message, setMessage] = useState("Ready");
  const paperViewRef = useRef<HTMLDivElement>(null);

  const availableIndexes = useMemo(() => collectIndexIds(structure), [structure]);
  const availableTags = useMemo(() => collectTagDefinitions(structure), [structure]);
  const latex = useMemo(() => exportLangSciAvm(structure), [structure]);
  const avmJson = useMemo(() => exportJson(structure), [structure]);
  const treeJson = useMemo(() => exportJson(tree), [tree]);

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
            onClick={() => setMode("avm")}
          >
            <LayoutPanelTop size={16} />
            AVM
          </button>
          <button
            className={mode === "tree" ? "active" : ""}
            type="button"
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
          onClick={() => {
            setStructure(createInitialSign());
            setMessage("Reset AVM");
          }}
        >
          <RotateCcw size={16} />
          Reset AVM
        </button>
        <button
          className="icon-text-button"
          type="button"
          onClick={() => {
            setTree(createInitialTree());
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
                />
              </div>
              <TagLegend tags={availableTags} />
            </div>
          </section>
          <AvmUtilityBand
            json={avmJson}
            latex={latex}
            importBuffer={importBuffer}
            setImportBuffer={setImportBuffer}
            importCurrentJson={importCurrentJson}
            setMessage={setMessage}
          />
        </>
      ) : (
        <section className="workspace-grid tree-grid">
          <div className="workspace-column editor-column">
            <h2>Tree Editor</h2>
            <TreeEditor
              node={tree}
              onChange={setTree}
              activeIndex={activeIndex}
              onSelectIndex={setActiveIndex}
            />
          </div>
          <div className="workspace-column preview-column">
            <h2>Tree Preview</h2>
            <div className="tree-preview">
              <TreePreview node={tree} />
            </div>
          </div>
          <TreeExportsPanel
            treeJson={treeJson}
            importBuffer={importBuffer}
            setImportBuffer={setImportBuffer}
            importCurrentJson={importCurrentJson}
            setMessage={setMessage}
          />
        </section>
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
  return (
    <section className="avm-utility-band" aria-label="AVM import and export">
      <div className="utility-actions">
        <button
          className="icon-text-button"
          type="button"
          title="Copy LaTeX"
          onClick={async () => {
            await navigator.clipboard.writeText(latex);
            setMessage("Copied LaTeX");
          }}
        >
          <Clipboard size={16} />
          Copy LaTeX
        </button>
        <button
          className="icon-text-button"
          type="button"
          title="Download LaTeX"
          onClick={() => {
            downloadText("feature-structure.tex", latex);
            setMessage("Downloaded feature-structure.tex");
          }}
        >
          <Download size={16} />
          LaTeX
        </button>
        <button
          className="icon-text-button"
          type="button"
          title="Save Project"
          onClick={() => {
            downloadText("feature-structure.json", json);
            setMessage("Saved project file");
          }}
        >
          <Download size={16} />
          Save Project
        </button>
      </div>
      <details className="utility-details">
        <summary>
          <FileText size={16} />
          LaTeX
        </summary>
        <textarea readOnly value={latex} />
      </details>
      <details className="utility-details">
        <summary>
          <FileJson size={16} />
          Project JSON
        </summary>
        <button
          className="icon-text-button compact-detail-action"
          type="button"
          title="Copy Project JSON"
          onClick={async () => {
            await navigator.clipboard.writeText(json);
            setMessage("Copied project JSON");
          }}
        >
          <Clipboard size={16} />
          Copy Project JSON
        </button>
        <textarea readOnly value={json} />
      </details>
      <details className="utility-details import-details">
        <summary>
          <FileInput size={16} />
          Open Project
        </summary>
        <div className="compact-import-row">
          <textarea
            value={importBuffer}
            placeholder="Paste a saved Feature Structure Studio project file here"
            onChange={(event) => setImportBuffer(event.target.value)}
          />
          <button className="icon-text-button" type="button" onClick={importCurrentJson}>
            <FileInput size={16} />
            Open Project
          </button>
        </div>
      </details>
    </section>
  );
}

function TreeExportsPanel({
  treeJson,
  importBuffer,
  setImportBuffer,
  importCurrentJson,
  setMessage
}: {
  treeJson: string;
  importBuffer: string;
  setImportBuffer: (value: string) => void;
  importCurrentJson: () => void;
  setMessage: (value: string) => void;
}) {
  return (
    <div className="workspace-column export-column">
      <h2>Export</h2>
      <ExportBlock
        title="Tree JSON"
        icon={<FileJson size={16} />}
        value={treeJson}
        filename="tree-with-avms.json"
        setMessage={setMessage}
      />
      <ImportBlock
        value={importBuffer}
        onChange={setImportBuffer}
        onImport={importCurrentJson}
      />
    </div>
  );
}

function ExportBlock({
  title,
  icon,
  value,
  filename,
  setMessage
}: {
  title: string;
  icon: ReactNode;
  value: string;
  filename: string;
  setMessage: (value: string) => void;
}) {
  return (
    <section className="export-block">
      <div className="export-header">
        <h3>
          {icon}
          {title}
        </h3>
        <div>
          <button
            className="icon-button"
            type="button"
            title={`Copy ${title}`}
            onClick={async () => {
              await navigator.clipboard.writeText(value);
              setMessage(`Copied ${title}`);
            }}
          >
            <Clipboard size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            title={`Download ${title}`}
            onClick={() => {
              downloadText(filename, value);
              setMessage(`Downloaded ${filename}`);
            }}
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      <textarea readOnly value={value} />
    </section>
  );
}

function ImportBlock({
  value,
  onChange,
  onImport
}: {
  value: string;
  onChange: (value: string) => void;
  onImport: () => void;
}) {
  return (
    <section className="export-block">
      <div className="export-header">
        <h3>
          <FileInput size={16} />
          Import JSON
        </h3>
        <button className="icon-text-button" type="button" onClick={onImport}>
          <FileInput size={16} />
          Import
        </button>
      </div>
      <textarea
        value={value}
        placeholder="Paste FeatureStructure or TreeNode JSON here"
        onChange={(event) => onChange(event.target.value)}
      />
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
