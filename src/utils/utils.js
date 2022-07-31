import { v4 as uuidv4 } from "uuid";

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
