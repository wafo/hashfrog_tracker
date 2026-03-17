import memoize from "memoizee";

// Maps logic item names to human-readable display names shown in tooltips.
const DISPLAY_NAMES = {
  Progressive_Hookshot: "Hookshot",
  Progressive_Strength_Upgrade: "Strength",
  Progressive_Scale: "Scale",
  Progressive_Wallet: "Wallet",
  Bomb_Bag: "Bombs",
  Bow: "Bow",
  Slingshot: "Slingshot",
  Boomerang: "Boomerang",
  Ocarina: "Ocarina",
  Bombchus: "Bombchus",
  Magic_Meter: "Magic",
  Dins_Fire: "Din's Fire",
  Farores_Wind: "Farore's Wind",
  Nayrus_Love: "Nayru's Love",
  Fire_Arrows: "Fire Arrows",
  Ice_Arrows: "Ice Arrows",
  Light_Arrows: "Light Arrows",
  Lens_of_Truth: "Lens of Truth",
  Megaton_Hammer: "Hammer",
  Iron_Boots: "Iron Boots",
  Hover_Boots: "Hover Boots",
  Mirror_Shield: "Mirror Shield",
  Goron_Tunic: "Goron Tunic",
  Zora_Tunic: "Zora Tunic",
  Kokiri_Sword: "Kokiri Sword",
  Master_Sword: "Master Sword",
  Biggoron_Sword: "Biggoron Sword",
  Deku_Shield: "Deku Shield",
  Hylian_Shield: "Hylian Shield",
  Bottle: "Bottle",
  Rutos_Letter: "Ruto's Letter",
  Zeldas_Letter: "Zelda's Letter",
  Stone_of_Agony: "Stone of Agony",
  Gerudo_Membership_Card: "Gerudo Card",
  Gold_Skulltula_Token: "Skulltula Token",
  Piece_of_Heart: "Heart Piece",
  Heart_Container: "Heart Container",
  Magic_Bean: "Magic Bean",
  Deku_Stick_Capacity: "Deku Stick Upgrade",
  Deku_Nut_Capacity: "Deku Nut Upgrade",

  Zeldas_Lullaby: "Zelda's Lullaby",
  Eponas_Song: "Epona's Song",
  Sarias_Song: "Saria's Song",
  Suns_Song: "Sun's Song",
  Song_of_Time: "Song of Time",
  Song_of_Storms: "Song of Storms",
  Minuet_of_Forest: "Minuet of Forest",
  Bolero_of_Fire: "Bolero of Fire",
  Serenade_of_Water: "Serenade of Water",
  Requiem_of_Spirit: "Requiem of Spirit",
  Nocturne_of_Shadow: "Nocturne of Shadow",
  Prelude_of_Light: "Prelude of Light",

  Kokiri_Emerald: "Kokiri Emerald",
  Goron_Ruby: "Goron Ruby",
  Zora_Sapphire: "Zora Sapphire",
  Forest_Medallion: "Forest Medallion",
  Fire_Medallion: "Fire Medallion",
  Water_Medallion: "Water Medallion",
  Shadow_Medallion: "Shadow Medallion",
  Spirit_Medallion: "Spirit Medallion",
  Light_Medallion: "Light Medallion",
};


class RequirementItem {
  /**
   * Constructs a leaf requirement node representing a single collectible item or event.
   * @param {string} name - The canonical logic item name.
   * @param {string} displayName - The human-readable display name shown in tooltips.
   * @param {boolean} owned - Whether the player currently owns this item.
   * @param {boolean} isEvent - Whether this item represents an event rather than a collectible.
   */
  constructor(name, displayName, owned, isEvent = false) {
    this.isCompound = false;

    this.name = name;
    this.displayName = displayName;
    this.owned = owned;
    this.isEvent = isEvent;
  }
}

class CompoundItem {
  /**
   * Constructs a CompoundItem representing an AND of items.
   *
   * Flattens nested CompoundItems and deduplicates by name.
   * @param {Array} items - Array of RequirementItem or CompoundItem instances.
   */
  constructor(items = []) {
    // Flatten nested CompoundItems without nestedOr then deduplicate by name
    const flat = [];
    for (const item of items) {
      if (item.isCompound && !item.nestedOr) {
        flat.push(...item.items);
      } else {
        flat.push(item);
      }
    }

    const seen = new Set();
    const deduped = [];
    for (const item of flat) {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        deduped.push(item);
      }
    }

