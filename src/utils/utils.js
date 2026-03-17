import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import HINT_REGIONS_KEYWORDS from "../data/hint-regions-keywords.json";
import HINT_REGIONS from "../data/hint-regions.json";

/**
 * Reads a File object as text.
 * @param {File} file - The file to read.
 * @returns {Promise<string>} The file contents as a string.
 */
export async function readFileAsText(file) {
  const result = await new Promise(resolve => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsText(file);
  });

  return result;
}

/**
 * Generates a UUID without hyphens.
 * @returns {string} A 32-character hex string.
 */
export function generateId() {
  return uuidv4().replace(/-/g, "");
}

/**
 * Splits an array into chunks of the given size.
 * @param {Array} arr - The array to split.
 * @param {number} chunk - The chunk size.
 * @returns {Array<Array>} Array of chunked sub-arrays.
 */
export function splitIntoChunk(arr, chunk) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunk) {
    const tempArray = arr.slice(i, i + chunk);
    chunks.push(tempArray);
  }
  return chunks;
}

/**
 * Splits a "name;base64data" string into its parts.
 * @param {string} string - The combined name and base64 string.
 * @returns {{name: string, file: string}} The separated name and file data.
 */
export function splitNameBase64(string) {
  const [name, file] = string.split(/;(.*)/s);
  return { name, file };
}

/**
 * Checks if a string is a base64-encoded PNG data URI.
 * @param {string} string - The string to test.
 * @returns {Array|null} The match result, or null.
 */
export function isBase64(string) {
  return string.match(/data:image\/png;base64{1}.*/);
}

/**
 * Rebuilds hint region mappings from logic files.
 * @param {Array} files - Array of location file data.
 * @returns {object} Map of hint region names to their sub-regions.
 */
export function updateHintRegionsJSON(files) {
  // Cleaning the regions before rebuilding ?
  const regions = Object.keys(HINT_REGIONS).reduce((accumulator, key) => {
    accumulator[key] = [];
    return accumulator;
  }, {});

  _.forEach(files, file => {
    file.forEach(({ dungeon, locations, region_name }) => {
      if (!locations) { return; }
      if (dungeon && regions[dungeon]) {
        regions[dungeon].push(region_name);
      } else if (regions[region_name]) {
        regions[region_name].push(region_name);
      } else {
        const match = Object.entries(HINT_REGIONS_KEYWORDS).find(([, keywords]) => {
          return keywords.find(keyword => region_name.includes(keyword));
        });
        if (match) { regions[match[0]].push(region_name); }
      }
    });
  });

  return regions;
}

/**
 * Duplicates a layout component with a new ID.
 * @param {object} component - The component to duplicate.
 * @param {Array} _components - The current components list (unused).
 * @param {function(object): void} setComponent - Callback to set the new component.
 */
export function duplicate(component, _components, setComponent) {
  if (!component) { return; }

  setComponent({
    ...component,
    id: generateId()
  });
}
