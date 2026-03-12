import {
  Clause,
  combineWithOr,
  CompoundItem,
  Expression,
  getDisplayName,
  impossibleExpr, orCombineExpressions,
  parseCountedItem,
  RequirementItem,
  simplifyOrBySubset,
} from "./expression-data";


// Convenience factories
const ri = (name, owned = false, isEvent = false) =>
  new RequirementItem(name, name, owned, isEvent);
const ownedRi = (name) => ri(name, true);
const falseItem = () => ri("__false__");


describe("RequirementItem", () => {
  test("stores name, displayName, owned, and isEvent", () => {
    const item = new RequirementItem("Bow", "Fairy Bow", true, true);
    expect(item.name).toBe("Bow");
    expect(item.displayName).toBe("Fairy Bow");
    expect(item.owned).toBe(true);
    expect(item.isEvent).toBe(true);
  });

  test("isEvent defaults to false", () => {
    const item = new RequirementItem("X", "X", false);
    expect(item.isEvent).toBe(false);
  });
});


describe("CompoundItem", () => {
  test("stores items with isCompound=true and isEvent=false", () => {
    const c = new CompoundItem([ri("A"), ri("B")]);
    expect(c.isCompound).toBe(true);
    expect(c.isEvent).toBe(false);
    expect(c.items).toHaveLength(2);
  });

  test("name is sorted sub-item names joined with +", () => {
    const c = new CompoundItem([ri("B"), ri("A")]);
    expect(c.name).toBe("A+B");
  });

  test("displayName is sub-item displayNames joined with ' and '", () => {
    const a = new RequirementItem("A", "Alpha", false);
    const b = new RequirementItem("B", "Beta", false);
    const c = new CompoundItem([a, b]);
    expect(c.displayName).toBe("Alpha and Beta");
  });

  test("owned is true when all sub-items are owned", () => {
    const c = new CompoundItem([ownedRi("A"), ownedRi("B")]);
    expect(c.owned).toBe(true);
  });

  test("owned is false when any sub-item is not owned", () => {
    const c = new CompoundItem([ownedRi("A"), ri("B")]);
    expect(c.owned).toBe(false);
  });

  test("owned is false for empty items array", () => {
    const c = new CompoundItem([]);
    expect(c.owned).toBe(false);
  });

  test("flattens nested CompoundItems without nestedOr", () => {
    const inner = new CompoundItem([ri("A"), ri("B")]);
    const outer = new CompoundItem([inner, ri("C")]);
    expect(outer.items).toHaveLength(3);
    expect(outer.items.map(i => i.name).sort()).toEqual(["A", "B", "C"]);
  });

  test("does NOT flatten CompoundItems with nestedOr set", () => {
    const inner = new CompoundItem([ri("A"), ri("B")]);
    inner.nestedOr = [ri("X")];
    const outer = new CompoundItem([inner, ri("C")]);
    expect(outer.items).toHaveLength(2);
    expect(outer.items[0].isCompound).toBe(true);
  });

  test("deduplicates items by name, keeping first occurrence", () => {
    const a1 = ri("A", false);
    const a2 = ri("A", true);
    const c = new CompoundItem([a1, a2, ri("B")]);
    expect(c.items).toHaveLength(2);
    expect(c.items.find(i => i.name === "A").owned).toBe(false);
  });

  test("flattening and deduplication combined", () => {
    const inner = new CompoundItem([ri("A"), ri("B")]);
    const outer = new CompoundItem([inner, ri("A"), ri("C")]);
    expect(outer.items).toHaveLength(3);
    expect(outer.items.map(i => i.name).sort()).toEqual(["A", "B", "C"]);
  });
});


