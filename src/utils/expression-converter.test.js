import BUNDLE from "../versions/bundles/9.0.0";
import {
  clearStructureCache,
  getLocationRequirements,
  getRequirementsStructure,
  updateRequirementsOwnership,
} from "./expression-converter";
import Locations from "./locations";
import LogicHelper from "./logic-helper";
import SettingsHelper from "./settings-helper";


/**
 * Initialize all logic systems with optional settings overrides.
 * @param {object} settingsOverrides - Settings to override bundle defaults.
 */
function initializeLogic(settingsOverrides = {}) {
  const { logicHelpersFile, dungeonFiles, dungeonMQFiles, bossesFile, overworldFile } = BUNDLE;
  SettingsHelper.initialize(BUNDLE);
  Locations.initialize(dungeonFiles, dungeonMQFiles, bossesFile, overworldFile);
  SettingsHelper.setSettings(settingsOverrides);
  LogicHelper.initialize(logicHelpersFile, SettingsHelper.settings);
  clearStructureCache();
}

/** Restore default settings. */
function restoreDefaultSettings() {
  initializeLogic();
}

/**
 * Format an item for display, handling compound items.
 * @param {object} item - The requirement item to format.
 * @param {boolean} needsParens - Whether to wrap compound items in parentheses.
 * @returns {string} The formatted display string.
 */
function formatItemForOr(item, needsParens) {
  if (item.isCompound) {
    if (item.nestedOr && item.nestedOr.length > 0) {
      const baseDisplay = item.subItems.map((si) => si.displayName).join(" and ");
      const nestedOrDisplay = item.nestedOr
        .map((nestedItem) => {
          if (nestedItem.isCompound) {
            return `(${nestedItem.displayName})`;
          }
          return nestedItem.displayName;
        })
        .join(" or ");
      const fullDisplay = `${baseDisplay} and (${nestedOrDisplay})`;
      return needsParens ? `(${fullDisplay})` : fullDisplay;
    }
    return needsParens ? `(${item.displayName})` : item.displayName;
  }
  return item.displayName;
}

/**
 * Convert Expression requirements to a human-readable string.
 * @param {object} result - The requirements object with clauses and satisfied flag.
 * @returns {string} Human-readable requirements string.
 */
function requirementsToSimpleString(result) {
  if (!result || result.satisfied || result.clauses.length === 0) {
    return "Nothing";
  }

  if (result.clauses.length === 1) {
    const clause = result.clauses[0];
    const hasMultipleItems = clause.items.length > 1;
    const itemNames = clause.items.map((item) => formatItemForOr(item, hasMultipleItems));
    return itemNames.join(" or ");
  }

  const clauseStrings = result.clauses.map((clause) => {
    const hasMultipleItems = clause.items.length > 1;
    const itemNames = clause.items.map((item) => formatItemForOr(item, hasMultipleItems));

    if (itemNames.length === 1) {
      return itemNames[0];
    }
    return `(${itemNames.join(" or ")})`;
  });

  return clauseStrings.join(" AND ");
}


