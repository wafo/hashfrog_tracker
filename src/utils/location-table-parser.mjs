/**
 * Parser for the randomizer's LocationList.py.
 *
 * The logic files name locations but say nothing about what kind of check each one is, so the tracker needs the type
 * and vanilla item from LocationList.py to know which shuffle setting gates a location.
 * Every branch ships its own copy alongside the logic files, which is how forks that add whole categories of checks
 * (enemy souls, grass, fairies) stay readable to the tracker.
 */

// A location entry opens at four spaces of indent with a quoted name
const ENTRY_START = /^ {4}\("/;

// Continuation lines of a wrapped entry are indented far past anything else in the file
const ENTRY_CONTINUATION = /^\s{40,}/;

// ("Location Name", ("Type", ...
const ENTRY_FIELDS = /^\s*\("([^"]+)",\s*\("(\w+(?:\s+\w+)?)"/;

// The vanilla item is the first quoted string followed by a category tuple or None.
// Apostrophes in item names ("Buy Fairy's Spirit") are backslash-escaped rather than switched to double quotes.
const VANILLA_ITEM = /,\s*'((?:[^'\\]|\\.)+)',\s*(?:\(|None)/;

/**
 * Join the wrapped lines of LocationList.py so each location entry sits on a single line.
 * @param {string} content - Raw contents of LocationList.py.
 * @returns {Array<string>} One string per location entry.
 */
function joinWrappedEntries(content) {
  const entries = [];
  let currentEntry = "";

  for (const line of content.split("\n")) {
    if (ENTRY_START.test(line)) {
      if (currentEntry) { entries.push(currentEntry); }
      currentEntry = line;
    } else if (currentEntry && ENTRY_CONTINUATION.test(line) && !line.trim().startsWith("#")) {
      currentEntry += ` ${line.trim()}`;
    } else if (currentEntry) {
      entries.push(currentEntry);
      currentEntry = "";
    }
  }

  if (currentEntry) { entries.push(currentEntry); }

  return entries;
}

/**
 * Build the tracker's location table from the source of LocationList.py.
 * @param {string} content - Raw contents of LocationList.py.
 * @returns {object} Map of location name to [type, vanilla item].
 * @throws {Error} If the file yields no recognisable location entries.
 */
export function parseLocationTable(content) {
  const locationTable = {};

  for (const entry of joinWrappedEntries(content)) {
    const fields = entry.match(ENTRY_FIELDS);
    if (!fields) { continue; }

    const [, locationName, type] = fields;
    const vanillaItem = entry.match(VANILLA_ITEM);
    locationTable[locationName] = [type, vanillaItem ? vanillaItem[1].replace(/\\(.)/g, "$1") : "None"];
  }

  if (!Object.keys(locationTable).length) {
    throw new Error("No locations found. LocationList.py is empty or its format changed.");
  }

  return locationTable;
}
