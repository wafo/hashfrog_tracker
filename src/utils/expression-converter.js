import GAME_REWARDS from "../data/game-rewards.json";
import shopRules from "../data/shop-rules.json";
import {
  combineDNFPaths,
  dnfPathSetsEqual, dnfPathsToExpression,
  expressionToDNFPaths,
  pruneDominatedDNFPaths,
} from "./dnf-paths";
import {
  Clause,
  CompoundItem,
  Expression,
  RequirementItem,
  combineWithOr,
  getDisplayName,
  impossibleExpr, orCombineExpressions,
  simplifyOrBySubset,
} from "./expression-data";
import Locations from "./locations";
import LogicHelper from "./logic-helper";
import { parseRule } from "./rule-parser";
import SettingsHelper from "./settings-helper";


// Category-based counts for has_medallions, has_stones, etc.
const CATEGORY_ITEMS = {
  "Medallions": GAME_REWARDS.medallions,
  "Stones": GAME_REWARDS.stones,
  "Dungeon Rewards": GAME_REWARDS.dungeonRewards,
};

// Items that can only be used by adult Link.
// Note: "Longshot" is a rule alias that expands before reaching item name structures, so it is never present here.
const ADULT_ONLY_ITEMS = new Set([
  "Megaton_Hammer", "Progressive_Hookshot", "Iron_Boots", "Hover_Boots", "Mirror_Shield",
  "Bow", "Fire_Arrows", "Ice_Arrows", "Light_Arrows", "Master_Sword", "Biggoron_Sword", "Goron_Tunic", "Zora_Tunic",
]);

// Items that can only be used by child Link.
const CHILD_ONLY_ITEMS = new Set([
  "Slingshot", "Boomerang", "Kokiri_Sword", "Deku_Shield", "Magic_Bean",
]);

// Regions that are always reachable without any items.
const ENTRY_POINT_REGIONS = new Set(["Root", "Root Exits", "Child Spawn", "Adult Spawn"]);

// Farore's Wind Warp is a dynamic save warp.
// Unlike song warps (which have fixed destinations), this creates spurious paths in our BFS. Exclude it entirely.
const EXCLUDED_FROM_PATHFINDING = new Set(["Farores Wind Warp"]);

// Map of event/location names to the flags they produce.
// Used for cycle detection when expanding events.
const EVENT_TO_FLAG = {
  "Deliver Rutos Letter": ["Deliver_Letter", "Deliver Letter"],
  "Pierre": ["Scarecrow_Song", "Scarecrow Song"],
  "Master Sword Pedestal": ["Time_Travel", "Time Travel"],
};

// Reverse mapping: flag name -> source event/location name.
// Used to expand event flags (like "Deliver Letter") into their producing location's requirements.
const FLAG_TO_EVENT = {};
for (const [eventName, flags] of Object.entries(EVENT_TO_FLAG)) {
  for (const flag of flags) {
    FLAG_TO_EVENT[flag] = eventName;
  }
}

// Ordered lookup for key/rupee shuffle settings.
// Specific prefixes must precede generic ones so first-match-wins is correct.
const KEY_SHUFFLE_RULES = [
  { prefix: "Small_Key_Treasure_Chest_Game", setting: "shuffle_tcgkeys", vanillaLabel: "Small Key (Treasure Chest Game)" },
  { prefix: "Small_Key_Thieves_Hideout", setting: "shuffle_hideoutkeys", vanillaLabel: "Small Key (Thieves Hideout)" },
  { prefix: "Small_Key_", setting: "shuffle_smallkeys", vanillaLabel: null },
  { prefix: "Boss_Key_Ganons_Castle", setting: "shuffle_ganon_bosskey", vanillaLabel: "Boss Key (Ganons Castle)", exact: true },
  { prefix: "Boss_Key_", setting: "shuffle_bosskeys", vanillaLabel: null },
  { prefix: "Silver_Rupee_", setting: "shuffle_silver_rupees", vanillaLabel: null },
];

// Drops that require effort to obtain and should not be auto-satisfied during tooltip evaluation.
// All other drops are treated as free.
const NON_FREE_DROPS = new Set(["Blue Fire"]);

// Logic identifiers for individual ocarina buttons.
const OCARINA_NOTE_IDENTIFIERS = new Set([
  "Ocarina_A_Button", "Ocarina_C_up_Button", "Ocarina_C_down_Button", "Ocarina_C_left_Button", "Ocarina_C_right_Button",
]);

// Identifier prefixes that always refer to settings flags, not collectible items.
// Used to short-circuit evaluation for these identifiers without checking the item list.
const SETTINGS_PREFIXES = new Set(["logic_", "at_", "adv_", "glitch_"]);

// Logic identifiers that are always auto-satisfied or otherwise irrelevant to tooltip display.
const SKIP_IDENTIFIERS = new Set([
  "True", "is_starting_age", "had_night_start", "Scarecrow_Song", "Bonooru", "Time_Travel",
]);

// Item name prefixes to silently skip.
const SKIP_PREFIXES = new Set(["Bombchu_", "Bombchus_", "Buy_"]);

// Shop items that require an empty bottle to purchase.
const SHOP_BOTTLE_REQUIRED = new Set(shopRules.bottleRequired || []);

// Shop items that require one or two wallet upgrades to afford.
const SHOP_WALLET_REQUIREMENTS = new Map();
for (const item of shopRules.walletRequired || []) {
  SHOP_WALLET_REQUIREMENTS.set(item, { id: "Progressive_Wallet", label: "Wallet", count: 1 });
}
for (const item of shopRules.wallet2Required || []) {
  SHOP_WALLET_REQUIREMENTS.set(item, { id: "Progressive_Wallet,2", label: "Wallet x2", count: 2 });
}

// Logic rules sometimes reference items as string literals rather than identifiers.
// Maps the string form back to the canonical logic item name.
const STRING_LITERAL_ITEMS = {
  "Goron Tunic": "Goron_Tunic",
  "Zora Tunic": "Zora_Tunic",
};


// Age context for the current extraction pass.
// null = any age, "adult" = adult only, "child" = child only
let currentAgeContext = null;

// Settings cache for the current evaluation.
let cachedSettings = null;

// Expansion cache for the current evaluation.
let evaluationCache = null;

// Requirement structures keyed by location name. Invalidated when settings change.
const structureCache = new Map();
let lastSettingsJson = null;

// Region accessibility caches, one per age context. Each maps regionName -> Expression.
// Built once per settings change via BFS, then reused for all location evaluations.
let regionCacheChild = null;
let regionCacheAdult = null;

// Flag active during region cache building.
// Keeps drops auto-satisfied so aliases don't propagate spurious requirements.
let regionCacheBuildingMode = false;

// In-progress region cache exposed during BFS.
// Makes partially-built regions visible to expandEvent, expandDrop, and at() within the same BFS pass.
let activeRegionCacheOverride = null;

// Child region access expression for bean planting locations that carry an explicit age requirement.
let beanPlantingChildRegionExpr = null;

// Previous BFS iteration's region cache, used by at() during cache building. Prevents cyclic feedback.
let bfsAtLookupCache = null;


/**
 * Factor common items from compound options within an OR clause.
 * 
 * Unlike factorCommonFromOrOptions, this only factors from compound items, leaving simple items untouched.
 * @param {Array} items - Array of items in an OR clause.
 * @returns {Array} Simplified array with compounds factored.
 */
function factorCompoundsWithSharedItems(items) {
  if (items.length <= 1) {
    return items;
  }

  // Separate simple items from compound items
  const simpleItems = items.filter(item => !item.isCompound);
  const compoundItems = items.filter(item => item.isCompound && item.items && item.items.length > 0);

  // Need at least 2 compounds to factor
  if (compoundItems.length < 2) {
    return items;
  }

  // Find items that appear in ALL compound items
  const firstCompoundNames = new Set(compoundItems[0].items.map(i => i.name));
  const commonNames = [...firstCompoundNames].filter(name =>
    compoundItems.every(compound =>
      compound.items.some(i => i.name === name)
    )
  );

  // Need at least one common item to factor
  if (commonNames.length === 0) {
    return items;
  }

  // Get the common item objects from the first compound
  const commonItems = compoundItems[0].items.filter(i => commonNames.includes(i.name));

  // Build the remaining OR options
  const nestedOrItems = compoundItems.map(compound => {
    const remainingItems = compound.items.filter(i => !commonNames.includes(i.name));
    if (remainingItems.length === 0) {
      // Entire compound was common items
      return null;
    }
    if (remainingItems.length === 1) {
      // Single item
      return remainingItems[0];
    }

    return new CompoundItem(remainingItems);
  }).filter(item => item !== null);

  // Deduplicate nested OR items by name
  const seenNames = new Set();
  const dedupedNestedOr = nestedOrItems.filter(item => {
    if (seenNames.has(item.name)) { return false; }
    seenNames.add(item.name);
    return true;
  });

  // If there's only one unique nested option after factoring, just combine with common items
  if (dedupedNestedOr.length <= 1) {
    if (dedupedNestedOr.length === 1) {
      // Create a single compound from common + remaining
      const allItems = [...commonItems];
      if (dedupedNestedOr[0].isCompound) {
        allItems.push(...dedupedNestedOr[0].items);
      } else {
        allItems.push(dedupedNestedOr[0]);
      }
      return [...simpleItems, new CompoundItem(allItems)];
    }

    // Create compound from remaining common items
    return [...simpleItems, new CompoundItem(commonItems)];
  }

  // Create a compound with nested OR structure
  const nestedCompound = new CompoundItem(commonItems);
  nestedCompound.nestedOr = dedupedNestedOr;

  // Update display name to show nested structure
  const nestedOrDisplay = dedupedNestedOr.map(item =>
    item.isCompound ? `(${item.displayName})` : item.displayName
  ).join(" or ");
  nestedCompound.displayName = `${nestedCompound.displayName} and (${nestedOrDisplay})`;

  // Update name for deduplication
  const nestedOrName = dedupedNestedOr.map(item => item.name).sort().join("|");
  nestedCompound.name = `${nestedCompound.name}+(${nestedOrName})`;

  // Update owned status
  nestedCompound.owned = commonItems.every(i => i.owned) &&
    dedupedNestedOr.some(item => item.owned);

  return [...simpleItems, nestedCompound];
}

