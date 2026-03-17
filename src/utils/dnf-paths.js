import {
  Clause, Expression, RequirementItem,
  getDisplayName,
  impossibleExpr, orCombineExpressions,
  parseCountedItem,
} from "./expression-data";


/**
 * Convert a CNF Expression to a list of DNF paths.
 * @param {Expression} expr - The CNF Expression to convert.
 * @returns {Array<Array>} List of DNF paths, each a sorted array of item name strings.
 */
function expressionToDNFPaths(expr) {
  if (expr.isEmpty()) {
    return [[]];
  }

  let paths = [[]];

  for (const clause of expr.clauses) {
    const validItems = clause.items.filter(item => item.name !== "__false__");
    if (validItems.length === 0) {
      return [];
    }

    const newPaths = [];
    for (const item of validItems) {
      const itemName = item.name;
      for (const path of paths) {
        if (path.includes(itemName)) {
          newPaths.push(path);
        } else {
          newPaths.push([...path, itemName].sort());
        }
      }
    }
    paths = pruneDominatedDNFPaths(newPaths);

    // Safety cap to prevent exponential blowup on complex exit rules
    if (paths.length > 50) {
      paths.sort((a, b) => a.length - b.length);
      paths = paths.slice(0, 30);
    }
  }

  return paths;
}

/**
 * Merge two sorted item arrays into a sorted, deduplicated array.
 * @param {Array} a - First sorted item name array.
 * @param {Array} b - Second sorted item name array.
 * @returns {Array} The merged, deduplicated, sorted array.
 */
function mergeSortedPaths(a, b) {
  if (a.length === 0) { return b; }
  if (b.length === 0) { return a; }

  const items = buildPathMap([...a, ...b]);
  return [...items.entries()]
    .map(([base, count]) => (count > 1 ? `${base},${count}` : base))
    .sort();
}

/**
 * Combine source DNF paths with exit DNF paths.
 * @param {Array<Array>} sourcePaths - The source region's DNF paths.
 * @param {Array<Array>} exitPaths - The exit rule's DNF paths.
 * @returns {Array<Array>} The combined DNF paths.
 */
function combineDNFPaths(sourcePaths, exitPaths) {
  const result = [];
  for (const src of sourcePaths) {
    for (const exit of exitPaths) {
      result.push(mergeSortedPaths(src, exit));
    }
  }
  return result;
}

/**
 * Build a Map of baseName to maxCount for a DNF path.
 * @param {Array} path - A sorted array of item name strings.
 * @returns {Map<string, number>} The path map.
 */
function buildPathMap(path) {
  const map = new Map();
  for (const name of path) {
    const { baseName, count } = parseCountedItem(name);
    map.set(baseName, Math.max(map.get(baseName) || 0, count));
  }
  return map;
}

/**
 * Check if path 'a' is a subset of path 'b' (a dominates b).
 * @param {Array} a - The candidate subset path.
 * @param {Map} bMap - Pre-built path map for b (from buildPathMap).
 * @returns {boolean} True if every item in a is satisfied by b.
 */
function isPathSubsetOf(a, bMap) {
  for (const name of a) {
    const { baseName, count } = parseCountedItem(name);
    if ((bMap.get(baseName) || 0) < count) { return false; }
  }
  return true;
}

/**
 * Prune dominated paths. Path A dominates B if A is a strict subset of B.
 * @param {Array<Array>} paths - The list of DNF paths to prune.
 * @returns {Array<Array>} The pruned list with dominated paths removed.
 */
function pruneDominatedDNFPaths(paths) {
  if (paths.length <= 1) { return paths; }

  const unique = new Map();
  for (const path of paths) {
    const key = path.join(",");
    if (!unique.has(key)) { unique.set(key, path); }
  }

  const allPaths = [...unique.values()];
  if (allPaths.length <= 1) { return allPaths; }

  // Pre-build maps so isPathSubsetOf doesn't rebuild them on every comparison
  const pathMaps = allPaths.map(buildPathMap);

  // After dedup, i !== j guarantees truly different paths,
  // so isPathSubsetOf returning true implies strict subset.
  return allPaths.filter((path, i) =>
    !allPaths.some((other, j) => i !== j && other.length <= path.length && isPathSubsetOf(other, pathMaps[i]))
  );
}

/**
 * Check if two DNF path sets are equal.
 * @param {Array<Array>} a - The first DNF path set.
 * @param {Array<Array>} b - The second DNF path set.
 * @returns {boolean} True if both sets contain the same paths.
 */
function dnfPathSetsEqual(a, b) {
  if (a.length !== b.length) { return false; }
  const aKeys = new Set(a.map(p => p.join(",")));
  return b.every(p => aKeys.has(p.join(",")));
}

/**
 * Convert DNF paths back to a CNF Expression.
 * @param {Array<Array>} paths - The list of DNF paths to convert.
 * @returns {Expression} The resulting CNF Expression.
 */
function dnfPathsToExpression(paths) {
  if (paths.length === 0) {
    return impossibleExpr();
  }

  // Sort by size for better absorption
  const sorted = [...paths].sort((a, b) => a.length - b.length);

  const pathToExpr = (path) => {
    if (path.length === 0) { return new Expression(); }
    return new Expression(path.map(name => {
      const { baseName, count } = parseCountedItem(name);
      const display = (count > 1 && baseName !== "Magic_Bean") ? `${getDisplayName(baseName)} x${count}` : getDisplayName(baseName);
      return new Clause([new RequirementItem(name, display, false)]);
    }));
  };

  let result = pathToExpr(sorted[0]);
  for (let i = 1; i < sorted.length; i++) {
    result = orCombineExpressions(result, pathToExpr(sorted[i]));
  }
  result.simplify();
  return result;
}

export {
  combineDNFPaths, dnfPathSetsEqual,
  dnfPathsToExpression, expressionToDNFPaths, pruneDominatedDNFPaths
};
