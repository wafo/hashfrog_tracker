/**
 * Parser for the boulder tables in Boulders.py.
 *
 * The boulder-shuffle forks gate exits on `can_pass_boulder('SOME_BOULDER')` rather than naming the items directly, so
 * the tracker needs each boulder's type to turn that back into a requirement.
 * Only forks that implement boulder shuffle ship this file; everywhere else the table is empty and the boulder helpers
 * never come up.
 */

// Boulders are declared as 'NAME': {(scene, room, setup, actor): {'type': BOULDER_TYPE.BROWN, ...}, ...}
// across several dicts (overworld, vanilla dungeons, MQ dungeons). Names are unique across all of them.
const BOULDER_NAME = /'([A-Z][A-Z0-9_]*)'\s*:\s*\{/g;
const BOULDER_TYPE = /BOULDER_TYPE\.([A-Z_]+)/;

/**
 * Build a map of boulder name to boulder type from the source of Boulders.py.
 * @param {string} content - Raw contents of Boulders.py.
 * @returns {object} Map of boulder name to type name, e.g. { HF_SOUTHEAST_GROTTO_BOULDER: "BROWN" }.
 */
export function parseBoulderTable(content) {
  const boulderTable = {};
  const declarations = [...content.matchAll(BOULDER_NAME)];

  declarations.forEach((declaration, index) => {
    const name = declaration[1];

    // Stop at the next declaration so a typeless entry cannot borrow the following boulder's type
    const end = index + 1 < declarations.length ? declarations[index + 1].index : content.length;
    const type = content.slice(declaration.index, end).match(BOULDER_TYPE);

    if (type && !(name in boulderTable)) {
      boulderTable[name] = type[1];
    }
  });

  return boulderTable;
}