    this.items = deduped;
    this.isCompound = true;

    this.name = deduped.map(i => i.name).sort().join("+");
    this.displayName = deduped.map(i => i.displayName).join(" and ");
    this.owned = deduped.length > 0 && deduped.every(item => item.owned);
    this.isEvent = false;
  }
}

class Clause {
  /**
   * Constructs a Clause with the given items.
   * @param {Array} items - The items in this clause.
   */
  constructor(items = []) {
    this.items = items;
  }

  /**
   * IDEMPOTENT LAW (OR): A + A = A.
   *
   * Adds item only if no item with the same name is already present.
   * @param {RequirementItem|CompoundItem} item - The item to add.
   */
  addItem(item) {
    if (!this.items.some(i => i.name === item.name)) {
      this.items.push(item);
    }
  }

  /**
   * Returns a shallow copy of this clause.
   * @returns {Clause} A shallow clone of this clause.
   */
  clone() {
    return new Clause([...this.items]);
  }

  /**
   * Returns true if this clause has no items.
   * @returns {boolean} True if there are no items in this clause.
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * ANNIHILATION LAW (OR): A + 1 = 1.
   *
   * Returns true if any item is owned, or the clause is empty (vacuously true).
   * @returns {boolean} True if the clause is satisfied.
   */
  isSatisfied() {
    return this.items.length === 0 || this.items.some(item => item.owned);
  }

  /**
   * Adds all items from `other` into this clause, deduplicating via addItem.
   * @param {Clause} other - The clause whose items will be merged in.
   */
  merge(other) {
    for (const item of other.items) {
      this.addItem(item);
    }
  }
}

class Expression {
  /**
   * Constructs an Expression with the given clauses.
   * @param {Array} clauses - The clauses in this expression.
   */
  constructor(clauses = []) {
    this.clauses = clauses;
  }

  /**
   * Appends a non-empty clause to this expression.
   * @param {Clause} clause - The clause to add.
   */
  addClause(clause) {
    if (!clause.isEmpty()) {
      this.clauses.push(clause);
    }
  }

  /**
   * Returns a deep copy of this expression.
   * @returns {Expression} A deep clone of this expression.
   */
  clone() {
    return new Expression(this.clauses.map(clause => clause.clone()));
  }

  /**
   * Returns true if this expression has no clauses (vacuously satisfied).
   * @returns {boolean} True if there are no clauses.
   */
  isEmpty() {
    return this.clauses.length === 0;
  }

  /**
   * ANNIHILATION LAW (AND): A · 0 = 0.
   *
   * Returns true if any clause consists entirely of false items, making the expression unsatisfiable.
   * @returns {boolean} True if the expression is impossible to satisfy.
   */
  isImpossible() {
    return this.clauses.some(
      clause =>
        clause.items.length > 0 &&
        clause.items.every(item => item.name === "__false__")
    );
  }

  /**
   * Returns true if all clauses are satisfied.
   * @returns {boolean} True if every clause in this expression is satisfied.
   */
  isSatisfied() {
    return this.clauses.every(clause => clause.isSatisfied());
  }

  /**
   * Adds all clauses from `other` into this expression.
   * @param {Expression} other - The expression whose clauses will be merged in.
   */
  merge(other) {
    for (const clause of other.clauses) {
      this.addClause(clause);
    }
  }