/**
 * Remove redundant top-level age clauses that are already implied by item age restrictions.
 *
 * When a clause contains an item that only works for one age, a separate is_adult clause is redundant and can be
 * removed.
 * @param {Array} clauses - Output-format clause objects with items arrays.
 * @returns {Array} Simplified clause array with implied age clauses removed.
 */
function simplifyTopLevelAge(clauses) {
  // Collect implied ages from all clauses in the original array
  const impliedAges = new Set();

  clauses.forEach((clause) => {
    if (clause.items.length === 1) {
      const item = clause.items[0];
      if (item.name !== "is_adult" && item.name !== "is_child") {
        const implied = getItemImpliedAge(item.name);
        if (implied) {
          impliedAges.add(implied);
        }
      }
    }

    // Also check compounds and multi-item clauses for age implications
    clause.items.forEach(item => {
      if (item.isCompound && item.subItems) {
        item.subItems.forEach(subItem => {
          const implied = getItemImpliedAge(subItem.name);
          if (implied) {
            impliedAges.add(implied);
          }
        });
      } else if (item.name !== "is_adult" && item.name !== "is_child") {
        const implied = getItemImpliedAge(item.name);
        if (implied) {
          impliedAges.add(implied);
        }
      }
    });
  });

  // First, simplify compounds based on implied ages from other clauses
  const simplifiedClauses = clauses.map(clause => ({
    items: clause.items.map(item => {
      if (item.isCompound && item.subItems) {
        // Filter age from compound if implied by other clauses
        const filteredSubItems = item.subItems.filter(subItem => {
          if (subItem.name === "is_adult" && impliedAges.has("adult")) {
            return false;
          }
          if (subItem.name === "is_child" && impliedAges.has("child")) {
            return false;
          }
          return true;
        });

        if (filteredSubItems.length === 0) {
          // Compound fully satisfied
          return null;
        }
        if (filteredSubItems.length === 1 && !item.nestedOr) {
          // Single item, no compound needed
          return filteredSubItems[0];
        }

        // Rebuild compound with filtered items
        const rebuilt = {
          ...item,
          subItems: filteredSubItems,
          displayName: filteredSubItems.map(i => i.displayName).join(" and "),
          name: filteredSubItems.map(i => i.name).sort().join("+"),
          owned: filteredSubItems.every(si => si.owned),
        };
        if (item.nestedOr) {
          rebuilt.nestedOr = item.nestedOr;
          const nestedOrDisplay = item.nestedOr.map(n =>
            n.isCompound ? `(${n.displayName})` : n.displayName
          ).join(" or ");
          rebuilt.displayName = `${rebuilt.displayName} and (${nestedOrDisplay})`;
          rebuilt.name = `${rebuilt.name}+(${item.nestedOr.map(n => n.name).sort().join("|")})`;
          rebuilt.owned = rebuilt.owned && item.nestedOr.some(n => n.owned);
        }

        return rebuilt;
      }

      return item;
    }).filter(item => item !== null)
  })).filter(clause => clause.items.length > 0);

  // Then, re-locate age-only clauses in simplifiedClauses (indices may have shifted due to filtering above)
  // and remove those whose age is implied by other items.
  const indicesToRemove = new Set();
  simplifiedClauses.forEach((clause, index) => {
    if (clause.items.length === 1) {
      const ageItem = clause.items[0];
      if (ageItem.name === "is_adult" || ageItem.name === "is_child") {
        const age = ageItem.name === "is_adult" ? "adult" : "child";
        if (impliedAges.has(age)) {
          indicesToRemove.add(index);
        }
      }
    }
  });

  if (indicesToRemove.size > 0) {
    return simplifiedClauses.filter((_, index) => !indicesToRemove.has(index));
  }

  return simplifiedClauses;
}

/**
 * Check if a key/rupee item is removed via its shuffle setting.
 * @param {string} itemName - The logic item name to check.
 * @returns {boolean} True if the item is removed by the current shuffle setting.
 */
function isKeysyRemoved(itemName) {
  const settings = getSettings();
  for (const rule of KEY_SHUFFLE_RULES) {
    if (rule.exact ? itemName === rule.prefix : itemName.startsWith(rule.prefix)) {
      return settings[rule.setting] === "remove";
    }
  }
  return false;
}

/**
 * Return vanilla placement info for an item name given current settings.
 * @param {string} itemName - The logic item name to check.
 * @param {object} settings - The current parsed settings object.
 * @returns {{ isVanilla: boolean, vanillaItemName: string|null }} Placement details.
 */
function getVanillaPlacementInfo(itemName, settings) {
  if (!itemName || !settings) { return { isVanilla: false, vanillaItemName: null }; }

  for (const rule of KEY_SHUFFLE_RULES) {
    if (rule.exact ? itemName === rule.prefix : itemName.startsWith(rule.prefix)) {
      const vanillaItemName = rule.vanillaLabel || deriveVanillaItemName(itemName, rule.prefix);
      return { isVanilla: settings[rule.setting] === "vanilla", vanillaItemName };
    }
  }
  return { isVanilla: false, vanillaItemName: null };
}

/**
 * Derive a vanilla item name like "Small Key (Forest Temple)" from "Small_Key_Forest_Temple".
 * @param {string} itemName - The logic item name to convert.
 * @param {string} prefix - The matched prefix from KEY_SHUFFLE_RULES.
 * @returns {string} The human-readable vanilla item name.
 */
function deriveVanillaItemName(itemName, prefix) {
  const category = prefix.replace(/_$/, "").replace(/_/g, " ");
  const specific = itemName.slice(prefix.length).replace(/_/g, " ");
  return `${category} (${specific})`;
}

/**
 * Detect whether an AST rule node carries an explicit age requirement.
 * @param {object} node - The parsed AST node to inspect.
 * @returns {string|null} "adult", "child", or null if no age constraint is detected.
 */
function detectAgeRequirement(node) {
  if (!node) { return null; }

  switch (node.type) {
    case "ExpressionStatement":
      return detectAgeRequirement(node.expression);

    case "Identifier":
      if (node.name === "is_adult") { return "adult"; }
      if (node.name === "is_child") { return "child"; }
      return null;

    case "LogicalExpression":
      if (node.operator === "&&") {
        // AND: if either side requires an age, that's the requirement
        const leftAge = detectAgeRequirement(node.left);
        if (leftAge) { return leftAge; }
        return detectAgeRequirement(node.right);
      }

      // OR: only if both sides require the same age
      // (mixed age OR means either age works, so no restriction)
      return null;

    default:
      return null;
  }
}

/**
 * Detect if a rule contains here(can_plant_bean).
 * 
 * This is important because bean planting requires child access, even if the overall location is adult-only.
 * @param {object} node - The AST node to inspect.
 * @returns {boolean} True if the node contains a here(can_plant_bean) call.
 */
function containsBeanPlanting(node) {
  if (!node) { return false; }

  switch (node.type) {
    case "ExpressionStatement":
      return containsBeanPlanting(node.expression);

    case "CallExpression":
      if (node.callee.name === "here" && node.arguments.length > 0) {
        const arg = node.arguments[0];
        // Check if argument is can_plant_bean identifier
        if (arg.type === "Identifier" && arg.name === "can_plant_bean") {
          return true;
        }

        // Recursively check the argument
        return containsBeanPlanting(arg);
      }
      // Check arguments of other calls
      return node.arguments?.some(arg => containsBeanPlanting(arg)) || false;

    case "LogicalExpression":
      return containsBeanPlanting(node.left) || containsBeanPlanting(node.right);

    case "UnaryExpression":
      return containsBeanPlanting(node.argument);

    default:
      return false;
  }
}

/**
 * Return the age implied by an item that is exclusively usable by one age.
 * @param {string} itemName - The logic item name to check.
 * @returns {string|null} "adult", "child", or null if the item has no age restriction.
 */
function getItemImpliedAge(itemName) {
  const baseName = itemName.split(",")[0];
  if (ADULT_ONLY_ITEMS.has(baseName)) {
    return "adult";
  }
  if (CHILD_ONLY_ITEMS.has(baseName)) {
    return "child";
  }
  return null;
}

/**
 * Return the current settings, preferring the evaluation-scoped cache over a fresh lookup.
 * @returns {object} The current parsed settings object.
 */
function getSettings() {
  return cachedSettings || LogicHelper.settings;
}

/**
 * Return true if the player owns the specified item or meets the required count.
 * @param {string} itemName - The logic item name, optionally with a count suffix.
 * @param {object} items - The current tracked items object mapping name to count.
 * @returns {boolean} True if the ownership requirement is met.
 */
function isItemOwned(itemName, items) {
  if (itemName.includes(",")) {
    const match = itemName.match(/^(.+),\s*(\d+)$/);
    if (match) {
      const name = match[1].trim();
      const count = parseInt(match[2], 10);

      // Category-based counts (from has_medallions, has_stones, etc.)
      if (name in CATEGORY_ITEMS) {
        const ownedCount = CATEGORY_ITEMS[name].filter(item => (items[item] || 0) > 0).length;
        return ownedCount >= count;
      }
      if (name === "Hearts") {
        const pieces = items.Piece_of_Heart || 0;
        const containers = items.Heart_Container || 0;
        const totalHearts = Math.floor(pieces / 4) + containers + 3;
        return totalHearts >= count;
      }

      return (items[name] || 0) >= count;
    }
  }

  // Check if player has the item in their inventory
  if ((items[itemName] || 0) > 0) {
    return true;
  }

  // Check if it's a starting item from settings (inventory or equipment)
  const startingItems = LogicHelper.getStartingItems();
  if ((startingItems[itemName] || 0) > 0) {
    return true;
  }

  return false;
}

/**
 * Return true if the identifier refers to a settings flag rather than a collectible item.
 * @param {string} name - The identifier name from the logic AST.
 * @returns {boolean} True if the name is a settings or renamed-attributes key.
 */
function isSettingsIdentifier(name) {
  const settings = getSettings();
  const renamedAttributes = LogicHelper.renamedAttributes;

  if (name in settings || name in renamedAttributes) {
    return true;
  }

  for (const prefix of SETTINGS_PREFIXES) {
    if (name.startsWith(prefix)) {
      return true;
    }
  }

  // Identifier should be displayed, not evaluated
  return false;
}

