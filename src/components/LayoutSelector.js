import FileSaver from "file-saver";
import { useCallback, useState } from "react";

import { Link } from "react-router-dom";
import { useLayout } from "../context/layoutContext";
import { readFileAsText } from "../utils/utils";

// Layouts
import hashfrogJSON from "../layouts/hashfrog.json";
import linsoJSON from "../layouts/linso.json";

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

  const downloadLayout = selected => {
    let layout = null;
    switch (selected) {
      case "hashfrog":
        layout = hashfrogJSON;
        break;
      case "linso":
        layout = linsoJSON;
        break;
      default:
        layout = hashfrogJSON;
        break;
    }
    const jsonBlob = new Blob([JSON.stringify(layout)], { type: "text/plain" });
    FileSaver.saveAs(jsonBlob, `${layout.layoutConfig.name.replace(/ /g, "_")}.json`);
  };

  return (
    <div className="w-75">
      <div className="mb-2">
        <label htmlFor="layout-selector" className="form-label">
          Layout JSON File
        </label>
        <input
          key={key}
          className="form-control form-control-sm"
          type="file"
          id="layout-selector"
          onChange={handleInputChange}
          accept=".json"
        />
      </div>
      <div className="mb-2">
        <Link to="/editor" className="btn btn-light btn-sm w-25 me-2">
          Editor
        </Link>
        <button type="button" className="btn btn-light btn-sm w-25" onClick={resetLayout}>
          Reset
        </button>
      </div>
      <p className="m-0 mb-2 note">Current layout: {layout.layoutConfig.name}</p>

      <h5>Layout Presets</h5>
      <ul className="list-unstyled list-horizontal">
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => downloadLayout("hashfrog")}>
            HashFrog
          </button>
        </li>
        <li className="list-divider">|</li>
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => downloadLayout("linso")}>
            LinSo Like
          </button>
        </li>
      </ul>
    </div>
  );
};

export default LayoutSelector;
