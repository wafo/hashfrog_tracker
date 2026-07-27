/**
 * Shared boulder-shuffle rules.
 */

// What each boulder type takes to get past, mirroring State.can_pass_boulder_type in the boulder-shuffle forks.
// A type missing from here (HEAVY_BLOCK) is impassable there too.
export const BOULDER_TYPE_RULES = {
  BROWN: "can_blast_or_smash",
  BRONZE: "can_use(Megaton_Hammer)",
  SILVER: "is_adult and Silver_Gauntlets",
  GOLD: "is_adult and Golden_Gauntlets",
  RED_ICE: "Blue_Fire",
};

/**
 * Read the boulder name out of a boulder helper's first argument.
 * @param {object} node - The CallExpression AST node.
 * @returns {string} The boulder name, or an empty string if it is not a literal.
 */
export function boulderNameArgument(node) {
  const arg = node.arguments[0];
  return arg?.type === "Literal" ? String(arg.value) : arg?.name ?? "";
}

/**
 * Read BOULDER_TYPE_* identifiers out of an argument, which may be a list or a single value.
 * @param {object} node - The AST node holding the type or types.
 * @returns {Array<string>} Bare type names, e.g. ["BROWN", "BRONZE"].
 */
export function boulderTypeNames(node) {
  const elements = node?.type === "ArrayExpression" ? node.elements : [node];

  return elements
    .map(element => element?.name ?? element?.value)
    .filter(Boolean)
    .map(name => String(name).replace(/^BOULDER_TYPE_/, ""));
}

/**
 * The boulder types a given boulder could be in this seed.
 *
 * With boulder shuffle off, every boulder keeps its vanilla type, so this is a single certain answer.
 * With it on, the types are permuted per seed and the tracker cannot know which one landed here, so every type in the
 * pool stays possible.
 * @param {object} boulderTable - Map of boulder name to vanilla type.
 * @param {object} settings - The current settings object.
 * @param {string} boulderName - The boulder's name in Boulders.py.
 * @returns {Array<string>} Possible type names, empty if the boulder is unknown.
 */
export function possibleBoulderTypes(boulderTable, settings, boulderName) {
  const boulders = boulderTable ?? {};

  if (!settings?.shuffle_boulders) {
    return boulderName in boulders ? [boulders[boulderName]] : [];
  }

  const pool = new Set(Object.values(boulders));

  // Golden boulders are converted from silver ones, so both remain possible
  if (settings.golden_boulders) { pool.add("GOLD"); }

  return [...pool];
}

/**
 * Combine the requirements of every type a boulder could be into one rule.
 * @param {Array<string>} types - Possible boulder type names.
 * @returns {string|null} A rule string, or null when no listed type can be passed.
 */
export function boulderRule(types) {
  const rules = types.map(type => BOULDER_TYPE_RULES[type]).filter(Boolean);
  if (!rules.length) { return null; }

  return rules.map(rule => `(${rule})`).join(" or ");
}