/**
 * Shared expansion logic for events and drops.
 * 
 * Each source's rule is extracted, AND-merged with its region access requirements, and the resulting expressions are
 * OR-combined.
 * @param {string} type - Cache key prefix ("event" or "drop").
 * @param {string} name - The event or drop name.
 * @param {Array} sources - Array of { rule, parentRegion } objects.
 * @param {object} items - Current tracked items.
 * @param {Set} visited - Visited set for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @param {boolean} skipUnreachableRegions - If true, skip sources in regions not found in the region cache.
 *  Events use true (unreachable = skip); drops use false.
 * @returns {Expression} The OR combination of all source expressions.
 */
function expandSources(type, name, sources, items, visited, depth, skipUnreachableRegions) {
  const cacheKey = `${type}:${name}`;
  if (visited.has(cacheKey)) { return impossibleExpr(); }
  if (evaluationCache?.has(cacheKey)) { return evaluationCache.get(cacheKey).clone(); }
  if (!sources || sources.length === 0) { return impossibleExpr(); }

  visited.add(cacheKey);
  const sourceExprs = [];

  for (const source of sources) {
    const { rule, parentRegion } = source;
    if (!rule) { continue; }

    const ruleExpr = extractFromNode(rule, items, visited, depth + 1);
    if (ruleExpr.isImpossible()) { continue; }

    // AND-merge region access requirements (only when a region cache is active)
    const activeCache = getActiveRegionCache();
    if (activeCache) {
      if (activeCache.has(parentRegion)) {
        const regionExpr = activeCache.get(parentRegion).clone();
        if (!regionExpr.isEmpty() && !regionExpr.isSatisfied()) {
          ruleExpr.merge(regionExpr);
          ruleExpr.simplify();
          if (ruleExpr.isImpossible()) { continue; }
        }
      } else if (skipUnreachableRegions && !ENTRY_POINT_REGIONS.has(parentRegion)) {
        continue;
      }
    }

    sourceExprs.push(ruleExpr);
  }

  visited.delete(cacheKey);

  const result = combineWithOr(sourceExprs);
  if (evaluationCache) { evaluationCache.set(cacheKey, result); }
  return result.clone();
}

/**
 * Expand an event into its requisite item requirements.
 * Events can have multiple sources (different regions/rules that trigger them).  Multiple sources are combined with OR.
 *
 * Dungeon clear and boss defeat events are treated as impossible to force simpler OR branches, since computing full
 * dungeon paths exceeds BFS capabilities. Exception: Trial Clear events are needed for Ganon's Tower access.
 * @param {string} eventName - The event name to expand.
 * @param {object} items - Current tracked items.
 * @param {Set} visited - Visited set for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @returns {Expression} The item requirements to trigger this event.
 */
function expandEvent(eventName, items, visited, depth) {
  const isTrialClear = eventName.endsWith(" Trial Clear");
  if ((eventName.endsWith(" Clear") && !isTrialClear) || eventName.startsWith("Defeat ")) {
    return impossibleExpr();
  }
  return expandSources("event", eventName, Locations.getEvent(eventName), items, visited, depth, true);
}

/**
 * Expand a drop item into its access requirements.
 * 
 * Unlike events, drops in dungeon-interior regions (not in the region cache) are still included, as their rule
 * requirements are meaningful for tooltips.
 * @param {string} dropName - The drop name to expand.
 * @param {object} items - Current tracked items.
 * @param {Set} visited - Visited set for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @returns {Expression} The access requirements for this drop.
 */
function expandDrop(dropName, items, visited, depth) {
  return expandSources("drop", dropName, Locations.getDropLocations(dropName), items, visited, depth, false);
}

/**
 * Expand a persistent event/location while skipping age requirements.
 * Includes both the rule requirements AND region access requirements.
 * Used for persistent events where age is about WHEN to trigger (player can time travel).
 *
 * Checks both events and locations since some "events" like "Deliver Rutos Letter"
 * are stored as locations in the logic files.
 * @param {string} eventName - The event/location name (e.g., "Deliver Rutos Letter").
 * @param {object} items - Current tracked items.
 * @param {Set} visited - Visited set for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @returns {Expression} Combined event + region access requirements.
 */
function expandEventSkippingAge(eventName, items, visited, depth) {
  const visitKey = `persistent_event:${eventName}`;
  if (visited.has(visitKey)) {
    return impossibleExpr();
  }

  // Also check if the flag this event produces is already being evaluated
  const producedFlags = EVENT_TO_FLAG[eventName] || [];
  for (const flag of producedFlags) {
    if (visited.has(flag) || visited.has(`persistent_event:${flag}`)) {
      return impossibleExpr();
    }
  }

  // Try events first
  let eventData = Locations.getEvent(eventName);

  // If not found as event, try as a location
  if (!eventData || eventData.length === 0) {
    const locationData = Locations.getLocation(eventName);
    if (locationData && locationData.rule) {
      eventData = [{
        rule: locationData.rule,
        parentRegion: locationData.parentRegion,
      }];
    }
  }

  if (!eventData || eventData.length === 0) {
    return impossibleExpr();
  }

  visited.add(visitKey);

  // Also mark the produced flags as visited to prevent circular references
  for (const flag of producedFlags) {
    visited.add(flag);
  }

  const sourceExprs = [];

  for (const source of eventData) {
    const { rule, parentRegion } = source;
    if (!rule) { continue; }

    // Evaluate per-age: persistent events can only be triggered by one age, and the region access requirements must
    // match that age. Evaluating per-age correctly filters.
    const ages = [["child", regionCacheChild], ["adult", regionCacheAdult]];

    for (const [age, cache] of ages) {
      const savedAge = currentAgeContext;
      const savedEvalCache = evaluationCache;
      currentAgeContext = age;
      evaluationCache = new Map();

      const ruleExpr = extractFromNode(rule, items, visited, depth + 1);
      currentAgeContext = savedAge;
      evaluationCache = savedEvalCache;

      if (ruleExpr.isImpossible()) { continue; }

      // Look up region requirements from this age's cache
      let regionExpr;
      if (cache?.has(parentRegion)) {
        regionExpr = cache.get(parentRegion).clone();
      } else if (ENTRY_POINT_REGIONS.has(parentRegion)) {
        regionExpr = new Expression();
      } else if (!cache) {
        // This age's cache is being built or not yet built, so treat region as reachable
        regionExpr = new Expression();
      } else {
        // Region unreachable at this age
        continue;
      }

      const combined = ruleExpr.clone();
      if (!regionExpr.isEmpty() && !regionExpr.isImpossible()) {
        combined.merge(regionExpr);
      }

      if (!combined.isImpossible()) {
        sourceExprs.push(combined);
      }
    }
  }

  visited.delete(visitKey);

  // Clean up the produced flags from visited
  for (const flag of producedFlags) {
    visited.delete(flag);
  }

  if (sourceExprs.length === 0) {
    return impossibleExpr();
  }

  // Combine all sources with OR
  let result = sourceExprs[0];
  for (let i = 1; i < sourceExprs.length; i++) {
    result = orCombineExpressions(result, sourceExprs[i]);
  }
  return result;
}

/**
 * Expand has_bottle into actual bottle item requirements.
 * @param {object} items - Current tracked items.
 * @param {Set} visited - Visited set for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @returns {Expression} The expanded bottle options as an OR clause.
 */
function expandHasBottle(items, visited = new Set(), depth = 0) {
  const settings = getSettings();
  const bottleOwned = isItemOwned("Bottle", items);
  let result = new Expression([
    new Clause([new RequirementItem("Bottle", "Bottle", bottleOwned)]),
  ]);

  // Bottle with Big Poe can be emptied by selling to the Poe Collector
  const bigPoeOwned = isItemOwned("Bottle_with_Big_Poe", items);
  result = orCombineExpressions(
    result,
    new Expression([new Clause([new RequirementItem("Bottle_with_Big_Poe", "Bottle with Big Poe", bigPoeOwned)])]),
  );

  // Deliver Ruto's Letter produces a usable bottle
  if (settings?.zora_fountain !== "open") {
    const deliverExpr = expandEventSkippingAge("Deliver Rutos Letter", items, visited, depth + 1);
    if (!deliverExpr.isImpossible() && !deliverExpr.isEmpty()) {
      result = orCombineExpressions(result, deliverExpr);
    }
  }
  return result;
}

/**
 * Recursively extract item requirements from an AST node.
 *
 * Dispatches to the appropriate handler based on node type.
 * @param {object} node - The parsed AST node to extract from.
 * @param {object} items - The current tracked items object.
 * @param {Set} visited - Visited identifiers/events for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @param {boolean} skipAgeFiltering - When true, treat age requirements as satisfied.
 * @returns {Expression} The extracted requirements.
 */
function extractFromNode(node, items, visited = new Set(), depth = 0, skipAgeFiltering = false) {
  // Maximum recursion depth to prevent infinite loops
  // But, needs to be high enough for deeply nested type-checks
  if (!node || depth > 25) {
    return new Expression();
  }

  switch (node.type) {
    case "ExpressionStatement":
      return extractFromNode(node.expression, items, visited, depth, skipAgeFiltering);

    case "Literal":
      return handleLiteral(node.value, items, visited, depth);

    case "Identifier":
      return handleIdentifier(node.name, items, visited, depth, skipAgeFiltering);

    case "LogicalExpression":
      return handleLogicalExpression(node, items, visited, depth, skipAgeFiltering);

    case "BinaryExpression":
      return handleBinaryExpression(node);

    case "CallExpression":
      return handleCallExpression(node, items, visited, depth, skipAgeFiltering);

    case "SequenceExpression":
      return handleSequenceExpression(node, items, visited, depth, skipAgeFiltering);

    case "UnaryExpression":
      return handleUnaryExpression(node);

    case "MemberExpression":
      return handleMemberExpression(node);

    default:
      return new Expression();
  }
}

/**
 * Handle a binary expression AST node.
 * @param {object} node - The BinaryExpression AST node.
 * @returns {Expression} Satisfied Expression if condition is true, impossible otherwise.
 */