  /**
   * Simplifies the expression by applying Boolean algebra simplification laws.
   */
  simplify() {
    // ANNIHILATION LAW (AND): A · 0 = 0
    // If any clause contains ONLY false items, the entire expression is impossible.
    // Must check before removing false items, otherwise empty clauses are treated as satisfied.
    const hasImpossibleClause = this.clauses.some(
      clause => clause.items.length > 0 && clause.items.every(item => item.name === "__false__")
    );
    if (hasImpossibleClause) {
      this.clauses = [new Clause([new RequirementItem("__false__", "false", false)])];
      return;
    }

    // IDENTITY LAW (OR): A + 0 = A
    // Remove false items from each clause.
    for (const clause of this.clauses) {
      clause.items = clause.items.filter(item => item.name !== "__false__");
    }

    // IDENTITY LAW (AND): A · 1 = A
    // Remove satisfied clauses.
    this.clauses = this.clauses.filter(clause => !clause.isSatisfied());

    // IDEMPOTENT LAW (OR): A + A = A
    // Remove duplicate items within each clause. Also remove progressive item redundancy.
    for (const clause of this.clauses) {
      const seen = new Set();
      clause.items = clause.items.filter(item => {
        if (seen.has(item.name)) {
          return false;
        }
        seen.add(item.name);
        return true;
      });

      // For progressive items in an OR context, keep only the lowest count for each base item
      if (clause.items.length > 1) {
        const baseNameMinCount = new Map();
        for (const item of clause.items) {
          if (item.isCompound) { continue; }
          const { baseName, count } = parseCountedItem(item.name);
          const existing = baseNameMinCount.get(baseName);
          if (existing === undefined || count < existing) {
            baseNameMinCount.set(baseName, count);
          }
        }

        clause.items = clause.items.filter(item => {
          if (item.isCompound) { return true; }
          const { baseName, count } = parseCountedItem(item.name);
          return count <= baseNameMinCount.get(baseName);
        });
      }
    }

    // ABSORPTION LAW (OR): A + (A · B) = A
    // Within each clause, if item A exists and (A · B) exists, remove (A · B) since A alone is sufficient.
    for (const clause of this.clauses) {
      clause.items = simplifyOrBySubset(clause.items);
    }

    // DISTRIBUTIVE LAW: (A · B) + (A · C) = A · (B + C)
    // Factor out common items from OR options within a clause.
    const newClauses = [];
    for (const clause of this.clauses) {
      if (clause.items.length > 1) {
        const { factored, remaining } = factorCommonFromOrOptions(clause.items);
        // Add factored items as separate AND clauses
        for (const item of factored) {
          newClauses.push(new Clause([item]));
        }

        // Keep remaining items as the OR clause
        if (remaining.length > 0) {
          newClauses.push(new Clause(remaining));
        }
      } else {
        newClauses.push(clause);
      }
    }
    this.clauses = newClauses;

    // IDEMPOTENT LAW (AND): A · A = A
    // Remove duplicate clauses.
    const seenKeys = new Set();
    this.clauses = this.clauses.filter(clause => {
      const key = clause.items.map(i => i.name).sort().join("|");
      if (seenKeys.has(key)) {
        return false;
      }
      seenKeys.add(key);
      return true;
    });

    // ABSORPTION LAW (AND): A · (A + B) = A
    // When clause I implies clause J (every way to satisfy I also satisfies J), J is redundant.
    // Handles the classic case ([A] makes [A, B] redundant) and progressive items ([Hookshot x2] implies [Hookshot x1]).
    {
      const progressiveAbsorbed = new Set();
      for (let i = 0; i < this.clauses.length; i++) {
        for (let j = i + 1; j < this.clauses.length; j++) {
          if (progressiveAbsorbed.has(i) || progressiveAbsorbed.has(j)) { continue; }
          const ci = this.clauses[i];
          const cj = this.clauses[j];

          // Check if I implies J: every item in I maps to an item in J with same base name and <= count
          const iImpliesJ = ci.items.every(cItem => {
            if (cItem.isCompound) {
              return cj.items.some(oItem => oItem.name === cItem.name);
            }
            const { baseName: cBase, count: cCount } = parseCountedItem(cItem.name);
            return cj.items.some(oItem => {
              if (oItem.isCompound) { return false; }
              const { baseName: oBase, count: oCount } = parseCountedItem(oItem.name);
              return cBase === oBase && cCount >= oCount;
            });
          });

          // Check if J implies I
          const jImpliesI = cj.items.every(cItem => {
            if (cItem.isCompound) {
              return ci.items.some(oItem => oItem.name === cItem.name);
            }
            const { baseName: cBase, count: cCount } = parseCountedItem(cItem.name);
            return ci.items.some(oItem => {
              if (oItem.isCompound) { return false; }
              const { baseName: oBase, count: oCount } = parseCountedItem(oItem.name);
              return cBase === oBase && cCount >= oCount;
            });
          });

          if (iImpliesJ) {
            progressiveAbsorbed.add(j);
          } else if (jImpliesI) {
            progressiveAbsorbed.add(i);
          }
        }
      }
      if (progressiveAbsorbed.size > 0) {
        this.clauses = this.clauses.filter((_, idx) => !progressiveAbsorbed.has(idx));
      }
    }
  }
}


