import { useCallback, useState } from "react";

import Alert from "react-bootstrap/Alert";
import { Link } from "react-router-dom";
import { useLayout } from "../context/layoutContext";
import { isValidLayout } from "../utils/layout-validation";
import { readFileAsText } from "../utils/utils";

// Layouts
import hashfrogJSON from "../layouts/hashfrog.json";
import hashfrogMentorJSON from "../layouts/HashFrogMentor.json";
import leagueS10JSON from "../layouts/LeagueS10.json"
import hashfrogSawsJSON from "../layouts/HashFrogSAWS.json";
import linsoJSON from "../layouts/linso.json";
import escapefromkakJSON from "../layouts/escapefromkak.json";

const LayoutSelector = () => {
  const [key, setKey] = useState(Math.random());
  const [importError, setImportError] = useState(null);
  const { state: layout, dispatch } = useLayout();

  const handleInputChange = useCallback(
    async event => {
      const {
        target: { files },
      } = event;

      if (files.length > 0) {
        try {
          const content = await readFileAsText(files[0]);
          const parsedLayout = JSON.parse(content);
          if (!isValidLayout(parsedLayout)) {
            throw new Error("Missing layoutConfig dimensions or components list.");
          }
          setImportError(null);
          dispatch({ type: "LAYOUT_UPDATE", payload: parsedLayout });
        } catch (err) {
          console.warn("Failed to import layout:", err);
          setImportError("Not a valid layout file. Keeping the current layout.");
          setKey(Math.random());
        }
      } else {
        dispatch({ type: "LAYOUT_DEFAULT" });
      }
    },
    [dispatch],
  );

  const resetLayout = useCallback(() => {
    setImportError(null);
    dispatch({ type: "LAYOUT_DEFAULT" });
    setKey(Math.random());
  }, [dispatch]);

  const applyPreset = useCallback(
    selected => {
      let selectedLayout = null;
      switch (selected) {
        case "hashfrog":
          selectedLayout = hashfrogJSON;
          break;
        case "linso":
          selectedLayout = linsoJSON;
          break;
        case "escapefromkak":
          selectedLayout = escapefromkakJSON;
          break;
        case "hashfrogSaws":
          selectedLayout = hashfrogSawsJSON;
          break;
        case "hashfrogMentor":
          selectedLayout = hashfrogMentorJSON;
          break;
        case "leagueS10":
          selectedLayout = leagueS10JSON;
          break;
        default:
          selectedLayout = hashfrogJSON;
          break;
      }
      setImportError(null);
      dispatch({ type: "LAYOUT_UPDATE", payload: selectedLayout });
      setKey(Math.random());
    },
    [dispatch],
  );

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
        {importError && (
          <Alert variant="danger" className="py-1 px-2 mt-2 mb-0 small">
            {importError}
          </Alert>
        )}
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
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => applyPreset("hashfrog")}>
            HashFrog
          </button>
        </li>
        <li className="list-divider">|</li>
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => applyPreset("linso")}>
            LinSo Like
          </button>
        </li>
        <li className="list-divider">|</li>
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => applyPreset("hashfrogMentor")}>
            HashFrog Mentor
          </button>
        </li>
        <li className="list-divider">|</li>
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => applyPreset("leagueS10")}>
            League S10
          </button>
        </li>
        <li className="list-divider">|</li>
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => applyPreset("hashfrogSaws")}>
            HashFrog SAWS
          </button>
        </li>
        <li className="list-divider">|</li>
        <li>
          <button type="button" className="btn btn-link btm-sm p-0" onClick={() => applyPreset("escapefromkak")}>
            EscapeFromKak
          </button>
        </li>
      </ul>
    </div>
  );
};

export default LayoutSelector;
