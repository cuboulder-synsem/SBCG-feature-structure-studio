import { describe, expect, it } from "vitest";
import { exportLangSciTree } from "../src/core/exportLangSciTree";
import { createFeatureEntry, createFeatureStructure, createTypeValue } from "../src/core/model";
import { createTreeNode } from "../src/core/treeModel";

describe("Tree LaTeX export", () => {
  it("exports tree notation with AVMs attached to nodes", () => {
    const wordAvm = createFeatureStructure("word", [
      createFeatureEntry("SYN", createTypeValue("verb"))
    ]);
    const tree = createTreeNode("S", [
      createTreeNode("NP"),
      createTreeNode("VP", [createTreeNode("V", [], wordAvm)])
    ]);

    const latex = exportLangSciTree(tree);

    expect(latex).toContain("\\begin{forest}");
    expect(latex).toContain("[S");
    expect(latex).toContain("[NP]");
    expect(latex).toContain("[VP");
    expect(latex).toContain("[{V\\\\");
    expect(latex).toContain("\\avm{");
    expect(latex).toContain("word");
    expect(latex).toContain("SYN & verb");
    expect(latex).toContain("\\end{forest}");
  });

  it("exports tags that identify whole node AVMs", () => {
    const taggedAvm = {
      ...createFeatureStructure("phrase", [
        createFeatureEntry("SYN", createTypeValue("phrase"))
      ]),
      tag: "A"
    };
    const tree = createTreeNode("NP", [], taggedAvm);

    const latex = exportLangSciTree(tree);

    expect(latex).toContain("\\boxed{\\mathit{A}}\\avm{");
  });
});
