import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useLayout } from "../context/layoutContext";
import { readFileAsText } from "../utils/utils";
import FileSaver from "file-saver";

// Layouts
import standardDefaultJSON from "../layouts/standard_default.layout.json";
import standardWeeklyJSON from "../layouts/standard_weekly.layout.json";
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
      case "standard":
        layout = standardDefaultJSON;
        break;
      case "weekly":
        layout = standardWeeklyJSON;
        break;
      case "scrubs":
        layout = scrubsS4JSON;
        break;
      default:
        layout = standardDefaultJSON;
        break;
    }
    const jsonBlob = new Blob([JSON.stringify(layout)], { type: "text/plain" });
    FileSaver.saveAs(jsonBlob, `${layout.layoutConfig.name.replace(/ /g,"_")}.json`);
  };

  return (
    <div className="form-control">
      <label htmlFor="layout-selector">Layout JSON File</label>
      <input key={key} type="file" id="layout-selector" onChange={handleInputChange} accept=".json" />
      <button type="button" style={{ width: "87px" }} onClick={resetLayout}>
        Reset
      </button>
      <p>Current layout: {layout.layoutConfig.name}</p>
      <Link to="/editor">Go to editor</Link>
      <p>Layout presets:</p>
      <ul style={{ fontSize: "0.85em", margin: 0, padding: "0 1rem" }}>
        <li>
          <button type="button" className="btn-link" onClick={() => downloadLayout("standard")}>
            Standard - Default
          </button>
        </li>
        <li>
          <button type="button" className="btn-link" onClick={() => downloadLayout("weekly")}>
            Standard - Weekly
          </button>
        </li>
        <li>
          <button type="button" className="btn-link" onClick={() => downloadLayout("scrubs")}>
            Scrubs - S4
          </button>
        </li>
      </ul>
    </div>
  );
};

export default LayoutSelector;