function handleBinaryExpression(node) {
  const isEquality = node.operator === "==" || node.operator === "===";
  const isInequality = node.operator === "!=" || node.operator === "!==";

  if (isEquality || isInequality) {
    const leftName = node.left.type === "Identifier" ? node.left.name : null;
    const rightName = node.right.type === "Identifier" ? node.right.name : null;
    const leftLiteral = node.left.type === "Literal" ? node.left.value : null;
    const rightLiteral = node.right.type === "Literal" ? node.right.value : null;

    // Identifier == Identifier (same name comparison)
    if (leftName && rightName) {
      const same = leftName === rightName;
      const matches = isEquality ? same : !same;
      if (matches) {
        return new Expression();
      } else {
        return impossibleExpr();
      }
    }

    // Identifier == Literal (setting comparison)
    if (leftName && rightLiteral !== null) {
      const settings = getSettings();
      const settingValue = settings?.[leftName];
      if (settingValue !== undefined) {
        const matches = isEquality ? settingValue === rightLiteral : settingValue !== rightLiteral;
        if (matches) {
          return new Expression();
        } else {
          return impossibleExpr();
        }
      }
    }

    // Literal == Identifier (reverse setting comparison)
    if (leftLiteral !== null && rightName) {
      const settings = getSettings();
      const settingValue = settings?.[rightName];
      if (settingValue !== undefined) {
        const matches = isEquality ? leftLiteral === settingValue : leftLiteral !== settingValue;
        if (matches) {
          return new Expression();
        } else {
          return impossibleExpr();
        }
      }
    }
  }

  // For other binary expressions or unrecognized patterns, return impossible
  return impossibleExpr();
}

/**
 * Handle a call expression AST node.
 * @param {object} node - The CallExpression AST node.
 * @param {object} items - The current tracked items object.
 * @param {Set} visited - Visited identifiers/events for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @param {boolean} skipAgeFiltering - When true, treat age requirements as satisfied.
 * @returns {Expression} The extracted requirements for this call.
 */
function handleCallExpression(node, items, visited, depth, skipAgeFiltering = false) {
  const funcName = node.callee.name;

  if (funcName === "here") {
    if (node.arguments.length > 0) {
      // Bean planting via here(can_plant_bean) is a persistent world change.
      // Skip age filtering so the bean requirement appears in any age context.
      const arg = node.arguments[0];
      const isBeanPlanting = arg.type === "Identifier" && arg.name === "can_plant_bean";
      const beanExpr = extractFromNode(arg, items, visited, depth + 1, isBeanPlanting || skipAgeFiltering);

      // In age-specific context, child must reach this region to plant the bean.
      // Merge child region access into just the bean sub-expression so non-bean OR branches keep the age-specific
      // region access.
      if (isBeanPlanting && beanPlantingChildRegionExpr) {
        beanExpr.merge(beanPlantingChildRegionExpr.clone());
        beanExpr.simplify();
      }

      return beanExpr;
    }
    return new Expression();
  }

  if (funcName === "at") {
    if (node.arguments.length >= 2) {
      const ruleExpr = extractFromNode(node.arguments[1], items, visited, depth + 1, skipAgeFiltering);

      // AND-merge region access requirements
      // During BFS, use the previous iteration's snapshot to prevent cyclic feedback
      const regionName = node.arguments[0]?.value;
      const lookupCache = bfsAtLookupCache || getActiveRegionCache();
      if (regionName && lookupCache) {
        if (lookupCache.has(regionName)) {
          const regionExpr = lookupCache.get(regionName).clone();
          if (!regionExpr.isEmpty() && !regionExpr.isSatisfied()) {
            ruleExpr.merge(regionExpr);
            ruleExpr.simplify();
          }
        } else if (!ENTRY_POINT_REGIONS.has(regionName)) {
          return impossibleExpr();
        }
      }
      return ruleExpr;
    }

    return new Expression();
  }

  // Handle built-in reward/heart counting functions
  const rewardFuncs = {
    has_medallions: GAME_REWARDS.medallions,
    has_stones: GAME_REWARDS.stones,
    has_dungeon_rewards: GAME_REWARDS.dungeonRewards,
  };
  if (funcName in rewardFuncs || funcName === "has_hearts") {
    const countArg = node.arguments[0];
    const settings = getSettings();
    const requiredCount = countArg.type === "Identifier" ? (settings[countArg.name] || 0) : countArg.value;

    if (requiredCount <= 0) { return new Expression(); }

    if (funcName === "has_hearts") {
      const displayName = `Hearts x${requiredCount}`;
      return new Expression([new Clause([new RequirementItem(`Hearts,${requiredCount}`, displayName, false)])]);
    }

    const itemList = rewardFuncs[funcName];
    if (requiredCount >= itemList.length) {
      // All items required
      const clauses = itemList.map(item => {
        const owned = (items[item] || 0) > 0;
        return new Clause([new RequirementItem(item, getDisplayName(item), owned)]);
      });
      return new Expression(clauses);
    }

    // Partial count
    const categoryName = funcName === "has_medallions" ? "Medallions"
      : funcName === "has_stones" ? "Stones"
        : "Dungeon Rewards";
    const displayName = `${categoryName} x${requiredCount}`;
    const ownedCount = itemList.filter(item => (items[item] || 0) > 0).length;
    const owned = ownedCount >= requiredCount;

    return new Expression([new Clause([new RequirementItem(`${categoryName},${requiredCount}`, displayName, owned)])]);
  }

  const paramAliases = LogicHelper.parameterizedAliases;
  if (funcName in paramAliases) {
    const { patterns, template } = paramAliases[funcName];

    const argValues = node.arguments.map(arg => {
      if (arg.type === "Identifier") {
        return arg.name;
      }
      if (arg.type === "Literal") {
        return String(arg.value);
      }
      return "";
    });

    // Substitute parameters
    let substituted = template;
    patterns.forEach((pattern, i) => {
      substituted = substituted.replace(pattern, argValues[i]);
    });

    // Parse and extract from substituted rule
    const visitKey = `${funcName}(${argValues.join(",")})`;
    if (!visited.has(visitKey)) {
      visited.add(visitKey);
      const parsedRule = parseRule(substituted);
      const expanded = extractFromNode(parsedRule, items, visited, depth + 1, skipAgeFiltering);
      visited.delete(visitKey);
      return expanded;
    }
  }

  return new Expression();
}

/**
 * Handle an identifier AST node by resolving it to an Expression.
 * @param {string} name - The identifier name from the AST.
 * @param {object} items - The current tracked items object.
 * @param {Set} visited - Visited identifiers/events for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @param {boolean} skipAgeFiltering - When true, treat age requirements as satisfied.
 * @returns {Expression} The requirements associated with this identifier.
 */
function handleIdentifier(name, items, visited, depth, skipAgeFiltering = false) {
  // Age requirements
  if (name === "is_adult") {
    if (skipAgeFiltering) {
      return new Expression();
    }
    const settings = getSettings();
    const randomAge = settings?.starting_age === "random";

    if (currentAgeContext === "child") {
      // Location requires child, but this path requires adult
      return impossibleExpr();
    }

    if (currentAgeContext === "adult" || randomAge) {
      // Either already in adult context or can start as adult
      return new Expression();
    }

    return new Expression([new Clause([new RequirementItem("is_adult", "Adult", false, true)])]);
  }

  if (name === "is_child") {
    if (skipAgeFiltering) {
      return new Expression();
    }
    const settings = getSettings();
    const randomAge = settings?.starting_age === "random";

    if (currentAgeContext === "adult") {
      // Location requires adult, but this path requires child
      return impossibleExpr();
    }
    if (currentAgeContext === "child" || randomAge) {
      // Either already in child context or can start as child
      return new Expression();
    }

    return new Expression([new Clause([new RequirementItem("is_child", "Child", false, true)])]);
  }

  // Auto-satisfied identifiers
  if (SKIP_IDENTIFIERS.has(name)) {
    return new Expression();
  }

  // Ocarina notes
  if (OCARINA_NOTE_IDENTIFIERS.has(name)) {
    const settings = getSettings();
    if (!settings.shuffle_individual_ocarina_notes) {
      return new Expression();
    }
  }

  // Buy_ items with wallet and/or bottle requirements
  const shopReq = SHOP_WALLET_REQUIREMENTS.get(name);
  const needsBottle = SHOP_BOTTLE_REQUIRED.has(name);
  if (shopReq || needsBottle) {
    let result = new Expression();

    if (shopReq) {
      const walletOwned = isItemOwned(shopReq.id, items);
      result = new Expression([new Clause([new RequirementItem(shopReq.id, shopReq.label, walletOwned)])]);
    }

    if (needsBottle) {
      const bottleExpr = expandHasBottle(items, visited, depth + 1);
      result.merge(bottleExpr);
      result.simplify();
    }

    return result;
  }

  // Skip identifiers with certain prefixes
  for (const prefix of SKIP_PREFIXES) {
    if (name.startsWith(prefix)) {
      return new Expression();
    }
  }

  // Settings evaluation
  if (isSettingsIdentifier(name)) {
    const settings = getSettings();
    const renamedAttributes = LogicHelper.renamedAttributes;
    let settingValue = false;

    if (name.startsWith("logic_")) {
      settingValue = SettingsHelper.isAllowedTrick(name);
    }
    else if (name.startsWith("adv_") || name.startsWith("glitch_")) {
      settingValue = SettingsHelper.isAdvancedAllowedTrick(name);
    }
    else if (name.startsWith("at_")) {
      settingValue = true;
    }
    else if (name in settings) {
      settingValue = settings[name];
    }
    else if (name in renamedAttributes) {
      settingValue = renamedAttributes[name];
    }

    if (settingValue) {
      return new Expression();
    } else {
      return impossibleExpr();
    }
  }

  // Recursive expansion
  if (name === "has_bottle") {
    return expandHasBottle(items, visited, depth);
  }

  // Check if this identifier is already being expanded
  if (visited.has(name)) {
    return impossibleExpr();
  }

  // Expand events into item requirements
  const escapedName = name.replace(/_/g, " ");
  if (Locations.hasEvent(escapedName)) {
    return expandEvent(escapedName, items, visited, depth);
  }

  // Check if this is an event flag that maps to a different source event/location
  if (escapedName in FLAG_TO_EVENT) {
    return expandEventSkippingAge(FLAG_TO_EVENT[escapedName], items, visited, depth);
  }

  // If it's a rule alias, expand it
  const ruleAliases = LogicHelper.ruleAliases;
  if (name in ruleAliases) {
    // Cache key includes skipAgeFiltering to avoid mixing results
    const aliasCacheKey = skipAgeFiltering ? `alias_noage:${name}` : `alias:${name}`;
    if (evaluationCache?.has(aliasCacheKey)) {
      return evaluationCache.get(aliasCacheKey).clone();
    }

    visited.add(name);
    const expanded = extractFromNode(ruleAliases[name], items, visited, depth + 1, skipAgeFiltering);
    visited.delete(name);

    if (evaluationCache) {
      evaluationCache.set(aliasCacheKey, expanded);
    }
    return expanded.clone();
  }

  // Expand drops into access requirements
  if (Locations.hasDrop(escapedName)) {
    return expandDrop(escapedName, items, visited, depth);
  }

  // Terminal item handling
  if (isKeysyRemoved(name)) {
    return new Expression();
  }

  // Default: create a clause with this item as a requirement
  const owned = isItemOwned(name, items);
  const clause = new Clause([new RequirementItem(name, getDisplayName(name), owned)]);
  return new Expression([clause]);
}

