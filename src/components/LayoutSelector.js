import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useLayout } from "../context/layoutContext";
import { readFileAsText } from "../utils/utils";
import FileSaver from "file-saver";

// Layouts
import standardPathJSON from "../layouts/standard_path.layout.json";
import standardWothJSON from "../layouts/standard_woth.layout.json";
import scrubsS4JSON from "../layouts/scrubs_s4.layout.json";

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
      case "path":
        layout = standardPathJSON;
        break;
      case "woth":
        layout = standardWothJSON;
        break;
      case "scrubs":
        layout = scrubsS4JSON;
        break;
      default:
        layout = standardPathJSON;
        break;
    }
    const jsonBlob = new Blob([JSON.stringify(layout)], { type: "text/plain" });
    FileSaver.saveAs(jsonBlob, `${layout.layoutConfig.name.replace(/ /g, "_")}.json`);
  };

  return (
    <div className="">
      <div className="mb-2">
        <label htmlFor="layout-selector" className="form-label">
          Layout JSON File
        </label>
        <input
          key={key}
          className="form-control form-control-sm w-75"
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
      <p className="m-0 mb-2">Current layout: {layout.layoutConfig.name}</p>

      <h5>Layout Presets</h5>
      <ul className="list-unstyled list-horizontal">
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => downloadLayout("path")}>
            Standard - Path
          </button>
        </li>
        <li className="list-divider">|</li>
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => downloadLayout("woth")}>
            Standard - WOTH
          </button>
        </li>
        <li className="list-divider">|</li>
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => downloadLayout("scrubs")}>
            Scrubs - S4
          </button>
        </li>
      </ul>
    </div>
  );
};

export default LayoutSelector;
