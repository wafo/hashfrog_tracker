import { useCallback, useState } from "react";
import { useLayout } from "../../context/useLayout";

const LayoutSelector = () => {
  const [key, setKey] = useState(Math.random());
  const { state: layout, dispatch } = useLayout();

  const handleInputChange = useCallback(
    async event => {
      const {
        target: { files },
      } = event;

      if (files.length > 0) {
        const content = await readFileAsText(files[0]);
        const parsedLayout = JSON.parse(content);
        dispatch({ type: "LAYOUT_UPDATE", payload: parsedLayout });
      } else {
        dispatch({ type: "LAYOUT_DEFAULT" });
      }
    },
    [dispatch],
  );

  const resetLayout = useCallback(() => {
    dispatch({ type: "LAYOUT_DEFAULT" });
    setKey(Math.random());
  }, [dispatch]);

  return (
    <div className="form-control">
      <label htmlFor="layout-selector">Layout JSON File</label>
      <input key={key} type="file" id="layout-selector" onChange={handleInputChange} />
      <button type="button" style={{ width: "87px" }} onClick={resetLayout}>
        Reset
      </button>
      <p>Current layout: {layout.name}</p>
    </div>
  );
};

async function readFileAsText(file) {
  let result = await new Promise(resolve => {
    let fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsText(file);
  });

  return result;
}

export default LayoutSelector;