/**
 * Handle a literal AST node.
 * @param {string|boolean|null} value - The literal value from the AST node.
 * @param {object} items - The current tracked items object.
 * @param {Set} visited - Visited identifiers/events for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @returns {Expression} The requirements for this literal value.
 */
function handleLiteral(value, items, visited, depth) {
  // Boolean true/null
  if (value === true || value === null) {
    return new Expression();
  }

  // Expand events into item requirements
  if (Locations.hasEvent(value)) {
    return expandEvent(value, items, visited, depth);
  }

  // Expand drops into access requirements.
  if (Locations.hasDrop(value)) {
    if (regionCacheBuildingMode && !NON_FREE_DROPS.has(value)) {
      return new Expression(); // Auto-satisfy free drops during cache building
    }
    return expandDrop(value, items, visited, depth);
  }

  // Check if it's a findable item
  const itemId = STRING_LITERAL_ITEMS[value];
  if (itemId) {
    const owned = isItemOwned(itemId, items);
    const displayName = getDisplayName(itemId);
    return new Expression([new Clause([new RequirementItem(itemId, displayName, owned)])]);
  }

  // Unknown literal
  return impossibleExpr();
}

/**
 * Handle a logical expression AST node.
 * @param {object} node - The LogicalExpression AST node.
 * @param {object} items - The current tracked items object.
 * @param {Set} visited - Visited identifiers/events for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @param {boolean} skipAgeFiltering - When true, treat age requirements as satisfied.
 * @returns {Expression} The combined requirements for this logical expression.
 */
function handleLogicalExpression(node, items, visited, depth, skipAgeFiltering = false) {
  const leftExpr = extractFromNode(node.left, items, visited, depth + 1, skipAgeFiltering);
  const rightExpr = extractFromNode(node.right, items, visited, depth + 1, skipAgeFiltering);

  if (node.operator === "&&") {
    leftExpr.merge(rightExpr);
    // Clear vanilla flag after merge
    if (!leftExpr.isEmpty()) {
      leftExpr.vanillaAutoSatisfied = false;
    }
    return leftExpr;
  } else if (node.operator === "||") {
    // Vanilla auto-satisfied items
    if (leftExpr.vanillaAutoSatisfied) {
      return rightExpr.isImpossible() ? new Expression() : rightExpr;
    }
    if (rightExpr.vanillaAutoSatisfied) {
      return leftExpr.isImpossible() ? new Expression() : leftExpr;
    }

    if (leftExpr.isEmpty() || leftExpr.isSatisfied()) {
      return new Expression();
    }
    if (rightExpr.isEmpty() || rightExpr.isSatisfied()) {
      return new Expression();
    }

    // If one side is impossible, use the other side instead of merging
    if (leftExpr.isImpossible()) {
      return rightExpr;
    }
    if (rightExpr.isImpossible()) {
      return leftExpr;
    }

    return orCombineExpressions(leftExpr, rightExpr);
  }

  return leftExpr;
}

/**
 * Handle a sequence expression AST node.
 * @param {object} node - The SequenceExpression AST node.
 * @param {object} items - The current tracked items object.
 * @param {Set} visited - Visited identifiers/events for cycle detection.
 * @param {number} depth - Current recursion depth.
 * @param {boolean} skipAgeFiltering - When true, treat age requirements as satisfied.
 * @returns {Expression} The requirements for this counted item.
 */
function handleSequenceExpression(node, items, visited, depth, skipAgeFiltering = false) {
  if (node.expressions.length !== 2) {
    return new Expression();
  }

  const itemName = node.expressions[0].name;
  const countNode = node.expressions[1];
  const settings = getSettings();
  const count = countNode.type === "Identifier" ? (settings[countNode.name] || 0) : countNode.value;

  // Check for keysy modes
  if (isKeysyRemoved(itemName)) {
    return new Expression();
  }

  // Check for vanilla placement
  const vanillaInfo = getVanillaPlacementInfo(itemName, settings);
  if (vanillaInfo.isVanilla && vanillaInfo.vanillaItemName) {
    // If we're already tracing this item, skip to avoid infinite recursion
    if (visited.has(itemName)) {
      return new Expression();
    }

    // Find vanilla locations for this item
    const vanillaLocations = Locations.getLocationsByVanillaItem(vanillaInfo.vanillaItemName);
    if (vanillaLocations.length > 0) {
      const newVisited = new Set(visited);
      newVisited.add(itemName);

      // Find a representative location and prefer one with a non-trivial rule
      let bestLocation = null;
      let bestIsTrivial = true;
      for (const vanillaLocation of vanillaLocations) {
        if (!vanillaLocation.rule) { continue; }
        const ruleAst = vanillaLocation.rule.expression || vanillaLocation.rule;
        const isTrivial = ruleAst.type === "Identifier" && ruleAst.name === "True";
        if (!bestLocation) {
          bestLocation = vanillaLocation;
          bestIsTrivial = isTrivial;
        }
        if (!isTrivial) {
          bestLocation = vanillaLocation;
          bestIsTrivial = isTrivial;
          break;
        }
      }

      if (bestLocation) {
        const isTrivial = bestIsTrivial;

        // During BFS, only evaluate the location rule to avoid circular dependencies
        if (regionCacheBuildingMode) {
          const bfsExpr = isTrivial
            ? new Expression()
            : extractFromNode(bestLocation.rule, items, newVisited, depth + 1, skipAgeFiltering);

          // Flag trivial vanilla items so they don't short-circuit OR clauses
          if (isTrivial) { bfsExpr.vanillaAutoSatisfied = true; }
          return bfsExpr;
        }

        // Evaluate rule and merge region access requirements
        const locExpr = isTrivial
          ? new Expression()
          : extractFromNode(bestLocation.rule, items, newVisited, depth + 1, skipAgeFiltering);
        if (isTrivial) { locExpr.vanillaAutoSatisfied = true; }

        if (!locExpr.isImpossible() && bestLocation.parentRegion && !bestLocation.isDungeon) {
          const activeCache = getActiveRegionCache();
          if (activeCache && activeCache.has(bestLocation.parentRegion)) {
            const regionExpr = activeCache.get(bestLocation.parentRegion).clone();
            if (!regionExpr.isEmpty() && !regionExpr.isSatisfied()) {
              locExpr.merge(regionExpr);
              locExpr.simplify();
            }
          }
        }
        return locExpr;
      }
    }

    // No vanilla location found
    return new Expression();
  }

  // Account for removed locked door in Fire Temple when keysanity is off
  let adjustedCount = count;
  const renamedAttributes = LogicHelper.renamedAttributes;
  if (!renamedAttributes.keysanity && itemName === "Small_Key_Fire_Temple") {
    adjustedCount = count - 1;
  }

  const owned = (items[itemName] || 0) >= adjustedCount;

  // Format display name with count
  let displayName = getDisplayName(itemName);
  if (adjustedCount > 1 && itemName !== "Magic_Bean") {
    displayName = `${displayName} x${adjustedCount}`;
  }

  const clause = new Clause([new RequirementItem(`${itemName},${adjustedCount}`, displayName, owned)]);
  return new Expression([clause]);
}

/**
 * Handle a unary expression AST node.
 * @param {object} node - The UnaryExpression AST node.
 * @returns {Expression} Impossible Expression if the negated condition is true, satisfied otherwise.
 */
function handleUnaryExpression(node) {
  if (node.operator === "!" && node.argument?.type === "Identifier") {
    const name = node.argument.name;
    if (isSettingsIdentifier(name)) {
      let settingValue = false;
      if (name.startsWith("at_")) {
        // at_ identifiers are always true, so !at_x is always false
        settingValue = true;
      } else if (name.startsWith("logic_")) {
        settingValue = SettingsHelper.isAllowedTrick(name);
      } else if (name.startsWith("adv_") || name.startsWith("glitch_")) {
        settingValue = SettingsHelper.isAdvancedAllowedTrick(name);
      } else {
        const settings = getSettings();
        const renamedAttributes = LogicHelper.renamedAttributes;
        if (name in settings) {
          settingValue = settings[name];
        } else if (name in renamedAttributes) {
          settingValue = renamedAttributes[name];
        }
      }
      if (settingValue) {
        return impossibleExpr();
      }
      return new Expression();
    }
  }

  // Default: treat as satisfied
  return new Expression();
}

/**
 * Handle a member expression AST node.
 * @param {object} node - The MemberExpression AST node.
 * @returns {Expression} The requirements for this member expression.
 */
function handleMemberExpression(node) {
  // Handle skipped_trials[TrialName]
  if (node.object?.name === "skipped_trials" && node.property) {
    const settings = getSettings();
    const trialsRandom = settings.trials_random;
    const trialsCount = settings.trials;

    // 0 trials, not random: all trials are skipped
    if (!trialsRandom && trialsCount === 0) {
      return new Expression();
    }

    // 6 trials, not random: force trial clear events
    if (!trialsRandom && trialsCount === 6) {
      return impossibleExpr();
    }

    // Partial or random trials: show synthetic "Trials Cleared xN" requirement
    const label = trialsRandom ? "Trials Cleared" : `Trials Cleared x${trialsCount}`;
    const id = trialsRandom ? "Trials_Cleared" : `Trials_Cleared,${trialsCount}`;
    return new Expression([new Clause([new RequirementItem(id, label, false)])]);
  }

  // Default: treat as satisfied
  return new Expression();
}

