# Feature Structure Studio

Feature Structure Studio is a local-first MVP for building HPSG/SBCG-style feature structures without writing LaTeX by hand. It treats AVMs as structured JSON data and uses LaTeX only as an export target.

## Try the hosted demo

The intended first public release is a hosted, local-first web app on GitHub Pages:

```text
https://<github-user>.github.io/feature-structure-studio/
```

No account, server, or database is required. The app runs in the browser; users can save their work with **Save Project**, reopen it with **Open Project**, copy `langsci-avm` LaTeX, or download the Paper View as PNG.

For an advisor demo, start with the **Example** menu and load `hit-hitting-frame`.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

If you use pnpm:

```bash
pnpm install
pnpm dev
```

## What it supports

- Standalone AVM / feature-structure editing.
- A recursive visual editor for feature entries.
- Add, delete, and rename features.
- Move major attributes with up/down controls or by entering an order number.
- Change value type among atomic, type, list, nested feature structure, index reference, and underspecified.
- Convert any value by changing its value type.
- Add and remove list items.
- Assign an index to a value.
- Reuse an existing index elsewhere as an index reference.
- Click index markers in the preview to highlight matching indexed editor values.
- Link non-null semantic frame participants to `ARG-ST` items so the participant value and argument subscript share the same index.
- Render a paper-oriented AVM view with hierarchical brackets, italic type labels, angle-bracket lists, and subscript-style indices.
- Add only features licensed by the current object's grammar type.
- Infer SBCG-appropriate features from Sag-style grammar-signature types such as `sign`, `word`, `lexeme`, `verb-lexeme`, `phrase`, `syn-obj`, `valence`, `sem-obj`, `context-obj`, `category`, `verb`, and `noun`.
- Infer value shape and expected value type from the central type registry.
- Render registry-defined atomic domains such as `VF`, `AUX`, `INV`, `MRKG`, and `CASE` as dropdowns.
- Load generated Sag-type starters and JSON examples.
- Save feature structures as a local project file.
- Open saved local project files.
- Export feature structures as systematic `langsci-avm` LaTeX.
- Export the Paper View as PNG.
- Tree mode with child editing, node deletion, node rename, AVM attachment, JSON export/import, and a basic tree preview.

## Internal JSON model

The app keeps feature structures as typed JSON-like data, not raw LaTeX.

```ts
type FSValue =
  | AtomicValue
  | TypeValue
  | ListValue
  | FeatureStructureValue
  | IndexRefValue
  | UnderspecifiedValue;

interface FeatureStructure {
  id: string;
  type?: string;
  features: FeatureEntry[];
}

interface FeatureEntry {
  id: string;
  name: string;
  value: FSValue;
}

interface IndexRegistry {
  [indexId: string]: FSValue;
}
```

Every complex feature-structure value records an explicit `type`. Registry-driven feature creation follows the SBCG/HPSG pattern: a type licenses features, and each feature receives either a typed object, an atomic value, or a list value where the grammar calls for one.

This allows reentrancy patterns such as `ARG-ST < NP_1, NP_2 >`, `VAL|SUBJ < NP_1 >`, and `VAL|COMPS < NP_2 >` to be represented as ordinary data.

## Exporting langsci-avm

Use the AVM mode export panel to copy or download generated LaTeX. The exporter lives in `src/core/exportLangSciAvm.ts` and renders a `\avm{...}` block from the structured model.

The first-pass exporter is systematic but intentionally modest: it handles nested AVMs, lists, empty lists, underspecified values, and `\ind{...}` markers. It is designed to be improved without changing the editor data model.

## GitHub Pages deployment

This repo includes `.github/workflows/deploy-pages.yml`. After the project is pushed to a GitHub repository named `feature-structure-studio`, enable **Settings -> Pages -> Source: GitHub Actions**. Every push to `main` will run tests, build the Vite app with `VITE_BASE_PATH=/feature-structure-studio/`, and publish the static site.

## Templates And Examples

The Template dropdown is generated from the SBCG type registry in `src/templates/index.ts`:

- `sign`
- `lexeme`
- `word`
- `phrase`
- `construct`

The Example dropdown keeps richer JSON presets from `templates/`, including verb lexeme, transitive word, passive word, and HIT frame examples.

## Architecture

- `src/core/model.ts`: typed feature-structure model and constructors.
- `src/core/exportLangSciAvm.ts`: LaTeX exporter.
- `src/core/importExportJson.ts`: JSON import/export helpers.
- `src/core/treeModel.ts`: syntactic tree model.
- `src/core/sbcgProfile.ts`: Sag-style SBCG type registry, licensed-feature lookup, value specs, and inference helpers.
- `src/core/renderPreview.ts`: plain-text preview utility.
- `src/components/FeatureStructureEditor.tsx`: recursive AVM editor.
- `src/components/AvmPreview.tsx`: paper-oriented AVM rendering.
- `src/core/semanticLinks.ts`: semantic-frame participant to `ARG-ST` index linking.
- `src/components/TreeEditor.tsx`: tree editor and tree preview.
- `src/app/App.tsx`: local app state, modes, import/export panels, templates.

The project is a plain Vite/React/TypeScript app, which keeps it straightforward to wrap later with Tauri.

See `docs/sbcg-formalism-notes.md` for the Sag (2012)-based assumptions behind the first inference layer.
See `docs/types/` for per-type grammar documentation organized around the registry.

## Tests

```bash
npm test
```

The current unit tests cover:

- creating a feature structure
- nested feature structures
- list values
- index assignment and reuse
- `langsci-avm` export
- JSON import/export round trip
- tree node with attached AVM
- SBCG type-driven feature inference
- feature-name-driven value-shape inference
- licensed-feature lookup from the type registry
- typed-object and atomic value specs
- per-type grammar documentation coverage
- semantic-frame participant to `ARG-ST` index linking
- paper-view AVM bracket and index rendering

## Known MVP limits

- No type hierarchy validation yet.
- SBCG inference is limited to a first Sag-style Section 3 grammar-signature schema, not a full grammar.
- No HPSG schema presets beyond starter templates.
- No TDL export.
- No SVG export.
- Tree rendering is functional but not publication quality.
- LaTeX export is intentionally conservative and may need refinement for house style.
- The paper view is styled for familiar AVM layout, but it is not yet a full LaTeX-quality layout engine.
- JSON import validates syntax, but not the full schema.

## Future directions

- Type hierarchy validation.
- SBCG/HPSG schema presets.
- TDL export.
- SVG/PNG export.
- Publication-quality tree rendering.
- PropBank / VerbNet / FrameNet import.
- English-ASC-Net integration.
- Desktop packaging through Tauri.