describe("Clause", () => {
  describe("constructor", () => {
    test("stores items", () => {
      const items = [ri("A"), ri("B")];
      const c = new Clause(items);
      expect(c.items).toHaveLength(2);
    });

    test("defaults to empty items array", () => {
      const c = new Clause();
      expect(c.items).toEqual([]);
    });
  });

  describe("addItem", () => {
    test("adds item to empty clause", () => {
      const c = new Clause();
      c.addItem(ri("A"));
      expect(c.items).toHaveLength(1);
    });

    test("adds item alongside existing items", () => {
      const c = new Clause([ri("A")]);
      c.addItem(ri("B"));
      expect(c.items).toHaveLength(2);
    });

    test("rejects duplicate name (idempotent)", () => {
      const c = new Clause([ri("A")]);
      c.addItem(ri("A"));
      expect(c.items).toHaveLength(1);
    });
  });

  describe("clone", () => {
    test("returns a new Clause with same items", () => {
      const original = new Clause([ri("A"), ri("B")]);
      const cloned = original.clone();
      expect(cloned).not.toBe(original);
      expect(cloned.items).toHaveLength(2);
      expect(cloned.items[0].name).toBe("A");
    });

    test("modifying clone does not affect original", () => {
      const original = new Clause([ri("A")]);
      const cloned = original.clone();
      cloned.addItem(ri("B"));
      expect(original.items).toHaveLength(1);
      expect(cloned.items).toHaveLength(2);
    });
  });

  describe("isEmpty", () => {
    test("returns true for no items", () => {
      expect(new Clause().isEmpty()).toBe(true);
    });

    test("returns false when items exist", () => {
      expect(new Clause([ri("A")]).isEmpty()).toBe(false);
    });
  });

  describe("isSatisfied", () => {
    test("empty clause is satisfied (vacuous truth)", () => {
      expect(new Clause().isSatisfied()).toBe(true);
    });

    test("satisfied when any item is owned", () => {
      const c = new Clause([ri("A"), ownedRi("B")]);
      expect(c.isSatisfied()).toBe(true);
    });

    test("not satisfied when no item is owned", () => {
      const c = new Clause([ri("A"), ri("B")]);
      expect(c.isSatisfied()).toBe(false);
    });
  });

  describe("merge", () => {
    test("merges items from other clause", () => {
      const c1 = new Clause([ri("A")]);
      const c2 = new Clause([ri("B")]);
      c1.merge(c2);
      expect(c1.items).toHaveLength(2);
    });

    test("deduplicates during merge", () => {
      const c1 = new Clause([ri("A")]);
      const c2 = new Clause([ri("A"), ri("B")]);
      c1.merge(c2);
      expect(c1.items).toHaveLength(2);
    });
  });
});


describe("Expression", () => {
  describe("constructor", () => {
    test("stores clauses", () => {
      const e = new Expression([new Clause([ri("A")])]);
      expect(e.clauses).toHaveLength(1);
    });

    test("defaults to empty clauses array", () => {
      expect(new Expression().clauses).toEqual([]);
    });
  });

  describe("addClause", () => {
    test("adds non-empty clause", () => {
      const e = new Expression();
      e.addClause(new Clause([ri("A")]));
      expect(e.clauses).toHaveLength(1);
    });

    test("skips empty clause", () => {
      const e = new Expression();
      e.addClause(new Clause());
      expect(e.clauses).toHaveLength(0);
    });
  });

  describe("clone", () => {
    test("returns deep copy independent of original", () => {
      const original = new Expression([new Clause([ri("A")])]);
      const cloned = original.clone();
      expect(cloned).not.toBe(original);
      expect(cloned.clauses[0]).not.toBe(original.clauses[0]);
      cloned.clauses[0].addItem(ri("B"));
      expect(original.clauses[0].items).toHaveLength(1);
      expect(cloned.clauses[0].items).toHaveLength(2);
    });
  });

  describe("isEmpty", () => {
    test("returns true for no clauses", () => {
      expect(new Expression().isEmpty()).toBe(true);
    });

    test("returns false when clauses exist", () => {
      expect(new Expression([new Clause([ri("A")])]).isEmpty()).toBe(false);
    });
  });

  describe("isImpossible", () => {
    test("returns true when clause has only __false__ items", () => {
      const e = new Expression([new Clause([falseItem()])]);
      expect(e.isImpossible()).toBe(true);
    });

    test("returns true when ANY clause is all-false", () => {
      const e = new Expression([
        new Clause([ri("A")]),
        new Clause([falseItem()]),
      ]);
      expect(e.isImpossible()).toBe(true);
    });

    test("returns false for normal items", () => {
      const e = new Expression([new Clause([ri("A")])]);
      expect(e.isImpossible()).toBe(false);
    });

    test("returns false for empty expression", () => {
      expect(new Expression().isImpossible()).toBe(false);
    });

    test("returns false when clause has false AND valid items", () => {
      const e = new Expression([new Clause([falseItem(), ri("A")])]);
      expect(e.isImpossible()).toBe(false);
    });
  });

  describe("isSatisfied", () => {
    test("returns true when all clauses satisfied", () => {
      const e = new Expression([
        new Clause([ownedRi("A")]),
        new Clause([ownedRi("B")]),
      ]);
      expect(e.isSatisfied()).toBe(true);
    });

    test("returns false when any clause is unsatisfied", () => {
      const e = new Expression([
        new Clause([ownedRi("A")]),
        new Clause([ri("B")]),
      ]);
      expect(e.isSatisfied()).toBe(false);
    });

    test("returns true for empty expression", () => {
      expect(new Expression().isSatisfied()).toBe(true);
    });
  });

  describe("merge", () => {
    test("merges clauses from other expression", () => {
      const e1 = new Expression([new Clause([ri("A")])]);
      const e2 = new Expression([new Clause([ri("B")])]);
      e1.merge(e2);
      expect(e1.clauses).toHaveLength(2);
    });

    test("skips empty clauses during merge", () => {
      const e1 = new Expression();
      const e2 = new Expression([new Clause(), new Clause([ri("A")])]);
      e1.merge(e2);
      expect(e1.clauses).toHaveLength(1);
    });
  });
});


