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