describe("updateRequirementsOwnership", () => {
  beforeAll(() => initializeLogic());
  afterAll(restoreDefaultSettings);

  test("returns input unchanged when satisfied is true", () => {
    const req = { clauses: [], satisfied: true };
    expect(updateRequirementsOwnership(req, {})).toBe(req);
  });

  test("returns input unchanged when clauses is empty", () => {
    const req = { clauses: [], satisfied: false };
    expect(updateRequirementsOwnership(req, {})).toBe(req);
  });

  test("returns input unchanged when null", () => {
    expect(updateRequirementsOwnership(null, {})).toBe(null);
  });

  test("updates simple item owned flag based on items dict", () => {
    const req = {
      clauses: [{ items: [{ name: "Bow", displayName: "Bow", owned: false, isEvent: false }] }],
      satisfied: false,
    };
    const result = updateRequirementsOwnership(req, { Bow: 1 });
    expect(result.clauses[0].items[0].owned).toBe(true);
  });

  test("simple item without count stays unowned", () => {
    const req = {
      clauses: [{ items: [{ name: "Bow", displayName: "Bow", owned: false, isEvent: false }] }],
      satisfied: false,
    };
    const result = updateRequirementsOwnership(req, {});
    expect(result.clauses[0].items[0].owned).toBe(false);
  });

  test("compound item: all subItems owned makes compound owned", () => {
    const req = {
      clauses: [
        {
          items: [
            {
              name: "A+B",
              displayName: "A and B",
              owned: false,
              isCompound: true,
              subItems: [
                { name: "Bow", displayName: "Bow", owned: false, isEvent: false },
                { name: "Bomb_Bag", displayName: "Bombs", owned: false, isEvent: false },
              ],
              nestedOr: null,
            },
          ],
        },
      ],
      satisfied: false,
    };
    const result = updateRequirementsOwnership(req, { Bow: 1, Bomb_Bag: 1 });
    expect(result.clauses[0].items[0].owned).toBe(true);
    expect(result.clauses[0].items[0].subItems[0].owned).toBe(true);
    expect(result.clauses[0].items[0].subItems[1].owned).toBe(true);
  });

  test("compound item: one subItem unowned makes compound not owned", () => {
    const req = {
      clauses: [
        {
          items: [
            {
              name: "A+B",
              displayName: "A and B",
              owned: false,
              isCompound: true,
              subItems: [
                { name: "Bow", displayName: "Bow", owned: false, isEvent: false },
                { name: "Bomb_Bag", displayName: "Bombs", owned: false, isEvent: false },
              ],
              nestedOr: null,
            },
          ],
        },
      ],
      satisfied: false,
    };
    const result = updateRequirementsOwnership(req, { Bow: 1 });
    expect(result.clauses[0].items[0].owned).toBe(false);
  });

  test("nestedOr: subItems owned + some nestedOr owned = compound owned", () => {
    const req = {
      clauses: [
        {
          items: [
            {
              name: "compound",
              displayName: "compound",
              owned: false,
              isCompound: true,
              subItems: [{ name: "Bow", displayName: "Bow", owned: false, isEvent: false }],
              nestedOr: [
                { name: "Bomb_Bag", displayName: "Bombs", owned: false, isEvent: false },
                { name: "Slingshot", displayName: "Slingshot", owned: false, isEvent: false },
              ],
            },
          ],
        },
      ],
      satisfied: false,
    };
    const result = updateRequirementsOwnership(req, { Bow: 1, Bomb_Bag: 1 });
    expect(result.clauses[0].items[0].owned).toBe(true);
  });

  test("nestedOr: subItems owned but no nestedOr owned = compound not owned", () => {
    const req = {
      clauses: [
        {
          items: [
            {
              name: "compound",
              displayName: "compound",
              owned: false,
              isCompound: true,
              subItems: [{ name: "Bow", displayName: "Bow", owned: false, isEvent: false }],
              nestedOr: [
                { name: "Bomb_Bag", displayName: "Bombs", owned: false, isEvent: false },
                { name: "Slingshot", displayName: "Slingshot", owned: false, isEvent: false },
              ],
            },
          ],
        },
      ],
      satisfied: false,
    };
    const result = updateRequirementsOwnership(req, { Bow: 1 });
    expect(result.clauses[0].items[0].owned).toBe(false);
  });

  test("does not mutate input", () => {
    const original = {
      clauses: [{ items: [{ name: "Bow", displayName: "Bow", owned: false, isEvent: false }] }],
      satisfied: false,
    };
    updateRequirementsOwnership(original, { Bow: 1 });
    expect(original.clauses[0].items[0].owned).toBe(false);
  });

  test("handles counted items", () => {
    const req = {
      clauses: [
        {
          items: [
            {
              name: "Progressive_Hookshot,2",
              displayName: "Hookshot x2",
              owned: false,
              isEvent: false,
            },
          ],
        },
      ],
      satisfied: false,
    };
    const result = updateRequirementsOwnership(req, { Progressive_Hookshot: 2 });
    expect(result.clauses[0].items[0].owned).toBe(true);

    const result2 = updateRequirementsOwnership(req, { Progressive_Hookshot: 1 });
    expect(result2.clauses[0].items[0].owned).toBe(false);
  });
});