describe("Expression.simplify", () => {
  describe("ANNIHILATION (AND): A * 0 = 0", () => {
    test("collapses to impossible when clause has only false items", () => {
      const e = new Expression([new Clause([falseItem()])]);
      e.simplify();
      expect(e.isImpossible()).toBe(true);
      expect(e.clauses).toHaveLength(1);
    });

    test("collapses even with other valid clauses present", () => {
      const e = new Expression([
        new Clause([ri("A")]),
        new Clause([falseItem()]),
      ]);
      e.simplify();
      expect(e.isImpossible()).toBe(true);
    });

    test("[__false__] detected as impossible, not simplified to empty", () => {
      const e = new Expression([new Clause([falseItem()])]);
      e.simplify();
      expect(e.isSatisfied()).toBe(false);
      expect(e.isImpossible()).toBe(true);
    });
  });

  describe("IDENTITY (OR): A + 0 = A", () => {
    test("removes false items from clauses", () => {
      const e = new Expression([new Clause([ri("A"), falseItem()])]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
      expect(e.clauses[0].items).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("A");
    });

    test("leaves non-false items unchanged", () => {
      const e = new Expression([new Clause([ri("A"), ri("B")])]);
      e.simplify();
      expect(e.clauses[0].items).toHaveLength(2);
    });
  });

  describe("IDENTITY (AND): A * 1 = A", () => {
    test("removes clauses with owned items (satisfied)", () => {
      const e = new Expression([
        new Clause([ri("A")]),
        new Clause([ownedRi("B")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("A");
    });

    test("removes empty clauses after false item removal", () => {
      const e = new Expression([
        new Clause([falseItem(), ownedRi("X")]),
        new Clause([ri("A")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("A");
    });

    test("keeps unsatisfied clauses", () => {
      const e = new Expression([new Clause([ri("A")])]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
    });
  });

  describe("IDEMPOTENT (OR): A + A = A", () => {
    test("removes duplicate items within a clause", () => {
      const e = new Expression([new Clause([ri("A"), ri("A"), ri("B")])]);
      e.simplify();
      expect(e.clauses[0].items).toHaveLength(2);
    });

    test("keeps lowest count for progressive items", () => {
      const hook1 = new RequirementItem("Progressive_Hookshot,1", "Hookshot", false);
      const hook2 = new RequirementItem("Progressive_Hookshot,2", "Longshot", false);
      const e = new Expression([new Clause([hook2, hook1])]);
      e.simplify();
      expect(e.clauses[0].items).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("Progressive_Hookshot,1");
    });

    test("single-item clause skips progressive reduction", () => {
      const hook2 = new RequirementItem("Progressive_Hookshot,2", "Longshot", false);
      const e = new Expression([new Clause([hook2])]);
      e.simplify();
      expect(e.clauses[0].items[0].name).toBe("Progressive_Hookshot,2");
    });

    test("skips compound items during progressive dedup", () => {
      const compound = new CompoundItem([ri("A"), ri("B")]);
      const e = new Expression([new Clause([compound, ri("C"), ri("C")])]);
      e.simplify();
      // Compound kept, duplicate C removed
      const names = e.clauses[0].items.map(i => i.name);
      expect(names).toContain("A+B");
      expect(names).toContain("C");
      expect(e.clauses[0].items).toHaveLength(2);
    });
  });

  describe("ABSORPTION (OR): A + (A * B) = A", () => {
    test("removes compound when simple item exists in same clause", () => {
      const compound = new CompoundItem([ri("A"), ri("B")]);
      const e = new Expression([new Clause([ri("A"), compound])]);
      e.simplify();
      expect(e.clauses[0].items).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("A");
    });

    test("keeps compound when no simpler item exists", () => {
      const compound = new CompoundItem([ri("A"), ri("B")]);
      const e = new Expression([new Clause([compound, ri("C")])]);
      e.simplify();
      expect(e.clauses[0].items).toHaveLength(2);
    });

    test("handles counted items: lower count absorbs higher compound", () => {
      const hook1 = new RequirementItem("Progressive_Hookshot,1", "Hookshot", false);
      const hook2 = new RequirementItem("Progressive_Hookshot,2", "Longshot", false);
      const compound = new CompoundItem([hook2, ri("Bow")]);
      const e = new Expression([new Clause([hook1, compound])]);
      e.simplify();
      expect(e.clauses[0].items).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("Progressive_Hookshot,1");
    });
  });

  describe("DISTRIBUTIVE: (A*B) + (A*C) = A * (B+C)", () => {
    test("factors common item from compound OR options", () => {
      const ab = new CompoundItem([ri("A"), ri("B")]);
      const ac = new CompoundItem([ri("A"), ri("C")]);
      const e = new Expression([new Clause([ab, ac])]);
      e.simplify();
      const singleItemClauses = e.clauses.filter(c => c.items.length === 1);
      const singleNames = singleItemClauses.map(c => c.items[0].name);
      expect(singleNames).toContain("A");
    });

    test("no factoring when nothing is common", () => {
      const ab = new CompoundItem([ri("A"), ri("B")]);
      const cd = new CompoundItem([ri("C"), ri("D")]);
      const e = new Expression([new Clause([ab, cd])]);
      e.simplify();
      expect(e.clauses.some(c => c.items.length === 2)).toBe(true);
    });

    test("single (non-compound) items are not factored", () => {
      const e = new Expression([new Clause([ri("A"), ri("B")])]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
      expect(e.clauses[0].items).toHaveLength(2);
    });
  });

  describe("IDEMPOTENT (AND): A * A = A", () => {
    test("removes duplicate clauses", () => {
      const e = new Expression([
        new Clause([ri("A")]),
        new Clause([ri("A")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
    });

    test("clause equality is order-independent", () => {
      const e = new Expression([
        new Clause([ri("A"), ri("B")]),
        new Clause([ri("B"), ri("A")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
    });
  });

  describe("ABSORPTION (AND): A * (A + B) = A", () => {
    test("removes redundant superset clause", () => {
      const e = new Expression([
        new Clause([ri("A")]),
        new Clause([ri("A"), ri("B")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("A");
    });

    test("progressive items: higher count clause absorbs lower count clause", () => {
      const hook1 = new RequirementItem("Progressive_Hookshot,1", "Hookshot", false);
      const hook2 = new RequirementItem("Progressive_Hookshot,2", "Longshot", false);
      const e = new Expression([
        new Clause([hook2]),
        new Clause([hook1, ri("Bow")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("Progressive_Hookshot,2");
    });

    test("does not absorb when items differ", () => {
      const e = new Expression([
        new Clause([ri("A")]),
        new Clause([ri("B")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(2);
    });

    test("bidirectional: smaller clause absorbs regardless of order", () => {
      const e = new Expression([
        new Clause([ri("A"), ri("B")]),
        new Clause([ri("A")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
      expect(e.clauses[0].items).toHaveLength(1);
    });
  });

  describe("integration", () => {
    test("applies multiple laws in sequence", () => {
      const e = new Expression([
        new Clause([ri("A"), falseItem()]),
        new Clause([ri("A"), ri("B")]),
        new Clause([ownedRi("X")]),
      ]);
      e.simplify();
      expect(e.clauses).toHaveLength(1);
      expect(e.clauses[0].items[0].name).toBe("A");
    });

    test("empty expression stays empty", () => {
      const e = new Expression();
      e.simplify();
      expect(e.isEmpty()).toBe(true);
    });

    test("all-satisfied clauses result in empty expression", () => {
      const e = new Expression([
        new Clause([ownedRi("A")]),
        new Clause([ownedRi("B")]),
      ]);
      e.simplify();
      expect(e.isEmpty()).toBe(true);
    });
  });
});


describe("impossibleExpr", () => {
  test("returns expression with single false clause", () => {
    const e = impossibleExpr();
    expect(e.clauses).toHaveLength(1);
    expect(e.clauses[0].items).toHaveLength(1);
    expect(e.clauses[0].items[0].name).toBe("__false__");
  });

  test("isImpossible returns true", () => {
    expect(impossibleExpr().isImpossible()).toBe(true);
  });

  test("isSatisfied returns false", () => {
    expect(impossibleExpr().isSatisfied()).toBe(false);
  });
});


describe("orCombineExpressions", () => {
  test("returns empty when expr1 is empty", () => {
    const result = orCombineExpressions(new Expression(), new Expression([new Clause([ri("A")])]));
    expect(result.isEmpty()).toBe(true);
  });

  test("returns expr2 when expr1 is impossible", () => {
    const expr2 = new Expression([new Clause([ri("A")])]);
    const result = orCombineExpressions(impossibleExpr(), expr2);
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items[0].name).toBe("A");
  });

  test("returns expr1 when expr2 is impossible", () => {
    const expr1 = new Expression([new Clause([ri("A")])]);
    const result = orCombineExpressions(expr1, impossibleExpr());
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items[0].name).toBe("A");
  });

  test("combines single-clause expressions into OR", () => {
    const e1 = new Expression([new Clause([ri("A")])]);
    const e2 = new Expression([new Clause([ri("B")])]);
    const result = orCombineExpressions(e1, e2);
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items).toHaveLength(2);
  });

  test("distributes multi-clause expressions (product-of-sums)", () => {
    const e1 = new Expression([new Clause([ri("A")]), new Clause([ri("B")])]);
    const e2 = new Expression([new Clause([ri("C")]), new Clause([ri("D")])]);
    const result = orCombineExpressions(e1, e2);
    expect(result.clauses.length).toBeGreaterThan(0);
  });

  test("both impossible returns impossible", () => {
    const result = orCombineExpressions(impossibleExpr(), impossibleExpr());
    expect(result.isImpossible()).toBe(true);
  });

  test("deduplicates and simplifies result", () => {
    const e1 = new Expression([new Clause([ri("A")])]);
    const e2 = new Expression([new Clause([ri("A")])]);
    const result = orCombineExpressions(e1, e2);
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items[0].name).toBe("A");
  });
});


describe("combineWithOr", () => {
  test("returns impossible for empty array", () => {
    expect(combineWithOr([]).isImpossible()).toBe(true);
  });

  test("returns single expression unchanged", () => {
    const e = new Expression([new Clause([ri("A")])]);
    const result = combineWithOr([e]);
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items[0].name).toBe("A");
  });

  test("combines two expressions with OR", () => {
    const e1 = new Expression([new Clause([ri("A")])]);
    const e2 = new Expression([new Clause([ri("B")])]);
    const result = combineWithOr([e1, e2]);
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].items).toHaveLength(2);
  });

  test("mix of impossible and valid: valid survives", () => {
    const valid = new Expression([new Clause([ri("A")])]);
    const result = combineWithOr([impossibleExpr(), valid]);
    expect(result.isImpossible()).toBe(false);
    expect(result.clauses[0].items[0].name).toBe("A");
  });
});


describe("parseCountedItem", () => {
  test("parses item with count", () => {
    const { baseName, count } = parseCountedItem("Progressive_Hookshot,2");
    expect(baseName).toBe("Progressive_Hookshot");
    expect(count).toBe(2);
  });

  test("parses item without count", () => {
    const { baseName, count } = parseCountedItem("Bow");
    expect(baseName).toBe("Bow");
    expect(count).toBe(1);
  });

  test("handles explicit ,1 suffix", () => {
    const { baseName, count } = parseCountedItem("Bow,1");
    expect(baseName).toBe("Bow");
    expect(count).toBe(1);
  });

  test("handles underscored names with count", () => {
    const { baseName, count } = parseCountedItem("Progressive_Strength_Upgrade,3");
    expect(baseName).toBe("Progressive_Strength_Upgrade");
    expect(count).toBe(3);
  });

  test("memoizes results (same reference on repeat call)", () => {
    const r1 = parseCountedItem("Bow");
    const r2 = parseCountedItem("Bow");
    expect(r1).toBe(r2);
  });
});


describe("getDisplayName", () => {
  test("returns mapped name for known items", () => {
    expect(getDisplayName("Progressive_Hookshot")).toBe("Hookshot");
    expect(getDisplayName("Bow")).toBe("Bow");
    expect(getDisplayName("Bomb_Bag")).toBe("Bombs");
  });

  test("replaces underscores with spaces for unknown items", () => {
    expect(getDisplayName("Unknown_Item")).toBe("Unknown Item");
  });

  test("reorders Small Key items", () => {
    expect(getDisplayName("Small_Key_Forest_Temple")).toBe("Forest Temple Small Key");
  });

  test("reorders Boss Key items", () => {
    expect(getDisplayName("Boss_Key_Shadow_Temple")).toBe("Shadow Temple Boss Key");
  });

  test("returns correct display name for songs", () => {
    expect(getDisplayName("Zeldas_Lullaby")).toBe("Zelda's Lullaby");
    expect(getDisplayName("Eponas_Song")).toBe("Epona's Song");
  });

  test("returns correct display name for equipment", () => {
    expect(getDisplayName("Gerudo_Membership_Card")).toBe("Gerudo Card");
  });

  test("handles single word item", () => {
    expect(getDisplayName("Boomerang")).toBe("Boomerang");
  });

  test("memoizes results", () => {
    const r1 = getDisplayName("Dins_Fire");
    const r2 = getDisplayName("Dins_Fire");
    expect(r1).toBe(r2);
    expect(r1).toBe("Din's Fire");
  });
});


describe("simplifyOrBySubset", () => {
  test("returns single item unchanged", () => {
    const items = [ri("A")];
    expect(simplifyOrBySubset(items)).toHaveLength(1);
  });

  test("returns empty array unchanged", () => {
    expect(simplifyOrBySubset([])).toHaveLength(0);
  });

  test("removes compound superset of simple item", () => {
    const simple = ri("A");
    const compound = new CompoundItem([ri("A"), ri("B")]);
    const result = simplifyOrBySubset([simple, compound]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("A");
  });

  test("keeps unrelated items", () => {
    const result = simplifyOrBySubset([ri("A"), ri("B")]);
    expect(result).toHaveLength(2);
  });

  test("handles multiple absorptions", () => {
    const a = ri("A");
    const ab = new CompoundItem([ri("A"), ri("B")]);
    const ac = new CompoundItem([ri("A"), ri("C")]);
    const result = simplifyOrBySubset([a, ab, ac]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("A");
  });

  test("compound with nestedOr uses opaque name (not absorbed by base item)", () => {
    const compound = new CompoundItem([ri("A"), ri("B")]);
    compound.nestedOr = [ri("X")];
    const result = simplifyOrBySubset([ri("A"), compound]);
    expect(result).toHaveLength(2);
  });
});
