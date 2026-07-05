import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvmPreview } from "../src/components/AvmPreview";
import {
  createFeatureEntry,
  createFeatureStructure,
  createIndexRefValue,
  createListValue,
  createNestedFeatureStructureValue,
  createTagRefValue,
  createTypeValue
} from "../src/core/model";

describe("AVM preview brackets", () => {
  it("marks nested feature structures with hierarchical bracket depths", () => {
    const structure = createFeatureStructure("sign", [
      createFeatureEntry(
        "SYN",
        createNestedFeatureStructureValue(
          createFeatureStructure("syn-obj", [
            createFeatureEntry(
              "CAT",
              createNestedFeatureStructureValue(
                createFeatureStructure("verb", [
                  createFeatureEntry("VF", createTypeValue("fin"))
                ])
              )
            )
          ])
        )
      )
    ]);

    const markup = renderToStaticMarkup(
      <AvmPreview structure={structure} onSelectIndex={() => undefined} />
    );

    expect(markup).toContain('data-depth="0"');
    expect(markup).toContain('data-depth="1"');
    expect(markup).toContain('data-depth="2"');
    expect(markup).toContain("bracket-depth-0");
    expect(markup).toContain("bracket-depth-1");
    expect(markup).toContain("bracket-depth-2");
  });

  it("renders semantic indices as italic values and ARG-ST indices as subscripts", () => {
    const structure = createFeatureStructure("verb", [
      createFeatureEntry("ARG-ST", createListValue([{ ...createTypeValue("NP"), indexId: "i" }])),
      createFeatureEntry(
        "SEM",
        createNestedFeatureStructureValue(
          createFeatureStructure("semantics", [
            createFeatureEntry(
              "FRAMES",
              createListValue([
                createNestedFeatureStructureValue(
                  createFeatureStructure("put-rel", [
                    createFeatureEntry("AGT", createIndexRefValue("i"))
                  ])
                )
              ])
            )
          ])
        )
      )
    ]);

    const markup = renderToStaticMarkup(
      <AvmPreview structure={structure} onSelectIndex={() => undefined} />
    );

    expect(markup).toContain("preview-index-value");
    expect(markup).toContain("preview-index-subscript");
    expect(markup).toContain("<sub>i</sub>");
  });

  it("renders HPSG tags as boxed labels before their tagged reference", () => {
    const structure = createFeatureStructure("verb", [
      createFeatureEntry(
        "ARG-ST",
        createListValue([{ ...createTypeValue("NP"), indexId: "i", tag: "1" }])
      )
    ]);

    const markup = renderToStaticMarkup(
      <AvmPreview structure={structure} onSelectIndex={() => undefined} />
    );
    const openBracket = markup.indexOf("〈");
    const tag = markup.indexOf("preview-tag");
    const np = markup.indexOf("NP");
    const closeBracket = markup.indexOf("〉");

    expect(markup).toContain("preview-tag");
    expect(openBracket).toBeLessThan(tag);
    expect(tag).toBeLessThan(np);
    expect(np).toBeLessThan(closeBracket);
    expect(markup).toContain("<sub>i</sub>");
  });

  it("renders numeric tags upright and alphabetic tags italicized", () => {
    const structure = createFeatureStructure("lexeme", [
      createFeatureEntry("ARG-ST", createListValue([{ ...createTypeValue("NP"), tag: "1" }])),
      createFeatureEntry("VAL", createTagRefValue("L"))
    ]);

    const markup = renderToStaticMarkup(
      <AvmPreview structure={structure} onSelectIndex={() => undefined} />
    );
    const stylesCss = readFileSync("src/styles.css", "utf8");
    const numberRule = stylesCss.match(/\.preview-tag-number\s*\{[^}]+\}/)?.[0] ?? "";
    const letterRule = stylesCss.match(/\.preview-tag-letter\s*\{[^}]+\}/)?.[0] ?? "";

    expect(markup).toContain("preview-tag-number");
    expect(markup).toContain("preview-tag-letter");
    expect(numberRule).toContain("font-style: normal");
    expect(letterRule).toContain("font-style: italic");
  });

  it("renders list tag references as bare boxed tags without angle brackets", () => {
    const structure = createFeatureStructure("lexeme", [
      createFeatureEntry("ARG-ST", { ...createListValue([createTypeValue("NP")]), tag: "L" }),
      createFeatureEntry("VAL", createTagRefValue("L"))
    ]);

    const markup = renderToStaticMarkup(
      <AvmPreview structure={structure} onSelectIndex={() => undefined} />
    );
    const argSt = markup.indexOf("ARG-ST");
    const taggedList = markup.indexOf("preview-tag", argSt);
    const openBracket = markup.indexOf("〈", taggedList);
    const val = markup.indexOf("VAL");
    const bareTag = markup.indexOf("preview-tag", val);
    const nextOpenBracket = markup.indexOf("〈", bareTag);

    expect(taggedList).toBeGreaterThan(argSt);
    expect(openBracket).toBeGreaterThan(taggedList);
    expect(bareTag).toBeGreaterThan(val);
    expect(nextOpenBracket === -1 || nextOpenBracket < 0).toBe(true);
  });

  it("keeps angle brackets compact for simple atomic lists", () => {
    const structure = createFeatureStructure("word", [
      createFeatureEntry("FORM", createListValue([{ kind: "atomic", value: "hit" }]))
    ]);

    const markup = renderToStaticMarkup(
      <AvmPreview structure={structure} onSelectIndex={() => undefined} />
    );

    expect(markup).toContain("preview-list-compact");
    expect(markup).toContain("〈");
    expect(markup).toContain("〉");
    expect(markup).not.toContain("preview-list-fence-left");
  });

  it("renders tall angle brackets as enclosing fences around nested AVMs", () => {
    const structure = createFeatureStructure("sem-obj", [
      createFeatureEntry(
        "FRAMES",
        createListValue([
          createNestedFeatureStructureValue(
            createFeatureStructure("hitting-frame", [
              createFeatureEntry("HITTER", createIndexRefValue("i")),
              createFeatureEntry("HITTEE", createIndexRefValue("j"))
            ])
          )
        ])
      )
    ]);

    const markup = renderToStaticMarkup(
      <AvmPreview structure={structure} onSelectIndex={() => undefined} />
    );

    expect(markup).toContain("preview-list-bracketed");
    expect(markup).toContain("preview-list-fence-left");
    expect(markup).toContain("preview-list-fence-right");
    expect(markup).not.toContain("<svg");
    expect(markup).not.toContain('height="100%"');
    expect(markup).not.toContain('preserveAspectRatio="none"');
  });

  it("does not print quote marks for empty atomic values", () => {
    const structure = createFeatureStructure("word", [
      createFeatureEntry("FORM", createListValue([{ kind: "atomic", value: "" }]))
    ]);

    const markup = renderToStaticMarkup(
      <AvmPreview structure={structure} onSelectIndex={() => undefined} />
    );

    expect(markup).not.toContain("&#x27;&#x27;");
    expect(markup).not.toContain("''");
  });

  it("styles paper-view feature labels as small capitals without bold weight", () => {
    const stylesCss = readFileSync("src/styles.css", "utf8");
    const previewFeatureRule = stylesCss.match(/\.preview-feature\s*\{[^}]+\}/)?.[0] ?? "";

    expect(previewFeatureRule).toContain("font-variant: small-caps");
    expect(previewFeatureRule).toContain("font-weight: 400");
    expect(previewFeatureRule).not.toContain("font-weight: 700");
  });

  it("centers feature labels against bracketed values in paper view rows", () => {
    const stylesCss = readFileSync("src/styles.css", "utf8");
    const previewRowRule = stylesCss.match(/\.preview-row\s*\{[^}]+\}/)?.[0] ?? "";

    expect(previewRowRule).toContain("align-items: center");
    expect(previewRowRule).not.toContain("align-items: baseline");
  });

  it("sizes tall list angle brackets from nested content without intrinsic SVG height", () => {
    const stylesCss = readFileSync("src/styles.css", "utf8");
    const previewListRule =
      stylesCss.match(/\.preview-list-bracketed\s*\{[^}]+\}/)?.[0] ?? "";
    const compactListRule =
      stylesCss.match(/\.preview-list-compact\s*\{[^}]+\}/)?.[0] ?? "";
    const previewFenceRule = stylesCss.match(/\.preview-list-fence\s*\{[^}]+\}/)?.[0] ?? "";

    expect(previewListRule).toContain("display: inline-flex");
    expect(previewListRule).toContain("align-items: stretch");
    expect(compactListRule).toContain("display: inline-flex");
    expect(previewFenceRule).toContain("align-self: stretch");
    expect(previewFenceRule).not.toContain("height: 100%");
  });
});