/**
 * Returns a canonical impossible Expression containing a single false item.
 * @returns {Expression} An unsatisfiable expression.
 */
function impossibleExpr() {
  return new Expression([new Clause([new RequirementItem("__false__", "false", false)])]);
}

/**
 * Combine two Expressions using proper OR with the Product-of-Sums distributive law.
 * @param {Expression} expr1 - The first expression.
 * @param {Expression} expr2 - The second expression.
 * @returns {Expression} The OR combination of the two expressions.
 */
function orCombineExpressions(expr1, expr2) {
  if (expr1.isEmpty() || expr1.isSatisfied() || expr2.isEmpty() || expr2.isSatisfied()) {
    return new Expression();
  }
  if (expr1.isImpossible()) { return expr2; }
  if (expr2.isImpossible()) { return expr1; }

  const result = new Expression();
  for (const clause1 of expr1.clauses) {
    for (const clause2 of expr2.clauses) {
      // Merge items from both clauses into one OR clause, deduplicating by name
      const seen = new Set(clause1.items.map(i => i.name));
      const mergedItems = [...clause1.items];
      for (const item of clause2.items) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          mergedItems.push(item);
        }
      }
      result.addClause(new Clause(mergedItems));
    }
  }

  result.simplify();
  return result;
}

/**
 * Combine an array of Expressions with OR.
 *
 * Returns an impossible Expression if the array is empty.
 * @param {Array} exprs - Array of Expression objects to combine.
 * @returns {Expression} The OR combination of all expressions.
 */
function combineWithOr(exprs) {
  if (exprs.length === 0) {
    return impossibleExpr();
  }

  let result = exprs[0];
  for (let i = 1; i < exprs.length; i++) {
    result = orCombineExpressions(result, exprs[i]);
  }

  return result;
}

/**
 * DISTRIBUTIVE LAW: (A · B) + (A · C) = A · (B + C)
 *
 * Factor out common items from OR options.
 * @param {Array} items - Array of items in an OR clause.
 * @returns {{ factored: Array, remaining: Array }} Factored out items and remaining OR options.
 */
function factorCommonFromOrOptions(items) {
  if (items.length <= 1) {
    return { factored: [], remaining: items };
  }

  // Build a map of item names to their objects for each OR option
  const optionItemMaps = items.map(item => {
    const itemMap = new Map();
    if (item.isCompound && item.items) {
      for (const subItem of item.items) {
        itemMap.set(subItem.name, subItem);
      }
    } else {
      itemMap.set(item.name, item);
    }
    return itemMap;
  });

  // Find items that appear in ALL OR options
  const firstOptionNames = [...optionItemMaps[0].keys()];
  const commonNames = firstOptionNames.filter(name =>
    optionItemMaps.every(map => map.has(name))
  );

  if (commonNames.length === 0) {
    return { factored: [], remaining: items };
  }

  // Extract common items
  const factored = commonNames.map(name => optionItemMaps[0].get(name));

  // Build new OR options without the common items
  const remaining = items.map((_item, index) => {
    const itemMap = optionItemMaps[index];

    // Remove common items from this option
    const remainingItems = [];
    for (const [name, subItem] of itemMap) {
      if (!commonNames.includes(name)) {
        remainingItems.push(subItem);
      }
    }

    if (remainingItems.length === 0) {
      // This option was entirely common items
      return null;
    }
    if (remainingItems.length === 1) {
      // Single item, no compound needed
      return remainingItems[0];
    }

    // Multiple items remain, create a new compound
    return new CompoundItem(remainingItems);
  }).filter(item => item !== null);

  // Deduplicate remaining items by name
  const seenNames = new Set();
  const dedupedRemaining = remaining.filter(item => {
    if (seenNames.has(item.name)) {
      return false;
    }
    seenNames.add(item.name);
    return true;
  });

  return { factored, remaining: dedupedRemaining };
}

/**
 * Parse a logic item name into its base name and required count.
 * @param {string} itemName - Item name, optionally suffixed with ",N" for a count.
 * @returns {{ baseName: string, count: number }} Parsed base name and count (defaults to 1).
 */