describe("getLocationRequirements", () => {
  describe("with default settings (starting_age: child)", () => {
    beforeAll(() => initializeLogic({ starting_age: "child" }));
    afterAll(restoreDefaultSettings);

    test("returns { clauses, satisfied } structure", () => {
      const result = getLocationRequirements("KF Midos Top Left Chest", {});
      expect(result).toHaveProperty("clauses");
      expect(result).toHaveProperty("satisfied");
      expect(Array.isArray(result.clauses)).toBe(true);
    });

    test("returns satisfied for unknown location", () => {
      const result = getLocationRequirements("Nonexistent Location XYZ", {});
      expect(result.satisfied).toBe(true);
    });

    test("returns non-empty requirements for a gated location", () => {
      const result = getLocationRequirements("ZD King Zora Thawed", {});
      const str = requirementsToSimpleString(result);
      expect(str).not.toBe("Nothing");
    });

    test("result items have name, displayName, and owned fields", () => {
      const result = getLocationRequirements("ZD King Zora Thawed", {});
      expect(result.clauses.length).toBeGreaterThan(0);
      const firstItem = result.clauses[0].items[0];
      expect(firstItem).toHaveProperty("name");
      expect(firstItem).toHaveProperty("displayName");
      expect(firstItem).toHaveProperty("owned");
    });

    test("with fixed starting_age: child, results have no age identifiers", () => {
      const result = getLocationRequirements("ZD King Zora Thawed", {});
      const str = requirementsToSimpleString(result);
      expect(str).not.toContain("is adult");
      expect(str).not.toContain("is child");
    });

    test("KF Kokiri Sword Chest requires nothing", () => {
      const result = getLocationRequirements("KF Kokiri Sword Chest", {});
      const str = requirementsToSimpleString(result);
      expect(str).toBe("Nothing");
    });

    test("bean patch location shows bottle requirement", () => {
      const result = getLocationRequirements("KF GS Bean Patch", {});
      const str = requirementsToSimpleString(result);
      expect(str.toLowerCase()).toMatch(/bottle/);
    });
  });
});


describe("bridge condition: medallions", () => {
  beforeAll(() => initializeLogic({ bridge: "medallions", bridge_medallions: 6 }));
  afterAll(restoreDefaultSettings);

  test("Ganons Castle shows all 6 medallion requirements", () => {
    const result = getLocationRequirements("Ganons Castle Forest Trial Chest", {});
    const str = requirementsToSimpleString(result);
    expect(str).toContain("Fire Medallion");
    expect(str).toContain("Forest Medallion");
    expect(str).toContain("Light Medallion");
    expect(str).toContain("Shadow Medallion");
    expect(str).toContain("Spirit Medallion");
    expect(str).toContain("Water Medallion");
  });
});

describe("Thieves Hideout keysanity", () => {
  beforeAll(() => initializeLogic({ shuffle_hideoutkeys: "keysanity" }));
  afterAll(restoreDefaultSettings);

  test("Gerudo Membership Card shows key requirement", () => {
    const result = getLocationRequirements("Hideout Gerudo Membership Card", {});
    const str = requirementsToSimpleString(result);
    expect(str).toMatch(/Thieves Hideout Small Key/);
  });

  test("Key location should not require keys", () => {
    const result = getLocationRequirements("Hideout 1 Torch Jail Gerudo Key", {});
    const str = requirementsToSimpleString(result);
    expect(str).not.toMatch(/Small Key/);
  });
});

