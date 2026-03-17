import {
  combineDNFPaths, dnfPathSetsEqual,
  dnfPathsToExpression, expressionToDNFPaths, pruneDominatedDNFPaths,
} from "./dnf-paths";
import {
  Clause, Expression, RequirementItem, impossibleExpr,
} from "./expression-data";


// Convenience factories
const ri = (name) => new RequirementItem(name, name, false);
const clause = (...names) => new Clause(names.map(n => ri(n)));
const expr = (...clauseItemLists) =>
  new Expression(clauseItemLists.map(items => clause(...items)));


describe("expressionToDNFPaths", () => {
  test("empty expression returns [[]] (one empty path)", () => {
    expect(expressionToDNFPaths(new Expression())).toEqual([[]]);
  });

  test("impossible expression (all-false clause) returns []", () => {
    const e = impossibleExpr();
    expect(expressionToDNFPaths(e)).toEqual([]);
  });

  test("single clause, single item", () => {
    const e = expr(["A"]);
    expect(expressionToDNFPaths(e)).toEqual([["A"]]);
  });

  test("single clause, multiple items (OR)", () => {
    const e = expr(["A", "B"]);
    const paths = expressionToDNFPaths(e);
    expect(paths).toHaveLength(2);
    expect(paths).toContainEqual(["A"]);
    expect(paths).toContainEqual(["B"]);
  });

  test("two single-item clauses (AND)", () => {
    const e = expr(["A"], ["B"]);
    const paths = expressionToDNFPaths(e);
    expect(paths).toEqual([["A", "B"]]);
  });

  test("two multi-item clauses produce cross-product paths", () => {
    const e = expr(["A", "B"], ["C", "D"]);
    const paths = expressionToDNFPaths(e);
    expect(paths).toHaveLength(4);
    expect(paths).toContainEqual(["A", "C"]);
    expect(paths).toContainEqual(["A", "D"]);
    expect(paths).toContainEqual(["B", "C"]);
    expect(paths).toContainEqual(["B", "D"]);
  });

  test("paths are sorted alphabetically within each path", () => {
    const e = expr(["C"], ["A"]);
    const paths = expressionToDNFPaths(e);
    expect(paths).toEqual([["A", "C"]]);
  });

  test("shared items do not duplicate in merged paths", () => {
    const e = expr(["A", "B"], ["A", "C"]);
    const paths = expressionToDNFPaths(e);
    expect(paths).toContainEqual(["A"]);
    expect(paths).toContainEqual(["B", "C"]);
  });

  test("prunes dominated paths during expansion", () => {
    const e = expr(["A"], ["A", "B"]);
    const paths = expressionToDNFPaths(e);
    expect(paths).toEqual([["A"]]);
  });

  test("handles clause with mix of false and valid items", () => {
    const falseRi = new RequirementItem("__false__", "false", false);
    const e = new Expression([new Clause([falseRi, ri("A")])]);
    const paths = expressionToDNFPaths(e);
    expect(paths).toEqual([["A"]]);
  });

  test("handles counted items in paths", () => {
    const hook2 = new RequirementItem("Progressive_Hookshot,2", "Longshot", false);
    const e = new Expression([new Clause([hook2])]);
    const paths = expressionToDNFPaths(e);
    expect(paths).toEqual([["Progressive_Hookshot,2"]]);
  });

  test(">50 paths truncated to 30 shortest", () => {
    const clauses = [];
    for (let i = 0; i < 6; i++) {
      clauses.push(new Clause([ri(`X${i}`), ri(`Y${i}`)]));
    }
    const e = new Expression(clauses);
    const paths = expressionToDNFPaths(e);
    expect(paths.length).toBeLessThanOrEqual(30);
  });
});


describe("combineDNFPaths", () => {
  test("single path x single path", () => {
    const result = combineDNFPaths([["A"]], [["B"]]);
    expect(result).toEqual([["A", "B"]]);
  });

  test("cartesian product of multiple paths", () => {
    const result = combineDNFPaths([["A"], ["B"]], [["C"], ["D"]]);
    expect(result).toHaveLength(4);
    expect(result).toContainEqual(["A", "C"]);
    expect(result).toContainEqual(["A", "D"]);
    expect(result).toContainEqual(["B", "C"]);
    expect(result).toContainEqual(["B", "D"]);
  });

  test("merges overlapping items (dedup)", () => {
    const result = combineDNFPaths([["A", "B"]], [["B", "C"]]);
    expect(result).toEqual([["A", "B", "C"]]);
  });

  test("counted items: keeps max count", () => {
    const result = combineDNFPaths(
      [["Progressive_Hookshot,2"]],
      [["Progressive_Hookshot,1"]],
    );
    expect(result).toEqual([["Progressive_Hookshot,2"]]);
  });

  test("empty source paths produce empty result", () => {
    expect(combineDNFPaths([], [["A"]])).toEqual([]);
  });

  test("empty exit paths produce empty result", () => {
    expect(combineDNFPaths([["A"]], [])).toEqual([]);
  });

  test("empty path in array passes through other side", () => {
    const result = combineDNFPaths([[]], [["A"]]);
    expect(result).toEqual([["A"]]);
  });
});


