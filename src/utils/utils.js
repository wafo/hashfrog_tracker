import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import HINT_REGIONS_KEYWORDS from "../data/hint-regions-keywords.json";
import HINT_REGIONS from "../data/hint-regions.json";

export async function readFileAsText(file) {
  let result = await new Promise(resolve => {
    let fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsText(file);
  });

  return result;
}

export function generateId() {
  return uuidv4().replace(/-/g, "");
}

export function splitIntoChunk(arr, chunk) {
  let chunks = [];
  for (let i = 0; i < arr.length; i += chunk) {
    let tempArray;
    tempArray = arr.slice(i, i + chunk);
    chunks.push(tempArray);
  }
  return chunks;
}

export function splitNameBase64(string) {
  const [name, file] = string.split(/;(.*)/s);
  return { name, file };
}

export function isBase64(string) {
  return string.match(/data:image\/png;base64{1}.*/);
}

export function updateHintRegionsJSON(files) {
  // Cleaning the regions before rebuilding ?
  const regions = Object.keys(HINT_REGIONS).reduce((accumulator, key) => {
    accumulator[key] = [];
    return accumulator;
  }, {});

  _.forEach(files, file => {
    file.forEach(({ dungeon, locations, region_name }) => {
      if (!locations) return;
      if (dungeon && regions[dungeon]) {
        regions[dungeon].push(region_name);
      } else if (regions[region_name]) {
        regions[region_name].push(region_name);
      } else {
        const match = Object.entries(HINT_REGIONS_KEYWORDS).find(([, keywords]) => {
          return keywords.find(keyword => region_name.includes(keyword));
        });
        if (match) regions[match[0]].push(region_name);
      }
    });
  });

  // console.log(JSON.stringify(regions));

  return regions;
}

export function duplicate(component, components, setComponent) {
  if (!component) return;

  setComponent({
    ...component,
    id: generateId()
  });
}
