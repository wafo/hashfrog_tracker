import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import LayoutSelector from "../components/LayoutSelector";
import { useLayout } from "../context/layoutContext";
import { useSettingsString } from "../context/trackerContext";
import SettingStringsJSON from "../data/setting-strings.json";
import useDebounce from "../hooks/useDebounce";

const baseURL = process.env.PUBLIC_URL;
const GENERATOR_VERSION = process.env.REACT_APP_GENERATOR_VERSION;
const LOGIC_BRANCH = process.env.REACT_APP_LOGIC_BRANCH;

const TrackerLauncher = () => {
  const [checks, setChecks] = useState(false);
  const { state: layout } = useLayout();

  const layoutSize = useMemo(() => {
    const {
      layoutConfig: { width, height },
    } = layout;

    // Default padding to layouts
    let widthPadding = 0;
    let heightPadding = 25;
    if (checks) {
      widthPadding = 285;
      heightPadding = 25;
    }

    return {
      width: width + widthPadding,
      height: height + heightPadding,
    };
  }, [checks, layout]);

  const launchTracker = useCallback(() => {
    let url = `${baseURL}/tracker`;
    if (checks) url = `${baseURL}/tracker/checks`;

    const { width, height } = layoutSize;

    window.open(
      url,
      "HashFrog Tracker",
      `toolbar=0,location=0,status=0,menubar=0,scrollbars=0,resizable=0,width=${width},height=${height}`,
    );
  }, [checks, layoutSize]);

  const {
    setString: setSettingsStringCache,
    settings_string: cachedSettingsString,
    setVersion: setGeneratorVersionCache,
    generator_version: cachedGeneratorVersion,
  } = useSettingsString();

  const [settingsString, setSettingsString] = useState(() => cachedSettingsString || "");
  const debouncedString = useDebounce(settingsString, 300);

  useEffect(() => {
    setSettingsStringCache(debouncedString);
  }, [debouncedString, setSettingsStringCache]);

  const [generatorVersion, setGeneratorVersion] = useState(() => cachedGeneratorVersion || "");
  const debouncedVersion = useDebounce(generatorVersion, 300);

  useEffect(() => {
    setGeneratorVersionCache(debouncedVersion);
  }, [debouncedVersion, setGeneratorVersionCache]);

  const updateString = preset => {
    setSettingsString(SettingStringsJSON[preset]);
    setGeneratorVersion(GENERATOR_VERSION); // coming from .env
  };

  return (
    <Fragment>
      <div className="row">
        <div className="col">
          <h3>Layout Configuration</h3>
          <button type="button" className="btn btn-light btn-sm mb-3" onClick={launchTracker}>
            Launch tracker
          </button>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="checks"
              name="checks"
              value={checks}
              onChange={() => setChecks(prev => !prev)}
            />
            <label htmlFor="checks" className="form-check-label">
              Use check tracking *
            </label>
          </div>
          <div className="row m-0 w-75">
            <div className="col-4 ps-0">
              <label htmlFor="generator_version" className="form-label">
                Generator version
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="generator_version"
                name="generator_version"
                placeholder="Generator version" // League S3
                value={generatorVersion}
                onChange={({ target: { value } }) => setGeneratorVersion(value)}
                disabled={!checks}
              />
            </div>
            <div className="col-8 pe-0">
              <label htmlFor="setting_string" className="form-label">
                Settings String
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="setting_string"
                name="setting_string"
                placeholder="Settings String same as the generator" // League S3
                value={settingsString}
                onChange={({ target: { value } }) => setSettingsString(value)}
                disabled={!checks}
              />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="" className="form-label w-100">
              Common Presets
            </label>
            <button
              type="button"
              className="btn btn-light btn-sm me-2"
              onClick={() => updateString("tournament_s6")}
              disabled={!checks}
            >
              Tournament S6
            </button>
            <button
              type="button"
              className="btn btn-light btn-sm me-2"
              onClick={() => updateString("sgl_2023")}
              disabled={!checks}
            >
              SGL 2023
            </button>
            <button
              type="button"
              className="btn btn-light btn-sm me-2"
              onClick={() => updateString("league_s5")}
              disabled={!checks}
            >
              League S5
            </button>
            <button
              type="button"
              className="btn btn-light btn-sm me-2"
              onClick={() => updateString("scrubs_s5")}
              disabled={!checks}
            >
              Scrubs S5
            </button>
            <button
              type="button"
              className="btn btn-light btn-sm me-2"
              onClick={() => updateString("tfb_s2")}
              disabled={!checks}
            >
              Triforce Blitz S2
            </button>
            {LOGIC_BRANCH === "release" && (
              <p className="note">
                Note: Release logic files being used. <a href="https://dev.hashfrog-tracker.com/">Go to dev logic</a>
              </p>
            )}
            {LOGIC_BRANCH !== "release" && (
              <p className="note">
                Note: Dev logic files being used and things may break.{" "}
                <a href="https://hashfrog-tracker.com/">Go to release logic</a>
              </p>
            )}
          </div>
          <div className="mb-3"></div>

          <LayoutSelector />
        </div>
      </div>
      <div className="row">
        <div className="col">
          <h3>Notes</h3>
          <p>* Check tracking requires a compatible layout configuration to work properly.</p>
          <ul style={{ fontSize: "0.8em" }}>
            <li>
              The logic assumes: access to both ages; no shuffled entrances, owl drops, warp song destinations, or spawns; and vanilla (default) ocarina melodies.
            </li>
            <li>Closed Forest and Closed Door of Time do not work for the reasons above.</li>
            <li>
              The logic assumes that the initial value for a counter is zero. Click the counter to update it if not.
            </li>
          </ul>
        </div>
      </div>
    </Fragment>
  );
};

export default TrackerLauncher;