/**
 * Build a region accessibility cache via fixed-point forward propagation.
 * Computes the requirements to reach every region from ENTRY_POINT_REGIONS.
 *
 * Uses dual tracking to prevent CNF over-approximation from graph cycles:
 * - DNF paths (list of item-sets per region) for accurate update decisions
 * - CNF Expression cache for at()/event lookups during rule evaluation
 *
 * Without DNF tracking, iterative OR-combining in cycles creates CNF cross-products
 * that mix items from independent routes, producing phantom satisfying assignments.
 * @param {object} items - Current tracked items.
 * @returns {Map} A map from region name to the CNF Expression required to reach it.
 */
function buildRegionCache(items) {
  const cache = new Map();       // CNF Expression cache (for at() lookups and final output)
  const dnfCache = new Map();    // DNF paths cache (for accurate BFS updates)

  // 1. Seed entry points
  for (const entry of ENTRY_POINT_REGIONS) {
    cache.set(entry, new Expression());
    dnfCache.set(entry, [[]]);
  }

  // 2. Collect raw edges
  const allEdges = [];
  for (const regionName of Object.keys(Locations.regionMap)) {
    const exits = Locations.getExitsForRegion(regionName);
    if (!exits) { continue; }
    for (const [targetRegion, rule] of Object.entries(exits)) {
      if (EXCLUDED_FROM_PATHFINDING.has(targetRegion)) { continue; }
      allEdges.push({ source: regionName, target: targetRegion, rule });
    }
  }

  // 3. Fixed-point iteration with in-progress cache visible to expandEvent/expandDrop/at()
  regionCacheBuildingMode = true;
  activeRegionCacheOverride = cache;

  let previousCache = new Map(cache);

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 20) {
    changed = false;
    iterations++;
    evaluationCache = new Map();
    bfsAtLookupCache = previousCache;

    for (const { source, target, rule } of allEdges) {
      if (!dnfCache.has(source)) { continue; }

      // Evaluate exit rule to CNF Expression
      const exitExpr = extractFromNode(rule, items, new Set(), 0);
      if (exitExpr.isImpossible()) { continue; }

      // Convert exit CNF to DNF paths and combine with source paths
      const exitPaths = expressionToDNFPaths(exitExpr);
      if (exitPaths.length === 0) { continue; }

      const sourcePaths = dnfCache.get(source);
      const newPaths = combineDNFPaths(sourcePaths, exitPaths);

      if (!dnfCache.has(target)) {
        const pruned = pruneDominatedDNFPaths(newPaths);
        dnfCache.set(target, pruned);
        cache.set(target, dnfPathsToExpression(pruned));
        changed = true;
      } else {
        const existing = dnfCache.get(target);
        const all = [...existing, ...newPaths];
        const pruned = pruneDominatedDNFPaths(all);

        if (!dnfPathSetsEqual(pruned, existing)) {
          dnfCache.set(target, pruned);
          cache.set(target, dnfPathsToExpression(pruned));
          changed = true;
        }
      }
    }

    previousCache = new Map(cache);
  }

  bfsAtLookupCache = null;
  regionCacheBuildingMode = false;
  activeRegionCacheOverride = null;

  return cache;
}

/**
 * Get the region cache for the current age context.
 * @returns {Map|null} The active region cache map, or null if none is set.
 */
function getActiveRegionCache() {
  if (activeRegionCacheOverride) { return activeRegionCacheOverride; }
  if (currentAgeContext === "child") { return regionCacheChild; }
  if (currentAgeContext === "adult") { return regionCacheAdult; }
  return null;
}

/**
 * Build the region cache for a given age if it doesn't exist yet.
 *
 * Saves/restores currentAgeContext and evaluationCache around the build.
 * @param {string} age - The age context ("child" or "adult").
 * @param {object} items - Current tracked items.
 */
function ensureRegionCache(age, items) {
  if (age === "child" && regionCacheChild) { return; }
  if (age === "adult" && regionCacheAdult) { return; }

  const savedAge = currentAgeContext;
  const savedCache = evaluationCache;

  currentAgeContext = age;
  evaluationCache = new Map();

  const cache = buildRegionCache(items);

  if (age === "child") { regionCacheChild = cache; }
  else { regionCacheAdult = cache; }

  currentAgeContext = savedAge;
  evaluationCache = savedCache;
}

/**
 * Try to collapse a multi-clause expression into a single clause's worth of items.
 * @param {Expression} expr - The expression to attempt to collapse.
 * @returns {Array|null} An array of items if collapsible, or null if not.
 */
function tryCollapseToCompoundItems(expr) {
  if (expr.clauses.length < 2) {
    return null;
  }

  const singles = [];
  const multis = [];
  for (const c of expr.clauses) {
    if (c.items.length === 1) {
      singles.push(c.items[0]);
    } else {
      multis.push(c.items);
    }
  }

  if (singles.length > 0 && multis.length <= 1) {
    const compound = new CompoundItem(singles);
    if (multis.length === 1) {
      compound.nestedOr = multis[0];
      const orDisplay = multis[0].map(i => i.isCompound ? `(${i.displayName})` : i.displayName).join(" or ");
      compound.displayName = `${compound.displayName} and (${orDisplay})`;
      compound.name = `${compound.name}+(${multis[0].map(i => i.name).sort().join("|")})`;
      compound.owned = singles.every(i => i.owned) && multis[0].some(i => i.owned);
    }
    return [compound];
  }

  // 2 small multi-item clauses, no singles: pair as compound items
  if (multis.length === 2 && singles.length === 0) {
    const [m1, m2] = multis;

    // Check for common items first
    const m1Names = new Set(m1.map(i => i.name));
    const common = m2.filter(i => m1Names.has(i.name));

    if (common.length > 0) {
      const commonSet = new Set(common.map(i => i.name));
      const m1Rest = m1.filter(i => !commonSet.has(i.name));
      const m2Rest = m2.filter(i => !commonSet.has(i.name));
      const orItems = [...common];
      if (m1Rest.length > 0 && m2Rest.length > 0) {
        let inner;
        if (m1Rest.length === 1 && m2Rest.length === 1) {
          inner = new CompoundItem([m1Rest[0], m2Rest[0]]);
        } else if (m1Rest.length === 1) {
          inner = new CompoundItem([m1Rest[0]]);
          inner.nestedOr = m2Rest;
          const orDisplay = m2Rest.map(i => i.isCompound ? `(${i.displayName})` : i.displayName).join(" or ");
          inner.displayName = `${m1Rest[0].displayName} and (${orDisplay})`;
          inner.name = `${m1Rest[0].name}+(${m2Rest.map(i => i.name).sort().join("|")})`;
          inner.owned = m1Rest[0].owned && m2Rest.some(i => i.owned);
        } else if (m2Rest.length === 1) {
          inner = new CompoundItem([m2Rest[0]]);
          inner.nestedOr = m1Rest;
          const orDisplay = m1Rest.map(i => i.isCompound ? `(${i.displayName})` : i.displayName).join(" or ");
          inner.displayName = `${m2Rest[0].displayName} and (${orDisplay})`;
          inner.name = `${m2Rest[0].name}+(${m1Rest.map(i => i.name).sort().join("|")})`;
          inner.owned = m2Rest[0].owned && m1Rest.some(i => i.owned);
        } else {
          return null;
        }
        orItems.push(inner);
      } else if (m1Rest.length > 0) {
        orItems.push(...m1Rest);
      } else if (m2Rest.length > 0) {
        orItems.push(...m2Rest);
      }
      return orItems;
    }

    // No common items, both small
    if (m1.length <= 2 && m2.length <= 2) {
      const [iterItems, nestedItems] = m1.length <= m2.length ? [m1, m2] : [m2, m1];
      return iterItems.map(item => {
        const c = new CompoundItem([item]);
        c.nestedOr = nestedItems;
        const orDisplay = nestedItems.map(i => i.isCompound ? `(${i.displayName})` : i.displayName).join(" or ");
        c.displayName = `${item.displayName} and (${orDisplay})`;
        c.name = `${item.name}+(${nestedItems.map(i => i.name).sort().join("|")})`;
        c.owned = item.owned && nestedItems.some(i => i.owned);
        return c;
      });
    }
  }

  return null;
}

/**
 * DISTRIBUTIVE LAW: (X+A)·(X+B) = X + (A·B)
 *
 * When an item appears in ALL clauses, factor it out into a single OR clause.
 * The remaining items from each clause are combined into compound AND alternatives.
 *
 * This is applied as a final step because it creates CompoundItems which should only exist at the output stage.
 * @param {Expression} expr - The expression to factor in place.
 */