const parseCountedItem = memoize(function (itemName) {
  const match = itemName.match(/^(.+),(\d+)$/);
  if (match) {
    return { baseName: match[1], count: parseInt(match[2], 10) };
  }
  return { baseName: itemName, count: 1 };
});

/**
 * Return true if requirement set A is a subset of requirement set B.
 * @param {Map} reqsA - Requirement map from item base name to count.
 * @param {Map} reqsB - Requirement map from item base name to count.
 * @returns {boolean} True if reqsA is a subset of reqsB.
 */
function isSubset(reqsA, reqsB) {
  // A is a subset of B if:
  // - Every item in A is also in B
  // - For counted items, A's count <= B's count
  for (const [baseName, countA] of reqsA) {
    const countB = reqsB.get(baseName);
    if (countB === undefined || countA > countB) {
      return false;
    }
  }
  return true;
}

/**
 * Return the requirement set for an item as a map from base name to count.
 *
 * For simple RequirementItems, returns a single-entry map.
 * For CompoundItems (which use .items), collects requirements from all sub-items.
 * @param {RequirementItem|CompoundItem} item - The item to get requirements for.
 * @returns {Map} Map from item base name to required count.
 */
function getRequirementSet(item) {
  const reqs = new Map();

  if (item.isCompound) {
    if (item.nestedOr && item.nestedOr.length > 0) {
      // Use the full name as an opaque key so that a simple item covering only the base requirement cannot absorb this
      // compound, since the compound's nestedOr part adds an additional constraint that the simple item lacks.
      const { baseName, count } = parseCountedItem(item.name);
      reqs.set(baseName, count);
    } else {
      // Plain AND compound: compare using the actual sub-item requirements so that
      for (const subItem of item.items) {
        const { baseName, count } = parseCountedItem(subItem.name);
        const existing = reqs.get(baseName) || 0;
        reqs.set(baseName, Math.max(existing, count));
      }
    }
  } else {
    const { baseName, count } = parseCountedItem(item.name);
    reqs.set(baseName, count);
  }

  return reqs;
}

/**
 * ABSORPTION LAW (OR): A + (A · B) = A
 *
 * Within an OR clause, if we have both a simple item A and a compound (A · B), the compound is redundant because
 * satisfying A alone is sufficient.
 * @param {Array} items - Array of items in an OR clause.
 * @returns {Array} Simplified array with redundant items removed.
 */
function simplifyOrBySubset(items) {
  if (items.length <= 1) {
    return items;
  }

  // Get requirement sets for all items
  const itemReqs = items.map(item => {
    const reqs = getRequirementSet(item);
    return {
      item,
      reqs,
      size: reqs.size,
      isCompound: item.isCompound
    };
  });

  // Sort by size for efficient comparison
  itemReqs.sort((a, b) => a.size - b.size);

  // Mark items to keep (those that aren't supersets of another item)
  const keep = new Array(items.length).fill(true);

  for (let i = 0; i < itemReqs.length; i++) {
    if (!keep[i]) { continue; }

    for (let j = i + 1; j < itemReqs.length; j++) {
      if (!keep[j]) { continue; }

      // Check if itemReqs[i] is a subset of itemReqs[j]
      // If so, itemReqs[j] is redundant
      if (isSubset(itemReqs[i].reqs, itemReqs[j].reqs)) {
        keep[j] = false;
      }
    }
  }

  return itemReqs.filter((_, i) => keep[i]).map(ir => ir.item);
}

/**
 * Return the human-readable display name for a logic item name.
 * @param {string} itemName - The canonical logic item name.
 * @returns {string} The display name for tooltips.
 */
const getDisplayName = memoize(function (itemName) {
  if (itemName in DISPLAY_NAMES) {
    return DISPLAY_NAMES[itemName];
  }
  const name = itemName.replace(/_/g, " ");

  // Reorder "Small Key <Dungeon>" to "<Dungeon> Small Key" and "Boss Key <Dungeon>" to "<Dungeon> Boss Key"
  const keyMatch = name.match(/^(Small Key|Boss Key) (.+)$/);
  if (keyMatch) {
    return `${keyMatch[2]} ${keyMatch[1]}`;
  }
  return name;
});

export {
  Clause, combineWithOr, CompoundItem, Expression, getDisplayName, impossibleExpr, orCombineExpressions, parseCountedItem, RequirementItem, simplifyOrBySubset
};