describe("Adult trade shuffle", () => {
  beforeAll(() => initializeLogic({ adult_trade_shuffle: true, adult_trade_start: ["Pocket Egg"] }));
  afterAll(restoreDefaultSettings);

  test("LW Trade Cojiro requires Cojiro, not the full vanilla chain", () => {
    const result = getLocationRequirements("LW Trade Cojiro", {});
    const str = requirementsToSimpleString(result);
    expect(str).toMatch(/Cojiro/);
    expect(str).not.toMatch(/Pocket Egg/);
    expect(str).not.toMatch(/Pocket Cucco/);
  });
});

describe("Ocarina notes shuffle", () => {
  beforeAll(() => initializeLogic({ shuffle_individual_ocarina_notes: true }));
  afterAll(restoreDefaultSettings);

  test("LW Ocarina Memory Game shows note requirements", () => {
    const result = getLocationRequirements("LW Ocarina Memory Game", {});
    const str = requirementsToSimpleString(result);
    expect(str).toMatch(/Ocarina A Button/);
    expect(str).toMatch(/Ocarina C/);
  });

  test("without note shuffle, notes should not appear", () => {
    initializeLogic({ shuffle_individual_ocarina_notes: false });
    const result = getLocationRequirements("LW Ocarina Memory Game", {});
    const str = requirementsToSimpleString(result);
    expect(str).not.toMatch(/Ocarina.*Button/);
    initializeLogic({ shuffle_individual_ocarina_notes: true });
  });
});

describe("Ganon's Tower trials", () => {
  afterAll(restoreDefaultSettings);

  test("0 trials: should not require trials", () => {
    initializeLogic({ trials: 0 });
    const result = getLocationRequirements("Ganons Tower Boss Key Chest", {});
    const str = requirementsToSimpleString(result);
    expect(str).not.toMatch(/Trials/);
  });

  test("6 trials: should show Light Arrows", () => {
    initializeLogic({ trials: 6 });
    const result = getLocationRequirements("Ganons Tower Boss Key Chest", {});
    const str = requirementsToSimpleString(result);
    expect(str).toMatch(/Light Arrows/);
    expect(str).not.toMatch(/Trials Cleared/);
  });

  test("4 trials: should show Trials Cleared x4", () => {
    initializeLogic({ trials: 4 });
    const result = getLocationRequirements("Ganons Tower Boss Key Chest", {});
    const str = requirementsToSimpleString(result);
    expect(str).toMatch(/Trials Cleared x4/);
  });

  test("random trials: should show Trials Cleared", () => {
    initializeLogic({ trials: 3, trials_random: true });
    const result = getLocationRequirements("Ganons Tower Boss Key Chest", {});
    const str = requirementsToSimpleString(result);
    expect(str).toMatch(/Trials Cleared/);
  });
});


describe("getRequirementsStructure", () => {
  beforeAll(() => initializeLogic());
  afterAll(restoreDefaultSettings);

  test("returns same structure as getLocationRequirements", () => {
    const result = getRequirementsStructure("KF Kokiri Sword Chest");
    expect(result).toHaveProperty("clauses");
    expect(result).toHaveProperty("satisfied");
  });

  test("caches results (second call returns same reference)", () => {
    const r1 = getRequirementsStructure("KF Kokiri Sword Chest");
    const r2 = getRequirementsStructure("KF Kokiri Sword Chest");
    expect(r1).toBe(r2);
  });

  test("clearStructureCache invalidates the cache", () => {
    const r1 = getRequirementsStructure("KF Kokiri Sword Chest");
    clearStructureCache();
    const r2 = getRequirementsStructure("KF Kokiri Sword Chest");
    expect(r1).not.toBe(r2);
  });
});

describe("clearStructureCache", () => {
  beforeAll(() => initializeLogic());
  afterAll(restoreDefaultSettings);

  test("calling does not throw", () => {
    expect(() => clearStructureCache()).not.toThrow();
  });
});