function factorUniversalItems(expr) {
  if (expr.clauses.length < 2) { return; }

  // Find items present in all clauses
  const clauseItemNames = expr.clauses.map(clause =>
    new Set(clause.items.map(i => i.name))
  );
  const universalNames = [...clauseItemNames[0]].filter(name =>
    clauseItemNames.every(names => names.has(name))
  );

  if (universalNames.length === 0) {
    // Check if universals exist among only the multi-item clauses
    const multiItemIndices = [];
    for (let i = 0; i < expr.clauses.length; i++) {
      if (expr.clauses[i].items.length > 1) {
        multiItemIndices.push(i);
      }
    }

    if (multiItemIndices.length >= 2) {
      const multiClauseItemNames = multiItemIndices.map(i =>
        new Set(expr.clauses[i].items.map(item => item.name))
      );
      const multiUniversalNames = [...multiClauseItemNames[0]].filter(name =>
        multiClauseItemNames.every(names => names.has(name))
      );

      if (multiUniversalNames.length > 0) {
        // Separate single-item clauses, factor multi-item clauses, recombine
        const multiItemSet = new Set(multiItemIndices);
        const singleClauses = expr.clauses.filter((_, i) => !multiItemSet.has(i));
        const multiExpr = new Expression(multiItemIndices.map(i => expr.clauses[i]));
        factorUniversalItems(multiExpr);
        expr.clauses = [...singleClauses, ...multiExpr.clauses];
        return;
      }
    }

    // Find an item appearing in a subset of clauses, extract it, recursively factor the remainders.
    // If remainders reduce to a single clause, create a factored clause.
    const itemToClauseIndices = new Map();
    for (let i = 0; i < expr.clauses.length; i++) {
      for (const item of expr.clauses[i].items) {
        if (!itemToClauseIndices.has(item.name)) {
          itemToClauseIndices.set(item.name, []);
        }
        itemToClauseIndices.get(item.name).push(i);
      }
    }

    // Sort candidates by frequency for greedy approach
    const candidates = [...itemToClauseIndices.entries()]
      .filter(([, indices]) => indices.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);

    // Pass 1: try candidates with simple remainders
    for (const [name, indices] of candidates) {
      const candidateItem = expr.clauses[indices[0]].items.find(i => i.name === name);

      // Build remainder clauses
      const remainderClauses = indices.map(i =>
        new Clause(expr.clauses[i].items.filter(item => item.name !== name))
      );
      const nonEmptyRemainders = remainderClauses.filter(c => c.items.length > 0);

      if (nonEmptyRemainders.length < remainderClauses.length) {
        continue;
      }

      const remainderExpr = new Expression(nonEmptyRemainders);
      factorUniversalItems(remainderExpr);

      if (remainderExpr.clauses.length === 1) {
        // Remainders reduced to 1 clause
        const factoredClause = new Clause([candidateItem, ...remainderExpr.clauses[0].items]);
        const groupSet = new Set(indices);
        expr.clauses = expr.clauses.filter((_, i) => !groupSet.has(i));
        expr.clauses.push(factoredClause);
        factorUniversalItems(expr);
        return;
      }

      // All single-item remainder clauses
      if (remainderExpr.clauses.every(c => c.items.length === 1)) {
        const singleItems = remainderExpr.clauses.map(c => c.items[0]);
        const compound = new CompoundItem(singleItems);
        const factoredClause = new Clause([candidateItem, compound]);
        const groupSet = new Set(indices);
        expr.clauses = expr.clauses.filter((_, i) => !groupSet.has(i));
        expr.clauses.push(factoredClause);
        factorUniversalItems(expr);
        return;
      }
    }

    // Pass 2: try candidates whose remainders can be collapsed into CompoundItems
    for (const [name, indices] of candidates) {
      const candidateItem = expr.clauses[indices[0]].items.find(i => i.name === name);

      const remainderClauses = indices.map(i =>
        new Clause(expr.clauses[i].items.filter(item => item.name !== name))
      );
      const nonEmptyRemainders = remainderClauses.filter(c => c.items.length > 0);
      if (nonEmptyRemainders.length < remainderClauses.length) {
        continue;
      }

      const remainderExpr = new Expression(nonEmptyRemainders);
      factorUniversalItems(remainderExpr);

      const collapsedItems = tryCollapseToCompoundItems(remainderExpr);
      if (collapsedItems) {
        const factoredClause = new Clause([candidateItem, ...collapsedItems]);
        const groupSet = new Set(indices);
        expr.clauses = expr.clauses.filter((_, i) => !groupSet.has(i));
        expr.clauses.push(factoredClause);
        factorUniversalItems(expr);
        return;
      }
    }
    return;
  }

  const universalSet = new Set(universalNames);
  const universalItems = expr.clauses[0].items.filter(i => universalSet.has(i.name));

  // Build remainder items from each clause
  const remainderPerClause = expr.clauses.map(clause =>
    clause.items.filter(i => !universalSet.has(i.name))
  );
  const nonEmptyRemainders = remainderPerClause.filter(r => r.length > 0);

  if (nonEmptyRemainders.length === 0) {
    // All clauses were entirely universal items
    expr.clauses = [new Clause(universalItems)];
    return;
  }

  if (nonEmptyRemainders.length < remainderPerClause.length) {
    // Some clauses became empty after removing universals
    expr.clauses = [new Clause(universalItems)];
    return;
  }

  // All remainder clauses are non-empty. Combine into compound alternatives.
  // Separate single-item and multi-item remainders for flexible factoring.
  const singleItems = [];
  const multiItemClauses = [];

  for (const rem of nonEmptyRemainders) {
    if (rem.length === 1) {
      singleItems.push(rem[0]);
    } else {
      multiItemClauses.push(rem);
    }
  }

  // All single-item remainders
  if (multiItemClauses.length === 0 && singleItems.length >= 2) {
    const compound = new CompoundItem(singleItems);
    expr.clauses = [new Clause([...universalItems, compound])];
    return;
  }

  // Single-items + 1 multi-item
  if (multiItemClauses.length === 1 && singleItems.length >= 1) {
    const compound = new CompoundItem(singleItems);
    compound.nestedOr = multiItemClauses[0];
    const nestedOrDisplay = multiItemClauses[0].map(i => i.displayName).join(" or ");
    compound.displayName = `${compound.displayName} and (${nestedOrDisplay})`;
    compound.name = `${compound.name}+(${multiItemClauses[0].map(i => i.name).sort().join("|")})`;
    expr.clauses = [new Clause([...universalItems, compound])];
    return;
  }

  // 2 multi-item clauses
  if (multiItemClauses.length === 2) {
    const [mc1, mc2] = multiItemClauses;
    const mc1Names = new Set(mc1.map(i => i.name));
    const commonItems = mc2.filter(i => mc1Names.has(i.name));

    if (commonItems.length > 0) {
      const commonSet = new Set(commonItems.map(i => i.name));
      const mc1Rem = mc1.filter(i => !commonSet.has(i.name));
      const mc2Rem = mc2.filter(i => !commonSet.has(i.name));

      const nestedOrItems = [...commonItems];
      if (mc1Rem.length > 0 && mc2Rem.length > 0) {
        let innerCompound;
        if (mc1Rem.length === 1 && mc2Rem.length === 1) {
          // Both single: simple AND compound
          innerCompound = new CompoundItem([mc1Rem[0], mc2Rem[0]]);
        } else if (mc1Rem.length === 1) {
          // Single AND (multi OR)
          innerCompound = new CompoundItem([mc1Rem[0]]);
          innerCompound.nestedOr = mc2Rem;
          const orDisplay = mc2Rem.map(i => i.displayName).join(" or ");
          innerCompound.displayName = `${mc1Rem[0].displayName} and (${orDisplay})`;
          innerCompound.name = `${mc1Rem[0].name}+(${mc2Rem.map(i => i.name).sort().join("|")})`;
          innerCompound.owned = mc1Rem[0].owned && mc2Rem.some(i => i.owned);
        } else if (mc2Rem.length === 1) {
          // (multi OR) AND single
          innerCompound = new CompoundItem([mc2Rem[0]]);
          innerCompound.nestedOr = mc1Rem;
          const orDisplay = mc1Rem.map(i => i.displayName).join(" or ");
          innerCompound.displayName = `${mc2Rem[0].displayName} and (${orDisplay})`;
          innerCompound.name = `${mc2Rem[0].name}+(${mc1Rem.map(i => i.name).sort().join("|")})`;
          innerCompound.owned = mc2Rem[0].owned && mc1Rem.some(i => i.owned);
        } else {
          // Both multi
          innerCompound = new CompoundItem([...mc1Rem, ...mc2Rem]);
        }
        nestedOrItems.push(innerCompound);
      } else if (mc1Rem.length > 0) {
        nestedOrItems.push(...mc1Rem);
      } else if (mc2Rem.length > 0) {
        nestedOrItems.push(...mc2Rem);
      }

      if (singleItems.length > 0) {
        const compound = new CompoundItem(singleItems);
        compound.nestedOr = nestedOrItems;
        const nestedOrDisplay = nestedOrItems.map(i =>
          i.isCompound ? `(${i.displayName})` : i.displayName
        ).join(" or ");
        compound.displayName = `${compound.displayName} and (${nestedOrDisplay})`;
        compound.name = `${compound.name}+(${nestedOrItems.map(i => i.name).sort().join("|")})`;
        expr.clauses = [new Clause([...universalItems, compound])];
      } else {
        expr.clauses = [new Clause([...universalItems, ...nestedOrItems])];
      }
      return;
    }

    if (singleItems.length === 0 && mc1.length <= 2 && mc2.length <= 2) {
      // Both remainders small with no common items.
      // Factor each item from one clause with the other as nestedOr.
      const [iterItems, nestedItems] = mc1.length <= mc2.length ? [mc1, mc2] : [mc2, mc1];
      const compounds = iterItems.map(item => {
        const compound = new CompoundItem([item]);
        compound.nestedOr = nestedItems;
        const nestedOrDisplay = nestedItems.map(i =>
          i.isCompound ? `(${i.displayName})` : i.displayName
        ).join(" or ");
        compound.displayName = `${item.displayName} and (${nestedOrDisplay})`;
        compound.name = `${item.name}+(${nestedItems.map(i => i.name).sort().join("|")})`;
        compound.owned = item.owned && nestedItems.some(i => i.owned);
        return compound;
      });
      expr.clauses = [new Clause([...universalItems, ...compounds])];
      return;
    }
  }

  // Create sub-expression from all remainder clauses and factor recursively
  const subClauses = [];
  for (const items of multiItemClauses) {
    subClauses.push(new Clause(items));
  }
  for (const item of singleItems) {
    subClauses.push(new Clause([item]));
  }
  if (subClauses.length < 2) {
    if (subClauses.length === 1) {
      expr.clauses = [new Clause([...universalItems, ...subClauses[0].items])];
    }
    return;
  }

  const subExpr = new Expression(subClauses);
  factorUniversalItems(subExpr);

  if (subExpr.clauses.length === 1) {
    expr.clauses = [new Clause([...universalItems, ...subExpr.clauses[0].items])];
    return;
  }

  // Try converting multi-clause sub-expression into a single CompoundItem
  const subSingles = [];
  const subMulti = [];
  for (const clause of subExpr.clauses) {
    if (clause.items.length === 1) {
      subSingles.push(clause.items[0]);
    } else {
      subMulti.push(clause.items);
    }
  }

  if (subMulti.length <= 1 && subSingles.length > 0) {
    // Can represent as CompoundItem with optional nestedOr
    const compound = new CompoundItem(subSingles);
    if (subMulti.length === 1) {
      compound.nestedOr = subMulti[0];
      const nestedOrDisplay = subMulti[0].map(i =>
        i.isCompound ? `(${i.displayName})` : i.displayName
      ).join(" or ");
      compound.displayName = `${compound.displayName} and (${nestedOrDisplay})`;
      compound.name = `${compound.name}+(${subMulti[0].map(i => i.name).sort().join("|")})`;
    }
    expr.clauses = [new Clause([...universalItems, compound])];
    return;
  }

  // If can't fully collapse, reconstruct with universals in each clause
  expr.clauses = subExpr.clauses.map(c => new Clause([...universalItems, ...c.items]));
}