describe("pruneDominatedDNFPaths", () => {
  test("single path unchanged", () => {
    expect(pruneDominatedDNFPaths([["A"]])).toEqual([["A"]]);
  });

  test("removes dominated path (superset)", () => {
    const result = pruneDominatedDNFPaths([["A"], ["A", "B"]]);
    expect(result).toEqual([["A"]]);
  });

  test("keeps non-dominated (unrelated) paths", () => {
    const result = pruneDominatedDNFPaths([["A"], ["B"]]);
    expect(result).toHaveLength(2);
  });

  test("removes exact duplicates", () => {
    const result = pruneDominatedDNFPaths([["A", "B"], ["A", "B"]]);
    expect(result).toEqual([["A", "B"]]);
  });

  test("counted items: lower count dominates higher", () => {
    const result = pruneDominatedDNFPaths([
      ["Progressive_Hookshot,1"],
      ["Progressive_Hookshot,2"],
    ]);
    expect(result).toEqual([["Progressive_Hookshot,1"]]);
  });

  test("multi-level domination", () => {
    const result = pruneDominatedDNFPaths([
      ["A"],
      ["A", "B"],
      ["A", "B", "C"],
    ]);
    expect(result).toEqual([["A"]]);
  });

  test("mutual non-domination preserved", () => {
    const result = pruneDominatedDNFPaths([["A", "B"], ["B", "C"]]);
    expect(result).toHaveLength(2);
  });
});


describe("dnfPathSetsEqual", () => {
  test("identical sets return true", () => {
    expect(dnfPathSetsEqual([["A"], ["B"]], [["A"], ["B"]])).toBe(true);
  });

  test("same paths different order return true", () => {
    expect(dnfPathSetsEqual([["A"], ["B"]], [["B"], ["A"]])).toBe(true);
  });

  test("different lengths return false", () => {
    expect(dnfPathSetsEqual([["A"]], [["A"], ["B"]])).toBe(false);
  });

  test("different paths return false", () => {
    expect(dnfPathSetsEqual([["A"]], [["B"]])).toBe(false);
  });

  test("both empty return true", () => {
    expect(dnfPathSetsEqual([], [])).toBe(true);
  });

  test("multi-item paths with different contents return false", () => {
    expect(dnfPathSetsEqual([["A", "B"]], [["A", "C"]])).toBe(false);
  });
});


describe("dnfPathsToExpression", () => {
  test("empty paths returns impossible expression", () => {
    expect(dnfPathsToExpression([]).isImpossible()).toBe(true);
  });

  test("single empty path returns empty (satisfied) expression", () => {
    expect(dnfPathsToExpression([[]]).isEmpty()).toBe(true);
  });

  test("single path, single item produces one-clause expression", () => {
    const result = dnfPathsToExpression([["Bow"]]);
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items[0].name).toBe("Bow");
  });

  test("single path, multiple items produces multiple AND clauses", () => {
    const result = dnfPathsToExpression([["Bow", "Hookshot"]]);
    expect(result.clauses.length).toBeGreaterThanOrEqual(2);
  });

  test("multiple paths are OR-combined", () => {
    const result = dnfPathsToExpression([["A"], ["B"]]);
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items).toHaveLength(2);
  });

  test("counted item gets x2 display suffix", () => {
    const result = dnfPathsToExpression([["Progressive_Hookshot,2"]]);
    expect(result.clauses[0].items[0].displayName).toBe("Hookshot x2");
  });

  test("Magic_Bean counted does NOT get xN suffix", () => {
    const result = dnfPathsToExpression([["Magic_Bean,5"]]);
    expect(result.clauses[0].items[0].displayName).toBe("Magic Bean");
  });

  test("result is simplified (redundancies removed)", () => {
    const result = dnfPathsToExpression([["A"], ["A", "B"]]);
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items[0].name).toBe("A");
  });

  test("uses getDisplayName for proper display names", () => {
    const result = dnfPathsToExpression([["Bomb_Bag"]]);
    expect(result.clauses[0].items[0].displayName).toBe("Bombs");
  });
});