/**
 * Produce a canonical string signature for an Expression.
 * @param {Expression} expr - The expression to produce a signature for.
 * @returns {string} The canonical signature string.
 */
function expressionSignature(expr) {
  return expr.clauses
    .map(c => c.items.map(i => i.name).sort().join("|"))
    .sort()
    .join("&");
}

/**
 * Evaluate region access and location rule requirements for a specific age context.
 * @param {object} rule - The parsed AST rule node for the location.
 * @param {string} parentRegion - The region to evaluate access for.
 * @param {object} items - Current tracked items.
 * @returns {Expression|null} The requirements, or null if impossible.
 */
function evaluateForAge(rule, parentRegion, items) {
  const regionCache = getActiveRegionCache();
  let regionExpr;

  if (regionCache?.has(parentRegion)) {
    regionExpr = regionCache.get(parentRegion).clone();
  } else if (ENTRY_POINT_REGIONS.has(parentRegion)) {
    // Entry points are always accessible
    regionExpr = new Expression();
  } else {
    // Region not reachable
    return null;
  }

  // Bean planting special case: child must reach the region to plant
  if (containsBeanPlanting(rule)) {
    const childExpr = regionCacheChild?.get(parentRegion)?.clone();
    if (childExpr && !childExpr.isEmpty() && !childExpr.isImpossible()) {
      if (currentAgeContext !== null) {
        // Age-specific context: store child region for here(can_plant_bean) to merge into just the bean sub-expression,
        // not the entire region expression. This lets non-bean branches use the age-specific cache.
        beanPlantingChildRegionExpr = childExpr;
      } else {
        // Age-neutral context: replace region with child cache
        regionExpr = childExpr;
      }
    }
  }

  const locationExpr = extractFromNode(rule, items, new Set(), 0);

  // Clear after extraction
  beanPlantingChildRegionExpr = null;

  regionExpr.merge(locationExpr);
  regionExpr.simplify();

  if (regionExpr.isImpossible()) {
    return null;
  }

  return regionExpr;
}

/**
 * Post-process an Expression into the output clause format.
 * @param {Expression} regionExpr - The expression to post-process.
 * @returns {{ clauses: Array, satisfied: boolean }} The formatted requirements structure.
 */
function postProcessExpression(regionExpr) {
  // Factor universal items from PoS expressions into compound alternatives
  factorUniversalItems(regionExpr);

  // Factor common items from compound options within OR clauses
  for (const clause of regionExpr.clauses) {
    if (clause.items.length > 1) {
      clause.items = factorCompoundsWithSharedItems(clause.items);
      clause.items = simplifyOrBySubset(clause.items);
    }
  }

  // Convert internal item to output format
  const convertItem = (item) => {
    if (item.isCompound) {
      const result = {
        name: item.name,
        displayName: item.displayName,
        owned: item.owned,
        isEvent: false,
        isCompound: true,
        subItems: item.items.map(convertItem),
      };

      if (item.nestedOr && item.nestedOr.length > 0) {
        result.nestedOr = item.nestedOr.map(convertItem);
      }

      return result;
    }

    return {
      name: item.name,
      displayName: item.displayName,
      owned: item.owned,
      isEvent: item.isEvent,
    };
  };

  // Convert to output format
  const clauses = regionExpr.clauses.map(clause => ({
    items: clause.items.map(convertItem),
  }));

  // Simplify redundant top-level age requirements
  const simplifiedClauses = simplifyTopLevelAge(clauses);

  // Sort clauses: simpler clauses first, then alphabetically
  simplifiedClauses.sort((a, b) => {
    const aHasCompound = a.items.some(item => item.isCompound);
    const bHasCompound = b.items.some(item => item.isCompound);
    if (aHasCompound !== bHasCompound) {
      return aHasCompound ? 1 : -1;
    }
    if (a.items.length !== b.items.length) {
      return a.items.length - b.items.length;
    }

    const aName = a.items[0]?.displayName || "";
    const bName = b.items[0]?.displayName || "";
    return aName.localeCompare(bName);
  });

  const satisfied = regionExpr.isEmpty() || regionExpr.isSatisfied();
  return { clauses: simplifiedClauses, satisfied };
}

/**
 * Compute and return the item requirements to access a specific location.
 *
 * Evaluates region accessibility and location rule for each applicable age context, combines results,
 * and post-processes into the output clause format.
 * @param {string} locationName - The location name as used in logic files.
 * @param {object} items - The current tracked items object.
 * @returns {{ clauses: Array, satisfied: boolean }} The requirements structure.
 */
export function getLocationRequirements(locationName, items) {
  const location = Locations.getLocation(locationName);
  if (!location) {
    return { clauses: [], satisfied: true };
  }

  const { rule: locationRule, parentRegion: locationRegion } = location;

  // Boss defeat locations:
  // The location rule is a Defeat event reference. Boss fight items are trivially satisfied via shop consumables.
  // Replace the Defeat rule with true and let the region cache handle navigation from the boss room to root.
  let rule = locationRule;
  const parentRegion = locationRegion;
  const ruleExpr = locationRule.type === "ExpressionStatement" ? locationRule.expression : locationRule;
  if (ruleExpr.type === "Literal" && typeof ruleExpr.value === "string" && ruleExpr.value.startsWith("Defeat ")) {
    rule = { type: "Literal", value: true };
  }

  const ageRequirement = detectAgeRequirement(rule);

  cachedSettings = LogicHelper.settings;

  try {
    // Always build both age caches.
    // Age-specific locations still need both caches for dual-age evaluation.
    ensureRegionCache("child", items);
    ensureRegionCache("adult", items);

    // When no age is detected from the location rule, evaluate for each age separately to maintain age consistency
    // across paths. A player can only be one age at a time. The cache ensures consistent age assumptions.
    // This applies regardless of starting_age since the player can always time travel.
    if (!ageRequirement) {
      const ageExprs = [];

      for (const age of ["child", "adult"]) {
        currentAgeContext = age;
        evaluationCache = new Map();

        const result = evaluateForAge(rule, parentRegion, items);
        if (result) {
          ageExprs.push(result);
        }
      }

      currentAgeContext = null;
      evaluationCache = new Map();

      if (ageExprs.length === 0) {
        return { clauses: [], satisfied: true };
      }

      // Short-circuit: only one age produced a valid result
      if (ageExprs.length === 1) {
        return postProcessExpression(ageExprs[0]);
      }

      // Short-circuit: both ages produce equivalent results
      const sig0 = expressionSignature(ageExprs[0]);
      const sig1 = expressionSignature(ageExprs[1]);
      if (sig0 === sig1) {
        return postProcessExpression(ageExprs[0]);
      }

      // Different results for child vs adult: combine with proper Product-of-Sums OR
      const combined = orCombineExpressions(ageExprs[0], ageExprs[1]);
      return postProcessExpression(combined);
    }

    // Fixed starting age or age-specific rule: single evaluation
    currentAgeContext = ageRequirement;
    evaluationCache = new Map();

    const result = evaluateForAge(rule, parentRegion, items);
    if (!result) {
      return { clauses: [], satisfied: true };
    }

    return postProcessExpression(result);
  } finally {
    currentAgeContext = null;
    cachedSettings = null;
    evaluationCache = null;
  }
}

/**
 * Return the cached requirements structure for a location, recomputing when settings change.
 *
 * Uses starting items to produce a static structure that is then updated with ownership.
 * @param {string} locationName - The location name as used in logic files.
 * @returns {{ clauses: Array, satisfied: boolean }} The cached requirements structure.
 */
export function getRequirementsStructure(locationName) {
  // Check if settings have changed and invalidate cache if so
  const currentSettings = LogicHelper.settings;
  const currentSettingsJson = JSON.stringify(currentSettings);

  if (currentSettingsJson !== lastSettingsJson) {
    structureCache.clear();
    lastSettingsJson = currentSettingsJson;
    regionCacheChild = null;
    regionCacheAdult = null;
  }

  // Check cache first
  if (structureCache.has(locationName)) {
    return structureCache.get(locationName);
  }

  // Compute and cache the result
  const startingItems = LogicHelper.getStartingItems();
  const result = getLocationRequirements(locationName, startingItems);

  structureCache.set(locationName, result);
  return result;
}

/**
 * Update the owned flags in a requirements structure based on current items.
 *
 * Recursively updates simple and compound items, preserving the clause structure.
 * Returns the original object unchanged if already satisfied or empty.
 * @param {{ clauses: Array, satisfied: boolean }} requirements - The requirements structure to update.
 * @param {object} currentItems - The current tracked items object.
 * @returns {{ clauses: Array, satisfied: boolean }} A new requirements object with updated ownership.
 */
export function updateRequirementsOwnership(requirements, currentItems) {
  if (!requirements || requirements.satisfied || requirements.clauses.length === 0) {
    return requirements;
  }

  // Helper to recursively update ownership for any item
  const updateNestedItem = (item) => {
    if (item.isCompound && item.subItems) {
      const updatedSubItems = item.subItems.map(updateNestedItem);
      const subItemsOwned = updatedSubItems.every(si => si.owned);

      let updatedNestedOr = null;
      let nestedOrSatisfied = false;
      if (item.nestedOr && item.nestedOr.length > 0) {
        updatedNestedOr = item.nestedOr.map(updateNestedItem);
        nestedOrSatisfied = updatedNestedOr.some(ni => ni.owned);
      }

      return {
        ...item,
        subItems: updatedSubItems,
        nestedOr: updatedNestedOr,
        owned: subItemsOwned && (!updatedNestedOr || nestedOrSatisfied),
      };
    }
    return {
      ...item,
      owned: isItemOwned(item.name, currentItems),
    };
  };

  // Deep clone and update ownership recursively
  const updated = {
    clauses: requirements.clauses.map(clause => ({
      items: clause.items.map(updateNestedItem),
    })),
    satisfied: requirements.satisfied,
  };

  return updated;
}

/**
 * Clear the structure cache. Call this when logic files are reloaded.
 */
export function clearStructureCache() {
  structureCache.clear();
  lastSettingsJson = null;
  regionCacheChild = null;
  regionCacheAdult = null;
}

export default { getLocationRequirements, getRequirementsStructure, updateRequirementsOwnership, clearStructureCache };
